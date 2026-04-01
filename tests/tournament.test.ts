import { describe, expect, it } from "vitest";

import type { TournamentDataset } from "../lib/schema";
import {
  buildLeaderboards,
  calculateStandings,
  getChampionshipResult,
  inferGameMvpPlayerId,
  getSeriesMvp,
  getSeriesScore,
  getSeriesTeamKillTotals,
  getSeriesWinnerTeamId,
} from "../lib/tournament";

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

  it("preenche seed faltante com zero e nao infere vitorias quando a regra de derrota pontua", () => {
    const dataset = baseDataset();
    dataset.tournament.seriesPointsRule = { win: 3, loss: 1 };
    dataset.standingsSeed = [
      { teamId: "a", played: 2, points: 4 },
      { teamId: "b", played: 1, points: 1 },
    ];

    const standings = calculateStandings(dataset);

    expect(standings.source).toBe("seed");
    expect(standings.rows.find((row) => row.teamId === "a")).toMatchObject({
      seriesPlayed: 2,
      seriesWon: 0,
      points: 4,
    });
    expect(standings.rows.find((row) => row.teamId === "c")).toMatchObject({
      seriesPlayed: 0,
      points: 0,
      seriesWinRate: 0,
    });
  });

  it("desempata por series vencidas quando a regra de derrota tambem pontua", () => {
    const dataset = baseDataset();
    dataset.teams.push({ id: "d", name: "Delta", slug: "delta" });
    dataset.players.push(
      { id: "d1", nick: "D1", slug: "d1", teamId: "d", role1: "TOP", role2: "MID", elo: "OURO" },
      { id: "d2", nick: "D2", slug: "d2", teamId: "d", role1: "JUNG", role2: "SUP", elo: "OURO" },
    );
    dataset.tournament.seriesPointsRule = { win: 1, loss: 1 };
    dataset.seriesMatches = [
      {
        id: "a-d",
        date: "2026-02-20",
        teamAId: "a",
        teamBId: "d",
        games: [
          makeGame("a", "a1", [
            { playerId: "a1", kills: 8, deaths: 2, assists: 5 },
            { playerId: "a2", kills: 2, deaths: 3, assists: 9 },
            { playerId: "d1", kills: 4, deaths: 6, assists: 3 },
            { playerId: "d2", kills: 1, deaths: 6, assists: 6 },
          ]),
          makeGame("a", "a2", [
            { playerId: "a1", kills: 6, deaths: 2, assists: 7 },
            { playerId: "a2", kills: 4, deaths: 2, assists: 11 },
            { playerId: "d1", kills: 5, deaths: 6, assists: 4 },
            { playerId: "d2", kills: 2, deaths: 6, assists: 7 },
          ]),
        ],
      },
      {
        id: "b-c",
        date: "2026-02-21",
        teamAId: "b",
        teamBId: "c",
        games: [
          makeGame("c", "c1", [
            { playerId: "b1", kills: 5, deaths: 5, assists: 4 },
            { playerId: "b2", kills: 1, deaths: 6, assists: 6 },
            { playerId: "c1", kills: 8, deaths: 2, assists: 5 },
            { playerId: "c2", kills: 3, deaths: 3, assists: 9 },
          ]),
          makeGame("c", "c2", [
            { playerId: "b1", kills: 4, deaths: 6, assists: 3 },
            { playerId: "b2", kills: 2, deaths: 7, assists: 5 },
            { playerId: "c1", kills: 7, deaths: 3, assists: 4 },
            { playerId: "c2", kills: 4, deaths: 3, assists: 10 },
          ]),
        ],
      },
      {
        id: "a-c",
        date: "2026-02-22",
        teamAId: "a",
        teamBId: "c",
        games: [
          makeGame("c", "c1", [
            { playerId: "a1", kills: 4, deaths: 5, assists: 4 },
            { playerId: "a2", kills: 1, deaths: 5, assists: 8 },
            { playerId: "c1", kills: 8, deaths: 2, assists: 4 },
            { playerId: "c2", kills: 2, deaths: 3, assists: 10 },
          ]),
          makeGame("c", "c1", [
            { playerId: "a1", kills: 3, deaths: 5, assists: 5 },
            { playerId: "a2", kills: 2, deaths: 4, assists: 7 },
            { playerId: "c1", kills: 7, deaths: 2, assists: 6 },
            { playerId: "c2", kills: 3, deaths: 3, assists: 8 },
          ]),
        ],
      },
      {
        id: "b-d",
        date: "2026-02-23",
        teamAId: "b",
        teamBId: "d",
        games: [
          makeGame("d", "d1", [
            { playerId: "b1", kills: 4, deaths: 6, assists: 4 },
            { playerId: "b2", kills: 1, deaths: 6, assists: 7 },
            { playerId: "d1", kills: 8, deaths: 2, assists: 5 },
            { playerId: "d2", kills: 3, deaths: 3, assists: 9 },
          ]),
          makeGame("b", "b1", [
            { playerId: "b1", kills: 10, deaths: 3, assists: 4 },
            { playerId: "b2", kills: 3, deaths: 4, assists: 10 },
            { playerId: "d1", kills: 5, deaths: 6, assists: 5 },
            { playerId: "d2", kills: 2, deaths: 5, assists: 8 },
          ]),
          makeGame("d", "d1", [
            { playerId: "b1", kills: 5, deaths: 6, assists: 5 },
            { playerId: "b2", kills: 2, deaths: 6, assists: 8 },
            { playerId: "d1", kills: 7, deaths: 3, assists: 6 },
            { playerId: "d2", kills: 3, deaths: 4, assists: 10 },
          ]),
        ],
      },
    ];

    const standings = calculateStandings(dataset);

    expect(standings.rows.find((row) => row.teamId === "a")).toMatchObject({
      points: 2,
      seriesWon: 1,
    });
    expect(standings.rows.find((row) => row.teamId === "b")).toMatchObject({
      points: 2,
      seriesWon: 0,
    });
    expect(standings.rows.find((row) => row.teamId === "a")?.position).toBeLessThan(
      standings.rows.find((row) => row.teamId === "b")!.position,
    );
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

  it("aplica confronto direto quando só 2 times ficam empatados em tudo mais", () => {
    const dataset = baseDataset();
    dataset.teams.push({ id: "d", name: "Delta", slug: "delta" });
    dataset.players.push(
      { id: "d1", nick: "D1", slug: "d1", teamId: "d", role1: "TOP", role2: "MID", elo: "OURO" },
      { id: "d2", nick: "D2", slug: "d2", teamId: "d", role1: "JUNG", role2: "SUP", elo: "OURO" },
    );

    dataset.seriesMatches = [
      {
        id: "ab",
        date: "2026-02-20",
        teamAId: "a",
        teamBId: "b",
        games: [
          makeGame("a", "a1", [
            { playerId: "a1", kills: 8, deaths: 2, assists: 6 },
            { playerId: "a2", kills: 2, deaths: 3, assists: 10 },
            { playerId: "b1", kills: 4, deaths: 6, assists: 2 },
            { playerId: "b2", kills: 1, deaths: 7, assists: 4 },
          ]),
          makeGame("b", "b1", [
            { playerId: "a1", kills: 3, deaths: 5, assists: 4 },
            { playerId: "a2", kills: 2, deaths: 4, assists: 8 },
            { playerId: "b1", kills: 7, deaths: 2, assists: 5 },
            { playerId: "b2", kills: 2, deaths: 3, assists: 10 },
          ]),
          makeGame("a", "a2", [
            { playerId: "a1", kills: 6, deaths: 2, assists: 7 },
            { playerId: "a2", kills: 4, deaths: 2, assists: 11 },
            { playerId: "b1", kills: 5, deaths: 5, assists: 4 },
            { playerId: "b2", kills: 1, deaths: 6, assists: 6 },
          ]),
        ],
      },
      {
        id: "ad",
        date: "2026-02-21",
        teamAId: "a",
        teamBId: "d",
        games: [
          makeGame("d", "d1", [
            { playerId: "a1", kills: 4, deaths: 5, assists: 4 },
            { playerId: "a2", kills: 2, deaths: 5, assists: 7 },
            { playerId: "d1", kills: 8, deaths: 2, assists: 4 },
            { playerId: "d2", kills: 3, deaths: 3, assists: 9 },
          ]),
          makeGame("a", "a1", [
            { playerId: "a1", kills: 7, deaths: 3, assists: 5 },
            { playerId: "a2", kills: 2, deaths: 3, assists: 10 },
            { playerId: "d1", kills: 4, deaths: 6, assists: 4 },
            { playerId: "d2", kills: 1, deaths: 6, assists: 8 },
          ]),
          makeGame("d", "d1", [
            { playerId: "a1", kills: 3, deaths: 6, assists: 3 },
            { playerId: "a2", kills: 1, deaths: 5, assists: 6 },
            { playerId: "d1", kills: 7, deaths: 3, assists: 5 },
            { playerId: "d2", kills: 2, deaths: 3, assists: 10 },
          ]),
        ],
      },
      {
        id: "bc",
        date: "2026-02-22",
        teamAId: "b",
        teamBId: "c",
        games: [
          makeGame("c", "c1", [
            { playerId: "b1", kills: 5, deaths: 5, assists: 5 },
            { playerId: "b2", kills: 2, deaths: 6, assists: 6 },
            { playerId: "c1", kills: 8, deaths: 3, assists: 4 },
            { playerId: "c2", kills: 3, deaths: 3, assists: 9 },
          ]),
          makeGame("b", "b1", [
            { playerId: "b1", kills: 9, deaths: 2, assists: 5 },
            { playerId: "b2", kills: 2, deaths: 3, assists: 11 },
            { playerId: "c1", kills: 4, deaths: 6, assists: 4 },
            { playerId: "c2", kills: 1, deaths: 6, assists: 8 },
          ]),
          makeGame("b", "b2", [
            { playerId: "b1", kills: 7, deaths: 3, assists: 6 },
            { playerId: "b2", kills: 4, deaths: 2, assists: 12 },
            { playerId: "c1", kills: 5, deaths: 6, assists: 4 },
            { playerId: "c2", kills: 2, deaths: 5, assists: 7 },
          ]),
        ],
      },
      {
        id: "dc",
        date: "2026-02-23",
        teamAId: "d",
        teamBId: "c",
        games: [
          makeGame("d", "d1", [
            { playerId: "d1", kills: 8, deaths: 2, assists: 5 },
            { playerId: "d2", kills: 2, deaths: 3, assists: 11 },
            { playerId: "c1", kills: 4, deaths: 6, assists: 4 },
            { playerId: "c2", kills: 1, deaths: 6, assists: 7 },
          ]),
          makeGame("d", "d2", [
            { playerId: "d1", kills: 6, deaths: 3, assists: 7 },
            { playerId: "d2", kills: 4, deaths: 2, assists: 12 },
            { playerId: "c1", kills: 3, deaths: 6, assists: 5 },
            { playerId: "c2", kills: 2, deaths: 5, assists: 6 },
          ]),
        ],
      },
    ];

    const standings = calculateStandings(dataset);

    const aRow = standings.rows.find((row) => row.teamId === "a");
    const bRow = standings.rows.find((row) => row.teamId === "b");
    const cRow = standings.rows.find((row) => row.teamId === "c");
    const dRow = standings.rows.find((row) => row.teamId === "d");

    expect(aRow).toMatchObject({ points: 3, seriesWon: 1, gameDiff: 0 });
    expect(bRow).toMatchObject({ points: 3, seriesWon: 1, gameDiff: 0 });
    expect(cRow).toMatchObject({ points: 0 });
    expect(dRow).toMatchObject({ points: 6, seriesWon: 2 });
    expect(aRow?.position).toBeLessThan(bRow!.position);
  });

  it("cai no fallback alfabético quando o confronto direto também empata", () => {
    const dataset = baseDataset();

    dataset.seriesMatches = [
      {
        id: "ab-1",
        date: "2026-02-20",
        teamAId: "a",
        teamBId: "b",
        games: [
          makeGame("a", "a1", [
            { playerId: "a1", kills: 8, deaths: 2, assists: 6 },
            { playerId: "a2", kills: 2, deaths: 3, assists: 10 },
            { playerId: "b1", kills: 4, deaths: 6, assists: 2 },
            { playerId: "b2", kills: 1, deaths: 7, assists: 4 },
          ]),
          makeGame("b", "b1", [
            { playerId: "a1", kills: 3, deaths: 5, assists: 4 },
            { playerId: "a2", kills: 2, deaths: 4, assists: 8 },
            { playerId: "b1", kills: 7, deaths: 2, assists: 5 },
            { playerId: "b2", kills: 2, deaths: 3, assists: 10 },
          ]),
          makeGame("a", "a2", [
            { playerId: "a1", kills: 6, deaths: 2, assists: 7 },
            { playerId: "a2", kills: 4, deaths: 2, assists: 11 },
            { playerId: "b1", kills: 5, deaths: 5, assists: 4 },
            { playerId: "b2", kills: 1, deaths: 6, assists: 6 },
          ]),
        ],
      },
      {
        id: "ab-2",
        date: "2026-02-21",
        teamAId: "b",
        teamBId: "a",
        games: [
          makeGame("b", "b1", [
            { playerId: "b1", kills: 8, deaths: 2, assists: 6 },
            { playerId: "b2", kills: 2, deaths: 3, assists: 10 },
            { playerId: "a1", kills: 4, deaths: 6, assists: 2 },
            { playerId: "a2", kills: 1, deaths: 7, assists: 4 },
          ]),
          makeGame("a", "a1", [
            { playerId: "b1", kills: 3, deaths: 5, assists: 4 },
            { playerId: "b2", kills: 2, deaths: 4, assists: 8 },
            { playerId: "a1", kills: 7, deaths: 2, assists: 5 },
            { playerId: "a2", kills: 2, deaths: 3, assists: 10 },
          ]),
          makeGame("b", "b2", [
            { playerId: "b1", kills: 6, deaths: 2, assists: 7 },
            { playerId: "b2", kills: 4, deaths: 2, assists: 11 },
            { playerId: "a1", kills: 5, deaths: 5, assists: 4 },
            { playerId: "a2", kills: 1, deaths: 6, assists: 6 },
          ]),
        ],
      },
    ];

    const standings = calculateStandings(dataset);

    expect(standings.rows.find((row) => row.teamId === "a")).toMatchObject({
      points: 3,
      seriesWon: 1,
      gameDiff: 0,
      position: 1,
    });
    expect(standings.rows.find((row) => row.teamId === "b")).toMatchObject({
      points: 3,
      seriesWon: 1,
      gameDiff: 0,
      position: 2,
    });
  });
});

