import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { tournamentDatasetSchema, type SeriesMatch, type TournamentDataset } from "../lib/schema";
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

/*
 * O DESEMPATE TEM DE SER TRANSITIVO.
 *
 * O comparador antigo, quando faltava um confronto dentro do grupo empatado, decidia os
 * pares que se enfrentaram pelo confronto direto e os que NÃO se enfrentaram pelo saldo
 * geral. Isso forma ciclo — A > B no confronto, B > C no saldo, C > A no confronto — e um
 * sort com comparador em ciclo devolve uma ordem que depende da ordem de entrada, que aqui
 * é a ordem dos NOMES. Trocar só o nome dos times mudava quem terminava em 1º.
 *
 * Por isso os casos abaixo rodam com TODAS as permutações de nome entre os empatados: a
 * classificação certa não pode depender de como os times se chamam.
 */

/** Todas as permutações de uma lista (para 3 nomes, 6 ordens). */
function permutacoes<T>(lista: readonly T[]): T[][] {
  if (lista.length <= 1) return [[...lista]];
  return lista.flatMap((item, i) =>
    permutacoes([...lista.slice(0, i), ...lista.slice(i + 1)]).map((resto) => [item, ...resto]),
  );
}

/** Dataset com os NOMES dados por id — os ids (e os resultados) não mudam. */
function datasetComNomes(nomes: Record<string, string>, seriesMatches: SeriesMatch[]): TournamentDataset {
  const d = dataset();
  d.teams = Object.entries(nomes).map(([id, name]) => ({ id, name, slug: id }));
  d.seriesMatches = seriesMatches;
  return d;
}

/** Série marcada que não tem resultado (ainda não jogada, W.O. duplo, jogo não lançado). */
function semResultado(id: string, teamAId: string, teamBId: string): SeriesMatch {
  return { id, date: "2026-02-01", teamAId, teamBId, games: [] };
}

describe("desempate transitivo: a ordem não depende do NOME dos times", () => {
  /*
   * Turno único de 6 times (15 séries) com B x C SEM resultado.
   *
   *   A venceu B por 2-1 · C venceu A por 2-1 · B x C não tem resultado
   *   A, B e C terminam com 9 pts; saldo geral A +2, B +5, C +2.
   *
   * No comparador antigo: A > B (confronto), B > C (saldo, porque não se enfrentaram) e
   * C > A (confronto) — ciclo. O 1º lugar saía A, B ou C conforme os nomes.
   *
   * O certo, pelo confronto só entre os empatados: A 1 vitória, C 1 vitória, B 0. Entre A
   * e C, que continuam empatados, a mini-tabela é refeita só entre os dois — e C venceu A.
   * Ordem: C, A, B.
   */
  const series = [
    serie("s01", "a", "b", 2, 1),
    serie("s02", "c", "a", 2, 1),
    serie("s03", "d", "a", 2, 0),
    serie("s04", "a", "e", 2, 0),
    serie("s05", "a", "f", 2, 0),
    semResultado("s06", "b", "c"),
    serie("s07", "b", "d", 2, 0),
    serie("s08", "b", "e", 2, 0),
    serie("s09", "b", "f", 2, 0),
    serie("s10", "c", "d", 2, 0),
    serie("s11", "c", "e", 2, 1),
    serie("s12", "f", "c", 2, 0),
    serie("s13", "d", "e", 2, 0),
    serie("s14", "f", "d", 2, 1),
    serie("s15", "e", "f", 2, 0),
  ];

  for (const [nomeA, nomeB, nomeC] of permutacoes(["Alfa", "Bravo", "Charlie"])) {
    it(`C, A, B com A="${nomeA}", B="${nomeB}", C="${nomeC}"`, () => {
      const d = datasetComNomes(
        { a: nomeA, b: nomeB, c: nomeC, d: "Delta", e: "Eco", f: "Foxtrot" },
        series,
      );
      const { rows } = calculateStandings(d);
      const linha = (id: string) => rows.find((r) => r.teamId === id)!;

      // Premissas — sem elas o caso não prova nada:
      expect(d.seriesMatches).toHaveLength(15);
      expect([linha("a").points, linha("b").points, linha("c").points]).toEqual([9, 9, 9]);
      expect([linha("a").gameDiff, linha("b").gameDiff, linha("c").gameDiff]).toEqual([2, 5, 2]);
      // Ninguém mais chega a 9: o trio é exatamente o grupo empatado do topo.
      expect(rows.filter((r) => r.points === 9)).toHaveLength(3);

      expect(rows.slice(0, 3).map((r) => r.teamId)).toEqual(["c", "a", "b"]);
    });
  }
});

