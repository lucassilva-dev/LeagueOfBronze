import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { html, texto } from "./_ajuda";

/**
 * INF-01 (parte do /calendario): o Supabase fora numa instância que ainda não leu o banco
 * (sem cópia boa em memória) faz `getServerDataset` lançar. Na pré-temporada o que o
 * /calendario mostra é o calendário PLANEJADO da 4ª — que não depende do banco —, e mesmo
 * assim a página caía inteira. Com a temporada no ar o erro segue para a app/error.tsx:
 * trocar as séries de verdade pela grade planejada esconderia resultado.
 */

const cenario = vi.hoisted(() => ({ pre: true }));

vi.mock("@/lib/i18n/server", async () => {
  const { MESSAGES } = await import("@/lib/i18n/messages");
  return { getLocale: async () => "pt", getMessages: async () => MESSAGES.pt };
});

vi.mock("@/lib/server-data", () => ({
  getServerDataset: async () => {
    throw new Error("TypeError: fetch failed (tournament_state)");
  },
}));

vi.mock("@/lib/fase-do-site", async (original) => ({
  ...(await original<typeof import("@/lib/fase-do-site")>()),
  emPreTemporada: () => cenario.pre,
}));

const { default: CalendarioPage } = await import("@/app/calendario/page");

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-21T12:00:00-03:00"));
  cenario.pre = true;
});
afterEach(() => vi.useRealTimers());

describe("INF-01 — /calendario com o banco fora", () => {
  it("pré-temporada: mostra o calendário planejado em vez de cair", async () => {
    const t = texto(await html(CalendarioPage()));
    expect(t).toContain("CALENDÁRIO");
    // A grade planejada da 4ª (lib/calendario-4a.ts): da fase de pontos à final.
    expect(t).toMatch(/20 de novembro|20\/11/);
  });

  it("temporada no ar: o erro segue para a app/error.tsx (nada de grade planejada no lugar dos resultados)", async () => {
    cenario.pre = false;
    await expect(CalendarioPage()).rejects.toThrow(/fetch failed/);
  });

  it("pré-temporada com o calendário já passado: também segue para a tela de erro", async () => {
    vi.setSystemTime(new Date("2026-12-15T12:00:00-03:00"));
    await expect(CalendarioPage()).rejects.toThrow(/fetch failed/);
  });
});
