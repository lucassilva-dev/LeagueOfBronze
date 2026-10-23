import { readFileSync } from "node:fs";
import path from "node:path";

import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { alcancarORelogio, iniciarDraft, montarDraft, type EstadoDraft, type JogadorDoDraft } from "@/lib/draft/motor";
import { identidadeDoTime } from "@/lib/draft/times";
import { datasetDoDraft, problemasDaVirada, reservasDaVirada, type InscricaoDaVirada } from "@/lib/draft/virada";
import { tournamentDatasetSchema, type TournamentDataset } from "@/lib/schema";

/**
 * C4 (decisão do Lucas, 2026-10-22): a virada leva também os reservas da fila para o
 * dataset, como jogadores `reserva: true` SEM time — para poderem substituir jogo a jogo e
 * herdar a vaga de quem sair de vez (regra 6). Antes a virada só levava os elencos, e cada
 * reserva teria de ser cadastrado à mão no meio do campeonato.
 *
 * O contrato do torneio (I1): reserva vai SEM a chave `teamId` — nunca `teamId: ""`, que o
 * schema recusaria como time inexistente.
 */

const banco = vi.hoisted(() => ({
  dataset: null as unknown,
  versao: 4,
  salvos: [] as unknown[],
  draft: { estado: null as unknown, revisao: 1 },
  inscritos: [] as unknown[],
  auditoria: [] as { acao: string; detalhe?: unknown }[],
}));

vi.mock("@/lib/data-store", () => ({
  readDatasetComVersao: async () => ({ dataset: structuredClone(banco.dataset), versao: banco.versao }),
  saveDataset: async (dataset: unknown) => {
    banco.salvos.push(structuredClone(dataset));
    banco.dataset = dataset;
    return dataset;
  },
  ConflitoDeVersaoError: class extends Error {},
  createSupabaseAdminClient: () => {
    throw new Error("sem banco no teste");
  },
}));
vi.mock("@/lib/security/route-guard", () => ({
  mesmaOrigem: () => true,
  requireAdmin: async () => ({ ok: true, identity: { username: "lucas", isMaster: true, scopes: [] } }),
}));
vi.mock("@/lib/inscricoes/store", () => ({
  registrarAuditoria: async (r: { acao: string; detalhe?: unknown }) => {
    banco.auditoria.push(r);
  },
  lerConfig: async () => {
    throw new Error("a virada não precisa da configuração");
  },
  listarInscricoes: async () => structuredClone(banco.inscritos),
}));
vi.mock("@/lib/draft/store", async () => {
  const real = await vi.importActual<typeof import("@/lib/draft/store")>("@/lib/draft/store");
  return {
    ...real,
    lerDraftCompleto: async () => ({ estado: structuredClone(banco.draft.estado), revisao: banco.draft.revisao }),
    salvarDraftSeIntacto: async () => true,
  };
});

const { POST } = await import("@/app/api/admin/draft/route");

const T0 = Date.parse("2026-11-15T20:00:00Z");

/** 2 times de 2 (capitão + 1), encerrado pelo relógio: i0..i3 nos elencos. */
function draftEncerrado(): EstadoDraft {
  const jogadores: JogadorDoDraft[] = Array.from({ length: 4 }, (_, i) => ({
    id: `i${i}`,
    riotId: `Jog${i}#BR1`,
    pontos: 3,
    rota1: "MID",
    rota2: "TOP",
    elo: "Prata",
    timeId: null,
  }));
  let e = montarDraft({
    times: Array.from({ length: 2 }, (_, i) => ({ id: `time-${i + 1}`, ...identidadeDoTime(i), capitaoId: `i${i}` })),
    jogadores,
    jogadoresPorTime: 2,
    orcamentoPorTime: 10,
    segundosPorEscolha: 60,
  });
  e = iniciarDraft(e, T0);
  for (let k = 1; k <= 2; k++) e = alcancarORelogio(e, T0 + k * 60_000 + 1);
  expect(e.fase).toBe("encerrado");
  return e;
}

