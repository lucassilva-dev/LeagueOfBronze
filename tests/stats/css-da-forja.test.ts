import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { transform } from "lightningcss";
import { describe, expect, it } from "vitest";

/**
 * O CSS da /stats («A Forja») e da cartinha de /cartas, que agora divide o motor de inclinação
 * com ela, segue as regras da casa — as mesmas dos temas dos times
 * (tests/times/temas-sem-opacidade.test.ts conta as vezes em que animar opacidade apagou o site):
 *
 *  - ANIMAÇÃO NÃO DECIDE SE O CONTEÚDO APARECE. Keyframe que mexe em opacidade, filtro,
 *    visibilidade ou clip-path só em ENFEITE: regra cujo último seletor começa com `.enf`
 *    (aria-hidden, sem texto). Conteúdo anima transform e cor, sem fill-mode e sem
 *    animation-delay (a espera mora dentro do keyframe);
 *  - transição com a propriedade nomeada; `all` nunca; opacity/filter/visibility só em enfeite;
 *  - nada de `translate:` / `rotate:` / `scale:` soltos: o minificador do build (lightningcss)
 *    descarta o `translate` que divide a regra com um `transform` — em dev, que não minifica,
 *    tudo parece certo (tests/times/css-do-build.test.ts);
 *  - quem anima tem o bloco de movimento reduzido;
 *  - TRANSMISSÃO: fora das regras de tela pequena, nenhum texto abaixo de 15px.
 */

