import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { calcularTabela, precoNaTabela, retratoDaTabela } from "@/lib/draft/precos";
import { precosDoSorteio, previaDosPrecos, type InscricaoDaPrevia } from "@/lib/draft/previa-de-precos";
import { descreverProblemasDoDataset, tournamentDatasetSchema, type TournamentDataset } from "@/lib/schema";
import {
  calculateChampionAggregates,
  calculatePlayerAggregates,
  calculateTeamAggregates,
  elencoDaSerie,
  getGameTeamKills,
  getPlayerGameHistory,
  getSeriesGamesWithTeamRows,
  getSeriesMvp,
  getSeriesTeamKillTotals,
  linhaPrecisaDeTime,
  mvpDoJogo,
  createIndexes,
  timeDaLinha,
} from "@/lib/tournament";
import { avisosDeSubstituto, regraDoSubstitutoPelosPrecos } from "@/lib/roster";

import { cenario, copia, id, jogo, linha, linhasDoTime, mensagens, validar } from "./_cenario-regra-6";

/**
 * Regra 6 (decisão de 22/10/2026): SUBSTITUTO AVULSO POR JOGO.
 *
 * A linha de K/D/A ganha `teamId` = o time pelo qual a pessoa jogou AQUELE jogo, e toda
 * agregação lê `linha.teamId ?? jogador.teamId`. Antes, tudo era pelo time do JOGADOR: o
 * reserva (sem time) sumia de todas as contas, e um titular de outro time que cobrisse
 * uma vaga levava os abates, a vitória e o MVP para o time DELE.
 */

/** ALFA x BETA, jogo 1: o reserva `r1` joga pela ALFA no lugar da MID, com a melhor linha. */
function comReservaNaAlfa() {
  const dataset = cenario();
  const s1 = dataset.seriesMatches.find((s) => s.id === "s1")!;
  s1.games = [
    jogo("alfa", [
      ...linhasDoTime("alfa", [2, 2, 2], ["MID"]),
      linha("r1", 9, 0, 6, { teamId: "alfa", champion: "Ahri" }),
      ...linhasDoTime("beta", [1, 3, 1]),
    ]),
  ];
  return { dataset, s1 };
}

describe("schema — reserva sem time e linha com time", () => {
  it("aceita o reserva sem time e a linha dele com o time que cobriu", () => {
    const { dataset } = comReservaNaAlfa();
    expect(validar(dataset).success).toBe(true);
  });

  it("recusa jogador sem time que NÃO é reserva, dizendo o que fazer", () => {
    const dataset = copia(cenario());
    delete (dataset.players[0] as { teamId?: string }).teamId;
    expect(mensagens(dataset)).toContain(
      "Jogador alfaTOP#BR1 está sem time e não é reserva: escolha o time ou marque como reserva.",
    );
  });

  it("recusa reserva COM time (quem herda a vaga deixa de ser reserva)", () => {
    const dataset = copia(cenario());
    dataset.players.find((p) => p.id === "r1")!.teamId = "alfa";
    expect(mensagens(dataset)).toContain(
      "Jogador Reserva#BR1 é reserva e não pode ter time: quem herda a vaga recebe o time e deixa de ser reserva.",
    );
  });

  it("recusa a linha do reserva SEM time (não há de que lado contar)", () => {
    const { dataset } = comReservaNaAlfa();
    delete dataset.seriesMatches[0]!.games[0]!.statsByPlayer.find((l) => l.playerId === "r1")!.teamId;
    expect(mensagens(dataset)).toContain(
      "Jogo 1 da série s1: Reserva#BR1 é reserva (sem time), então a linha dele precisa dizer por qual time jogou.",
    );
  });

  it("recusa linha com time que não disputa a série", () => {
    const { dataset } = comReservaNaAlfa();
    dataset.seriesMatches[0]!.games[0]!.statsByPlayer.find((l) => l.playerId === "r1")!.teamId = "gama";
    expect(mensagens(dataset)).toContain(
      "Jogo 1 da série s1: a linha de Reserva#BR1 diz que ele jogou por um time que não disputa a série (gama).",
    );
  });

  it("data de saída inválida é recusada dizendo QUEM (chega assim ao painel)", () => {
    const dataset = copia(cenario());
    dataset.players[0]!.saiuEm = "ontem";
    const r = tournamentDatasetSchema.safeParse(dataset);
    expect(r.success).toBe(false);
    expect(descreverProblemasDoDataset(r.error!.issues, dataset)).toBe(
      "Jogador alfaTOP#BR1 tem uma data de saída do time inválida (ontem).",
    );
  });

  it("o dataset real do repositório (3ª Edição) continua passando", () => {
    const real = JSON.parse(readFileSync("leagueofbronze.json", "utf8"));
    expect(tournamentDatasetSchema.safeParse(real).success).toBe(true);
  });

  it("o campo novo da linha não some na leitura (o Zod descarta campo desconhecido)", () => {
    const { dataset } = comReservaNaAlfa();
    const lido = tournamentDatasetSchema.parse(copia(dataset));
    expect(lido.seriesMatches[0]!.games[0]!.statsByPlayer.find((l) => l.playerId === "r1")!.teamId).toBe("alfa");
    expect(lido.players.find((p) => p.id === "r1")!.reserva).toBe(true);
  });
});

