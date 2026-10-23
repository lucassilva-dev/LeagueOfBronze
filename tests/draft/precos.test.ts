import { describe, expect, it } from "vitest";

import { rankingDeCapitaes } from "@/lib/draft/capitaes";
import {
  alcancarORelogio,
  aplicarEscolha,
  escolhiveisDaVez,
  estadoFecha,
  iniciarDraft,
  montarDraft,
  timeDaVez,
  type EstadoDraft,
  type JogadorDoDraft,
} from "@/lib/draft/motor";
import {
  arredondarComSomaExata,
  calcularTabela,
  classeDoElo,
  precoNaTabela,
  retratoDaTabela,
  tabelaDoRetrato,
  valorDaForca,
  type EloDoJogador,
  type Granularidade,
  type TabelaDePontos,
} from "@/lib/draft/precos";
import { ORCAMENTO_DA_MONTAGEM } from "@/lib/draft/viabilidade";
import { ELO_ORDER, resolveElo } from "@/lib/design";
import { POOL_4A, RESERVAS_4A, TITULARES_4A, type JogadorDoPool } from "./_pool-4a";

/**
 * A tabela de pontos automática (lib/draft/precos.ts).
 *
 * O que está em jogo: na 3ª o preço era fixo por elo e o orçamento "a média + 15%", e os 30
 * titulares da 4ª somavam 173 para um teto de 180 — 7 pontos de folga, que é exatamente o
 * que deixa um time terminar o draft mais forte que outro. A tabela automática promete soma
 * EXATA (todo time gasta os 30) e preço que nunca desce quando o elo sobe. Estes testes
 * conferem a promessa com o pool real, contra força bruta, em pools sorteados e num draft
 * inteiro rodado pelo motor de verdade.
 */

const DA_4A = { times: 6, jogadoresPorTime: 5, orcamentoPorTime: 30 } as const;
const T0 = Date.parse("2026-11-15T20:00:00.000Z");

function tabelaDa4a(granularidade?: Granularidade): TabelaDePontos {
  return calcularTabela({ pool: TITULARES_4A, ...DA_4A, granularidade });
}

const precoPorRotulo = (t: TabelaDePontos) => Object.fromEntries(t.linhas.map((l) => [l.classe.rotulo, l.pontos]));
const custoDa = (t: TabelaDePontos) => t.linhas.reduce((s, l) => s + l.quantos * (l.pontos - l.ideal) ** 2, 0);

/** Gerador determinístico (LCG): o mesmo teste sorteia sempre os mesmos pools. */
function rng(semente: number) {
  let x = semente >>> 0;
  return () => {
    x = (Math.imul(x, 1664525) + 1013904223) >>> 0;
    return x / 0x1_0000_0000;
  };
}

const ROMANOS = ["IV", "III", "II", "I"];

/**
 * Um pool de 30 em torno de um elo central sorteado, com 10% sem leitura da Riot (meio do
 * elo) e Mestres com PDL. Cobre de Ferro a Mestre, que é a faixa de um campeonato amador.
 */
function poolSorteado(semente: number, tamanho = 30): EloDoJogador[] {
  const r = rng(semente);
  const centro = 4 + Math.floor(r() * 20);
  const largura = 2 + Math.floor(r() * 8);
  return Array.from({ length: tamanho }, () => {
    const degrau = Math.max(0, Math.min(31, Math.round(centro + (r() + r() + r() - 1.5) * largura)));
    if (degrau >= 28) return { elo: "Mestre", eloRiot: "Mestre", divisao: "I", pdl: (degrau - 28) * 100 + Math.floor(r() * 100) };
    const elo = ELO_ORDER[Math.floor(degrau / 4)]!.label;
    if (r() < 0.1) return { elo };
    return { elo, eloRiot: elo, divisao: ROMANOS[degrau % 4]!, pdl: Math.floor(r() * 100) };
  });
}

/** Embaralha sem `Math.random`, para o teste de ordem ser reprodutível. */
function embaralhado<T>(lista: readonly T[], semente: number): T[] {
  const r = rng(semente);
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [copia[i], copia[j]] = [copia[j]!, copia[i]!];
  }
  return copia;
}

/**
 * A maior soma ≤ alvo que preços inteiros ≥ 1, sem diminuir de uma classe para a seguinte,
 * conseguem fazer. Uma conta independente da do módulo (só "dá ou não dá", por conjuntos),
 * para provar que "soma == alvo" vale sempre que é alcançável.
 */
function maiorSomaAlcancavel(quantos: readonly number[], alvo: number): number {
  let porPreco: Set<number>[] = [];
  for (let i = 0; i < quantos.length; i++) {
    const q = quantos[i]!;
    const proxima: Set<number>[] = [];
    const acumulado = new Set<number>();
    for (let p = 1; q * p <= alvo; p++) {
      if (i > 0) for (const s of porPreco[p - 1] ?? []) acumulado.add(s);
      const somas = new Set<number>();
      if (i === 0) somas.add(q * p);
      else for (const s of acumulado) if (s + q * p <= alvo) somas.add(s + q * p);
      proxima.push(somas);
    }
    porPreco = proxima;
  }
  let maior = -1;
  for (const somas of porPreco) for (const s of somas) maior = Math.max(maior, s);
  return maior;
}

