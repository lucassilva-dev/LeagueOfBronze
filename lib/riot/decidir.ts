import { pontosDoElo, type EstadoConferencia } from "@/lib/inscricoes/schema";
import { eloDaRiot, PLATAFORMA_DO_CAMPEONATO } from "@/lib/riot/elo";

/**
 * O que o robô da Riot faz com UM inscrito, a partir do que a Riot respondeu.
 *
 * Função pura — sem rede, sem banco, com o relógio recebido — porque é aqui que moram as
 * regras que não podem errar, e elas precisam ser testáveis caso a caso:
 *
 *  - **Veredicto humano é intocável.** O robô só decide um requisito que ainda é dele:
 *    ninguém gravou nada (`conferido_por` nulo) ou quem gravou foi ele mesmo. Basta um
 *    organizador escrever no item — até só uma observação — para o item sair do robô.
 *  - **O robô nunca recusa.** O pior que ele grava é `risco`, que pede olhar humano.
 *  - **Elo escolhido pela organização trava.** `elo_fonte = 'organizacao'` faz o robô parar
 *    de mexer no elo daquele inscrito; ele continua só registrando o que a Riot diz, para o
 *    painel mostrar a diferença.
 *  - **Depois do congelamento, preço não muda.** Nem pelo robô.
 *  - **Só devolve o que muda.** Rodar duas vezes seguidas dá decisão vazia — o cron da
 *    Vercel pode disparar em dobro.
 *
 * O jogador LÊ a observação de cada requisito em "Minha inscrição". Por isso as
 * observações daqui são escritas para ele, e nunca carregam nível de conta, vitórias,
 * derrotas ou qualquer suspeita — isso fica no `retrato`, que só a organização vê.
 */

/** Autor das gravações do robô. O "ô" garante que nenhum admin real tenha esse nome. */
export const AUTOR_RIOT = "robô-riot";

export type InscritoParaRobo = {
  nick: string;
  tag: string;
  situacao: string;
  elo_declarado: string;
  elo_verificado: string | null;
  elo_congelado: string | null;
  elo_fonte?: string | null;
  pontos: number;
  riot_regiao?: string | null;
  riot_partidas_janela?: number | null;
};

export type ConferenciaParaRobo = {
  item: string;
  estado: string;
  observacao: string | null;
  conferido_por: string | null;
};

export type SoloDuo = {
  tier: string;
  divisao: string | null;
  pdl: number | null;
  vitorias: number | null;
  derrotas: number | null;
};

/**
 * O que a Riot respondeu nesta rodada. `undefined` = não foi consultado agora (vale o que
 * está gravado); `null` em `solo` = consultado, e não há entrada da solo/duo.
 */
export type DadosRiot = {
  conta: { tipo: "ok"; puuid: string; gameName: string; tagLine: string } | { tipo: "nao_encontrado" };
  regiao?: string;
  solo?: SoloDuo | null;
  nivel?: number | null;
  partidasNaJanela?: number;
};

export type ConfigParaRobo = {
  congelamento_elo: string | null;
  inicio_campeonato: string | null;
  min_ranqueadas: number;
  /**
   * Alguém já foi congelado (botão «Congelar» da aba Times, mesmo sem data). Congelar é um
   * ato da edição — "os preços estão fechados" —, então daí em diante o robô não mexe no
   * elo de mais ninguém, nem de quem virou apto depois.
   */
  elos_ja_congelados?: boolean;
};

export type StatusRiot = "ok" | "sem_ranque_solo" | "riot_id_inexistente" | "outro_servidor" | "erro";

export type DecisaoDoRobo = {
  /** Colunas só de exibição (`riot_*`, `puuid`). Sempre gravadas: são do robô. */
  colunasRiot: Record<string, unknown>;
  /** `null` = não mexe no elo nem nos pontos. */
  elo: { para: string; pontos: number; de: string; pontosDe: number; mudouValor: boolean } | null;
  itens: { item: "d" | "e" | "m"; estado: EstadoConferencia; observacao: string; retrato: Record<string, unknown> }[];
};

const DIA_MS = 24 * 60 * 60 * 1000;

/** Nome comparável: a Riot não diferencia maiúsculas e o espaço não muda a conta. */
function comparavel(s: string): string {
  return s.normalize("NFC").toLowerCase().replace(/\s+/g, "");
}

export function mesmoRiotId(a: string, b: string): boolean {
  return comparavel(a) === comparavel(b);
}