describe("desempate no MEIO da fase de pontos (nem todos se enfrentaram ainda)", () => {
  /*
   * Fim da 2ª rodada de um turno de 6 times: 6 séries jogadas, 9 ainda sem resultado.
   * A, B, C e D estão com 3 pts.
   *
   *   A venceu B 2-1 · C venceu A 2-1 · B x C e tudo contra D: ainda não jogados
   *   saldo geral: A 0 (3-3) · B +1 · C 0 (3-3) · D 0 (2-2)
   *
   * Nem todos se enfrentaram, então as vitórias entre eles separam ANTES do saldo entre
   * eles. Mini-tabela dos quatro: A 1 vitória, C 1, B 0, D 0. Separa {A, C} de {B, D}.
   *   {A, C}: refeita só entre os dois, C venceu A           -> C, A
   *   {B, D}: nunca se enfrentaram, a mini-tabela não separa  -> saldo geral: B, D
   *
   * A e C são idênticos em pontos, saldo, mapas ganhos e perdidos — só o confronto os
   * separa. E B x C ainda não aconteceu: é o ciclo do comparador antigo (A > B no
   * confronto, B > C no saldo, C > A no confronto).
   */
  const series = [
    // 1ª rodada
    serie("r1-1", "a", "b", 2, 1),
    serie("r1-2", "x", "c", 2, 1),
    serie("r1-3", "d", "y", 2, 0),
    // 2ª rodada
    serie("r2-1", "c", "a", 2, 1),
    serie("r2-2", "b", "y", 2, 0),
    serie("r2-3", "x", "d", 2, 0),
    // 3ª a 5ª rodada: marcadas, ainda sem resultado
    semResultado("r3-1", "a", "d"),
    semResultado("r3-2", "b", "c"),
    semResultado("r3-3", "x", "y"),
    semResultado("r4-1", "a", "x"),
    semResultado("r4-2", "b", "d"),
    semResultado("r4-3", "c", "y"),
    semResultado("r5-1", "a", "y"),
    semResultado("r5-2", "b", "x"),
    semResultado("r5-3", "c", "d"),
  ];

  for (const [nomeA, nomeB, nomeC, nomeD] of permutacoes(["Alfa", "Bravo", "Charlie", "Delta"])) {
    it(`C, A, B, D com A="${nomeA}", B="${nomeB}", C="${nomeC}", D="${nomeD}"`, () => {
      const d = datasetComNomes({ a: nomeA, b: nomeB, c: nomeC, d: nomeD, x: "Xis", y: "Ipsilon" }, series);
      const { rows } = calculateStandings(d);
      const linha = (id: string) => rows.find((r) => r.teamId === id)!;
      const quarteto = rows.filter((r) => ["a", "b", "c", "d"].includes(r.teamId));

      // Premissas: os quatro empatados em pontos, A e C idênticos em todos os números.
      expect(new Set(quarteto.map((r) => r.points))).toEqual(new Set([3]));
      expect([linha("a").gamesWon, linha("a").gamesLost]).toEqual([3, 3]);
      expect([linha("c").gamesWon, linha("c").gamesLost]).toEqual([3, 3]);
      expect(linha("b").gameDiff).toBeGreaterThan(linha("c").gameDiff);

      expect(rows.map((r) => r.teamId)).toEqual(["x", "c", "a", "b", "d", "y"]);
    });
  }
});

