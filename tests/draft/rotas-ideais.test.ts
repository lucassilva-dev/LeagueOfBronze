import { describe, expect, it } from "vitest";

import { ELO_ORDER, resolveElo } from "@/lib/design";
import { ROTAS_IDEAIS, montarRotasIdeais, type Encaixe, type RotaIdeal, type RotasIdeais } from "@/lib/draft/rotas-ideais";

/**
 * O ideal de N por rota (lib/draft/rotas-ideais.ts).
 *
 * A prova principal é contra a FORÇA BRUTA: em pools pequenos sorteados, enumera todas as
 * distribuições possíveis e confere que o fluxo achou o mesmo ótimo nos quatro níveis
 * (fora → secundária → quem fica sem vaga → quem se move). O jeito exato pode diferir num
 * empate; o placar, não.
 */

type J = { nick: string; elo: string; primaria: string; secundaria: string };

const j = (nick: string, elo: string, primaria: string, secundaria: string): J => ({ nick, elo, primaria, secundaria });

const degrau = (elo: string) => ELO_ORDER.findIndex((e) => e.key === resolveElo(elo)?.key);
const MAIOR = ELO_ORDER.length - 1;

function encaixe(x: J, rota: RotaIdeal): Encaixe {
  if (x.primaria === rota) return "principal";
  if (x.secundaria === rota) return "secundaria";
  return "fora";
}

/**
 * O placar lexicográfico que a simulação promete minimizar: [fora, secundárias, quantos
 * ficam sem vaga em cada elo (do mais alto ao mais baixo), quantos mudam de rota em cada
 * elo (idem)]. Por elo, e não somando degraus — soma deixava "Mestre + Ferro" empatar com
 * "Esmeralda + Prata".
 */
function placar(lugares: Array<{ jogador: J; rota: RotaIdeal }>, semVaga: J[]) {
  const porElo = () => new Array<number>(MAIOR + 1).fill(0);
  const sair = porElo();
  const mudar = porElo();
  let fora = 0;
  let secundaria = 0;
  for (const { jogador, rota } of lugares) {
    const e = encaixe(jogador, rota);
    if (e === "fora") fora += 1;
    if (e === "secundaria") secundaria += 1;
    if (e !== "principal") mudar[MAIOR - degrau(jogador.elo)] += 1;
  }
  for (const x of semVaga) sair[MAIOR - degrau(x.elo)] += 1;
  return [fora, secundaria, ...sair, ...mudar];
}

function placarDoResultado(r: RotasIdeais<J>) {
  const lugares = ROTAS_IDEAIS.flatMap((rota) => r.porRota[rota].map((l) => ({ jogador: l.jogador, rota })));
  return placar(lugares, r.semVaga);
}

function menor(a: number[], b: number[]) {
  for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) return a[i] < b[i];
  return false;
}

/**
 * Todas as distribuições: cada um numa rota com vaga, ou sem vaga se sobrar gente. O placar
 * vai somado na descida (com o degrau de cada um calculado uma vez) — recalcular em cada
 * uma das ~100 mil folhas levava minutos.
 */
function melhorPorForcaBruta(jogadores: J[], vagas: number) {
  // Posição de cada um nos vetores "por elo" (o mais alto primeiro).
  const pos = jogadores.map((x) => MAIOR - degrau(x.elo));
  const e = jogadores.map((x) => ROTAS_IDEAIS.map((rota) => encaixe(x, rota)));
  const ocupadas = ROTAS_IDEAIS.map(() => 0);
  const maxSemVaga = Math.max(0, jogadores.length - vagas * ROTAS_IDEAIS.length);
  const sair = new Array<number>(MAIOR + 1).fill(0);
  const mudar = new Array<number>(MAIOR + 1).fill(0);
  let melhor: number[] | null = null;
  const descer = (i: number, fora: number, sec: number, semVaga: number) => {
    if (i === jogadores.length) {
      const p = [fora, sec, ...sair, ...mudar];
      if (!melhor || menor(p, melhor)) melhor = p;
      return;
    }
    for (let r = 0; r < ROTAS_IDEAIS.length; r += 1) {
      if (ocupadas[r] >= vagas) continue;
      const enc = e[i][r];
      ocupadas[r] += 1;
      if (enc !== "principal") mudar[pos[i]] += 1;
      descer(i + 1, fora + (enc === "fora" ? 1 : 0), sec + (enc === "secundaria" ? 1 : 0), semVaga);
      if (enc !== "principal") mudar[pos[i]] -= 1;
      ocupadas[r] -= 1;
    }
    if (semVaga < maxSemVaga) {
      sair[pos[i]] += 1;
      descer(i + 1, fora, sec, semVaga + 1);
      sair[pos[i]] -= 1;
    }
  };
  descer(0, 0, 0, 0);
  return melhor!;
}

