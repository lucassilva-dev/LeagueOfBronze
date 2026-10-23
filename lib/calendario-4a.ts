import { CALENDARIO_OFICIAL_4A } from "@/lib/calendario-4a-grade";
import type { SeriesFormat, SeriesMatch } from "@/lib/schema";

/**
 * Calendário oficial da 4ª Edição — os tipos, as contas e as travas.
 *
 * 8 TIMES, DATAS A DIVULGAR (decisão da organização, 2026-10-22). A 4ª passou de 30 para
 * 40 jogadores; o calendário de 6 times (20 a 29/11) deixou de valer e o de 8 ainda não
 * tem datas. A GRADE (dia, hora, confronto) mora em lib/calendario-4a-grade.ts, que explica
 * no topo como preenchê-la — é o único lugar a editar quando as datas chegarem.
 *
 * Enquanto `calendarioDivulgado()` for falso, quem lê daqui mostra o formato (8 times, 28
 * séries de pontos em MD3, semifinais 1º x 4º e 2º x 3º em MD3, final em MD5) e "datas a
 * divulgar": nada de grade, de período nem de horário de reserva. O painel não cria séries.
 *
 * Com a grade divulgada: os times aparecem como "Time 1" … "Time 8" — POSIÇÕES. Qual time
 * real ocupa cada posição sai de um sorteio ao vivo depois do draft (`seriesDaFaseDePontos`
 * recebe a lista já sorteada). As semifinais saem da tabela da fase de pontos.
 *
 * Horários em Brasília, gravados com o fuso (-03:00) — o mesmo formato das séries do
 * dataset, que `lib/calendar.ts` lê sem converter.
 *
 * Quem lê daqui: /regras, /calendario, a home (da pré-temporada e da temporada), a /tabela
 * e a criação das séries no painel do draft. Toda função que depende da grade recebe o
 * calendário como último parâmetro (o oficial por padrão): os testes passam uma grade de
 * mentira de 8 times sem mexer na oficial.
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
   * Pode começar depois do horário se o jogo anterior do mesmo dia ainda estiver rolando —
   * a equipe espera. Nunca começa antes.
   */
  podeAtrasar?: boolean;
};

/**
 * O calendário de uma edição: quantos times, e a grade — que só existe depois de
 * divulgada. `divulgado: false` é o estado "datas a divulgar", explícito de propósito: uma
 * lista vazia também poderia ser um erro de digitação.
 */
export type CalendarioDaEdicao =
  | Readonly<{ divulgado: false; times: number }>
  | Readonly<{ divulgado: true; times: number; slots: readonly SlotDoCalendario[] }>;

/**
 * O calendário oficial da 4ª (lib/calendario-4a-grade.ts), lido na hora: é o padrão de toda
 * função abaixo. Função, e não constante, para um teste poder trocar a grade entre um caso
 * e outro (vi.mock do módulo de dados com um getter).
 */
export function calendarioOficial(): CalendarioDaEdicao {
  return CALENDARIO_OFICIAL_4A;
}

/** Número de times da 4ª Edição: o calendário só fecha com ele (8). */
export const TIMES_DO_CALENDARIO_4A: number = calendarioOficial().times;

/** Jogadores por time no regulamento (5v5): é com ele que 8 times viram 40 vagas. */
export const JOGADORES_POR_TIME_DO_CALENDARIO = 5;

/** A grade de um calendário — vazia enquanto as datas não foram divulgadas. */
export function slotsDoCalendario(cal: CalendarioDaEdicao = calendarioOficial()): readonly SlotDoCalendario[] {
  return cal.divulgado ? cal.slots : [];
}

/** A grade oficial da 4ª. Vazia enquanto o calendário de 8 times não foi divulgado. */
export const CALENDARIO_4A: readonly SlotDoCalendario[] = slotsDoCalendario(calendarioOficial());