describe("quem continua empatado refaz o confronto SÓ entre si", () => {
  /*
   * A, B, C e D com 6 pts, todos se enfrentaram. Mini-tabela dos quatro:
   *
   *   A 2 vitórias, saldo entre eles +1   (venceu B 2-0 e C 2-1, perdeu de D 0-2)
   *   B 2 vitórias, saldo entre eles +1   (perdeu de A 0-2, venceu C 2-1 e D 2-0)
   *   C 1 vitória,  saldo entre eles  0
   *   D 1 vitória,  saldo entre eles −2
   *
   * A e B continuam iguais na mini-tabela dos quatro. Refeita só entre os dois, A venceu B:
   * A na frente — embora B tenha saldo GERAL melhor (0 contra −1, pelos jogos contra X e
   * Y). O código antigo pulava direto para o saldo geral e punha B na frente.
   */
  const series = [
    serie("g1", "a", "b", 2, 0),
    serie("g2", "a", "c", 2, 1),
    serie("g3", "d", "a", 2, 0),
    serie("g4", "b", "c", 2, 1),
    serie("g5", "b", "d", 2, 0),
    serie("g6", "c", "d", 2, 0),
    // fora do grupo: iguala os pontos e dá a B o saldo geral melhor que o de A
    serie("f1", "x", "a", 2, 0),
    serie("f2", "y", "b", 2, 1),
    serie("f3", "c", "x", 2, 0),
    serie("f4", "d", "y", 2, 0),
  ];

  for (const [nomeA, nomeB] of permutacoes(["Alfa", "Bravo"])) {
    it(`A antes de B com A="${nomeA}", B="${nomeB}"`, () => {
      const d = datasetComNomes(
        { a: nomeA, b: nomeB, c: "Charlie", d: "Delta", x: "Xis", y: "Ipsilon" },
        series,
      );
      const { rows } = calculateStandings(d);
      const linha = (id: string) => rows.find((r) => r.teamId === id)!;

      // Premissas: os quatro com os mesmos pontos, e B com saldo geral MELHOR que A.
      expect(new Set(["a", "b", "c", "d"].map((id) => linha(id).points))).toEqual(new Set([6]));
      expect(linha("b").gameDiff).toBeGreaterThan(linha("a").gameDiff);

      expect(rows.slice(0, 4).map((r) => r.teamId)).toEqual(["a", "b", "c", "d"]);
    });
  }
});

describe("grupo em que TODOS se enfrentaram: a mini-tabela é a de sempre", () => {
  /*
   * Vitórias e saldo entre os empatados formam UMA chave quando todos jogaram contra todos
   * — como o código sempre fez. A correção do desempate transitivo não pode mudar isso.
   *
   *   A 2 vitórias, saldo entre eles  0   (venceu B 2-1 e C 2-1, perdeu de D 0-2)
   *   B 2 vitórias, saldo entre eles +3   (perdeu de A 1-2, venceu C 2-0 e D 2-0)
   *   C 1 vitória,  saldo entre eles −1
   *   D 1 vitória,  saldo entre eles −2
   *
   * B na frente de A pelo saldo da mini-tabela, embora A tenha vencido B. (Se as vitórias
   * separassem antes e {A, B} fosse refeito só entre os dois, A passaria — é o que se faz
   * quando NEM todos se enfrentaram, e aqui não é o caso.)
   */
  const series = [
    serie("g1", "a", "b", 2, 1),
    serie("g2", "a", "c", 2, 1),
    serie("g3", "d", "a", 2, 0),
    serie("g4", "b", "c", 2, 0),
    serie("g5", "b", "d", 2, 0),
    serie("g6", "c", "d", 2, 0),
    // fora do grupo: iguala os pontos
    serie("f1", "c", "x", 2, 0),
    serie("f2", "d", "y", 2, 0),
  ];

  for (const [nomeA, nomeB] of permutacoes(["Alfa", "Bravo"])) {
    it(`B, A, C, D com A="${nomeA}", B="${nomeB}"`, () => {
      const d = datasetComNomes(
        { a: nomeA, b: nomeB, c: "Charlie", d: "Delta", x: "Xis", y: "Ipsilon" },
        series,
      );
      const { rows } = calculateStandings(d);

      // Premissa: os quatro com os mesmos pontos e séries vencidas.
      expect(new Set(rows.slice(0, 4).map((r) => `${r.points}|${r.seriesWon}`))).toEqual(new Set(["6|2"]));

      expect(rows.slice(0, 4).map((r) => r.teamId)).toEqual(["b", "a", "c", "d"]);
    });
  }
});