describe("leaderboards and MVP calculation", () => {
  it("retorna nulo para MVP da serie quando a serie nao tem jogos ou nao tem stats do elenco", () => {
    const dataset = baseDataset();
    const emptySeries = {
      id: "s-empty",
      date: "2026-02-23",
      teamAId: "a",
      teamBId: "b",
      games: [],
    };
    const offRosterSeries = {
      id: "s-off-roster",
      date: "2026-02-24",
      teamAId: "a",
      teamBId: "b",
      games: [
        makeGame("a", "", [
          { playerId: "ghost-a", kills: 5, deaths: 1, assists: 3 },
          { playerId: "ghost-b", kills: 2, deaths: 4, assists: 1 },
        ]),
      ],
    };

    expect(getSeriesMvp(emptySeries, dataset)).toBeNull();
    expect(getSeriesMvp(offRosterSeries, dataset)).toBeNull();
  });

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

  it("desempata leaderboard de KDA por quantidade de jogos", () => {
    const dataset = baseDataset();
    dataset.seriesMatches = [
      {
        id: "s-kda-a",
        date: "2026-02-24",
        teamAId: "a",
        teamBId: "b",
        games: [
          makeGame("a", "a1", [
            { playerId: "a1", kills: 4, deaths: 1, assists: 0 },
            { playerId: "a2", kills: 1, deaths: 4, assists: 5 },
            { playerId: "b1", kills: 2, deaths: 5, assists: 1 },
            { playerId: "b2", kills: 1, deaths: 5, assists: 3 },
          ]),
          makeGame("a", "a1", [
            { playerId: "a1", kills: 4, deaths: 1, assists: 0 },
            { playerId: "a2", kills: 1, deaths: 4, assists: 5 },
            { playerId: "b1", kills: 2, deaths: 5, assists: 1 },
            { playerId: "b2", kills: 1, deaths: 5, assists: 3 },
          ]),
        ],
      },
      {
        id: "s-kda-c",
        date: "2026-02-25",
        teamAId: "c",
        teamBId: "b",
        games: [
          makeGame("c", "c1", [
            { playerId: "c1", kills: 8, deaths: 2, assists: 0 },
            { playerId: "c2", kills: 2, deaths: 4, assists: 6 },
            { playerId: "b1", kills: 3, deaths: 6, assists: 2 },
            { playerId: "b2", kills: 1, deaths: 5, assists: 4 },
          ]),
        ],
      },
    ];

    const boards = buildLeaderboards(dataset);

    expect(boards.kda[0]?.player.playerId).toBe("a1");
    expect(boards.kda[1]?.player.playerId).toBe("c1");
    expect(boards.kda[0]?.value).toBe(boards.kda[1]?.value);
  });

  it("desempata MVP de jogo por assistencias, menos mortes e playerId", () => {
    expect(
      inferGameMvpPlayerId([
        { playerId: "p2", kills: 4, deaths: 1, assists: 1 },
        { playerId: "p1", kills: 4, deaths: 2, assists: 6 },
      ]),
    ).toBe("p1");

    expect(
      inferGameMvpPlayerId([
        { playerId: "p2", kills: 0, deaths: 2, assists: 0 },
        { playerId: "p1", kills: 0, deaths: 1, assists: 0 },
      ]),
    ).toBe("p1");

    expect(
      inferGameMvpPlayerId([
        { playerId: "p2", kills: 5, deaths: 2, assists: 5 },
        { playerId: "p1", kills: 5, deaths: 2, assists: 5 },
      ]),
    ).toBe("p1");

    expect(
      inferGameMvpPlayerId([
        { playerId: "p1", kills: 4, deaths: 1, assists: 1 },
        { playerId: "p2", kills: 4, deaths: 2, assists: 6 },
      ]),
    ).toBe("p2");

    expect(
      inferGameMvpPlayerId([
        { playerId: "p1", kills: 0, deaths: 2, assists: 0 },
        { playerId: "p2", kills: 0, deaths: 1, assists: 0 },
      ]),
    ).toBe("p2");
  });

  it("desempata MVP da serie por nick quando KDA e MVPs de jogo empatam", () => {
    const dataset = baseDataset();
    dataset.players.push({
      id: "a3",
      nick: "A0",
      slug: "a0",
      teamId: "a",
      role1: "ADC",
      role2: "SUP",
      elo: "OURO",
    });

    dataset.seriesMatches = [
      {
        id: "s-tie-series-mvp",
        date: "2026-02-26",
        teamAId: "a",
        teamBId: "b",
        games: [
          makeGame("a", "a1", [
            { playerId: "a1", kills: 5, deaths: 1, assists: 5 },
            { playerId: "a3", kills: 4, deaths: 1, assists: 5 },
            { playerId: "b1", kills: 2, deaths: 5, assists: 2 },
            { playerId: "b2", kills: 1, deaths: 6, assists: 3 },
          ]),
          makeGame("a", "a3", [
            { playerId: "a1", kills: 4, deaths: 1, assists: 5 },
            { playerId: "a3", kills: 5, deaths: 1, assists: 5 },
            { playerId: "b1", kills: 3, deaths: 5, assists: 2 },
            { playerId: "b2", kills: 1, deaths: 6, assists: 4 },
          ]),
        ],
      },
    ];

    const seriesMvp = getSeriesMvp(dataset.seriesMatches[0]!, dataset);

    expect(seriesMvp?.playerId).toBe("a3");
  });

  it("mantem o MVP atual quando o proximo candidato tem menos MVPs, menor KDA ou nick posterior", () => {
    const dataset = baseDataset();
    dataset.players.push({
      id: "a3",
      nick: "Z9",
      slug: "z9",
      teamId: "a",
      role1: "ADC",
      role2: "SUP",
      elo: "OURO",
    });

    const lowerMvpSeries = {
      id: "s-lower-mvp",
      date: "2026-02-25",
      teamAId: "a",
      teamBId: "b",
      games: [
        makeGame("a", "a1", [
          { playerId: "a1", kills: 7, deaths: 1, assists: 5 },
          { playerId: "a2", kills: 3, deaths: 3, assists: 8 },
          { playerId: "b1", kills: 2, deaths: 5, assists: 2 },
          { playerId: "b2", kills: 1, deaths: 6, assists: 3 },
        ]),
        makeGame("a", "a1", [
          { playerId: "a1", kills: 6, deaths: 1, assists: 6 },
          { playerId: "a2", kills: 2, deaths: 3, assists: 9 },
          { playerId: "b1", kills: 3, deaths: 5, assists: 2 },
          { playerId: "b2", kills: 1, deaths: 6, assists: 4 },
        ]),
      ],
    };

    const lowerKdaSeries = {
      id: "s-lower-kda",
      date: "2026-02-26",
      teamAId: "a",
      teamBId: "b",
      games: [
        makeGame("a", "a1", [
          { playerId: "a1", kills: 5, deaths: 1, assists: 5 },
          { playerId: "a2", kills: 2, deaths: 4, assists: 7 },
          { playerId: "b1", kills: 3, deaths: 5, assists: 2 },
          { playerId: "b2", kills: 1, deaths: 6, assists: 3 },
        ]),
        makeGame("a", "a3", [
          { playerId: "a1", kills: 4, deaths: 1, assists: 5 },
          { playerId: "a3", kills: 4, deaths: 2, assists: 4 },
          { playerId: "b1", kills: 2, deaths: 5, assists: 2 },
          { playerId: "b2", kills: 1, deaths: 6, assists: 4 },
        ]),
      ],
    };

    const laterNickSeries = {
      id: "s-later-nick",
      date: "2026-02-27",
      teamAId: "a",
      teamBId: "b",
      games: [
        makeGame("a", "a1", [
          { playerId: "a1", kills: 5, deaths: 1, assists: 5 },
          { playerId: "a3", kills: 4, deaths: 1, assists: 5 },
          { playerId: "b1", kills: 2, deaths: 5, assists: 2 },
          { playerId: "b2", kills: 1, deaths: 6, assists: 3 },
        ]),
        makeGame("a", "a3", [
          { playerId: "a1", kills: 4, deaths: 1, assists: 5 },
          { playerId: "a3", kills: 5, deaths: 1, assists: 5 },
          { playerId: "b1", kills: 3, deaths: 5, assists: 2 },
          { playerId: "b2", kills: 1, deaths: 6, assists: 4 },
        ]),
      ],
    };

    expect(getSeriesMvp(lowerMvpSeries, dataset)?.playerId).toBe("a1");
    expect(getSeriesMvp(lowerKdaSeries, dataset)?.playerId).toBe("a1");
    expect(getSeriesMvp(laterNickSeries, dataset)?.playerId).toBe("a1");
  });

  it("troca o MVP da serie quando um candidato posterior acumula mais MVPs de jogo", () => {
    const dataset = baseDataset();
    dataset.players.push({
      id: "a3",
      nick: "A3",
      slug: "a3",
      teamId: "a",
      role1: "ADC",
      role2: "SUP",
      elo: "OURO",
    });

    const series = {
      id: "s-more-game-mvps",
      date: "2026-02-27",
      teamAId: "a",
      teamBId: "b",
      games: [
        makeGame("a", "a1", [
          { playerId: "a1", kills: 7, deaths: 1, assists: 5 },
          { playerId: "a3", kills: 4, deaths: 2, assists: 4 },
          { playerId: "b1", kills: 2, deaths: 5, assists: 2 },
          { playerId: "b2", kills: 1, deaths: 6, assists: 3 },
        ]),
        makeGame("a", "a3", [
          { playerId: "a1", kills: 4, deaths: 2, assists: 4 },
          { playerId: "a3", kills: 8, deaths: 1, assists: 5 },
          { playerId: "b1", kills: 3, deaths: 5, assists: 2 },
          { playerId: "b2", kills: 1, deaths: 6, assists: 4 },
        ]),
        makeGame("a", "a3", [
          { playerId: "a1", kills: 5, deaths: 2, assists: 5 },
          { playerId: "a3", kills: 9, deaths: 1, assists: 4 },
          { playerId: "b1", kills: 2, deaths: 6, assists: 2 },
          { playerId: "b2", kills: 1, deaths: 6, assists: 5 },
        ]),
      ],
    };

    expect(getSeriesMvp(series, dataset)?.playerId).toBe("a3");
  });

  it("ignora jogadores desconhecidos ao somar kills por time na serie", () => {
    const dataset = baseDataset();
    const series = {
      id: "s-kills-unknown",
      date: "2026-02-28",
      teamAId: "a",
      teamBId: "b",
      games: [
        makeGame("a", "a1", [
          { playerId: "a1", kills: 7, deaths: 1, assists: 5 },
          { playerId: "a2", kills: 3, deaths: 2, assists: 8 },
          { playerId: "b1", kills: 4, deaths: 5, assists: 2 },
          { playerId: "b2", kills: 2, deaths: 6, assists: 4 },
          { playerId: "ghost", kills: 99, deaths: 99, assists: 99 },
        ]),
      ],
    };

    expect(getSeriesTeamKillTotals(series, dataset)).toEqual({
      a: 10,
      b: 6,
    });
  });

  it("usa alvo padrao de MD3 quando score e vencedor sao calculados sem dataset", () => {
    const series = {
      id: "s-no-dataset",
      date: "2026-03-01",
      teamAId: "a",
      teamBId: "b",
      format: "BO5" as const,
      games: [
        makeGame("a", "a1", [
          { playerId: "a1", kills: 8, deaths: 2, assists: 5 },
          { playerId: "a2", kills: 2, deaths: 3, assists: 9 },
          { playerId: "b1", kills: 4, deaths: 6, assists: 3 },
          { playerId: "b2", kills: 1, deaths: 6, assists: 6 },
        ]),
        makeGame("a", "a2", [
          { playerId: "a1", kills: 6, deaths: 2, assists: 7 },
          { playerId: "a2", kills: 4, deaths: 2, assists: 11 },
          { playerId: "b1", kills: 5, deaths: 6, assists: 4 },
          { playerId: "b2", kills: 2, deaths: 6, assists: 7 },
        ]),
      ],
    };

    expect(getSeriesScore(series)).toEqual({ teamAWins: 2, teamBWins: 0 });
    expect(getSeriesWinnerTeamId(series)).toBe("a");
  });
});

