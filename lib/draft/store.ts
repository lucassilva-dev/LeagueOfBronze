import "server-only";

import { createSupabaseAdminClient } from "@/lib/data-store";
import { ErroDeRegra } from "@/lib/security/erros";
import { identidadeDoTime } from "@/lib/draft/times";
import {
  impedimentosDoSorteio,
  montarDraft,
  type EstadoDraft,
  type JogadorDoDraft,
  type TimeDoDraft,
} from "@/lib/draft/motor";
import { lerConfig, listarInscricoes } from "@/lib/inscricoes/store";
import { distribuirTimes } from "@/lib/inscricoes/schema";

/**
 * Persistência do draft.
 *
 * O estado inteiro mora numa linha jsonb (`draft_estado`), e a gravação é condicionada
 * à revisão que foi lida. O draft é o momento em que mais gente escreve ao mesmo tempo
 * — dez capitães e o cronômetro — e sem essa condição duas escolhas simultâneas se
 * sobrescrevem em silêncio.
 */

export type DraftGravado = { estado: EstadoDraft | null; revisao: number };

export async function lerDraftCompleto(): Promise<DraftGravado> {
  const { data, error } = await createSupabaseAdminClient()
    .from("draft_estado")
    .select("estado,revisao")
    .eq("id", 1)
    .maybeSingle<{ estado: EstadoDraft | null; revisao: number }>();

  if (error) throw new Error(`Falha ao ler o draft: ${error.message}`);
  return { estado: data?.estado ?? null, revisao: data?.revisao ?? 0 };
}

/**
 * Grava SE a revisão ainda for a que foi lida.
 *
 * Devolve `false` quando alguém gravou no meio do caminho — quem chama recarrega e
 * decide. Não é erro: num draft ao vivo, perder a corrida por milissegundos é o
 * comportamento esperado, e o capitão precisa ver o estado novo, não uma falha.
 */
export async function salvarDraftSeIntacto(
  estado: EstadoDraft,
  revisaoLida: number,
): Promise<boolean> {
  const { data, error } = await createSupabaseAdminClient()
    .from("draft_estado")
    .update({ estado, revisao: revisaoLida + 1, atualizado_em: new Date().toISOString() })
    .eq("id", 1)
    .eq("revisao", revisaoLida)
    .select("revisao");

  if (error) throw new Error(`Falha ao salvar o draft: ${error.message}`);
  return (data?.length ?? 0) > 0;
}

// ---------------------------------------------------------------- montagem

export type MetodoDeCapitao = "mid" | "adc" | "pior" | "voluntarios" | "manual";

/**
 * Monta o draft a partir de quem foi aprovado.
 *
 * O número de times é DERIVADO (`distribuirTimes`), nunca configurado: com 50
 * aprovados são 10 times, e quem sobra da divisão fica fora do sorteio. É por isso que
 * a organização precisa fechar a lista de aprovados antes de montar.
 */