const RAIZ = process.cwd();
const PASTA = path.join(RAIZ, "components", "stats");
const CAMINHOS = [
  ...readdirSync(PASTA, { recursive: true })
    .map(String)
    .filter((f) => f.endsWith(".module.css"))
    .map((f) => path.join("components", "stats", f)),
  path.join("components", "lob", "tcg-card.module.css"),
];
const ARQUIVOS = CAMINHOS.map((caminho) => ({
  nome: caminho.replaceAll("\\", "/"),
  fonte: readFileSync(path.join(RAIZ, caminho), "utf8"),
  css: readFileSync(path.join(RAIZ, caminho), "utf8").replace(/\/\*[\s\S]*?\*\//g, ""),
}));

const ESCONDE = /(^|[\s;{])(opacity|filter|visibility|clip-path)\s*:/;

type Bloco = { seletor: string; corpo: string; telaPequena: boolean };

/** Os @keyframes e os blocos de regra mais internos (dentro de @media/@supports também). */
function analisar(css: string): { keyframes: Map<string, string>; regras: Bloco[] } {
  const keyframes = new Map<string, string>();
  const regras: Bloco[] = [];
  const visitar = (trecho: string, telaPequena: boolean) => {
    let i = 0;
    while (i < trecho.length) {
      const abre = trecho.indexOf("{", i);
      if (abre < 0) break;
      const cabeca = trecho.slice(i, abre).trim();
      let nivel = 1;
      let j = abre + 1;
      for (; j < trecho.length && nivel > 0; j += 1) {
        if (trecho[j] === "{") nivel += 1;
        else if (trecho[j] === "}") nivel -= 1;
      }
      const corpo = trecho.slice(abre + 1, j - 1);
      const kf = /^@keyframes\s+([\w-]+)/.exec(cabeca);
      if (kf) keyframes.set(kf[1]!, corpo);
      else if (cabeca.startsWith("@")) visitar(corpo, telaPequena || /max-width/.test(cabeca));
      else regras.push({ seletor: cabeca, corpo, telaPequena });
      i = j;
    }
  };
  visitar(css, false);
  return { keyframes, regras };
}

/** Os nomes de keyframe que uma regra usa (animation-name ou o nome conhecido do shorthand). */
function animacoesDa(corpo: string, nomes: ReadonlySet<string>): string[] {
  const usados: string[] = [];
  for (const m of corpo.matchAll(/animation(?:-name)?\s*:\s*([^;]+)/g)) {
    for (const parte of m[1]!.split(",")) {
      const nome = parte
        .trim()
        .split(/\s+/)
        .find((p) => nomes.has(p));
      if (nome) usados.push(nome);
    }
  }
  return usados;
}

/** O último seletor composto de cada seletor da lista começa com `.enf`? */
function ehEnfeite(seletor: string): boolean {
  return seletor.split(",").every((s) => {
    const partes = s
      .trim()
      .split(/\s+|>|\+|~/)
      .filter(Boolean);
    return /^\.enf/.test(partes.at(-1) ?? "");
  });
}

/** Tira o que está dentro de calc()/var()/cubic-bezier(): os tempos de lá não são um 2º tempo. */
function semFuncoes(texto: string): string {
  let antes = "";
  let atual = texto;
  while (antes !== atual) {
    antes = atual;
    atual = atual.replace(/[\w-]+\([^()]*\)/g, "F");
  }
  return atual;
}

it("achou os módulos da Forja", () => {
  expect(ARQUIVOS.length).toBeGreaterThanOrEqual(15);
});

describe.each(ARQUIVOS)("$nome", ({ nome, css, fonte }) => {
  const { keyframes, regras } = analisar(css);
  const nomes = new Set(keyframes.keys());

  it("keyframe que esconde (opacidade, filtro, visibilidade, clip-path) só em enfeite", () => {
    const problemas: string[] = [];
    for (const regra of regras) {
      for (const kf of animacoesDa(regra.corpo, nomes)) {
        if (ESCONDE.test(keyframes.get(kf)!) && !ehEnfeite(regra.seletor)) problemas.push(`${regra.seletor} → ${kf}`);
      }
    }
    expect(problemas).toEqual([]);
  });

  it("conteúdo sem fill-mode e sem animation-delay", () => {
    const problemas: string[] = [];
    for (const r of regras) {
      if (ehEnfeite(r.seletor) || !/animation/.test(r.corpo)) continue;
      if (/animation-fill-mode|animation-delay\s*:\s*(?!0m?s\s*(;|$))/.test(r.corpo)) problemas.push(`${r.seletor} → fill-mode/delay`);
      for (const m of r.corpo.matchAll(/(?:^|[\s;])animation\s*:\s*([^;]+)/g)) {
        for (const parte of semFuncoes(m[1]!).split(",")) {
          if (/\b(both|forwards|backwards)\b/.test(parte)) problemas.push(`${r.seletor} → ${parte.trim()}`);
          // dois tempos no shorthand = duração + espera
          if ((parte.match(/(^|\s)-?[\d.]+m?s\b/g) ?? []).length >= 2) problemas.push(`${r.seletor} → espera fora do keyframe: ${parte.trim()}`);
        }
      }
    }
    expect(problemas).toEqual([]);
  });

  it("transição com a propriedade nomeada; opacity, filter e visibility só em enfeite; all nunca", () => {
    const problemas: string[] = [];
    for (const regra of regras) {
      for (const m of regra.corpo.matchAll(/transition\s*:\s*([^;]+)/g)) {
        for (const parte of semFuncoes(m[1]!).split(",")) {
          const propriedade = parte.trim().split(/\s+/)[0]!;
          if (propriedade === "none") continue;
          if (propriedade === "all" || /^[\d.]+m?s$/.test(propriedade)) problemas.push(`${regra.seletor}: ${parte.trim()}`);
          if (/^(opacity|filter|visibility|clip-path)$/.test(propriedade) && !ehEnfeite(regra.seletor)) problemas.push(`${regra.seletor}: ${parte.trim()}`);
        }
      }
    }
    expect(problemas).toEqual([]);
  });

  it("nenhum translate / rotate / scale solto (só `transform`)", () => {
    const soltos = [...css.matchAll(/(^|[\s;{])(translate|rotate|scale)\s*:/g)].map((m) => m[2]);
    expect(soltos).toEqual([]);
  });

  it("quem anima tem o bloco de movimento reduzido", () => {
    const anima = regras.some((r) => /(^|[\s;])(animation|transition)\s*:/.test(r.corpo) && !/(animation|transition)\s*:\s*none/.test(r.corpo));
    if (anima) expect(css).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  });

  it("o minificador do build aceita o arquivo", () => {
    expect(() => transform({ filename: nome, code: Buffer.from(fonte), minify: true, cssModules: true })).not.toThrow();
  });

  // A página passa em transmissão ao vivo: texto miúdo vira borrão na compressão do vídeo.
  // A carta do jogador mede em cqi (cresce com a carta) e fica fora desta régua, assim como as
  // regras de tela pequena (ninguém transmite o celular).
  it("transmissão: nenhum texto abaixo de 15px fora das regras de tela pequena", () => {
    if (nome.endsWith("carta.module.css") || nome.endsWith("tcg-card.module.css") || nome.endsWith("planilha.module.css")) return;
    const problemas: string[] = [];
    for (const r of regras) {
      if (r.telaPequena) continue;
      for (const m of r.corpo.matchAll(/font-size\s*:\s*([^;]+)/g)) {
        const valor = m[1]!.trim();
        const fixo = /^([\d.]+)px$/.exec(valor);
        const piso = /^clamp\(\s*([\d.]+)px/.exec(valor);
        const px = fixo ? Number(fixo[1]) : piso ? Number(piso[1]) : null;
        if (px !== null && px < 15) problemas.push(`${r.seletor} → ${valor}`);
      }
    }
    expect(problemas).toEqual([]);
  });
});
