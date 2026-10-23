import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { diffDatasetForScopes } from "@/lib/security/dataset-diff";
import type { TournamentDataset } from "@/lib/schema";
import { substituirDeVez } from "@/lib/tournament";

import { cenario, copia, id, jogo, linha, linhasDoTime } from "../torneio/_cenario-regra-6";

/**
 * Autorização por diff dos campos novos de 22/10/2026 (regra 6 e W.O. no meio da série).
 *
 *   - `teamId` na LINHA de K/D/A (substituto avulso) é resultado: `results:write`;
 *   - `reserva` e `saiuEm` no JOGADOR são cadastro: `players:write` — também quando o
 *     jogador inteiro é criado ou removido (add/remove decompõem campo a campo);
 *   - "Substituir de vez" mexe só em jogadores e NÃO pode cobrar `results:write`: o
 *     passado não muda (as linhas avulsas do reserva carregam o próprio time).
 */

const escoposDe = (a: TournamentDataset, b: TournamentDataset) =>
  [...new Set(diffDatasetForScopes(a, b).map((c) => c.scope))].sort();

/** s1 com o reserva jogando pela ALFA no lugar da MID. */
function comAvulso(): TournamentDataset {
  const dataset = cenario();
  dataset.seriesMatches[0]!.games = [
    jogo("alfa", [
      ...linhasDoTime("alfa", [2, 2, 2], ["MID"]),
      linha("r1", 5, 1, 1, { teamId: "alfa" }),
      ...linhasDoTime("beta", [1, 2, 1]),
    ]),
  ];
  return dataset;
}

describe("diff → escopos dos campos novos", () => {
  it("trocar o time da LINHA (substituto avulso) exige results:write — e só isso", () => {
    const antes = comAvulso();
    const depois = copia(antes);
    depois.seriesMatches[0]!.games[0]!.statsByPlayer.find((l) => l.playerId === id("alfa", "TOP"))!.teamId = "alfa";
    expect(escoposDe(antes, depois)).toEqual(["results:write"]);
  });

  it("marcar saída de vez exige players:write", () => {
    const antes = cenario();
    const depois = copia(antes);
    depois.players[0]!.saiuEm = "2026-11-23T12:00:00.000Z";
    expect(escoposDe(antes, depois)).toEqual(["players:write"]);
  });

  it("marcar/desmarcar reserva exige players:write", () => {
    const antes = cenario();
    const depois = copia(antes);
    const r1 = depois.players.find((p) => p.id === "r1")!;
    delete r1.reserva;
    r1.teamId = "gama";
    expect(escoposDe(antes, depois)).toEqual(["players:write"]);
  });

  it("criar ou remover um reserva exige players:write (add/remove decompostos)", () => {
    const antes = cenario();
    const semReserva = copia(antes);
    semReserva.players = semReserva.players.filter((p) => p.id !== "r1");

    expect(escoposDe(semReserva, antes)).toEqual(["players:write"]);
    expect(escoposDe(antes, semReserva)).toEqual(["players:write"]);
    expect(diffDatasetForScopes(semReserva, antes)).toEqual([
      { scope: "players:write", path: "players[r1]", kind: "add" },
    ]);
  });

  it("'Substituir de vez' exige players:write e NÃO results:write", () => {
    const antes = comAvulso();
    const depois = substituirDeVez(antes, id("alfa", "MID"), "r1", "2026-11-23T12:00:00.000Z");
    expect(escoposDe(antes, depois)).toEqual(["players:write"]);
  });

  it("aplicar W.O. numa série com jogo lançado exige results:write", () => {
    const antes = comAvulso();
    const depois = copia(antes);
    depois.seriesMatches[0]!.walkoverWinnerTeamId = "beta";
    expect(escoposDe(antes, depois)).toEqual(["results:write"]);
  });
});

// ------------------------------------------------------------------
// Na rota: o campo novo chega ao banco, e a permissão é cobrada.
// ------------------------------------------------------------------

const store = vi.hoisted(() => ({
  save: vi.fn(),
  atual: null as unknown,
  identity: { username: "x", isMaster: false, scopes: [] as string[], displayName: "X", id: "u" },
}));

vi.mock("@/lib/data-store", () => ({
  readDatasetComVersao: async () => ({ dataset: JSON.parse(JSON.stringify(store.atual)), versao: 1 }),
  saveDatasetComVersao: async (input: unknown) => ({ dataset: await store.save(input), versao: 2 }),
  ConflitoDeVersaoError: class extends Error {},
  DatasetMissingError: class extends Error {},
}));

vi.mock("@/lib/security/route-guard", () => ({
  mesmaOrigem: () => true,
  requireAdmin: async () => ({ ok: true, identity: store.identity }),
}));

const { PUT } = await import("@/app/api/admin/dataset/route");

function req(corpo: unknown): NextRequest {
  const texto = JSON.stringify(corpo);
  return {
    method: "PUT",
    headers: new Headers({ "content-length": String(texto.length) }),
    json: async () => JSON.parse(texto),
  } as unknown as NextRequest;
}

beforeEach(() => {
  store.save.mockReset();
  store.save.mockImplementation(async (d: unknown) => d);
  store.atual = comAvulso();
});

describe("PUT /api/admin/dataset com os campos novos", () => {
  it("quem tem players:write grava a saída de vez — e o saiuEm chega ao banco", async () => {
    store.identity.scopes = ["players:write"];
    const depois = substituirDeVez(comAvulso(), id("alfa", "MID"), "r1", "2026-11-23T12:00:00.000Z");

    const r = await PUT(req({ dataset: depois, versao: 1 }));

    expect(r.status).toBe(200);
    expect(store.save).toHaveBeenCalledTimes(1);
    const gravado = store.save.mock.calls[0]![0] as TournamentDataset;
    expect(gravado.players.find((p) => p.id === id("alfa", "MID"))!.saiuEm).toBe("2026-11-23T12:00:00.000Z");
    expect(gravado.players.find((p) => p.id === "r1")).toMatchObject({ teamId: "alfa" });
  });

  it("quem só lança resultado leva 403 ao mexer no cadastro do reserva", async () => {
    store.identity.scopes = ["results:write"];
    const depois = copia(comAvulso());
    depois.players.find((p) => p.id === id("alfa", "MID"))!.saiuEm = "2026-11-23T12:00:00.000Z";

    const r = await PUT(req({ dataset: depois, versao: 1 }));

    expect(r.status).toBe(403);
    expect(store.save).not.toHaveBeenCalled();
  });

  it("W.O. no meio da série passa pela rota com o jogo lançado preservado", async () => {
    store.identity.scopes = ["results:write"];
    const depois = copia(comAvulso());
    depois.seriesMatches[0]!.walkoverWinnerTeamId = "beta";

    const r = await PUT(req({ dataset: depois, versao: 1 }));

    expect(r.status).toBe(200);
    const gravado = store.save.mock.calls[0]![0] as TournamentDataset;
    expect(gravado.seriesMatches[0]).toMatchObject({ walkoverWinnerTeamId: "beta" });
    expect(gravado.seriesMatches[0]!.games).toHaveLength(1);
  });
});