/** A janela do item (e): dos 10 dias antes do início até o início. `null` sem data. */
export function janelaDoItemE(inicioCampeonato: string | null): { inicioMs: number; fimMs: number } | null {
  if (!inicioCampeonato) return null;
  const fimMs = new Date(inicioCampeonato).getTime();
  if (!Number.isFinite(fimMs)) return null;
  return { inicioMs: fimMs - 10 * DIA_MS, fimMs };
}

/** O item ainda é do robô: ninguém escreveu nele, ou quem escreveu foi o próprio robô. */
export function itemEhDoRobo(c: ConferenciaParaRobo | undefined): boolean {
  return !!c && (c.conferido_por === null || c.conferido_por === AUTOR_RIOT);
}

export function decidirSincronizacao(args: {
  inscrito: InscritoParaRobo;
  conferencias: readonly ConferenciaParaRobo[];
  riot: DadosRiot;
  config: ConfigParaRobo;
  agoraMs: number;
}): DecisaoDoRobo {
  const { inscrito, conferencias, riot, config, agoraMs } = args;
  const agoraIso = new Date(agoraMs).toISOString();
  const doItem = (item: string) => conferencias.find((c) => c.item === item);

  const colunasRiot: Record<string, unknown> = { riot_sincronizado_em: agoraIso, riot_erro: null };
  const itens: DecisaoDoRobo["itens"] = [];
  let elo: DecisaoDoRobo["elo"] = null;
  // O que foi visto na Riot, gravado junto de cada veredicto do robô. É a prova que a
  // organização consulta depois — o histórico externo muda.
  let retrato: Record<string, unknown> = { fonte: "riot", em: agoraIso, contaEncontrada: false };

  const quer = (item: "d" | "e" | "m", estado: EstadoConferencia, observacao: string) => {
    const atual = doItem(item);
    if (!itemEhDoRobo(atual)) return;
    if (atual!.estado === estado && (atual!.observacao ?? "") === observacao) return;
    itens.push({ item, estado, observacao, retrato });
  };

  // ------------------------------------------------ conta (item m)
  if (riot.conta.tipo === "nao_encontrado") {
    colunasRiot.riot_status = "riot_id_inexistente" satisfies StatusRiot;
    colunasRiot.puuid = null;
    colunasRiot.riot_id_atual = null;
    quer(
      "m",
      "risco",
      `Não encontramos o Riot ID ${inscrito.nick}#${inscrito.tag} na Riot. Confira o nick e a tag e avise a organização.`,
    );
    return { colunasRiot, elo, itens };
  }

  const conta = riot.conta;
  const riotIdAtual = `${conta.gameName}#${conta.tagLine}`;
  colunasRiot.puuid = conta.puuid;
  colunasRiot.riot_id_atual = riotIdAtual;

  const regiao = riot.regiao ?? inscrito.riot_regiao ?? null;
  if (riot.regiao !== undefined) colunasRiot.riot_regiao = riot.regiao;

  const rotulo = riot.solo ? eloDaRiot(riot.solo.tier) : null;
  if (riot.solo !== undefined) {
    colunasRiot.elo_riot = rotulo;
    colunasRiot.riot_divisao = riot.solo?.divisao ?? null;
    colunasRiot.riot_pdl = riot.solo?.pdl ?? null;
    colunasRiot.riot_vitorias = riot.solo?.vitorias ?? null;
    colunasRiot.riot_derrotas = riot.solo?.derrotas ?? null;
  }
  if (riot.nivel !== undefined) {
    colunasRiot.riot_nivel = riot.nivel;
    colunasRiot.riot_nivel_em = agoraIso;
  }
  if (riot.partidasNaJanela !== undefined) colunasRiot.riot_partidas_janela = riot.partidasNaJanela;
  const partidas = riot.partidasNaJanela ?? inscrito.riot_partidas_janela ?? null;

  retrato = {
    fonte: "riot",
    em: agoraIso,
    contaEncontrada: true,
    riotId: riotIdAtual,
    regiao: regiao ?? null,
    ...(riot.solo !== undefined && {
      solo: riot.solo
        ? { tier: riot.solo.tier, divisao: riot.solo.divisao, pdl: riot.solo.pdl, vitorias: riot.solo.vitorias, derrotas: riot.solo.derrotas }
        : null,
    }),
    ...(riot.nivel !== undefined && { nivel: riot.nivel }),
    ...(partidas !== null && { partidasNaJanela: partidas }),
  };

  const outroServidor = !!regiao && regiao.toLowerCase() !== PLATAFORMA_DO_CAMPEONATO;
  const trocouDeNick = !mesmoRiotId(riotIdAtual, `${inscrito.nick}#${inscrito.tag}`);

  // Status: o problema mais grave primeiro.
  let status: StatusRiot = "ok";
  if (outroServidor) status = "outro_servidor";
  else if (riot.solo === null) status = "sem_ranque_solo";
  else if (riot.solo && !rotulo) {
    status = "erro";
    colunasRiot.riot_erro = `tier desconhecido: ${riot.solo.tier}`;
  }
  colunasRiot.riot_status = status;

  // ------------------------------------------------ item m (regra 12)
  if (trocouDeNick) {
    quer(
      "m",
      "risco",
      `O Riot ID desta conta agora é ${riotIdAtual}. Trocar de nick sem avisar a organização pode desclassificar (regra 12) — avise no grupo.`,
    );
  } else {
    quer("m", "ok", "Conta confirmada na Riot.");
  }

  // ------------------------------------------------ item d (regra 3)
  if (outroServidor) {
    quer(
      "d",
      "risco",
      `Esta conta joga em outro servidor (${regiao!.toUpperCase()}). O campeonato é no servidor BR — fale com a organização.`,
    );
  } else if (riot.solo === null) {
    quer("d", "pendente", "Ainda sem ranque na solo/duo nesta temporada. A MD5 da solo/duo é obrigatória (regra 3).");
  } else if (riot.solo && rotulo) {
    quer("d", "ok", "MD5 da solo/duo confirmada na Riot.");
  }

  // ------------------------------------------------ item e (regra 4)
  const janela = janelaDoItemE(config.inicio_campeonato);
  if (janela && agoraMs >= janela.inicioMs && partidas !== null && !outroServidor) {
    const minimo = config.min_ranqueadas;
    if (partidas >= minimo) {
      quer("e", "ok", `${partidas} partidas na solo/duo nos 10 dias antes do início.`);
    } else if (agoraMs < janela.fimMs) {
      quer("e", "pendente", `${partidas} de ${minimo} partidas na solo/duo até agora (regra 4).`);
    } else {
      quer("e", "risco", `${partidas} de ${minimo} partidas na solo/duo nos 10 dias antes do início (regra 4).`);
    }
  }

  // ------------------------------------------------ elo
  const congelamentoMs = config.congelamento_elo ? new Date(config.congelamento_elo).getTime() : NaN;
  const passouDoCongelamento = Number.isFinite(congelamentoMs) && agoraMs >= congelamentoMs;
  const podeMexerNoElo =
    !inscrito.elo_congelado &&
    inscrito.elo_fonte !== "organizacao" &&
    !passouDoCongelamento &&
    !config.elos_ja_congelados &&
    !outroServidor;

  if (podeMexerNoElo && rotulo) {
    const pontos = pontosDoElo(rotulo);
    if (pontos !== null) {
      const de = inscrito.elo_verificado ?? inscrito.elo_declarado;
      if (inscrito.elo_verificado !== rotulo || inscrito.elo_fonte !== "riot" || inscrito.pontos !== pontos) {
        elo = { para: rotulo, pontos, de, pontosDe: inscrito.pontos, mudouValor: de !== rotulo || inscrito.pontos !== pontos };
      }
    }
  }

  return { colunasRiot, elo, itens };
}

/** Deve buscar as partidas da janela do (e) nesta rodada? Só com a janela aberta e conta no BR. */
export function precisaContarPartidas(args: {
  inicioCampeonato: string | null;
  partidasGravadas: number | null;
  minimo: number;
  agoraMs: number;
}): { inicioS: number; fimS: number } | null {
  const janela = janelaDoItemE(args.inicioCampeonato);
  if (!janela || args.agoraMs < janela.inicioMs) return null;
  // Janela fechada há mais de 2 dias: a contagem já é definitiva, não gasta cota.
  if (args.agoraMs > janela.fimMs + 2 * DIA_MS && args.partidasGravadas !== null) return null;
  // Dentro da janela a contagem só cresce: quem já bateu o mínimo não precisa de outra consulta.
  if (args.partidasGravadas !== null && args.partidasGravadas >= args.minimo) return null;
  return { inicioS: janela.inicioMs / 1000, fimS: Math.min(args.agoraMs, janela.fimMs) / 1000 };
}