describe("agregação pelo time da LINHA", () => {
  it("timeDaLinha: a linha manda; sem ela, o time do jogador", () => {
    expect(timeDaLinha({ teamId: "beta" }, { teamId: "alfa" })).toBe("beta");
    expect(timeDaLinha({}, { teamId: "alfa" })).toBe("alfa");
    expect(timeDaLinha({}, {})).toBeUndefined();
  });

  it("linhaPrecisaDeTime: reserva e titular de outro time precisam; quem joga pelo próprio, não", () => {
    const s1 = { teamAId: "alfa", teamBId: "beta" };
    expect(linhaPrecisaDeTime({}, s1)).toBe(true);
    expect(linhaPrecisaDeTime({ teamId: "gama" }, s1)).toBe(true);
    expect(linhaPrecisaDeTime({ teamId: "alfa" }, s1)).toBe(false);
    expect(linhaPrecisaDeTime({ teamId: "beta" }, s1)).toBe(false);
  });

  it("os abates do reserva contam para o time que ele cobriu", () => {
    const { dataset, s1 } = comReservaNaAlfa();
    // 4 x 2 dos titulares da ALFA + 9 do reserva.
    expect(getSeriesTeamKillTotals(s1, dataset)).toEqual({ alfa: 17, beta: 5 });
    expect(getGameTeamKills(s1.games[0]!, s1, dataset)).toEqual({ teamAKills: 17, teamBKills: 5 });
  });

  it("o reserva aparece na coluna do time pelo qual jogou, marcado como substituto", () => {
    const { dataset, s1 } = comReservaNaAlfa();
    const [jogo1] = getSeriesGamesWithTeamRows(s1, dataset);
    expect(jogo1!.teamARows.map((r) => r.playerId)).toContain("r1");
    expect(jogo1!.teamBRows.map((r) => r.playerId)).not.toContain("r1");
    expect(jogo1!.teamARows.find((r) => r.playerId === "r1")).toMatchObject({ teamId: "alfa", substituto: true });
    expect(jogo1!.teamARows.find((r) => r.playerId === id("alfa", "TOP"))!.substituto).toBe(false);
  });

  it("o reserva pode ser MVP do jogo e da série", () => {
    const { dataset, s1 } = comReservaNaAlfa();
    expect(mvpDoJogo(s1.games[0]!, s1, createIndexes(dataset).playersById)).toBe("r1");
    expect(getSeriesMvp(s1, dataset)?.playerId).toBe("r1");
    expect(elencoDaSerie(s1, dataset).has("r1")).toBe(true);
  });

  it("estatística do jogador: jogo, vitória e MVP do reserva", () => {
    const { dataset } = comReservaNaAlfa();
    const r1 = calculatePlayerAggregates(dataset).find((a) => a.playerId === "r1")!;
    expect(r1).toMatchObject({ gamesPlayed: 1, wins: 1, kills: 9, gameMvps: 1, seriesMvps: 1, teamId: "" });
  });

  it("estatística do time soma o substituto no time que ele cobriu", () => {
    const { dataset } = comReservaNaAlfa();
    const alfa = calculateTeamAggregates(dataset).find((t) => t.teamId === "alfa")!;
    expect(alfa).toMatchObject({ kills: 17, gamesPlayed: 5, gameMvps: 1 });
  });

  it("campeão: a vitória do pick do reserva conta", () => {
    const { dataset } = comReservaNaAlfa();
    const ahri = calculateChampionAggregates(dataset).find((c) => c.championName === "Ahri")!;
    expect(ahri).toMatchObject({ picks: 1, wins: 1 });
  });

  it("histórico do reserva: o jogo pela ALFA, contra a BETA, como substituto e MVP", () => {
    const { dataset } = comReservaNaAlfa();
    expect(getPlayerGameHistory(dataset, "r1")).toEqual([
      expect.objectContaining({
        seriesId: "s1",
        teamId: "alfa",
        opponentTeamId: "beta",
        gameIndex: 1,
        substituto: true,
        mvp: true,
      }),
    ]);
  });

  it("o MESMO reserva cobre times diferentes em séries diferentes", () => {
    const { dataset } = comReservaNaAlfa();
    const s2 = dataset.seriesMatches.find((s) => s.id === "s2")!;
    s2.games = [
      jogo("beta", [
        ...linhasDoTime("gama", [1, 1, 1], ["SUP"]),
        linha("r1", 0, 4, 3, { teamId: "gama" }),
        ...linhasDoTime("beta", [2, 1, 2]),
      ]),
    ];
    expect(validar(dataset).success).toBe(true);

    const historico = getPlayerGameHistory(dataset, "r1");
    expect(historico.map((h) => [h.seriesId, h.teamId, h.opponentTeamId])).toEqual([
      ["s2", "gama", "beta"],
      ["s1", "alfa", "beta"],
    ]);
    const r1 = calculatePlayerAggregates(dataset).find((a) => a.playerId === "r1")!;
    expect(r1).toMatchObject({ gamesPlayed: 2, wins: 1 });

    // Filtrado por time: só o que ele fez por AQUELE time.
    expect(calculatePlayerAggregates(dataset, { teamId: "gama" }).find((a) => a.playerId === "r1")).toBeUndefined();
    const gama = calculateTeamAggregates(dataset).find((t) => t.teamId === "gama")!;
    expect(gama.deaths).toBe(4 * 1 + 4);
  });

  it("titular de OUTRO time cobrindo uma vaga: conta para o time coberto, não para o dele", () => {
    const dataset = cenario();
    const s1 = dataset.seriesMatches.find((s) => s.id === "s1")!;
    const gamaMid = id("gama", "MID");
    s1.games = [
      jogo("alfa", [
        ...linhasDoTime("alfa", [1, 1, 1], ["MID"]),
        linha(gamaMid, 7, 1, 1, { teamId: "alfa" }),
        ...linhasDoTime("beta", [1, 2, 1]),
      ]),
    ];
    expect(validar(dataset).success).toBe(true);

    const times = new Map(calculateTeamAggregates(dataset).map((t) => [t.teamId, t]));
    expect(times.get("alfa")!.kills).toBe(4 + 7);
    expect(times.get("gama")!.kills).toBe(0);

    // Na página do time GAMA (agregação filtrada), o jogo pela ALFA não entra.
    const pelaGama = calculatePlayerAggregates(dataset, { teamId: "gama" }).find((a) => a.playerId === gamaMid)!;
    expect(pelaGama.gamesPlayed).toBe(0);
    const pelaAlfa = calculatePlayerAggregates(dataset).find((a) => a.playerId === gamaMid)!;
    expect(pelaAlfa).toMatchObject({ gamesPlayed: 1, wins: 1 });
  });
});