/** As datas e os horários dos jogos já foram divulgados? Falso = "datas a divulgar". */
export function calendarioDivulgado(cal: CalendarioDaEdicao = calendarioOficial()): boolean {
  return cal.divulgado && cal.slots.length > 0;
}

/** Séries da fase de pontos com N times, todos contra todos uma vez: N(N-1)/2 (8 → 28). */
export function seriesDePontosCom(times: number): number {
  return (times * (times - 1)) / 2;
}

/** Séries da edição inteira com N times: a fase de pontos, 2 semifinais e a final (8 → 31). */
export function seriesDaEdicaoCom(times: number): number {
  return seriesDePontosCom(times) + 3;
}

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

const QUANDO_EM_BRASILIA = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00-03:00$/;

/**
 * O que está errado numa grade — vazio quando ela fecha. É a conferência de quem preenche
 * lib/calendario-4a-grade.ts, e o teste roda nela sobre a grade oficial.
 *
 * Confere: fuso de Brasília escrito; fase de pontos todos contra todos (cada par de
 * posições 1..N exatamente uma vez, em MD3); as duas semifinais (MD3) e a final (MD5), uma
 * de cada; pelo menos um horário de reserva (a regra 9 manda remarcar para ele); e a ordem
 * — nenhuma semifinal antes do último jogo de pontos, nenhuma final antes das semifinais.
 */
export function problemasDaGrade(cal: CalendarioDaEdicao = calendarioOficial()): string[] {
  if (!cal.divulgado) return [];
  const problemas: string[] = [];
  const n = cal.times;
  if (!Number.isInteger(n) || n < 2) return [`Número de times inválido: ${n}.`];
  if (cal.slots.length === 0) return ["Calendário divulgado sem nenhum horário."];

  for (const s of cal.slots) {
    if (!QUANDO_EM_BRASILIA.test(s.quando) || Number.isNaN(Date.parse(s.quando))) {
      problemas.push(`Horário fora do formato "AAAA-MM-DDTHH:mm:00-03:00": ${s.quando}.`);
    }
  }

  const pontos = cal.slots.filter((s) => s.tipo === "pontos");
  const pares = new Map<string, number>();
  for (const s of pontos) {
    const [a, b] = s.confronto ?? [0, 0];
    if (!Number.isInteger(a) || !Number.isInteger(b) || a < 1 || b < 1 || a > n || b > n || a === b) {
      problemas.push(`Confronto inválido em ${s.quando}: ${a} x ${b} (as posições vão de 1 a ${n}).`);
      continue;
    }
    const par = `${Math.min(a, b)}x${Math.max(a, b)}`;
    pares.set(par, (pares.get(par) ?? 0) + 1);
    if ((s.formato ?? "BO3") !== "BO3") problemas.push(`A fase de pontos é em MD3: ${s.quando} está em ${s.formato}.`);
  }
  for (let a = 1; a <= n; a++) {
    for (let b = a + 1; b <= n; b++) {
      const vezes = pares.get(`${a}x${b}`) ?? 0;
      if (vezes === 0) problemas.push(`Falta o confronto Time ${a} x Time ${b}.`);
      if (vezes > 1) problemas.push(`O confronto Time ${a} x Time ${b} aparece ${vezes} vezes.`);
    }
  }
  if (pontos.length !== seriesDePontosCom(n)) {
    problemas.push(`São ${pontos.length} séries de pontos; com ${n} times são ${seriesDePontosCom(n)}.`);
  }

  const semis = cal.slots.filter((s) => s.tipo === "semifinal");
  const numeros = semis.map((s) => s.semifinal).sort();
  if (numeros.length !== 2 || numeros[0] !== 1 || numeros[1] !== 2) {
    problemas.push("São duas semifinais: a 1 (1º x 4º) e a 2 (2º x 3º), uma de cada.");
  }
  for (const s of semis) if (s.formato !== "BO3") problemas.push(`Semifinal em ${s.quando} precisa ser MD3.`);

  const finais = cal.slots.filter((s) => s.tipo === "final");
  if (finais.length !== 1) problemas.push(`É uma final só; a grade tem ${finais.length}.`);
  for (const s of finais) if (s.formato !== "BO5") problemas.push(`A final (${s.quando}) é em MD5.`);

  if (!cal.slots.some((s) => s.tipo === "reserva")) {
    problemas.push("Falta o horário de reserva: a regra 9 manda remarcar para ele.");
  }

  const instantes = (tipo: TipoDoSlot) => cal.slots.filter((s) => s.tipo === tipo).map((s) => Date.parse(s.quando));
  const ultimoPonto = Math.max(...instantes("pontos"));
  const primeiraSemi = Math.min(...instantes("semifinal"));
  const ultimaSemi = Math.max(...instantes("semifinal"));
  const final = Math.min(...instantes("final"));
  if (semis.length > 0 && pontos.length > 0 && primeiraSemi <= ultimoPonto) {
    problemas.push("Uma semifinal está antes do último jogo da fase de pontos — ela depende da tabela.");
  }
  if (finais.length > 0 && semis.length > 0 && final <= ultimaSemi) {
    problemas.push("A final está antes de uma semifinal.");
  }

  return problemas;
}

