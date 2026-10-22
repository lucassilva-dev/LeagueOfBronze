import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * MY-02 · o título da aba de /draft e /capitao no idioma da visita.
 *
 * Com o cookie lob_locale=en, a produção servia "Draft ao vivo · League of Bronze" e
 * "Painel do capitão · League of Bronze": o `metadata` era fixo em português.
 */

const cenario = vi.hoisted(() => ({ lingua: "pt" as "pt" | "en" }));

vi.mock("@/lib/i18n/server", async () => {
  const { MESSAGES: M } = await import("@/lib/i18n/messages");
  return {
    getLocale: async () => cenario.lingua,
    getMessages: async () => M[cenario.lingua],
  };
});

const paginaDraft = await import("@/app/draft/page");
const paginaCapitao = await import("@/app/capitao/page");

beforeEach(() => {
  cenario.lingua = "pt";
});

describe("MY-02 · títulos do draft", () => {
  it("/draft em inglês", async () => {
    cenario.lingua = "en";
    const meta = await paginaDraft.generateMetadata();
    expect(meta.title).toBe("Live draft · League of Bronze");
    expect(String(meta.description)).not.toMatch(/sorteio|Edição/);
  });

  it("/draft em português continua como antes", async () => {
    const meta = await paginaDraft.generateMetadata();
    expect(meta.title).toBe("Draft ao vivo · League of Bronze");
  });

  it("/capitao em inglês, e continua fora dos buscadores", async () => {
    cenario.lingua = "en";
    const meta = await paginaCapitao.generateMetadata();
    expect(meta.title).toBe("Captain panel · League of Bronze");
    expect(meta.robots).toEqual({ index: false, follow: false });
  });

  it("/capitao em português", async () => {
    const meta = await paginaCapitao.generateMetadata();
    expect(meta.title).toBe("Painel do capitão · League of Bronze");
    expect(meta.robots).toEqual({ index: false, follow: false });
  });
});
