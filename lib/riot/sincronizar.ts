import "server-only";

import {
  adquirirTravaDoRobo,
  aplicarSincronizacao,
  lerConfig,
  liberarTravaDoRobo,
  listarConferencias,
  listarInscricoes,
  pausarRobo,
  registrarFalhaDoRobo,
  roboPausado,
  type EdicaoConfig,
  type Inscricao,
} from "@/lib/inscricoes/store";
import { chaveDaRiot, criarClienteRiot, type ClienteRiot, type RespostaRiot } from "@/lib/riot/cliente";
import {
  decidirSincronizacao,
  precisaContarPartidas,
  type DadosRiot,
  type DecisaoDoRobo,
} from "@/lib/riot/decidir";
import { FILA_SOLO_DUO, FILA_SOLO_DUO_PARTIDAS, PLATAFORMA_DO_CAMPEONATO } from "@/lib/riot/elo";

/**
 * Uma rodada do robô da Riot: consulta os inscritos, decide e grava.
 *
 * Quem roda: o cron diário da Vercel (`/api/cron/riot`), o botão "Atualizar da Riot agora"
 * do painel e o "atualizar" de um inscrito na gaveta. Os três passam por aqui, com a mesma
 * trava — duas rodadas nunca correm juntas.
 *
 * A fila começa por quem está há mais tempo sem consulta. Se o tempo ou a cota acabarem no
 * meio, a próxima rodada continua de onde esta parou, sem ninguém ficar para trás.
 */

const SEMANA_MS = 7 * 24 * 60 * 60 * 1000;

export type MudancaSimulada = {
  riotId: string;
  status: unknown;
  riotIdAtual?: unknown;
  elo?: { de: string; para: string; pontosDe: number; pontosPara: number };
  itens?: { item: string; estado: string }[];
};

export type ResumoDaRodada = {
  desligado?: "sem_chave" | "pausado" | "travado";
  simular: boolean;
  naFila: number;
  processados: number;
  elosMudados: number;
  itensGravados: number;
  erros: number;
  parouPor?: "limite" | "cota" | "orcamento" | "chave_recusada";
  chamadas: number;
  /** Só na simulação: o que mudaria, pelo Riot ID. Nunca contato. */
  mudancas?: MudancaSimulada[];
};

type Consulta =
  | { tipo: "ok"; riot: DadosRiot }
  | { tipo: "erro"; mensagem: string }
  | { tipo: "parar"; motivo: "limite" | "cota" | "chave_recusada"; esperarSegundos?: number };

/** O que fazer com uma resposta que não foi `ok` nem `nao_encontrado`. */
function falha(r: Exclude<RespostaRiot<unknown>, { tipo: "ok" } | { tipo: "nao_encontrado" }>): Consulta {
  switch (r.tipo) {
    case "limite":
      return { tipo: "parar", motivo: r.proprio ? "cota" : "limite", esperarSegundos: r.esperarSegundos };
    case "chave_recusada":
    case "sem_chave":
      return { tipo: "parar", motivo: "chave_recusada" };
    case "puuid_invalido":
      return { tipo: "erro", mensagem: "PUUID não reconhecido pela Riot" };
    case "erro":
      return { tipo: "erro", mensagem: r.mensagem };
  }
}