/**
 * ATUALIZAÇÃO 23/10, item 3(b): o aviso compara pelos PREÇOS DO SORTEIO (`precosDoSorteio`,
 * os mesmos da aba Times e vagas), e não pela tabela fixa da 3ª (`pts` do elo). Os casos
 * abaixo são justamente os em que as duas discordam.
 */
describe("aviso de pontos do substituto (o painel avisa, não bloqueia)", () => {
  /** A inscrição de cada jogador do dataset, casada pelo Riot ID (o nick do dataset). */
  const inscricoesDo = (dataset: TournamentDataset, semInscricao: readonly string[] = []): InscricaoDaPrevia[] =>
    dataset.players
      .filter((p) => !semInscricao.includes(p.id))
      .map((p) => ({
        id: `insc-${p.id}`,
        situacao: "apto",
        riot_id: p.nick,
        elo_declarado: p.elo,
        elo_verificado: null,
        elo_congelado: null,
      }));

  /**
   * A tabela do sorteio dos 15 titulares (todos Prata: 6 pontos cada, soma 3 × 30), com o
   * preço de quem o teste pede sobrescrito no draft. O reserva não foi ao draft: o preço
   * dele sai da reta do sorteio.
   */
  function regraDoSorteio(dataset: TournamentDataset, pontos: Record<string, number>, semInscricao: string[] = []) {
    const titulares = dataset.players.filter((p) => p.teamId !== undefined);
    const tabela = calcularTabela({ pool: titulares.map((p) => ({ elo: p.elo })), times: 3, jogadoresPorTime: 5, orcamentoPorTime: 30 });
    const pontosDoDraft = new Map(titulares.map((p) => [p.nick, pontos[p.id] ?? precoNaTabela(tabela, { elo: p.elo })]));
    const inscritos = inscricoesDo(dataset, semInscricao);
    const precos = precosDoSorteio({ retrato: retratoDaTabela(tabela), pontosDoDraft, inscritos });
    return { regra: regraDoSubstitutoPelosPrecos(precos, inscritos), tabela };
  }

  it("Diamante no lugar de uma capitã que custou 12 no draft: sem aviso (a tabela fixa avisava 8 > 3)", () => {
    const { dataset, s1 } = comReservaNaAlfa();
    dataset.players.find((p) => p.id === "r1")!.elo = "Diamante";
    const { regra, tabela } = regraDoSorteio(dataset, { [id("alfa", "MID")]: 12 });

    expect(precoNaTabela(tabela, { elo: "Diamante" })).toBeLessThanOrEqual(12);
    expect(avisosDeSubstituto(s1.games[0]!, dataset, regra)).toEqual([]);
  });

  it("Prata no lugar de uma Prata que custou 2 no draft: avisa (a tabela fixa via 3 = 3)", () => {
    const { dataset, s1 } = comReservaNaAlfa();
    const { regra, tabela } = regraDoSorteio(dataset, { [id("alfa", "MID")]: 2 });
    const precoDoReserva = precoNaTabela(tabela, { elo: "Prata" });

    expect(precoDoReserva).toBeGreaterThan(2);
    expect(avisosDeSubstituto(s1.games[0]!, dataset, regra)).toEqual([
      { jogadorId: "r1", nick: "Reserva#BR1", teamId: "alfa", motivo: "acima", pontos: precoDoReserva, teto: 2 },
    ]);
  });

  it("sem a inscrição do reserva não há preço: avisa para a organização conferir", () => {
    const { dataset, s1 } = comReservaNaAlfa();
    const { regra } = regraDoSorteio(dataset, {}, ["r1"]);
    expect(avisosDeSubstituto(s1.games[0]!, dataset, regra)).toEqual([
      { jogadorId: "r1", nick: "Reserva#BR1", teamId: "alfa", motivo: "sem_preco", pontos: null, teto: 6 },
    ]);
  });

  it("casa a inscrição pelo Riot ID sem diferenciar maiúsculas", () => {
    const { dataset } = comReservaNaAlfa();
    const inscritos = inscricoesDo(dataset).map((i) => ({ ...i, riot_id: `  ${i.riot_id!.toUpperCase()} ` }));
    const tabela = calcularTabela({ pool: [{ elo: "Prata" }], times: 1, jogadoresPorTime: 1, orcamentoPorTime: 30 });
    const regra = regraDoSubstitutoPelosPrecos(
      precosDoSorteio({ retrato: retratoDaTabela(tabela), pontosDoDraft: new Map(), inscritos }),
      inscritos,
    );
    expect(regra.preco({ nick: "Reserva#BR1" })).toBe(precoNaTabela(tabela, { elo: "Prata" }));
    expect(regra.comparar({ nick: "reserva#br1" }, { nick: "alfaMID#BR1" })).toBe(true);
    expect(regra.comparar({ nick: "ninguem#BR1" }, { nick: "alfaMID#BR1" })).toBeNull();
  });

  it("a mesma pessoa com duas inscrições (desistiu e voltou): vale a que ainda conta", () => {
    const { dataset } = comReservaNaAlfa();
    const doReserva = inscricoesDo(dataset).find((i) => i.riot_id === "Reserva#BR1")!;
    const inscritos = [
      { ...doReserva, id: "antiga", situacao: "desistiu", elo_declarado: "Diamante" },
      ...inscricoesDo(dataset),
    ];
    const tabela = calcularTabela({ pool: [{ elo: "Prata" }, { elo: "Diamante" }], times: 1, jogadoresPorTime: 2, orcamentoPorTime: 30 });
    const regra = regraDoSubstitutoPelosPrecos(
      precosDoSorteio({ retrato: retratoDaTabela(tabela), pontosDoDraft: new Map(), inscritos }),
      inscritos,
    );
    expect(precoNaTabela(tabela, { elo: "Prata" })).not.toBe(precoNaTabela(tabela, { elo: "Diamante" }));
    expect(regra.preco({ nick: "Reserva#BR1" })).toBe(precoNaTabela(tabela, { elo: "Prata" }));
  });

  it("antes do draft vale a prévia (a mesma da aba Times): não avisa com valor igual", () => {
    const { dataset, s1 } = comReservaNaAlfa();
    const inscritos = inscricoesDo(dataset);
    const previa = previaDosPrecos({ inscritos, jogadoresPorTime: 5, orcamentoPorTime: 30, maxTimes: 3 });
    expect(avisosDeSubstituto(s1.games[0]!, dataset, regraDoSubstitutoPelosPrecos(previa, inscritos))).toEqual([]);
  });

  it("time que lançou as 5 linhas dos titulares e mais o substituto: ninguém de fora, sem aviso", () => {
    const { dataset, s1 } = comReservaNaAlfa();
    s1.games[0]!.statsByPlayer.push(linha(id("alfa", "MID"), 0, 0, 0));
    const { regra } = regraDoSorteio(dataset, { [id("alfa", "MID")]: 1 });
    expect(avisosDeSubstituto(s1.games[0]!, dataset, regra)).toEqual([]);
  });
});
