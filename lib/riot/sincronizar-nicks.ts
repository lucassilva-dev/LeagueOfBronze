import "server-only";

import { ConflitoDeVersaoError, getConfiguredDataProvider, readDatasetComVersao, saveDataset } from "@/lib/data-store";
import { contaParaTimes } from "@/lib/inscricoes/schema";
import { listarInscricoes, type Inscricao } from "@/lib/inscricoes/store";
import type { ClienteRiot, RespostaRiot } from "@/lib/riot/cliente";
import {
  atualizarNicksDoDataset,
  contaDoJogador,
  indexarContas,
  riotIdValido,
  type ContaConhecida,
  type MudancaDeNick,
} from "@/lib/riot/nicks-do-site";
import type { Player } from "@/lib/schema";

/**
 * A etapa do robô que leva o nick novo para o site (lib/riot/nicks-do-site.ts).
 *
 * Roda no fim de toda rodada do robô — o cron diário, o botão «Atualizar da Riot agora» e o
 * «atualizar» de um inscrito —, depois que as inscrições já ganharam o `riot_id_atual` do dia.
 *
 * De onde vem o Riot ID de hoje de cada conta:
 *  - das inscrições que o robô consulta todo dia (pendente, apto, sobra): sem chamada nenhuma;
 *  - para quem está no elenco da temporada atual e NÃO tem inscrição ativa (quem saiu, o
 *    substituto cadastrado à mão, uma inscrição desistente): uma consulta à conta, pelo puuid
 *    gravado no jogador ou, sem ele, pelo próprio Riot ID do site.
 * As temporadas arquivadas usam essas mesmas contas: o jogador antigo que tem conta na 4ª
 * ganha o nick novo; quem não tem fica como está.
 *
 * Grava com a trava de versão do dataset: se o painel gravou no meio, relê e aplica de novo.
 */

export type ResumoDosNicks = {
  atualizados: number;
  vinculados: number;
  consultas: number;
  parouPor?: "limite" | "cota" | "chave_recusada" | "orcamento";
  /** O Retry-After da Riot, quando ela recusou por limite. */
  esperarSegundos?: number;
  /** Só na simulação: o que mudaria. */
  mudancas?: MudancaDeNick[];
};

const TENTATIVAS_DE_GRAVACAO = 3;

/**
 * As contas que as inscrições ativas já conhecem — sem chamada nenhuma à Riot.
 *
 * `lidasDesde` (ISO): só o Riot ID lido a partir dessa hora (nesta rodada) troca nick; o das
 * outras inscrições pode ser de ontem, e serve só para ligar o jogador à conta. Sem ele (a
 * simulação, que não grava as leituras), vale o que está gravado.
 */
export function contasDasInscricoes(
  inscricoes: readonly Pick<
    Inscricao,
    "situacao" | "puuid" | "riot_id" | "riot_id_atual" | "riot_sincronizado_em" | "riot_status"
  >[],
  opcoes: { lidasDesde?: string } = {},
): ContaConhecida[] {
  return inscricoes
    .filter((i) => contaParaTimes(i.situacao) && i.puuid && i.riot_id)
    .map((i) => ({
      puuid: i.puuid!,
      riotId: i.riot_id_atual?.trim() || i.riot_id,
      outrosNomes: [i.riot_id],
      renomeia:
        opcoes.lidasDesde === undefined ||
        (i.riot_status !== "erro" && (i.riot_sincronizado_em ?? "") >= opcoes.lidasDesde),
      // O histórico das temporadas antigas só se liga pelo nome a quem a organização aprovou.
      ligaArquivo: i.situacao === "apto",
      lidaEm: i.riot_sincronizado_em ?? null,
    }));
}

type Parada = { motivo: "limite" | "cota" | "chave_recusada"; esperarSegundos?: number };

function parada(r: RespostaRiot<unknown>): Parada | null {
  if (r.tipo === "limite") return { motivo: r.proprio ? "cota" : "limite", esperarSegundos: r.esperarSegundos };
  if (r.tipo === "chave_recusada" || r.tipo === "sem_chave") return { motivo: "chave_recusada" };
  return null;
}

/**
 * A conta de hoje de um jogador da temporada atual sem inscrição ativa: pelo puuid e, só se a
 * Riot disser que ele não serve mais (a chave mudou) ou que sumiu, pelo nick do site. Um erro
 * passageiro (5xx) não troca a conta: o jogador fica para a próxima rodada.
 */
