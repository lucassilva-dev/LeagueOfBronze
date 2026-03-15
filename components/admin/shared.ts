import type {
  Player,
  PlayerGameStats,
  SeriesFormat,
  SeriesGame,
  SeriesMatch,
  Team,
  TournamentDataset,
} from "@/lib/schema";

export type AdminTab = "overview" | "teams" | "players" | "series" | "backup";
export type MutateDraft = (recipe: (draft: TournamentDataset) => void) => void;

function isCombiningMark(char: string) {
  const code = char.codePointAt(0) ?? 0;
  return code >= 0x0300 && code <= 0x036f;
}

function isSlugChar(char: string) {
  const code = char.codePointAt(0) ?? 0;
  const isDigit = code >= 48 && code <= 57;
  const isLowercaseLetter = code >= 97 && code <= 122;
  return isDigit || isLowercaseLetter;
}

export function slugifyValue(value: string) {
  const normalized = Array.from(value.normalize("NFD"))
    .filter((char) => !isCombiningMark(char))
    .join("")
    .toLowerCase()
    .trim();

  let slug = "";
  let previousWasHyphen = false;

  for (const char of normalized) {
    if (isSlugChar(char)) {
      slug += char;
      previousWasHyphen = false;
      continue;
    }

    if (!previousWasHyphen && slug.length > 0) {
      slug += "-";
      previousWasHyphen = true;
    }
  }

  return slug.endsWith("-") ? slug.slice(0, -1) : slug;
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

export function createBlankSeries(defaultFormat: SeriesFormat = "BO3"): SeriesMatch {
  const now = new Date();
  const isoDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate(),
  ).padStart(2, "0")}`;
  return {
    id: `serie-${Date.now()}`,
    date: isoDate,
    teamAId: "",
    teamBId: "",
    stage: "REGULAR_SEASON",
    format: defaultFormat,
    games: [],
  };
}

export function cloneDataset(dataset: TournamentDataset): TournamentDataset {
  return structuredClone(dataset);
}