// ---------------------------------------------------------------- o pool real

describe("a tabela da 4ª com o pool real (22/10)", () => {
  it("com a tabela fixa da 3ª, os 30 titulares somavam 173 para 180 — a folga que dá vantagem", () => {
    expect(TITULARES_4A).toHaveLength(30);
    expect(TITULARES_4A.reduce((s, j) => s + resolveElo(j.elo)!.pts, 0)).toBe(173);
  });

  it("por divisão: soma exatamente 180 e sai a tabela que a organização conferiu (curvatura 0,075)", () => {
    const t = tabelaDa4a("divisao");
    expect(t.curvatura).toBe(0.075);
    expect(precoPorRotulo(t)).toEqual({
      "Prata III": 1,
      Prata: 1, // o Prata sem leitura da Riot: meio do elo
      "Prata I": 2,
      "Ouro IV": 2,
      "Ouro III": 2,
      "Ouro II": 3,
      "Ouro I": 3,
      "Platina IV": 4,
      "Platina III": 4,
      "Platina II": 5,
      "Esmeralda IV": 6,
      "Esmeralda III": 7,
      "Esmeralda II": 8,
      "Esmeralda I": 8,
      "Diamante IV": 9,
      "Diamante III": 10,
      "Mestre · 0–99 PDL": 13,
      "Mestre · 200–299 PDL": 16,
    });
    expect(t.linhas.reduce((s, l) => s + l.quantos, 0)).toBe(30);
    expect(t).toMatchObject({ alvo: 180, soma: 180, folga: 0 });
    expect(t.erroMaximoEmDegraus).toBeCloseTo(1.08, 2);
    // A reta: o mais fraco (Prata III) custa 1 e o jogador médio custa 30 ÷ 5 = 6.
    expect(t.reta.precoMedio).toBe(6);
    expect(t.linhas[0]!.ideal).toBeCloseTo(1, 10);
    // E a soma dos ideais é o alvo: com a soma exata, gastar 30 é ter o mesmo VALOR médio.
    expect(t.linhas.reduce((s, l) => s + l.quantos * l.ideal, 0)).toBeCloseTo(180, 9);
  });

  it("com curvatura 0 sai a escada reta que a organização conferiu antes", () => {
    const t = calcularTabela({ pool: TITULARES_4A, ...DA_4A, curvatura: 0 });
    expect(t.linhas.map((l) => l.pontos)).toEqual([1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 7, 7, 8, 8, 9, 9, 11, 12]);
    expect(t.erroMaximoEmDegraus).toBeCloseTo(1.12, 2);
  });

  it("só por elo: também soma 180, com um preço por elo", () => {
    const t = tabelaDa4a("elo");
    expect(precoPorRotulo(t)).toEqual({ Prata: 1, Ouro: 2, Platina: 5, Esmeralda: 7, Diamante: 10, Mestre: 12 });
    expect(t).toMatchObject({ soma: 180, folga: 0 });
  });

  it("o preço de cada titular sai da linha dele, e a soma por jogador é a da tabela", () => {
    const t = tabelaDa4a();
    expect(TITULARES_4A.reduce((s, j) => s + precoNaTabela(t, j), 0)).toBe(180);
  });

  it("a ordem da lista não muda nada, e a mesma entrada dá a mesma tabela", () => {
    const t = tabelaDa4a();
    expect(calcularTabela({ pool: embaralhado(TITULARES_4A, 7), ...DA_4A })).toEqual(t);
    expect(calcularTabela({ pool: embaralhado(TITULARES_4A, 99), ...DA_4A })).toEqual(t);
    expect(tabelaDa4a()).toEqual(t);
  });

  it("reservas recebem o preço da reta, preso entre as linhas vizinhas", () => {
    const t = tabelaDa4a();
    const preco = (posicao: number) => precoNaTabela(t, POOL_4A.find((j) => j.posicao === posicao)!);
    expect(preco(30)).toBe(5); // Platina I: entre Platina II (5) e Esmeralda IV (6)
    expect(preco(32)).toBe(12); // Diamante I: entre Diamante III (10) e Mestre 0–99 (13)
    expect(preco(33)).toBe(7); // Esmeralda III: já tem linha
    expect(preco(34)).toBe(4); // Platina III: já tem linha
    expect(preco(35)).toBe(1); // Ferro sem leitura: abaixo de todo mundo, nunca menos que 1
    expect(preco(36)).toBe(5); // Platina I

    for (const reserva of RESERVAS_4A) {
      const forca = classeDoElo(reserva).forca;
      const abaixo = t.linhas.filter((l) => l.classe.forca <= forca).at(-1);
      const acima = t.linhas.find((l) => l.classe.forca >= forca);
      const p = precoNaTabela(t, reserva);
      if (abaixo) expect(p).toBeGreaterThanOrEqual(abaixo.pontos);
      if (acima) expect(p).toBeLessThanOrEqual(acima.pontos);
      expect(p).toBeGreaterThanOrEqual(1);
    }
  });

  it("mesma força em elos diferentes (Mestre 450 e Grão-Mestre 470): a linha é a do maior elo, em qualquer ordem", () => {
    // Mestre 400–499 e Grão-Mestre 400–499 têm a mesma força (32,5) e caem na mesma linha. A
    // linha ficava com quem aparecesse primeiro na lista — a tabela publicada mudava com a ordem.
    const semOsDoisMestres = TITULARES_4A.filter((j) => j.elo !== "Mestre");
    const mestre: EloDoJogador = { elo: "Mestre", eloRiot: "Mestre", divisao: "I", pdl: 450 };
    const grao: EloDoJogador = { elo: "Grão-Mestre", eloRiot: "Grão-Mestre", divisao: "I", pdl: 470 };
    const a = calcularTabela({ pool: [...semOsDoisMestres, mestre, grao], ...DA_4A });
    const b = calcularTabela({ pool: [...semOsDoisMestres, grao, mestre], ...DA_4A });
    const c = calcularTabela({ pool: [grao, ...embaralhado(semOsDoisMestres, 3), mestre], ...DA_4A });
    expect(JSON.stringify(b)).toBe(JSON.stringify(a));
    expect(JSON.stringify(c)).toBe(JSON.stringify(a));
    expect(a.linhas.at(-1)).toMatchObject({ quantos: 2, classe: { chave: "grao-mestre-400", rotulo: "Grão-Mestre · 400–499 PDL" } });
    expect(precoNaTabela(a, mestre)).toBe(precoNaTabela(a, grao));
  });

  it("o retrato é dado puro: vai e volta por JSON e não carrega ninguém", () => {
    const retrato = retratoDaTabela(tabelaDa4a());
    expect(JSON.parse(JSON.stringify(retrato))).toEqual(retrato);
    expect(retrato.linhas.map((l) => l.rotulo)).toContain("Mestre · 200–299 PDL");
    expect(retrato.linhas.reduce((s, l) => s + l.pontos * l.quantos, 0)).toBe(retrato.soma);
    expect(Object.keys(retrato.linhas[0]!).sort()).toEqual(["chave", "elo", "forca", "ideal", "pontos", "quantos", "rotulo"]);
    expect(retrato.linhas[0]).toMatchObject({ rotulo: "Prata III", elo: "Prata" });
  });

  it("a tabela volta do retrato e dá o mesmo preço a qualquer jogador, do pool ou de fora", () => {
    const t = tabelaDa4a();
    const devolta = tabelaDoRetrato(JSON.parse(JSON.stringify(retratoDaTabela(t))));
    for (const j of POOL_4A) expect(precoNaTabela(devolta, j)).toBe(precoNaTabela(t, j));
    // A escada inteira, de Ferro IV ao Mestre 900.
    for (const meta of ELO_ORDER.slice(0, 7)) {
      for (const divisao of ROMANOS) {
        const j = { elo: meta.label, eloRiot: meta.label, divisao };
        expect(precoNaTabela(devolta, j)).toBe(precoNaTabela(t, j));
      }
    }
    for (let pdl = 0; pdl < 1000; pdl += 100) {
      const j = { elo: "Mestre", eloRiot: "Mestre", divisao: "I", pdl };
      expect(precoNaTabela(devolta, j)).toBe(precoNaTabela(t, j));
    }
  });
});

