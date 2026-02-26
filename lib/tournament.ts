import type {
  Player,
  PlayerGameStats,
  SeriesGame,
  SeriesMatch,
  Team,
  TournamentDataset,
} from "@/lib/schema";
import { toDateEnd, toDateStart } from "@/lib/format";
import type {
  DateRangeFilter,
  LeaderboardMetric,
  LeaderboardRow,
  PlayerAggregate,
  SeriesMvpResult,
  SeriesScore,
  SeriesSummary,
  StandingsRow,
  StandingsSource,
  TeamAggregate,
} from "@/types/domain";

interface DatasetIndexes {
  teamsById: Map<string, Team>;
  teamsBySlug: Map<string, Team>;
  playersById: Map<string, Player>;
  playersBySlug: Map<string, Player>;
  playersByTeamId: Map<string, Player[]>;
}

interface AggregationFilters extends DateRangeFilter {
  teamId?: string;
}

export function getKda(kills: number, deaths: number, assists: number) {
  return (kills + assists) / Math.max(1, deaths);
}

export function inferGameMvpPlayerId(rows: PlayerGameStats[]) {
  const eligibleRows = rows.filter((row) => row.playerId.trim().length > 0);
  if (eligibleRows.length === 0) return "";

  const ranked = eligibleRows
    .slice()
    .sort((a, b) => {
      const aKda = getKda(a.kills, a.deaths, a.assists);
      const bKda = getKda(b.kills, b.deaths, b.assists);
      if (bKda !== aKda) return bKda - aKda;
      if (b.kills !== a.kills) return b.kills - a.kills;
      if (b.assists !== a.assists) return b.assists - a.assists;
      if (a.deaths !== b.deaths) return a.deaths - b.deaths;
      return a.playerId.localeCompare(b.playerId, "pt-BR");
    });

  return ranked[0]?.playerId ?? "";
}

export function getGameMvpPlayerId(game: SeriesGame) {
  return inferGameMvpPlayerId(game.statsByPlayer) || game.mvpPlayerId;
}

export function applyAutoGameMvpsToDataset(dataset: TournamentDataset): TournamentDataset {
  return {
    ...dataset,
    seriesMatches: dataset.seriesMatches.map((series) => ({
      ...series,
      games: series.games.map((game) => ({
        ...game,
        mvpPlayerId: getGameMvpPlayerId(game),
      })),
    })),
  };
}

export function createIndexes(dataset: TournamentDataset): DatasetIndexes {
  const teamsById = new Map(dataset.teams.map((team) => [team.id, team]));
  const teamsBySlug = new Map(dataset.teams.map((team) => [team.slug, team]));
  const playersById = new Map(dataset.players.map((player) => [player.id, player]));
  const playersBySlug = new Map(dataset.players.map((player) => [player.slug, player]));
  const playersByTeamId = new Map<string, Player[]>();

  for (const player of dataset.players) {
    const bucket = playersByTeamId.get(player.teamId);
    if (bucket) bucket.push(player);
    else playersByTeamId.set(player.teamId, [player]);
  }

  for (const roster of playersByTeamId.values()) {
    roster.sort((a, b) => a.nick.localeCompare(b.nick, "pt-BR"));
  }

  return { teamsById, teamsBySlug, playersById, playersBySlug, playersByTeamId };
}

export function getSeriesScore(series: SeriesMatch): SeriesScore {
  let teamAWins = 0;
  let teamBWins = 0;

  for (const game of series.games) {
    if (game.winnerTeamId === series.teamAId) teamAWins += 1;
    if (game.winnerTeamId === series.teamBId) teamBWins += 1;
  }

  return { teamAWins, teamBWins };
}

export function getSeriesWinnerTeamId(series: SeriesMatch): string | null {
  const score = getSeriesScore(series);
  if (score.teamAWins >= 2) return series.teamAId;
  if (score.teamBWins >= 2) return series.teamBId;
  return null;
}

export function isSeriesComplete(series: SeriesMatch) {
  return getSeriesWinnerTeamId(series) !== null;
}

function compareDateDesc(a: string, b: string) {
  const ta = new Date(a).getTime();
  const tb = new Date(b).getTime();
  const safeA = Number.isNaN(ta) ? 0 : ta;
  const safeB = Number.isNaN(tb) ? 0 : tb;
  return safeB - safeA;
}

