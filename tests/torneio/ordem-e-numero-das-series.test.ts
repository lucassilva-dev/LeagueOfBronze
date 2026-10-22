import { describe, expect, it } from "vitest";

import { buildRegularGames } from "@/lib/calendar";
import { seriesDaFaseDePontos } from "@/lib/calendario-4a";
import { tournamentDatasetSchema, type SeriesMatch, type TournamentDataset } from "@/lib/schema";
import { getSeriesSummaries, ordenarSeriesParaPartidas } from "@/lib/tournament";

/**
 * A ORDEM DO /partidas E O "JOGO N" DO /calendario, com as 15 séries da 4ª criadas de uma
 * vez pelo gerador do calendário (como acontece de verdade).
 */

const TIMES = ["chama", "aurea", "verdante", "gelida", "arcana", "carmesim"];

function quarta(series: SeriesMatch[]): TournamentDataset {
  const jogador = (time: string, n: number) => ({
    id: `${time}-${n}`,
    nick: `${time}-${n}`,
    slug: `${time}-${n}`,
    teamId: time,
    role1: "MID",
    elo: "Ouro",
  });
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
    players: TIMES.map((t) => jogador(t, 1)),
    seriesMatches: series,
    standingsSeed: [],
    archivedSeasons: [],
  });
}

/** Série decidida em 2x0 para o time A. */
function decidir(serie: SeriesMatch) {
  const jogo = {
    winnerTeamId: serie.teamAId,
    mvpPlayerId: `${serie.teamAId}-1`,
    statsByPlayer: [
      { playerId: `${serie.teamAId}-1`, kills: 5, deaths: 1, assists: 3 },
      { playerId: `${serie.teamBId}-1`, kills: 1, deaths: 5, assists: 1 },
    ],
  };
  serie.games = [jogo, structuredClone(jogo)];
}

describe("/partidas: resultados primeiro, depois as séries por jogar", () => {
  it("em 21/11, abre com a recém-terminada, e as por jogar vêm da mais próxima para a mais distante", () => {
    const series = seriesDaFaseDePontos(TIMES);
    for (const id of ["4a-jogo-01", "4a-jogo-02", "4a-jogo-03"]) decidir(series.find((s) => s.id === id)!);
    const d = quarta(series);

    // A ordem "crua" (só data decrescente) começa pela mais distante no futuro.
    expect(getSeriesSummaries(d)[0]!.series.id).toBe("4a-jogo-15");

    const ordem = ordenarSeriesParaPartidas(getSeriesSummaries(d)).map((s) => s.series.id);
    expect(ordem.slice(0, 3)).toEqual(["4a-jogo-03", "4a-jogo-02", "4a-jogo-01"]);
    expect(ordem[3]).toBe("4a-jogo-04");
    expect(ordem.at(-1)).toBe("4a-jogo-15");
    expect(ordem).toHaveLength(15);
  });

  it("não mexe na lista que recebe (campeão e histórico do time usam a ordem decrescente)", () => {
    const d = quarta(seriesDaFaseDePontos(TIMES));
    const resumos = getSeriesSummaries(d);
    const antes = resumos.map((s) => s.series.id);
    ordenarSeriesParaPartidas(resumos);
    expect(resumos.map((s) => s.series.id)).toEqual(antes);
  });
});

describe("/calendario: o JOGO N fica preso à série", () => {
  it("remarcar a 4a-jogo-03 para a reserva de 28/11 não renumera ninguém", () => {
    const series = seriesDaFaseDePontos(TIMES);
    series.find((s) => s.id === "4a-jogo-03")!.date = "2026-11-28T19:00:00-03:00";
    const jogos = buildRegularGames(quarta(series));
    const n = (id: string) => jogos.find((j) => j.id === id)!.n;

    // Antes: a 4a-jogo-03 virava JOGO 15 e a 4a-jogo-04 virava JOGO 3.
    expect(n("4a-jogo-03")).toBe(3);
    expect(n("4a-jogo-04")).toBe(4);
    for (const jogo of jogos) expect(`4a-jogo-${String(jogo.n).padStart(2, "0")}`).toBe(jogo.id);
    // A ORDEM na tela continua cronológica: a remarcada é a última.
    expect(jogos.at(-1)!.id).toBe("4a-jogo-03");
  });

  it("temporada sem o id numerado (a 3ª: serie-14) segue numerando pela ordem cronológica", () => {
    const series = seriesDaFaseDePontos(TIMES).map((s, i) => ({ ...s, id: `serie-${i + 1}` }));
    series[0]!.date = "2026-11-28T19:00:00-03:00";
    const jogos = buildRegularGames(quarta(series));
    expect(jogos.map((j) => j.n)).toEqual(Array.from({ length: 15 }, (_, i) => i + 1));
  });

  it("uma série avulsa sem o padrão no meio das numeradas não gera número repetido", () => {
    const series = seriesDaFaseDePontos(TIMES);
    series.push({ ...series[0]!, id: "desempate-extra", date: "2026-11-28T21:00:00-03:00" });
    const jogos = buildRegularGames(quarta(series));
    expect(new Set(jogos.map((j) => j.n)).size).toBe(jogos.length);
  });
});
