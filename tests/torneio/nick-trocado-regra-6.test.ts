import { describe, expect, it } from "vitest";

import { calcularTabela, retratoDaTabela } from "@/lib/draft/precos";
import { nomesDaInscricao, precosDoSorteio, type InscricaoDaPrevia } from "@/lib/draft/previa-de-precos";
import { riotIdAtualDaInscricao } from "@/lib/inscricoes/nick-atual";
import { regraDoSubstitutoPelosPrecos } from "@/lib/roster";
import { getSeriesMvp } from "@/lib/tournament";

import { cenario, id, jogo, linha, linhasDoTime } from "./_cenario-regra-6";

/**
 * Quem troca de nick no meio do campeonato: o site passa a mostrar o nick novo (o robô grava
 * o `riot_id_atual` na inscrição e o `nick` + `puuid` no jogador), mas a inscrição guarda o
 * declarado e o draft gravado também. A regra 6 (preço do substituto) não pode perder o preço
 * de ninguém por isso.
 */

const tabela = calcularTabela({ pool: [{ elo: "Prata" }, { elo: "Ouro" }], times: 1, jogadoresPorTime: 2, orcamentoPorTime: 30 });

const inscricao = (over: Partial<InscricaoDaPrevia> = {}): InscricaoDaPrevia => ({
  id: "insc-nak",
  situacao: "apto",
  riot_id: "Nak4y#BR1",
  riot_id_atual: "Nak4y Novo#BR1",
  puuid: "P-NAK",
  elo_declarado: "Ouro",
  elo_verificado: null,
  elo_congelado: null,
  ...over,
});

describe("o nome atual da inscrição", () => {
  it("o Riot ID de hoje quando a conta tem um completo; senão o declarado", () => {
    expect(riotIdAtualDaInscricao({ riot_id: "A#1", riot_id_atual: "B#2" })).toBe("B#2");
    expect(riotIdAtualDaInscricao({ riot_id: "A#1", riot_id_atual: null })).toBe("A#1");
    expect(riotIdAtualDaInscricao({ riot_id: "A#1", riot_id_atual: "SemTag" })).toBe("A#1");
    expect(riotIdAtualDaInscricao({ riot_id: "A#1", riot_id_atual: "  " })).toBe("A#1");
  });

  it("nomesDaInscricao: o declarado e o atual", () => {
    expect(nomesDaInscricao(inscricao())).toEqual(["Nak4y#BR1", "Nak4y Novo#BR1"]);
    expect(nomesDaInscricao(inscricao({ riot_id_atual: null }))).toEqual(["Nak4y#BR1"]);
  });
});

describe("preços do sorteio com o nick trocado", () => {
  it("o draft gravado (nome declarado): acha o preço pelo declarado", () => {
    const i = inscricao();
    const precos = precosDoSorteio({ retrato: retratoDaTabela(tabela), pontosDoDraft: new Map([["Nak4y#BR1", 11]]), inscritos: [i] });
    expect(precos.preco(i)).toBe(11);
    expect(precos.noPool.has(i.id)).toBe(true);
  });

  it("a visão do draft encerrado (nome atual): acha o preço, o pool e o capitão pelo nome novo", () => {
    const i = inscricao();
    const precos = precosDoSorteio({
      retrato: retratoDaTabela(tabela),
      pontosDoDraft: new Map([["Nak4y Novo#BR1", 11]]),
      inscritos: [i],
      capitaesDoDraft: new Set(["Nak4y Novo#BR1"]),
      capitaoGratis: true,
    });
    expect(precos.preco(i)).toBe(11);
    expect(precos.noPool.has(i.id)).toBe(true);
    // Capitão sem preço: casou como capitão, então não tem valor na regra.
    expect(precos.semPreco(i)).toBe(true);
  });
});

describe("regra 6: o jogador do site com o nick novo continua com preço", () => {
  const precosDe = (inscritos: InscricaoDaPrevia[]) =>
    precosDoSorteio({ retrato: retratoDaTabela(tabela), pontosDoDraft: new Map([["Nak4y#BR1", 11]]), inscritos });

  it("pela conta (puuid), mesmo com um nick que nenhuma inscrição conhece", () => {
    const inscritos = [inscricao()];
    const regra = regraDoSubstitutoPelosPrecos(precosDe(inscritos), inscritos);
    expect(regra.preco({ nick: "Terceiro Nome#BR1", puuid: "P-NAK" })).toBe(11);
  });

  it("sem puuid no jogador: pelo nick novo (o riot_id_atual da inscrição)", () => {
    const inscritos = [inscricao()];
    const regra = regraDoSubstitutoPelosPrecos(precosDe(inscritos), inscritos);
    expect(regra.preco({ nick: "nak4y novo#br1" })).toBe(11);
  });

  it("e continua casando pelo declarado (antes de o robô rodar)", () => {
    const inscritos = [inscricao()];
    const regra = regraDoSubstitutoPelosPrecos(precosDe(inscritos), inscritos);
    expect(regra.preco({ nick: "Nak4y#BR1" })).toBe(11);
  });

  it("a inscrição que ainda conta vence a desistente com o mesmo nome", () => {
    const desistente = inscricao({ id: "velha", situacao: "desistiu", puuid: "P-VELHA", elo_declarado: "Prata" });
    const ativa = inscricao();
    const inscritos = [desistente, ativa];
    const precos = precosDoSorteio({
      retrato: retratoDaTabela(tabela),
      pontosDoDraft: new Map(),
      inscritos,
    });
    const regra = regraDoSubstitutoPelosPrecos(precos, inscritos);
    expect(regra.preco({ nick: "Nak4y Novo#BR1" })).toBe(precos.preco(ativa));
  });
});

describe("MVP da série: o empate perfeito não troca de dono quando alguém troca de nick", () => {
  it("decide pelo id (fixo), não pelo nick", () => {
    const d = cenario();
    const s1 = d.seriesMatches.find((s) => s.id === "s1")!;
    // Um MVP de jogo para cada um e o MESMO K/D/A: empate perfeito entre a TOP e a JUNGLE da ALFA.
    // Jogo 1: a TOP é a melhor linha; jogo 2: a JUNGLE. Somados, os dois ficam com 8/2/8.
    const top = id("alfa", "TOP");
    const jungle = id("alfa", "JUNGLE");
    const resto = [...linhasDoTime("alfa", [1, 1, 1], ["TOP", "JUNGLE"]), ...linhasDoTime("beta", [1, 3, 1])];
    s1.games = [
      { ...jogo("alfa", [linha(top, 5, 1, 5), linha(jungle, 3, 1, 3), ...resto]), mvpPlayerId: top },
      { ...jogo("alfa", [linha(top, 3, 1, 3), linha(jungle, 5, 1, 5), ...resto]), mvpPlayerId: jungle },
    ];
    const antes = getSeriesMvp(s1, d)!.playerId;

    // A JUNGLE troca para um nick que vem DEPOIS no alfabeto; a TOP, para um que vem antes.
    d.players.find((p) => p.id === id("alfa", "JUNGLE"))!.nick = "Zzz Novo#BR1";
    d.players.find((p) => p.id === id("alfa", "TOP"))!.nick = "Aaa Novo#BR1";

    expect(getSeriesMvp(s1, d)!.playerId).toBe(antes);
    expect(antes).toBe(id("alfa", "JUNGLE"));
  });
});
