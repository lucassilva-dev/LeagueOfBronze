import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { TournamentDataset } from "@/lib/schema";
import { calculateTeamAggregates, getSeriesGamesWithTeamRows } from "@/lib/tournament";

import { cenario, copia, id, jogo, linha, linhasDoTime, validar } from "../torneio/_cenario-regra-6";

/**
 * Regra 6 — o substituto avulso mais comum na 4ª é o TITULAR DE OUTRO TIME cobrindo uma vaga
 * (a TOP da GAMA no lugar da TOP da ALFA, em ALFA x BETA). Se a linha dele chega sem
 * "Jogou por" (`teamId` na linha), ela some das duas colunas da partida e os abates e o jogo
 * vão para a GAMA, que nem disputou a série.
 *
 * O schema continua aceitando essa linha de propósito — o dado real tem sobras assim (quem
 * trocou de time depois de jogar) e ele roda em toda leitura. Quem recusa é a GRAVAÇÃO, e só
 * a linha que o envio ACRESCENTA ou MUDA em relação ao gravado.
 */

const store = vi.hoisted(() => ({
  save: vi.fn(),
  atual: null as unknown,
  identity: { username: "x", isMaster: false, scopes: ["results:write"] as string[], displayName: "X", id: "u" },
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

const gamaTop = id("gama", "TOP");

/** ALFA x BETA, jogo 1: a TOP da GAMA no lugar da TOP da ALFA — com ou sem "Jogou por". */
function comSubstituto(extra: { teamId?: string } = {}): TournamentDataset {
  const d = cenario();
  d.seriesMatches[0]!.games = [
    jogo("alfa", [
      linha(gamaTop, 9, 0, 0, { champion: "Garen", ...extra }),
      ...linhasDoTime("alfa", [1, 1, 1], ["TOP"]),
      ...linhasDoTime("beta", [1, 1, 1]),
    ]),
  ];
  return d;
}

const erroDe = async (r: Response) => ((await r.json()) as { error?: string }).error ?? "";

beforeEach(() => {
  store.save.mockReset();
  store.save.mockImplementation(async (d: unknown) => d);
  store.atual = cenario();
});

describe("PUT /api/admin/dataset — titular de outro time sem «Jogou por»", () => {
  it("o schema sozinho aceita (por causa das sobras antigas) — e os números públicos sairiam errados", () => {
    const d = comSubstituto();
    expect(validar(d).success).toBe(true);
    const colunas = getSeriesGamesWithTeamRows(d.seriesMatches[0]!, d)[0]!;
    expect([...colunas.teamARows, ...colunas.teamBRows].map((l) => l.playerId)).not.toContain(gamaTop);
    expect(calculateTeamAggregates(d).find((t) => t.teamId === "gama")!.kills).toBe(9);
  });

  it("linha NOVA sem «Jogou por»: 400 em português, citando jogo, série e nick — nada é gravado", async () => {
    const r = await PUT(req({ dataset: comSubstituto(), versao: 1 }));

    expect(r.status).toBe(400);
    const erro = await erroDe(r);
    expect(erro).toMatch(/^Jogo 1 da série s1 \(ALFA x BETA\): gamaTOP#BR1 é de GAMA, que não disputa a série/);
    expect(erro).toMatch(/marque em “Jogou por” o time que ele cobriu \(ALFA ou BETA\)/);
    expect(store.save).not.toHaveBeenCalled();
  });

  it("a mesma linha com «Jogou por» passa — e a partida e os números saem certos", async () => {
    const r = await PUT(req({ dataset: comSubstituto({ teamId: "alfa" }), versao: 1 }));

    expect(r.status).toBe(200);
    const gravado = store.save.mock.calls[0]![0] as TournamentDataset;
    const colunas = getSeriesGamesWithTeamRows(gravado.seriesMatches[0]!, gravado)[0]!;
    expect(colunas.teamARows.map((l) => l.playerId)).toContain(gamaTop);
    expect(calculateTeamAggregates(gravado).find((t) => t.teamId === "gama")!.kills).toBe(0);
  });

  it("a sobra antiga intocada continua passando quando o envio mexe em outra coisa", async () => {
    // Gravada assim no passado (quem trocou de time depois de jogar): a leitura aceita.
    store.atual = comSubstituto();
    const depois = copia(comSubstituto());
    depois.seriesMatches[0]!.games[0]!.statsByPlayer.find((l) => l.playerId === id("alfa", "MID"))!.kills = 4;

    const r = await PUT(req({ dataset: depois, versao: 1 }));

    expect(r.status).toBe(200);
    expect(store.save).toHaveBeenCalledTimes(1);
  });

  it("a sobra antiga continua passando quando um jogo antes dela é apagado (vale qualquer jogo da série)", async () => {
    const normal = jogo("beta", [...linhasDoTime("alfa", [1, 2, 1]), ...linhasDoTime("beta", [2, 1, 2])]);
    const antes = comSubstituto();
    antes.seriesMatches[0]!.games.unshift(normal);
    store.atual = antes;
    const depois = copia(antes);
    depois.seriesMatches[0]!.games.shift();

    const r = await PUT(req({ dataset: depois, versao: 1 }));

    expect(r.status).toBe(200);
  });

  it("MUDAR a linha da sobra (o K/D/A dela) já pede o «Jogou por»", async () => {
    store.atual = comSubstituto();
    const depois = copia(comSubstituto());
    depois.seriesMatches[0]!.games[0]!.statsByPlayer.find((l) => l.playerId === gamaTop)!.kills = 10;

    const r = await PUT(req({ dataset: depois, versao: 1 }));

    expect(r.status).toBe(400);
    expect(await erroDe(r)).toMatch(/gamaTOP#BR1 é de GAMA, que não disputa a série/);
    expect(store.save).not.toHaveBeenCalled();
  });

  it("quem joga pelo próprio time continua sem «Jogou por», como sempre foi", async () => {
    const d = cenario();
    d.seriesMatches[0]!.games = [jogo("alfa", [...linhasDoTime("alfa", [2, 1, 2]), ...linhasDoTime("beta", [1, 2, 1])])];

    const r = await PUT(req({ dataset: d, versao: 1 }));

    expect(r.status).toBe(200);
  });
});
