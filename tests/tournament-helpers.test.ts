import { describe, expect, it } from "vitest";

import type { TournamentDataset } from "../lib/schema";
import {
  applyAutoGameMvpsToDataset,
  buildLeaderboards,
  calculatePlayerAggregates,
  calculateStandings,
  calculateTeamAggregates,
  getChampionshipResult,
  getDatasetOverview,
  getGameMvpPlayerId,
  getGameTeamKills,
  getLatestSeries,
  getPlayerBySlug,
  getPlayerGameHistory,
  getPlayerLeaderboardPositions,
  getPlayersForTeam,
  getSeriesById,
  getSeriesFormat,
  getSeriesFormatLabel,
  getSeriesGamesWithTeamRows,
  getSeriesScore,
  getSeriesStageLabel,
  getSeriesSummaries,
  getSeriesTargetWins,
  getSeriesTeamKillTotals,
  getSeriesWinnerTeamId,
  getTeamBySlug,
  getTeamSeriesHistory,
  getSeriesMaxGames,
  inferGameMvpPlayerId,
  isRegularSeasonSeries,
  isSeriesComplete,
  isWalkoverSeries,
  sortSeriesByDateDesc,
} from "../lib/tournament";

function createDataset(): TournamentDataset {
  return {
    tournament: {
      name: "Liga",
      lastUpdatedISO: "2026-03-30T21:30:00.000Z",
      seriesPointsRule: { win: 3, loss: 0 },
      format: "BO3",
    },
    teams: [
      { id: "a", name: "Alpha", slug: "alpha" },
      { id: "b", name: "Beta", slug: "beta" },
      { id: "c", name: "Charlie", slug: "charlie" },
    ],
    players: [
      { id: "a1", nick: "A1", slug: "a1", teamId: "a", role1: "TOP", role2: "MID", elo: "OURO" },
      { id: "a2", nick: "A2", slug: "a2", teamId: "a", role1: "JUNG", role2: "SUP", elo: "OURO" },
      { id: "b1", nick: "B1", slug: "b1", teamId: "b", role1: "TOP", role2: "MID", elo: "OURO" },
      { id: "b2", nick: "B2", slug: "b2", teamId: "b", role1: "JUNG", role2: "SUP", elo: "OURO" },
      { id: "c1", nick: "C1", slug: "c1", teamId: "c", role1: "TOP", role2: "MID", elo: "OURO" },
      { id: "c2", nick: "C2", slug: "c2", teamId: "c", role1: "JUNG", role2: "SUP", elo: "OURO" },
    ],
    seriesMatches: [
      {
        id: "s1",
        date: "2026-03-20",
        teamAId: "a",
        teamBId: "b",
        stage: "REGULAR_SEASON",
        games: [
          {
            winnerTeamId: "a",
            mvpPlayerId: "b1",
            durationMin: 31,
            statsByPlayer: [
              { playerId: "a1", champion: "Ahri", kills: 8, deaths: 1, assists: 5 },
              { playerId: "a2", champion: "Lulu", kills: 2, deaths: 2, assists: 9 },
              { playerId: "b1", champion: "Garen", kills: 3, deaths: 5, assists: 1 },
              { playerId: "b2", champion: "Ashe", kills: 1, deaths: 6, assists: 3 },
            ],
          },
          {
            winnerTeamId: "a",
            mvpPlayerId: "",
            durationMin: 29,
            statsByPlayer: [
              { playerId: "a1", champion: "Ahri", kills: 4, deaths: 2, assists: 6 },
              { playerId: "a2", champion: "Lulu", kills: 3, deaths: 1, assists: 10 },
              { playerId: "b1", champion: "Garen", kills: 2, deaths: 5, assists: 4 },
              { playerId: "b2", champion: "Ashe", kills: 1, deaths: 5, assists: 5 },
            ],
          },
        ],
      },
      {
        id: "s2",
        date: "2026-03-25",
        teamAId: "b",
        teamBId: "c",
        stage: "SEMIFINAL",
        format: "BO5",
        games: [
          {
            winnerTeamId: "c",
            mvpPlayerId: "",
            durationMin: 33,
            statsByPlayer: [
              { playerId: "b1", champion: "Lee Sin", kills: 4, deaths: 5, assists: 3 },
              { playerId: "b2", champion: "Thresh", kills: 2, deaths: 6, assists: 4 },
              { playerId: "c1", champion: "Orianna", kills: 9, deaths: 2, assists: 7 },
              { playerId: "c2", champion: "Jinx", kills: 3, deaths: 3, assists: 10 },
            ],
          },
          {
            winnerTeamId: "c",
            mvpPlayerId: "",
            durationMin: 35,
            statsByPlayer: [
              { playerId: "b1", champion: "Lee Sin", kills: 5, deaths: 5, assists: 4 },
              { playerId: "b2", champion: "Thresh", kills: 1, deaths: 6, assists: 6 },
              { playerId: "c1", champion: "Orianna", kills: 8, deaths: 2, assists: 6 },
              { playerId: "c2", champion: "Jinx", kills: 4, deaths: 2, assists: 12 },
            ],
          },
          {
            winnerTeamId: "b",
            mvpPlayerId: "",
            durationMin: 32,
            statsByPlayer: [
              { playerId: "b1", champion: "Lee Sin", kills: 10, deaths: 3, assists: 6 },
              { playerId: "b2", champion: "Thresh", kills: 3, deaths: 4, assists: 8 },
              { playerId: "c1", champion: "Orianna", kills: 4, deaths: 6, assists: 4 },
              { playerId: "c2", champion: "Jinx", kills: 2, deaths: 5, assists: 6 },
            ],
          },
          {
            winnerTeamId: "c",
            mvpPlayerId: "",
            durationMin: 34,
            statsByPlayer: [
              { playerId: "b1", champion: "Lee Sin", kills: 4, deaths: 6, assists: 5 },
              { playerId: "b2", champion: "Thresh", kills: 2, deaths: 7, assists: 7 },
              { playerId: "c1", champion: "Orianna", kills: 7, deaths: 3, assists: 8 },
              { playerId: "c2", champion: "Jinx", kills: 3, deaths: 4, assists: 10 },
            ],
          },
        ],
      },
      {
        id: "s3",
        date: "2026-03-30",
        teamAId: "a",
        teamBId: "c",
        stage: "FINAL",
        format: "BO5",
        games: [
          {
            winnerTeamId: "a",
            mvpPlayerId: "",
            durationMin: 36,
            statsByPlayer: [
              { playerId: "a1", champion: "Ahri", kills: 9, deaths: 2, assists: 4 },
              { playerId: "a2", champion: "Lulu", kills: 2, deaths: 3, assists: 10 },
              { playerId: "c1", champion: "Orianna", kills: 5, deaths: 6, assists: 3 },
              { playerId: "c2", champion: "Jinx", kills: 3, deaths: 5, assists: 5 },
            ],
          },
          {
            winnerTeamId: "c",
            mvpPlayerId: "",
            durationMin: 34,
            statsByPlayer: [
              { playerId: "a1", champion: "Ahri", kills: 4, deaths: 5, assists: 6 },
              { playerId: "a2", champion: "Lulu", kills: 1, deaths: 4, assists: 7 },
              { playerId: "c1", champion: "Orianna", kills: 10, deaths: 2, assists: 4 },
              { playerId: "c2", champion: "Jinx", kills: 2, deaths: 3, assists: 10 },
            ],
          },
          {
            winnerTeamId: "c",
            mvpPlayerId: "",
            durationMin: 38,
            statsByPlayer: [
              { playerId: "a1", champion: "Ahri", kills: 5, deaths: 4, assists: 7 },
              { playerId: "a2", champion: "Lulu", kills: 2, deaths: 5, assists: 9 },
              { playerId: "c1", champion: "Orianna", kills: 8, deaths: 3, assists: 6 },
              { playerId: "c2", champion: "Jinx", kills: 4, deaths: 3, assists: 11 },
            ],
          },
          {
            winnerTeamId: "a",
            mvpPlayerId: "",
            durationMin: 40,
            statsByPlayer: [
              { playerId: "a1", champion: "Ahri", kills: 11, deaths: 3, assists: 6 },
              { playerId: "a2", champion: "Lulu", kills: 3, deaths: 4, assists: 12 },
              { playerId: "c1", champion: "Orianna", kills: 6, deaths: 7, assists: 4 },
              { playerId: "c2", champion: "Jinx", kills: 1, deaths: 6, assists: 8 },
            ],
          },
          {
            winnerTeamId: "c",
            mvpPlayerId: "",
            durationMin: 39,
            statsByPlayer: [
              { playerId: "a1", champion: "Ahri", kills: 6, deaths: 5, assists: 5 },
              { playerId: "a2", champion: "Lulu", kills: 2, deaths: 6, assists: 8 },
              { playerId: "c1", champion: "Orianna", kills: 9, deaths: 2, assists: 7 },
              { playerId: "c2", champion: "Jinx", kills: 4, deaths: 3, assists: 12 },
            ],
          },
        ],
      },
      {
        id: "s4",
        date: "2026-04-01",
        teamAId: "b",
        teamBId: "c",
        stage: "REGULAR_SEASON",
        walkoverWinnerTeamId: "b",
        walkoverReason: "Charlie não compareceu",
        games: [],
      },
    ],
    standingsSeed: [],
  };
}

