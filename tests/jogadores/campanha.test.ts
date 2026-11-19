import { describe, expect, it } from "vitest";

import { ordinal } from "@/components/times/campanha";
import { campanhaDoJogador } from "@/lib/jogadores/campanha";
import type { SeriesGame, TournamentDataset } from "@/lib/schema";

import { cenario, copia, id, jogo, linha, linhasDoTime, validar } from "../torneio/_cenario-regra-6";
// (cenario e copia: os testes do jogo provisório e de quem saiu partem do campeonato sem jogo.)

/**
 * A CAMPANHA da ficha do jogador (lib/jogadores/campanha.ts), pedida em 18/11/2026: série a série,
 * destaques, campeões, próximo desafio e tabela — com as MESMAS regras do resto do site (linha que
 * não pontua fora, time da linha, MVP escolhido, W.O. que completa a série).
 *
 * O cenário: a MID da ALFA joga J1 e J2 da s1 (ALFA 2×1 BETA; no J3 entra um convidado no lugar
 * dela) e o J1 da s3 (ALFA 1×2 GAMA: a ALFA venceu o J1 e a GAMA levou o W.O. no meio). A s4 e a
 * s5 (ALFA × BETA) estão por jogar.
 */

const MID = id("alfa", "MID");

function jogoCom(vencedor: string, linhas: SeriesGame["statsByPlayer"], extra: Partial<SeriesGame> = {}): SeriesGame {
  return { ...jogo(vencedor, linhas), ...extra };
}

function campeonato(): TournamentDataset {
  const d = copia(cenario());
  const s1 = d.seriesMatches.find((s) => s.id === "s1")!;
  s1.games = [
    jogoCom(
      "alfa",
      [linha(MID, 10, 1, 5, { champion: "Ahri" }), ...linhasDoTime("alfa", [2, 1, 3], ["MID"]), ...linhasDoTime("beta", [1, 3, 1])],
      { mvpPlayerId: MID, mvpEscolhido: true, durationMin: 31 },
    ),
    jogoCom("beta", [linha(MID, 2, 4, 1, { champion: "syndra" }), ...linhasDoTime("alfa", [1, 2, 1], ["MID"]), ...linhasDoTime("beta", [3, 1, 2])], {
      durationMin: 28,
    }),
    jogoCom("alfa", [
      ...linhasDoTime("alfa", [2, 1, 2], ["MID"]),
      linha("convidado-fulano", 5, 0, 5, { convidado: "Fulano", teamId: "alfa", champion: "Morgana" }),
      ...linhasDoTime("beta", [1, 2, 1]),
    ]),
  ];
  const s3 = d.seriesMatches.find((s) => s.id === "s3")!;
  s3.games = [jogoCom("alfa", [linha(MID, 3, 3, 3, { champion: "Ahri" }), ...linhasDoTime("alfa", [1, 1, 1], ["MID"]), ...linhasDoTime("gama", [1, 2, 1])])];
  s3.walkoverWinnerTeamId = "gama";
  d.seriesMatches.push(
    { id: "s5", date: "2026-11-30T19:00:00-03:00", teamAId: "beta", teamBId: "alfa", games: [] },
    { id: "s4", date: "2026-11-27T19:00:00-03:00", teamAId: "beta", teamBId: "alfa", games: [] },
  );
  const valido = validar(d);
  if (!valido.success) throw new Error(JSON.stringify(valido.error.issues.slice(0, 3)));
  return valido.data;
}

describe("campanhaDoJogador — série a série", () => {
  const campanha = campanhaDoJogador(campeonato(), MID);

  it("só as séries em que jogou, da mais recente para a mais antiga", () => {
    expect(campanha.series.map((s) => s.id)).toEqual(["s3", "s1"]);
    expect(campanha.jogos).toBe(3);
    expect([campanha.vitorias, campanha.derrotas]).toEqual([2, 1]);
  });

  it("placar e resultado pelo lado dele, com o W.O. completando a série", () => {
    const [s3, s1] = campanha.series;
    expect(s1).toMatchObject({ placar: { time: 2, adversario: 1 }, resultado: "vitoria", walkover: false, formato: "MD3" });
    expect(s1!.adversario).toMatchObject({ id: "beta", nome: "BETA", slug: "beta" });
    expect(s3).toMatchObject({ placar: { time: 1, adversario: 2 }, resultado: "derrota", walkover: true });
    expect(s3!.jogos.map((j) => [j.tipo, j.numero, j.resultado])).toEqual([
      ["jogou", 1, "vitoria"],
      ["wo", 2, "derrota"],
      ["wo", 3, "derrota"],
    ]);
  });

  it("cada jogo: campeão pelo nome canônico, K/D/A, MVP escolhido, duração e o jogo em que não entrou", () => {
    const s1 = campanha.series.find((s) => s.id === "s1")!;
    expect(s1.jogos[0]).toMatchObject({
      tipo: "jogou",
      numero: 1,
      campeao: { id: "Ahri", nome: "Ahri" },
      abates: 10,
      mortes: 1,
      assistencias: 5,
      kda: 15,
      resultado: "vitoria",
      mvp: true,
      duracaoMin: 31,
      // (10 + 5) de 18 abates da ALFA
      participacao: 83,
    });
    // "syndra" minúsculo vira a Syndra do Data Dragon.
    expect(s1.jogos[1]).toMatchObject({ tipo: "jogou", campeao: { id: "Syndra", nome: "Syndra" }, resultado: "derrota", mvp: false });
    expect(s1.jogos[2]).toEqual({ tipo: "ausente", numero: 3, resultado: "vitoria" });
  });

  it("o MVP da série segue getSeriesMvp (1 MVP cada; desempata o KDA da série; série com W.O. não tem)", () => {
    expect(campanha.series.find((s) => s.id === "s1")!.mvpDaSerie).toBe(true);
    expect(campanha.series.find((s) => s.id === "s3")!.mvpDaSerie).toBe(false);
  });
});

