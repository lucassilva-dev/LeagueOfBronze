import { describe, expect, it } from "vitest";

import { semTemporadaAoVivo } from "../lib/fase-do-site";
import type { ArchivedSeason } from "../lib/schema";

/**
 * Quando as páginas da temporada mostram o aviso de pré-temporada.
 *
 * Três estados reais, e a regra precisa acertar os três:
 *  - a 4ª nasceu SEM elencos (o jeito certo): sem times → aviso;
 *  - a 4ª nasceu mantendo os elencos da 3ª (o padrão do painel): times zerados da 3ª → aviso;
 *  - a virada do draft já gravou os times NOVOS, ainda sem série → os times aparecem.
 */

const TERCEIRA: ArchivedSeason = {
  seasonId: "season-3",
  name: "3ª Edição",
  archivedAtISO: "2026-10-05T20:00:00.000Z",
  endedAtISO: "2026-10-05T20:00:00.000Z",
  snapshot: {
    tournament: {
      name: "3ª Edição",
      lastUpdatedISO: "2026-08-02T20:00:00.000Z",
      seriesPointsRule: { win: 3, loss: 0 },
      format: "BO3",
      status: "finished",
    },
    teams: [
      { id: "pantera", name: "Pantera", slug: "pantera" },
      { id: "shurima", name: "Shurima", slug: "shurima" },
    ],
    players: [
      { id: "heimer", nick: "HEIMER", slug: "heimer", teamId: "shurima", role1: "MID", elo: "OURO" },
      { id: "nak4y", nick: "Nak4y", slug: "nak4y", teamId: "pantera", role1: "ADC", elo: "OURO" },
    ],
    seriesMatches: [{ id: "final-3", date: "2026-08-02", teamAId: "pantera", teamBId: "shurima", games: [] }],
    standingsSeed: [],
  },
};

const MANTIDOS = {
  teams: TERCEIRA.snapshot.teams,
  players: TERCEIRA.snapshot.players,
  seriesMatches: [],
  archivedSeasons: [TERCEIRA],
};

/** O que a virada grava: times do draft, e o Nak4y (mesmo nick, mesmo id) num time novo. */
const DO_DRAFT = {
  teams: [
    { id: "lobos", name: "Lobos", slug: "lobos" },
    { id: "pantera", name: "Pantera", slug: "pantera" }, // nome repetido de propósito
  ],
  players: [
    { id: "nak4y", teamId: "lobos" },
    { id: "heimer", teamId: "pantera" },
  ],
  seriesMatches: [],
  archivedSeasons: [TERCEIRA],
};

describe("semTemporadaAoVivo", () => {
  it("sem times, sempre vazia — em qualquer fase", () => {
    const vazia = { teams: [], players: [], seriesMatches: [], archivedSeasons: [TERCEIRA] };
    expect(semTemporadaAoVivo(vazia, "pre_temporada")).toBe(true);
    expect(semTemporadaAoVivo(vazia, "temporada")).toBe(true);
  });

  it("na pré-temporada, os elencos MANTIDOS da 3ª, sem série, não são a 4ª", () => {
    expect(semTemporadaAoVivo(MANTIDOS, "pre_temporada")).toBe(true);
  });

  it("mantendo só os times (sem jogadores), também não é a 4ª", () => {
    expect(semTemporadaAoVivo({ ...MANTIDOS, players: [] }, "pre_temporada")).toBe(true);
  });

  it("depois da virada, os times do draft aparecem — mesmo antes de trocar a fase do site", () => {
    // O defeito que este caso pega: só contar séries escondia os times da 4ª atrás do
    // aviso e mandava o Nak4y (mesmo nick da 3ª) para a ficha arquivada.
    expect(semTemporadaAoVivo(DO_DRAFT, "pre_temporada")).toBe(false);
  });

  it("antes de arquivar, a 3ª ainda tem séries e continua visível", () => {
    const aoVivo = { ...MANTIDOS, seriesMatches: TERCEIRA.snapshot.seriesMatches, archivedSeasons: [] };
    expect(semTemporadaAoVivo(aoVivo, "pre_temporada")).toBe(false);
  });

  it("sem nenhuma edição arquivada, times sem série são a temporada", () => {
    expect(semTemporadaAoVivo({ ...MANTIDOS, archivedSeasons: [] }, "pre_temporada")).toBe(false);
  });

  it("com o campeonato no ar, times sem série ainda são a temporada — o calendário só não começou", () => {
    expect(semTemporadaAoVivo(MANTIDOS, "temporada")).toBe(false);
  });
});
