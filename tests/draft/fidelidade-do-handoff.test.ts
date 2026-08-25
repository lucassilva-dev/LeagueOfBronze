import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { CORES_DOS_TIMES, D, DISPLAY, alfa, emblemaDeElo } from "@/lib/draft/design";

/**
 * FIDELIDADE AO HANDOFF DE DESIGN DA TRANSMISSÃO.
 *
 * Este arquivo existe por causa de um erro que passou despercebido por semanas: a tela do
 * draft foi construída com o design system do site (`.lob-card`, `var(--lob-*)`) em vez do
 * pacote de design entregue para ela. O resultado era coerente com o resto do site e
 * completamente diferente do combinado — e "diferente do combinado" é uma coisa que só o
 * cliente percebe, olhando.
 *
 * Uma conferência objetiva mostrou o tamanho do buraco: das cores do handoff, ZERO
 * apareciam no componente, e 9 dos 10 elementos especificados não existiam.
 *
 * Estes testes não julgam se está bonito — julgam se o que foi ESPECIFICADO está lá. É a
 * diferença entre "achei parecido" e "confere".
 */

const componente = readFileSync(
  path.join(process.cwd(), "components", "draft", "transmissao.tsx"),
  "utf8",
);
const css = readFileSync(path.join(process.cwd(), "app", "globals.css"), "utf8");

describe("a paleta é a do handoff", () => {
  it("as cores base estão nos tokens, com os valores exatos", () => {
    expect(D.fundo).toBe("#0a0705");
    expect(D.painel).toBe("linear-gradient(150deg,#1a100b,#130c08)");
    expect(D.painelColuna).toBe("linear-gradient(160deg,#1a100b,#0f0a07)");
    expect(D.ouro).toBe("#efa63f");
    expect(D.urgente).toBe("#ff5b4d");
    expect(D.titulo).toBe("#f7e7d2");
    expect(D.borda).toBe("#33201a");
    expect(D.ctaFundo).toBe("linear-gradient(150deg,#f7bd5c,#d0731f)");
  });

  it("as 6 cores de time são as fixas do handoff, na ordem", () => {
    // A ordem é a ordem dos times: CHAMA, ÁUREA, VERDANTE, GÉLIDA, ARCANA, CARMESIM.
    expect([...CORES_DOS_TIMES]).toEqual([
      "#ef7d34",
      "#e0b13c",
      "#3fb27f",
      "#45a8d8",
      "#9a6ae0",
      "#d9455f",
    ]);
  });

  it("a tipografia de display é a especificada", () => {
    expect(DISPLAY).toContain("Chakra Petch");
  });
});

describe("os elementos especificados existem de verdade na tela", () => {
  /*
   * Cada linha aqui é um item do handoff que NÃO existia na primeira versão. Procurar no
   * texto do componente é grosseiro, mas pega exatamente a falha que aconteceu: alguém
   * reescrever a tela e deixar um bloco para trás.
   */
  const exigidos: ReadonlyArray<readonly [string, string]> = [
    ["hexágono da tela vazia", "clipPath"],
    ["rolagem de nomes no sorteio", "lobdSpinNames"],
    ["pulso do time da vez", "lobdPulse"],
    ["brilho do chip da vez", "lobdGlow"],
    ["cronômetro de urgência", "lobdUrgent"],
    ["entrada do bloco do sorteio", "lobdRise"],
    ["revelação com slam", "lobdSlam"],
    ["clarão da revelação", "lobdFlash"],
    ["brilho do título final", "lobdSheen"],
    ["confete do fim", "lobdConfetti"],
    ["modo TV", "lobd-tv"],
    ["barra de orçamento por time", "cubic-bezier(.22,1,.36,1)"],
  ];

  for (const [nome, marca] of exigidos) {
    it(`tem ${nome}`, () => {
      expect(componente.includes(marca), `"${marca}" não aparece em transmissao.tsx`).toBe(true);
    });
  }
});

describe("os keyframes existem no CSS, com os tempos do handoff", () => {
  const nomes = [
    "lobdSheen",
    "lobdPulse",
    "lobdRise",
    "lobdSlam",
    "lobdFlash",
    "lobdConfetti",
    "lobdSpinNames",
    "lobdUrgent",
    "lobdGlow",
  ];

  for (const n of nomes) {
    it(`@keyframes ${n}`, () => {
      expect(css.includes(`@keyframes ${n}`), `falta @keyframes ${n}`).toBe(true);
    });
  }

  it("nenhum deles colide com um keyframe que já existia no site", () => {
    /*
     * O handoff pede os nomes sem prefixo, mas `lobGlow` JÁ EXISTE neste CSS com outra
     * definição (opacidade, usada no brilho das seções). Duas regras com o mesmo nome:
     * a última vence, e o site quebraria num lugar sem relação nenhuma com o draft.
     */
    expect(css.includes("@keyframes lobGlow")).toBe(true); // o antigo continua lá
    expect(css.includes("@keyframes lobdGlow")).toBe(true); // e o do draft, separado
  });
});

describe("as transparências por sufixo", () => {
  it("concatenam quando a cor é hexadecimal de 6 dígitos", () => {
    expect(alfa("#ef7d34", "66")).toBe("#ef7d3466");
    expect(alfa("#ef7d34", "1f")).toBe("#ef7d341f");
  });

  it("NÃO concatenam quando a cor não é hexadecimal", () => {
    // `"red" + "66"` produz uma cor inválida, que o navegador descarta em silêncio —
    // a borda simplesmente some, e ninguém liga o sumiço à cor vinda do banco.
    expect(alfa("red", "66")).toBe("red");
    expect(alfa("var(--x)", "66")).toBe("var(--x)");
  });
});

describe("os emblemas de elo", () => {
  it("apontam para os PNGs locais, e não para o site de produção", () => {
    // O handoff aponta para league-of-bronze.vercel.app. Servir de lá deixaria o ambiente
    // de teste dependendo da produção — e a CSP do site só permite img de 'self'.
    const estilo = emblemaDeElo("diamante", 26);
    expect(estilo.backgroundImage).toBe("url(/elo/diamante.png)");
    expect(estilo.backgroundSize).toBe("contain");
    expect(estilo.width).toBe(26);
  });
});
