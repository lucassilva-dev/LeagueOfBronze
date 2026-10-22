import { beforeEach, describe, expect, it, vi } from "vitest";

import type { TournamentDataset } from "@/lib/schema";

import { ID_DA_TERCEIRA, html, preTemporadaComArquivo, temporadaJogada } from "./_ajuda";

/**
 * Páginas da temporada no ar (FASE_DO_SITE = "temporada"): o que só aparece depois da
 * virada — a home do campeonato, o /calendario com séries de verdade e as fichas.
 */

const cenario = vi.hoisted(() => ({ dataset: null as unknown, pre: false }));

vi.mock("@/lib/i18n/server", async () => {
  const { MESSAGES } = await import("@/lib/i18n/messages");
  return { getLocale: async () => "pt", getMessages: async () => MESSAGES.pt };
});
vi.mock("@/lib/server-data", async () => {
  const t = await import("@/lib/tournament");
  const ds = () => cenario.dataset as TournamentDataset;
  return {
    getServerDataset: async () => ({ dataset: ds(), indexes: t.createIndexes(ds()) }),
    getServerArchivedSeasons: async () => [],
    getServerArchivedSeason: async (id: string) => {
      const archived = ds().archivedSeasons.find((s) => s.seasonId === id);
      if (!archived) return null;
      const dataset = t.snapshotToDataset(archived.snapshot);
      return { archived, dataset, indexes: t.createIndexes(dataset), overview: t.getDatasetOverview(dataset) };
    },
  };
});
vi.mock("@/lib/fase-do-site", async (original) => {
  const real = await original<typeof import("@/lib/fase-do-site")>();
  return {
    ...real,
    emPreTemporada: () => cenario.pre,
    semTemporadaAoVivo: (d: Parameters<typeof real.semTemporadaAoVivo>[0]) =>
      real.semTemporadaAoVivo(d, cenario.pre ? "pre_temporada" : "temporada"),
  };
});
vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ refresh() {} }),
  redirect: (u: string) => {
    throw new Error(`REDIRECT ${u}`);
  },
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
}));

const { default: InicioPage } = await import("@/app/page");
const { default: CalendarioPage } = await import("@/app/calendario/page");
const { default: FichaAoVivo } = await import("@/app/jogadores/[slug]/page");
const { default: FichaArquivada } = await import("@/app/temporadas/[seasonId]/jogadores/[playerSlug]/page");

/** Razão de contraste WCAG entre duas cores #rrggbb. */
function contraste(a: string, b: string): number {
  const lum = (hex: string) => {
    const [r, g, bl] = [1, 3, 5].map((i) => {
      const c = Number.parseInt(hex.slice(i, i + 2), 16) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r! + 0.7152 * g! + 0.0722 * bl!;
  };
  const [claro, escuro] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (claro! + 0.05) / (escuro! + 0.05);
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-21T12:00:00-03:00"));
  cenario.pre = false;
  cenario.dataset = temporadaJogada();
});

describe("PUB-07 — grade 'Abertura' da home cabe num celular de 320px", () => {
  it("a coluna mínima é min(100%, 320px), não 320px fixos", async () => {
    const m = await html(InicioPage());
    expect(m).toContain("grid-template-columns:repeat(auto-fill,minmax(min(100%,320px),1fr))");
    expect(m).not.toContain("minmax(320px,1fr)");
  });
});

describe("PUB-09 — formato da série (MD3) legível no cartão do /calendario", () => {
  it("contraste de pelo menos 4,5:1 sobre o cartão, e não menos de 10px", async () => {
    const m = await html(CalendarioPage());
    const rotulo = /<div style="([^"]*)">MD3<\/div>/.exec(m);
    expect(rotulo, "rótulo MD3 não encontrado").not.toBeNull();
    const cor = /(?<![-\w])color:(#[0-9a-f]{6})/i.exec(rotulo![1]!)?.[1] ?? "";
    const tamanho = Number(/font-size:(\d+(?:\.\d+)?)px/.exec(rotulo![1]!)?.[1]);
    // #1c1710 é o fundo do cartão da série.
    expect(contraste(cor, "#1c1710")).toBeGreaterThanOrEqual(4.5);
    expect(tamanho).toBeGreaterThanOrEqual(10);
  });
});

describe("PUB-13 — o nick é o <h1> das fichas", () => {
  it("ficha ao vivo", async () => {
    const m = await html(FichaAoVivo({ params: Promise.resolve({ slug: "faisca" }) }));
    expect(m.match(/<h1\b/g)).toHaveLength(1);
    expect(m).toMatch(/<h1 class="lob-display" style="margin:0;[^"]*">Faisca<\/h1>/);
  });

  it("ficha arquivada", async () => {
    cenario.pre = true;
    cenario.dataset = preTemporadaComArquivo();
    const m = await html(FichaArquivada({ params: Promise.resolve({ seasonId: ID_DA_TERCEIRA, playerSlug: "faisca" }) }));
    expect(m.match(/<h1\b/g)).toHaveLength(1);
    expect(m).toMatch(/<h1 class="lob-display" style="margin:0;[^"]*">Faisca<\/h1>/);
  });
});
