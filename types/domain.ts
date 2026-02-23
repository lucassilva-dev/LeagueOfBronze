import type {
  Player,
  SeriesGame,
  SeriesMatch,
  Team,
  TournamentDataset,
} from "@/lib/schema";

export type { Player, SeriesGame, SeriesMatch, Team, TournamentDataset };

export type StandingsSource = "seed" | "series";

export interface StandingsRow {
  position: number;
  teamId: string;
  teamName: string;
  teamSlug: string;
  seriesPlayed: number;
  seriesWon: number;
  seriesLost: number;
  points: number;
  gamesWon: number;
  gamesLost: number;
  gameDiff: number;
  seriesWinRate: number;
  fromSeed: boolean;
}

export interface SeriesScore {
  teamAWins: number;
  teamBWins: number;
}

export interface SeriesMvpResult {
  playerId: string;
  gameMvpCount: number;
  kda: number;
}

export interface SeriesSummary {
  series: SeriesMatch;
  score: SeriesScore;
  winnerTeamId: string | null;
  isComplete: boolean;
  mvp: SeriesMvpResult | null;
}

export interface PlayerAggregate {
  playerId: string;
  playerNick: string;
  playerSlug: string;
  teamId: string;
  teamName: string;
  teamSlug: string;
  kills: number;
  deaths: number;
  assists: number;
  gamesPlayed: number;
  gameMvps: number;
  seriesMvps: number;
  kda: number;
}

export interface TeamAggregate {
  teamId: string;
  teamName: string;
  teamSlug: string;
  kills: number;
  deaths: number;
  assists: number;
  gamesPlayed: number;
  gameMvps: number;
  seriesMvps: number;
  kda: number;
  gameDiff: number;
}

export type LeaderboardMetric =
  | "kills"
  | "kda"
  | "mvps"
  | "assists"
  | "deathsLeast";

export interface LeaderboardRow {
  position: number;
  metric: LeaderboardMetric;
  value: number;
  player: PlayerAggregate;
}

export interface DateRangeFilter {
  from?: string;
  to?: string;
}
