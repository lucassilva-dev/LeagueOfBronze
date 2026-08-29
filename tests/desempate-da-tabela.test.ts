import { describe, expect, it } from "vitest";

import type { SeriesMatch, TournamentDataset } from "../lib/schema";
import { calculateStandings } from "../lib/tournament";

/**
 * A ORDEM DO DESEMPATE, que o site publica em três lugares e nos dois idiomas:
 *
 *   1º confronto direto · 2º saldo de mapas (SG) · 3º sorteio
 *
 * (card da /tabela em `tabelaInfoDesempateTexto`, regra (u) e "pontuação" em
 * lib/i18n/messages/paginas-regras.ts.)
 *
 * O código aplicava o saldo de mapas ANTES do confronto direto — os dois times nem
 * chegavam a formar um grupo empatado — e, com três ou mais empatados, ignorava o
 * confronto direto e ordenava pelo NOME. Numa tabela em que os dois primeiros vão para
 * a final, isso decide vaga pela ordem do alfabeto.
 */

function dataset(): TournamentDataset {
  return {
    tournament: {
      name: "Teste",
      lastUpdatedISO: "2026-02-23T00:00:00.000Z",
      seriesPointsRule: { win: 3, loss: 0 },
      format: "BO3",
      status: "active",
    },
    archivedSeasons: [],
    teams: [
      { id: "a", name: "Alpha", slug: "alpha" },
      { id: "b", name: "Beta", slug: "beta" },
      { id: "c", name: "Charlie", slug: "charlie" },
      { id: "z", name: "Zulu", slug: "zulu" },
    ],
    players: [],
    seriesMatches: [],
    standingsSeed: [],
  };
}

/** Série encerrada com o placar pedido, em jogos sem estatística (não importam aqui). */
function serie(id: string, teamAId: string, teamBId: string, vitoriasA: number, vitoriasB: number): SeriesMatch {
  const games = [
    ...Array.from({ length: vitoriasA }, () => teamAId),
    ...Array.from({ length: vitoriasB }, () => teamBId),
  ].map((winnerTeamId) => ({
    winnerTeamId,
    mvpPlayerId: "",
    durationMin: 30,
    statsByPlayer: [],
  }));

  return { id, date: "2026-02-01", teamAId, teamBId, games };
}

describe("desempate da tabela", () => {
  it("põe o confronto direto ACIMA do saldo de mapas", () => {
    /*
     * ALFA e BETA terminam com os mesmos pontos e as mesmas séries vencidas.
     * BETA venceu ALFA no confronto direto, mas ALFA tem saldo de mapas melhor
     * (por ter goleado um terceiro). Pela regra publicada, BETA vem na frente.
     */
    const d = dataset();
    d.seriesMatches = [
      serie("s1", "a", "c", 2, 0), // ALFA goleia CHARLIE      -> saldo +2
      serie("s2", "a", "z", 2, 0), // ALFA goleia ZULU         -> saldo +2
      serie("s3", "b", "a", 2, 1), // BETA vence ALFA          -> confronto direto de BETA
      serie("s4", "b", "c", 2, 1), // BETA vence CHARLIE       -> saldo +1
      serie("s5", "z", "b", 2, 0), // ZULU goleia BETA         -> saldo -2 para BETA
    ];
    // ALFA: 2 vitórias, 6 pts, saldo +3. BETA: 2 vitórias, 6 pts, saldo 0.
    // Empatados em pontos e vitórias; ALFA com saldo melhor; BETA ganhou o confronto.

    const { rows } = calculateStandings(d);
    const [primeiro, segundo] = rows;

    expect(primeiro.teamId).toBe("b");
    expect(segundo.teamId).toBe("a");
    // A premissa do teste: ALFA REALMENTE tem saldo melhor — sem isso o caso não prova nada.
    expect(rows.find((r) => r.teamId === "a")!.gameDiff).toBeGreaterThan(
      rows.find((r) => r.teamId === "b")!.gameDiff,
    );
  });

  it("resolve empate de TRÊS pelo confronto direto, não pelo alfabeto", () => {
    /*
     * ZULU venceu ALFA e CHARLIE; ALFA venceu CHARLIE. Hierarquia limpa no confronto
     * direto: Z > A > C. Pelo nome, a ordem seria Alpha, Charlie, Zulu.
     *
     * ⚠ O SALDO DOS TRÊS É IGUAL (+2), e isso é o que dá valor ao teste. Numa versão
     * anterior deste caso os saldos eram distintos (+4/+2/0): o código ANTIGO, que
     * colocava `gameDiff` no desempate base, já devolvia ['z','a','c'] por saldo, sem
     * nunca formar grupo empatado — o teste passava verde com o defeito dentro. Com o
     * saldo empatado, o código antigo agrupa os três e cai no alfabeto, e o teste pega.
     */
    const d = dataset();
    d.teams.push({ id: "x", name: "Extra", slug: "extra" });
    d.seriesMatches = [
      serie("s1", "z", "a", 2, 1), // ZULU vence ALFA
      serie("s2", "z", "c", 2, 1), // ZULU vence CHARLIE  -> 2 vitórias no grupo
      serie("s3", "a", "c", 2, 1), // ALFA vence CHARLIE  -> 1 vitória no grupo
      serie("s4", "a", "x", 2, 0), // enchimento: iguala pontos e saldo
      serie("s5", "c", "x", 2, 0),
      serie("s6", "c", "x", 2, 0),
    ];

    const { rows } = calculateStandings(d);
    const trio = rows.filter((r) => ["z", "a", "c"].includes(r.teamId));

    // Premissas — sem elas o caso não prova nada:
    expect(new Set(trio.map((r) => r.points)).size).toBe(1); // empatados em pontos
    expect(new Set(trio.map((r) => r.gameDiff)).size).toBe(1); // E em saldo de mapas

    // Só o confronto direto pode separá-los. Pelo alfabeto seria ['a','c','z'].
    expect(trio.map((r) => r.teamId)).toEqual(["z", "a", "c"]);
  });

  it("mantém uma ordem estável quando nada separa os times", () => {
    // Sem confronto direto e sem saldo diferente, a ordem não pode dançar entre
    // dois carregamentos com os mesmos dados — o "sorteio" a organização faz à mão.
    const d = dataset();
    d.seriesMatches = [serie("s1", "a", "z", 2, 0), serie("s2", "b", "c", 2, 0)];

    const primeira = calculateStandings(d).rows.map((r) => r.teamId);
    const segunda = calculateStandings(d).rows.map((r) => r.teamId);

    expect(primeira).toEqual(segunda);
  });
});

