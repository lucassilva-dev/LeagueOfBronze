import type { TournamentDataset } from "@/lib/schema";
import { teamColor } from "@/lib/design";

export type CalTeamRef = { id: string; name: string; color: string; imageUrl?: string };
export type CalGame = {
  id: string;
  n: number;
  dateKey: string;
  dateLabel: string;
  turno: string;
  hora: string;
  teamA: CalTeamRef;
  teamB: CalTeamRef;
  stage: string;
};
export type CalDay = { dateKey: string; dateLabel: string; dia: string; games: CalGame[] };

function weekdayLabel(dateKey: string): string {
  const date = new Date(`${dateKey}T12:00:00-03:00`);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("pt-BR", { weekday: "long", timeZone: "America/Sao_Paulo" })
    .format(date)
    .toUpperCase();
}

function parseParts(iso: string) {
  const dateKey = iso.slice(0, 10);
  const [, month, day] = dateKey.split("-");
  const dateLabel = day && month ? `${day}/${month}` : dateKey;
  const hora = iso.length > 10 ? iso.slice(11, 16) : "";
  const hour = hora ? Number(hora.slice(0, 2)) : Number.NaN;
  const turno = Number.isNaN(hour) ? "" : hour < 13 ? "Matutino" : hour < 18 ? "Vespertino" : "Noturno";
  return { dateKey, dateLabel, hora, turno };
}

export function buildRegularGames(dataset: TournamentDataset): CalGame[] {
  const teamsById = new Map(dataset.teams.map((team) => [team.id, team]));
  return dataset.seriesMatches
    .filter((series) => (series.stage ?? "REGULAR_SEASON") === "REGULAR_SEASON")
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((series, index) => {
      const parts = parseParts(series.date);
      const teamA = teamsById.get(series.teamAId);
      const teamB = teamsById.get(series.teamBId);
      return {
        id: series.id,
        n: index + 1,
        dateKey: parts.dateKey,
        dateLabel: parts.dateLabel,
        turno: parts.turno,
        hora: parts.hora,
        teamA: { id: series.teamAId, name: teamA?.name ?? series.teamAId, color: teamColor(series.teamAId), imageUrl: teamA?.imageUrl },
        teamB: { id: series.teamBId, name: teamB?.name ?? series.teamBId, color: teamColor(series.teamBId), imageUrl: teamB?.imageUrl },
        stage: series.stage ?? "REGULAR_SEASON",
      };
    });
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
