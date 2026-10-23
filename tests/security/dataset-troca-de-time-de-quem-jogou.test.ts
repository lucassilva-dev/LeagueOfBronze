import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { TournamentDataset } from "@/lib/schema";
import {
  calculateTeamAggregates,
  getSeriesGamesWithTeamRows,
  problemasDeTrocaDeTimeComHistorico,
  substituirDeVez,
} from "@/lib/tournament";

import { cenario, copia, id, jogo, linha, linhasDoTime, validar } from "../torneio/_cenario-regra-6";

/**
 * FB-3 — a outra metade da linha sem «Jogou por».
 *
 * A linha de K/D/A sem `teamId` vale pelo time do JOGADOR. Trocar pelo cadastro o time de quem
 * JÁ jogou movia o passado junto: na série ALFA x BETA a TOP da ALFA fez 9 abates e, levada
 * para a GAMA, a linha sumia da partida, a ALFA caía de 13 para 4 abates e a GAMA, que nem
 * disputou a série, ficava com 9. As linhas não mudavam, então a regra da linha nova não via,
 * e o diff cobrava só `players:write` — número de resultado mudando sem `results:write`.
 *
 * Agora a GRAVAÇÃO recusa a troca, em português, apontando «Substituir de vez» e «Jogou por».
 * Quem nunca jogou troca à vontade, «Substituir de vez» continua passando, e o dataset que já
 * foi gravado com uma sobra assim continua salvando.
 */