export function sortSeriesByDateDesc(seriesMatches: SeriesMatch[]) {
  return [...seriesMatches].sort((a, b) => {
    const byDate = compareDateDesc(a.date, b.date);
    if (byDate !== 0) return byDate;
    return b.id.localeCompare(a.id, "pt-BR");
  });
}

function buildSeriesPlayerTotals(series: SeriesMatch, dataset: TournamentDataset) {
  const indexes = createIndexes(dataset);
  const teamPlayerIds = new Set<string>();
  for (const teamId of [series.teamAId, series.teamBId]) {
    for (const player of indexes.playersByTeamId.get(teamId) ?? []) {
      teamPlayerIds.add(player.id);
    }
  }

  const totals = new Map<
    string,
    { kills: number; deaths: number; assists: number; gameMvps: number }
  >();

  for (const game of series.games) {
    const gameMvpPlayerId = getGameMvpPlayerId(game);
    if (teamPlayerIds.has(gameMvpPlayerId)) {
      const bucket = totals.get(gameMvpPlayerId) ?? {
        kills: 0,
        deaths: 0,
        assists: 0,
        gameMvps: 0,
      };
      bucket.gameMvps += 1;
      totals.set(gameMvpPlayerId, bucket);
    }

    for (const stats of game.statsByPlayer) {
      if (!teamPlayerIds.has(stats.playerId)) continue;
      const bucket = totals.get(stats.playerId) ?? {
        kills: 0,
        deaths: 0,
        assists: 0,
        gameMvps: 0,
      };
      bucket.kills += stats.kills;
      bucket.deaths += stats.deaths;
      bucket.assists += stats.assists;
      totals.set(stats.playerId, bucket);
    }
  }

  return { totals, indexes };
}

export function getSeriesMvp(
  series: SeriesMatch,
  dataset: TournamentDataset,
): SeriesMvpResult | null {
  if (series.games.length === 0) return null;

  const { totals, indexes } = buildSeriesPlayerTotals(series, dataset);
  if (totals.size === 0) return null;

  let best: SeriesMvpResult | null = null;

  for (const [playerId, acc] of totals) {
    const candidate: SeriesMvpResult = {
      playerId,
      gameMvpCount: acc.gameMvps,
      kda: getKda(acc.kills, acc.deaths, acc.assists),
    };

    if (!best) {
      best = candidate;
      continue;
    }

    if (candidate.gameMvpCount !== best.gameMvpCount) {
      if (candidate.gameMvpCount > best.gameMvpCount) best = candidate;
      continue;
    }
    if (candidate.kda !== best.kda) {
      if (candidate.kda > best.kda) best = candidate;
      continue;
    }

    const candidateNick = indexes.playersById.get(candidate.playerId)?.nick ?? candidate.playerId;
    const bestNick = indexes.playersById.get(best.playerId)?.nick ?? best.playerId;
    if (candidateNick.localeCompare(bestNick, "pt-BR") < 0) best = candidate;
  }

  return best;
}

export function getSeriesTeamKillTotals(
  series: SeriesMatch,
  dataset: TournamentDataset,
) {
  const indexes = createIndexes(dataset);
  let teamAKills = 0;
  let teamBKills = 0;

  for (const game of series.games) {
    for (const stats of game.statsByPlayer) {
      const player = indexes.playersById.get(stats.playerId);
      if (!player) continue;
      if (player.teamId === series.teamAId) teamAKills += stats.kills;
      if (player.teamId === series.teamBId) teamBKills += stats.kills;
    }
  }

  return {
    [series.teamAId]: teamAKills,
    [series.teamBId]: teamBKills,
  } as Record<string, number>;
}

function seriesInRange(series: SeriesMatch, range?: DateRangeFilter) {
  if (!range?.from && !range?.to) return true;
  const date = new Date(series.date);
  if (Number.isNaN(date.getTime())) return true;
  const from = toDateStart(range.from);
  const to = toDateEnd(range.to);
  if (from && date < from) return false;
  if (to && date > to) return false;
  return true;
}

function compareStandingsBase(a: StandingsRow, b: StandingsRow) {
  if (b.points !== a.points) return b.points - a.points;
  if (b.seriesWon !== a.seriesWon) return b.seriesWon - a.seriesWon;
  if (b.gameDiff !== a.gameDiff) return b.gameDiff - a.gameDiff;
  return 0;
}

