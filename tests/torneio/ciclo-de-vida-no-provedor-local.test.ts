import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { TournamentDataset } from "@/lib/schema";

/**
 * ENCERRAR, REFAZER O RETRATO E VIRAR A TEMPORADA — com o provedor LOCAL e o
 * `leagueofbronze.json` em MEMÓRIA (o arquivo do repositório não é tocado). Rotas e
 * data-store de verdade; só o `requireAdmin` é trocado.
 */
const arquivo = vi.hoisted(() => ({ texto: "" }));
vi.mock("node:fs", async (original) => {
  const real = await original<typeof import("node:fs")>();
  return {
    ...real,
    promises: {
      ...real.promises,
      readFile: async (p: unknown, ...resto: unknown[]) =>
        String(p).endsWith("leagueofbronze.json")
          ? arquivo.texto
          : (real.promises.readFile as (...a: unknown[]) => Promise<unknown>)(p, ...resto),
      writeFile: async (p: unknown, texto: string, ...resto: unknown[]) => {
        if (String(p).endsWith("leagueofbronze.json")) {
          arquivo.texto = texto;
          return;
        }
        return (real.promises.writeFile as (...a: unknown[]) => Promise<unknown>)(p, texto, ...resto);
      },
    },
  };
});

vi.mock("@/lib/security/route-guard", async () => {
  const { sessao } = await import("../series/_tournament-state-em-memoria");
  return {
    mesmaOrigem: () => true,
    requireAdmin: async () => ({ ok: true, identity: sessao.identity }),
  };
});

import { datasetDoDia, jogoAB, MASTER, req, sessao } from "../series/_tournament-state-em-memoria";
import { getChampionshipResult, getSeriesScore, snapshotToDataset } from "@/lib/tournament";

process.env.DATA_PROVIDER = "local";

const { POST: ENCERRAR } = await import("@/app/api/admin/tournament/end/route");
const { POST: INICIAR } = await import("@/app/api/admin/tournament/start/route");
const { readDataset, saveDataset } = await import("@/lib/data-store");

/** A 3ª: final MD5 em 02/08 (14h de Brasília, sem fuso escrito), 3x1 para A. */
function terceira(): TournamentDataset {
  const d = datasetDoDia();
  d.tournament = { ...d.tournament, name: "3ª Edição", seasonId: "season-3" };
  d.seriesMatches = [
    {
      id: "serie-1",
      date: "2026-07-20T21:00",
      teamAId: "c",
      teamBId: "d",
      games: [
        { winnerTeamId: "c", mvpPlayerId: "c1", statsByPlayer: [] },
        { winnerTeamId: "c", mvpPlayerId: "c1", statsByPlayer: [] },
      ],
    },
    {
      id: "grande-final",
      date: "2026-08-02T14:00",
      teamAId: "a",
      teamBId: "b",
      stage: "FINAL",
      format: "BO5",
      games: (["a", "b", "a", "a"] as const).map(jogoAB),
    },
  ];
  return d;
}

beforeEach(() => {
  process.env.DATA_PROVIDER = "local";
  delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
  sessao.identity = { ...MASTER };
  arquivo.texto = JSON.stringify(terceira());
});

afterEach(() => {
  vi.useRealTimers();
});

describe("a data do fim da temporada", () => {
  it("arquivar a 3ª em 15/11 grava a data da FINAL (02/08, 14h de Brasília), não a do clique", async () => {
    vi.useFakeTimers({ now: new Date("2026-11-15T15:00:00.000Z"), toFake: ["Date"] });

    expect((await ENCERRAR(req({}, "POST"))).status).toBe(200);
    const d = await readDataset();
    // Sem fuso escrito é Brasília: 14:00-03:00 = 17:00Z (nunca 14:00Z).
    expect(d.tournament.endedAtISO).toBe("2026-08-02T17:00:00.000Z");
    const retrato = d.archivedSeasons.find((s) => s.seasonId === "season-3")!;
    expect(retrato.endedAtISO).toBe("2026-08-02T17:00:00.000Z");
    expect(retrato.archivedAtISO).toBe("2026-11-15T15:00:00.000Z");
  });

  it("sem final, vale a série com resultado mais tarde; sem nenhum resultado, o agora", async () => {
    vi.useFakeTimers({ now: new Date("2026-11-15T15:00:00.000Z"), toFake: ["Date"] });

    const semFinal = terceira();
    semFinal.seriesMatches = semFinal.seriesMatches.filter((s) => s.stage !== "FINAL");
    arquivo.texto = JSON.stringify(semFinal);
    await ENCERRAR(req({}, "POST"));
    expect((await readDataset()).tournament.endedAtISO).toBe("2026-07-21T00:00:00.000Z");

    const vazia = terceira();
    vazia.seriesMatches = vazia.seriesMatches.map((s) => ({ ...s, games: [] }));
    arquivo.texto = JSON.stringify(vazia);
    await ENCERRAR(req({}, "POST"));
    expect((await readDataset()).tournament.endedAtISO).toBe("2026-11-15T15:00:00.000Z");
  });

  it("reencerrar preserva a data do fim", async () => {
    vi.useFakeTimers({ now: new Date("2026-11-15T15:00:00.000Z"), toFake: ["Date"] });
    await ENCERRAR(req({}, "POST"));
    vi.setSystemTime(new Date("2026-11-16T15:00:00.000Z"));
    const r = await ENCERRAR(req({}, "POST"));
    expect(((await r.json()) as { refeito: boolean }).refeito).toBe(true);
    expect((await readDataset()).tournament.endedAtISO).toBe("2026-08-02T17:00:00.000Z");
  });
});