const store = vi.hoisted(() => ({
  save: vi.fn(),
  atual: null as unknown,
  identity: { username: "x", isMaster: false, scopes: ["players:write"] as string[], displayName: "X", id: "u" },
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

const alfaTop = id("alfa", "TOP");
const gamaTop = id("gama", "TOP");

/** ALFA x BETA, jogo 1: a TOP da ALFA faz 9 abates; a ALFA soma 13 (9 + 4 x 1). */
function jaJogou(): TournamentDataset {
  const d = cenario();
  d.seriesMatches[0]!.games = [
    jogo("alfa", [
      linha(alfaTop, 9, 0, 0, { champion: "Garen" }),
      ...linhasDoTime("alfa", [1, 1, 1], ["TOP"]),
      ...linhasDoTime("beta", [1, 1, 1]),
    ]),
  ];
  return d;
}

function trocarTime(d: TournamentDataset, playerId: string, teamId: string): TournamentDataset {
  const novo = copia(d);
  const jogador = novo.players.find((p) => p.id === playerId)!;
  jogador.teamId = teamId;
  delete jogador.captain;
  return novo;
}

/** O que o público veria: a linha na partida e os abates de ALFA e GAMA. */
function numeros(d: TournamentDataset) {
  const colunas = getSeriesGamesWithTeamRows(d.seriesMatches[0]!, d)[0]!;
  const agregados = calculateTeamAggregates(d);
  return {
    naPartida: [...colunas.teamARows, ...colunas.teamBRows].some((l) => l.playerId === alfaTop),
    alfa: agregados.find((t) => t.teamId === "alfa")!.kills,
    gama: agregados.find((t) => t.teamId === "gama")!.kills,
  };
}

const erroDe = async (r: Response) => ((await r.json()) as { error?: string }).error ?? "";

beforeEach(() => {
  store.save.mockReset();
  store.save.mockImplementation(async (d: unknown) => d);
  store.identity.scopes = ["players:write"];
  store.atual = jaJogou();
});

describe("PUT /api/admin/dataset — trocar pelo cadastro o time de quem já jogou", () => {
  it("o estrago que a troca fazia: a linha some da partida e os abates vão para a GAMA", () => {
    expect(numeros(jaJogou())).toEqual({ naPartida: true, alfa: 13, gama: 0 });
    const trocado = trocarTime(jaJogou(), alfaTop, "gama");
    // O schema aceita (sobras antigas existem e ele roda em toda leitura) — quem barra é a gravação.
    expect(validar(trocado).success).toBe(true);
    expect(numeros(trocado)).toEqual({ naPartida: false, alfa: 4, gama: 9 });
  });

  it("com só players:write: 400 em português, apontando «Substituir de vez» e «Jogou por» — nada é gravado", async () => {
    const r = await PUT(req({ dataset: trocarTime(jaJogou(), alfaTop, "gama"), versao: 1 }));

    expect(r.status).toBe(400);
    const erro = await erroDe(r);
    expect(erro).toMatch(/^alfaTOP#BR1 tem 1 linha\(s\) de K\/D\/A sem “Jogou por”, que contam pelo time dele \(ALFA\)/);
    expect(erro).toMatch(/levaria esses abates, jogos e MVPs para GAMA/);
    expect(erro).toMatch(/use “Substituir de vez”/);
    expect(erro).toMatch(/marque “Jogou por” na linha desse jogo/);
    expect(store.save).not.toHaveBeenCalled();
  });

  it("nem com todos os escopos: a troca para o ADVERSÁRIO da série também é recusada", async () => {
    // Para a BETA a linha nem some da partida — troca de coluna: a ALFA perde 9 e a BETA ganha 9.
    store.identity.scopes = ["players:write", "results:write", "series:manage"];
    const r = await PUT(req({ dataset: trocarTime(jaJogou(), alfaTop, "beta"), versao: 1 }));

    expect(r.status).toBe(400);
    expect(await erroDe(r)).toMatch(/alfaTOP#BR1 tem 1 linha\(s\) de K\/D\/A sem “Jogou por”/);
    expect(store.save).not.toHaveBeenCalled();
  });

  it("quem saiu de vez e tem K/D/A também não vai para outro elenco pelo cadastro", async () => {
    store.atual = substituirDeVez(jaJogou(), alfaTop, "r1", "2026-11-21T12:00:00.000Z");
    const depois = copia(store.atual as TournamentDataset);
    const saiu = depois.players.find((p) => p.id === alfaTop)!;
    saiu.teamId = "gama";
    delete saiu.saiuEm;
    delete saiu.captain;

    const r = await PUT(req({ dataset: depois, versao: 1 }));

    expect(r.status).toBe(400);
    expect(store.save).not.toHaveBeenCalled();
  });

  it("quem nunca jogou continua trocando de time livremente (players:write basta)", async () => {
    const r = await PUT(req({ dataset: trocarTime(jaJogou(), gamaTop, "alfa"), versao: 1 }));

    expect(r.status).toBe(200);
    expect(store.save).toHaveBeenCalledTimes(1);
  });

  it("quem só jogou como substituto (todas as linhas com «Jogou por») também troca livremente", async () => {
    const d = jaJogou();
    d.seriesMatches[0]!.games[0]!.statsByPlayer[0] = linha(gamaTop, 9, 0, 0, { champion: "Garen", teamId: "alfa" });
    store.atual = d;

    const r = await PUT(req({ dataset: trocarTime(d, gamaTop, "beta"), versao: 1 }));

    expect(r.status).toBe(200);
  });

  it("«Substituir de vez» continua passando com players:write — e as linhas não mudam de lado", async () => {
    const depois = substituirDeVez(jaJogou(), alfaTop, "r1", "2026-11-21T12:00:00.000Z");

    const r = await PUT(req({ dataset: depois, versao: 1 }));

    expect(r.status).toBe(200);
    const gravado = store.save.mock.calls[0]![0] as TournamentDataset;
    expect(numeros(gravado)).toEqual({ naPartida: true, alfa: 13, gama: 0 });
  });

  it("carimbar o time antigo nas linhas no mesmo envio libera a troca — e custa results:write", async () => {
    const depois = trocarTime(jaJogou(), alfaTop, "gama");
    depois.seriesMatches[0]!.games[0]!.statsByPlayer[0]!.teamId = "alfa";

    const semResultados = await PUT(req({ dataset: depois, versao: 1 }));
    expect(semResultados.status).toBe(403);
    expect(store.save).not.toHaveBeenCalled();

    store.identity.scopes = ["players:write", "results:write"];
    const comResultados = await PUT(req({ dataset: depois, versao: 1 }));
    expect(comResultados.status).toBe(200);
    const gravado = store.save.mock.calls[0]![0] as TournamentDataset;
    expect(numeros(gravado)).toEqual({ naPartida: true, alfa: 13, gama: 0 });
  });

  it("o dataset gravado com a sobra (trocou de time depois de jogar) continua salvando outras edições", async () => {
    store.atual = trocarTime(jaJogou(), alfaTop, "gama");
    const depois = copia(store.atual as TournamentDataset);
    depois.players.find((p) => p.id === id("beta", "MID"))!.elo = "Ouro";

    const r = await PUT(req({ dataset: depois, versao: 1 }));

    expect(r.status).toBe(200);
    expect(store.save).toHaveBeenCalledTimes(1);
  });

  it("a função pura: sem gravado (semeadura), nada a recusar", () => {
    expect(problemasDeTrocaDeTimeComHistorico(trocarTime(jaJogou(), alfaTop, "gama"), null)).toEqual([]);
  });
});
