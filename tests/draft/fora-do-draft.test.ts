import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { alcancarORelogio, iniciarDraft, montarDraft, type EstadoDraft, type JogadorDoDraft } from "@/lib/draft/motor";
import { identidadeDoTime } from "@/lib/draft/times";
import { jogadoresForaDoDraft, listaForaDoDraft } from "@/lib/draft/virada";
import type { TournamentDataset } from "@/lib/schema";

/**
 * DRF-03 — recusa ou desistência DEPOIS do sorteio não aparecia no draft.
 *
 * O sorteio copia os aptos para o estado do draft e, dali em diante, o draft não olha mais
 * as inscrições. Quem desistia ou era recusado depois continuava no pool (escolhível), no
 * elenco, e atravessava a virada para o site — sem a mesa saber.
 *
 * A correção é só AVISO, sem mudar regra: a prévia do painel lista quem está no draft e
 * não é mais `apto`, a mesa mostra, e a virada (que publica os times no site) inclui os
 * nomes nos problemas e só segue com `confirmoForaDoDraft: true` no corpo. O que fazer
 * além disso é decisão da organização.
 */

type InscritoFalso = { id: string; riot_id: string; situacao: string };

const banco = vi.hoisted(() => ({
  dataset: null as unknown,
  versao: 4,
  salvos: [] as unknown[],
  draft: { estado: null as unknown, revisao: 1 },
  leiturasDoDraft: 0,
  inscritos: [] as InscritoFalso[],
  auditoria: [] as { acao: string; detalhe?: unknown }[],
}));

