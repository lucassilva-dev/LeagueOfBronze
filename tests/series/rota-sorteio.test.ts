import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { TournamentDataset } from "@/lib/schema";

/**
 * Regressão da rota de sorteio.
 *
 * Cada teste aqui corresponde a um defeito que EXISTIU e foi corrigido. A rota foi
 * escrita sem revisão e uma passagem adversarial encontrou treze buracos; estes são os
 * que tinham consequência de verdade — perder um sorteio já anunciado, apagar registro
 * de outro jogo, ou deixar o rastro de auditoria mentir.
 *
 * O data-store e a guarda são simulados para exercitar a rota inteira sem banco.
 */

const store = vi.hoisted(() => ({ read: vi.fn(), save: vi.fn(), versao: { atual: 7 } }));

/** Mesma classe de erro do data-store, para o teste exercitar o ramo de conflito. */
class ConflitoDeVersaoErrorFake extends Error {
  readonly code = "VERSAO_CONFLITO";
  constructor(readonly versaoAtual: number) {
    super("conflito");
    this.name = "ConflitoDeVersaoError";
  }
}
const guarda = vi.hoisted(() => ({ escopos: [] as (string | undefined)[] }));

vi.mock("@/lib/data-store", () => ({
  // A rota lê com versão e grava condicionada a ela — é a trava de concorrência.
  readDatasetComVersao: async () => ({ dataset: await store.read(), versao: store.versao.atual }),
  readDataset: store.read,
  saveDataset: store.save,
  ConflitoDeVersaoError: ConflitoDeVersaoErrorFake,
}));
vi.mock("@/lib/security/route-guard", () => ({
  mesmaOrigem: () => true,
  requireAdmin: async (_r: unknown, escopo?: string) => {
    guarda.escopos.push(escopo);
    return { ok: true, identity: { username: "lucas", isMaster: true, scopes: [] } };
  },
}));

const { POST } = await import("@/app/api/admin/series/sorteio/route");

type Serie = TournamentDataset["seriesMatches"][number];

function req(corpo: unknown): NextRequest {
  const texto = JSON.stringify(corpo);
  return {
    method: "POST",
    headers: new Headers({ host: "x", "sec-fetch-site": "same-origin" }),
    text: async () => texto,
    json: async () => JSON.parse(texto) as unknown,
  } as unknown as NextRequest;
}

function dataset(serie: Partial<Serie> = {}, status: "active" | "finished" = "active"): TournamentDataset {
  return {
    tournament: {
      name: "4ª Edição",
      lastUpdatedISO: "2026-08-24T00:00:00.000Z",
      seriesPointsRule: "WINS",
      format: "BO3",
      seasonId: "s4",
      status,
    },
    teams: [
      { id: "time-a", name: "A", slug: "a" },
      { id: "time-b", name: "B", slug: "b" },
    ],
    players: [],
    seriesMatches: [{ id: "s1", date: "2026-11-01", teamAId: "time-a", teamBId: "time-b", games: [], ...serie }],
    standingsSeed: [],
  } as unknown as TournamentDataset;
}

/** Lê e grava contra um "banco" em memória, para as travas de versão funcionarem. */
function comBanco(inicial: TournamentDataset) {
  let banco = structuredClone(inicial);
  store.read.mockImplementation(async () => structuredClone(banco));
  store.save.mockImplementation(async (novo: TournamentDataset) => {
    banco = structuredClone(novo);
    banco.tournament.lastUpdatedISO = new Date().toISOString();
    return banco;
  });
  return () => banco;
}

beforeEach(() => {
  store.read.mockReset();
  store.save.mockReset();
  guarda.escopos.length = 0;
});

describe("o sorteio não destrói o que já estava gravado", () => {
  it("preserva as cartas de OUTROS jogos", async () => {
    // A versão anterior reconstruía `cardsUsed` inteiro. Um sorteio para a série
    // apagava em silêncio a carta registrada com `gameIndex` do jogo 1.
    const ler = comBanco(
      dataset({ cardsUsed: [{ teamId: "time-a", cardId: "TUDO_LIBERADO", gameIndex: 1 }] } as Partial<Serie>),
    );

    const r = await POST(req({ seriesId: "s1", tipo: "carta", teamId: "time-a" }));
    expect(r.status).toBe(200);

    const cartas = ler().seriesMatches[0]!.cardsUsed ?? [];
    expect(cartas.some((c) => c.gameIndex === 1 && c.cardId === "TUDO_LIBERADO")).toBe(true);
  });

  it("o histórico é append-only de verdade: nada é empurrado para fora", async () => {
    // Antes havia `slice(-50)`: o 51º sorteio descartava o primeiro registro — o que
    // alguém querendo apagar rastro faria de propósito.
    const cheio = Array.from({ length: 50 }, (_, i) => ({
      tipo: "lados" as const,
      semente: "a".repeat(32),
      emISO: `2026-08-${String(i + 1).padStart(2, "0")}T00:00:00.000Z`,
      autor: "lucas",
      resultado: "time-a",
    }));
    comBanco(dataset({ sorteios: cheio } as Partial<Serie>));

    const r = await POST(req({ seriesId: "s1", tipo: "lados" }));
    const corpo = (await r.json()) as { error?: string };

    expect(r.status).toBe(409);
    expect(corpo.error).toMatch(/50 registros/i);
  });
});

