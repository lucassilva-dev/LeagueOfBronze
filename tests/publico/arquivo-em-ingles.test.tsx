import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { TournamentDataset } from "@/lib/schema";

import { ID_DA_TERCEIRA, TIME_A, html, preTemporadaComArquivo, temporadaJogada, texto } from "./_ajuda";

/**
 * O arquivo das temporadas (/temporadas/...) com o site em inglês.
 *
 * As páginas ao vivo já traduziam rota, elo, KDA e nome da edição; as do arquivo, não: a
 * ficha da 3ª saía "BACK TO ROSTER" ao lado de "Meio", "Ouro", "3ª Edição" e KDA "2,50".
 * E a aba/prévia do link de qualquer página da 3ª se anunciava como "4ª Edição", porque
 * só o layout tinha título.
 */

const cenario = vi.hoisted(() => ({ locale: "en" as "pt" | "en", dataset: null as unknown, pre: true }));

vi.mock("@/lib/i18n/server", async () => {
  const { MESSAGES } = await import("@/lib/i18n/messages");
  return { getLocale: async () => cenario.locale, getMessages: async () => MESSAGES[cenario.locale] };
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

vi.mock("@/lib/server-data", async () => {
  const t = await import("@/lib/tournament");
  const ds = () => cenario.dataset as TournamentDataset;
  return {
    getServerDataset: async () => ({ dataset: ds(), indexes: t.createIndexes(ds()) }),
    getServerArchivedSeasons: async () => ds().archivedSeasons.map((s) => t.summarizeArchivedSeason(s)),
    getServerArchivedSeason: async (id: string) => {
      const archived = ds().archivedSeasons.find((s) => s.seasonId === id);
      if (!archived) return null;
      const dataset = t.snapshotToDataset(archived.snapshot);
      return { archived, dataset, indexes: t.createIndexes(dataset), overview: t.getDatasetOverview(dataset) };
    },
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

const FichaArquivada = (await import("@/app/temporadas/[seasonId]/jogadores/[playerSlug]/page")).default;
const { generateMetadata: metaFichaArquivada } = await import("@/app/temporadas/[seasonId]/jogadores/[playerSlug]/page");
const ElencoArquivado = (await import("@/app/temporadas/[seasonId]/times/[teamSlug]/page")).default;
const { generateMetadata: metaElencoArquivado } = await import("@/app/temporadas/[seasonId]/times/[teamSlug]/page");
const SerieArquivada = (await import("@/app/temporadas/[seasonId]/partidas/[seriesId]/page")).default;
const { generateMetadata: metaSerieArquivada } = await import("@/app/temporadas/[seasonId]/partidas/[seriesId]/page");
const TemporadaArquivada = (await import("@/app/temporadas/[seasonId]/page")).default;
const { generateMetadata: metaTemporada } = await import("@/app/temporadas/[seasonId]/page");
const ListaDeTemporadas = (await import("@/app/temporadas/page")).default;
const FichaAoVivo = (await import("@/app/jogadores/[slug]/page")).default;
const { TeamCrest } = await import("@/components/team-crest");
const { ChampionIcon } = await import("@/components/champion-icon");

const ficha = () => FichaArquivada({ params: Promise.resolve({ seasonId: ID_DA_TERCEIRA, playerSlug: "faisca" }) });
const elenco = () => ElencoArquivado({ params: Promise.resolve({ seasonId: ID_DA_TERCEIRA, teamSlug: TIME_A.slug }) });
const serie = () => SerieArquivada({ params: Promise.resolve({ seasonId: ID_DA_TERCEIRA, seriesId: "serie-1" }) });

/** KDA no formato brasileiro ("2,50") em qualquer ponto do texto. */
const KDA_COM_VIRGULA = /\b\d+,\d{2}\b/;

beforeEach(() => {
  cenario.locale = "en";
  cenario.pre = true;
  cenario.dataset = preTemporadaComArquivo();
});

describe("PUB-04 — o arquivo fala a língua do site", () => {
  it("ficha arquivada em inglês: rota, elo e edição traduzidos", async () => {
    const t = texto(await html(ficha()));
    expect(t).toContain("BACK TO ROSTER");
    expect(t).toMatch(/\bMid\b/);
    expect(t).toMatch(/\bGold\b/);
    expect(t).toContain("3rd Edition · read only");
    expect(t).not.toMatch(/\bMeio\b/);
    expect(t).not.toMatch(/\bOuro\b/);
    expect(t).not.toContain("3ª Edição");
  });

  it("controle: em português a mesma ficha continua com Meio, Ouro e 3ª Edição", async () => {
    cenario.locale = "pt";
    const t = texto(await html(ficha()));
    expect(t).toMatch(/\bMeio\b/);
    expect(t).toMatch(/\bOuro\b/);
    expect(t).toContain("3ª Edição · somente leitura");
  });

  it("elenco arquivado em inglês: sigla JG (não SEL), elo traduzido e 'Back to 3rd Edition'", async () => {
    const t = texto(await html(elenco()));
    expect(t).toContain("Back to 3rd Edition");
    expect(t).toMatch(/\bJG\b/);
    expect(t).not.toMatch(/\bSEL\b/);
    expect(t).toMatch(/\bEmerald\b/);
    expect(t).not.toMatch(/\b(Esmeralda|Diamante|Ouro|Platina|Prata)\b/);
    expect(t).not.toContain("3ª Edição");
  });

  it("série e temporada arquivadas em inglês trazem o nome da edição traduzido", async () => {
    const tSerie = texto(await html(serie()));
    expect(tSerie).toContain("Back to 3rd Edition");
    expect(tSerie).not.toContain("3ª Edição");

    const tTemporada = texto(await html(TemporadaArquivada({ params: Promise.resolve({ seasonId: ID_DA_TERCEIRA }) })));
    expect(tTemporada).toContain("3rd Edition");
    expect(tTemporada).not.toContain("3ª Edição");

    const tLista = texto(await html(ListaDeTemporadas()));
    expect(tLista).toContain("3rd Edition");
    expect(tLista).not.toContain("3ª Edição");
  });

  it("escudo com o nome do time no alt (sem o 'Escudo' em português) e dica do campeão traduzível", () => {
    const escudo = renderToStaticMarkup(<TeamCrest team={{ name: "Falcões de Ferro", imageUrl: "/times/falcoes.png" }} />);
    expect(escudo).toContain('alt="Falcões de Ferro"');
    expect(escudo).not.toContain("Escudo");

    const semCampeao = renderToStaticMarkup(<ChampionIcon champion="" semCampeao="Champion not recorded" />);
    expect(semCampeao).toContain('title="Champion not recorded"');
    // Sem a prop, segue o texto de antes (quem não passou nada não muda).
    expect(renderToStaticMarkup(<ChampionIcon champion="" />)).toContain('title="Campeão não informado"');
  });
});

describe("PUB-08 — KDA com ponto decimal no site em inglês", () => {
  it("ficha arquivada: KDA da temporada e do jogo a jogo", async () => {
    const t = texto(await html(ficha()));
    expect(t).toContain("3.33"); // (9 + 1) / 3
    expect(t).toContain("2.50"); // jogo 1: (5 + 0) / 2
    expect(t).not.toMatch(KDA_COM_VIRGULA);
  });

  it("elenco e série arquivados", async () => {
    const tElenco = texto(await html(elenco()));
    expect(tElenco).toContain("3.33");
    expect(tElenco).not.toMatch(KDA_COM_VIRGULA);

    const tSerie = texto(await html(serie()));
    expect(tSerie).toContain("2.50");
    expect(tSerie).not.toMatch(KDA_COM_VIRGULA);
  });

  it("ficha AO VIVO (fase temporada)", async () => {
    cenario.pre = false;
    cenario.dataset = temporadaJogada();
    const t = texto(await html(FichaAoVivo({ params: Promise.resolve({ slug: "faisca" }) })));
    expect(t).toContain("3.33");
    expect(t).not.toMatch(KDA_COM_VIRGULA);
  });

  it("controle: em português o KDA segue com vírgula", async () => {
    cenario.locale = "pt";
    const t = texto(await html(ficha()));
    expect(t).toContain("3,33");
    expect(t).toContain("2,50");
  });
});

describe("PUB-05 — páginas do arquivo se anunciam com a temporada CERTA", () => {
  it("temporada, ficha, elenco e série da 3ª: título com '3ª Edição' (nunca '4ª') e canônico próprio", async () => {
    cenario.locale = "pt";
    const temporada = await metaTemporada({ params: Promise.resolve({ seasonId: ID_DA_TERCEIRA }) });
    expect(temporada.title).toBe("3ª Edição · League of Bronze");
    expect(temporada.alternates?.canonical).toBe(`/temporadas/${ID_DA_TERCEIRA}`);

    const jogador = await metaFichaArquivada({ params: Promise.resolve({ seasonId: ID_DA_TERCEIRA, playerSlug: "faisca" }) });
    expect(jogador.title).toBe("Faisca · 3ª Edição · League of Bronze");
    expect(jogador.alternates?.canonical).toBe(`/temporadas/${ID_DA_TERCEIRA}/jogadores/faisca`);

    const time = await metaElencoArquivado({ params: Promise.resolve({ seasonId: ID_DA_TERCEIRA, teamSlug: TIME_A.slug }) });
    expect(time.title).toBe("Falcões de Ferro · 3ª Edição · League of Bronze");

    const partida = await metaSerieArquivada({ params: Promise.resolve({ seasonId: ID_DA_TERCEIRA, seriesId: "serie-1" }) });
    expect(partida.title).toBe("Falcões de Ferro x Lobos do Sul · 3ª Edição · League of Bronze");

    for (const meta of [temporada, jogador, time, partida]) {
      expect(`${String(meta.title)} ${String(meta.description)}`).not.toContain("4ª");
    }
  });

  it("em inglês a edição sai traduzida no título", async () => {
    const temporada = await metaTemporada({ params: Promise.resolve({ seasonId: ID_DA_TERCEIRA }) });
    expect(temporada.title).toBe("3rd Edition · League of Bronze");
    const partida = await metaSerieArquivada({ params: Promise.resolve({ seasonId: ID_DA_TERCEIRA, seriesId: "serie-1" }) });
    expect(partida.title).toBe("Falcões de Ferro vs Lobos do Sul · 3rd Edition · League of Bronze");
  });

  it("temporada, jogador ou série inexistente: o título genérico do arquivo, sem quebrar", async () => {
    const semTemporada = await metaTemporada({ params: Promise.resolve({ seasonId: "nao-existe" }) });
    expect(semTemporada.title).toBe("Seasons · League of Bronze");
    const semJogador = await metaFichaArquivada({ params: Promise.resolve({ seasonId: ID_DA_TERCEIRA, playerSlug: "ninguem" }) });
    expect(semJogador.title).toBe("Seasons · League of Bronze");
  });
});