describe("walkover series", () => {
  it("conta W.O. como 2-0 sem gerar MVP de série", () => {
    const dataset = baseDataset();
    dataset.seriesMatches = [
      {
        id: "s-wo",
        date: "2026-02-25",
        teamAId: "a",
        teamBId: "b",
        walkoverWinnerTeamId: "a",
        walkoverReason: "Time B não compareceu",
        games: [],
      },
    ];

    const score = getSeriesScore(dataset.seriesMatches[0]!, dataset);
    const standings = calculateStandings(dataset);
    const seriesMvp = getSeriesMvp(dataset.seriesMatches[0]!, dataset);

    expect(score).toEqual({ teamAWins: 2, teamBWins: 0 });
    expect(standings.rows.find((row) => row.teamId === "a")?.points).toBe(3);
    expect(standings.rows.find((row) => row.teamId === "a")?.gameDiff).toBe(2);
    expect(seriesMvp).toBeNull();
  });
});

describe("playoffs and MD5", () => {
  it("uses BO5 target wins for semifinal series", () => {
    const dataset = baseDataset();
    dataset.seriesMatches = [
      {
        id: "sf-1",
        date: "2026-03-01",
        teamAId: "a",
        teamBId: "b",
        stage: "SEMIFINAL",
        format: "BO5",
        games: [
          makeGame("a", "a1", [
            { playerId: "a1", kills: 8, deaths: 2, assists: 6 },
            { playerId: "a2", kills: 3, deaths: 4, assists: 9 },
            { playerId: "b1", kills: 4, deaths: 6, assists: 3 },
            { playerId: "b2", kills: 2, deaths: 7, assists: 4 },
          ]),
          makeGame("a", "a1", [
            { playerId: "a1", kills: 10, deaths: 3, assists: 5 },
            { playerId: "a2", kills: 2, deaths: 5, assists: 10 },
            { playerId: "b1", kills: 5, deaths: 7, assists: 2 },
            { playerId: "b2", kills: 1, deaths: 6, assists: 6 },
          ]),
          makeGame("a", "a2", [
            { playerId: "a1", kills: 6, deaths: 4, assists: 8 },
            { playerId: "a2", kills: 4, deaths: 3, assists: 11 },
            { playerId: "b1", kills: 4, deaths: 6, assists: 5 },
            { playerId: "b2", kills: 2, deaths: 5, assists: 7 },
          ]),
        ],
      },
    ];

    const score = getSeriesScore(dataset.seriesMatches[0]!, dataset);
    const standings = calculateStandings(dataset);

    expect(score).toEqual({ teamAWins: 3, teamBWins: 0 });
    expect(standings.source).toBe("seed");
  });

  it("ignores semifinal and final matches in regular season standings", () => {
    const dataset = baseDataset();
    dataset.seriesMatches = [
      {
        id: "r1",
        date: "2026-02-20",
        teamAId: "a",
        teamBId: "b",
        stage: "REGULAR_SEASON",
        games: [
          makeGame("a", "a1", [
            { playerId: "a1", kills: 8, deaths: 2, assists: 4 },
            { playerId: "a2", kills: 2, deaths: 3, assists: 10 },
            { playerId: "b1", kills: 3, deaths: 6, assists: 2 },
            { playerId: "b2", kills: 1, deaths: 5, assists: 5 },
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
        id: "sf-1",
        date: "2026-03-01",
        teamAId: "b",
        teamBId: "c",
        stage: "SEMIFINAL",
        format: "BO5",
        games: [
          makeGame("c", "c1", [
            { playerId: "b1", kills: 3, deaths: 5, assists: 4 },
            { playerId: "b2", kills: 1, deaths: 6, assists: 3 },
            { playerId: "c1", kills: 8, deaths: 2, assists: 3 },
            { playerId: "c2", kills: 4, deaths: 3, assists: 6 },
          ]),
          makeGame("c", "c1", [
            { playerId: "b1", kills: 4, deaths: 6, assists: 4 },
            { playerId: "b2", kills: 2, deaths: 7, assists: 5 },
            { playerId: "c1", kills: 9, deaths: 2, assists: 4 },
            { playerId: "c2", kills: 5, deaths: 3, assists: 7 },
          ]),
          makeGame("c", "c2", [
            { playerId: "b1", kills: 5, deaths: 6, assists: 5 },
            { playerId: "b2", kills: 3, deaths: 6, assists: 8 },
            { playerId: "c1", kills: 7, deaths: 3, assists: 6 },
            { playerId: "c2", kills: 4, deaths: 2, assists: 11 },
          ]),
        ],
      },
    ];

    const standings = calculateStandings(dataset);

    expect(standings.source).toBe("series");
    expect(standings.rows.find((row) => row.teamId === "a")?.points).toBe(3);
    expect(standings.rows.find((row) => row.teamId === "b")?.points).toBe(0);
    expect(standings.rows.find((row) => row.teamId === "c")?.points).toBe(0);
  });

  it("detects the champion from the latest completed final", () => {
    const dataset = baseDataset();
    dataset.seriesMatches = [
      {
        id: "regular-late",
        date: "2026-03-11",
        teamAId: "a",
        teamBId: "c",
        games: [
          makeGame("a", "a1", [
            { playerId: "a1", kills: 6, deaths: 2, assists: 5 },
            { playerId: "a2", kills: 2, deaths: 3, assists: 9 },
            { playerId: "c1", kills: 4, deaths: 5, assists: 4 },
            { playerId: "c2", kills: 1, deaths: 6, assists: 6 },
          ]),
          makeGame("a", "a2", [
            { playerId: "a1", kills: 5, deaths: 3, assists: 6 },
            { playerId: "a2", kills: 3, deaths: 2, assists: 11 },
            { playerId: "c1", kills: 4, deaths: 6, assists: 4 },
            { playerId: "c2", kills: 2, deaths: 6, assists: 7 },
          ]),
        ],
      },
      {
        id: "old-final",
        date: "2026-03-01",
        teamAId: "a",
        teamBId: "b",
        stage: "FINAL",
        format: "BO5",
        games: [
          makeGame("a", "a1", [
            { playerId: "a1", kills: 8, deaths: 2, assists: 6 },
            { playerId: "a2", kills: 3, deaths: 4, assists: 9 },
            { playerId: "b1", kills: 4, deaths: 6, assists: 3 },
            { playerId: "b2", kills: 2, deaths: 7, assists: 4 },
          ]),
          makeGame("a", "a1", [
            { playerId: "a1", kills: 9, deaths: 2, assists: 5 },
            { playerId: "a2", kills: 2, deaths: 4, assists: 10 },
            { playerId: "b1", kills: 5, deaths: 6, assists: 2 },
            { playerId: "b2", kills: 1, deaths: 7, assists: 5 },
          ]),
          makeGame("a", "a2", [
            { playerId: "a1", kills: 7, deaths: 3, assists: 8 },
            { playerId: "a2", kills: 4, deaths: 3, assists: 12 },
            { playerId: "b1", kills: 4, deaths: 6, assists: 5 },
            { playerId: "b2", kills: 2, deaths: 6, assists: 7 },
          ]),
        ],
      },
      {
        id: "current-final",
        date: "2026-03-10",
        teamAId: "b",
        teamBId: "c",
        stage: "FINAL",
        format: "BO5",
        games: [
          makeGame("c", "c1", [
            { playerId: "b1", kills: 4, deaths: 6, assists: 3 },
            { playerId: "b2", kills: 2, deaths: 7, assists: 5 },
            { playerId: "c1", kills: 9, deaths: 2, assists: 4 },
            { playerId: "c2", kills: 3, deaths: 3, assists: 8 },
          ]),
          makeGame("c", "c1", [
            { playerId: "b1", kills: 5, deaths: 6, assists: 4 },
            { playerId: "b2", kills: 1, deaths: 7, assists: 6 },
            { playerId: "c1", kills: 10, deaths: 2, assists: 5 },
            { playerId: "c2", kills: 4, deaths: 3, assists: 7 },
          ]),
          makeGame("b", "b1", [
            { playerId: "b1", kills: 11, deaths: 3, assists: 5 },
            { playerId: "b2", kills: 3, deaths: 4, assists: 10 },
            { playerId: "c1", kills: 6, deaths: 5, assists: 4 },
            { playerId: "c2", kills: 2, deaths: 5, assists: 8 },
          ]),
          makeGame("c", "c2", [
            { playerId: "b1", kills: 4, deaths: 6, assists: 4 },
            { playerId: "b2", kills: 2, deaths: 7, assists: 7 },
            { playerId: "c1", kills: 7, deaths: 4, assists: 5 },
            { playerId: "c2", kills: 5, deaths: 2, assists: 11 },
          ]),
        ],
      },
    ];

    const championship = getChampionshipResult(dataset);

    expect(championship?.summary.series.id).toBe("current-final");
    expect(championship?.championTeamId).toBe("c");
    expect(championship?.runnerUpTeamId).toBe("b");
  });

  it("detects the champion when team A wins the final", () => {
    const dataset = baseDataset();
    dataset.seriesMatches = [
      {
        id: "team-a-final",
        date: "2026-03-12",
        teamAId: "a",
        teamBId: "b",
        stage: "FINAL",
        format: "BO5",
        games: [
          makeGame("a", "a1", [
            { playerId: "a1", kills: 8, deaths: 2, assists: 6 },
            { playerId: "a2", kills: 2, deaths: 3, assists: 10 },
            { playerId: "b1", kills: 4, deaths: 6, assists: 3 },
            { playerId: "b2", kills: 1, deaths: 6, assists: 5 },
          ]),
          makeGame("a", "a1", [
            { playerId: "a1", kills: 9, deaths: 2, assists: 5 },
            { playerId: "a2", kills: 3, deaths: 4, assists: 11 },
            { playerId: "b1", kills: 4, deaths: 7, assists: 3 },
            { playerId: "b2", kills: 2, deaths: 6, assists: 6 },
          ]),
          makeGame("a", "a2", [
            { playerId: "a1", kills: 7, deaths: 3, assists: 7 },
            { playerId: "a2", kills: 4, deaths: 2, assists: 12 },
            { playerId: "b1", kills: 5, deaths: 7, assists: 4 },
            { playerId: "b2", kills: 1, deaths: 6, assists: 7 },
          ]),
        ],
      },
    ];

    const championship = getChampionshipResult(dataset);

    expect(championship?.championTeamId).toBe("a");
    expect(championship?.runnerUpTeamId).toBe("b");
  });

  it("ignora serie completa com time fora do cadastro ao calcular a tabela", () => {
    const dataset = baseDataset();
    dataset.seriesMatches = [
      {
        id: "known-vs-phantom",
        date: "2026-03-13",
        teamAId: "a",
        teamBId: "phantom-team",
        walkoverWinnerTeamId: "a",
        games: [],
      },
    ];

    const standings = calculateStandings(dataset);

    expect(standings.source).toBe("series");
    expect(standings.rows.find((row) => row.teamId === "a")).toMatchObject({
      seriesPlayed: 0,
      points: 0,
    });
  });

  it("ignora confronto direto incompleto e cai no fallback seguinte", () => {
    const dataset = baseDataset();
    dataset.seriesMatches = [
      {
        id: "ab-open",
        date: "2026-02-20",
        teamAId: "a",
        teamBId: "b",
        games: [
          makeGame("a", "a1", [
            { playerId: "a1", kills: 5, deaths: 2, assists: 4 },
            { playerId: "a2", kills: 2, deaths: 3, assists: 8 },
            { playerId: "b1", kills: 3, deaths: 5, assists: 2 },
            { playerId: "b2", kills: 1, deaths: 6, assists: 4 },
          ]),
        ],
      },
      {
        id: "a-c",
        date: "2026-02-21",
        teamAId: "a",
        teamBId: "c",
        games: [
          makeGame("a", "a1", [
            { playerId: "a1", kills: 8, deaths: 2, assists: 4 },
            { playerId: "a2", kills: 2, deaths: 3, assists: 10 },
            { playerId: "c1", kills: 4, deaths: 6, assists: 2 },
            { playerId: "c2", kills: 1, deaths: 6, assists: 5 },
          ]),
          makeGame("a", "a2", [
            { playerId: "a1", kills: 6, deaths: 2, assists: 7 },
            { playerId: "a2", kills: 4, deaths: 2, assists: 11 },
            { playerId: "c1", kills: 5, deaths: 6, assists: 4 },
            { playerId: "c2", kills: 2, deaths: 6, assists: 7 },
          ]),
        ],
      },
      {
        id: "b-c",
        date: "2026-02-22",
        teamAId: "b",
        teamBId: "c",
        games: [
          makeGame("b", "b1", [
            { playerId: "b1", kills: 8, deaths: 2, assists: 5 },
            { playerId: "b2", kills: 2, deaths: 3, assists: 9 },
            { playerId: "c1", kills: 4, deaths: 6, assists: 4 },
            { playerId: "c2", kills: 1, deaths: 6, assists: 6 },
          ]),
          makeGame("b", "b1", [
            { playerId: "b1", kills: 7, deaths: 3, assists: 6 },
            { playerId: "b2", kills: 3, deaths: 3, assists: 10 },
            { playerId: "c1", kills: 5, deaths: 6, assists: 4 },
            { playerId: "c2", kills: 2, deaths: 6, assists: 7 },
          ]),
        ],
      },
    ];

    const standings = calculateStandings(dataset);
    const aRow = standings.rows.find((row) => row.teamId === "a");
    const bRow = standings.rows.find((row) => row.teamId === "b");

    expect(aRow).toMatchObject({ points: 3, seriesWon: 1, gameDiff: 2 });
    expect(bRow).toMatchObject({ points: 3, seriesWon: 1, gameDiff: 2 });
    expect(aRow?.position).toBeLessThan(bRow!.position);
  });

  it("usa saldo de jogos do H2H quando pontos, series vencidas e saldo geral empatam", () => {
    const dataset = baseDataset();
    dataset.teams.push({ id: "d", name: "Delta", slug: "delta" });
    dataset.players.push(
      { id: "d1", nick: "D1", slug: "d1", teamId: "d", role1: "TOP", role2: "MID", elo: "OURO" },
      { id: "d2", nick: "D2", slug: "d2", teamId: "d", role1: "JUNG", role2: "SUP", elo: "OURO" },
    );
    dataset.tournament.seriesPointsRule = { win: 1, loss: 0 };
    dataset.seriesMatches = [
      {
        id: "ab-1",
        date: "2026-02-21",
        teamAId: "a",
        teamBId: "b",
        games: [
          makeGame("a", "a1", [
            { playerId: "a1", kills: 8, deaths: 2, assists: 4 },
            { playerId: "a2", kills: 2, deaths: 3, assists: 10 },
            { playerId: "b1", kills: 4, deaths: 6, assists: 2 },
            { playerId: "b2", kills: 1, deaths: 6, assists: 5 },
          ]),
          makeGame("a", "a2", [
            { playerId: "a1", kills: 6, deaths: 2, assists: 7 },
            { playerId: "a2", kills: 4, deaths: 2, assists: 11 },
            { playerId: "b1", kills: 5, deaths: 6, assists: 4 },
            { playerId: "b2", kills: 2, deaths: 6, assists: 7 },
          ]),
        ],
      },
      {
        id: "ba-1",
        date: "2026-02-22",
        teamAId: "b",
        teamBId: "a",
        games: [
          makeGame("b", "b1", [
            { playerId: "b1", kills: 8, deaths: 2, assists: 5 },
            { playerId: "b2", kills: 2, deaths: 3, assists: 9 },
            { playerId: "a1", kills: 4, deaths: 6, assists: 4 },
            { playerId: "a2", kills: 1, deaths: 6, assists: 6 },
          ]),
          makeGame("b", "b1", [
            { playerId: "b1", kills: 7, deaths: 3, assists: 6 },
            { playerId: "b2", kills: 3, deaths: 3, assists: 10 },
            { playerId: "a1", kills: 5, deaths: 6, assists: 4 },
            { playerId: "a2", kills: 2, deaths: 6, assists: 7 },
          ]),
          makeGame("a", "a1", [
            { playerId: "b1", kills: 5, deaths: 6, assists: 5 },
            { playerId: "b2", kills: 2, deaths: 6, assists: 8 },
            { playerId: "a1", kills: 9, deaths: 2, assists: 5 },
            { playerId: "a2", kills: 3, deaths: 3, assists: 10 },
          ]),
        ],
      },
      {
        id: "a-c",
        date: "2026-02-23",
        teamAId: "a",
        teamBId: "c",
        games: [
          makeGame("a", "a1", [
            { playerId: "a1", kills: 8, deaths: 2, assists: 5 },
            { playerId: "a2", kills: 2, deaths: 3, assists: 9 },
            { playerId: "c1", kills: 4, deaths: 6, assists: 3 },
            { playerId: "c2", kills: 1, deaths: 6, assists: 6 },
          ]),
          makeGame("c", "c1", [
            { playerId: "a1", kills: 4, deaths: 5, assists: 4 },
            { playerId: "a2", kills: 1, deaths: 5, assists: 8 },
            { playerId: "c1", kills: 8, deaths: 2, assists: 4 },
            { playerId: "c2", kills: 2, deaths: 3, assists: 10 },
          ]),
          makeGame("a", "a2", [
            { playerId: "a1", kills: 6, deaths: 2, assists: 7 },
            { playerId: "a2", kills: 4, deaths: 2, assists: 11 },
            { playerId: "c1", kills: 5, deaths: 6, assists: 4 },
            { playerId: "c2", kills: 2, deaths: 6, assists: 7 },
          ]),
        ],
      },
      {
        id: "a-d",
        date: "2026-02-24",
        teamAId: "a",
        teamBId: "d",
        games: [
          makeGame("d", "d1", [
            { playerId: "a1", kills: 4, deaths: 6, assists: 4 },
            { playerId: "a2", kills: 1, deaths: 6, assists: 7 },
            { playerId: "d1", kills: 8, deaths: 2, assists: 5 },
            { playerId: "d2", kills: 3, deaths: 3, assists: 9 },
          ]),
          makeGame("d", "d1", [
            { playerId: "a1", kills: 5, deaths: 6, assists: 5 },
            { playerId: "a2", kills: 2, deaths: 6, assists: 8 },
            { playerId: "d1", kills: 7, deaths: 3, assists: 6 },
            { playerId: "d2", kills: 3, deaths: 4, assists: 10 },
          ]),
        ],
      },
      {
        id: "b-c",
        date: "2026-02-25",
        teamAId: "b",
        teamBId: "c",
        games: [
          makeGame("b", "b1", [
            { playerId: "b1", kills: 8, deaths: 2, assists: 5 },
            { playerId: "b2", kills: 2, deaths: 3, assists: 9 },
            { playerId: "c1", kills: 4, deaths: 6, assists: 4 },
            { playerId: "c2", kills: 1, deaths: 6, assists: 6 },
          ]),
          makeGame("b", "b1", [
            { playerId: "b1", kills: 7, deaths: 3, assists: 6 },
            { playerId: "b2", kills: 3, deaths: 3, assists: 10 },
            { playerId: "c1", kills: 5, deaths: 6, assists: 4 },
            { playerId: "c2", kills: 2, deaths: 6, assists: 7 },
          ]),
        ],
      },
      {
        id: "b-d",
        date: "2026-02-26",
        teamAId: "b",
        teamBId: "d",
        games: [
          makeGame("d", "d1", [
            { playerId: "b1", kills: 4, deaths: 6, assists: 4 },
            { playerId: "b2", kills: 1, deaths: 6, assists: 7 },
            { playerId: "d1", kills: 8, deaths: 2, assists: 5 },
            { playerId: "d2", kills: 3, deaths: 3, assists: 9 },
          ]),
          makeGame("b", "b1", [
            { playerId: "b1", kills: 10, deaths: 3, assists: 4 },
            { playerId: "b2", kills: 3, deaths: 4, assists: 10 },
            { playerId: "d1", kills: 5, deaths: 6, assists: 5 },
            { playerId: "d2", kills: 2, deaths: 5, assists: 8 },
          ]),
          makeGame("d", "d1", [
            { playerId: "b1", kills: 5, deaths: 6, assists: 5 },
            { playerId: "b2", kills: 2, deaths: 6, assists: 8 },
            { playerId: "d1", kills: 7, deaths: 3, assists: 6 },
            { playerId: "d2", kills: 3, deaths: 4, assists: 10 },
          ]),
        ],
      },
    ];

    const standings = calculateStandings(dataset);
    const aRow = standings.rows.find((row) => row.teamId === "a");
    const bRow = standings.rows.find((row) => row.teamId === "b");

    expect(aRow).toMatchObject({ points: 2, seriesWon: 2, gameDiff: 0 });
    expect(bRow).toMatchObject({ points: 2, seriesWon: 2, gameDiff: 0 });
    expect(aRow?.position).toBeLessThan(bRow!.position);
  });
});
