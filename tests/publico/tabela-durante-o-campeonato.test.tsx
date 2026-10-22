import { beforeEach, describe, expect, it, vi } from "vitest";

import { tournamentDatasetSchema, type TournamentDataset } from "@/lib/schema";

import { TIME_A, TIME_B, html, temporadaJogada, texto } from "./_ajuda";

/**
 * /tabela durante o campeonato.
 *
 * CEN-03: a introdução escolhia a frase só pela existência de série com data, sem olhar
 * resultado — e no dia 28/11, com a fase de pontos inteira decidida, a página seguia
 * dizendo "Classificação zerada até o apito inicial" logo acima dos pontos.
 *
 * PUB-11: cada linha era um link inteiro, lido pelo leitor de tela como "1 FALCÕES 1 1 0
 * +2 3 …", sem dizer o que era cada número.
 */

const cenario = vi.hoisted(() => ({ locale: "pt" as "pt" | "en", dataset: null as unknown }));

vi.mock("@/lib/i18n/server", async () => {
  const { MESSAGES } = await import("@/lib/i18n/messages");
  return { getLocale: async () => cenario.locale, getMessages: async () => MESSAGES[cenario.locale] };
});
vi.mock("@/lib/server-data", async () => {
  const { createIndexes } = await import("@/lib/tournament");
  return {
    getServerDataset: async () => {
      const dataset = cenario.dataset as TournamentDataset;
      return { dataset, indexes: createIndexes(dataset) };
    },
  };
});
vi.mock("@/lib/fase-do-site", async (original) => {
  const real = await original<typeof import("@/lib/fase-do-site")>();
  return {
    ...real,
    emPreTemporada: () => false,
    semTemporadaAoVivo: (d: Parameters<typeof real.semTemporadaAoVivo>[0]) => real.semTemporadaAoVivo(d, "temporada"),
  };
});

const { default: TabelaPage } = await import("@/app/tabela/page");

/** A mesma temporada, com a série marcada mas ainda sem jogo nenhum. */
function antesDaPrimeiraSerie(): TournamentDataset {
  const ds = temporadaJogada();
  return tournamentDatasetSchema.parse({ ...ds, seriesMatches: ds.seriesMatches.map((s) => ({ ...s, games: [] })) });
}

beforeEach(() => {
  cenario.locale = "pt";
});

describe("CEN-03 — introdução da /tabela acompanha o campeonato", () => {
  it("com série decidida, não diz mais que está tudo zerado", async () => {
    cenario.dataset = temporadaJogada();
    const t = texto(await html(TabelaPage()));
    expect(t).toContain("Classificação da fase de pontos, atualizada a cada série.");
    expect(t).not.toContain("zerada até o apito inicial");
  });

  it("em inglês também", async () => {
    cenario.locale = "en";
    cenario.dataset = temporadaJogada();
    const t = texto(await html(TabelaPage()));
    expect(t).toContain("Group-stage standings, updated after every series.");
    expect(t).not.toContain("starts from zero");
  });

  it("temporada encerrada: classificação final", async () => {
    cenario.dataset = temporadaJogada({ status: "finished" });
    const t = texto(await html(TabelaPage()));
    expect(t).toContain("Classificação final da fase de pontos.");
  });

  it("controle: antes da 1ª série decidida a frase de 'zerada' continua (com o dia da 1ª rodada)", async () => {
    cenario.dataset = antesDaPrimeiraSerie();
    const t = texto(await html(TabelaPage()));
    expect(t).toContain("Classificação zerada até o apito inicial");
    expect(t).toContain("em 20 de novembro");
  });
});

describe("PUB-11 — a classificação é uma tabela para o leitor de tela", () => {
  it("tabela com cabeçalhos de coluna, linhas e células; o link do time fica no nome", async () => {
    cenario.dataset = temporadaJogada();
    const m = await html(TabelaPage());
    expect(m).toMatch(/role="table" aria-label="[^"]+"/);
    expect(m.match(/role="columnheader"/g)).toHaveLength(8);
    // Cabeçalho + uma linha por time.
    expect(m.match(/role="row"/g)).toHaveLength(3);
    expect(m.match(/role="cell"/g)).toHaveLength(16);

    // O link não engole mais a linha inteira: é o nome do time, e se estica por cima dela.
    const link = new RegExp(`<a[^>]*class="lob-linha-link"[^>]*href="/times/${TIME_A.slug}"[^>]*>${TIME_A.name}</a>`);
    expect(m).toMatch(link);
    expect(m).toMatch(new RegExp(`href="/times/${TIME_B.slug}"[^>]*>${TIME_B.name}</a>`));
    expect(m).not.toMatch(/<a[^>]*style="[^"]*display:grid/);
  });
});
