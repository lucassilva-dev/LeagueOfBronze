import { teamColor } from "@/lib/design";
import type { SeriesFormat, TournamentDataset } from "@/lib/schema";
import { getSeriesFormat, getSeriesScore, getSeriesWinnerTeamId, isWalkoverSeries } from "@/lib/tournament";

export type CalTeamRef = { id: string; name: string; color: string; imageUrl?: string };
export type CalGame = {
  id: string;
  n: number;
  dateKey: string;
  dateLabel: string;
  turno: string;
  hora: string;
  /**
   * Formato REAL da série (`series.format`, com o padrão do torneio como reserva).
   *
   * O calendário rotulava MD3 fixo em toda série da fase regular e MD5 fixo na final,
   * ignorando o que está gravado: uma série da fase regular marcada como MD5 e
   * terminada em 3-1 aparecia aqui como "MD3", enquanto /partidas mostrava MD5.
   */
  format: SeriesFormat;
  teamA: CalTeamRef;
  teamB: CalTeamRef;
  stage: string;
  done: boolean;
  scoreA: number;
  scoreB: number;
  winnerId: string | null;
  walkover: boolean;
  walkoverReason?: string;
};
export type CalDay = { dateKey: string; dateLabel: string; dia: string; games: CalGame[] };

function weekdayLabel(dateKey: string): string {
  const date = new Date(`${dateKey}T12:00:00-03:00`);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("pt-BR", { weekday: "long", timeZone: "America/Sao_Paulo" })
    .format(date)
    .toUpperCase();
}

const FUSO_DE_BRASILIA = "America/Sao_Paulo";

/** Fuso escrito no fim do ISO: `Z`, `+00:00`, `-03:00`, `-0300`... */
const FUSO_DECLARADO = /(?:Z|[+-]\d{2}:?\d{2})$/i;

/** Brasília escrito por extenso. O Brasil não tem horário de verão desde 2019: -03:00 é fixo. */
const FUSO_DE_BRASILIA_ESCRITO = /-03:?00$/;

/**
 * Dia ("2026-11-20") e hora ("22:00") no relógio de Brasília.
 *
 * Com `-03:00`, sem fuso ou só com a data, o texto JÁ está no horário de Brasília e basta
 * recortar — é o formato que o calendário oficial e o painel gravam. Com qualquer outro
 * fuso (o caso comum é `Z`, de um `toISOString()`), o recorte lia o relógio de Greenwich:
 * "2026-11-21T01:00:00.000Z", que é sexta 20/11 às 22:00 em Brasília, aparecia no sábado
 * 21/11 à 01:00 — dia, hora e turno errados.
 */
function diaEHoraEmBrasilia(iso: string): { dateKey: string; hora: string } {
  const temHora = iso.length > 10 && iso[10] === "T";
  const recorte = { dateKey: iso.slice(0, 10), hora: temHora ? iso.slice(11, 16) : "" };
  if (!temHora || !FUSO_DECLARADO.test(iso) || FUSO_DE_BRASILIA_ESCRITO.test(iso)) return recorte;

  const instante = Date.parse(iso);
  if (Number.isNaN(instante)) return recorte;
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: FUSO_DE_BRASILIA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    // h23, e não `hour12: false`: em algumas versões do ICU este último escreve meia-noite
    // como "24:00".
    hourCycle: "h23",
  }).formatToParts(new Date(instante));
  const parte = (tipo: Intl.DateTimeFormatPartTypes) => partes.find((p) => p.type === tipo)?.value ?? "";
  return {
    dateKey: `${parte("year")}-${parte("month")}-${parte("day")}`,
    hora: `${parte("hour")}:${parte("minute")}`,
  };
}

function parseParts(iso: string) {
  const { dateKey, hora } = diaEHoraEmBrasilia(iso);
  const [, month, day] = dateKey.split("-");
  const dateLabel = day && month ? `${day}/${month}` : dateKey;
  const hour = hora ? Number(hora.slice(0, 2)) : Number.NaN;
  const turno = Number.isNaN(hour) ? "" : hour < 13 ? "Matutino" : hour < 18 ? "Vespertino" : "Noturno";
  return { dateKey, dateLabel, hora, turno };
}

/**
 * Instante da série em milissegundos, ou `null` quando ela só tem data (ou a data não se
 * lê). Sem fuso escrito, o horário é de Brasília — o mesmo critério de `lib/format.ts`.
 */
function instanteDaSerie(iso: string): number | null {
  if (!(iso.length > 10 && iso[10] === "T")) return null;
  const instante = Date.parse(FUSO_DECLARADO.test(iso) ? iso : `${iso}-03:00`);
  return Number.isNaN(instante) ? null : instante;
}

/**
 * Ordem das séries no calendário: pelo INSTANTE, quando as duas têm hora.
 *
 * Comparar o texto só funciona com todas no mesmo fuso. "2026-11-20T23:30:00.000Z"
 * (20:30 em Brasília) e "2026-11-20T21:00:00-03:00" saíam em ordem trocada, porque
 * "T23" vem depois de "T21" na comparação de texto — e a numeração "JOGO N" vem desta
 * ordem. Sem hora em uma delas, vale o dia (em Brasília) e, no mesmo dia, a sem hora
 * vem antes; é uma ordem total, então o `sort` não fica instável.
 */
