// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import path from "node:path";

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MESSAGES } from "@/lib/i18n/messages";

/**
 * A transmissão /draft, com a sondagem dublada.
 *
 *  - DRF-01: abaixo de 900px a grade dos times se adapta à largura em vez de N colunas
 *    fixas — a 375px cada coluna tinha ~48px e o nick sumia. (De 900px para cima são N
 *    colunas de novo: ver grade-da-transmissao.test.tsx.) O Riot ID da revelação quebra
 *    em vez de passar do cartão no celular.
 *  - DRF-07: duas escolhas que entram entre duas sondagens são reveladas AS DUAS, em ordem.
 *  - DRF-08: a frase da serpentina usa o número real de times (com 5 times, nada de "6").
 *  - DRF-11: o ordinal do sorteio segue o idioma ("1st", não "1º", em inglês).
 *
 * Relógio de verdade, como em revelacao.test.tsx: sondagem, `setInterval`, promessa de
 * `fetch` e efeito do React encadeados não andam direito com o tempo falso.
 */

const { default: Transmissao } = await import("@/components/draft/transmissao");

const CORES = ["#ef7d34", "#e0b13c", "#d4574a", "#7fb069", "#5b8def", "#b06ab3"];
const NOMES = ["CHAMA", "FORJA", "BRASA", "LAMINA", "ESCUDO", "CORVO"];

function times(n: number) {
  return Array.from({ length: n }, (_, i) => ({
    id: `t${i + 1}`,
    nome: NOMES[i]!,
    cor: CORES[i]!,
    capitaoRiotId: `Cap${i + 1}#BR1`,
    gasto: 5,
    vagas: 4,
  }));
}

type Escolha = { escolha: number; timeId: string; riotId: string; automatica: boolean };

function estado(nTimes: number, fase: string, historico: Escolha[] = []) {
  const lista = times(nTimes);
  const elencos = Object.fromEntries(
    lista.map((time, i) => [
      time.id,
      [
        { riotId: `Cap${i + 1}#BR1`, pontos: 5, rota1: "MID", rota2: "TOP", elo: "PRATA", capitao: true },
        ...historico
          .filter((h) => h.timeId === time.id)
          .map((h) => ({ riotId: h.riotId, pontos: 3, rota1: "ADC", rota2: "SUP", elo: "PRATA", capitao: false })),
      ],
    ]),
  );
  return {
    draft: {
      revisao: 10 + historico.length,
      fase,
      times: lista,
      elencos,
      disponiveis: [],
      escolhiveis: [],
      escolhaAtual: historico.length,
      totalEscolhas: nTimes * 4,
      timeDaVezId: fase === "rodando" ? "t2" : null,
      prazoISO: fase === "rodando" ? new Date(Date.now() + 60_000).toISOString() : null,
      motivoDaPausa: null,
      sorteioId: "S1",
      orcamentoPorTime: 30,
      jogadoresPorTime: 5,
      historico,
    },
    souCapitaoDe: null,
    agoraServidorISO: new Date().toISOString(),
  };
}

let fila: unknown[] = [];

beforeEach(() => {
  fila = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      const corpo = fila.length > 1 ? fila.shift() : fila[0];
      return { ok: true, json: async () => corpo } as unknown as Response;
    }),
  );
  vi.stubGlobal("AbortSignal", { ...AbortSignal, timeout: () => undefined });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const revelacaoNaTela = () => document.querySelector<HTMLElement>('[role="status"][style*="fixed"]');