export type DiaDoCalendario = { dia: string; fimDeSemana: number; slots: SlotDoCalendario[] };

/** Segunda-feira da semana de um dia "YYYY-MM-DD": é o que agrupa os dias em fins de semana. */
function segundaDaSemana(dia: string): string {
  const [ano, mes, d] = dia.split("-").map(Number);
  const data = new Date(Date.UTC(ano!, mes! - 1, d!));
  const desdeSegunda = (data.getUTCDay() + 6) % 7;
  data.setUTCDate(data.getUTCDate() - desdeSegunda);
  return data.toISOString().slice(0, 10);
}

/**
 * Os dias de jogo, em ordem, cada um com o fim de semana a que pertence (1, 2, 3…: os dias
 * da mesma semana, de segunda a domingo, são do mesmo fim de semana). Vazio enquanto as
 * datas não foram divulgadas.
 */
export function diasDoCalendario4a(cal: CalendarioDaEdicao = calendarioOficial()): DiaDoCalendario[] {
  const porDia = new Map<string, SlotDoCalendario[]>();
  for (const slot of [...slotsDoCalendario(cal)].sort((a, b) => a.quando.localeCompare(b.quando))) {
    const lista = porDia.get(diaDoSlot(slot)) ?? [];
    lista.push(slot);
    porDia.set(diaDoSlot(slot), lista);
  }
  const semanas = new Map<string, number>();
  return [...porDia.keys()].map((dia) => {
    const semana = segundaDaSemana(dia);
    if (!semanas.has(semana)) semanas.set(semana, semanas.size + 1);
    return { dia, fimDeSemana: semanas.get(semana)!, slots: porDia.get(dia)! };
  });
}

/** Primeiro e último dia da grade ("YYYY-MM-DD"), ou nulo sem datas divulgadas. */
export function periodoDoCalendario(cal: CalendarioDaEdicao = calendarioOficial()): { inicio: string; fim: string } | null {
  const dias = slotsDoCalendario(cal).map(diaDoSlot).sort();
  if (dias.length === 0) return null;
  return { inicio: dias[0]!, fim: dias[dias.length - 1]! };
}

/**
 * O calendário oficial é o da temporada que está no ar?
 *
 * - sem datas divulgadas: não — não há grade para completar nada;
 * - com séries no dataset: a primeira delas cai dentro do período do calendário (o painel
 *   cria as séries a partir dele);
 * - sem série nenhuma: o calendário ainda não terminou.
 *
 * É a trava que impede a grade da 4ª (Time 1…8) de aparecer numa edição seguinte — e a
 * /tabela da 3ª, ainda no ar e encerrada, de anunciar semifinais que ela não teve.
 * `diasDasSeries` em "YYYY-MM-DD" (Brasília).
 */