export async function montarDraftDosAprovados(params: {
  metodo: MetodoDeCapitao;
  capitaesManuais?: string[];
}): Promise<EstadoDraft> {
  const config = await lerConfig();
  const inscritos = await listarInscricoes();

  // "sobra" também é aprovado — conta para decidir QUANTOS times cabem. Quem joga,
  // porém, são só os "apto": a sobra é justamente quem a organização decidiu deixar
  // de fora.
  const aprovados = inscritos.filter((i) => i.situacao === "apto" || i.situacao === "sobra");
  const vaoJogar = inscritos.filter((i) => i.situacao === "apto");
  const { times: quantosTimes, vagas } = distribuirTimes(aprovados.length, config.jogadores_por_time);

  // O elo que vale é o congelado; sem ele, o verificado; sem ele, o declarado. Os
  // pontos já vêm derivados no banco, então não são recalculados aqui.
  const pool: JogadorDoDraft[] = vaoJogar.map((i) => ({
    id: i.id,
    riotId: i.riot_id,
    pontos: i.pontos,
    rota1: i.rota_primaria,
    rota2: i.rota_secundaria,
    elo: i.elo_congelado ?? i.elo_verificado ?? i.elo_declarado,
    timeId: null,
  }));

  // As duas regras que já falharam ficam numa função pura, testável sem banco:
  // quem joga tem de ser exatamente as vagas (senão a decisão da organização sobre
  // quem sobra era apagada por um corte na ordem de inscrição), e a soma dos pontos
  // tem de caber no teto (senão o draft entra ao vivo já condenado a travar).
  const impedimentos = impedimentosDoSorteio({
    pontosDosQueJogam: pool.map((j) => j.pontos),
    vagas,
    times: quantosTimes,
    orcamentoPorTime: config.orcamento_por_time,
    totalDeAprovados: aprovados.length,
  });

  if (impedimentos.length > 0) throw new ErroDeRegra(impedimentos.join(" "));

  const capitaes = escolherCapitaes({
    aprovados: pool,
    rotaPorInscrito: new Map(vaoJogar.map((i) => [i.id, i.rota_primaria])),
    querCapitao: new Set(vaoJogar.filter((i) => i.quer_capitao).map((i) => i.id)),
    quantos: quantosTimes,
    metodo: params.metodo,
    manuais: params.capitaesManuais ?? [],
  });

  const times: TimeDoDraft[] = capitaes.map((capitaoId, i) => ({
    id: `time-${i + 1}`,
    ...identidadeDoTime(i),
    capitaoId,
  }));

  return montarDraft({
    times,
    jogadores: pool,
    jogadoresPorTime: config.jogadores_por_time,
    orcamentoPorTime: config.orcamento_por_time,
    segundosPorEscolha: config.segundos_por_escolha,
  });
}

/**
 * Quem capitaneia.
 *
 * Os métodos vêm do design e refletem o que a organização já fazia à mão. A ordenação
 * é sempre determinística (desempate por id) para que montar duas vezes com a mesma
 * lista dê o mesmo resultado — num sorteio, "deu diferente e ninguém sabe por quê" é
 * pior do que qualquer critério.
 */
function escolherCapitaes(params: {
  aprovados: readonly JogadorDoDraft[];
  rotaPorInscrito: Map<string, string>;
  querCapitao: Set<string>;
  quantos: number;
  metodo: MetodoDeCapitao;
  manuais: readonly string[];
}): string[] {
  const { aprovados, rotaPorInscrito, querCapitao, quantos, metodo, manuais } = params;

  if (metodo === "manual") {
    if (manuais.length !== quantos) {
      throw new ErroDeRegra(`Escolha exatamente ${quantos} capitães (você marcou ${manuais.length}).`);
    }
    // Repetido cria um time SEM capitão alcançável: `montarDraft` liga o jogador ao
    // primeiro time que o reivindica, e o segundo nasce com o elenco vazio. Ninguém
    // consegue escolher por ele, todas as escolhas caem no auto-pick, e a virada fica
    // travada para sempre com "time X tem 4 de 5 jogadores" — descoberto no fim do
    // evento ao vivo, quando o conserto é refazer o sorteio inteiro.
    if (new Set(manuais).size !== manuais.length) {
      throw new ErroDeRegra("Um mesmo jogador foi marcado como capitão de mais de um time.");
    }

    const validos = new Set(aprovados.map((j) => j.id));
    for (const id of manuais) {
      if (!validos.has(id)) throw new ErroDeRegra("Um dos capitães escolhidos não está entre os aprovados.");
    }
    return [...manuais];
  }

  const porPontosDesc = [...aprovados].sort((a, b) => b.pontos - a.pontos || a.id.localeCompare(b.id));
  const porPontosAsc = [...aprovados].sort((a, b) => a.pontos - b.pontos || a.id.localeCompare(b.id));

  const candidatos =
    metodo === "pior"
      ? porPontosAsc
      : metodo === "voluntarios"
        ? porPontosDesc.filter((j) => querCapitao.has(j.id))
        : porPontosDesc.filter((j) => rotaPorInscrito.get(j.id) === (metodo === "mid" ? "MID" : "ADC"));

  if (candidatos.length < quantos) {
    const oQue =
      metodo === "voluntarios"
        ? "voluntários"
        : metodo === "pior"
          ? "aprovados"
          : `jogadores de ${metodo === "mid" ? "meio" : "atirador"}`;
    throw new ErroDeRegra(
      `Não há ${oQue} suficientes: ${candidatos.length} para ${quantos} times. Escolha outro método ou defina à mão.`,
    );
  }

  return candidatos.slice(0, quantos).map((j) => j.id);
}