describe("DRF-01 · a grade dos times cabe no celular", () => {
  it("abaixo de 900px: colunas de no mínimo 180px, quantas couberem", async () => {
    fila = [estado(6, "rodando")];
    render(<Transmissao t={MESSAGES.pt.draft} />);
    await screen.findAllByText("CHAMA");

    // O molde mora na classe (app/globals.css), porque só classe aceita @media: abaixo de
    // 900px é o auto-fit de 180px; acima, N colunas (DIFF-UI-05, grade-da-transmissao.test.tsx).
    const daGrade = document.querySelector<HTMLElement>(".lobd-grade-times");
    expect(daGrade, "grade dos times").toBeTruthy();
    expect(daGrade!.textContent).toContain("Cap6#BR1");
    expect(daGrade!.style.gridTemplateColumns).toBe("");
    const css = readFileSync(path.join(process.cwd(), "app", "globals.css"), "utf8");
    expect(css).toMatch(/(^|\n)\.lobd-grade-times \{\s*grid-template-columns: repeat\(auto-fit, minmax\(180px, 1fr\)\);/);

    // Cada coluna pode encolher até a trilha (sem empurrar a vizinha).
    for (const coluna of [...daGrade!.children] as HTMLElement[]) {
      expect(coluna.style.minWidth).toMatch(/^0(px)?$/);
    }
  });

  it("o Riot ID da revelação quebra em vez de passar do cartão", async () => {
    const longo = { escolha: 0, timeId: "t1", riotId: "Gar3naTheBestMid#BR1", automatica: false };
    fila = [estado(6, "rodando"), estado(6, "rodando", [longo])];
    render(<Transmissao t={MESSAGES.pt.draft} />);
    const overlay = await waitFor(
      () => {
        const el = revelacaoNaTela();
        if (!el) throw new Error("sem revelação ainda");
        return el;
      },
      { timeout: 15_000, interval: 60 },
    );
    const nick = [...overlay.querySelectorAll<HTMLElement>("div")].find((el) => el.textContent === longo.riotId);
    expect(nick).toBeTruthy();
    expect(nick!.style.overflowWrap).toBe("anywhere");
  });
});

describe("DRF-07 · duas escolhas entre duas sondagens", () => {
  it("as duas são reveladas, uma depois da outra", { timeout: 40_000 }, async () => {
    const hist: Escolha[] = [
      { escolha: 0, timeId: "t1", riotId: "PrimeiraEscolha#BR1", automatica: false },
      { escolha: 1, timeId: "t2", riotId: "SegundaEscolha#BR1", automatica: true },
      { escolha: 2, timeId: "t2", riotId: "TerceiraEscolha#BR1", automatica: false },
    ];
    // A primeira leitura só anota; a segunda traz DUAS escolhas novas de uma vez.
    fila = [estado(2, "rodando", hist.slice(0, 1)), estado(2, "rodando", hist)];

    const vistos: string[] = [];
    const observador = window.setInterval(() => {
      const texto = revelacaoNaTela()?.textContent ?? "";
      const quem = texto.includes("SegundaEscolha#BR1")
        ? "segunda"
        : texto.includes("TerceiraEscolha#BR1")
          ? "terceira"
          : null;
      if (quem && vistos.at(-1) !== quem) vistos.push(quem);
    }, 40);

    render(<Transmissao t={MESSAGES.pt.draft} />);
    try {
      await waitFor(() => expect(vistos).toEqual(["segunda", "terceira"]), { timeout: 15_000, interval: 60 });
    } finally {
      window.clearInterval(observador);
    }
    // ...e a fila esvazia: a revelação sai sozinha no fim.
    await waitFor(() => expect(revelacaoNaTela()).toBeNull(), { timeout: 10_000, interval: 60 });
  });

  it("a fila tem teto: a TV que volta de queda revela só as 2 mais recentes", { timeout: 40_000 }, async () => {
    // Seis escolhas acumuladas de uma vez (Wi-Fi do local caiu, aba em segundo plano).
    const hist: Escolha[] = Array.from({ length: 7 }, (_, i) => ({
      escolha: i,
      timeId: i % 2 === 0 ? "t1" : "t2",
      riotId: `Escolha${i}#BR1`,
      automatica: false,
    }));
    fila = [estado(2, "rodando", hist.slice(0, 1)), estado(2, "rodando", hist)];

    const vistos: string[] = [];
    const observador = window.setInterval(() => {
      const texto = revelacaoNaTela()?.textContent ?? "";
      const quem = hist.find((h) => texto.includes(h.riotId))?.riotId ?? null;
      if (quem && vistos.at(-1) !== quem) vistos.push(quem);
    }, 40);

    render(<Transmissao t={MESSAGES.pt.draft} />);
    try {
      await waitFor(() => expect(vistos.at(-1)).toBe("Escolha6#BR1"), { timeout: 15_000, interval: 60 });
      await waitFor(() => expect(revelacaoNaTela()).toBeNull(), { timeout: 10_000, interval: 60 });
    } finally {
      window.clearInterval(observador);
    }
    // As quatro anteriores já estão na grade: reprisá-las cobriria o quadro ao vivo.
    expect(vistos).toEqual(["Escolha5#BR1", "Escolha6#BR1"]);
  });
});

describe("DRF-08 e DRF-11 · a fase do sorteio", () => {
  it("com 5 times, a frase da serpentina é 1-2-3-4-5 · 5-4-3-2-1", async () => {
    fila = [estado(5, "preparando")];
    render(<Transmissao t={MESSAGES.pt.draft} />);
    // A frase só aparece quando a rolagem dos nomes termina (~2,6 s).
    const frase = await screen.findByText(/Ordem serpentina:/, undefined, { timeout: 15_000 });
    expect(frase.textContent).toBe("Ordem serpentina: 1-2-3-4-5 · 5-4-3-2-1 · e repete.");
    expect(frase.textContent).not.toContain("6");
  });

  it("com 6 times, a frase segue a mesma de antes", async () => {
    fila = [estado(6, "preparando")];
    render(<Transmissao t={MESSAGES.en.draft} />);
    const frase = await screen.findByText(/Snake order:/, undefined, { timeout: 15_000 });
    expect(frase.textContent).toBe("Snake order: 1-2-3-4-5-6 · 6-5-4-3-2-1 · and repeat.");
  });

  it("o ordinal de cada time segue o idioma", async () => {
    fila = [estado(4, "preparando")];
    render(<Transmissao t={MESSAGES.en.draft} />);
    await screen.findByText("1st");
    expect(screen.getByText("2nd")).toBeTruthy();
    expect(screen.getByText("3rd")).toBeTruthy();
    expect(screen.getByText("4th")).toBeTruthy();
    expect(document.body.textContent).not.toContain("º");
  });

  it("em português continua '1º'", async () => {
    fila = [estado(2, "preparando")];
    render(<Transmissao t={MESSAGES.pt.draft} />);
    await screen.findByText("1º");
    expect(screen.getByText("2º")).toBeTruthy();
  });
});
