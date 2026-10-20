import { ELO_ORDER, resolveElo } from "@/lib/design";

/**
 * Quem capitaneia na 4ª Edição: "os inscritos de maior elo na fila solo/duo,
 * independentemente da rota", e "os organizadores desta edição jogam, mas não são
 * capitães" (seção Formação dos times de /regras).
 *
 * Funções PURAS — a lista entra pronta, nada de banco — para a regra ser conferível num
 * teste. É a parte do draft que decide quem tem vantagem de escolha, e "deu diferente e
 * ninguém sabe por quê" não pode acontecer aqui.
 *
 * Elo maior = elo (Ferro…Desafiante), depois divisão (I acima de IV), depois PDL. Divisão
 * e PDL só existem quando o robô da Riot leu a conta E a leitura bate com o elo que vale
 * (o elo pode ter sido travado à mão pela organização num tier diferente do da Riot — aí
 * a divisão lida não diz nada sobre ele).
 *
 * EMPATE NO CORTE não é resolvido aqui de propósito. O regulamento não diz o que fazer
 * quando o último capitão e o primeiro de fora têm o mesmo elo, divisão e PDL (é uma das
 * perguntas em aberto para a organização). Em vez de inventar um critério — alfabeto,
 * ordem de inscrição — a função devolve o empate e o sorteio do draft recusa até alguém
 * decidir e marcar os capitães à mão.
 */

export type CandidatoACapitao = {
  id: string;
  riotId: string;
  organizador: boolean;
  /** O elo que VALE (congelado ?? verificado ?? declarado) — o mesmo que dá o preço. */
  elo: string;
  /** O que a Riot mostrou na última leitura. */
  eloRiot?: string | null;
  divisao?: string | null;
  pdl?: number | null;
};

export type ForcaDoElo = {
  /** Índice em ELO_ORDER (Ferro = 0). -1 para elo que a tabela não reconhece. */
  tier: number;
  /** I = 4 … IV = 1; 0 nos tiers sem divisão (Mestre+). Nulo = sem leitura da Riot. */
  divisao: number | null;
  pdl: number | null;
  /** "Diamante II · 54 PDL", "Mestre · 210 PDL", "Ouro". */
  rotulo: string;
};

const DIVISOES: Record<string, number> = { I: 4, II: 3, III: 2, IV: 1 };
const SEM_DIVISAO = new Set(["mestre", "grao-mestre", "desafiante"]);

export function forcaDoElo(c: Pick<CandidatoACapitao, "elo" | "eloRiot" | "divisao" | "pdl">): ForcaDoElo {
  const meta = resolveElo(c.elo);
  const tier = meta ? ELO_ORDER.findIndex((e) => e.key === meta.key) : -1;
  const rotuloBase = meta?.label ?? c.elo;

  // A leitura da Riot só vale como desempate se for do MESMO elo que dá o preço.
  const metaRiot = resolveElo(c.eloRiot ?? null);
  const leituraBate = Boolean(meta && metaRiot && metaRiot.key === meta.key);
  if (!leituraBate || !meta) return { tier, divisao: null, pdl: null, rotulo: rotuloBase };

  const apex = SEM_DIVISAO.has(meta.key);
  const divisao = apex ? 0 : (DIVISOES[(c.divisao ?? "").trim().toUpperCase()] ?? null);
  const pdl = typeof c.pdl === "number" && Number.isFinite(c.pdl) ? c.pdl : null;

  const romano = !apex && c.divisao ? ` ${c.divisao.trim().toUpperCase()}` : "";
  const rotulo = `${rotuloBase}${divisao === null ? "" : romano}${pdl === null ? "" : ` · ${pdl} PDL`}`;
  return { tier, divisao, pdl, rotulo };
}

/** Negativo quando `a` é MAIS forte (para ordenar do maior para o menor). */
export function compararForca(a: ForcaDoElo, b: ForcaDoElo): number {
  if (a.tier !== b.tier) return b.tier - a.tier;
  const da = a.divisao ?? -1;
  const db = b.divisao ?? -1;
  if (da !== db) return db - da;
  return (b.pdl ?? -1) - (a.pdl ?? -1);
}

/**
 * Os dois não dá para separar pelo elo.
 *
 * Mesmo tier e, ou falta a leitura da Riot de um dos dois (não se sabe quem está acima),
 * ou divisão e PDL são iguais.
 */
export function empatados(a: ForcaDoElo, b: ForcaDoElo): boolean {
  if (a.tier !== b.tier) return false;
  if (a.divisao === null || b.divisao === null || a.pdl === null || b.pdl === null) return true;
  return a.divisao === b.divisao && a.pdl === b.pdl;
}

export type RankingDeCapitaes = {
  /** Quem pode ser capitão, do maior elo para o menor. Organizadores ficam de fora. */
  ranking: (CandidatoACapitao & { forca: ForcaDoElo })[];
  /** Ids dos `quantos` primeiros — vazio quando o corte não fecha (empate ou falta gente). */
  escolhidos: string[];
  /** Riot IDs empatados em cima do corte (o último que entraria e quem empata com ele). */
  empateNoCorte: string[] | null;
  /** Organizadores aprovados que foram pulados — a tela mostra, para ninguém estranhar. */
  organizadoresFora: string[];
  /** Quantos capitães faltam (candidatos de menos). Zero quando há gente suficiente. */
  faltam: number;
};

export function rankingDeCapitaes(
  candidatos: readonly CandidatoACapitao[],
  quantos: number,
): RankingDeCapitaes {
  const organizadoresFora = candidatos.filter((c) => c.organizador).map((c) => c.riotId);
  const ranking = candidatos
    .filter((c) => !c.organizador)
    .map((c) => ({ ...c, forca: forcaDoElo(c) }))
    // O riotId só estabiliza a EXIBIÇÃO de quem empata; nunca decide o corte (ver abaixo).
    .sort((a, b) => compararForca(a.forca, b.forca) || a.riotId.localeCompare(b.riotId));

  if (quantos <= 0) return { ranking, escolhidos: [], empateNoCorte: null, organizadoresFora, faltam: 0 };

  if (ranking.length < quantos) {
    return { ranking, escolhidos: [], empateNoCorte: null, organizadoresFora, faltam: quantos - ranking.length };
  }

  // O corte é ambíguo se ALGUÉM de dentro não se separa de ALGUÉM de fora. Não basta
  // olhar o par vizinho do corte: quem não tem leitura da Riot vai para o fim do próprio
  // elo na ordenação, mas pode estar acima de quem entrou — não há como saber.
  const dentro = ranking.slice(0, quantos);
  const fora = ranking.slice(quantos);
  const empate = new Set<string>();
  for (const d of dentro) {
    for (const f of fora) {
      if (empatados(d.forca, f.forca)) {
        empate.add(d.riotId);
        empate.add(f.riotId);
      }
    }
  }
  if (empate.size > 0) {
    const empateNoCorte = ranking.filter((c) => empate.has(c.riotId)).map((c) => c.riotId);
    return { ranking, escolhidos: [], empateNoCorte, organizadoresFora, faltam: 0 };
  }

  return {
    ranking,
    escolhidos: ranking.slice(0, quantos).map((c) => c.id),
    empateNoCorte: null,
    organizadoresFora,
    faltam: 0,
  };
}