// ---------------------------------------------------------------- a classe de cada jogador

describe("a classe de preço de um jogador", () => {
  it("Mestre vai por faixa de 100 PDL, sempre acima do Diamante I", () => {
    const mestre = (pdl: number) => classeDoElo({ elo: "Mestre", eloRiot: "Mestre", divisao: "I", pdl });
    expect(mestre(21)).toMatchObject({ chave: "mestre-0", rotulo: "Mestre · 0–99 PDL" });
    expect(mestre(99).chave).toBe("mestre-0");
    expect(mestre(100)).toMatchObject({ chave: "mestre-100", rotulo: "Mestre · 100–199 PDL" });
    expect(mestre(208)).toMatchObject({ chave: "mestre-200", rotulo: "Mestre · 200–299 PDL" });
    expect(mestre(21).forca).toBeLessThan(mestre(100).forca);
    expect(mestre(100).forca).toBeLessThan(mestre(208).forca);
    const diamanteI = classeDoElo({ elo: "Diamante", eloRiot: "Diamante", divisao: "I", pdl: 99 });
    expect(diamanteI.forca).toBeLessThan(mestre(0).forca);
  });

  it("Mestre sem PDL lido fica no meio da faixa; por elo, todo Mestre é um só", () => {
    expect(classeDoElo({ elo: "Mestre" })).toMatchObject({ chave: "mestre", divisaoLida: false });
    expect(classeDoElo({ elo: "Mestre", eloRiot: "Mestre", divisao: "I", pdl: 208 }, "elo")).toMatchObject({
      chave: "mestre",
      divisaoLida: true,
    });
  });

  it("leitura da Riot de OUTRO elo não vale: o jogador fica no meio do elo que vale", () => {
    // A organização travou Ouro à mão; a Riot diz Platina I. A divisão lida é da Platina.
    const travado = classeDoElo({ elo: "Ouro", eloRiot: "Platina", divisao: "I", pdl: 80 });
    expect(travado).toMatchObject({ chave: "ouro", rotulo: "Ouro", divisaoLida: false });
    expect(travado.forca).toBe(classeDoElo({ elo: "Ouro" }).forca);
    // A mesma leitura no elo certo vale a divisão.
    expect(classeDoElo({ elo: "Ouro", eloRiot: "Ouro", divisao: "I", pdl: 80 })).toMatchObject({ chave: "ouro-i", divisaoLida: true });
  });

  it("sem divisão (ou com divisão que não existe), meio do elo — nem prêmio nem castigo", () => {
    const meio = classeDoElo({ elo: "Prata" });
    expect(classeDoElo({ elo: "Prata", eloRiot: "Prata", divisao: null })).toEqual(meio);
    expect(classeDoElo({ elo: "Prata", eloRiot: "Prata", divisao: "V" })).toEqual(meio);
    // O meio fica entre a III e a II.
    expect(meio.forca).toBeGreaterThan(classeDoElo({ elo: "Prata", eloRiot: "Prata", divisao: "III" }).forca);
    expect(meio.forca).toBeLessThan(classeDoElo({ elo: "Prata", eloRiot: "Prata", divisao: "II" }).forca);
    // Minúscula e espaço vindos do banco não mudam a leitura.
    expect(classeDoElo({ elo: "Prata", eloRiot: "prata", divisao: " ii " }).rotulo).toBe("Prata II");
  });

  it("cada divisão é um degrau, de Ferro IV a Diamante I", () => {
    const forcas = ELO_ORDER.slice(0, 7).flatMap((meta) =>
      ROMANOS.map((d) => classeDoElo({ elo: meta.label, eloRiot: meta.label, divisao: d }).forca),
    );
    for (let i = 1; i < forcas.length; i++) expect(forcas[i]! - forcas[i - 1]!).toBe(1);
  });

  it("elo que a tabela do site não conhece é erro, não preço inventado", () => {
    expect(() => classeDoElo({ elo: "Lata" })).toThrow(/Elo não reconhecido/);
  });
});