describe("confronto direto com cobertura PARCIAL", () => {
  it("não deixa quem não jogou contra o grupo passar na frente pelo saldo pior", () => {
    /*
     * A, B e C empatam em pontos e séries vencidas. Só A×B aconteceu dentro do grupo;
     * B e C nunca se enfrentaram. Saldo geral: A +3, B +3, C +2.
     *
     * Com a mini-tabela aplicada a um grupo incompleto, C valia 0 (não jogou contra
     * ninguém do grupo) e B valia −1 (o mapa perdido para A) — então C subia para 2º com
     * o saldo PIOR, trocando o finalista. Sem confronto completo, quem decide é o saldo.
     */
    const d = dataset();
    d.teams.push({ id: "x", name: "Xis", slug: "xis" }, { id: "y", name: "Ipsilon", slug: "y" });
    d.seriesMatches = [
      serie("s1", "a", "b", 2, 1), // único confronto DENTRO do grupo
      serie("s2", "a", "x", 2, 0),
      serie("s3", "b", "x", 2, 0),
      serie("s4", "b", "y", 2, 0),
      serie("s5", "c", "x", 2, 1),
      serie("s6", "c", "y", 2, 1),
    ];

    const { rows } = calculateStandings(d);
    const trio = rows.filter((r) => ["a", "b", "c"].includes(r.teamId));

    // Premissas: empatados em pontos, e o saldo de B é REALMENTE melhor que o de C.
    expect(new Set(trio.map((r) => r.points)).size).toBe(1);
    expect(trio.find((r) => r.teamId === "b")!.gameDiff).toBeGreaterThan(
      trio.find((r) => r.teamId === "c")!.gameDiff,
    );

    expect(trio.map((r) => r.teamId)).toEqual(["a", "b", "c"]);
  });
});

describe("o alfabeto é o ÚLTIMO recurso, não um critério", () => {
  it("mesmo saldo mas campanhas diferentes: decide quem ganhou mais mapas", () => {
    /*
     * Se a ordem alfabética está separando dois times que JOGARAM, está errado — falta
     * critério objetivo antes dela.
     *
     * ZULU e ALFA terminam idênticos em pontos (6), séries vencidas (2) e saldo (+1), mas
     * com campanhas diferentes: ZULU fez 5 mapas e sofreu 4; ALFA fez 4 e sofreu 3. Quem
     * venceu mais mapas fica na frente.
     *
     * O caso foi montado com ZULU ganhando de propósito: pelo alfabeto Alpha viria antes,
     * então se o critério de mapas ganhos sumir, o teste cai.
     */
    const d = dataset();
    d.teams.push({ id: "x", name: "Xis", slug: "xis" }, { id: "y", name: "Ipsilon", slug: "y" });
    d.seriesMatches = [
      serie("s1", "z", "x", 2, 1), // ZULU vence
      serie("s2", "z", "y", 2, 1), // ZULU vence   -> 5 mapas feitos, 4 sofridos
      serie("s3", "b", "z", 2, 1), // ZULU perde
      serie("s4", "a", "c", 2, 0), // ALFA vence
      serie("s5", "a", "x", 2, 1), // ALFA vence   -> 4 mapas feitos, 3 sofridos
      serie("s6", "b", "a", 2, 0), // ALFA perde
    ];

    const { rows } = calculateStandings(d);
    const z = rows.find((r) => r.teamId === "z")!;
    const a = rows.find((r) => r.teamId === "a")!;

    // Premissas: idênticos em tudo o que vem antes de "mapas ganhos".
    expect(z.points).toBe(a.points);
    expect(z.seriesWon).toBe(a.seriesWon);
    expect(z.gameDiff).toBe(a.gameDiff);
    // E ZULU realmente ganhou mais mapas — é isso que tem de decidir.
    expect(z.gamesWon).toBeGreaterThan(a.gamesWon);

    // Zulu na frente de Alpha: o alfabeto NÃO decidiu.
    expect(z.position).toBeLessThan(a.position);
  });

  it("campanha toda zerada: aí sim vale a ordem alfabética", () => {
    // Começo de temporada, ninguém jogou: não há nada a comparar, e uma ordem estável
    // por nome é o comportamento certo (o desempate de verdade é o sorteio da organização).
    const d = dataset();
    d.seriesMatches = [];

    const { rows } = calculateStandings(d);

    expect(rows.every((r) => r.points === 0 && r.gamesWon === 0 && r.gamesLost === 0)).toBe(true);
    expect(rows.map((r) => r.teamName)).toEqual(
      [...rows.map((r) => r.teamName)].sort((p, q) => p.localeCompare(q, "pt-BR")),
    );
  });
});
