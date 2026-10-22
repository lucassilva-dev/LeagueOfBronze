import { beforeEach, describe, expect, it, vi } from "vitest";

import type { TournamentDataset } from "@/lib/schema";

import { TIME_A, temporadaJogada } from "./_ajuda";

/**
 * Título da aba e descrição (a prévia do link no WhatsApp e no Google) de cada página.
 *
 * Antes só o layout declarava isso: toda página pública saía "League of Bronze · 4ª
 * Edição", com a descrição da inscrição; e as poucas com título próprio (como /entrar) o
 * tinham fixo em português, mesmo com o site em inglês.
 */

const cenario = vi.hoisted(() => ({ locale: "pt" as "pt" | "en", dataset: null as unknown, bancoFora: false }));

vi.mock("@/lib/i18n/server", async () => {
  const { MESSAGES } = await import("@/lib/i18n/messages");
  return { getLocale: async () => cenario.locale, getMessages: async () => MESSAGES[cenario.locale] };
});

vi.mock("@/lib/server-data", async () => {
  const t = await import("@/lib/tournament");
  return {
    getServerDataset: async () => {
      if (cenario.bancoFora) throw new Error("TypeError: fetch failed");
      const dataset = cenario.dataset as TournamentDataset;
      return { dataset, indexes: t.createIndexes(dataset) };
    },
    getServerArchivedSeasons: async () => [],
    getServerArchivedSeason: async () => null,
  };
});

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  redirect: (u: string) => {
    throw new Error(`REDIRECT ${u}`);
  },
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
}));

beforeEach(() => {
  cenario.locale = "pt";
  cenario.bancoFora = false;
  cenario.dataset = temporadaJogada();
});

const PAGINAS_FIXAS = [
  { modulo: () => import("@/app/regras/page"), caminho: "/regras", pt: "Regulamento", en: "Rules" },
  { modulo: () => import("@/app/calendario/page"), caminho: "/calendario", pt: "Calendário", en: "Schedule" },
  { modulo: () => import("@/app/tabela/page"), caminho: "/tabela", pt: "Tabela", en: "Standings" },
  { modulo: () => import("@/app/times/page"), caminho: "/times", pt: "Times", en: "Teams" },
  { modulo: () => import("@/app/jogadores/page"), caminho: "/jogadores", pt: "Jogadores", en: "Players" },
  { modulo: () => import("@/app/stats/page"), caminho: "/stats", pt: "Estatísticas", en: "Stats" },
  { modulo: () => import("@/app/cartas/page"), caminho: "/cartas", pt: "Cartas", en: "Cards" },
  { modulo: () => import("@/app/temporadas/page"), caminho: "/temporadas", pt: "Temporadas", en: "Seasons" },
] as const;

describe("PUB-05 — cada página pública com título, descrição e canônico próprios", () => {
  it.each(PAGINAS_FIXAS)("$caminho: título próprio nas duas línguas", async ({ modulo, caminho, pt, en }) => {
    const { generateMetadata } = (await modulo()) as { generateMetadata?: () => Promise<import("next").Metadata> };
    expect(generateMetadata, `${caminho} sem generateMetadata`).toBeTypeOf("function");

    const emPortugues = await generateMetadata!();
    expect(emPortugues.title).toBe(`${pt} · League of Bronze`);
    expect(emPortugues.alternates?.canonical).toBe(caminho);
    // A descrição é da página — não a da home ("Inscrição para a 4ª Edição…").
    expect(String(emPortugues.description)).not.toContain("Inscrição para a 4ª Edição");

    cenario.locale = "en";
    const emIngles = await generateMetadata!();
    expect(emIngles.title).toBe(`${en} · League of Bronze`);
    expect(emIngles.description).not.toBe(emPortugues.description);
  });

  it("time, jogador e série ao vivo: o nome deles na aba, com a edição no idioma da visita", async () => {
    const { generateMetadata: metaTime } = await import("@/app/times/[slug]/page");
    const { generateMetadata: metaJogador } = await import("@/app/jogadores/[slug]/page");
    const { generateMetadata: metaSerie } = await import("@/app/partidas/[id]/page");

    const time = await metaTime({ params: Promise.resolve({ slug: TIME_A.slug }) });
    expect(time.title).toBe("Falcões de Ferro · League of Bronze");
    expect(time.alternates?.canonical).toBe(`/times/${TIME_A.slug}`);
    expect(String(time.description)).toContain("4ª Edição");

    const jogador = await metaJogador({ params: Promise.resolve({ slug: "faisca" }) });
    expect(jogador.title).toBe("Faisca · League of Bronze");
    expect(jogador.alternates?.canonical).toBe("/jogadores/faisca");

    cenario.locale = "en";
    const serie = await metaSerie({ params: Promise.resolve({ id: "serie-1" }) });
    expect(serie.title).toBe("Falcões de Ferro vs Lobos do Sul · League of Bronze");
    expect(String(serie.description)).toContain("4th Edition");
    expect(serie.alternates?.canonical).toBe("/partidas/serie-1");
  });

  it("time inexistente ou banco fora: cai no título da seção, sem derrubar a página", async () => {
    const { generateMetadata: metaTime } = await import("@/app/times/[slug]/page");
    expect((await metaTime({ params: Promise.resolve({ slug: "nao-existe" }) })).title).toBe("Times · League of Bronze");

    cenario.bancoFora = true;
    const { generateMetadata: metaSerie } = await import("@/app/partidas/[id]/page");
    await expect(metaSerie({ params: Promise.resolve({ id: "serie-1" }) })).resolves.toMatchObject({
      title: "Partidas · League of Bronze",
    });
  });

  it("home: canônico próprio (título e descrição continuam os do layout)", async () => {
    const { metadata } = await import("@/app/page");
    expect(metadata.alternates?.canonical).toBe("/");
    expect(metadata.title).toBeUndefined();
  });
});

describe("MY-02 — título da aba acompanha o idioma (/entrar)", () => {
  it("'Sign in' em inglês, 'Entrar' em português, e segue fora dos buscadores", async () => {
    const { generateMetadata } = await import("@/app/entrar/page");
    const pt = await generateMetadata();
    expect(pt.title).toBe("Entrar · League of Bronze");
    expect(pt.robots).toEqual({ index: false, follow: false });

    cenario.locale = "en";
    const en = await generateMetadata();
    expect(en.title).toBe("Sign in · League of Bronze");
    expect(en.robots).toEqual({ index: false, follow: false });
  });
});
