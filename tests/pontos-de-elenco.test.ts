import { describe, expect, it } from "vitest";

import { buildDesignTeams } from "@/lib/roster";
import { teamSchema, tournamentDatasetSchema, type TournamentDataset } from "@/lib/schema";

/*
 * 26/10/2026: a organização pediu que o time dela (fora do draft da 4ª) mostre 30 "PTS DE
 * ELENCO", como os times do draft. O site somava os elos do elenco (Mestre 10, Diamante 8…) e
 * mostrava 33. `pontosDeElenco` no time é o valor definido; sem ele, a soma de sempre.
 */
function dataset(pontosDeElenco?: number): TournamentDataset {
  return tournamentDatasetSchema.parse({
    tournament: { name: "4ª Edição", lastUpdatedISO: "2026-10-26T00:00:00.000Z", seriesPointsRule: { win: 3, loss: 0 }, format: "BO3" },
    teams: [{ id: "chama", name: "DESORGANIZAÇÃO", slug: "desorganizacao", ...(pontosDeElenco !== undefined ? { pontosDeElenco } : {}) }],
    players: [
      { id: "a", nick: "A#1", slug: "a", teamId: "chama", role1: "TOP", elo: "Platina" },
      { id: "b", nick: "B#1", slug: "b", teamId: "chama", role1: "JUNG", elo: "Mestre" },
      { id: "c", nick: "C#1", slug: "c", teamId: "chama", role1: "MID", elo: "Diamante" },
      { id: "d", nick: "D#1", slug: "d", teamId: "chama", role1: "ADC", elo: "Esmeralda" },
      { id: "e", nick: "E#1", slug: "e", teamId: "chama", role1: "SUP", elo: "Ouro" },
    ],
    seriesMatches: [],
    standingsSeed: [],
  });
}

describe("pontos de elenco definidos pela organização", () => {
  it("sem o campo, é a soma dos elos (5 + 10 + 8 + 6 + 4 = 33)", () => {
    expect(buildDesignTeams(dataset())[0]!.total).toBe(33);
  });

  it("com o campo, é o valor definido — e ele sobrevive à validação do dataset", () => {
    const ds = dataset(30);
    expect(ds.teams[0]!.pontosDeElenco).toBe(30);
    expect(buildDesignTeams(ds)[0]!.total).toBe(30);
  });

  it("só inteiro de 0 a 999", () => {
    expect(teamSchema.safeParse({ id: "x", name: "X", slug: "x", pontosDeElenco: 30.5 }).success).toBe(false);
    expect(teamSchema.safeParse({ id: "x", name: "X", slug: "x", pontosDeElenco: -1 }).success).toBe(false);
  });
});
