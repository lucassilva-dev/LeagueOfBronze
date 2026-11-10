import { readFileSync } from "node:fs";
import path from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { tournamentDatasetSchema, type TournamentDataset } from "@/lib/schema";

import { html, temporadaJogada, texto, TIME_A, TIME_B } from "./_ajuda";

/**
 * /calendario/compartilhar: o quadro do calendário para o print do grupo, com filtro por time.
 */

const TIME_C = { id: "corvos", name: "Corvos da Serra", slug: "corvos-da-serra" };

const cenario = vi.hoisted(() => ({ dataset: null as unknown }));

vi.mock("@/lib/i18n/server", async () => {
  const { MESSAGES } = await import("@/lib/i18n/messages");
  return { getLocale: async () => "pt", getMessages: async () => MESSAGES.pt };
});
vi.mock("@/lib/server-data", () => ({
  getServerDataset: async () => ({ dataset: cenario.dataset }),
}));

const { default: CalendarioParaPrint } = await import("@/app/calendario/compartilhar/page");

/** A temporada de `temporadaJogada` (A 2 x 0 B em 20/11) e mais séries em dois outros fins de semana. */
function temporada(): TournamentDataset {
  const base = temporadaJogada();
  const serie = (id: string, date: string, a: string, b: string, stage = "REGULAR_SEASON") => ({
    id,
    date,
    teamAId: a,
    teamBId: b,
    format: stage === "FINAL" ? "BO5" : "BO3",
    stage,
    games: [],
  });
  return tournamentDatasetSchema.parse({
    ...base,
    teams: [...base.teams, TIME_C],
    seriesMatches: [
      ...base.seriesMatches,
      serie("serie-2", "2026-11-21T08:30:00-03:00", TIME_B.id, TIME_C.id),
      serie("serie-3", "2026-11-28T10:30:00-03:00", TIME_A.id, TIME_C.id),
      serie("semi-1", "2026-12-06T08:30:00-03:00", TIME_A.id, TIME_C.id, "SEMIFINAL"),
      serie("final", "2026-12-06T14:30:00-03:00", TIME_A.id, TIME_B.id, "FINAL"),
    ],
  });
}

/** Só o quadro (o que vai para o print): do título em diante — os chips do filtro ficam fora. */
const quadro = (markup: string) => texto(markup.slice(markup.indexOf("<h1")));

const abrir = async (time?: string) =>
  html(CalendarioParaPrint({ searchParams: Promise.resolve(time === undefined ? {} : { time }) }));

beforeEach(() => {
  cenario.dataset = temporada();
});

describe("o calendário para print", () => {
  it("sem filtro: todos os jogos, o placar de quem já jogou e um dia só para semifinal e final na mesma data", async () => {
    const markup = await abrir();
    const t = quadro(markup);
    expect(markup).toContain("data-calendario-print");
    expect(t).toContain("CALENDÁRIO");
    for (const nome of [TIME_A.name, TIME_B.name, TIME_C.name]) expect(t).toContain(nome);
    expect(t).toContain("2 × 0");
    expect(t).toMatch(/SEMI 1/);
    expect(t).toMatch(/FINAL/);
    expect(t.match(/06\/12/g)).toHaveLength(1);
    expect(t).toContain("08:30");
    expect(t).toContain("14:30");
  });

  it("os chips do filtro levam a ?time=<slug> e marcam o escolhido", async () => {
    const markup = await abrir(TIME_C.slug);
    expect(markup).toContain(`href="/calendario/compartilhar?time=${TIME_C.slug}"`);
    expect(markup).toMatch(/aria-current="page"[^>]*>(?:(?!<\/a>).)*Corvos da Serra/s);
  });

  it("com um time: só os jogos dele, o nome dele no quadro, e nada de semifinal ou final de quem não está nelas", async () => {
    const t = quadro(await abrir(TIME_B.slug));
    expect(t).toContain(TIME_B.name);
    // B joga 20/11 (contra A), 21/11 (contra C) e a final; não joga 28/11 nem a semifinal.
    expect(t).toContain("20/11");
    expect(t).toContain("21/11");
    expect(t).not.toContain("28/11");
    expect(t).not.toMatch(/SEMI 1/);
    expect(t).toMatch(/FINAL/);
  });

  it("um time que não existe vale como «todos»", async () => {
    const markup = await abrir("nao-existe");
    expect(markup).not.toContain("data-filtrado");
    expect(quadro(markup)).toContain("28/11");
  });

  it("temporada sem série nenhuma: diz que o calendário não foi divulgado", async () => {
    cenario.dataset = tournamentDatasetSchema.parse({ ...temporada(), seriesMatches: [] });
    expect(texto(await abrir())).toContain("ainda não foi divulgado");
  });

  it("nesta página o cabeçalho e o rodapé do site somem (o print é só o quadro)", () => {
    const css = readFileSync(path.join(process.cwd(), "app/globals.css"), "utf8");
    expect(css).toMatch(
      /body:has\(\[data-calendario-print\]\) #lob-cabecalho,\s*body:has\(\[data-calendario-print\]\) #conteudo \+ footer \{\s*display: none !important;/,
    );
  });
});
