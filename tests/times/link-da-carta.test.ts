import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * A carta do elenco (components/times/pagina-do-time-com-tema.tsx) é clicável INTEIRA: o link
 * do nick estica um `::after` (`position: absolute; inset: 0`) até o `.miolo`, que é o bloco de
 * contenção. Qualquer coisa entre os dois que crie um bloco de contenção novo — filter,
 * transform e as propriedades individuais, perspective, contain, will-change, position — ou
 * que recorte o que passa dela (clip-path, mask, content-visibility) encolhe o `::after`.
 *
 * Foi o que aconteceu nos Galácticos do Bar (26/10/2026): um `filter: drop-shadow` no `.nick`
 * deixou só o texto do nick clicável (6–23% da carta); o «FICHA →» e a foto não abriam nada.
 *
 * Vale para os módulos da PÁGINA do time (a ficha tem outro nick, que não é pai de link).
 */

const PASTA = path.join(process.cwd(), "components", "times");
const ARQUIVOS = readdirSync(PASTA, { recursive: true })
  .map(String)
  .filter((f) => f.endsWith(".module.css") && !/ficha/.test(path.basename(f)))
  .map((f) => ({ nome: f, css: readFileSync(path.join(PASTA, f), "utf8").replace(/\/\*[\s\S]*?\*\//g, "") }));

/** Do `.miolo` até o link: o que fica no caminho do `::after`. */
const NO_CAMINHO = /\.(identidade|sobreFoto|nick|link)(?![\w-])/;
/*
 * O que vira bloco de contenção do `::after` (ou recorta/esconde o que passa dele). Medido na
 * página dos Galácticos (revisão de 26/10): cada uma destas, sozinha no nick ou na identidade,
 * deixava 0 de 10 pontos clicáveis — inclusive `position: relative`, que é o jeito "natural"
 * de ancorar um enfeite no nick. Com ou sem o prefixo -webkit-.
 */
const PROPRIEDADE =
  /(^|[\s;{])(?:-webkit-)?(filter|backdrop-filter|transform|translate|rotate|scale|perspective|contain|will-change|position|clip-path|mask|mask-image|content-visibility|transform-style)\s*:\s*([^;]+)/g;

function criaContencao(propriedade: string, valor: string): boolean {
  const v = valor.replace(/!important/, "").trim();
  switch (propriedade) {
    case "position":
      return v !== "static";
    case "content-visibility":
      return v !== "visible";
    case "transform-style":
      return v === "preserve-3d";
    case "contain":
      return /\b(layout|paint|strict|content)\b/.test(v);
    case "will-change":
      return /\b(transform|translate|rotate|scale|perspective|filter|backdrop-filter|contain|position)\b/.test(v);
    default:
      return !/^(none|auto|normal|initial|unset)$/.test(v);
  }
}

type Bloco = { seletor: string; corpo: string };

function analisar(css: string): { keyframes: Map<string, string>; regras: Bloco[] } {
  const keyframes = new Map<string, string>();
  const regras: Bloco[] = [];
  const visitar = (trecho: string) => {
    let i = 0;
    while (i < trecho.length) {
      const abre = trecho.indexOf("{", i);
      if (abre < 0) break;
      const cabeca = trecho.slice(i, abre).trim();
      let nivel = 1;
      let j = abre + 1;
      for (; j < trecho.length && nivel > 0; j++) {
        if (trecho[j] === "{") nivel++;
        else if (trecho[j] === "}") nivel--;
      }
      const corpo = trecho.slice(abre + 1, j - 1);
      const kf = /^@keyframes\s+([\w-]+)/.exec(cabeca);
      if (kf) keyframes.set(kf[1]!, corpo);
      else if (cabeca.startsWith("@")) visitar(corpo);
      else regras.push({ seletor: cabeca, corpo });
      i = j;
    }
  };
  visitar(css);
  return { keyframes, regras };
}

/** A regra mira, no ÚLTIMO seletor composto, uma peça do caminho (e não um ::after/::before dela)? */
function miraOCaminho(seletor: string): boolean {
  return seletor.split(",").some((s) => {
    // O que está dentro de :has()/:is()/:not() não é a peça que recebe a declaração.
    const ultimo = (s.trim().split(/\s+|>|\+|~/).filter(Boolean).at(-1) ?? "").replace(/\([^)]*\)/g, "");
    return NO_CAMINHO.test(ultimo) && !/::?(after|before)/.test(ultimo);
  });
}

describe.each(ARQUIVOS)("$nome", ({ css }) => {
  const { keyframes, regras } = analisar(css);

  it("nada entre a carta e o link cria bloco de contenção (a carta inteira continua clicável)", () => {
    const problemas: string[] = [];
    for (const r of regras.filter((regra) => miraOCaminho(regra.seletor))) {
      for (const m of r.corpo.matchAll(PROPRIEDADE)) {
        if (criaContencao(m[2]!, m[3]!)) problemas.push(`${r.seletor} → ${m[2]}: ${m[3]!.trim()}`);
      }
      // Animação que mexe em transform/filter também cria o bloco enquanto roda.
      for (const m of r.corpo.matchAll(/animation(?:-name)?\s*:\s*([^;]+)/g)) {
        for (const nome of m[1]!.split(/[\s,]+/)) {
          const kf = keyframes.get(nome);
          if (kf && /(^|[\s;{])(transform|translate|rotate|scale|filter)\s*:/.test(kf)) problemas.push(`${r.seletor} → animation ${nome}`);
        }
      }
    }
    expect(problemas).toEqual([]);
  });
});

it("achou os módulos da página do time", () => {
  expect(ARQUIVOS.map((a) => path.basename(a.nome))).toEqual(expect.arrayContaining([
      "tema.module.css",
      "boteco.module.css",
      "estacao.module.css",
      "academia.module.css",
      "album.module.css",
      "estande.module.css",
      "chamada.module.css",
      "picadeiro.module.css",
    ]));
});