async function consultarJogador(
  cliente: ClienteRiot,
  jogador: Pick<Player, "nick" | "puuid">,
): Promise<{ conta?: ContaConhecida; parar?: Parada }> {
  // Contas lidas assim valem só para a temporada atual: não ligam histórico antigo pelo nome.
  const conta = (dados: { puuid: string; gameName: string; tagLine: string }): ContaConhecida => ({
    puuid: dados.puuid,
    riotId: `${dados.gameName}#${dados.tagLine}`,
    outrosNomes: [jogador.nick],
    ...(jogador.puuid && jogador.puuid !== dados.puuid ? { puuidsAntigos: [jogador.puuid] } : {}),
    ligaArquivo: false,
  });
  if (jogador.puuid) {
    const r = await cliente.contaPorPuuid(jogador.puuid);
    if (r.tipo === "ok") return { conta: conta(r.dados) };
    const p = parada(r);
    if (p) return { parar: p };
    if (r.tipo !== "puuid_invalido" && r.tipo !== "nao_encontrado") return {};
  }
  if (!riotIdValido(jogador.nick)) return {};
  const i = jogador.nick.indexOf("#");
  const r = await cliente.contaPorRiotId(jogador.nick.slice(0, i).trim(), jogador.nick.slice(i + 1).trim());
  if (r.tipo === "ok") return { conta: conta(r.dados) };
  const p = parada(r);
  return p ? { parar: p } : {};
}

export async function sincronizarNicksDoSite(opcoes: {
  cliente: ClienteRiot;
  simular: boolean;
  /** Sem consultas à Riot (a cota acabou na rodada, ou é o «atualizar» de um inscrito só). */
  consultarRiot: boolean;
  /** Hora-limite (ms) para começar uma consulta nova. */
  prazoMs: number;
  /** Início da rodada (ms): só o Riot ID lido nela troca nick (`contasDasInscricoes`). */
  inicioDaRodadaMs?: number;
}): Promise<ResumoDosNicks> {
  const resumo: ResumoDosNicks = { atualizados: 0, vinculados: 0, consultas: 0 };

  // Só com o campeonato no banco. Com o arquivo local (desenvolvimento, testes), o dataset é a
  // semente versionada do repositório — o robô não reescreve arquivo do código.
  if (getConfiguredDataProvider() !== "supabase") return resumo;

  // Relidas aqui: a rodada que acabou de rodar gravou o `riot_id_atual` do dia.
  const lidasDesde =
    opcoes.simular || opcoes.inicioDaRodadaMs === undefined ? undefined : new Date(opcoes.inicioDaRodadaMs).toISOString();
  const contas = contasDasInscricoes(await listarInscricoes(), { lidasDesde });
  let { dataset, versao } = await readDatasetComVersao();

  if (opcoes.consultarRiot) {
    const indice = indexarContas(contas);
    const semInscricaoAtiva = dataset.players.filter((p) => !contaDoJogador(p, indice));
    for (const jogador of semInscricaoAtiva) {
      if (Date.now() > opcoes.prazoMs) {
        resumo.parouPor = "orcamento";
        break;
      }
      const r = await consultarJogador(opcoes.cliente, jogador);
      resumo.consultas += 1;
      if (r.parar) {
        resumo.parouPor = r.parar.motivo;
        if (r.parar.esperarSegundos !== undefined) resumo.esperarSegundos = r.parar.esperarSegundos;
        break;
      }
      if (r.conta) contas.push(r.conta);
    }
  }

  for (let tentativa = 1; ; tentativa++) {
    const r = atualizarNicksDoDataset(dataset, contas);
    resumo.atualizados = r.mudancas.length;
    resumo.vinculados = r.vinculados;
    if (opcoes.simular) {
      resumo.mudancas = r.mudancas;
      return resumo;
    }
    if (r.dataset === dataset) return resumo;
    try {
      await saveDataset(r.dataset, { versaoEsperada: versao });
      for (const m of r.mudancas) {
        console.info(`[riot] nick no site: ${m.de} → ${m.para}${m.temporada ? ` (temporada ${m.temporada})` : ""}`);
      }
      return resumo;
    } catch (erro) {
      if (!(erro instanceof ConflitoDeVersaoError) || tentativa >= TENTATIVAS_DE_GRAVACAO) throw erro;
      ({ dataset, versao } = await readDatasetComVersao());
    }
  }
}

/**
 * As contas para a VIRADA do draft: aqui se sabe exatamente de quem é cada jogador (o Riot ID
 * declarado que o draft gravou é único na tabela), então vale toda inscrição com conta — mesmo
 * a de quem desistiu ou foi recusado e ainda está num elenco. Só para a temporada que entra.
 */
export function contasDaVirada(
  inscricoes: readonly Pick<Inscricao, "puuid" | "riot_id" | "riot_id_atual" | "riot_sincronizado_em">[],
): ContaConhecida[] {
  return inscricoes
    .filter((i) => i.puuid && i.riot_id)
    .map((i) => ({
      puuid: i.puuid!,
      riotId: i.riot_id_atual?.trim() || i.riot_id,
      outrosNomes: [i.riot_id],
      ligaArquivo: false,
      lidaEm: i.riot_sincronizado_em ?? null,
    }));
}
