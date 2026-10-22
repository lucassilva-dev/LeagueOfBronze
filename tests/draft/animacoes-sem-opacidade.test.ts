import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * ANIMAÇÃO NÃO DECIDE SE O CONTEÚDO APARECE.
 *
 * Animar opacidade já apagou o site quatro vezes: com fill-mode `both` o elemento fica
 * preso no primeiro quadro (opacity 0) enquanto o relógio de animação não anda — aba em
 * segundo plano, navegador economizando bateria, captura no primeiro quadro. No draft, os
 * dois keyframes de conteúdo faziam exatamente isso:
 *
 *  - `lobdSlam`, o cartão da REVELAÇÃO (nick, pontos, time), com `both` e opacity 0;
 *  - `lobdRise`, a frase da ordem serpentina, idem.
 *
 * Numa TV com a aba da transmissão atrás do OBS, a plateia via o cartão vazio. E o número
 * da contagem da cerimônia de sorteio (`lobCerContagem`) nascia a 0.15 de opacidade.
 *
 * Fica permitido animar opacidade SÓ nos enfeites `aria-hidden` e sem texto (a lista
 * abaixo). Enfeite novo com opacidade entra na lista de propósito, não por descuido.
 */

const raiz = process.cwd();
const css = readFileSync(path.join(raiz, "app", "globals.css"), "utf8");
const transmissao = readFileSync(path.join(raiz, "components", "draft", "transmissao.tsx"), "utf8");
const painelDoCapitao = readFileSync(path.join(raiz, "components", "draft", "painel-capitao.tsx"), "utf8");

/** O corpo de cada @keyframes do CSS global, pelo nome (casando as chaves). */
function keyframes(): Map<string, string> {
  const mapa = new Map<string, string>();
  const re = /@keyframes\s+([\w-]+)\s*\{/g;
  let achado: RegExpExecArray | null;
  while ((achado = re.exec(css))) {
    let nivel = 1;
    let i = re.lastIndex;
    for (; i < css.length && nivel > 0; i++) {
      if (css[i] === "{") nivel++;
      else if (css[i] === "}") nivel--;
    }
    mapa.set(achado[1]!, css.slice(re.lastIndex, i - 1));
  }
  return mapa;
}

/** Propriedade que pode esconder o conteúdo se a animação parar no meio. */
const ESCONDE = /(^|[\s;{])(opacity|filter|visibility)\s*:/;

/** Os únicos keyframes com opacidade: todos em enfeite `aria-hidden`, sem texto. */
const ENFEITES = new Set([
  "lobGlow", // não usado em lugar nenhum hoje
  "lobdPulse", // quadradinho ao lado do time da vez (nasce opaco)
  "lobdFlash", // clarão radial atrás da revelação
  "lobdConfetti", // confete do fim do draft
  "lobCerPulso", // anel de brilho atrás da roleta
  "lobCerConfete", // confete da cerimônia
  "lobCerFaisca", // parafusos do aro da roleta
]);

describe("keyframes de conteúdo animam só transform", () => {
  const todos = keyframes();

  it.each(["lobdRise", "lobdSlam", "lobCerContagem", "fadeUp"])("%s", (nome) => {
    const corpo = todos.get(nome);
    expect(corpo, `@keyframes ${nome} sumiu do CSS`).toBeDefined();
    expect(corpo).toContain("transform");
    expect(corpo, `@keyframes ${nome} voltou a animar opacidade/filtro`).not.toMatch(ESCONDE);
  });

  it("opacidade ou filtro animados só nos enfeites conhecidos", () => {
    const comOpacidade = [...todos].filter(([, corpo]) => ESCONDE.test(corpo)).map(([nome]) => nome);
    expect(comOpacidade.filter((nome) => !ENFEITES.has(nome))).toEqual([]);
  });
});

describe("na transmissão, o que anima opacidade é enfeite", () => {
  const todos = keyframes();
  const usos = [...transmissao.matchAll(/animation:\s*[`"]([\w-]+)[^`"]*[`"]/g)].map((m) => ({
    nome: m[1]!,
    declaracao: m[0],
    onde: m.index,
  }));

  it("acha as animações do componente (o teste não está olhando para o vazio)", () => {
    expect(usos.map((u) => u.nome)).toEqual(
      expect.arrayContaining(["lobdRise", "lobdSlam", "lobdPulse", "lobdFlash", "lobdConfetti"]),
    );
  });

  it("toda animação com opacidade está num elemento aria-hidden", () => {
    for (const uso of usos) {
      const corpo = todos.get(uso.nome) ?? "";
      if (!ESCONDE.test(corpo)) continue;
      // A tag que abre o elemento deste estilo: o último "<span"/"<div" antes da declaração.
      const abertura = Math.max(transmissao.lastIndexOf("<span", uso.onde), transmissao.lastIndexOf("<div", uso.onde));
      const tag = transmissao.slice(abertura, uso.onde);
      expect(ENFEITES.has(uso.nome), `${uso.nome} anima opacidade e não é enfeite`).toBe(true);
      expect(tag, `${uso.declaracao} anima opacidade num elemento que não é aria-hidden`).toContain("aria-hidden");
    }
  });

  it("revelação e frase da serpentina continuam com o fill-mode do handoff, agora sem risco", () => {
    // O `both` fica (o handoff pede), porque o primeiro quadro deles agora é só deslocamento.
    expect(transmissao).toMatch(/animation: "lobdSlam [^"]*both"/);
    expect(transmissao).toMatch(/animation: "lobdRise [^"]*both"/);
    expect(todos.get("lobdSlam")).not.toMatch(ESCONDE);
    expect(todos.get("lobdRise")).not.toMatch(ESCONDE);
  });
});

describe("transições nomeiam as propriedades, e nenhuma é de opacidade ou filtro", () => {
  it("no CSS global", () => {
    const declaracoes = [...css.matchAll(/(^|[\s;{])transition\s*:([^;]*);/g)].map((m) => m[2]!.trim());
    expect(declaracoes.length).toBeGreaterThan(3);
    for (const valor of declaracoes) {
      expect(valor, `transition: ${valor}`).not.toMatch(/opacity|filter|\ball\b/);
    }
  });

  it("o botão dourado: o clarear do hover não entra na transição", () => {
    const inicio = css.indexOf(".lob-btn-gold {");
    const regra = css.slice(inicio, css.indexOf("}", inicio));
    expect(regra).toMatch(/transition: transform 0\.2s ease;/);
    expect(regra).not.toMatch(/transition:[^;]*filter/);
  });

  it("nos estilos inline do draft (nada de `transition: \".4s\"`, que é `all`)", () => {
    for (const [arquivo, texto] of [
      ["transmissao.tsx", transmissao],
      ["painel-capitao.tsx", painelDoCapitao],
    ] as const) {
      for (const m of texto.matchAll(/transition:\s*[`"]([^`"]*)[`"]/g)) {
        const valor = m[1]!.trim();
        expect(valor, `${arquivo}: transition "${valor}" sem propriedade nomeada`).toMatch(/^[a-z]/);
        expect(valor, `${arquivo}: transition "${valor}"`).not.toMatch(/opacity|filter|\ball\b/);
      }
    }
  });
});