/** As chamadas à Riot de UM inscrito. Gasta o mínimo: nível e região só 1×/semana. */
export async function consultarInscrito(
  cliente: ClienteRiot,
  inscrito: Pick<Inscricao, "nick" | "tag" | "puuid" | "riot_regiao" | "riot_nivel_em" | "riot_partidas_janela">,
  config: Pick<EdicaoConfig, "inicio_campeonato" | "min_ranqueadas">,
  agoraMs: number,
): Promise<Consulta> {
  // ---------------------------------------------- conta
  let conta: { puuid: string; gameName: string; tagLine: string } | null = null;
  if (inscrito.puuid) {
    const r = await cliente.contaPorPuuid(inscrito.puuid);
    if (r.tipo === "ok") conta = r.dados;
    // PUUID que a Riot não decifra (a chave mudou) ou que sumiu: resolve de novo pelo Riot ID.
    else if (r.tipo !== "puuid_invalido" && r.tipo !== "nao_encontrado") return falha(r);
  }
  if (!conta) {
    const r = await cliente.contaPorRiotId(inscrito.nick, inscrito.tag);
    if (r.tipo === "nao_encontrado") return { tipo: "ok", riot: { conta: { tipo: "nao_encontrado" } } };
    if (r.tipo !== "ok") return falha(r);
    conta = r.dados;
  }

  const riot: DadosRiot = { conta: { tipo: "ok", ...conta } };
  const semanal = !inscrito.riot_nivel_em || agoraMs - new Date(inscrito.riot_nivel_em).getTime() > SEMANA_MS;

  // ---------------------------------------------- servidor
  if (!inscrito.riot_regiao || semanal) {
    const r = await cliente.regiaoDaConta(conta.puuid);
    if (r.tipo === "ok") riot.regiao = r.dados;
    else if (r.tipo !== "nao_encontrado") return falha(r);
  }
  const regiao = riot.regiao ?? inscrito.riot_regiao;
  if (regiao && regiao !== PLATAFORMA_DO_CAMPEONATO) return { tipo: "ok", riot };

  // ---------------------------------------------- solo/duo
  const liga = await cliente.entradasDaLiga(conta.puuid);
  if (liga.tipo === "nao_encontrado") riot.solo = null;
  else if (liga.tipo !== "ok") return falha(liga);
  else {
    const solo = liga.dados.find((e) => e.queueType === FILA_SOLO_DUO && e.tier);
    riot.solo = solo
      ? { tier: solo.tier!, divisao: solo.rank, pdl: solo.leaguePoints, vitorias: solo.wins, derrotas: solo.losses }
      : null;
  }

  // ---------------------------------------------- nível (só evidência para o item f)
  if (semanal) {
    const r = await cliente.nivelDoInvocador(conta.puuid);
    if (r.tipo === "ok") riot.nivel = r.dados;
    else if (r.tipo === "nao_encontrado") riot.nivel = null;
    else return falha(r);
  }

  // ---------------------------------------------- partidas da janela do item (e)
  const janela = precisaContarPartidas({
    inicioCampeonato: config.inicio_campeonato,
    partidasGravadas: inscrito.riot_partidas_janela ?? null,
    minimo: config.min_ranqueadas,
    agoraMs,
  });
  if (janela) {
    const r = await cliente.idsDePartidas(conta.puuid, { fila: FILA_SOLO_DUO_PARTIDAS, ...janela });
    if (r.tipo === "ok") {
      // Só partidas do servidor do campeonato.
      riot.partidasNaJanela = r.dados.filter((id) => id.toUpperCase().startsWith(`${PLATAFORMA_DO_CAMPEONATO.toUpperCase()}_`)).length;
    } else if (r.tipo !== "nao_encontrado") return falha(r);
  }

  return { tipo: "ok", riot };
}

function resumoVazio(simular: boolean, desligado?: ResumoDaRodada["desligado"]): ResumoDaRodada {
  return { desligado, simular, naFila: 0, processados: 0, elosMudados: 0, itensGravados: 0, erros: 0, chamadas: 0 };
}

function mudancaSimulada(inscrito: Inscricao, decisao: DecisaoDoRobo): MudancaSimulada | null {
  // Elo só entra quando o VALOR muda — gravar a fonte de quem já estava certo não é notícia.
  const eloMudou = decisao.elo?.mudouValor === true;
  const statusMudou = decisao.colunasRiot.riot_status !== "ok";
  if (!eloMudou && decisao.itens.length === 0 && !statusMudou) return null;
  return {
    riotId: inscrito.riot_id,
    status: decisao.colunasRiot.riot_status,
    ...(decisao.colunasRiot.riot_id_atual !== undefined && { riotIdAtual: decisao.colunasRiot.riot_id_atual }),
    ...(eloMudou && {
      elo: { de: decisao.elo!.de, para: decisao.elo!.para, pontosDe: decisao.elo!.pontosDe, pontosPara: decisao.elo!.pontos },
    }),
    ...(decisao.itens.length > 0 && { itens: decisao.itens.map((i) => ({ item: i.item, estado: i.estado })) }),
  };
}

