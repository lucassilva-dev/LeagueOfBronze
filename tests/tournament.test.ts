import { describe, expect, it } from "vitest";

import type { TournamentDataset } from "../lib/schema";
import { buildLeaderboards, calculateStandings, getSeriesMvp } from "../lib/tournament";

function baseDataset(): TournamentDataset {
  return {
    tournament: {
      name: "Teste",
      lastUpdatedISO: "2026-02-23T00:00:00.000Z",
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
    seriesMatches: [],
    standingsSeed: [
      { teamId: "a", played: 3, points: 9 },
      { teamId: "b", played: 3, points: 6 },
      { teamId: "c", played: 3, points: 0 },
    ],
  };
}

function makeGame(
  winnerTeamId: string,
  mvpPlayerId: string,
  rows: Array<{
    playerId: string;
    kills: number;
    deaths: number;
    assists: number;
    champion?: string;
  }>,
) {
  return {
    winnerTeamId,
    mvpPlayerId,
    durationMin: 30,
    statsByPlayer: rows,
  };
}

describe("calculateStandings", () => {
  it("uses standingsSeed only when seriesMatches is empty", () => {
    const dataset = baseDataset();

    const standings = calculateStandings(dataset);

    expect(standings.source).toBe("seed");
    expect(standings.rows[0]?.teamId).toBe("a");
    expect(standings.rows[0]?.points).toBe(9);
    expect(standings.rows[0]?.fromSeed).toBe(true);
  });

  it("ignores standingsSeed once at least one series exists and applies head-to-head tie-break for 2 teams", () => {
    const dataset = baseDataset();

    dataset.standingsSeed = [
      { teamId: "b", played: 99, points: 999 },
      { teamId: "a", played: 99, points: 0 },
      { teamId: "c", played: 99, points: 0 },
    ];

    dataset.seriesMatches = [
      {
        id: "s1",
        date: "2026-02-20",
        teamAId: "a",
        teamBId: "b",
        games: [
          makeGame("a", "a1", [
            { playerId: "a1", kills: 8, deaths: 2, assists: 4 },
            { playerId: "a2", kills: 2, deaths: 3, assists: 10 },
            { playerId: "b1", kills: 3, deaths: 6, assists: 2 },
            { playerId: "b2", kills: 1, deaths: 5, assists: 5 },
          ]),
          makeGame("b", "b1", [
            { playerId: "a1", kills: 2, deaths: 5, assists: 3 },
            { playerId: "a2", kills: 1, deaths: 4, assists: 4 },
            { playerId: "b1", kills: 7, deaths: 2, assists: 3 },
            { playerId: "b2", kills: 4, deaths: 2, assists: 8 },
          ]),
          makeGame("a", "a1", [
            { playerId: "a1", kills: 6, deaths: 1, assists: 7 },
            { playerId: "a2", kills: 2, deaths: 3, assists: 12 },
            { playerId: "b1", kills: 4, deaths: 5, assists: 4 },
            { playerId: "b2", kills: 2, deaths: 6, assists: 6 },
          ]),
        ],
      },
      {
        id: "s2",
        date: "2026-02-21",
        teamAId: "b",
        teamBId: "c",
        games: [
          makeGame("b", "b1", [
            { playerId: "b1", kills: 9, deaths: 2, assists: 4 },
            { playerId: "b2", kills: 2, deaths: 3, assists: 9 },
            { playerId: "c1", kills: 3, deaths: 5, assists: 1 },
            { playerId: "c2", kills: 2, deaths: 5, assists: 2 },
          ]),
          makeGame("c", "c1", [
            { playerId: "b1", kills: 3, deaths: 5, assists: 4 },
            { playerId: "b2", kills: 1, deaths: 6, assists: 3 },
            { playerId: "c1", kills: 8, deaths: 2, assists: 3 },
            { playerId: "c2", kills: 4, deaths: 3, assists: 6 },
          ]),
          makeGame("b", "b2", [
            { playerId: "b1", kills: 5, deaths: 3, assists: 5 },
            { playerId: "b2", kills: 6, deaths: 2, assists: 7 },
            { playerId: "c1", kills: 4, deaths: 5, assists: 2 },
            { playerId: "c2", kills: 2, deaths: 6, assists: 4 },
          ]),
        ],
      },
      {
        id: "s3",
        date: "2026-02-22",
        teamAId: "a",
        teamBId: "c",
        games: [
          makeGame("c", "c1", [
            { playerId: "a1", kills: 4, deaths: 6, assists: 5 },
            { playerId: "a2", kills: 2, deaths: 5, assists: 7 },
            { playerId: "c1", kills: 7, deaths: 3, assists: 6 },
            { playerId: "c2", kills: 4, deaths: 3, assists: 8 },
          ]),
          makeGame("a", "a2", [
            { playerId: "a1", kills: 5, deaths: 4, assists: 4 },
            { playerId: "a2", kills: 3, deaths: 2, assists: 12 },
            { playerId: "c1", kills: 4, deaths: 5, assists: 3 },
            { playerId: "c2", kills: 2, deaths: 5, assists: 6 },
          ]),
          makeGame("c", "c1", [
            { playerId: "a1", kills: 3, deaths: 7, assists: 3 },
            { playerId: "a2", kills: 1, deaths: 5, assists: 6 },
            { playerId: "c1", kills: 9, deaths: 2, assists: 4 },
            { playerId: "c2", kills: 3, deaths: 3, assists: 7 },
          ]),
        ],
      },
    ];

    const standings = calculateStandings(dataset);

    expect(standings.source).toBe("series");
    expect(standings.rows.find((row) => row.teamId === "a")?.points).toBe(3);
    expect(standings.rows.find((row) => row.teamId === "b")?.points).toBe(3);
    expect(standings.rows.find((row) => row.teamId === "a")?.gameDiff).toBe(0);
    expect(standings.rows.find((row) => row.teamId === "b")?.gameDiff).toBe(0);

    const aPos = standings.rows.find((row) => row.teamId === "a")?.position;
    const bPos = standings.rows.find((row) => row.teamId === "b")?.position;
    expect(aPos).toBeLessThan(bPos!);
  });
});

describe("leaderboards and MVP calculation", () => {
  it("builds leaderboards and series MVP using game MVP count then KDA", () => {
    const dataset = baseDataset();
    dataset.seriesMatches = [
      {
        id: "s1",
        date: "2026-02-23",
        teamAId: "a",
        teamBId: "b",
        games: [
          makeGame("a", "a1", [
            { playerId: "a1", kills: 10, deaths: 1, assists: 5 },
            { playerId: "a2", kills: 2, deaths: 3, assists: 8 },
            { playerId: "b1", kills: 4, deaths: 6, assists: 2 },
            { playerId: "b2", kills: 1, deaths: 7, assists: 3 },
          ]),
          makeGame("a", "a2", [
            { playerId: "a1", kills: 3, deaths: 2, assists: 4 },
            { playerId: "a2", kills: 8, deaths: 1, assists: 9 },
            { playerId: "b1", kills: 5, deaths: 5, assists: 2 },
            { playerId: "b2", kills: 2, deaths: 6, assists: 4 },
          ]),
        ],
      },
    ];

    const boards = buildLeaderboards(dataset);
    expect(boards.kills[0]?.player.playerId).toBe("a1");
    expect(boards.kills[0]?.player.kills).toBe(13);
    expect(boards.kda[0]?.player.playerId).toBe("a1");
    expect(boards.mvps[0]?.player.playerId).toBe("a1");

    const seriesMvp = getSeriesMvp(dataset.seriesMatches[0]!, dataset);
    expect(seriesMvp?.playerId).toBeTruthy();
    expect(["a1", "a2"]).toContain(seriesMvp?.playerId);
  });

  it("calcula MVP de jogo automaticamente pelo KDA mesmo se o mvpPlayerId salvo estiver diferente", () => {
    const dataset = baseDataset();
    dataset.seriesMatches = [
      {
        id: "s-auto-mvp",
        date: "2026-02-24",
        teamAId: "a",
        teamBId: "b",
        games: [
          makeGame("a", "b1", [
            { playerId: "a1", kills: 12, deaths: 1, assists: 8 },
            { playerId: "a2", kills: 2, deaths: 5, assists: 9 },
            { playerId: "b1", kills: 4, deaths: 7, assists: 3 },
            { playerId: "b2", kills: 1, deaths: 6, assists: 2 },
          ]),
        ],
      },
    ];

    const boards = buildLeaderboards(dataset);

    expect(boards.mvps[0]?.player.playerId).toBe("a1");
  });
});