vi.mock("@/lib/data-store", () => ({
  readDatasetComVersao: async () => ({ dataset: structuredClone(banco.dataset), versao: banco.versao }),
  saveDataset: async (dataset: unknown) => {
    banco.salvos.push(dataset);
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
  lerConfig: async () => ({
    jogadores_por_time: 2,
    max_times: 6,
    orcamento_por_time: 10,
    segundos_por_escolha: 60,
    inscricoes_abertas: false,
    fechamento_inscricoes: null,
  }),
  // A inscrição inteira (o que `listarInscricoes` lê): elo, rotas e pontos de cada um.
  listarInscricoes: async () =>
    banco.inscritos.map((i) => ({
      ...i,
      organizador: false,
      elo_declarado: "Prata",
      elo_verificado: null,
      elo_congelado: "Prata",
      pontos: 3,
      rota_primaria: "MID",
      rota_secundaria: "TOP",
    })),
}));
vi.mock("@/lib/draft/store", async () => {
  const real = await vi.importActual<typeof import("@/lib/draft/store")>("@/lib/draft/store");
  return {
    ...real,
    lerDraftCompleto: async () => {
      banco.leiturasDoDraft++;
      return { estado: structuredClone(banco.draft.estado), revisao: banco.draft.revisao };
    },
    salvarDraftSeIntacto: async () => true,
  };
});

const { GET, POST } = await import("@/app/api/admin/draft/route");

function req(corpo?: unknown): NextRequest {
  const texto = JSON.stringify(corpo ?? {});
  return {
    method: corpo === undefined ? "GET" : "POST",
    headers: new Headers({ host: "x", "sec-fetch-site": "same-origin", "content-type": "application/json" }),
    text: async () => texto,
    json: async () => JSON.parse(texto) as unknown,
  } as unknown as NextRequest;
}

/** 6 times de 2 (capitão + 1), encerrado: o bastante para virar. */
function draftEncerrado(): EstadoDraft {
  const jogadores: JogadorDoDraft[] = Array.from({ length: 12 }, (_, i) => ({
    id: `i${i}`,
    riotId: `Jog${i}#BR1`,
    pontos: 3,
    rota1: "MID",
    rota2: "TOP",
    elo: "Prata",
    timeId: null,
  }));
  let e = montarDraft({
    times: Array.from({ length: 6 }, (_, i) => ({ id: `time-${i + 1}`, ...identidadeDoTime(i), capitaoId: `i${i}` })),
    jogadores,
    jogadoresPorTime: 2,
    orcamentoPorTime: 10,
    segundosPorEscolha: 60,
  });
  e = iniciarDraft(e, Date.parse("2026-11-15T20:00:00Z"));
  e = alcancarORelogio(e, Date.parse("2026-11-15T20:00:00Z") + 6 * 60_000 + 1);
  expect(e.fase).toBe("encerrado");
  return e;
}

function datasetAberto(): TournamentDataset {
  return {
    tournament: { name: "4ª Edição", lastUpdatedISO: "2026-11-15T00:00:00.000Z", seriesPointsRule: { win: 3, loss: 0 }, format: "BO3", seasonId: "s4", status: "active" },
    teams: [],
    players: [],
    seriesMatches: [],
    standingsSeed: [],
  } as unknown as TournamentDataset;
}

/** Todos os 12 do draft aptos, menos os que o teste mudar. */
function inscritos(mudancas: Record<string, string> = {}): InscritoFalso[] {
  return Array.from({ length: 12 }, (_, i) => ({
    id: `i${i}`,
    riot_id: `Jog${i}#BR1`,
    situacao: mudancas[`i${i}`] ?? "apto",
  }));
}

beforeEach(() => {
  banco.salvos = [];
  banco.auditoria = [];
  banco.leiturasDoDraft = 0;
  banco.draft = { estado: draftEncerrado(), revisao: 1 };
  banco.dataset = datasetAberto();
  banco.inscritos = inscritos();
});

describe("quem está no draft e não é mais apto (função pura)", () => {
  it("lista recusado, desistente, sobra, pendente e inscrição sumida; apto não entra", () => {
    const estado = draftEncerrado();
    const fora = jogadoresForaDoDraft(estado, [
      ...inscritos({ i3: "desistiu", i7: "recusado", i8: "sobra", i9: "pendente" }).filter((i) => i.id !== "i11"),
    ] as never);
    expect(fora).toEqual([
      { riotId: "Jog3#BR1", situacao: "desistiu" },
      { riotId: "Jog7#BR1", situacao: "recusado" },
      { riotId: "Jog8#BR1", situacao: "sobra" },
      { riotId: "Jog9#BR1", situacao: "pendente" },
      { riotId: "Jog11#BR1", situacao: "sem_inscricao" },
    ]);
    expect(listaForaDoDraft(fora.slice(0, 3))).toBe("Jog3#BR1 (desistiu), Jog7#BR1 (recusado), Jog8#BR1 (na sobra)");
  });

  it("sem draft, ou com todos aptos, a lista é vazia", () => {
    expect(jogadoresForaDoDraft(null, inscritos() as never)).toEqual([]);
    expect(jogadoresForaDoDraft(draftEncerrado(), inscritos() as never)).toEqual([]);
  });
});

describe("a prévia do painel (GET) traz a lista", () => {
  it("com um desistente depois do sorteio, `previa.foraDoDraft` diz quem e como ficou", async () => {
    banco.inscritos = inscritos({ i7: "desistiu" });
    const r = await GET(req());
    expect(r.status).toBe(200);
    const corpo = (await r.json()) as { previa: { foraDoDraft?: unknown } };
    expect(corpo.previa.foraDoDraft).toEqual([{ riotId: "Jog7#BR1", situacao: "desistiu" }]);
    // Uma leitura do draft só: o GET e a prévia usam a mesma.
    expect(banco.leiturasDoDraft).toBe(1);
  });

  it("todos aptos: lista vazia", async () => {
    const corpo = (await (await GET(req())).json()) as { previa: { foraDoDraft?: unknown } };
    expect(corpo.previa.foraDoDraft).toEqual([]);
  });
});

describe("a virada com alguém fora do draft", () => {
  it("prever devolve a lista, sem virar problema que trava", async () => {
    banco.inscritos = inscritos({ i7: "recusado" });
    const r = await POST(req({ acao: "prever" }));
    expect(r.status).toBe(200);
    const corpo = (await r.json()) as { problemas: string[]; foraDoDraft: unknown };
    expect(corpo.foraDoDraft).toEqual([{ riotId: "Jog7#BR1", situacao: "recusado" }]);
    expect(corpo.problemas).toEqual([]);
  });

  it("virar SEM confirmação: 409, os nomes nos problemas, e nada gravado", async () => {
    banco.inscritos = inscritos({ i7: "desistiu", i9: "recusado" });
    const r = await POST(req({ acao: "virar" }));
    expect(r.status).toBe(409);
    const corpo = (await r.json()) as { problemas: string[]; precisaConfirmarForaDoDraft?: boolean };
    expect(corpo.precisaConfirmarForaDoDraft).toBe(true);
    expect(corpo.problemas.join(" ")).toContain("Jog7#BR1 (desistiu), Jog9#BR1 (recusado)");
    expect(banco.salvos).toHaveLength(0);
  });

  it("confirmação que não é exatamente `true` não vale", async () => {
    banco.inscritos = inscritos({ i7: "desistiu" });
    expect((await POST(req({ acao: "virar", confirmoForaDoDraft: "sim" }))).status).toBe(409);
    expect((await POST(req({ acao: "virar", confirmoForaDoDraft: 1 }))).status).toBe(409);
    expect(banco.salvos).toHaveLength(0);
  });

  it("com `confirmoForaDoDraft: true`, aplica — e a auditoria guarda quem não era mais apto", async () => {
    banco.inscritos = inscritos({ i7: "desistiu" });
    const r = await POST(req({ acao: "virar", confirmoForaDoDraft: true }));
    expect(r.status).toBe(200);
    expect(banco.salvos).toHaveLength(1);
    const virada = banco.auditoria.find((a) => a.acao === "draft_virado_para_o_dataset");
    expect(virada?.detalhe).toMatchObject({ confirmadoForaDoDraft: [{ riotId: "Jog7#BR1", situacao: "desistiu" }] });
  });

  it("todos aptos: a virada segue como sempre, sem confirmação a mais", async () => {
    const r = await POST(req({ acao: "virar" }));
    expect(r.status).toBe(200);
    expect(banco.salvos).toHaveLength(1);
  });

  it("a confirmação não passa por cima de problema de verdade (draft não terminado)", async () => {
    const meio = montarDraft({
      times: [{ id: "time-1", ...identidadeDoTime(0), capitaoId: "i0" }],
      jogadores: [
        { id: "i0", riotId: "Jog0#BR1", pontos: 3, rota1: "MID", rota2: "TOP", elo: "Prata", timeId: null },
        { id: "i1", riotId: "Jog1#BR1", pontos: 3, rota1: "MID", rota2: "TOP", elo: "Prata", timeId: null },
      ],
      jogadoresPorTime: 2,
      orcamentoPorTime: 10,
      segundosPorEscolha: 60,
    });
    banco.draft = { estado: meio, revisao: 1 };
    banco.inscritos = inscritos({ i1: "desistiu" });
    const r = await POST(req({ acao: "virar", confirmoForaDoDraft: true }));
    expect(r.status).toBe(409);
    expect(((await r.json()) as { problemas: string[] }).problemas.join(" ")).toContain("não terminou");
    expect(banco.salvos).toHaveLength(0);
  });
});