export async function sincronizarComRiot(opcoes: {
  simular?: boolean;
  /** Tempo total desta rodada. O cron tem 300 s; o botão do painel, bem menos. */
  orcamentoMs: number;
  /** Só este inscrito (o "atualizar" da gaveta). */
  inscricaoId?: string;
  /** Para teste. Em produção, o cliente nasce aqui com a chave do ambiente. */
  cliente?: ClienteRiot;
}): Promise<ResumoDaRodada> {
  const simular = opcoes.simular === true;
  if (!opcoes.cliente && !chaveDaRiot()) return resumoVazio(simular, "sem_chave");

  const config = await lerConfig();
  const inicio = Date.now();
  if (roboPausado(config, inicio)) return resumoVazio(simular, "pausado");

  // A trava dura mais que a rodada mais longa (300 s do cron): se a função morrer no meio,
  // ela expira sozinha em minutos.
  if (!(await adquirirTravaDoRobo(6, inicio))) return resumoVazio(simular, "travado");

  const prazo = inicio + opcoes.orcamentoMs;
  const cliente = opcoes.cliente ?? criarClienteRiot({ prazoMs: prazo - 10_000 });
  const resumo = resumoVazio(simular);
  if (simular) resumo.mudancas = [];
  // Só uma rodada COMPLETA (não a de um inscrito só, nem uma que estourou no meio) vira
  // "última rodada" no painel — é ela que diz se a rotina diária está viva.
  let concluiu = false;

  try {
    const [inscricoes, conferencias] = await Promise.all([listarInscricoes(), listarConferencias()]);

    // Recusado e desistente saem da fila: não gastam cota e ninguém mexe no que é deles.
    const fila = inscricoes
      .filter((i) => (opcoes.inscricaoId ? i.id === opcoes.inscricaoId : true))
      .filter((i) => i.situacao !== "recusado" && i.situacao !== "desistiu")
      .sort(
        (a, b) =>
          (a.riot_sincronizado_em ?? "").localeCompare(b.riot_sincronizado_em ?? "") ||
          a.criado_em.localeCompare(b.criado_em),
      );
    resumo.naFila = fila.length;
    const elosJaCongelados = inscricoes.some((i) => Boolean(i.elo_congelado));

    for (const inscrito of fila) {
      // Margem para gravar o que já foi consultado antes de a função ser encerrada.
      if (Date.now() > prazo - 5_000) {
        resumo.parouPor = "orcamento";
        break;
      }

      const consulta = await consultarInscrito(cliente, inscrito, config, Date.now());

      if (consulta.tipo === "parar") {
        resumo.parouPor = consulta.motivo;
        // Também na simulação: a pausa protege a chave, não é dado do campeonato. Sem ela,
        // a próxima rodada (ou o formulário) bateria na Riot antes do Retry-After vencer.
        if (consulta.motivo === "limite") await pausarRobo(consulta.esperarSegundos ?? 60);
        break;
      }

      if (consulta.tipo === "erro") {
        resumo.erros += 1;
        if (!simular) await registrarFalhaDoRobo(inscrito.id, consulta.mensagem);
        continue;
      }

      const decisao = decidirSincronizacao({
        inscrito,
        conferencias: conferencias.filter((c) => c.inscricao_id === inscrito.id),
        riot: consulta.riot,
        config: { ...config, elos_ja_congelados: elosJaCongelados },
        agoraMs: Date.now(),
      });
      resumo.processados += 1;

      if (simular) {
        if (decisao.elo?.mudouValor) resumo.elosMudados += 1;
        resumo.itensGravados += decisao.itens.length;
        const mudanca = mudancaSimulada(inscrito, decisao);
        if (mudanca) resumo.mudancas!.push(mudanca);
        continue;
      }

      const gravado = await aplicarSincronizacao(inscrito.id, decisao);
      if (gravado.eloGravado && decisao.elo?.mudouValor) resumo.elosMudados += 1;
      resumo.itensGravados += gravado.itensGravados;
    }
    concluiu = true;
  } finally {
    resumo.chamadas = cliente.chamadas;
    const contagens: Record<string, unknown> = { ...resumo };
    delete contagens.mudancas;
    const registrar = concluiu && !simular && !opcoes.inscricaoId;
    await liberarTravaDoRobo(registrar ? contagens : undefined);
  }

  return resumo;
}
