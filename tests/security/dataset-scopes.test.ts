import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import type { AdminIdentity } from "@/lib/admin-auth";
import { authorizeDatasetChange, diffDatasetForScopes } from "@/lib/security/dataset-diff";
import { tournamentDatasetSchema, type TournamentDataset } from "@/lib/schema";

const base: TournamentDataset = tournamentDatasetSchema.parse(
  JSON.parse(readFileSync("leagueofbronze.json", "utf8")),
);

const clone = (d: TournamentDataset): TournamentDataset => JSON.parse(JSON.stringify(d));

function usuario(scopes: string[], isMaster = false): AdminIdentity {
  return {
    id: "u1",
    username: "teste",
    displayName: "Teste",
    isMaster,
    scopes,
    mustChangePassword: false,
    legacy: false,
  };
}

const escoposDe = (a: TournamentDataset, b: TournamentDataset) =>
  [...new Set(diffDatasetForScopes(a, b).map((c) => c.scope))].sort();

describe("diferença do dataset → escopos exigidos", () => {
  it("dataset idêntico não exige nada", () => {
    expect(diffDatasetForScopes(base, clone(base))).toHaveLength(0);
  });

  it("IGNORA lastUpdatedISO (é o servidor que reescreve)", () => {
    const depois = clone(base);
    depois.tournament.lastUpdatedISO = new Date().toISOString();
    expect(diffDatasetForScopes(base, depois)).toHaveLength(0);
  });

  it("alterar time exige teams:write", () => {
    const depois = clone(base);
    depois.teams[0].name = "Nome Novo";
    expect(escoposDe(base, depois)).toEqual(["teams:write"]);
  });

  it("alterar jogador exige players:write", () => {
    const depois = clone(base);
    depois.players[0].nick = "OutroNick#123";
    expect(escoposDe(base, depois)).toEqual(["players:write"]);
  });

  it("alterar resultado de jogo exige results:write", () => {
    const depois = clone(base);
    const serie = depois.seriesMatches.find((s) => s.games.length > 0)!;
    serie.games[0].statsByPlayer[0].kills += 1;
    expect(escoposDe(base, depois)).toEqual(["results:write"]);
  });

  it("alterar cartinha exige series:cards (e NÃO results:write)", () => {
    const depois = clone(base);
    const serie = depois.seriesMatches[0];
    serie.cardsUsed = [{ teamId: serie.teamAId, cardId: "TUDO_LIBERADO" }];
    expect(escoposDe(base, depois)).toEqual(["series:cards"]);
  });

  it("alterar lado azul exige series:sides", () => {
    const depois = clone(base);
    depois.seriesMatches[0].blueSideTeamId = depois.seriesMatches[0].teamBId;
    expect(escoposDe(base, depois)).toEqual(["series:sides"]);
  });

  it("criar ou remover série exige series:manage", () => {
    const removida = clone(base);
    removida.seriesMatches.pop();
    expect(escoposDe(base, removida)).toEqual(["series:manage"]);

    const comData = clone(base);
    comData.seriesMatches[0].date = "2026-12-31T20:00";
    expect(escoposDe(base, comData)).toEqual(["series:manage"]);
  });

  it("alterar W.O. exige results:write", () => {
    const depois = clone(base);
    depois.seriesMatches[0].walkoverReason = "motivo diferente";
    expect(escoposDe(base, depois)).toEqual(["results:write"]);
  });

  it("mexer no torneio exige tournament:lifecycle", () => {
    const depois = clone(base);
    depois.tournament.name = "Outro Campeonato";
    expect(escoposDe(base, depois)).toEqual(["tournament:lifecycle"]);
  });

  it("acumula escopos quando várias seções mudam", () => {
    const depois = clone(base);
    depois.teams[0].name = "X";
    depois.players[0].nick = "Y#1";
    const serie = depois.seriesMatches.find((s) => s.games.length > 0)!;
    serie.games[0].statsByPlayer[0].deaths += 1;
    expect(escoposDe(base, depois)).toEqual(["players:write", "results:write", "teams:write"]);
  });
});

describe("autorização por permissão", () => {
  it("nega quem não tem o escopo e diz qual falta", () => {
    const depois = clone(base);
    const serie = depois.seriesMatches.find((s) => s.games.length > 0)!;
    serie.games[0].statsByPlayer[0].kills += 5;

    const veredito = authorizeDatasetChange(usuario(["series:cards", "series:sides"]), base, depois);
    expect(veredito.ok).toBe(false);
    if (!veredito.ok) expect(veredito.missing).toEqual(["results:write"]);
  });

  it("permite quem tem exatamente o escopo necessário", () => {
    const depois = clone(base);
    depois.seriesMatches[0].blueSideTeamId = depois.seriesMatches[0].teamBId;
    expect(authorizeDatasetChange(usuario(["series:sides"]), base, depois).ok).toBe(true);
  });

  it("o master passa em tudo, mesmo com lista de escopos vazia", () => {
    const depois = clone(base);
    depois.teams[0].name = "Z";
    depois.tournament.name = "W";
    expect(authorizeDatasetChange(usuario([], true), base, depois).ok).toBe(true);
  });

  it("usuário sem sessão é negado", () => {
    const depois = clone(base);
    depois.teams[0].name = "Q";
    expect(authorizeDatasetChange(null, base, depois).ok).toBe(false);
  });

  it("quem só sorteia carta NÃO consegue mexer em time nem em jogador", () => {
    const soCartas = usuario(["series:cards"]);

    const mexeTime = clone(base);
    mexeTime.teams[0].name = "Hackeado";
    expect(authorizeDatasetChange(soCartas, base, mexeTime).ok).toBe(false);

    const mexeJogador = clone(base);
    mexeJogador.players[0].elo = "DESAFIANTE";
    expect(authorizeDatasetChange(soCartas, base, mexeJogador).ok).toBe(false);
  });
});