function compareHeadToHead(teamAId: string, teamBId: string, dataset: TournamentDataset) {
  let aSeriesWins = 0;
  let bSeriesWins = 0;
  let aGamesWon = 0;
  let bGamesWon = 0;

  for (const series of dataset.seriesMatches) {
    const isMatchup =
      (series.teamAId === teamAId && series.teamBId === teamBId) ||
      (series.teamAId === teamBId && series.teamBId === teamAId);
    if (!isMatchup) continue;

    const winner = getSeriesWinnerTeamId(series);
    if (!winner) continue;

    if (winner === teamAId) aSeriesWins += 1;
    if (winner === teamBId) bSeriesWins += 1;

    const score = getSeriesScore(series);
    const aWinsInSeries = series.teamAId === teamAId ? score.teamAWins : score.teamBWins;
    const bWinsInSeries = series.teamAId === teamAId ? score.teamBWins : score.teamAWins;
    aGamesWon += aWinsInSeries;
    bGamesWon += bWinsInSeries;
  }

  if (aSeriesWins !== bSeriesWins) return bSeriesWins - aSeriesWins;

  const aGameDiff = aGamesWon - bGamesWon;
  const bGameDiff = bGamesWon - aGamesWon;
  if (aGameDiff !== bGameDiff) return bGameDiff - aGameDiff;

  return 0;
}

function sortStandingsRows(rows: StandingsRow[], dataset: TournamentDataset) {
  const prelim = [...rows].sort((a, b) => {
    const base = compareStandingsBase(a, b);
    if (base !== 0) return base;
    return a.teamName.localeCompare(b.teamName, "pt-BR");
  });

  const resolved: StandingsRow[] = [];
  for (let i = 0; i < prelim.length; ) {
    const anchor = prelim[i];
    const group = [anchor];
    i += 1;

    while (i < prelim.length && compareStandingsBase(anchor, prelim[i]) === 0) {
      group.push(prelim[i]);
      i += 1;
    }

    if (group.length === 2) {
      group.sort((a, b) => {
        const h2h = compareHeadToHead(a.teamId, b.teamId, dataset);
        if (h2h !== 0) return h2h;
        return a.teamName.localeCompare(b.teamName, "pt-BR");
      });
    } else if (group.length > 2) {
      group.sort((a, b) => a.teamName.localeCompare(b.teamName, "pt-BR"));
    }

    resolved.push(...group);
  }

  return resolved.map((row, index) => ({ ...row, position: index + 1 }));
}

function buildSeedStandingsRows(dataset: TournamentDataset): StandingsRow[] {
  const winPoints = dataset.tournament.seriesPointsRule.win;
  const lossPoints = dataset.tournament.seriesPointsRule.loss;
  const inferWins = winPoints > 0 && lossPoints === 0;
  const seedByTeamId = new Map(dataset.standingsSeed.map((row) => [row.teamId, row]));

  const rows = dataset.teams.map<StandingsRow>((team) => {
    const seed = seedByTeamId.get(team.id);
    const seriesPlayed = seed?.played ?? 0;
    const points = seed?.points ?? 0;
    const seriesWon = inferWins ? Math.min(seriesPlayed, Math.floor(points / winPoints)) : 0;

    return {
      position: 0,
      teamId: team.id,
      teamName: team.name,
      teamSlug: team.slug,
      seriesPlayed,
      seriesWon,
      seriesLost: Math.max(0, seriesPlayed - seriesWon),
      points,
      gamesWon: 0,
      gamesLost: 0,
      gameDiff: 0,
      seriesWinRate: seriesPlayed > 0 ? (seriesWon / seriesPlayed) * 100 : 0,
      fromSeed: true,
    };
  });

  return sortStandingsRows(rows, dataset);
}