describe("campanhaDoJogador — destaques", () => {
  const campanha = campanhaDoJogador(campeonato(), MID);

  it("forma em ordem cronológica e a sequência atual", () => {
    expect(campanha.forma).toEqual(["vitoria", "derrota", "vitoria"]);
    expect(campanha.sequencia).toEqual({ resultado: "vitoria", jogos: 1 });
  });

  it("participação pela soma: (15 + 3 + 6) de (18 + 6 + 7) abates do time", () => {
    expect(campanha.participacao).toBe(77);
  });

  it("melhor jogo = maior KDA; o recorde de abates some quando é o mesmo jogo", () => {
    expect(campanha.melhorJogo).toMatchObject({ serieId: "s1", numero: 1, abates: 10, kda: 15, adversario: { id: "beta" } });
    expect(campanha.recordeDeAbates).toBeNull();
  });

  it("campeões agregados e ordenados por jogos", () => {
    expect(campanha.campeoes.map((c) => [c.nome, c.jogos, c.vitorias, c.derrotas])).toEqual([
      ["Ahri", 2, 2, 0],
      ["Syndra", 1, 0, 1],
    ]);
    expect(campanha.campeoes[0]!.kda).toBeCloseTo((13 + 8) / 4);
  });

  it("ranking geral (posição de competição) e na rota", () => {
    expect(campanha.totalNoRanking).toBe(15); // o convidado não entra
    expect(campanha.ranking.map((r) => [r.metrica, r.posicao, r.valor])).toEqual([
      ["abates", 1, 15],
      ["kda", 1, 3],
      ["mvps", 1, 2],
      ["assistencias", 1, 9],
    ]);
    expect(campanha.rankingNaRota).toEqual({ rota: "MID", posicao: 1, total: 3 });
  });

  it("empatados dividem o lugar, e a campanha sabe com quantos", () => {
    const top = campanhaDoJogador(campeonato(), id("alfa", "TOP"));
    const sup = campanhaDoJogador(campeonato(), id("alfa", "SUP"));
    expect(top.ranking.find((r) => r.metrica === "abates")!.posicao).toBe(2);
    expect(sup.ranking.find((r) => r.metrica === "abates")!.posicao).toBe(2);
    // TOP, JUNGLE, ADC e SUP da ALFA têm as mesmas linhas: cada um empata com os outros 3.
    expect(top.ranking.find((r) => r.metrica === "abates")!.empatados).toBe(3);
    // A MID está sozinha no topo das 4 métricas.
    expect(campanhaDoJogador(campeonato(), MID).ranking.map((r) => r.empatados)).toEqual([0, 0, 0, 0]);
  });
});

describe("campanhaDoJogador — o time", () => {
  it("o próximo desafio é a série incompleta mais cedo, e a tabela vem depois da 1ª série", () => {
    const campanha = campanhaDoJogador(campeonato(), MID);
    expect(campanha.proximaSerie).toMatchObject({ id: "s4", emAndamento: false, adversario: { id: "beta" }, formato: "MD3" });
    expect(campanha.tabela).toMatchObject({ total: 3, vitorias: 1, derrotas: 1 });
  });

  it("série começada é 'em andamento', com o placar do lado dele", () => {
    const d = campeonato();
    d.seriesMatches.find((s) => s.id === "s4")!.games = [
      jogoCom("alfa", [...linhasDoTime("alfa", [2, 1, 1]), ...linhasDoTime("beta", [1, 2, 1])]),
    ];
    expect(campanhaDoJogador(d, MID).proximaSerie).toMatchObject({ id: "s4", emAndamento: true, placar: { time: 1, adversario: 0 } });
  });

  it("quem saiu de vez não tem próximo desafio nem tabela, mas segue com a campanha", () => {
    const d = campeonato();
    d.players.find((p) => p.id === MID)!.saiuEm = "2026-11-25T00:00:00.000Z";
    const campanha = campanhaDoJogador(d, MID);
    expect(campanha.series).toHaveLength(2);
    expect(campanha.proximaSerie).toBeNull();
    expect(campanha.tabela).toBeNull();
  });
});

