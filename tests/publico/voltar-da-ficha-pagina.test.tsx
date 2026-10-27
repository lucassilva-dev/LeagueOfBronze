import { cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import type { TournamentDataset } from "@/lib/schema";

import { cenario, id } from "../torneio/_cenario-regra-6";

/**
 * O «voltar» da PÁGINA da ficha (app/jogadores/[slug]) — a comum e a temática — segue a
 * origem: `?de=jogadores` volta para a lista, no card; sem ela, para o time.
 */

const cenarioDaPagina = vi.hoisted(() => ({ dataset: null as unknown }));

vi.mock("@/lib/i18n/server", async () => {
  const { MESSAGES: mensagens } = await import("@/lib/i18n/messages");
  return { getLocale: async () => "pt", getMessages: async () => mensagens.pt };
});

vi.mock("@/lib/server-data", async () => {
  const { createIndexes } = await import("@/lib/tournament");
  return {
    getServerDataset: async () => {
      const dataset = cenarioDaPagina.dataset as TournamentDataset;
      return { dataset, indexes: createIndexes(dataset) };
    },
  };
});

vi.mock("@/lib/fase-do-site", async (original) => ({
  ...(await original<typeof import("@/lib/fase-do-site")>()),
  emPreTemporada: () => false,
}));

const { default: FichaPage } = await import("@/app/jogadores/[slug]/page");

async function resolver(no: ReactNode): Promise<ReactNode> {
  if (Array.isArray(no)) return Promise.all(no.map(resolver));
  if (!isValidElement(no)) return no;
  const elemento = no as ReactElement<{ children?: ReactNode }>;
  const { type, props } = elemento;
  if (typeof type === "function" && type.constructor.name === "AsyncFunction") {
    return resolver(await (type as (p: unknown) => Promise<ReactNode>)(props));
  }
  if (props && props.children !== undefined) {
    const filhos = await resolver(props.children);
    return cloneElement(elemento, undefined, ...(Array.isArray(filhos) ? filhos : [filhos]));
  }
  return elemento;
}

async function ficha(slug: string, de?: string): Promise<string> {
  const pagina = FichaPage({
    params: Promise.resolve({ slug }),
    searchParams: Promise.resolve(de === undefined ? {} : { de }),
  });
  return renderToStaticMarkup(<>{await resolver(await pagina)}</>);
}

const ALFA_MID = id("alfa", "MID");

describe("o «voltar» da página da ficha segue a origem", () => {
  it("ficha comum: pela lista volta para a lista (no card); direto, para o time", async () => {
    cenarioDaPagina.dataset = cenario();
    const pelaLista = await ficha(ALFA_MID, "jogadores");
    expect(pelaLista).toContain(`href="/jogadores#jogador-${ALFA_MID}"`);
    expect(pelaLista).toContain("VOLTAR AOS JOGADORES");
    expect(pelaLista).not.toContain('href="/times/alfa"');

    const direto = await ficha(ALFA_MID);
    expect(direto).toContain('href="/times/alfa"');
    expect(direto).toContain("VOLTAR AO ELENCO");
  });

  it("ficha temática (time com página própria): o mesmo, e o atalho para o time continua", async () => {
    const dataset = cenario();
    // O time ALFA com o slug de um time que tem tema (lib/temas): a ficha sai temática.
    dataset.teams = dataset.teams.map((time) => (time.id === "alfa" ? { ...time, slug: "galacticos-do-bar" } : time));
    cenarioDaPagina.dataset = dataset;

    const pelaLista = await ficha(ALFA_MID, "jogadores");
    expect(pelaLista).toContain('data-tema="galacticos-do-bar"');
    expect(pelaLista).toContain(`href="/jogadores#jogador-${ALFA_MID}"`);
    expect(pelaLista).toContain('href="/times/galacticos-do-bar"'); // o atalho «ALFA →» no fim da ficha

    const direto = await ficha(ALFA_MID);
    expect(direto).toContain('data-tema="galacticos-do-bar"');
    expect(direto).not.toContain(`href="/jogadores#jogador-${ALFA_MID}"`);
    expect(direto).toContain("VOLTAR AO ELENCO");
  });
});