/** Uma linha de `inscricoes` com contato (que NÃO pode atravessar). */
function inscricao(id: string, situacao: string, minuto: number, over: Partial<InscricaoDaVirada> = {}) {
  return {
    id,
    riot_id: `${id === "r1" ? "Reserva Um" : id}#BR1`,
    situacao,
    criado_em: new Date(Date.UTC(2026, 9, 5, 12, minuto)).toISOString(),
    organizador: false,
    elo_declarado: "Ouro",
    elo_verificado: "Platina",
    elo_congelado: null,
    rota_primaria: "SUP",
    rota_secundaria: "ADC",
    email: `${id}@exemplo.com`,
    whatsapp: "+5511999999999",
    discord: `${id}#0001`,
    nome_real: "Fulano de Tal",
    ...over,
  };
}

/** Os 4 do draft, mais: dois reservas da fila, um titular pendente, uma sobra e três de fora. */
function inscritos() {
  return [
    ...["i0", "i1", "i2", "i3"].map((id, k) => inscricao(id, "apto", k)),
    inscricao("r2", "apto", 11),
    inscricao("r1", "apto", 10),
    inscricao("pend", "pendente", 5),
    inscricao("sob", "sobra", 4),
    inscricao("rec", "recusado", 6),
    inscricao("des", "desistiu", 7),
    inscricao("exc", "excluido", 8),
  ];
}

function datasetAberto(): TournamentDataset {
  return {
    tournament: {
      name: "4ª Edição",
      lastUpdatedISO: "2026-11-15T00:00:00.000Z",
      seriesPointsRule: { win: 3, loss: 0 },
      format: "BO3",
      seasonId: "s4",
      status: "active",
    },
    teams: [],
    players: [],
    seriesMatches: [],
    standingsSeed: [],
    archivedSeasons: [],
  } as unknown as TournamentDataset;
}

const req = (corpo: unknown): NextRequest => {
  const texto = JSON.stringify(corpo);
  return {
    method: "POST",
    headers: new Headers({ host: "x", "sec-fetch-site": "same-origin", "content-type": "application/json" }),
    text: async () => texto,
    json: async () => JSON.parse(texto) as unknown,
  } as unknown as NextRequest;
};

beforeEach(() => {
  banco.salvos = [];
  banco.auditoria = [];
  banco.draft = { estado: draftEncerrado(), revisao: 1 };
  banco.dataset = datasetAberto();
  banco.inscritos = inscritos();
});