// ---------------------------------------------------------------- bordas

describe("bordas da tabela", () => {
  it("todos do mesmo elo: uma linha só, cada um custa a média (6)", () => {
    const t = calcularTabela({ pool: Array.from({ length: 30 }, () => ({ elo: "Ouro" })), ...DA_4A });
    expect(t.linhas).toHaveLength(1);
    expect(t.linhas[0]).toMatchObject({ quantos: 30, pontos: 6 });
    expect(t).toMatchObject({ soma: 180, folga: 0, erroMaximoEmDegraus: 0 });
    expect(t.reta.inclinacao).toBe(0);
  });

  it("orçamento que não divide (31, todos iguais): a soma fica abaixo do alvo, nunca acima", () => {
    // Cada um teria de custar 6,2. Inteiro, 30 × 6 = 180 ≤ 186; 30 × 7 = 210 estoura.
    const t = calcularTabela({ pool: Array.from({ length: 30 }, () => ({ elo: "Ouro" })), ...DA_4A, orcamentoPorTime: 31 });
    expect(t.alvo).toBe(186);
    expect(t.linhas[0]!.pontos).toBe(6);
    expect(t.soma).toBe(180);
    expect(t.folga).toBe(6);
    expect(t.soma).toBeLessThanOrEqual(t.alvo);
  });

  it("um Ferro perdido num pool alto: custa 1, a soma fecha, e a escala dos outros se achata", () => {
    // O Prata sem leitura (posição 16) sai e entra o reserva Ferro sem leitura.
    const ferro = RESERVAS_4A.find((j) => j.elo === "Ferro")!;
    const pool = TITULARES_4A.map((j) => (j.posicao === 16 ? { ...ferro, reserva: false } : j));
    const t = calcularTabela({ pool, ...DA_4A });
    const real = tabelaDa4a();

    expect(t.linhas[0]).toMatchObject({ quantos: 1, pontos: 1 });
    expect(t.linhas[0]!.classe.rotulo).toBe("Ferro");
    expect(t).toMatchObject({ soma: 180, folga: 0 });
    // A âncora de baixo desce sete degraus: cada degrau passa a valer menos ponto, e o
    // arredondamento pesa mais em divisões. É o efeito do outlier, e a tabela o mostra.
    expect(t.reta.inclinacao).toBeLessThan(real.reta.inclinacao);
    for (let i = 1; i < t.linhas.length; i++) expect(t.linhas[i]!.pontos).toBeGreaterThanOrEqual(t.linhas[i - 1]!.pontos);
  });

  it("pool vazio: nenhuma linha, soma zero, e qualquer um custa 1", () => {
    const t = calcularTabela({ pool: [], ...DA_4A });
    expect(t).toMatchObject({ linhas: [], alvo: 180, soma: 0, folga: 180 });
    expect(precoNaTabela(t, { elo: "Desafiante" })).toBe(1);
  });

  it("zero times (ou zero jogadores por time): não há tabela", () => {
    expect(calcularTabela({ pool: TITULARES_4A, ...DA_4A, times: 0 })).toMatchObject({ linhas: [], alvo: 0, soma: 0, folga: 0 });
    expect(calcularTabela({ pool: TITULARES_4A, ...DA_4A, jogadoresPorTime: 0 }).linhas).toEqual([]);
  });

  it("reserva com a reta fora das vizinhas: o preço fica preso entre as linhas (tabela montada à mão)", () => {
    // Nenhum pool real passa pela trava — a reta e as linhas andam juntas. Aqui elas se
    // afastam de propósito: Ouro IV custa 3 (ideal 2,45) e Ouro I custa 4, e a reta dá 2,4
    // ao Ouro III e 5,6 ao Ouro II. Sem a trava, o Ouro III custaria 2 (menos que o Ouro IV,
    // mais fraco) e o Ouro II, 6 (mais que o Ouro I, mais forte).
    const classe = (rotulo: string, forca: number) => ({ chave: rotulo, rotulo, forca, tier: 3, divisaoLida: true });
    const t: TabelaDePontos = {
      granularidade: "divisao",
      curvatura: 0,
      times: 1,
      jogadoresPorTime: 2,
      orcamentoPorTime: 7,
      linhas: [
        { classe: classe("Ouro IV", 12.5), quantos: 1, ideal: 2.45, pontos: 3 },
        { classe: classe("Ouro I", 15.5), quantos: 1, ideal: 4.2, pontos: 4 },
      ],
      alvo: 7,
      soma: 7,
      folga: 0,
      reta: { curvatura: 0, forcaDoMaisFraco: 12.5, forcaMedia: 14, valorDoMaisFraco: 13.0625, valorMedio: 14, inclinacao: 3.2, precoMedio: 3.5 },
      erroMaximoEmDegraus: 0,
    };
    const ouro = (divisao: string) => ({ elo: "Ouro", eloRiot: "Ouro", divisao });
    expect(precoNaTabela(t, ouro("III"))).toBe(3); // reta 2,4 → 2, preso no Ouro IV (3)
    expect(precoNaTabela(t, ouro("II"))).toBe(4); // reta 5,6 → 6, preso no Ouro I (4)
    expect(precoNaTabela(t, ouro("IV"))).toBe(3); // tem linha
    expect(precoNaTabela(t, { elo: "Prata", eloRiot: "Prata", divisao: "I" })).toBe(1); // abaixo de tudo: nunca menos que 1
  });

  it("orçamento menor que um ponto por jogador: todo mundo no mínimo, e a folga negativa acusa", () => {
    const t = calcularTabela({ pool: TITULARES_4A, ...DA_4A, orcamentoPorTime: 4 });
    expect(t.linhas.every((l) => l.pontos === 1)).toBe(true);
    expect(t.soma).toBe(30);
    expect(t.folga).toBe(-6);
  });
});