export function calendarioEDestaTemporada(
  diasDasSeries: readonly string[],
  agoraMs: number = Date.now(),
  cal: CalendarioDaEdicao = calendarioOficial(),
): boolean {
  const periodo = periodoDoCalendario(cal);
  if (!periodo) return false;
  if (diasDasSeries.length === 0) return calendarioAindaPorVir(agoraMs, cal);
  const primeiro = [...diasDasSeries].sort()[0]!;
  return primeiro >= periodo.inicio && primeiro <= periodo.fim;
}

/** A grade foi divulgada e a última série dela ainda não passou. */
export function calendarioAindaPorVir(agoraMs: number = Date.now(), cal: CalendarioDaEdicao = calendarioOficial()): boolean {
  const slots = slotsDoCalendario(cal);
  if (slots.length === 0) return false;
  return Math.max(...slots.map((s) => Date.parse(s.quando))) >= agoraMs;
}

/**
 * A pré-temporada ainda fala deste calendário: ou ele está por vir, ou as datas ainda não
 * saíram (o "a divulgar" é desta edição). Passada a grade divulgada, não fala mais.
 */
export function calendarioPorVirOuADivulgar(agoraMs: number = Date.now(), cal: CalendarioDaEdicao = calendarioOficial()): boolean {
  return !calendarioDivulgado(cal) || calendarioAindaPorVir(agoraMs, cal);
}

/** Período do calendário ("YYYY-MM-DD" de início e fim), se ele foi divulgado e ainda está por vir. */
export function periodoDoCalendarioFuturo(
  agoraMs: number = Date.now(),
  cal: CalendarioDaEdicao = calendarioOficial(),
): { inicio: string; fim: string } | null {
  if (!calendarioAindaPorVir(agoraMs, cal)) return null;
  return periodoDoCalendario(cal);
}

/** Quantas séries de verdade a grade tem (fora a reserva). Zero enquanto a divulgar. */
export function seriesNoCalendario4a(cal: CalendarioDaEdicao = calendarioOficial()): number {
  return slotsDoCalendario(cal).filter((s) => s.tipo !== "reserva").length;
}

/** Id público da série N da fase de pontos — vira a URL /partidas/4a-jogo-01. */
export function idDaSerieDoCalendario(n: number): string {
  return `4a-jogo-${String(n).padStart(2, "0")}`;
}

/** Mensagem de quem tenta criar séries sem a grade: a rota e o painel dizem o mesmo. */
export function motivoSemCalendario(cal: CalendarioDaEdicao = calendarioOficial()): string {
  return `O calendário de ${cal.times} times ainda não foi definido: sem datas, não há séries para criar. Quando ele for publicado, esta ação sorteia as posições (Time 1 … Time ${cal.times}) e cria as ${seriesDePontosCom(cal.times)} séries da fase de pontos.`;
}

/**
 * As séries da fase de pontos, prontas para o dataset (28 com 8 times).
 *
 * `timesPorPosicao[0]` é o Time 1, `[1]` o Time 2 e assim por diante — a lista que o
 * sorteio das posições produziu. Semifinais e final NÃO saem daqui: os confrontos delas
 * dependem da tabela, e o dataset exige dois times de verdade em toda série.
 *
 * Sem calendário divulgado, recusa: não há data para dar às séries.
 */
export function seriesDaFaseDePontos(
  timesPorPosicao: readonly string[],
  cal: CalendarioDaEdicao = calendarioOficial(),
): SeriesMatch[] {
  if (!calendarioDivulgado(cal)) throw new Error(motivoSemCalendario(cal));
  if (timesPorPosicao.length !== cal.times) {
    throw new Error(`O calendário da 4ª é de ${cal.times} times; vieram ${timesPorPosicao.length}.`);
  }
  if (new Set(timesPorPosicao).size !== timesPorPosicao.length) {
    throw new Error("O mesmo time apareceu em duas posições do calendário.");
  }

  return slotsDoCalendario(cal)
    .filter((s) => s.tipo === "pontos")
    .map((slot, i) => {
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
