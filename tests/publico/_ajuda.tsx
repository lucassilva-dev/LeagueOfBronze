import { cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { tournamentDatasetSchema, type TournamentDataset } from "@/lib/schema";
import { buildArchivedSeason } from "@/lib/tournament";

/**
 * Apoio dos testes das páginas públicas (tests/publico): render de Server Component e um
 * campeonato CONSTRUÍDO aqui — nada de depender do que por acaso esteja num fixture.
 */

/**
 * Resolve os componentes `async` da árvore (páginas e blocos de servidor), que o
 * renderToStaticMarkup não sabe esperar. Os síncronos, inclusive os "use client", ficam
 * para o render normal.
 */
export async function resolver(no: ReactNode): Promise<ReactNode> {
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

export async function html(pagina: ReactNode | Promise<ReactNode>): Promise<string> {
  return renderToStaticMarkup(<>{await resolver(await pagina)}</>);
}

/** O texto da página, sem tags e com os espaços normalizados. */
export function texto(markup: string): string {
  return markup
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/\s+/g, " ");
}

export const TIME_A = { id: "falcoes", name: "Falcões de Ferro", slug: "falcoes-de-ferro" };
export const TIME_B = { id: "lobos", name: "Lobos do Sul", slug: "lobos-do-sul" };

/** Rota e elo de cada posição do elenco: o MEIO é Ouro (em inglês, "Mid" e "Gold"). */
const POSICOES = [
  { rota: "TOP", elo: "PRATA" },
  { rota: "JUNG", elo: "ESMERALDA" },
  { rota: "MID", elo: "OURO" },
  { rota: "ADC", elo: "DIAMANTE" },
  { rota: "SUP", elo: "PLATINA" },
] as const;

const NICKS: Record<string, readonly string[]> = {
  falcoes: ["Brasa", "Cinza", "Faisca", "Fagulha", "Tocha"],
  lobos: ["Uivo", "Presa", "Garra", "Matilha", "Toca"],
};

function elenco(time: typeof TIME_A) {
  return POSICOES.map((posicao, i) => {
    const nick = NICKS[time.id]![i]!;
    return {
      id: `${time.id}-${posicao.rota.toLowerCase()}`,
      nick,
      slug: nick.toLowerCase(),
      teamId: time.id,
      role1: posicao.rota,
      elo: posicao.elo,
    };
  });
}

/** Linha de estatística de todos os 10 jogadores, com o MEIO do time A em `meio`. */
function linhas(meio: { kills: number; deaths: number; assists: number }) {
  return [...elenco(TIME_A), ...elenco(TIME_B)].map((p) =>
    p.id === "falcoes-mid"
      ? { playerId: p.id, champion: "Ahri", ...meio }
      : { playerId: p.id, champion: "Garen", kills: 1, deaths: 1, assists: 1 },
  );
}

/**
 * Uma temporada com dois times e UMA série decidida (2 x 0). O meio do time A, "Faisca",
 * fecha os jogos com 5/2/0 (KDA 2,50) e 4/1/1 (KDA 5,00): KDA da temporada 3,33.
 */
export function temporadaJogada(
  opcoes: Readonly<{ nome?: string; seasonId?: string; status?: "active" | "finished" }> = {},
): TournamentDataset {
  return tournamentDatasetSchema.parse({
    tournament: {
      name: opcoes.nome ?? "4ª Edição",
      seasonId: opcoes.seasonId ?? "season-4",
      status: opcoes.status ?? "active",
      lastUpdatedISO: "2026-11-21T03:00:00.000Z",
      seriesPointsRule: { win: 3, loss: 0 },
      format: "BO3",
    },
    teams: [TIME_A, TIME_B],
    players: [...elenco(TIME_A), ...elenco(TIME_B)],
    seriesMatches: [
      {
        id: "serie-1",
        date: "2026-11-20T19:00:00-03:00",
        teamAId: TIME_A.id,
        teamBId: TIME_B.id,
        format: "BO3",
        stage: "REGULAR_SEASON",
        games: [
          {
            winnerTeamId: TIME_A.id,
            mvpPlayerId: "falcoes-mid",
            durationMin: 31,
            statsByPlayer: linhas({ kills: 5, deaths: 2, assists: 0 }),
          },
          {
            winnerTeamId: TIME_A.id,
            mvpPlayerId: "falcoes-mid",
            durationMin: 28,
            statsByPlayer: linhas({ kills: 4, deaths: 1, assists: 1 }),
          },
        ],
      },
    ],
    standingsSeed: [],
    archivedSeasons: [],
  });
}

export const ID_DA_TERCEIRA = "season-3";

/**
 * A pré-temporada da 4ª com a 3ª Edição (a temporada de `temporadaJogada`) no arquivo.
 * É o estado do site hoje: nada no ar e o arquivo com nome próprio, "3ª Edição".
 */
export function preTemporadaComArquivo(): TournamentDataset {
  const terceira = temporadaJogada({ nome: "3ª Edição", seasonId: ID_DA_TERCEIRA, status: "finished" });
  const arquivada = buildArchivedSeason(terceira, "2026-10-05T12:00:00.000Z");
  return tournamentDatasetSchema.parse({
    tournament: { ...terceira.tournament, name: "4ª Edição", seasonId: "season-4", status: "active" },
    teams: [],
    players: [],
    seriesMatches: [],
    standingsSeed: [],
    archivedSeasons: [arquivada],
  });
}
