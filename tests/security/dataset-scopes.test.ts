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

/**
 * Campos que não guardam o resultado, mas decidem se um resultado JÁ REGISTRADO conta.
 *
 * `stage` tira a série da fase regular; `format` muda quantas vitórias fecham a série (um
 * 2-0 vira "sem vencedor" ao virar MD5); `teamAId`/`teamBId` reatribuem a campanha. Numa
 * série que já tem resultado, mexer neles some com o resultado da tabela pública — o mesmo
 * efeito de apagar a série, que exige `results:write`.
 *
 * Os testes vêm em PAR de propósito. Só o caso negativo (série com resultado) passaria
 * verde mesmo com o defeito de volta se alguém escrevesse o positivo errado; e só o
 * positivo (série vazia) não prova nada. É preciso provar que o escopo muda COM o conteúdo.
 */
describe("campos de série que decidem o resultado", () => {
  const comResultado = () => base.seriesMatches.find((s) => s.games.length > 0)!;

  /*
   * A série vazia é CONSTRUÍDA, não procurada.
   *
   * `leagueofbronze.json` não tem nenhuma série sem jogos, então a versão anterior deste
   * helper devolvia `undefined` e os dois testes do caso positivo saíam por um `return`
   * silencioso: vitest os contava como verdes sem ter asserido nada. Metade do par que
   * existe justamente para provar que o escopo muda COM o conteúdo não provava nada.
   */
  const ID_VAZIA = "serie-vazia-de-teste";
  const comSerieVazia = () => {
    const copia = clone(base);
    const modelo = comResultado();
    copia.seriesMatches.push({
      ...clone(base).seriesMatches.find((s) => s.id === modelo.id)!,
      id: ID_VAZIA,
      games: [],
      stage: "REGULAR_SEASON",
      format: "BO3",
    });
    delete copia.seriesMatches.find((s) => s.id === ID_VAZIA)!.walkoverWinnerTeamId;
    delete copia.seriesMatches.find((s) => s.id === ID_VAZIA)!.sorteios;
    return copia;
  };

  const trocar = (id: string, campo: string, valor: unknown) => {
    const depois = clone(base);
    const alvo = depois.seriesMatches.find((s) => s.id === id)!;
    (alvo as unknown as Record<string, unknown>)[campo] = valor;
    return depois;
  };

  for (const [campo, valor] of [
    ["stage", "FINAL"],
    ["format", "BO5"],
  ] as const) {
    it(`mudar ${campo} numa série COM resultado exige results:write`, () => {
      const serie = comResultado();
      const depois = trocar(serie.id, campo, valor);

      expect(escoposDe(base, depois)).toContain("results:write");
      expect(authorizeDatasetChange(usuario(["series:manage"]), base, depois).ok).toBe(false);
    });

    it(`mudar ${campo} numa série VAZIA continua sendo series:manage`, () => {
      // A série vazia entra no "antes" E no "depois": o que se mede é só a troca do campo.
      const antes = comSerieVazia();
      const depois = clone(antes);
      const alvo = depois.seriesMatches.find((s) => s.id === ID_VAZIA)!;
      (alvo as unknown as Record<string, unknown>)[campo] = valor;

      expect(escoposDe(antes, depois)).toEqual(["series:manage"]);
      expect(authorizeDatasetChange(usuario(["series:manage"]), antes, depois).ok).toBe(true);
    });
  }

  it("trocar um dos times de uma série COM resultado exige results:write", () => {
    const serie = comResultado();
    const outro = base.teams.find((t) => t.id !== serie.teamAId && t.id !== serie.teamBId)!;
    const depois = trocar(serie.id, "teamAId", outro.id);

    expect(escoposDe(base, depois)).toContain("results:write");
    expect(authorizeDatasetChange(usuario(["series:manage"]), base, depois).ok).toBe(false);
  });

  it("esvaziar os jogos E trocar o stage no MESMO envio não escapa", () => {
    /*
     * O predicado olha os DOIS lados: o lado anterior tinha resultado, então o `stage`
     * continua exigindo `results:write` mesmo com o lado novo já vazio.
     *
     * A asserção é sobre a MUDANÇA DE `stage` especificamente, e não sobre o `ok` geral:
     * esvaziar `games` já exige `results:write` por si só, então um
     * `expect(...ok).toBe(false)` passaria verde mesmo com esta correção inteira
     * desligada — mediria o campo errado.
     */
    const serie = comResultado();
    const depois = clone(base);
    const alvo = depois.seriesMatches.find((s) => s.id === serie.id)!;
    alvo.games = [];
    alvo.stage = "FINAL";

    const doStage = diffDatasetForScopes(base, depois).find((m) => m.path.endsWith(".stage"));

    expect(doStage).toBeDefined();
    expect(doStage!.scope).toBe("results:write");
    expect(authorizeDatasetChange(usuario(["series:manage"]), base, depois).ok).toBe(false);
  });

  it("quem tem results:write junto continua conseguindo", () => {
    const serie = comResultado();
    const depois = trocar(serie.id, "stage", "FINAL");

    expect(
      authorizeDatasetChange(usuario(["series:manage", "results:write"]), base, depois).ok,
    ).toBe(true);
  });
});