// ---------------------------------------------------------------- o arredondamento é ótimo

describe("o arredondamento contra força bruta", () => {
  /** Todas as tabelas monótonas com preços de 1 ao alvo; a melhor pela mesma ordem do módulo. */
  function forcaBruta(quantos: readonly number[], ideais: readonly number[], alvo: number) {
    let melhor: { soma: number; custo: number } | null = null;
    const precos: number[] = [];
    const visitar = (i: number, minimo: number, soma: number, custo: number) => {
      if (i === quantos.length) {
        if (melhor === null || soma > melhor.soma || (soma === melhor.soma && custo < melhor.custo - 1e-9)) {
          melhor = { soma, custo };
        }
        return;
      }
      for (let p = minimo; soma + quantos[i]! * p <= alvo; p++) {
        precos.push(p);
        visitar(i + 1, p, soma + quantos[i]! * p, custo + quantos[i]! * (p - ideais[i]!) ** 2);
        precos.pop();
      }
    };
    visitar(0, 1, 0, 0);
    return melhor as { soma: number; custo: number } | null;
  }

  it("em 400 casos pequenos sorteados, acha a mesma soma e o mesmo custo que a busca completa", () => {
    const r = rng(2026);
    for (let caso = 0; caso < 400; caso++) {
      const k = 1 + Math.floor(r() * 4);
      const quantos = Array.from({ length: k }, () => 1 + Math.floor(r() * 4));
      const n = quantos.reduce((s, q) => s + q, 0);
      const alvo = n + Math.floor(r() * n * 6);
      // Ideais crescentes, como os da reta; um em cada cinco casos, em qualquer ordem.
      const brutos = Array.from({ length: k }, () => 1 + r() * 9);
      const ideais = caso % 5 === 0 ? brutos : [...brutos].sort((a, b) => a - b);

      const precos = arredondarComSomaExata(quantos, ideais, alvo);
      const soma = precos.reduce((s, p, i) => s + p * quantos[i]!, 0);
      const custo = precos.reduce((s, p, i) => s + quantos[i]! * (p - ideais[i]!) ** 2, 0);
      const esperado = forcaBruta(quantos, ideais, alvo)!;

      const contexto = JSON.stringify({ quantos, ideais, alvo, precos });
      expect(soma, contexto).toBe(esperado.soma);
      expect(custo, contexto).toBeCloseTo(esperado.custo, 9);
      for (let i = 0; i < k; i++) {
        expect(precos[i]!, contexto).toBeGreaterThanOrEqual(1);
        if (i > 0) expect(precos[i]!, contexto).toBeGreaterThanOrEqual(precos[i - 1]!);
      }
    }
  });

  it("acha a soma exata mesmo quando ela pede preços longe do ideal", () => {
    // Cinco a ideal 1 e um a ideal 1, alvo 20: a soma exata existe — (3, 5) é a mais
    // perto dela. A versão que só olhava ±2 em torno do ideal parava em (3, 3): soma 18,
    // folga 2, e os times não terminariam iguais.
    expect(arredondarComSomaExata([5, 1], [1, 1], 20)).toEqual([3, 5]);
  });

  it("é determinística no empate: fica o menor preço na classe mais alta", () => {
    // Ideais 2,5 e 3,5 com alvo 6: (2, 4) e (3, 3) custam o mesmo (0,5). Fica (3, 3).
    expect(arredondarComSomaExata([1, 1], [2.5, 3.5], 6)).toEqual([3, 3]);
    expect(arredondarComSomaExata([1, 1], [2.5, 3.5], 6)).toEqual([3, 3]);
    expect(arredondarComSomaExata([], [], 10)).toEqual([]);
  });

  it("alvo que nem com todo mundo a 1 ponto cabe: devolve o mínimo", () => {
    expect(arredondarComSomaExata([3, 2], [4, 6], 4)).toEqual([1, 1]);
  });

  /**
   * A busca completa com o desempate DOCUMENTADO: maior soma ≤ alvo, depois menor custo, e no
   * empate de custo o menor preço na última classe, depois na penúltimo… (de trás para frente).
   */
  function forcaBrutaComDesempate(quantos: readonly number[], ideais: readonly number[], alvo: number): number[] {
    let melhor: { soma: number; custo: number; precos: number[] } | null = null;
    const precos: number[] = [];
    const antesDe = (a: readonly number[], b: readonly number[]) => {
      for (let i = a.length - 1; i >= 0; i--) if (a[i] !== b[i]) return a[i]! < b[i]!;
      return false;
    };
    const visitar = (i: number, minimo: number, soma: number, custo: number) => {
      if (i === quantos.length) {
        const ganha =
          melhor === null ||
          soma > melhor.soma ||
          (soma === melhor.soma && (custo < melhor.custo - 1e-9 || (Math.abs(custo - melhor.custo) <= 1e-9 && antesDe(precos, melhor.precos))));
        if (ganha) melhor = { soma, custo, precos: [...precos] };
        return;
      }
      for (let p = minimo; soma + quantos[i]! * p <= alvo; p++) {
        precos.push(p);
        visitar(i + 1, p, soma + quantos[i]! * p, custo + quantos[i]! * (p - ideais[i]!) ** 2);
        precos.pop();
      }
    };
    visitar(0, 1, 0, 0);
    return (melhor as { precos: number[] } | null)?.precos ?? quantos.map(() => 1);
  }

  it("no empate, o VETOR inteiro segue o desempate documentado (ideais em múltiplos de 0,25)", () => {
    // Com ideais em quartos de ponto, empates exatos de custo são comuns — e só a regra de
    // desempate decide o vetor. Antes só a soma e o custo eram conferidos.
    const r = rng(77);
    let foraDoArredondamentoSimples = 0;
    for (let caso = 0; caso < 1500; caso++) {
      const k = 2 + Math.floor(r() * 4);
      const quantos = Array.from({ length: k }, () => 1 + Math.floor(r() * 3));
      const n = quantos.reduce((s, q) => s + q, 0);
      const alvo = n + Math.floor(r() * n * 5);
      const quartos = Array.from({ length: k }, () => Math.round(r() * 36) / 4);
      const ideais = caso % 4 === 0 ? quartos : [...quartos].sort((a, b) => a - b);
      const esperado = forcaBrutaComDesempate(quantos, ideais, alvo);
      const achado = arredondarComSomaExata(quantos, ideais, alvo);
      if (achado.some((p, i) => p !== Math.round(ideais[i]!))) foraDoArredondamentoSimples++;
      expect(achado, JSON.stringify({ quantos, ideais, alvo })).toEqual(esperado);
    }
    expect(foraDoArredondamentoSimples).toBeGreaterThan(100);
    // O caso à mão de três classes: (1, 3, 3) e (1, 2, 4)… o empate fica com o menor preço no fim.
    expect(arredondarComSomaExata([1, 1, 1], [1, 2.5, 3.5], 7)).toEqual(forcaBrutaComDesempate([1, 1, 1], [1, 2.5, 3.5], 7));
  });

  it("entrada inválida é erro, não laço sem fim nem tudo a 1 em silêncio", () => {
    // Um ideal NaN devolvia [1, 1] (soma 4 de 10) sem avisar.
    expect(() => arredondarComSomaExata([2, 2], [Number.NaN, 3], 10)).toThrow(/arredondarComSomaExata/);
    expect(() => arredondarComSomaExata([2, 2], [1, Number.POSITIVE_INFINITY], 10)).toThrow(/arredondarComSomaExata/);
    expect(() => arredondarComSomaExata([2, 2], [1, 3], Number.POSITIVE_INFINITY)).toThrow(/arredondarComSomaExata/);
    expect(() => arredondarComSomaExata([2, 2], [1, 3], Number.NaN)).toThrow(/arredondarComSomaExata/);
    expect(() => arredondarComSomaExata([2, 1.5], [1, 3], 10)).toThrow(/arredondarComSomaExata/);
    expect(() => arredondarComSomaExata([2], [1, 3], 10)).toThrow(/arredondarComSomaExata/);
    // Quantos 0 laçava até estourar a memória (o maior preço da classe era infinito).
    expect(() => arredondarComSomaExata([0, 2], [1, 3], 10)).toThrow(/arredondarComSomaExata/);
    expect(() => arredondarComSomaExata([-1, 2], [1, 3], 10)).toThrow(/arredondarComSomaExata/);
  });

  it("orçamento alto (o campo aceita até 999) custa milissegundos, não segundos nem gigabytes", () => {
    // Antes: 1,7 s e ~1 GB com 600; 234 s e 2,8 GB com 999 — no navegador e na sondagem do painel.
    for (const orcamento of [300, 600, 999]) {
      const inicio = performance.now();
      const t = calcularTabela({ pool: TITULARES_4A, ...DA_4A, orcamentoPorTime: orcamento });
      expect(performance.now() - inicio, `orçamento ${orcamento}`).toBeLessThan(1000);
      expect(t).toMatchObject({ soma: 6 * orcamento, folga: 0 });
      for (let i = 1; i < t.linhas.length; i++) expect(t.linhas[i]!.pontos).toBeGreaterThanOrEqual(t.linhas[i - 1]!.pontos);
    }
  });

  it("a soma exata impossível com orçamento alto também é rápida (6 classes de 5, 6 × 999 não é múltiplo de 5)", () => {
    // A janela em volta do ideal não alcança 5994 (impossível); a maior soma possível (5990)
    // vem do troco, e a busca alarga só até achá-la. Antes: ~400 ms; agora, poucos ms.
    const inicio = performance.now();
    const precos = arredondarComSomaExata([5, 5, 5, 5, 5, 5], [1, 80, 150, 220, 300, 447.8], 6 * 999);
    expect(performance.now() - inicio).toBeLessThan(150);
    expect(precos.reduce((s, p) => s + 5 * p, 0)).toBe(5990);
    expect(precos).toEqual([1, 80, 150, 220, 300, 447]);
  });
});

