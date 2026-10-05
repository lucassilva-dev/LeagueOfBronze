import { describe, expect, it } from "vitest";

import { caminhoNoArquivo } from "../lib/arquivo";
import type { ArchivedSeason } from "../lib/schema";

function temporada(
  seasonId: string,
  endedAtISO: string,
  conteudo: Readonly<{ times?: string[]; jogadores?: string[]; series?: string[] }>,
): ArchivedSeason {
  const times = conteudo.times ?? ["a", "b"];
  return {
    seasonId,
    name: seasonId,
    archivedAtISO: endedAtISO,
    endedAtISO,
    snapshot: {
      tournament: {
        name: seasonId,
        lastUpdatedISO: endedAtISO,
        seriesPointsRule: { win: 3, loss: 0 },
        format: "BO3",
        status: "finished",
      },
      teams: times.map((slug) => ({ id: slug, name: slug, slug })),
      players: (conteudo.jogadores ?? []).map((slug) => ({
        id: slug,
        nick: slug,
        slug,
        teamId: times[0],
        role1: "MID",
        elo: "OURO",
      })),
      seriesMatches: (conteudo.series ?? []).map((id) => ({
        id,
        date: "2026-08-02",
        teamAId: times[0],
        teamBId: times[1],
        games: [],
      })),
      standingsSeed: [],
    },
  };
}

const SEGUNDA = temporada("season-2", "2026-03-20T00:00:00.000Z", {
  times: ["pantera", "vanguarda"],
  jogadores: ["maxmp"],
  series: ["final-2"],
});
const TERCEIRA = temporada("season-3", "2026-08-02T20:00:00.000Z", {
  times: ["pantera", "shurima"],
  jogadores: ["heimer"],
  series: ["final-3"],
});

describe("caminhoNoArquivo", () => {
  it("leva o time para a cópia arquivada", () => {
    expect(caminhoNoArquivo([TERCEIRA], { tipo: "time", slug: "shurima" })).toBe(
      "/temporadas/season-3/times/shurima",
    );
  });

  it("leva jogador e série para as páginas arquivadas certas", () => {
    expect(caminhoNoArquivo([TERCEIRA], { tipo: "jogador", slug: "heimer" })).toBe(
      "/temporadas/season-3/jogadores/heimer",
    );
    expect(caminhoNoArquivo([TERCEIRA], { tipo: "serie", id: "final-3" })).toBe(
      "/temporadas/season-3/partidas/final-3",
    );
  });

  it("com o mesmo slug em duas edições, prefere a mais recente — em qualquer ordem de entrada", () => {
    const esperado = "/temporadas/season-3/times/pantera";
    expect(caminhoNoArquivo([SEGUNDA, TERCEIRA], { tipo: "time", slug: "pantera" })).toBe(esperado);
    expect(caminhoNoArquivo([TERCEIRA, SEGUNDA], { tipo: "time", slug: "pantera" })).toBe(esperado);
  });

  it("acha o que só existe numa edição mais antiga", () => {
    expect(caminhoNoArquivo([TERCEIRA, SEGUNDA], { tipo: "jogador", slug: "maxmp" })).toBe(
      "/temporadas/season-2/jogadores/maxmp",
    );
  });

  it("devolve null quando não está em edição nenhuma (a página segue para o 404)", () => {
    expect(caminhoNoArquivo([SEGUNDA, TERCEIRA], { tipo: "time", slug: "nao-existe" })).toBeNull();
    expect(caminhoNoArquivo([], { tipo: "serie", id: "final-3" })).toBeNull();
  });

  it("não confunde os tipos: slug de time não casa com jogador", () => {
    expect(caminhoNoArquivo([TERCEIRA], { tipo: "jogador", slug: "shurima" })).toBeNull();
  });

  it("codifica o seasonId e o slug na URL", () => {
    const comEspaco = temporada("temp 3", "2026-08-02T20:00:00.000Z", { times: ["a b", "c"] });
    expect(caminhoNoArquivo([comEspaco], { tipo: "time", slug: "a b" })).toBe(
      "/temporadas/temp%203/times/a%20b",
    );
  });
});