describe("campanhaDoJogador — quem não pontua e o substituto", () => {
  it("o convidado não é jogador: campanha vazia", () => {
    const campanha = campanhaDoJogador(campeonato(), "convidado-fulano");
    expect(campanha).toMatchObject({ jogos: 0, series: [], ranking: [], melhorJogo: null, participacao: null, proximaSerie: null });
  });

  it("o substituto que não pontua não leva a série para a ficha (mas os abates contam para o time)", () => {
    const d = campeonato();
    const j3 = d.seriesMatches.find((s) => s.id === "s1")!.games[2]!;
    j3.statsByPlayer = j3.statsByPlayer.map((l) =>
      l.convidado ? linha(id("gama", "MID"), 5, 0, 5, { naoPontua: true, teamId: "alfa", champion: "Morgana" }) : l,
    );
    expect(validar(d).success).toBe(true);
    expect(campanhaDoJogador(d, id("gama", "MID")).series.map((s) => s.id)).toEqual(["s3"]);
    // ALFA-TOP no J3: (2 + 2) de 13 abates (8 dos titulares + 5 de quem não pontua) = 31%.
    const topJ3 = campanhaDoJogador(d, id("alfa", "TOP")).series.find((s) => s.id === "s1")!.jogos[2]!;
    expect(topJ3).toMatchObject({ tipo: "jogou", participacao: 31 });
  });

  it("o reserva que cobriu outro time: a série dele é a do time que cobriu, marcada como substituto", () => {
    const d = campeonato();
    d.seriesMatches.find((s) => s.id === "s2")!.games = [
      jogoCom("gama", [
        ...linhasDoTime("gama", [2, 1, 2], ["MID"]),
        linha("r1", 4, 0, 4, { teamId: "gama", champion: "Lux" }),
        ...linhasDoTime("beta", [1, 2, 1]),
      ]),
    ];
    expect(validar(d).success).toBe(true);
    const campanha = campanhaDoJogador(d, "r1");
    expect(campanha.series).toHaveLength(1);
    expect(campanha.series[0]).toMatchObject({ id: "s2", time: { id: "gama" }, adversario: { id: "beta" }, substituto: true });
    expect(campanha.proximaSerie).toBeNull();
    expect(campanha.tabela).toBeNull();
  });

  it("campeão desconhecido fica com o texto gravado e sem ícone", () => {
    const d = campeonato();
    d.seriesMatches.find((s) => s.id === "s1")!.games[1]!.statsByPlayer[0]!.champion = "Campeão Inventado";
    const jogo2 = campanhaDoJogador(d, MID).series.find((s) => s.id === "s1")!.jogos[1]!;
    expect(jogo2).toMatchObject({ tipo: "jogou", campeao: { id: null, nome: "Campeão Inventado" } });
  });
});

/** O jogo lançado só com o vencedor (efb7493): sem K/D/A de ninguém e sem MVP. */
function provisorio(vencedor: string): SeriesGame {
  return { winnerTeamId: vencedor, mvpPlayerId: "", statsByPlayer: [] };
}