describe("desempate transitivo: varredura com campeonatos sorteados", () => {
  /*
   * Rede mais larga que os casos montados à mão: campeonatos de 6 times com resultados
   * sorteados (gerador com semente fixa, então o teste é reprodutível) e séries faltando.
   *
   * Quando nenhum par de times tem a mesma campanha (pontos, mapas ganhos, mapas perdidos),
   * o nome NUNCA pode ser o que decide — então a classificação tem de sair igual com
   * qualquer troca de nomes. Um comparador em ciclo quebra isso.
   */
  function gerador(semente: number) {
    let s = semente >>> 0;
    return () => {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const ids = ["a", "b", "c", "d", "e", "f"];
  const nomes = ["Alfa", "Bravo", "Charlie", "Delta", "Eco", "Foxtrot"];

  it("a ordem sai igual com qualquer troca de nomes", () => {
    const sorteio = gerador(20261120);
    let verificados = 0;

    for (let rodada = 0; rodada < 400; rodada += 1) {
      const series: SeriesMatch[] = [];
      for (let i = 0; i < ids.length; i += 1) {
        for (let j = i + 1; j < ids.length; j += 1) {
          const id = `s-${ids[i]}-${ids[j]}`;
          if (sorteio() < 0.3) {
            series.push(semResultado(id, ids[i], ids[j]));
            continue;
          }
          const perdedorFez = sorteio() < 0.5 ? 0 : 1;
          series.push(
            sorteio() < 0.5
              ? serie(id, ids[i], ids[j], 2, perdedorFez)
              : serie(id, ids[i], ids[j], perdedorFez, 2),
          );
        }
      }

      const base = calculateStandings(
        datasetComNomes(Object.fromEntries(ids.map((id, i) => [id, nomes[i]])), series),
      ).rows;

      // Só vale o caso em que o nome não tem como decidir nada (ver o comentário acima).
      const campanhas = new Set(base.map((r) => `${r.points}|${r.gamesWon}|${r.gamesLost}`));
      if (campanhas.size !== base.length) continue;
      verificados += 1;

      const esperado = base.map((r) => r.teamId);
      for (let k = 1; k < nomes.length; k += 1) {
        // Desloca os nomes k casas: cada time recebe o nome de outro.
        const trocados = Object.fromEntries(ids.map((id, i) => [id, nomes[(i + k) % nomes.length]]));
        const obtido = calculateStandings(datasetComNomes(trocados, series)).rows.map((r) => r.teamId);
        expect(obtido, `rodada ${rodada}, nomes deslocados ${k}`).toEqual(esperado);
      }
      // E de trás para frente, que inverte a ordem alfabética entre todos.
      const invertidos = Object.fromEntries(ids.map((id, i) => [id, nomes[nomes.length - 1 - i]]));
      expect(
        calculateStandings(datasetComNomes(invertidos, series)).rows.map((r) => r.teamId),
        `rodada ${rodada}, nomes invertidos`,
      ).toEqual(esperado);
    }

    // A varredura não pode passar por ter pulado tudo.
    expect(verificados).toBeGreaterThan(100);
  });
});

describe("a classificação final da 3ª Edição não muda", () => {
  it("recalculada de leagueofbronze.json, sai na mesma ordem de antes da correção", () => {
    /*
     * leagueofbronze.json, na raiz, é o dataset da 3ª Edição (6 times, 16 séries contando a
     * grande final). A ordem abaixo foi calculada pelo código ANTERIOR à correção do
     * desempate transitivo: o resultado de uma temporada encerrada não pode mudar porque a
     * regra de desempate foi consertada.
     */
    const bruto = JSON.parse(readFileSync(new URL("../leagueofbronze.json", import.meta.url), "utf8"));
    const d = tournamentDatasetSchema.parse(bruto);
    const { source, rows } = calculateStandings(d);
    const linha = (id: string) => rows.find((r) => r.teamId === id)!;

    // Premissas: é a 3ª, e ela TEM empates que só o desempate separa — senão o teste não
    // exercita o código que mudou.
    expect(source).toBe("series");
    expect(d.teams).toHaveLength(6);
    expect(d.seriesMatches).toHaveLength(16);
    expect(linha("vanguarda-de-ferro").points).toBe(linha("lgtv-wins").points);
    expect(linha("vanguarda-de-ferro").gameDiff).toBe(linha("lgtv-wins").gameDiff);
    expect(linha("pantera-cor-de-goza").points).toBe(linha("presas-shurima").points);
    expect(linha("pantera-cor-de-goza").gameDiff).toBe(linha("presas-shurima").gameDiff);

    expect(rows.map((r) => r.teamId)).toEqual([
      "vanguarda-de-ferro",
      "lgtv-wins",
      "capangas-motomoto",
      "pantera-cor-de-goza",
      "presas-shurima",
      "time4",
    ]);
  });
});