describe("refazer o retrato da temporada já encerrada", () => {
  /** Encerra com a final 3x1 e depois corrige pelo painel: 3x2 e o nome de um time. */
  async function encerradaECorrigida() {
    const primeira = await ENCERRAR(req({}, "POST"));
    expect(primeira.status).toBe(200);
    expect(((await primeira.json()) as { refeito: boolean }).refeito).toBe(false);

    const vivo = await readDataset();
    expect(vivo.tournament.status).toBe("finished");
    const final = vivo.seriesMatches.find((s) => s.id === "grande-final")!;
    final.games = [jogoAB("a"), jogoAB("b"), jogoAB("b"), jogoAB("a"), jogoAB("a")]; // 3x2
    vivo.teams[0]!.name = "Alfa (nome corrigido)";
    await saveDataset(vivo);
  }

  function retratoDaTerceira(d: TournamentDataset) {
    const retrato = d.archivedSeasons.find((s) => s.seasonId === "season-3")!;
    const comoDataset = snapshotToDataset(retrato.snapshot);
    const final = comoDataset.seriesMatches.find((s) => s.id === "grande-final")!;
    return { retrato, placar: getSeriesScore(final, comoDataset), nome: comoDataset.teams[0]!.name };
  }

  it("«Iniciar nova temporada» com arquivar marcado REFAZ o retrato antes de zerar as séries", async () => {
    await encerradaECorrigida();

    const r = await INICIAR(
      req({ name: "4ª Edição", format: "BO3", keepTeams: true, keepPlayers: true, archiveCurrent: true, confirm: true }, "POST"),
    );
    expect(r.status).toBe(200);

    const depois = await readDataset();
    expect(depois.seriesMatches).toHaveLength(0);
    // Antes: o retrato continuava 3x1 com "A" — e era o único exemplar da 3ª.
    const { placar, nome, retrato } = retratoDaTerceira(depois);
    expect(placar).toEqual({ teamAWins: 3, teamBWins: 2 });
    expect(nome).toBe("Alfa (nome corrigido)");
    // Uma entrada só para a 3ª, sem duplicar.
    expect(depois.archivedSeasons.filter((s) => s.seasonId === "season-3")).toHaveLength(1);
    expect(retrato.endedAtISO).toBe("2026-08-02T17:00:00.000Z");
  });

  it("sem pedir para arquivar, a virada NÃO refaz o retrato (o vivo pode já ter sido mexido)", async () => {
    await encerradaECorrigida();

    const r = await INICIAR(
      req({ name: "4ª Edição", format: "BO3", keepTeams: true, keepPlayers: true, archiveCurrent: false, confirm: true }, "POST"),
    );
    expect(r.status).toBe(200);
    expect(retratoDaTerceira(await readDataset()).placar).toEqual({ teamAWins: 3, teamBWins: 1 });
  });

  it("«Encerrar» de novo é a ação explícita de atualizar o retrato, e diz isso", async () => {
    await encerradaECorrigida();

    const r = await ENCERRAR(req({}, "POST"));
    expect(r.status).toBe(200);
    const corpo = (await r.json()) as { refeito: boolean; message: string; dataset: TournamentDataset };
    expect(corpo.refeito).toBe(true);
    expect(corpo.message).toBe("Retrato arquivado atualizado.");

    const { placar } = retratoDaTerceira(corpo.dataset);
    expect(placar).toEqual({ teamAWins: 3, teamBWins: 2 });
    expect(corpo.dataset.archivedSeasons.filter((s) => s.seasonId === "season-3")).toHaveLength(1);
    expect(getChampionshipResult(snapshotToDataset(retratoDaTerceira(corpo.dataset).retrato.snapshot))?.championTeamId).toBe("a");
  });
});