function buildSeriesStandingsRows(dataset: TournamentDataset): StandingsRow[] {
  const rowsByTeamId = new Map<string, StandingsRow>();
  for (const team of dataset.teams) {
    rowsByTeamId.set(team.id, {
      position: 0,
      teamId: team.id,
      teamName: team.name,
      teamSlug: team.slug,
      seriesPlayed: 0,
      seriesWon: 0,
      seriesLost: 0,
      points: 0,
      gamesWon: 0,
      gamesLost: 0,
      gameDiff: 0,
      seriesWinRate: 0,
      fromSeed: false,
    });
  }

  for (const series of dataset.seriesMatches) {
    const winnerTeamId = getSeriesWinnerTeamId(series);
    if (!winnerTeamId) continue;
    const loserTeamId = winnerTeamId === series.teamAId ? series.teamBId : series.teamAId;

    const rowA = rowsByTeamId.get(series.teamAId);
    const rowB = rowsByTeamId.get(series.teamBId);
    if (!rowA || !rowB) continue;

    const score = getSeriesScore(series);
    rowA.seriesPlayed += 1;
    rowB.seriesPlayed += 1;
    rowA.gamesWon += score.teamAWins;
    rowA.gamesLost += score.teamBWins;
    rowB.gamesWon += score.teamBWins;
    rowB.gamesLost += score.teamAWins;

    const winnerRow = rowsByTeamId.get(winnerTeamId);
    const loserRow = rowsByTeamId.get(loserTeamId);
    if (winnerRow) {
      winnerRow.seriesWon += 1;
      winnerRow.points += dataset.tournament.seriesPointsRule.win;
    }
    if (loserRow) {
      loserRow.seriesLost += 1;
      loserRow.points += dataset.tournament.seriesPointsRule.loss;
    }
  }

  const rows = [...rowsByTeamId.values()].map((row) => ({
    ...row,
    gameDiff: row.gamesWon - row.gamesLost,
    seriesWinRate: row.seriesPlayed > 0 ? (row.seriesWon / row.seriesPlayed) * 100 : 0,
  }));

  return sortStandingsRows(rows, dataset);
}

export function calculateStandings(dataset: TournamentDataset): {
  source: StandingsSource;
  rows: StandingsRow[];
} {
  if (dataset.seriesMatches.length === 0) {
    return { source: "seed", rows: buildSeedStandingsRows(dataset) };
  }

  return { source: "series", rows: buildSeriesStandingsRows(dataset) };
}

export function getSeriesSummaries(dataset: TournamentDataset): SeriesSummary[] {
  return sortSeriesByDateDesc(dataset.seriesMatches).map((series) => ({
    series,
    score: getSeriesScore(series),
    winnerTeamId: getSeriesWinnerTeamId(series),
    isComplete: isSeriesComplete(series),
    mvp: getSeriesMvp(series, dataset),
  }));
}

type PlayerAccumulator = {
  kills: number;
  deaths: number;
  assists: number;
  gamesPlayed: number;
  gameMvps: number;
  seriesMvps: number;
};

export function calculatePlayerAggregates(
  dataset: TournamentDataset,
  filters?: AggregationFilters,
): PlayerAggregate[] {
  const indexes = createIndexes(dataset);
  const accumulators = new Map<string, PlayerAccumulator>();

  const ensureBucket = (playerId: string): PlayerAccumulator => {
    const existing = accumulators.get(playerId);
    if (existing) return existing;
    const created: PlayerAccumulator = {
      kills: 0,
      deaths: 0,
      assists: 0,
      gamesPlayed: 0,
      gameMvps: 0,
      seriesMvps: 0,
    };
    accumulators.set(playerId, created);
    return created;
  };

  for (const series of dataset.seriesMatches) {
    if (!seriesInRange(series, filters)) continue;

    for (const game of series.games) {
      for (const stats of game.statsByPlayer) {
        const player = indexes.playersById.get(stats.playerId);
        if (!player) continue;
        if (filters?.teamId && player.teamId !== filters.teamId) continue;

        const bucket = ensureBucket(player.id);
        bucket.kills += stats.kills;
        bucket.deaths += stats.deaths;
        bucket.assists += stats.assists;
        bucket.gamesPlayed += 1;
      }

      const mvpPlayer = indexes.playersById.get(getGameMvpPlayerId(game));
      if (mvpPlayer && (!filters?.teamId || mvpPlayer.teamId === filters.teamId)) {
        ensureBucket(mvpPlayer.id).gameMvps += 1;
      }
    }

    const seriesMvp = getSeriesMvp(series, dataset);
    if (seriesMvp) {
      const player = indexes.playersById.get(seriesMvp.playerId);
      if (player && (!filters?.teamId || player.teamId === filters.teamId)) {
        ensureBucket(player.id).seriesMvps += 1;
      }
    }
  }

  return dataset.players
    .filter((player) => !filters?.teamId || player.teamId === filters.teamId)
    .map<PlayerAggregate>((player) => {
      const bucket = accumulators.get(player.id);
      const kills = bucket?.kills ?? 0;
      const deaths = bucket?.deaths ?? 0;
      const assists = bucket?.assists ?? 0;
      return {
        playerId: player.id,
        playerNick: player.nick,
        playerSlug: player.slug,
        teamId: player.teamId,
        teamName: indexes.teamsById.get(player.teamId)?.name ?? player.teamId,
        teamSlug: indexes.teamsById.get(player.teamId)?.slug ?? player.teamId,
        kills,
        deaths,
        assists,
        gamesPlayed: bucket?.gamesPlayed ?? 0,
        gameMvps: bucket?.gameMvps ?? 0,
        seriesMvps: bucket?.seriesMvps ?? 0,
        kda: getKda(kills, deaths, assists),
      };
    });
}

