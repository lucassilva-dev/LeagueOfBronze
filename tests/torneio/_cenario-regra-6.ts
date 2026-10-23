import { tournamentDatasetSchema, type PlayerGameStats, type SeriesGame, type TournamentDataset } from "@/lib/schema";

/**
 * Cenário das decisões de 22/10/2026 (regra 6 e W.O. no meio da série).
 *
 * Três times de 5 (ALFA, BETA, GAMA) e um reserva oficial sem time (`r1`). Os ids dos
 * jogadores são `<time>-<rota>` (alfa-top, beta-mid...), com elo Prata (3 pontos) para
 * todo mundo, a não ser onde o teste muda. A capitã marcada de cada time é a MID.
 *
 * Nenhuma série tem jogo: cada teste lança os seus com `jogo()`.
 */
export const TIMES = ["alfa", "beta", "gama"] as const;
export const ROTAS = ["TOP", "JUNGLE", "MID", "ADC", "SUP"] as const;

export const id = (time: string, rota: string) => `${time}-${rota.toLowerCase()}`;

export function cenario(): TournamentDataset {
  return tournamentDatasetSchema.parse({
    tournament: {
      name: "4ª Edição",
      lastUpdatedISO: "2026-11-21T00:00:00.000Z",
      seriesPointsRule: { win: 3, loss: 0 },
      format: "BO3",
      status: "active",
      seasonId: "s4",
    },
    teams: TIMES.map((time) => ({ id: time, name: time.toUpperCase(), slug: time })),
    players: [
      ...TIMES.flatMap((time) =>
        ROTAS.map((rota) => ({
          id: id(time, rota),
          nick: `${time}${rota}#BR1`,
          slug: id(time, rota),
          teamId: time,
          role1: rota,
          elo: "Prata",
          ...(rota === "MID" ? { captain: true } : {}),
        })),
      ),
      { id: "r1", nick: "Reserva#BR1", slug: "reserva", reserva: true, role1: "MID", elo: "Prata" },
    ],
    seriesMatches: [
      { id: "s1", date: "2026-11-20T19:00:00-03:00", teamAId: "alfa", teamBId: "beta", games: [] },
      { id: "s2", date: "2026-11-21T19:00:00-03:00", teamAId: "gama", teamBId: "beta", games: [] },
      { id: "s3", date: "2026-11-22T19:00:00-03:00", teamAId: "alfa", teamBId: "gama", games: [] },
    ],
    standingsSeed: [],
    archivedSeasons: [],
  });
}

/** Linha de K/D/A; `teamId` só quando o teste quer o substituto avulso. */
export function linha(
  playerId: string,
  kills: number,
  deaths: number,
  assists: number,
  extra: Partial<PlayerGameStats> = {},
): PlayerGameStats {
  return { playerId, kills, deaths, assists, ...extra };
}

/** As 5 linhas de um time com o mesmo K/D/A, tirando as rotas em `fora`. */
export function linhasDoTime(
  time: string,
  kda: [number, number, number],
  fora: readonly string[] = [],
): PlayerGameStats[] {
  return ROTAS.filter((rota) => !fora.includes(rota)).map((rota) => linha(id(time, rota), ...kda));
}

export function jogo(winnerTeamId: string, statsByPlayer: PlayerGameStats[]): SeriesGame {
  return { winnerTeamId, mvpPlayerId: statsByPlayer[0]?.playerId ?? id(winnerTeamId, "MID"), statsByPlayer };
}

/** Valida como o servidor valida em toda leitura. */
export function validar(dataset: unknown) {
  return tournamentDatasetSchema.safeParse(dataset);
}

/** As mensagens de erro do schema, para conferir o texto que o painel vai mostrar. */
export function mensagens(dataset: unknown): string[] {
  const r = validar(dataset);
  return r.success ? [] : r.error.issues.map((issue) => issue.message);
}

export const copia = <T,>(valor: T): T => JSON.parse(JSON.stringify(valor)) as T;