describe("quem a virada leva como reserva (função pura)", () => {
  it("todo mundo da fila que não ficou num elenco, na ordem da fila; quem está fora não vai", () => {
    const reservas = reservasDaVirada(draftEncerrado(), inscritos());
    // Ordem de inscrição (pendente às 12:05, r1 às 12:10, r2 às 12:11) e a «sobra» no fim.
    expect(reservas.map((r) => r.riotId)).toEqual(["pend#BR1", "Reserva Um#BR1", "r2#BR1", "sob#BR1"]);
    expect(reservas[1]).toEqual({ riotId: "Reserva Um#BR1", rota1: "SUP", rota2: "ADC", elo: "Platina" });
  });

  it("reserva vai `reserva: true` e SEM a chave `teamId`; só nick, rotas e elo atravessam", () => {
    const estado = draftEncerrado();
    const { players } = datasetDoDraft(estado, reservasDaVirada(estado, inscritos()));
    const reservas = players.filter((p) => p.reserva);
    expect(reservas).toHaveLength(4);
    for (const p of reservas) {
      expect("teamId" in p, p.nick).toBe(false);
      expect(p.captain).toBeUndefined();
      expect(Object.keys(p).sort()).toEqual(["elo", "id", "nick", "reserva", "role1", "role2", "slug"]);
    }
    expect(players.find((p) => p.nick === "Reserva Um#BR1")).toMatchObject({ slug: "reserva-um", role1: "SUP", role2: "ADC", elo: "Platina" });
    const bruto = JSON.stringify(players);
    for (const proibido of ["@exemplo", "whatsapp", "+5511", "#0001", "Fulano"]) expect(bruto).not.toContain(proibido);
    // Os titulares continuam com time.
    expect(players.filter((p) => !p.reserva).every((p) => typeof p.teamId === "string" && p.teamId !== "")).toBe(true);
  });

  it("o dataset da virada, com os reservas, passa no schema de verdade (o mesmo de toda leitura)", () => {
    const estado = draftEncerrado();
    const resultado = datasetDoDraft(estado, reservasDaVirada(estado, inscritos()));
    const dataset = { ...datasetAberto(), teams: resultado.teams, players: resultado.players };
    const lido = tournamentDatasetSchema.safeParse(dataset);
    expect(lido.success, JSON.stringify(lido.error?.issues)).toBe(true);
  });

  it("com o dataset real da 3ª (leagueofbronze.json) por baixo, a virada com reservas continua válida", () => {
    const real = JSON.parse(readFileSync(path.join(process.cwd(), "leagueofbronze.json"), "utf8")) as TournamentDataset;
    const estado = draftEncerrado();
    const resultado = datasetDoDraft(estado, reservasDaVirada(estado, inscritos()));
    const lido = tournamentDatasetSchema.safeParse({
      ...real,
      teams: resultado.teams,
      players: resultado.players,
      seriesMatches: [],
      standingsSeed: [],
    });
    expect(lido.success, JSON.stringify(lido.error?.issues?.slice(0, 3))).toBe(true);
  });

  it("nick repetido entre elenco e reserva não sobrescreve a página de ninguém", () => {
    const estado = draftEncerrado();
    const reservas = [{ riotId: "Jog0#JPN", rota1: "TOP", rota2: "MID", elo: "Ouro" }];
    const { players } = datasetDoDraft(estado, reservas);
    const slugs = players.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(problemasDaVirada(estado, reservas)).toEqual([]);
  });
});

describe("a rota leva os reservas para o site", () => {
  it("prever mostra os reservas junto dos elencos", async () => {
    const r = await POST(req({ acao: "prever" }));
    expect(r.status).toBe(200);
    const corpo = (await r.json()) as { problemas: string[]; players: { nick: string; reserva?: boolean; teamId?: string }[] };
    expect(corpo.problemas).toEqual([]);
    expect(corpo.players.filter((p) => p.reserva).map((p) => p.nick)).toEqual(["pend#BR1", "Reserva Um#BR1", "r2#BR1", "sob#BR1"]);
  });

  it("virar grava elencos + reservas sem time, e a auditoria conta os reservas", async () => {
    const r = await POST(req({ acao: "virar" }));
    expect(r.status).toBe(200);
    const salvo = banco.salvos[0] as TournamentDataset;
    expect(salvo.players.filter((p) => !p.reserva)).toHaveLength(4);
    const reservas = salvo.players.filter((p) => p.reserva);
    expect(reservas).toHaveLength(4);
    expect(reservas.every((p) => !("teamId" in p))).toBe(true);
    expect(tournamentDatasetSchema.safeParse(salvo).success).toBe(true);
    expect(banco.auditoria.find((a) => a.acao === "draft_virado_para_o_dataset")?.detalhe).toMatchObject({ jogadores: 8, reservas: 4 });
  });

  it("sem ninguém além do draft, a virada é a de sempre (nenhum reserva)", async () => {
    banco.inscritos = inscritos().slice(0, 4);
    expect((await POST(req({ acao: "virar" }))).status).toBe(200);
    const salvo = banco.salvos[0] as TournamentDataset;
    expect(salvo.players).toHaveLength(4);
    expect(salvo.players.some((p) => p.reserva)).toBe(false);
  });
});