/** Sorteio com semente (mulberry32), para o teste ser o mesmo em toda rodada. */
function sorteador(semente: number) {
  let s = semente >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function poolSorteado(semente: number, n: number): J[] {
  const r = sorteador(semente);
  // Rotas puxadas para o ADC, como na vida real: o caso difícil é rota lotada.
  const peso: RotaIdeal[] = ["ADC", "ADC", "ADC", "MID", "MID", "TOP", "SUP", "JUNG"];
  return Array.from({ length: n }, (_, i) => {
    const primaria = peso[Math.floor(r() * peso.length)];
    let secundaria = ROTAS_IDEAIS[Math.floor(r() * 5)];
    if (secundaria === primaria) secundaria = ROTAS_IDEAIS[(ROTAS_IDEAIS.indexOf(secundaria) + 1) % 5];
    return j(`J${i}`, ELO_ORDER[1 + Math.floor(r() * 7)].label, primaria, secundaria);
  });
}

describe("montarRotasIdeais", () => {
  it("bate com a força bruta nos quatro níveis, com e sem gente sobrando", () => {
    for (let semente = 1; semente <= 24; semente += 1) {
      const n = semente % 4 === 0 ? 11 : 10; // 11 = um sem vaga
      const pool = poolSorteado(semente, n);
      const resultado = montarRotasIdeais(pool, 2);
      expect(placarDoResultado(resultado), `semente ${semente}`).toEqual(melhorPorForcaBruta(pool, 2));
      // Toda vaga preenchida (há gente para todas), e cada um em um lugar só.
      for (const rota of ROTAS_IDEAIS) expect(resultado.porRota[rota]).toHaveLength(2);
      expect(resultado.semVaga).toHaveLength(n - 10);
    }
  });

  it("os 40 de 23/10: fecha 8 de cada, 33 na principal e 7 na secundária", () => {
    // Elo, principal e secundária dos 40 elegíveis de produção em 23/10 (nicks trocados).
    const linhas: Array<[string, string, string]> = [
      ["Diamante", "MID", "TOP"], ["Diamante", "ADC", "MID"], ["Diamante", "MID", "ADC"], ["Diamante", "TOP", "MID"],
      ["Diamante", "SUP", "TOP"], ["Diamante", "SUP", "ADC"], ["Diamante", "ADC", "MID"], ["Diamante", "JUNG", "MID"],
      ["Esmeralda", "ADC", "SUP"], ["Esmeralda", "ADC", "MID"], ["Esmeralda", "JUNG", "TOP"], ["Esmeralda", "SUP", "MID"],
      ["Esmeralda", "JUNG", "MID"], ["Esmeralda", "ADC", "SUP"], ["Esmeralda", "TOP", "SUP"], ["Esmeralda", "ADC", "TOP"],
      ["Esmeralda", "MID", "TOP"], ["Ferro", "ADC", "SUP"], ["Mestre", "TOP", "JUNG"], ["Mestre", "JUNG", "ADC"],
      ["Mestre", "TOP", "MID"], ["Ouro", "MID", "TOP"], ["Ouro", "ADC", "MID"], ["Ouro", "TOP", "JUNG"],
      ["Ouro", "TOP", "SUP"], ["Ouro", "SUP", "TOP"], ["Platina", "TOP", "ADC"], ["Platina", "MID", "SUP"],
      ["Platina", "ADC", "JUNG"], ["Platina", "ADC", "TOP"], ["Platina", "ADC", "JUNG"], ["Platina", "ADC", "MID"],
      ["Platina", "SUP", "JUNG"], ["Platina", "ADC", "JUNG"], ["Platina", "MID", "ADC"], ["Platina", "ADC", "JUNG"],
      ["Prata", "MID", "SUP"], ["Prata", "MID", "TOP"], ["Prata", "SUP", "JUNG"], ["Prata", "ADC", "JUNG"],
    ];
    const pool = linhas.map(([elo, p, s], i) => j(`P${i}`, elo, p, s));
    const r = montarRotasIdeais(pool, 8);

    expect(r.fecha).toBe(true);
    expect(r.contagem).toEqual({ principal: 33, secundaria: 7, fora: 0 });
    for (const rota of ROTAS_IDEAIS) expect(r.porRota[rota]).toHaveLength(8);
    // Os 7 que mudam saem do Atirador lotado (15 na principal) — e são os de elo mais baixo
    // entre quem podia cobrir cada buraco: a Prata e três Platinas na Selva, o Ferro e uma
    // Esmeralda no Suporte, uma Platina no Topo.
    const movidos = ROTAS_IDEAIS.flatMap((rota) =>
      r.porRota[rota].filter((l) => l.encaixe === "secundaria").map((l) => `${rota}:${l.jogador.elo}`),
    ).sort();
    expect(movidos).toEqual(
      ["JUNG:Platina", "JUNG:Platina", "JUNG:Platina", "JUNG:Prata", "SUP:Esmeralda", "SUP:Ferro", "TOP:Platina"].sort(),
    );
    expect(r.porRota.ADC.every((l) => l.encaixe === "principal")).toBe(true);
    // Dentro da rota, do elo mais alto ao mais baixo.
    const degraus = r.porRota.TOP.map((l) => degrau(l.jogador.elo));
    expect([...degraus].sort((a, b) => b - a)).toEqual(degraus);
  });

  it("não tira um Mestre da rota dele para poupar dois mais fracos (desempate por elo, não por soma)", () => {
    // O Meio tem dois e a Selva nenhum; as duas saídas custam duas secundárias:
    // (a) Ferro vai ao Topo e o Mestre do Topo vai à Selva; (b) Esmeralda vai à Selva e Prata
    // ao Suporte. Somando degraus elas empatam (7+0 = 5+2); por elo, (b) poupa o Mestre.
    const pool = [
      j("Topzera", "Mestre", "TOP", "JUNG"),
      j("Suzi", "Esmeralda", "SUP", "JUNG"),
      j("Adao", "Ouro", "ADC", "SUP"),
      j("Pedro", "Prata", "MID", "SUP"),
      j("Fabio", "Ferro", "MID", "TOP"),
    ];
    const r = montarRotasIdeais(pool, 1);
    expect(r.porRota.TOP.map((l) => [l.jogador.nick, l.encaixe])).toEqual([["Topzera", "principal"]]);
    expect(r.porRota.JUNG.map((l) => l.jogador.nick)).toEqual(["Suzi"]);
    expect(r.contagem).toEqual({ principal: 3, secundaria: 2, fora: 0 });
  });

  it("quando não fecha, põe fora das duas rotas o mínimo de gente — e o de elo mais baixo", () => {
    // Dez jogadores que só jogam ADC ou MID, duas vagas por rota: seis vão para fora.
    const pool = [
      ...["Mestre", "Diamante", "Esmeralda", "Platina", "Ouro"].map((elo, i) => j(`A${i}`, elo, "ADC", "MID")),
      ...["Mestre", "Diamante", "Esmeralda", "Platina", "Prata"].map((elo, i) => j(`M${i}`, elo, "MID", "ADC")),
    ];
    const r = montarRotasIdeais(pool, 2);
    expect(r.fecha).toBe(false);
    expect(r.contagem).toEqual({ principal: 4, secundaria: 0, fora: 6 });
    const fora = ROTAS_IDEAIS.flatMap((rota) => r.porRota[rota].filter((l) => l.encaixe === "fora").map((l) => l.jogador.elo));
    expect(fora).not.toContain("Mestre");
    expect(fora).not.toContain("Diamante");
  });

  it("com mais gente que vagas, fica sem vaga quem tem o elo mais baixo da rota lotada", () => {
    const pool = [
      j("t", "Ouro", "TOP", "MID"),
      j("j", "Ouro", "JUNG", "MID"),
      j("m", "Ouro", "MID", "TOP"),
      j("s", "Ouro", "SUP", "TOP"),
      j("a1", "Diamante", "ADC", "SUP"),
      j("a2", "Bronze", "ADC", "SUP"),
    ];
    const r = montarRotasIdeais(pool, 1);
    expect(r.semVaga.map((x) => x.nick)).toEqual(["a2"]);
    expect(r.fecha).toBe(true);
  });

  it("sem time nenhum, não inventa vaga", () => {
    const r = montarRotasIdeais([j("x", "Ouro", "TOP", "MID")], 0);
    expect(r.fecha).toBe(false);
    expect(r.semVaga).toHaveLength(1);
    for (const rota of ROTAS_IDEAIS) expect(r.porRota[rota]).toEqual([]);
  });
});