describe("tournament helpers", () => {
  it("covers format, stage, score and automatic MVP helpers", () => {
    const dataset = createDataset();
    const regularSeries = dataset.seriesMatches[0]!;
    const semifinal = dataset.seriesMatches[1]!;
    const walkover = dataset.seriesMatches[3]!;
    const emptyGame = {
      winnerTeamId: "a",
      mvpPlayerId: "legacy",
      durationMin: 30,
      statsByPlayer: [],
    };

    expect(inferGameMvpPlayerId([])).toBe("");
    expect(getGameMvpPlayerId(emptyGame)).toBe("legacy");
    expect(getSeriesFormat(semifinal, dataset)).toBe("BO5");
    expect(getSeriesFormatLabel(semifinal, dataset)).toBe("MD5");
    expect(getSeriesTargetWins(semifinal, dataset)).toBe(3);
    expect(getSeriesMaxGames(semifinal, dataset)).toBe(5);
    expect(isRegularSeasonSeries(regularSeries)).toBe(true);
    expect(isRegularSeasonSeries(semifinal)).toBe(false);
    expect(getSeriesStageLabel(regularSeries)).toBe("Fase regular");
    expect(getSeriesStageLabel(semifinal)).toBe("Semifinal");
    expect(getSeriesStageLabel(dataset.seriesMatches[2]!)).toBe("Final");
    expect(getSeriesScore(semifinal, dataset)).toEqual({ teamAWins: 1, teamBWins: 3 });
    expect(isWalkoverSeries(walkover)).toBe(true);
    expect(getSeriesScore(walkover, dataset)).toEqual({ teamAWins: 2, teamBWins: 0 });
    expect(getSeriesWinnerTeamId(semifinal, dataset)).toBe("c");
    expect(isSeriesComplete(semifinal, dataset)).toBe(true);

    const normalized = applyAutoGameMvpsToDataset(dataset);
    expect(normalized.seriesMatches[0]?.games[0]?.mvpPlayerId).toBe("a1");
    expect(normalized.seriesMatches[0]?.games[1]?.mvpPlayerId).toBe("a2");
    expect(normalized.seriesMatches[3]?.games).toEqual([]);
  });

  it("covers helper edge cases for BO3, W.O. do time B e série incompleta", () => {
    const dataset = createDataset();
    const bo3Series = dataset.seriesMatches[0]!;
    const incompleteBo5Series = {
      id: "sf-incomplete",
      date: "2026-03-28",
      teamAId: "a",
      teamBId: "b",
      stage: "SEMIFINAL" as const,
      format: "BO5" as const,
      games: [
        {
          winnerTeamId: "a",
          mvpPlayerId: "",
          durationMin: 30,
          statsByPlayer: [
            { playerId: "a1", kills: 8, deaths: 2, assists: 6 },
            { playerId: "a2", kills: 2, deaths: 3, assists: 9 },
            { playerId: "b1", kills: 4, deaths: 6, assists: 3 },
            { playerId: "b2", kills: 1, deaths: 7, assists: 5 },
          ],
        },
        {
          winnerTeamId: "b",
          mvpPlayerId: "",
          durationMin: 31,
          statsByPlayer: [
            { playerId: "a1", kills: 5, deaths: 4, assists: 4 },
            { playerId: "a2", kills: 2, deaths: 5, assists: 8 },
            { playerId: "b1", kills: 7, deaths: 3, assists: 5 },
            { playerId: "b2", kills: 3, deaths: 4, assists: 10 },
          ],
        },
      ],
    };
    const walkoverForTeamB = {
      id: "wo-b",
      date: "2026-04-02",
      teamAId: "a",
      teamBId: "b",
      walkoverWinnerTeamId: "b",
      games: [],
    };

    expect(getSeriesFormatLabel(bo3Series, dataset)).toBe("MD3");
    expect(getSeriesTargetWins(bo3Series, dataset)).toBe(2);
    expect(getSeriesMaxGames(bo3Series, dataset)).toBe(3);

    expect(getSeriesScore(walkoverForTeamB, dataset)).toEqual({ teamAWins: 0, teamBWins: 2 });
    expect(getSeriesWinnerTeamId(incompleteBo5Series, dataset)).toBeNull();
    expect(isSeriesComplete(incompleteBo5Series, dataset)).toBe(false);

    const sameDateOrdered = sortSeriesByDateDesc([
      { ...bo3Series, id: "series-a", date: "2026-03-20" },
      { ...bo3Series, id: "series-b", date: "2026-03-20" },
    ]).map((series) => series.id);

    expect(sameDateOrdered).toEqual(["series-b", "series-a"]);
  });

  it("covers sorting, summaries, standings and championship result", () => {
    const dataset = createDataset();
    const orderedIds = sortSeriesByDateDesc([
      ...dataset.seriesMatches,
      { ...dataset.seriesMatches[0]!, id: "invalid-date", date: "not-a-date" },
    ]).map((series) => series.id);

    expect(orderedIds[0]).toBe("s4");
    expect(orderedIds.at(-1)).toBe("invalid-date");

    const standings = calculateStandings(dataset);
    expect(standings.source).toBe("series");
    expect(standings.rows.map((row) => row.teamId)).toEqual(["a", "b", "c"]);

    const summaries = getSeriesSummaries(dataset);
    expect(summaries[0]?.series.id).toBe("s4");
    expect(summaries[0]?.isWalkover).toBe(true);
    expect(summaries[0]?.formatLabel).toBe("MD3");
    expect(summaries[1]?.stageLabel).toBe("Final");

    const championship = getChampionshipResult(dataset);
    expect(championship?.championTeamId).toBe("c");
    expect(championship?.runnerUpTeamId).toBe("a");

    expect(getLatestSeries(dataset, 2).map((row) => row.series.id)).toEqual(["s4", "s3"]);
  });

  it("covers championship fallback branches when finals are incomplete or missing", () => {
    const dataset = createDataset();

    dataset.seriesMatches = [
      dataset.seriesMatches[0]!,
      {
        id: "final-incomplete",
        date: "2026-04-01",
        teamAId: "a",
        teamBId: "c",
        stage: "FINAL",
        format: "BO5",
        games: [
          {
            winnerTeamId: "a",
            mvpPlayerId: "",
            durationMin: 35,
            statsByPlayer: [
              { playerId: "a1", kills: 8, deaths: 2, assists: 4 },
              { playerId: "a2", kills: 2, deaths: 3, assists: 10 },
              { playerId: "c1", kills: 4, deaths: 5, assists: 4 },
              { playerId: "c2", kills: 1, deaths: 6, assists: 6 },
            ],
          },
          {
            winnerTeamId: "c",
            mvpPlayerId: "",
            durationMin: 33,
            statsByPlayer: [
              { playerId: "a1", kills: 5, deaths: 4, assists: 5 },
              { playerId: "a2", kills: 1, deaths: 4, assists: 8 },
              { playerId: "c1", kills: 7, deaths: 3, assists: 6 },
              { playerId: "c2", kills: 3, deaths: 3, assists: 9 },
            ],
          },
        ],
      },
      dataset.seriesMatches[2]!,
    ];

    const championship = getChampionshipResult(dataset);
    expect(championship?.summary.series.id).toBe("s3");

    const noFinalDataset = {
      ...dataset,
      seriesMatches: dataset.seriesMatches.filter((series) => series.stage !== "FINAL"),
    };
    expect(getChampionshipResult(noFinalDataset)).toBeNull();
  });

  it("covers aggregates, lookups and per-game histories", () => {
    const dataset = createDataset();

    const filteredPlayers = calculatePlayerAggregates(dataset, {
      teamId: "a",
      from: "2026-03-20",
      to: "2026-03-20",
    });
    const a1 = filteredPlayers.find((player) => player.playerId === "a1");
    const a2 = filteredPlayers.find((player) => player.playerId === "a2");

    expect(a1).toMatchObject({
      kills: 12,
      deaths: 3,
      assists: 11,
      gamesPlayed: 2,
      gameMvps: 1,
      seriesMvps: 0,
    });
    expect(a2).toMatchObject({
      kills: 5,
      deaths: 3,
      assists: 19,
      gamesPlayed: 2,
      gameMvps: 1,
      seriesMvps: 1,
    });

    const leaderboards = buildLeaderboards(dataset, {
      from: "2026-03-20",
      to: "2026-03-30",
    });
    expect(leaderboards.kills[0]?.player.playerId).toBe("c1");
    expect(leaderboards.deathsLeast.at(0)?.value).toBeLessThanOrEqual(
      leaderboards.deathsLeast.at(1)?.value ?? Infinity,
    );

    const teamAggs = calculateTeamAggregates(dataset);
    expect(teamAggs.find((team) => team.teamId === "a")).toMatchObject({
      kills: 62,
      gameDiff: 1,
    });
    expect(teamAggs.find((team) => team.teamId === "c")).toMatchObject({
      gameDiff: 1,
    });

    expect(getTeamBySlug(dataset, "alpha")?.id).toBe("a");
    expect(getPlayerBySlug(dataset, "c1")?.teamId).toBe("c");
    expect(getSeriesById(dataset, "s3")?.stage).toBe("FINAL");
    expect(getPlayersForTeam(dataset, "a").map((player) => player.id)).toEqual(["a1", "a2"]);
    expect(getTeamSeriesHistory(dataset, "c").map((row) => row.series.id)).toEqual(["s4", "s3", "s2"]);

    const gameHistory = getPlayerGameHistory(dataset, "a1");
    expect(gameHistory).toHaveLength(7);
    expect(gameHistory[0]).toMatchObject({
      seriesId: "s3",
      gameIndex: 5,
      opponentTeamId: "c",
      mvp: false,
    });

    const positions = getPlayerLeaderboardPositions(dataset, "c1");
    expect(positions.kills).toBe(1);
    expect(positions.mvps).toBe(1);

    const overview = getDatasetOverview(dataset);
    expect(overview.championship?.championTeamId).toBe("c");
    expect(overview.seriesSummaries).toHaveLength(4);
    expect(overview.teamAggregates).toHaveLength(3);

    const regularSeries = dataset.seriesMatches[0]!;
    const firstGame = regularSeries.games[0]!;
    expect(getGameTeamKills(firstGame, regularSeries, dataset)).toEqual({
      teamAKills: 10,
      teamBKills: 4,
    });
    expect(getSeriesTeamKillTotals(regularSeries, dataset)).toEqual({
      a: 17,
      b: 7,
    });

    const gameRows = getSeriesGamesWithTeamRows(regularSeries, dataset);
    expect(gameRows[0]?.gameIndex).toBe(1);
    expect(gameRows[0]?.teamARows[0]?.playerNick).toBe("A1");
    expect(gameRows[0]?.teamBRows[0]?.playerNick).toBe("B1");
  });
});