describe("o sorteio não some depois de anunciado", () => {
  it("grava CONDICIONADA à versão lida — a condição viaja junto com a escrita", async () => {
    /*
     * O ponto da trava não é conferir: é gravar de forma que o banco recuse.
     *
     * A versão anterior lia, comparava e só então gravava — três passos, com uma janela
     * entre a conferência e a escrita por onde cabia outra requisição inteira. Os dois
     * sorteios passavam pela conferência e o segundo sobrescrevia o primeiro, com 200 na
     * tela dos dois.
     *
     * Este teste falha se alguém voltar a gravar sem a condição.
     */
    store.versao.atual = 7;
    store.read.mockImplementation(async () => dataset());

    const r = await POST(req({ seriesId: "s1", tipo: "lados" }));

    expect(r.status).toBe(200);
    expect(store.save).toHaveBeenCalledTimes(1);
    expect(store.save.mock.calls[0]![1]).toEqual({ versaoEsperada: 7 });
  });

  it("devolve 409 quando o banco recusa a gravação por versão", async () => {
    // Quem perde a corrida não escreve nada: o `update ... where version = <lida>` não
    // casa nenhuma linha e o data-store lança. A rota transforma isso em 409 com a
    // versão atual, para a tela poder se recuperar.
    store.read.mockImplementation(async () => dataset());
    store.save.mockRejectedValueOnce(new ConflitoDeVersaoErrorFake(9));

    const r = await POST(req({ seriesId: "s1", tipo: "lados" }));
    const corpo = (await r.json()) as { conflict?: boolean; versao?: number };

    expect(r.status).toBe(409);
    expect(corpo.conflict).toBe(true);
    expect(corpo.versao).toBe(9);
  });

  it("não deixa estado meio-gravado quando a gravação falha", async () => {
    // A série era mutada ANTES de saber se o save deu certo, e o cache em memória
    // passava a servir um sorteio que nunca chegou ao banco.
    const original = dataset();
    store.read.mockResolvedValue(original);
    store.save.mockRejectedValue(new Error("banco fora"));

    const r = await POST(req({ seriesId: "s1", tipo: "lados" }));
    expect(r.status).toBe(500);
    expect(original.seriesMatches[0]!.blueSideTeamId).toBeUndefined();
    expect(original.seriesMatches[0]!.sorteios).toBeUndefined();
  });
});

describe("o sorteio recusa o que não faz sentido", () => {
  it("não re-sorteia os lados de uma série que já tem jogo registrado", async () => {
    comBanco(
      dataset({
        games: [{ winnerTeamId: "time-a", mvpPlayerId: "x", statsByPlayer: [] }],
      } as unknown as Partial<Serie>),
    );

    const r = await POST(req({ seriesId: "s1", tipo: "lados" }));
    const corpo = (await r.json()) as { error?: string };
    expect(r.status).toBe(409);
    expect(corpo.error).toMatch(/já tem 1 jogo/i);
  });

  it("não sorteia em temporada encerrada", async () => {
    comBanco(dataset({}, "finished"));
    expect((await POST(req({ seriesId: "s1", tipo: "lados" }))).status).toBe(409);
  });

  it("não sorteia em série decidida por W.O.", async () => {
    comBanco(dataset({ walkoverWinnerTeamId: "time-a" } as Partial<Serie>));
    const r = await POST(req({ seriesId: "s1", tipo: "carta", teamId: "time-a" }));
    const corpo = (await r.json()) as { error?: string };
    expect(r.status).toBe(409);
    expect(corpo.error).toMatch(/W\.O\./i);
  });

  it("continua exigindo o escopo certo para cada tipo", async () => {
    comBanco(dataset());
    await POST(req({ seriesId: "s1", tipo: "lados" }));
    expect(guarda.escopos).toContain("series:sides");
    expect(guarda.escopos).not.toContain("series:cards");
  });
});

describe("o registro conta a verdade", () => {
  it("grava semente, autor e resultado — e o resultado aplicado é o mesmo", async () => {
    const ler = comBanco(dataset());
    const r = await POST(req({ seriesId: "s1", tipo: "lados" }));
    expect(r.status).toBe(200);

    const serie = ler().seriesMatches[0]!;
    const registro = serie.sorteios![0]!;

    expect(registro.semente).toMatch(/^[0-9a-f]{32}$/);
    expect(registro.autor).toBe("lucas");
    // O que ficou aplicado tem de ser o que foi sorteado — era exatamente isto que a
    // sobrescrita pela rota antiga quebrava em silêncio.
    expect(serie.blueSideTeamId).toBe(registro.resultado);
  });

  it("o ABCDRAFT leva as letras junto, e elas cabem no que o schema aceita", async () => {
    const ler = comBanco(dataset());

    // Sorteia até sair ABCDRAFT (1 em 6); o teste é sobre o formato, não sobre a sorte.
    for (let i = 0; i < 60; i++) {
      await POST(req({ seriesId: "s1", tipo: "carta", teamId: "time-a" }));
      const registros = ler().seriesMatches[0]!.sorteios ?? [];
      const abc = registros.find((s) => s.resultado === "ABCDRAFT");
      if (abc) {
        expect(abc.detalhe?.letras).toHaveLength(2);
        expect(abc.detalhe?.campeoes).toBeGreaterThanOrEqual(12);
        return;
      }
    }
    throw new Error("ABCDRAFT não saiu em 60 sorteios — improvável a ponto de indicar defeito.");
  });
});
