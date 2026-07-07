import { describe, expect, it } from "vitest";

import type { TournamentDataset } from "../lib/schema";
import { tournamentDatasetSchema } from "../lib/schema";
import {
  buildArchivedSeason,
  buildNextSeasonDataset,
  getChampionshipResult,
  snapshotToDataset,
  summarizeArchivedSeason,
} from "../lib/tournament";
import { normalizeDatasetForSave } from "../lib/data-store";

const NOW = "2026-06-30T12:00:00.000Z";

function makeDataset(
  opts?: Readonly<{ withFinal?: boolean; seasonId?: string }>,
): TournamentDataset {
  const games = opts?.withFinal
    ? [
        {
          winnerTeamId: "a",
          mvpPlayerId: "a1",
          statsByPlayer: [
            { playerId: "a1", kills: 5, deaths: 1, assists: 3 },
            { playerId: "b1", kills: 1, deaths: 5, assists: 1 },
          ],
        },
        {
          winnerTeamId: "a",
          mvpPlayerId: "a1",
          statsByPlayer: [
            { playerId: "a1", kills: 6, deaths: 0, assists: 2 },
            { playerId: "b1", kills: 0, deaths: 6, assists: 0 },
          ],
        },
      ]
    : [];

  const seriesMatches = opts?.withFinal
    ? [
        {
          id: "final",
          date: "2026-06-01",
          teamAId: "a",
          teamBId: "b",
          stage: "FINAL" as const,
          format: "BO3" as const,
          games,
        },
      ]
    : [];

  return {
    tournament: {
      name: "Alpha Cup",
      lastUpdatedISO: NOW,
      seriesPointsRule: { win: 3, loss: 0 },
      format: "BO3",
      status: "active",
      ...(opts?.seasonId ? { seasonId: opts.seasonId } : {}),
    },
    teams: [
      { id: "a", name: "Alpha", slug: "alpha" },
      { id: "b", name: "Beta", slug: "beta" },
    ],
    players: [
      { id: "a1", nick: "A1", slug: "a1", teamId: "a", role1: "MID", elo: "OURO" },
      { id: "b1", nick: "B1", slug: "b1", teamId: "b", role1: "MID", elo: "OURO" },
    ],
    seriesMatches,
    standingsSeed: [],
    archivedSeasons: [],
  };
}

describe("buildArchivedSeason", () => {
  it("arquiva um snapshot finished, sem aninhar histórico, com o campeão derivável", () => {
    const archived = buildArchivedSeason(makeDataset({ withFinal: true, seasonId: "s1" }), NOW);

    expect("archivedSeasons" in archived.snapshot).toBe(false);
    expect(archived.snapshot.tournament.status).toBe("finished");
    expect(archived.endedAtISO).toBe(NOW);
    expect(archived.seasonId).toBe("s1");

    const champion = getChampionshipResult(snapshotToDataset(archived.snapshot));
    expect(champion?.championTeamId).toBe("a");
  });

  it("arquiva mesmo sem série FINAL (temporada sem campeão)", () => {
    const archived = buildArchivedSeason(makeDataset({ withFinal: false, seasonId: "s2" }), NOW);
    const champion = getChampionshipResult(snapshotToDataset(archived.snapshot));
    expect(champion).toBeNull();
  });
});

describe("summarizeArchivedSeason", () => {
  it("resume com nome do campeão quando há FINAL concluída", () => {
    const archived = buildArchivedSeason(makeDataset({ withFinal: true, seasonId: "s1" }), NOW);
    const summary = summarizeArchivedSeason(archived);
    expect(summary.championTeamName).toBe("Alpha");
    expect(summary.teamCount).toBe(2);
    expect(summary.seriesCount).toBe(1);
  });

  it("resume sem campeão quando não há FINAL", () => {
    const archived = buildArchivedSeason(makeDataset({ withFinal: false, seasonId: "s2" }), NOW);
    const summary = summarizeArchivedSeason(archived);
    expect(summary.championTeamName).toBeNull();
    expect(summary.seriesCount).toBe(0);
  });
});

describe("buildNextSeasonDataset", () => {
  function datasetWithArchive() {
    const base = makeDataset({ withFinal: true, seasonId: "season-1" });
    const archived = buildArchivedSeason(base, NOW);
    return { ...base, archivedSeasons: [archived] };
  }

  it("limpa séries/standings, mantém teams/players e preserva o histórico", () => {
    const next = buildNextSeasonDataset(datasetWithArchive(), {
      name: "Beta Cup",
      format: "BO5",
      keepTeams: true,
      keepPlayers: true,
      seasonId: "season-2",
      now: NOW,
    });

    expect(next.seriesMatches).toEqual([]);
    expect(next.standingsSeed).toEqual([]);
    expect(next.teams).toHaveLength(2);
    expect(next.players).toHaveLength(2);
    expect(next.tournament.status).toBe("active");
    expect(next.tournament.seasonId).toBe("season-2");
    expect(next.tournament.format).toBe("BO5");
    expect(next.archivedSeasons).toHaveLength(1);
    expect(tournamentDatasetSchema.safeParse(next).success).toBe(true);
  });

  it("keepTeams=false remove times e não deixa jogadores órfãos", () => {
    const next = buildNextSeasonDataset(datasetWithArchive(), {
      name: "Gamma Cup",
      format: "BO3",
      keepTeams: false,
      keepPlayers: true,
      seasonId: "season-3",
      now: NOW,
    });

    expect(next.teams).toEqual([]);
    expect(next.players).toEqual([]);
    expect(tournamentDatasetSchema.safeParse(next).success).toBe(true);
  });
});

describe("normalizeDatasetForSave (backfill de ciclo de vida)", () => {
  it("preenche seasonId/status/startedAtISO ausentes", () => {
    const normalized = normalizeDatasetForSave(makeDataset());
    expect(normalized.tournament.status).toBe("active");
    expect(normalized.tournament.seasonId).toBeTruthy();
    expect(normalized.tournament.startedAtISO).toBeTruthy();
    expect(normalized.tournament.lastUpdatedISO).toBeTruthy();
  });
});
