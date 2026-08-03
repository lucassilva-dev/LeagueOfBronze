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

  it("editar o invólucro de uma série (data) exige series:manage", () => {
    const comData = clone(base);
    comData.seriesMatches[0].date = "2026-12-31T20:00";
    expect(escoposDe(base, comData)).toEqual(["series:manage"]);
  });

  it("criar uma série VAZIA (só o invólucro, sem resultado) exige só series:manage", () => {
    const vazia = clone({ ...base, seriesMatches: [base.seriesMatches[0]] }).seriesMatches[0];
    vazia.id = "fixture-vazia-teste";
    vazia.games = [];
    vazia.cardsUsed = [];
    delete vazia.blueSideTeamId;
    delete vazia.walkoverWinnerTeamId;
    delete vazia.walkoverReason;

    const comFixtureNova = clone(base);
    comFixtureNova.seriesMatches.push(vazia);
    expect(escoposDe(base, comFixtureNova)).toEqual(["series:manage"]);
  });

  // Regressão da escalação achada no pentest: o ramo de "add"/"remove" do diff colapsava
  // TODA série nova/removida em series:manage, deixando um admin sem results:write injetar
  // ou apagar resultado só criando/removendo a série inteira em vez de editá-la no lugar.
  it("criar uma série NOVA já com resultado/carta/lado exige os escopos granulares", () => {
    const comJogos = base.seriesMatches.find((s) => s.games.length > 0)!;
    const forjada = clone({ ...base, seriesMatches: [comJogos] }).seriesMatches[0];
    forjada.id = "serie-forjada-001";
    forjada.cardsUsed = [{ teamId: forjada.teamAId, cardId: "TUDO_LIBERADO" }];
    forjada.blueSideTeamId = forjada.teamBId;

    const depois = clone(base);
    depois.seriesMatches.push(forjada);

    const escopos = escoposDe(base, depois);
    expect(escopos).toEqual(
      expect.arrayContaining(["series:manage", "results:write", "series:cards", "series:sides"]),
    );
    // um admin com SÓ series:manage é negado — o buraco original
    expect(authorizeDatasetChange(usuario(["series:manage"]), base, depois).ok).toBe(false);
  });

  it("remover uma série QUE TEM resultado exige results:write além de series:manage", () => {
    const depois = clone(base);
    const idx = depois.seriesMatches.findIndex((s) => s.games.length > 0);
    depois.seriesMatches.splice(idx, 1);

    const escopos = escoposDe(base, depois);
    expect(escopos).toContain("series:manage");
    expect(escopos).toContain("results:write");
    expect(authorizeDatasetChange(usuario(["series:manage"]), base, depois).ok).toBe(false);
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

  it("escopo masterOnly na lista de um não-master não vale (defesa em profundidade)", () => {
    // Simula um escopo masterOnly que jamais deveria ter sido atribuído chegando à lista
    // (por seed/migração/edição direta no banco). hasScope tem de ignorá-lo.
    const depois = clone(base);
    depois.tournament.name = "Sequestrado"; // exige tournament:lifecycle (masterOnly)
    const naoMaster = usuario(["tournament:lifecycle"]);
    expect(authorizeDatasetChange(naoMaster, base, depois).ok).toBe(false);
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