// ---------------------------------------------------------------- pools sorteados

describe("propriedades em pools sorteados (semente fixa)", () => {
  const casos = Array.from({ length: 120 }, (_, i) => ({
    semente: 7919 * (i + 1),
    granularidade: (i % 3 === 2 ? "elo" : "divisao") as Granularidade,
  }));

  it("soma == alvo sempre que alcançável; nunca passa do alvo; preço ≥ 1 e nunca desce com a força", () => {
    for (const { semente, granularidade } of casos) {
      const pool = poolSorteado(semente);
      const t = calcularTabela({ pool, ...DA_4A, granularidade });
      const contexto = `semente ${semente} (${granularidade})`;

      expect(t.soma, contexto).toBeLessThanOrEqual(t.alvo);
      expect(t.soma, contexto).toBe(maiorSomaAlcancavel(t.linhas.map((l) => l.quantos), t.alvo));
      expect(t.folga, contexto).toBe(t.alvo - t.soma);
      expect(t.linhas.reduce((s, l) => s + l.quantos, 0), contexto).toBe(30);

      for (let i = 0; i < t.linhas.length; i++) {
        expect(t.linhas[i]!.pontos, contexto).toBeGreaterThanOrEqual(1);
        if (i > 0) {
          expect(t.linhas[i]!.classe.forca, contexto).toBeGreaterThan(t.linhas[i - 1]!.classe.forca);
          expect(t.linhas[i]!.pontos, contexto).toBeGreaterThanOrEqual(t.linhas[i - 1]!.pontos);
        }
      }
      // Preço por jogador = preço da linha dele, e a soma por jogador é a da tabela.
      expect(pool.reduce((s, j) => s + precoNaTabela(t, j), 0), contexto).toBe(t.soma);
    }
  });

  it("por divisão, todos os pools sorteados fecham a soma exata", () => {
    for (const { semente, granularidade } of casos.filter((c) => c.granularidade === "divisao")) {
      expect(calcularTabela({ pool: poolSorteado(semente), ...DA_4A, granularidade }).folga, `semente ${semente}`).toBe(0);
    }
  });

  it("o custo nunca é pior que o de arredondar cada um para o mais próximo, quando esse arredondamento já fecha", () => {
    for (const { semente, granularidade } of casos) {
      const t = calcularTabela({ pool: poolSorteado(semente), ...DA_4A, granularidade });
      const ingenuos = t.linhas.map((l) => Math.max(1, Math.round(l.ideal)));
      const somaIngenua = t.linhas.reduce((s, l, i) => s + l.quantos * ingenuos[i]!, 0);
      const monotono = ingenuos.every((p, i) => i === 0 || p >= ingenuos[i - 1]!);
      if (somaIngenua !== t.alvo || !monotono) continue;
      const custoIngenuo = t.linhas.reduce((s, l, i) => s + l.quantos * (ingenuos[i]! - l.ideal) ** 2, 0);
      expect(custoDa(t)).toBeLessThanOrEqual(custoIngenuo + 1e-9);
    }
  });

  it("reserva sorteada: preço entre as linhas vizinhas, e nunca desce com a força", () => {
    for (const { semente, granularidade } of casos.slice(0, 40)) {
      const t = calcularTabela({ pool: poolSorteado(semente), ...DA_4A, granularidade });
      const reservas = poolSorteado(semente + 1, 12).sort((a, b) => classeDoElo(a, granularidade).forca - classeDoElo(b, granularidade).forca);
      let anterior = 0;
      for (const reserva of reservas) {
        const forca = classeDoElo(reserva, granularidade).forca;
        const p = precoNaTabela(t, reserva);
        const abaixo = t.linhas.filter((l) => l.classe.forca <= forca).at(-1);
        const acima = t.linhas.find((l) => l.classe.forca >= forca);
        if (abaixo) expect(p).toBeGreaterThanOrEqual(abaixo.pontos);
        if (acima) expect(p).toBeLessThanOrEqual(acima.pontos);
        expect(p).toBeGreaterThanOrEqual(anterior);
        anterior = p;
      }
    }
  });
});