export function buildLeaderboards(
  dataset: TournamentDataset,
  filters?: AggregationFilters,
): Record<LeaderboardMetric, LeaderboardRow[]> {
  const players = calculatePlayerAggregates(dataset, filters).filter(
    (row) => row.gamesPlayed > 0,
  );

  const makeBoard = (
    metric: LeaderboardMetric,
    getValue: (row: PlayerAggregate) => number,
    direction: "asc" | "desc" = "desc",
  ) =>
    [...players]
      .sort((a, b) => {
        const va = getValue(a);
        const vb = getValue(b);
        if (va !== vb) return direction === "desc" ? vb - va : va - vb;
        if (metric === "kda" && a.gamesPlayed !== b.gamesPlayed) {
          return b.gamesPlayed - a.gamesPlayed;
        }
        return a.playerNick.localeCompare(b.playerNick, "pt-BR");
      })
      .map<LeaderboardRow>((player, index) => ({
        position: index + 1,
        metric,
        value: getValue(player),
        player,
      }));

  return {
    kills: makeBoard("kills", (row) => row.kills),
    kda: makeBoard("kda", (row) => row.kda),
    mvps: makeBoard("mvps", (row) => row.gameMvps),
    assists: makeBoard("assists", (row) => row.assists),
    deathsLeast: makeBoard("deathsLeast", (row) => row.deaths, "asc"),
  };
}

export function calculateTeamAggregates(dataset: TournamentDataset): TeamAggregate[] {
  const playerAggs = calculatePlayerAggregates(dataset);
  const standings = calculateStandings(dataset).rows;
  const gameDiffByTeam = new Map(standings.map((row) => [row.teamId, row.gameDiff]));

  const acc = new Map<
    string,
    {
      kills: number;
      deaths: number;
      assists: number;
      gamesPlayed: number;
      gameMvps: number;
      seriesMvps: number;
    }
  >();

  for (const row of playerAggs) {
    const bucket = acc.get(row.teamId) ?? {
      kills: 0,
      deaths: 0,
      assists: 0,
      gamesPlayed: 0,
      gameMvps: 0,
      seriesMvps: 0,
    };
    bucket.kills += row.kills;
    bucket.deaths += row.deaths;
    bucket.assists += row.assists;
    bucket.gamesPlayed += row.gamesPlayed;
    bucket.gameMvps += row.gameMvps;
    bucket.seriesMvps += row.seriesMvps;
    acc.set(row.teamId, bucket);
  }

  return dataset.teams
    .map<TeamAggregate>((team) => {
      const bucket = acc.get(team.id);
      const kills = bucket?.kills ?? 0;
      const deaths = bucket?.deaths ?? 0;
      const assists = bucket?.assists ?? 0;
      return {
        teamId: team.id,
        teamName: team.name,
        teamSlug: team.slug,
        kills,
        deaths,
        assists,
        gamesPlayed: bucket?.gamesPlayed ?? 0,
        gameMvps: bucket?.gameMvps ?? 0,
        seriesMvps: bucket?.seriesMvps ?? 0,
        gameDiff: gameDiffByTeam.get(team.id) ?? 0,
        kda: getKda(kills, deaths, assists),
      };
    })
    .sort((a, b) => a.teamName.localeCompare(b.teamName, "pt-BR"));
}

export function getTeamBySlug(dataset: TournamentDataset, slug: string) {
  return createIndexes(dataset).teamsBySlug.get(slug) ?? null;
}

export function getPlayerBySlug(dataset: TournamentDataset, slug: string) {
  return createIndexes(dataset).playersBySlug.get(slug) ?? null;
}

export function getSeriesById(dataset: TournamentDataset, id: string) {
  return dataset.seriesMatches.find((series) => series.id === id) ?? null;
}

export function getLatestSeries(dataset: TournamentDataset, limit = 3) {
  return getSeriesSummaries(dataset).slice(0, limit);
}

export function getPlayersForTeam(dataset: TournamentDataset, teamId: string) {
  return [...(createIndexes(dataset).playersByTeamId.get(teamId) ?? [])];
}