/**
 * A visão PÚBLICA do draft.
 *
 * A transmissão é aberta, então tudo o que sai daqui é lido por qualquer pessoa: nada
 * de e-mail, WhatsApp, Discord ou id de inscrição. Sai o Riot ID, que é o nome de
 * jogo, e mais nada que identifique alguém fora do jogo.
 */
export type DraftPublico = {
  /**
   * Numeração da gravação, vinda da coluna `revisao`.
   *
   * Serve às telas para descartar resposta atrasada: numa rede ruim, a resposta de um
   * POST pode chegar DEPOIS de uma sondagem mais nova e fazer o quadro andar para
   * trás — mostrando de novo, como disponível, alguém que já foi escolhido. Não dá
   * para usar `escolhaAtual` no lugar: ele volta a zero quando o draft é remontado, e
   * a tela passaria a descartar tudo o que é novo. A revisão só cresce.
   */
  revisao: number;
  fase: EstadoDraft["fase"];
  times: { id: string; nome: string; cor: string; capitaoRiotId: string; gasto: number; vagas: number }[];
  elencos: Record<string, { riotId: string; pontos: number; rota1: string; rota2: string; elo: string; capitao: boolean }[]>;
  disponiveis: { id: string; riotId: string; pontos: number; rota1: string; rota2: string; elo: string }[];
  escolhaAtual: number;
  totalEscolhas: number;
  timeDaVezId: string | null;
  prazoISO: string | null;
  orcamentoPorTime: number;
  jogadoresPorTime: number;
  historico: { escolha: number; timeId: string; riotId: string; automatica: boolean }[];
};

export function paraPublico(estado: EstadoDraft, revisao: number): DraftPublico {
  const nomePor = new Map(estado.jogadores.map((j) => [j.id, j]));

  const elencos: DraftPublico["elencos"] = {};
  for (const time of estado.times) {
    elencos[time.id] = estado.jogadores
      .filter((j) => j.timeId === time.id)
      .map((j) => ({
        riotId: j.riotId,
        pontos: j.pontos,
        rota1: j.rota1,
        rota2: j.rota2,
        elo: j.elo,
        capitao: j.id === time.capitaoId,
      }));
  }

  return {
    revisao,
    fase: estado.fase,
    times: estado.times.map((t) => {
      const elenco = elencos[t.id] ?? [];
      return {
        id: t.id,
        nome: t.nome,
        cor: t.cor,
        capitaoRiotId: nomePor.get(t.capitaoId)?.riotId ?? "—",
        gasto: elenco.reduce((s, j) => s + j.pontos, 0),
        vagas: Math.max(0, estado.jogadoresPorTime - elenco.length),
      };
    }),
    elencos,
    // O id do jogador disponível SAI, porque o painel do capitão precisa dele para
    // escolher. É um uuid de inscrição sem significado fora daqui, e o servidor
    // confere de quem é a vez de qualquer forma.
    disponiveis: estado.jogadores
      .filter((j) => j.timeId === null)
      .map((j) => ({ id: j.id, riotId: j.riotId, pontos: j.pontos, rota1: j.rota1, rota2: j.rota2, elo: j.elo })),
    escolhaAtual: estado.escolhaAtual,
    totalEscolhas: estado.ordem.length,
    timeDaVezId: estado.ordem[estado.escolhaAtual] ?? null,
    prazoISO: estado.prazoISO,
    orcamentoPorTime: estado.orcamentoPorTime,
    jogadoresPorTime: estado.jogadoresPorTime,
    historico: estado.historico.map((e) => ({
      escolha: e.escolha,
      timeId: e.timeId,
      riotId: nomePor.get(e.jogadorId)?.riotId ?? "—",
      automatica: e.automatica,
    })),
  };
}

/** O time que este jogador capitaneia, ou null. Base da autorização da escolha. */
export function timeDoCapitao(estado: EstadoDraft, inscricaoId: string): string | null {
  return estado.times.find((t) => t.capitaoId === inscricaoId)?.id ?? null;
}