// ---------------------------------------------------------------- o draft com estes preços

describe("o draft da 4ª montado com a tabela automática", () => {
  const id = (j: JogadorDoPool) => `j${String(j.posicao).padStart(2, "0")}`;

  function draftDa4a(): { estado: EstadoDraft; tabela: TabelaDePontos } {
    const tabela = tabelaDa4a();
    const jogadores: JogadorDoDraft[] = TITULARES_4A.map((j) => ({
      id: id(j),
      riotId: `Jogador${j.posicao}#BR1`,
      pontos: precoNaTabela(tabela, j),
      rota1: j.rota1,
      rota2: j.rota2,
      elo: j.elo,
      timeId: null,
    }));
    const ranking = rankingDeCapitaes(
      TITULARES_4A.map((j) => ({ id: id(j), riotId: `Jogador${j.posicao}#BR1`, organizador: j.organizador, elo: j.elo, eloRiot: j.eloRiot, divisao: j.divisao, pdl: j.pdl })),
      6,
    );
    expect(ranking.empateNoCorte).toBeNull();
    // Os seis maiores elos fora da organização: o Mestre 21 PDL e cinco Diamantes.
    expect(ranking.escolhidos.sort()).toEqual(["j04", "j05", "j08", "j22", "j28", "j29"]);
    const estado = montarDraft({
      times: ranking.escolhidos.map((capitaoId, i) => ({ id: `time-${i + 1}`, nome: `T${i + 1}`, cor: "#fff", capitaoId })),
      jogadores,
      jogadoresPorTime: 5,
      orcamentoPorTime: 30,
      segundosPorEscolha: 60,
    });
    return { estado, tabela };
  }

  /** Cada time com 5, gastando exatamente os 30, e a diferença de VALOR dentro do erro da tabela. */
  function conferirFim(e: EstadoDraft, tabela: TabelaDePontos) {
    expect(e.fase).toBe("encerrado");
    // A régua que a soma exata iguala é a de VALOR (curvada), não a de força em degraus: com
    // curvatura, dois times com 30 cada podem diferir em divisões somadas mais que isso.
    const valorPorId = new Map(TITULARES_4A.map((j) => [id(j), valorDaForca(classeDoElo(j).forca, tabela.curvatura)]));
    const valores: number[] = [];
    for (const t of e.times) {
      const elenco = e.jogadores.filter((j) => j.timeId === t.id);
      expect(elenco).toHaveLength(5);
      expect(elenco.reduce((s, j) => s + j.pontos, 0)).toBe(30);
      valores.push(elenco.reduce((s, j) => s + valorPorId.get(j.id)!, 0));
    }
    // O argumento central: preço = 1 + inclinação × (valor − valor do mais fraco) + erro, então
    // com gasto igual a soma de valor de dois times só difere pelo arredondamento — no máximo
    // 5 jogadores × 2 lados × o maior |preço − ideal|, convertido em valor pela inclinação.
    const maiorErro = Math.max(...tabela.linhas.map((l) => Math.abs(l.pontos - l.ideal)));
    expect(Math.max(...valores) - Math.min(...valores)).toBeLessThanOrEqual((10 * maiorErro) / tabela.reta.inclinacao + 1e-9);
  }

  it("com os capitães da regra, os elencos fecham já na montagem", () => {
    const { estado } = draftDa4a();
    expect(estadoFecha(estado, ORCAMENTO_DA_MONTAGEM)).toBe(true);
  });

  it("um draft inteiro só de auto-pick (o relógio estoura toda vez) chega ao fim sem travar", () => {
    const { estado, tabela } = draftDa4a();
    let e = iniciarDraft(estado, T0);
    for (let k = 1; k <= 24 && e.fase === "rodando"; k++) e = alcancarORelogio(e, T0 + k * 60_000 + 1);
    expect(e.motivoDaPausa).toBeUndefined();
    conferirFim(e, tabela);
  });

  it("drafts com escolhas sorteadas entre as que o motor oferece também nunca travam", () => {
    const { estado, tabela } = draftDa4a();
    for (const semente of [1, 2, 3]) {
      const sortear = rng(semente);
      let e = iniciarDraft(estado, T0);
      while (e.fase === "rodando") {
        const opcoes = escolhiveisDaVez(e);
        expect(opcoes.length, `semente ${semente}, escolha ${e.escolhaAtual}`).toBeGreaterThan(0);
        e = aplicarEscolha(e, timeDaVez(e)!, opcoes[Math.floor(sortear() * opcoes.length)]!, T0);
      }
      conferirFim(e, tabela);
    }
  }, 120_000);
});
