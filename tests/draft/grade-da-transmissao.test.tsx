// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import path from "node:path";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MESSAGES } from "@/lib/i18n/messages";

/**
 * DIFF-UI-05 — a grade dos times da transmissão não perde time na TV.
 *
 * A correção do celular (DRF-01) trocou as N colunas fixas por
 * `repeat(auto-fit, minmax(180px, 1fr))` em QUALQUER largura. Com 22px de respiro e 8px de
 * vão, 6 trilhas pedem 1164px: entre 976 e 1163px (projetor 1024×768, notebook com o OBS
 * ao lado) cabiam 5, e o 6º time descia para uma 2ª linha. A página da TV só cresce para
 * baixo e ninguém rola a TV — o 6º time e as escolhas dele saíam da transmissão.
 *
 * Agora: de 900px para cima, N colunas (classe `.lobd-grade-times` + variável `--times`,
 * em app/globals.css); abaixo disso, o auto-fit do celular.
 *
 * O jsdom não faz layout de grid nem aplica @media. Então, como a prova da auditoria, a
 * conta é a do PRÓPRIO CSS: o molde e o corte saem de app/globals.css, o N, o vão e o
 * respiro saem do estilo que o componente põe na grade.
 */

const { default: Transmissao } = await import("@/components/draft/transmissao");

const css = readFileSync(path.join(process.cwd(), "app", "globals.css"), "utf8");
const NOMES = ["CHAMA", "FORJA", "BRASA", "LAMINA", "ESCUDO", "CORVO"];

function estado(n: number) {
  const times = NOMES.slice(0, n).map((nome, i) => ({
    id: `t${i + 1}`,
    nome,
    cor: "#ef7d34",
    capitaoRiotId: `Cap${i + 1}#BR1`,
    gasto: 5,
    vagas: 4,
  }));
  return {
    draft: {
      revisao: 10,
      fase: "rodando",
      times,
      elencos: Object.fromEntries(
        times.map((t, i) => [t.id, [{ riotId: `Cap${i + 1}#BR1`, pontos: 5, rota1: "MID", rota2: "TOP", elo: "PRATA", capitao: true }]]),
      ),
      disponiveis: [],
      escolhiveis: [],
      escolhaAtual: 0,
      totalEscolhas: n * 4,
      timeDaVezId: "t1",
      prazoISO: new Date(Date.now() + 60_000).toISOString(),
      motivoDaPausa: null,
      sorteioId: "S1",
      orcamentoPorTime: 30,
      jogadoresPorTime: 5,
      historico: [],
    },
    souCapitaoDe: null,
    agoraServidorISO: new Date().toISOString(),
  };
}

let resposta: unknown = null;

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => resposta }) as unknown as Response));
  vi.stubGlobal("AbortSignal", { ...AbortSignal, timeout: () => undefined });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

/** As regras da grade no CSS global: a de sempre e a de dentro do @media. */
function regrasDaGrade() {
  const base = /(^|\n)\.lobd-grade-times \{\s*grid-template-columns: ([^;]+);\s*\}/.exec(css);
  const media = /@media \(min-width: (\d+)px\) \{\s*\.lobd-grade-times \{\s*grid-template-columns: ([^;]+);\s*\}\s*\}/.exec(css);
  expect(base, "regra .lobd-grade-times fora do @media").toBeTruthy();
  expect(media, "@media (min-width) da .lobd-grade-times").toBeTruthy();
  return { base: base![2]!.trim(), corte: Number(media![1]), largo: media![2]!.trim() };
}

async function grade(n: number) {
  resposta = estado(n);
  render(<Transmissao t={MESSAGES.pt.draft} />);
  await screen.findAllByText("CHAMA");
  const el = document.querySelector<HTMLElement>(".lobd-grade-times");
  expect(el, "a grade dos times usa a classe .lobd-grade-times").toBeTruthy();
  return el!;
}

/**
 * Quantas trilhas a grade tem numa largura de tela, pela regra que vale nela.
 * `repeat(auto-fit, minmax(MIN, 1fr))`: quantas de MIN + vão cabem no conteúdo.
 * `repeat(var(--times, X), minmax(0, 1fr))`: N, sempre.
 */
function trilhas(largura: number, regras: ReturnType<typeof regrasDaGrade>, el: HTMLElement): number {
  const vao = Number.parseFloat(el.style.gap);
  const respiro = Number.parseFloat(el.style.padding.split(" ")[1] ?? "0");
  const molde = largura >= regras.corte ? regras.largo : regras.base;

  const fixo = /^repeat\(var\(--times(?:,\s*\d+)?\),\s*minmax\(0,\s*1fr\)\)$/.exec(molde);
  if (fixo) return Number(el.style.getPropertyValue("--times"));

  const autoFit = /^repeat\(auto-fit,\s*minmax\((\d+)px,\s*1fr\)\)$/.exec(molde);
  expect(autoFit, `molde inesperado: ${molde}`).toBeTruthy();
  const minimo = Number(autoFit![1]);
  return Math.max(1, Math.floor((largura - 2 * respiro + vao) / (minimo + vao)));
}

describe("DIFF-UI-05 · os times da transmissão ficam lado a lado a partir de ~900px", () => {
  it("o molde da grade mora no CSS (o inline venceria o @media)", async () => {
    const el = await grade(6);
    expect(el.style.gridTemplateColumns).toBe("");
    expect(el.style.getPropertyValue("--times")).toBe("6");
    const regras = regrasDaGrade();
    expect(regras.corte).toBeLessThanOrEqual(900);
    expect(regras.base).toMatch(/auto-fit/);
  });

  it("com 6 times: 6 colunas em TODA largura de 900 a 2560px (projetor 1024×768 incluso)", async () => {
    const el = await grade(6);
    const regras = regrasDaGrade();
    expect(trilhas(1024, regras, el)).toBe(6);
    const larguras = Array.from({ length: 2560 - 900 + 1 }, (_, i) => 900 + i);
    expect(larguras.filter((w) => trilhas(w, regras, el) !== 6)).toEqual([]);
    // A faixa que a auditoria pegou (976–1163px, 5 + 1) agora é 6.
    expect([976, 1100, 1163].map((w) => trilhas(w, regras, el))).toEqual([6, 6, 6]);
  });

  it("a 900px cada coluna ainda tem largura de leitura", async () => {
    const el = await grade(6);
    const regras = regrasDaGrade();
    const vao = Number.parseFloat(el.style.gap);
    const respiro = Number.parseFloat(el.style.padding.split(" ")[1] ?? "0");
    const coluna = (regras.corte - 2 * respiro - 5 * vao) / 6;
    expect(coluna).toBeGreaterThanOrEqual(130);
  });

  it("no celular continua o auto-fit: uma coluna a 375px, nada de 6 colunas de 48px", async () => {
    const el = await grade(6);
    const regras = regrasDaGrade();
    expect(trilhas(375, regras, el)).toBe(1);
    expect(trilhas(320, regras, el)).toBe(1);
    expect(trilhas(768, regras, el)).toBe(3);
  });

  it("o N é o número real de times: com 5 times, 5 colunas", async () => {
    const el = await grade(5);
    expect(el.style.getPropertyValue("--times")).toBe("5");
    expect(trilhas(1024, regrasDaGrade(), el)).toBe(5);
  });

  it("o comentário não promete mais '3 + 3' na TV", () => {
    const componente = readFileSync(path.join(process.cwd(), "components", "draft", "transmissao.tsx"), "utf8");
    expect(componente).not.toMatch(/no tablet viram 3 \+ 3/);
  });
});
