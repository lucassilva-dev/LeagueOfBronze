import { describe, expect, it } from "vitest";

import { buildCalendarDays, buildFinalGame, buildRegularGames, compararDatasDeSerie } from "@/lib/calendar";
import type { SeriesMatch, TournamentDataset } from "@/lib/schema";

/**
 * Dia, hora e turno das séries do calendário, sempre no relógio de Brasília.
 *
 * O calendário recortava o texto ISO ("2026-11-21T01:00" → dia 21, 01:00) sem olhar o
 * fuso. Com -03:00 (o formato do calendário oficial e do painel) isso dá certo; com `Z`
 * — o que sai de um `toISOString()` — a série de sexta 20/11 às 22:00 aparecia no
 * sábado de madrugada, no turno da manhã.
 */

function dataset(series: Array<Pick<SeriesMatch, "id" | "date"> & Partial<SeriesMatch>>): TournamentDataset {
  return {
    tournament: {
      name: "4ª Edição",
      lastUpdatedISO: "2026-11-01T00:00:00.000Z",
      seriesPointsRule: { win: 3, loss: 0 },
      format: "BO3",
      status: "active",
    },
    archivedSeasons: [],
    teams: [
      { id: "a", name: "Alfa", slug: "alfa" },
      { id: "b", name: "Beta", slug: "beta" },
    ],
    players: [],
    seriesMatches: series.map((s) => ({ teamAId: "a", teamBId: "b", games: [], ...s })),
    standingsSeed: [],
  };
}

describe("o fuso das séries no calendário", () => {
  it("série gravada em UTC (Z) aparece no dia, na hora e no turno de Brasília", () => {
    // 2026-11-21T01:00Z = sexta 20/11, 22:00 em Brasília (o "pode atrasar" de sexta).
    const [jogo] = buildRegularGames(dataset([{ id: "s1", date: "2026-11-21T01:00:00.000Z" }]));
    expect(jogo).toMatchObject({ dateKey: "2026-11-20", dateLabel: "20/11", hora: "22:00", turno: "Noturno" });
  });

  it("outro fuso declarado (+00:00, -02:00) também é convertido", () => {
    const jogos = buildRegularGames(
      dataset([
        { id: "mais-zero", date: "2026-11-21T11:30:00+00:00" },
        { id: "menos-dois", date: "2026-11-21T17:30:00-02:00" },
      ]),
    );
    expect(jogos.map((j) => [j.id, j.dateKey, j.hora, j.turno])).toEqual([
      ["mais-zero", "2026-11-21", "08:30", "Matutino"],
      ["menos-dois", "2026-11-21", "16:30", "Vespertino"],
    ]);
  });

  it("meia-noite em Brasília sai 00:00 (não 24:00) e no dia certo", () => {
    const [jogo] = buildRegularGames(dataset([{ id: "s1", date: "2026-11-22T03:00:00.000Z" }]));
    expect(jogo).toMatchObject({ dateKey: "2026-11-22", hora: "00:00", turno: "Matutino" });
  });

  it("-03:00, sem fuso e data pura continuam lidos como estão (já são Brasília)", () => {
    const jogos = buildRegularGames(
      dataset([
        { id: "com-fuso", date: "2026-11-20T20:00:00-03:00" },
        { id: "sem-fuso", date: "2026-11-21T13:30" },
        { id: "so-data", date: "2026-11-22" },
      ]),
    );
    expect(jogos.map((j) => [j.id, j.dateKey, j.hora, j.turno])).toEqual([
      ["com-fuso", "2026-11-20", "20:00", "Noturno"],
      ["sem-fuso", "2026-11-21", "13:30", "Vespertino"],
      ["so-data", "2026-11-22", "", ""],
    ]);
  });

  it("as fronteiras dos turnos são as mesmas: 12:59 manhã, 13:00 tarde, 17:59 tarde, 18:00 noite", () => {
    const jogos = buildRegularGames(
      dataset([
        { id: "1259", date: "2026-11-21T15:59:00.000Z" },
        { id: "1300", date: "2026-11-21T16:00:00.000Z" },
        { id: "1759", date: "2026-11-21T20:59:00.000Z" },
        { id: "1800", date: "2026-11-21T21:00:00.000Z" },
      ]),
    );
    expect(jogos.map((j) => `${j.hora} ${j.turno}`)).toEqual([
      "12:59 Matutino",
      "13:00 Vespertino",
      "17:59 Vespertino",
      "18:00 Noturno",
    ]);
  });

  it("a final gravada em UTC também sai no horário de Brasília", () => {
    const final = buildFinalGame(dataset([{ id: "final", date: "2026-11-29T17:30:00.000Z", stage: "FINAL", format: "BO5" }]));
    expect(final).toMatchObject({ dateKey: "2026-11-29", dateLabel: "29/11", hora: "14:30", turno: "Vespertino" });
  });

  it("o dia do calendário agrupa pela data de Brasília", () => {
    const dias = buildCalendarDays(
      dataset([
        { id: "sexta-tarde", date: "2026-11-20T20:00:00-03:00" },
        { id: "sexta-noite-utc", date: "2026-11-21T01:00:00.000Z" },
      ]),
    );
    expect(dias.map((d) => [d.dateKey, d.games.map((g) => g.id)])).toEqual([
      ["2026-11-20", ["sexta-tarde", "sexta-noite-utc"]],
    ]);
  });
});

describe("a ordem das séries", () => {
  it("é a do instante, não a do texto, quando os fusos diferem", () => {
    // 23:30Z = 20:30 em Brasília, ANTES das 21:00 de Brasília. Pelo texto, "T21" < "T23"
    // punha a das 21:00 primeiro — e a numeração JOGO 1, JOGO 2 vem desta ordem.
    const jogos = buildRegularGames(
      dataset([
        { id: "as-21h", date: "2026-11-20T21:00:00-03:00" },
        { id: "as-20h30", date: "2026-11-20T23:30:00.000Z" },
      ]),
    );
    expect(jogos.map((j) => [j.n, j.id])).toEqual([
      [1, "as-20h30"],
      [2, "as-21h"],
    ]);
  });

  it("sem hora, vale o dia; no mesmo dia, a série sem hora vem antes", () => {
    const datas = ["2026-11-21T08:30:00-03:00", "2026-11-21", "2026-11-20T22:00", "2026-11-22"];
    expect([...datas].sort(compararDatasDeSerie)).toEqual([
      "2026-11-20T22:00",
      "2026-11-21",
      "2026-11-21T08:30:00-03:00",
      "2026-11-22",
    ]);
  });

  it("horário sem fuso conta como Brasília ao comparar com um em UTC", () => {
    // 20:00 sem fuso (= 23:00Z) vem DEPOIS de 22:30Z (= 19:30 em Brasília).
    expect(compararDatasDeSerie("2026-11-20T20:00", "2026-11-20T22:30:00.000Z")).toBeGreaterThan(0);
    expect(compararDatasDeSerie("2026-11-20T22:30:00.000Z", "2026-11-20T20:00")).toBeLessThan(0);
  });

  it("empate de horário mantém a ordem gravada (sort estável)", () => {
    const jogos = buildRegularGames(
      dataset([
        { id: "primeira", date: "2026-07-25T20:00:00-03:00" },
        { id: "segunda", date: "2026-07-25T20:00:00-03:00" },
      ]),
    );
    expect(jogos.map((j) => j.id)).toEqual(["primeira", "segunda"]);
  });
});
