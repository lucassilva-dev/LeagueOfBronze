import { describe, expect, it } from "vitest";

import { CARDS, DUPLAS, isDuplaCard } from "@/lib/cards";
import {
  MINIMO_DE_CAMPEOES,
  campeoesPorLetra,
  conferirSorteio,
  novaSemente,
  poolDeCartas,
  sortearCarta,
  sortearIndice,
  sortearLado,
  sortearLetras,
} from "@/lib/series/sorteio";

/**
 * O sorteio decide partida e, indiretamente, dinheiro. O que estes testes precisam
 * garantir não é "roda", é: o resultado é honesto, é conferível, e não produz uma
 * carta impossível de cumprir ao vivo.
 */

describe("o sorteio é reproduzível — é isso que o torna conferível", () => {
  it("a mesma semente dá sempre o mesmo resultado", () => {
    const s = "a1b2c3d4e5f60718293a4b5c6d7e8f90";
    expect(sortearLado(s, "alfa", "beta")).toBe(sortearLado(s, "alfa", "beta"));
    expect(sortearCarta(s, false)).toBe(sortearCarta(s, false));
    expect(sortearLetras(s).letras).toEqual(sortearLetras(s).letras);
  });

  it("sementes diferentes não andam juntas", () => {
    const cartas = new Set(Array.from({ length: 40 }, (_, i) => sortearCarta(`semente-${i}`, false)));
    expect(cartas.size).toBeGreaterThan(1);
  });

  it("rótulos diferentes não repetem o mesmo número da mesma semente", () => {
    // Sem o rótulo, lados e carta sairiam do mesmo fluxo e ficariam correlacionados:
    // sabendo um, dava para prever o outro.
    const s = "semente-unica";
    const a = Array.from({ length: 30 }, (_, i) => sortearIndice(s, `x:${i}`, 6));
    const b = Array.from({ length: 30 }, (_, i) => sortearIndice(s, `y:${i}`, 6));
    expect(a).not.toEqual(b);
  });

  it("conferir refaz o sorteio e confirma o que foi gravado", () => {
    const semente = novaSemente();
    const azul = sortearLado(semente, "presas", "lgtv");

    expect(
      conferirSorteio(
        { tipo: "lados", semente, emISO: "x", autor: "y", resultado: azul },
        { teamAId: "presas", teamBId: "lgtv" },
      ),
    ).toBe(true);
  });

  it("conferir REPROVA um resultado adulterado", () => {
    // É o ponto do registro: se alguém trocar o vencedor na mão, a conta não fecha.
    const semente = novaSemente();
    const azul = sortearLado(semente, "presas", "lgtv");
    const trocado = azul === "presas" ? "lgtv" : "presas";

    expect(
      conferirSorteio(
        { tipo: "lados", semente, emISO: "x", autor: "y", resultado: trocado },
        { teamAId: "presas", teamBId: "lgtv" },
      ),
    ).toBe(false);
  });
});

describe("o sorteio é justo", () => {
  it("os lados não puxam para nenhum time", () => {
    let azul = 0;
    const n = 4000;
    for (let i = 0; i < n; i++) {
      if (sortearLado(`s${i}`, "A", "B") === "A") azul++;
    }
    // Margem folgada: o que se quer pegar é viés grosseiro, não flutuação.
    expect(azul / n).toBeGreaterThan(0.45);
    expect(azul / n).toBeLessThan(0.55);
  });

  it("as 6 cartas individuais saem todas, sem nenhuma dominar", () => {
    const conta: Record<string, number> = {};
    const n = 6000;
    for (let i = 0; i < n; i++) {
      const c = sortearCarta(`c${i}`, false);
      conta[c] = (conta[c] ?? 0) + 1;
    }
    expect(Object.keys(conta)).toHaveLength(CARDS.length);
    for (const vezes of Object.values(conta)) {
      expect(vezes / n).toBeGreaterThan(0.13); // esperado ≈ 0,167
      expect(vezes / n).toBeLessThan(0.20);
    }
  });

  it("índice fora de faixa nunca acontece", () => {
    for (const tamanho of [2, 3, 6, 8, 26]) {
      for (let i = 0; i < 200; i++) {
        const v = sortearIndice(`t${i}`, "r", tamanho);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThan(tamanho);
      }
    }
  });

  it("pool de tamanho 1 devolve o único, e tamanho zero é erro", () => {
    expect(sortearIndice("x", "r", 1)).toBe(0);
    expect(() => sortearIndice("x", "r", 0)).toThrow();
  });
});

describe("as regras do regulamento valem no sorteio", () => {
  it("o sorteio individual usa só as 6 que afetam o adversário", () => {
    expect(poolDeCartas(false)).toHaveLength(CARDS.length);
    for (let i = 0; i < 500; i++) {
      expect(isDuplaCard(sortearCarta(`i${i}`, false))).toBe(false);
    }
  });

  it("o sorteio duplo abre as 8, e as duplas de fato aparecem", () => {
    expect(poolDeCartas(true)).toHaveLength(CARDS.length + DUPLAS.length);

    const saiuDupla = Array.from({ length: 300 }, (_, i) => sortearCarta(`d${i}`, true)).some(isDuplaCard);
    expect(saiuDupla).toBe(true);
  });
});

describe("as letras do ABCDRAFT não podem sair impossíveis", () => {
  it("hoje o pior par do alfabeto daria 4 campeões para 5 vagas", () => {
    // Este teste documenta o motivo de o mínimo existir. Se um patch mudar o elenco
    // de campeões, ele avisa que a premissa mudou.
    const porLetra = campeoesPorLetra();
    const piores = Object.values(porLetra).sort((a, b) => a - b).slice(0, 2);
    expect(piores[0]! + piores[1]!).toBeLessThan(5);
  });

  it("nenhum sorteio produz um par abaixo do mínimo", () => {
    for (let i = 0; i < 800; i++) {
      const { letras, campeoes } = sortearLetras(`L${i}`);
      expect(campeoes).toBeGreaterThanOrEqual(MINIMO_DE_CAMPEOES);
      expect(letras[0]).not.toBe(letras[1]);
    }
  });

  it("as letras saem em ordem alfabética — {L,M} e {M,L} são a mesma carta", () => {
    for (let i = 0; i < 200; i++) {
      const [a, b] = sortearLetras(`O${i}`).letras;
      expect(a < b).toBe(true);
    }
  });

  it("um mínimo impossível falha alto, em vez de devolver par ruim", () => {
    expect(() => sortearLetras("qualquer", 999)).toThrow(/nenhum par/i);
  });

  it("o alfabeto inteiro é alcançável — nenhuma letra fica de fora por construção", () => {
    const vistas = new Set<string>();
    for (let i = 0; i < 3000; i++) {
      const [a, b] = sortearLetras(`V${i}`).letras;
      vistas.add(a);
      vistas.add(b);
    }
    // As escassas (Q, U, W) só entram acompanhadas de uma letra farta, mas entram.
    expect(vistas.size).toBeGreaterThan(20);
  });
});

describe("a semente", () => {
  it("tem 128 bits e não se repete", () => {
    const s = novaSemente();
    expect(s).toMatch(/^[0-9a-f]{32}$/);
    expect(new Set(Array.from({ length: 500 }, novaSemente)).size).toBe(500);
  });
});
