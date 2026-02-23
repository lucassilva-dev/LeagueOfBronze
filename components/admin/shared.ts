import type {
  Player,
  PlayerGameStats,
  SeriesGame,
  SeriesMatch,
  Team,
  TournamentDataset,
} from "@/lib/schema";

export type AdminTab = "overview" | "teams" | "players" | "series" | "backup";
export type MutateDraft = (recipe: (draft: TournamentDataset) => void) => void;

export function slugifyValue(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function createBlankTeam(): Team {
  return {
    id: `team-${Date.now()}`,
    name: "",
    slug: "",
  };
}

export function createBlankPlayer(teamId?: string): Player {
  return {
    id: `player-${Date.now()}`,
    nick: "",
    slug: "",
    teamId: teamId ?? "",
    role1: "TOP",
    role2: "JUNG",
    elo: "PRAT",
  };
}

export function createBlankStatsRow(playerId = ""): PlayerGameStats {
  return {
    playerId,
    champion: "",
    kills: 0,
    deaths: 0,
    assists: 0,
  };
}

export function createBlankGame(): SeriesGame {
  return {
    winnerTeamId: "",
    durationMin: 30,
    mvpPlayerId: "",
    statsByPlayer: [],
  };
}

export function createBlankSeries(): SeriesMatch {
  const now = new Date();
  const isoDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate(),
  ).padStart(2, "0")}`;
  return {
    id: `serie-${Date.now()}`,
    date: isoDate,
    teamAId: "",
    teamBId: "",
    games: [],
  };
}

export function cloneDataset(dataset: TournamentDataset): TournamentDataset {
  return structuredClone(dataset);
}
