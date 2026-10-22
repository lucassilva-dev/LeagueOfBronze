import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * PUB-05 — /partidas com título, descrição e canônico próprios.
 *
 * Era a única página pública de lista que ainda herdava os metadados da home: a aba dizia
 * o nome do site e a prévia do link (WhatsApp, Google) falava da inscrição da 4ª Edição,
 * sem canônico — o mesmo conteúdo aberto pelo league-of-bronze.vercel.app contava como
 * outra página. A entrada `partidas` já existia em lib/i18n/messages/metadados.ts.
 */

const cenario = vi.hoisted(() => ({ locale: "pt" as "pt" | "en" }));

vi.mock("@/lib/i18n/server", async () => {
  const { MESSAGES } = await import("@/lib/i18n/messages");
  return { getLocale: async () => cenario.locale, getMessages: async () => MESSAGES[cenario.locale] };
});

// A página lê o campeonato; os metadados não. Sem banco no teste.
vi.mock("@/lib/server-data", () => ({
  getServerOverview: async () => {
    throw new Error("os metadados não deveriam ler o campeonato");
  },
}));

beforeEach(() => {
  cenario.locale = "pt";
});

describe("PUB-05 · metadados de /partidas", () => {
  it("título e descrição da página nas duas línguas, com canônico relativo", async () => {
    const { generateMetadata } = (await import("@/app/partidas/page")) as {
      generateMetadata?: () => Promise<import("next").Metadata>;
    };
    expect(generateMetadata, "/partidas sem generateMetadata").toBeTypeOf("function");

    const pt = await generateMetadata!();
    expect(pt.title).toBe("Partidas · League of Bronze");
    expect(pt.description).toBe("Todas as séries do League of Bronze, com placar e mapas.");
    expect(pt.alternates?.canonical).toBe("/partidas");
    // Não é a da home.
    expect(String(pt.description)).not.toContain("Inscrição para a 4ª Edição");

    cenario.locale = "en";
    const en = await generateMetadata!();
    expect(en.title).toBe("Matches · League of Bronze");
    expect(en.description).toBe("Every League of Bronze series, with score and games.");
    expect(en.alternates?.canonical).toBe("/partidas");
  });
});
