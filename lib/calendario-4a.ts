import type { SeriesFormat, SeriesMatch } from "@/lib/schema";

/**
 * Calendário oficial da 4ª Edição (decisão da organização, 2026-10-20).
 *
 * 6 times, um jogo de cada vez, 18 séries em dois fins de semana: 15 de pontos corridos
 * (todos contra todos, MD3) em 20, 21 e 22/11 e 27 e 28/11, e no domingo 29/11 as duas
 * semifinais (MD3) e a final (MD5). Sábado 28/11 às 19:00 fica VAGO, de reserva para
 * remarcar imprevistos.
 *
 * Os times aparecem como "Time 1" … "Time 6": são POSIÇÕES. Qual time real ocupa cada
 * posição sai de um sorteio ao vivo depois do draft (`seriesDaFaseDePontos` recebe a
 * lista já sorteada). As semifinais saem da tabela da fase de pontos: 1º x 4º e 2º x 3º.
 *
 * Horários em Brasília, gravados com o fuso (-03:00) — o mesmo formato das séries do
 * dataset, que `lib/calendar.ts` lê sem converter. Novembro de 2026 não tem horário de
 * verão no Brasil, então -03:00 vale para as seis datas.
 *
 * Fonte da verdade é ESTE arquivo: /regras, /calendario, a home e a criação das séries no
 * painel leem daqui. Mudou um horário, muda aqui — e rode os testes: algumas frases
 * (lib/i18n/messages/calendario-4a.ts, o período em /regras, na home e no formulário)
 * repetem datas por extenso, e tests/calendario-4a.test.tsx avisa qual ficou velha.
 */

export type TipoDoSlot = "pontos" | "semifinal" | "final" | "reserva";

export type SlotDoCalendario = {
  /** Data e hora com fuso, ex.: "2026-11-20T20:00:00-03:00". */
  quando: string;
  tipo: TipoDoSlot;
  /** Fase de pontos: as POSIÇÕES que se enfrentam (Time N x Time M). */
  confronto?: readonly [number, number];
  /** Semifinal 1 = 1º x 4º; semifinal 2 = 2º x 3º. */
  semifinal?: 1 | 2;
  formato?: SeriesFormat;
  /**
   * Pode começar depois do horário se o jogo anterior ainda estiver rolando — a equipe
   * espera. Sexta 22:00 e sábado 23:00.
   */
  podeAtrasar?: boolean;
};

/** O calendário só fecha com este número de times (todos contra todos = 15 séries). */
export const TIMES_DO_CALENDARIO_4A = 6;

export const CALENDARIO_4A: readonly SlotDoCalendario[] = [
  // ---- 1º fim de semana
  { quando: "2026-11-20T20:00:00-03:00", tipo: "pontos", confronto: [3, 6], formato: "BO3" },
  { quando: "2026-11-20T22:00:00-03:00", tipo: "pontos", confronto: [2, 5], formato: "BO3", podeAtrasar: true },

  { quando: "2026-11-21T08:30:00-03:00", tipo: "pontos", confronto: [3, 4], formato: "BO3" },
  { quando: "2026-11-21T13:30:00-03:00", tipo: "pontos", confronto: [1, 3], formato: "BO3" },
  { quando: "2026-11-21T15:30:00-03:00", tipo: "pontos", confronto: [4, 6], formato: "BO3" },
  { quando: "2026-11-21T21:00:00-03:00", tipo: "pontos", confronto: [5, 6], formato: "BO3" },
  { quando: "2026-11-21T23:00:00-03:00", tipo: "pontos", confronto: [2, 4], formato: "BO3", podeAtrasar: true },

  { quando: "2026-11-22T08:30:00-03:00", tipo: "pontos", confronto: [1, 6], formato: "BO3" },
  { quando: "2026-11-22T13:00:00-03:00", tipo: "pontos", confronto: [2, 6], formato: "BO3" },
  { quando: "2026-11-22T15:00:00-03:00", tipo: "pontos", confronto: [1, 4], formato: "BO3" },

  // ---- 2º fim de semana
  { quando: "2026-11-27T20:00:00-03:00", tipo: "pontos", confronto: [4, 5], formato: "BO3" },
  { quando: "2026-11-27T22:00:00-03:00", tipo: "pontos", confronto: [2, 3], formato: "BO3", podeAtrasar: true },

  { quando: "2026-11-28T08:30:00-03:00", tipo: "pontos", confronto: [1, 5], formato: "BO3" },
  { quando: "2026-11-28T13:30:00-03:00", tipo: "pontos", confronto: [1, 2], formato: "BO3" },
  { quando: "2026-11-28T15:30:00-03:00", tipo: "pontos", confronto: [3, 5], formato: "BO3" },
  { quando: "2026-11-28T19:00:00-03:00", tipo: "reserva" },

  { quando: "2026-11-29T08:30:00-03:00", tipo: "semifinal", semifinal: 1, formato: "BO3" },
  { quando: "2026-11-29T10:30:00-03:00", tipo: "semifinal", semifinal: 2, formato: "BO3" },
  { quando: "2026-11-29T14:30:00-03:00", tipo: "final", formato: "BO5" },
];