export function getTeamSeriesHistory(dataset: TournamentDataset, teamId: string) {
  return getSeriesSummaries(dataset).filter(
    ({ series }) => series.teamAId === teamId || series.teamBId === teamId,
  );
}

export interface PlayerGameHistoryRow {
  seriesId: string;
  date: string;
  opponentTeamId: string;
  opponentTeamName: string;
  gameIndex: number;
  champion?: string;
  kills: number;
  deaths: number;
  assists: number;
  mvp: boolean;
}

export function getPlayerGameHistory(
  dataset: TournamentDataset,
  playerId: string,
): PlayerGameHistoryRow[] {
  const indexes = createIndexes(dataset);
  const player = indexes.playersById.get(playerId);
  if (!player) return [];

  const rows: PlayerGameHistoryRow[] = [];
  for (const series of dataset.seriesMatches) {
    if (series.teamAId !== player.teamId && series.teamBId !== player.teamId) continue;
    const opponentTeamId = series.teamAId === player.teamId ? series.teamBId : series.teamAId;
    const opponentTeamName = indexes.teamsById.get(opponentTeamId)?.name ?? opponentTeamId;

    series.games.forEach((game, gameIdx) => {
      const stat = game.statsByPlayer.find((row) => row.playerId === playerId);
      if (!stat) return;
      rows.push({
        seriesId: series.id,
        date: series.date,
        opponentTeamId,
        opponentTeamName,
        gameIndex: gameIdx + 1,
        champion: stat.champion,
        kills: stat.kills,
        deaths: stat.deaths,
        assists: stat.assists,
        mvp: getGameMvpPlayerId(game) === playerId,
      });
    });
  }

  return rows.sort((a, b) => {
    const byDate = compareDateDesc(a.date, b.date);
    if (byDate !== 0) return byDate;
    return b.gameIndex - a.gameIndex;
  });
}

export function getPlayerLeaderboardPositions(
  dataset: TournamentDataset,
  playerId: string,
  filters?: AggregationFilters,
) {
  const boards = buildLeaderboards(dataset, filters);
  const positions: Partial<Record<LeaderboardMetric, number>> = {};

  (Object.keys(boards) as LeaderboardMetric[]).forEach((metric) => {
    const found = boards[metric].find((row) => row.player.playerId === playerId);
    if (found) positions[metric] = found.position;
  });

  return positions;
}

export function getDatasetOverview(dataset: TournamentDataset) {
  return {
    standings: calculateStandings(dataset),
    playerAggregates: calculatePlayerAggregates(dataset),
    teamAggregates: calculateTeamAggregates(dataset),
    leaderboards: buildLeaderboards(dataset),
    seriesSummaries: getSeriesSummaries(dataset),
  };
}

export function getGameTeamKills(
  game: SeriesGame,
  series: SeriesMatch,
  dataset: TournamentDataset,
) {
  const indexes = createIndexes(dataset);
  let teamAKills = 0;
  let teamBKills = 0;

  for (const stats of game.statsByPlayer) {
    const player = indexes.playersById.get(stats.playerId);
    if (!player) continue;
    if (player.teamId === series.teamAId) teamAKills += stats.kills;
    if (player.teamId === series.teamBId) teamBKills += stats.kills;
  }

  return { teamAKills, teamBKills };
}

export function getSeriesGamesWithTeamRows(
  series: SeriesMatch,
  dataset: TournamentDataset,
): Array<{
  game: SeriesGame;
  gameIndex: number;
  teamARows: Array<PlayerGameStats & { playerNick: string; teamId: string }>;
  teamBRows: Array<PlayerGameStats & { playerNick: string; teamId: string }>;
}> {
  const indexes = createIndexes(dataset);

  return series.games.map((game, idx) => {
    const rows = game.statsByPlayer
      .map((stats) => {
        const player = indexes.playersById.get(stats.playerId);
        if (!player) return null;
        return {
          ...stats,
          playerNick: player.nick,
          teamId: player.teamId,
        };
      })
      .filter(Boolean) as Array<PlayerGameStats & { playerNick: string; teamId: string }>;

    return {
      game,
      gameIndex: idx + 1,
      teamARows: rows
        .filter((row) => row.teamId === series.teamAId)
        .sort((a, b) => b.kills - a.kills || a.playerNick.localeCompare(b.playerNick, "pt-BR")),
      teamBRows: rows
        .filter((row) => row.teamId === series.teamBId)
        .sort((a, b) => b.kills - a.kills || a.playerNick.localeCompare(b.playerNick, "pt-BR")),
    };
  });
}