describe("campanhaDoJogador — jogo provisório (só o vencedor, sem K/D/A)", () => {
  it("no meio da série é 'provisório' (nunca 'não jogou') e fica fora dos números dele", () => {
    const d = campeonato();
    d.seriesMatches.find((s) => s.id === "s1")!.games[1] = provisorio("beta");
    expect(validar(d).success).toBe(true);
    const campanha = campanhaDoJogador(d, MID);
    const s1 = campanha.series.find((s) => s.id === "s1")!;
    expect(s1.jogos.map((j) => [j.tipo, j.numero, j.resultado])).toEqual([
      ["jogou", 1, "vitoria"],
      ["provisorio", 2, "derrota"],
      ["ausente", 3, "vitoria"],
    ]);
    expect(s1.placar).toEqual({ time: 2, adversario: 1 });
    expect(campanha.jogos).toBe(2); // o J1 da s1 e o J1 da s3
    expect(campanha.forma).toEqual(["vitoria", "vitoria"]);
  });

  it("a série toda provisória entra pelo time do ELENCO (antes sumia da ficha)", () => {
    const d = copia(cenario());
    d.seriesMatches.find((s) => s.id === "s1")!.games = [provisorio("alfa"), provisorio("alfa")];
    expect(validar(d).success).toBe(true);
    const campanha = campanhaDoJogador(d, MID);
    expect(campanha.series.map((s) => [s.id, s.time.id, s.resultado, s.placar.time, s.placar.adversario])).toEqual([
      ["s1", "alfa", "vitoria", 2, 0],
    ]);
    expect(campanha.series[0]!.jogos.map((j) => j.tipo)).toEqual(["provisorio", "provisorio"]);
    expect(campanha).toMatchObject({ jogos: 0, forma: [], melhorJogo: null, participacao: null, ranking: [] });
    expect(campanha.tabela).toMatchObject({ vitorias: 1, derrotas: 0 });
    // Do outro lado, a mesma série pela BETA.
    expect(campanhaDoJogador(d, id("beta", "MID")).series[0]).toMatchObject({ time: { id: "beta" }, resultado: "derrota" });
  });

  it("quem não está no elenco (reserva, quem saiu) não ganha a série provisória de ninguém", () => {
    const d = copia(cenario());
    d.seriesMatches.find((s) => s.id === "s1")!.games = [provisorio("alfa"), provisorio("alfa")];
    d.players.find((p) => p.id === id("alfa", "TOP"))!.saiuEm = "2026-11-19T00:00:00.000Z";
    expect(validar(d).success).toBe(true);
    expect(campanhaDoJogador(d, "r1").series).toEqual([]);
    expect(campanhaDoJogador(d, id("alfa", "TOP")).series).toEqual([]);
  });
});

describe("campanhaDoJogador — quem está sem números", () => {
  it("conta os jogos em que ele entrou sem pontuar (o substituto que não pontua)", () => {
    const d = campeonato();
    const j3 = d.seriesMatches.find((s) => s.id === "s1")!.games[2]!;
    j3.statsByPlayer = j3.statsByPlayer.map((l) => (l.convidado ? linha("r1", 5, 0, 5, { naoPontua: true, teamId: "alfa", champion: "Morgana" }) : l));
    expect(validar(d).success).toBe(true);
    expect(campanhaDoJogador(d, "r1")).toMatchObject({ jogos: 0, jogosSemPontuar: 1, series: [], saiu: false });
    expect(campanhaDoJogador(d, MID).jogosSemPontuar).toBe(0);
  });

  it("marca quem saiu do time", () => {
    const d = copia(cenario());
    d.players.find((p) => p.id === id("alfa", "TOP"))!.saiuEm = "2026-11-19T00:00:00.000Z";
    expect(campanhaDoJogador(d, id("alfa", "TOP"))).toMatchObject({ jogos: 0, jogosSemPontuar: 0, saiu: true });
    expect(campanhaDoJogador(d, MID).saiu).toBe(false);
  });
});

describe("campanhaDoJogador — ordem pelo calendário (Brasília)", () => {
  it("série gravada só com a data não passa na frente da série das 22:00 da véspera", () => {
    // Date.parse("2026-11-28") é meia-noite UTC = 21:00 de 27/11 em Brasília: antes das 22:00.
    const d = campeonato();
    d.seriesMatches.find((s) => s.id === "s4")!.date = "2026-11-28";
    d.seriesMatches.find((s) => s.id === "s5")!.date = "2026-11-27T22:00:00-03:00";
    expect(validar(d).success).toBe(true);
    expect(campanhaDoJogador(d, MID).proximaSerie?.id).toBe("s5");
  });

  it("e a série a série segue a mesma ordem", () => {
    const d = campeonato();
    // s1 às 22:30 de 20/11 e a s3 gravada só com a data de 21/11: a s3 é a mais recente (com
    // Date.parse cru, 21/11 00:00 UTC é 20/11 21:00 em Brasília, e ela ia para antes da s1).
    d.seriesMatches.find((s) => s.id === "s1")!.date = "2026-11-20T22:30:00-03:00";
    d.seriesMatches.find((s) => s.id === "s3")!.date = "2026-11-21";
    expect(validar(d).success).toBe(true);
    expect(campanhaDoJogador(d, MID).series.map((s) => s.id)).toEqual(["s3", "s1"]);
  });
});

describe("ordinal", () => {
  it("pt e en", () => {
    expect([1, 2, 3, 12].map((n) => ordinal(n, "pt-BR"))).toEqual(["1º", "2º", "3º", "12º"]);
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 23, 101].map((n) => ordinal(n, "en-US"))).toEqual([
      "1st",
      "2nd",
      "3rd",
      "4th",
      "11th",
      "12th",
      "13th",
      "21st",
      "22nd",
      "23rd",
      "101st",
    ]);
  });
});
