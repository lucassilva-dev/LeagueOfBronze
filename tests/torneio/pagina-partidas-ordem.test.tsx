import { cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { seriesDaFaseDePontos } from "@/lib/calendario-4a";
import { CALENDARIO_6_TIMES_DE_20_10 } from "@/tests/_calendarios";
import { tournamentDatasetSchema, type SeriesMatch, type TournamentDataset } from "@/lib/schema";

/**
 * /partidas abre com o resultado mais recente, não com a série mais distante no futuro.
 *
 * As séries da fase de pontos da 4ª são criadas de uma vez; só por data decrescente, em
 * 21/11 a página começava pela de 28/11 (sem resultado) e a recém-terminada ficava lá pela
 * 13ª posição. O cenário usa a grade de 6 times publicada em 20/10 (tests/_calendarios.ts):
 * a de 8 times ainda está a divulgar, e a ordem não depende do número de times.
 */
const TIMES = ["chama", "aurea", "verdante", "gelida", "arcana", "carmesim"];

const cenario = vi.hoisted(() => ({ dataset: null as unknown }));

vi.mock("@/lib/i18n/server", async () => {
  const { MESSAGES: mensagens } = await import("@/lib/i18n/messages");
  return { getLocale: async () => "pt", getMessages: async () => mensagens.pt };
});

vi.mock("@/lib/server-data", async () => {
  const { createIndexes, getDatasetOverview } = await import("@/lib/tournament");
  return {
    getServerOverview: async () => {
      const dataset = cenario.dataset as TournamentDataset;
      return { dataset, indexes: createIndexes(dataset), overview: getDatasetOverview(dataset) };
    },
  };
});

const { default: PartidasPage } = await import("@/app/partidas/page");

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

function quarta(): TournamentDataset {
  const series: SeriesMatch[] = seriesDaFaseDePontos(TIMES, CALENDARIO_6_TIMES_DE_20_10);
  const j3 = series.find((s) => s.id === "4a-jogo-03")!;
  const jogo = {
    winnerTeamId: j3.teamAId,
    mvpPlayerId: `${j3.teamAId}-1`,
    statsByPlayer: [
      { playerId: `${j3.teamAId}-1`, kills: 5, deaths: 1, assists: 3 },
      { playerId: `${j3.teamBId}-1`, kills: 1, deaths: 5, assists: 1 },
    ],
  };
  j3.games = [jogo, structuredClone(jogo)];
  return tournamentDatasetSchema.parse({
    tournament: {
      name: "4ª Edição",
      lastUpdatedISO: "2026-11-21T00:00:00.000Z",
      seriesPointsRule: { win: 3, loss: 0 },
      format: "BO3",
      status: "active",
      seasonId: "s4",
    },
    teams: TIMES.map((t) => ({ id: t, name: t.toUpperCase(), slug: t })),
    players: TIMES.map((t) => ({ id: `${t}-1`, nick: `${t}-1`, slug: `${t}-1`, teamId: t, role1: "MID", elo: "Ouro" })),
    seriesMatches: series,
    standingsSeed: [],
    archivedSeasons: [],
  });
}

describe("/partidas", () => {
  it("o primeiro cartão é a série recém-terminada; depois, a próxima a acontecer", async () => {
    cenario.dataset = quarta();
    const markup = renderToStaticMarkup(<>{await resolver(await PartidasPage())}</>);
    const ordem = [...markup.matchAll(/href="\/partidas\/(4a-jogo-\d+)"/g)].map((m) => m[1]);
    const unicos = ordem.filter((id, i) => ordem.indexOf(id) === i);
    expect(unicos[0]).toBe("4a-jogo-03");
    expect(unicos[1]).toBe("4a-jogo-01");
    expect(unicos.at(-1)).toBe("4a-jogo-15");
  });
});