export function compararDatasDeSerie(a: string, b: string): number {
  const instanteA = instanteDaSerie(a);
  const instanteB = instanteDaSerie(b);
  if (instanteA !== null && instanteB !== null) return instanteA - instanteB;
  const diaA = diaEHoraEmBrasilia(a).dateKey;
  const diaB = diaEHoraEmBrasilia(b).dateKey;
  if (diaA !== diaB) return diaA.localeCompare(diaB);
  if (instanteA === null && instanteB === null) return a.localeCompare(b);
  return instanteA === null ? -1 : 1;
}

export function buildRegularGames(dataset: TournamentDataset): CalGame[] {
  const teamsById = new Map(dataset.teams.map((team) => [team.id, team]));
  return dataset.seriesMatches
    .filter((series) => (series.stage ?? "REGULAR_SEASON") === "REGULAR_SEASON")
    .slice()
    .sort((a, b) => compararDatasDeSerie(a.date, b.date))
    .map((series, index) => {
      const parts = parseParts(series.date);
      const teamA = teamsById.get(series.teamAId);
      const teamB = teamsById.get(series.teamBId);
      const winnerId = getSeriesWinnerTeamId(series, dataset);
      const score = getSeriesScore(series, dataset);
      return {
        id: series.id,
        n: index + 1,
        dateKey: parts.dateKey,
        dateLabel: parts.dateLabel,
        turno: parts.turno,
        format: getSeriesFormat(series, dataset),
        hora: parts.hora,
        teamA: { id: series.teamAId, name: teamA?.name ?? series.teamAId, color: teamColor(series.teamAId), imageUrl: teamA?.imageUrl },
        teamB: { id: series.teamBId, name: teamB?.name ?? series.teamBId, color: teamColor(series.teamBId), imageUrl: teamB?.imageUrl },
        stage: series.stage ?? "REGULAR_SEASON",
        done: winnerId != null,
        scoreA: score.teamAWins,
        scoreB: score.teamBWins,
        winnerId,
        walkover: isWalkoverSeries(series),
        walkoverReason: series.walkoverReason,
      };
    });
}

/**
 * Semifinais (stage SEMIFINAL), em ordem de data.
 *
 * Até a 3ª não houve semifinal, e o calendário só lia fase regular e final: as duas
 * semifinais da 4ª (29/11) simplesmente não apareceriam em /calendario.
 */
export function buildSemifinalGames(dataset: TournamentDataset): CalGame[] {
  const teamsById = new Map(dataset.teams.map((team) => [team.id, team]));
  return dataset.seriesMatches
    .filter((series) => series.stage === "SEMIFINAL")
    .slice()
    .sort((a, b) => compararDatasDeSerie(a.date, b.date))
    .map((series, index) => {
      const parts = parseParts(series.date);
      const teamA = teamsById.get(series.teamAId);
      const teamB = teamsById.get(series.teamBId);
      const winnerId = getSeriesWinnerTeamId(series, dataset);
      const score = getSeriesScore(series, dataset);
      return {
        id: series.id,
        n: index + 1,
        dateKey: parts.dateKey,
        dateLabel: parts.dateLabel,
        turno: parts.turno,
        hora: parts.hora,
        format: getSeriesFormat(series, dataset),
        teamA: { id: series.teamAId, name: teamA?.name ?? series.teamAId, color: teamColor(series.teamAId), imageUrl: teamA?.imageUrl },
        teamB: { id: series.teamBId, name: teamB?.name ?? series.teamBId, color: teamColor(series.teamBId), imageUrl: teamB?.imageUrl },
        stage: "SEMIFINAL",
        done: winnerId != null,
        scoreA: score.teamAWins,
        scoreB: score.teamBWins,
        winnerId,
        walkover: isWalkoverSeries(series),
        walkoverReason: series.walkoverReason,
      };
    });
}

// Série da Grande Final (stage FINAL), se já existir no dataset.
export function buildFinalGame(dataset: TournamentDataset): CalGame | null {
  const teamsById = new Map(dataset.teams.map((team) => [team.id, team]));
  const series = dataset.seriesMatches.find((s) => (s.stage ?? "REGULAR_SEASON") === "FINAL");
  if (!series) return null;
  const parts = parseParts(series.date);
  const teamA = teamsById.get(series.teamAId);
  const teamB = teamsById.get(series.teamBId);
  const winnerId = getSeriesWinnerTeamId(series, dataset);
  const score = getSeriesScore(series, dataset);
  return {
    id: series.id,
    n: 0,
    dateKey: parts.dateKey,
    dateLabel: parts.dateLabel,
    turno: parts.turno,
    hora: parts.hora,
    format: getSeriesFormat(series, dataset),
    teamA: { id: series.teamAId, name: teamA?.name ?? series.teamAId, color: teamColor(series.teamAId), imageUrl: teamA?.imageUrl },
    teamB: { id: series.teamBId, name: teamB?.name ?? series.teamBId, color: teamColor(series.teamBId), imageUrl: teamB?.imageUrl },
    stage: "FINAL",
    done: winnerId != null,
    scoreA: score.teamAWins,
    scoreB: score.teamBWins,
    winnerId,
    walkover: isWalkoverSeries(series),
    walkoverReason: series.walkoverReason,
  };
}

export function buildCalendarDays(dataset: TournamentDataset): CalDay[] {
  const games = buildRegularGames(dataset);
  const byDay = new Map<string, CalGame[]>();
  for (const game of games) {
    const list = byDay.get(game.dateKey) ?? [];
    list.push(game);
    byDay.set(game.dateKey, list);
  }
  return [...byDay.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([dateKey, list]) => ({
      dateKey,
      dateLabel: list[0].dateLabel,
      dia: weekdayLabel(dateKey),
      games: list,
    }));
}
