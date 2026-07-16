import type { SeriesMatch as SchemaSeriesMatch } from "@/lib/schema";

export type {
  Player,
  SeriesGame,
  SeriesMatch,
  Team,
  TournamentDataset,
} from "@/lib/schema";

export type StandingsSource = "seed" | "series";

export interface StandingsRow {
  position: number;
  teamId: string;
  teamName: string;
  teamSlug: string;
  teamImageUrl?: string;
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
  series: SchemaSeriesMatch;
  score: SeriesScore;
  winnerTeamId: string | null;
  isComplete: boolean;
  isWalkover: boolean;
  mvp: SeriesMvpResult | null;
  formatLabel: string;
  stageLabel: string;
}

export interface ChampionshipResult {
  summary: SeriesSummary;
  championTeamId: string;
  runnerUpTeamId: string;
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

export interface ChampionAggregate {
  championId: string; // id canônico do Data Dragon (ou fallback do texto)
  championName: string;
  picks: number;
  bans: number;
  games: number;
  wins: number;
  losses: number;
  winRate: number;
  pickRate: number;
  banRate: number;
  presence: number;
  kills: number;
  deaths: number;
  assists: number;
  kda: number;
}

export type ChampionMetric = "picks" | "bans" | "banRate" | "presence" | "winRate" | "kda";

export interface ChampionLeaderboardRow {
  position: number;
  metric: ChampionMetric;
  value: number;
  champion: ChampionAggregate;
}

export interface CardStat {
  cardId: string;
  title: string;
  count: number;
  byTeam: Array<{ teamId: string; teamName: string; count: number }>;
}

export interface DateRangeFilter {
  from?: string;
  to?: string;
}