/** "2026-11-20" — o dia no calendário de Brasília (o ISO já vem com o fuso de lá). */
export function diaDoSlot(slot: Pick<SlotDoCalendario, "quando">): string {
  return slot.quando.slice(0, 10);
}

/** "20:00". */
export function horaDoSlot(slot: Pick<SlotDoCalendario, "quando">): string {
  return slot.quando.slice(11, 16);
}

/**
 * Turno pelo horário, com as MESMAS fronteiras de `lib/calendar.ts` (antes das 13h é
 * manhã, antes das 18h é tarde) — o calendário planejado e o das séries de verdade não
 * podem chamar o mesmo horário de turnos diferentes.
 */
export function turnoDoSlot(slot: Pick<SlotDoCalendario, "quando">): "manha" | "tarde" | "noite" {
  const hora = Number(slot.quando.slice(11, 13));
  return hora < 13 ? "manha" : hora < 18 ? "tarde" : "noite";
}

export type DiaDoCalendario = { dia: string; fimDeSemana: 1 | 2; slots: SlotDoCalendario[] };

/** Os seis dias, em ordem, cada um com o fim de semana a que pertence. */
export function diasDoCalendario4a(): DiaDoCalendario[] {
  const porDia = new Map<string, SlotDoCalendario[]>();
  for (const slot of [...CALENDARIO_4A].sort((a, b) => a.quando.localeCompare(b.quando))) {
    const lista = porDia.get(diaDoSlot(slot)) ?? [];
    lista.push(slot);
    porDia.set(diaDoSlot(slot), lista);
  }
  const dias = [...porDia.keys()];
  return dias.map((dia, i) => ({ dia, fimDeSemana: i < 3 ? 1 : 2, slots: porDia.get(dia)! }));
}

/**
 * O calendário oficial é o da temporada que está no ar?
 *
 * - com séries no dataset: a primeira delas cai dentro do período do calendário (o painel
 *   cria as séries a partir dele);
 * - sem série nenhuma: o calendário ainda não terminou.
 *
 * É a trava que impede a grade da 4ª (Time 1…6, final em 29/11/2026) de aparecer numa
 * edição seguinte — e a /tabela da 3ª, ainda no ar e encerrada, de anunciar semifinais que
 * ela não teve. `diasDasSeries` em "YYYY-MM-DD" (Brasília).
 */
export function calendarioEDestaTemporada(diasDasSeries: readonly string[], agoraMs: number = Date.now()): boolean {
  const dias = CALENDARIO_4A.map(diaDoSlot).sort();
  if (diasDasSeries.length === 0) return calendarioAindaPorVir(agoraMs);
  const primeiro = [...diasDasSeries].sort()[0]!;
  return primeiro >= dias[0]! && primeiro <= dias[dias.length - 1]!;
}

/** A última série do calendário ainda não passou. */
export function calendarioAindaPorVir(agoraMs: number = Date.now()): boolean {
  return Math.max(...CALENDARIO_4A.map((s) => Date.parse(s.quando))) >= agoraMs;
}

/** Período do calendário ("YYYY-MM-DD" de início e fim), se ele ainda está por vir. */
export function periodoDoCalendarioFuturo(agoraMs: number = Date.now()): { inicio: string; fim: string } | null {
  if (!calendarioAindaPorVir(agoraMs)) return null;
  const dias = CALENDARIO_4A.map(diaDoSlot).sort();
  return { inicio: dias[0]!, fim: dias[dias.length - 1]! };
}

/** Quantas séries de verdade (fora a reserva): 15 + 2 + 1 = 18. */
export function seriesNoCalendario4a(): number {
  return CALENDARIO_4A.filter((s) => s.tipo !== "reserva").length;
}

/** Id público da série N da fase de pontos — vira a URL /partidas/4a-jogo-01. */
export function idDaSerieDoCalendario(n: number): string {
  return `4a-jogo-${String(n).padStart(2, "0")}`;
}

/**
 * As 15 séries da fase de pontos, prontas para o dataset.
 *
 * `timesPorPosicao[0]` é o Time 1, `[1]` o Time 2 e assim por diante — a lista que o
 * sorteio das posições produziu. Semifinais e final NÃO saem daqui: os confrontos delas
 * dependem da tabela, e o dataset exige dois times de verdade em toda série.
 */
export function seriesDaFaseDePontos(timesPorPosicao: readonly string[]): SeriesMatch[] {
  if (timesPorPosicao.length !== TIMES_DO_CALENDARIO_4A) {
    throw new Error(
      `O calendário da 4ª é de ${TIMES_DO_CALENDARIO_4A} times; vieram ${timesPorPosicao.length}.`,
    );
  }
  if (new Set(timesPorPosicao).size !== timesPorPosicao.length) {
    throw new Error("O mesmo time apareceu em duas posições do calendário.");
  }

  return CALENDARIO_4A.filter((s) => s.tipo === "pontos").map((slot, i) => {
    const [a, b] = slot.confronto!;
    return {
      id: idDaSerieDoCalendario(i + 1),
      date: slot.quando,
      teamAId: timesPorPosicao[a - 1]!,
      teamBId: timesPorPosicao[b - 1]!,
      format: slot.formato ?? "BO3",
      stage: "REGULAR_SEASON",
      games: [],
    };
  });
}
