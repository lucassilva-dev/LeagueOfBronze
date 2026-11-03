import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { transform } from "lightningcss";
import { describe, expect, it } from "vitest";

/**
 * O CSS DO SHOW DO SORTEIO (página da partida + cerimônia) segue as regras da casa, conferidas
 * na estrutura do arquivo — não no olho:
 *
 *  1. ANIMAÇÃO NÃO DECIDE SE O CONTEÚDO APARECE. Animar opacidade já apagou o site quatro vezes
 *     (tests/draft/animacoes-sem-opacidade.test.ts conta a história). Keyframe que mexe em
 *     opacidade, filtro, visibilidade ou clip-path só pode ser usado por ENFEITE — regra cujo
 *     último seletor começa com `.enf` (aria-hidden, sem texto). Numa transmissão isso vale em
 *     dobro: o OBS captura a aba e, se o relógio de animação parar, o resultado do sorteio tem
 *     de continuar na tela.
 *  2. Conteúdo não usa fill-mode (é ele que prende o 1º quadro com a aba em segundo plano) nem
 *     animation-delay (a espera mora dentro do keyframe).
 *  3. Transição nomeia a propriedade — nunca opacity, filter nem all.
 *  4. Há um bloco de movimento reduzido.
 *  5. O minificador do build (lightningcss) não descarta translate/rotate/scale: ele apaga
 *     `translate:` ao lado de um `transform:` literal, e a prévia (que não minifica) não mostra.
 */

const PASTAS = ["components/series", "components/partida"].map((p) => path.join(process.cwd(), p));

const ARQUIVOS = PASTAS.filter((p) => existsSync(p)).flatMap((pasta) =>
  readdirSync(pasta, { recursive: true })
    .map(String)
    .filter((f) => f.endsWith(".module.css"))
    .map((f) => {
      const bruto = readFileSync(path.join(pasta, f), "utf8");
      return { nome: path.relative(process.cwd(), path.join(pasta, f)), bruto, css: bruto.replace(/\/\*[\s\S]*?\*\//g, "") };
    }),
);

const ESCONDE = /(^|[\s;{])(opacity|filter|visibility|clip-path)\s*:/;

type Bloco = { seletor: string; corpo: string; media: string };

function analisar(css: string): { keyframes: Map<string, string>; regras: Bloco[]; medias: string[] } {
  const keyframes = new Map<string, string>();
  const regras: Bloco[] = [];
  const medias: string[] = [];
  const visitar = (trecho: string, media: string) => {
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
      else if (cabeca.startsWith("@")) {
        medias.push(cabeca);
        visitar(corpo, cabeca);
      } else regras.push({ seletor: cabeca, corpo, media });
      i = j;
    }
  };
  visitar(css, "");
  return { keyframes, regras, medias };
}

function animacoesDa(corpo: string, nomes: ReadonlySet<string>): string[] {
  const usados: string[] = [];
  for (const m of corpo.matchAll(/animation(?:-name)?\s*:\s*([^;]+)/g)) {
    for (const parte of m[1]!.split(",")) {
      const nome = parte.trim().split(/\s+/).find((p) => nomes.has(p));
      if (nome) usados.push(nome);
    }
  }
  return usados;
}

/** O último seletor composto de cada seletor da lista começa com `.enf` (ou é um ::before dele)? */
function ehEnfeite(seletor: string): boolean {
  return seletor.split(",").every((s) => {
    const partes = s.trim().split(/\s+|>|\+|~/).filter(Boolean);
    return /^\.enf/.test(partes.at(-1) ?? "");
  });
}

describe("o show do sorteio tem CSS próprio", () => {
  it("achou os módulos da página e da cerimônia", () => {
    expect(ARQUIVOS.length).toBeGreaterThanOrEqual(2);
  });
});

describe.each(ARQUIVOS)("$nome", ({ nome, bruto, css }) => {
  const { keyframes, regras, medias } = analisar(css);
  const nomes = new Set(keyframes.keys());

  it("keyframe que esconde (opacidade, filtro, visibilidade, clip-path) só em enfeite", () => {
    const problemas: string[] = [];
    for (const regra of regras) {
      for (const k of animacoesDa(regra.corpo, nomes)) {
        if (ESCONDE.test(keyframes.get(k)!) && !ehEnfeite(regra.seletor)) problemas.push(`${regra.seletor} → ${k}`);
      }
    }
    expect(problemas).toEqual([]);
  });

  it("conteúdo sem fill-mode", () => {
    const problemas = regras
      .filter(
        (r) =>
          !ehEnfeite(r.seletor) &&
          /animation/.test(r.corpo) &&
          /\b(both|forwards|backwards)\b|animation-fill-mode/.test(r.corpo),
      )
      .map((r) => r.seletor);
    expect(problemas).toEqual([]);
  });

  it("conteúdo sem animation-delay", () => {
    const problemas: string[] = [];
    for (const r of regras) {
      if (ehEnfeite(r.seletor)) continue;
      for (const m of r.corpo.matchAll(/animation-delay\s*:\s*([^;]+)/g)) {
        if (!/^\s*0m?s\s*$/.test(m[1]!)) problemas.push(`${r.seletor} → animation-delay: ${m[1]!.trim()}`);
      }
      for (const m of r.corpo.matchAll(/(?:^|[\s;])animation\s*:\s*([^;]+)/g)) {
        for (const parte of m[1]!.split(",")) {
          const k = parte.trim().split(/\s+/).find((p) => nomes.has(p));
          const tempos = parte.match(/(^|\s)-?[\d.]+m?s\b/g) ?? [];
          if (k && tempos.length >= 2) problemas.push(`${r.seletor} → ${parte.trim()}`);
        }
      }
    }
    expect(problemas).toEqual([]);
  });

  it("transição sempre com a propriedade nomeada, nunca opacity, filter ou all", () => {
    for (const regra of regras) {
      for (const m of regra.corpo.matchAll(/transition\s*:\s*([^;]+)/g)) {
        for (const parte of m[1]!.split(",")) {
          const propriedade = parte.trim().split(/\s+/)[0]!;
          expect(propriedade, `${regra.seletor}: ${parte}`).not.toMatch(/^(opacity|filter|all)$/);
          expect(propriedade, `${regra.seletor}: ${parte}`).not.toMatch(/^[\d.]+m?s$/);
        }
      }
    }
  });

  it("tem bloco de movimento reduzido (quando anima alguma coisa)", () => {
    if (nomes.size === 0) return;
    expect(medias.some((m) => /prefers-reduced-motion/.test(m))).toBe(true);
  });

  it("o minificador do build mantém todo translate/rotate/scale", () => {
    const minificado = transform({
      filename: nome,
      code: Buffer.from(bruto),
      minify: true,
      cssModules: true,
    }).code.toString();
    const contar = (texto: string, prop: string) =>
      [...texto.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(new RegExp(`(^|[\\s;{])${prop}\\s*:`, "g"))].length;
    for (const prop of ["translate", "rotate", "scale"]) {
      expect({ prop, depois: contar(minificado, prop) }).toEqual({ prop, depois: contar(bruto, prop) });
    }
  });
});
