import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * A ação «capitaes» da rota da mesa (POST /api/admin/draft): grava os capitães DEFINIDOS pela
 * organização (decisão de 23/10/2026). Escopo draft:conduzir, recusada com o draft já sorteado,
 * registrada na auditoria. A gravação em si (`salvarCapitaesDefinidos`) tem o teste dela.
 */

const banco = vi.hoisted(() => ({
  draft: { estado: null as unknown, revisao: 1 },
  salvos: [] as string[][],
  auditoria: [] as { acao: string; autor?: string; detalhe?: unknown }[],
  escopos: [] as string[],
}));

vi.mock("@/lib/data-store", () => ({
  readDatasetComVersao: async () => {
    throw new Error("não usado");
  },
  saveDataset: async () => {
    throw new Error("não usado");
  },
  ConflitoDeVersaoError: class extends Error {},
  createSupabaseAdminClient: () => {
    throw new Error("sem banco no teste");
  },
}));
vi.mock("@/lib/security/route-guard", () => ({
  mesmaOrigem: () => true,
  requireAdmin: async (_request: unknown, escopo: string) => {
    banco.escopos.push(escopo);
    return { ok: true, identity: { username: "lucas", isMaster: true, scopes: [] } };
  },
}));
vi.mock("@/lib/inscricoes/store", () => ({
  registrarAuditoria: async (r: { acao: string; autor?: string; detalhe?: unknown }) => {
    banco.auditoria.push(r);
  },
  lerConfig: async () => {
    throw new Error("não usado");
  },
  listarInscricoes: async () => [],
}));
vi.mock("@/lib/draft/store", async () => {
  const real = await vi.importActual<typeof import("@/lib/draft/store")>("@/lib/draft/store");
  return {
    ...real,
    lerDraftCompleto: async () => ({ estado: structuredClone(banco.draft.estado), revisao: banco.draft.revisao }),
    salvarCapitaesDefinidos: async (ids: string[]) => {
      banco.salvos.push([...ids]);
      return { antes: ["Velho#BR1"], depois: ids.map((i) => `${i}#BR1`) };
    },
  };
});

const { POST } = await import("@/app/api/admin/draft/route");

function req(corpo: unknown): NextRequest {
  const texto = JSON.stringify(corpo);
  return {
    method: "POST",
    headers: new Headers({ host: "x", "sec-fetch-site": "same-origin", "content-type": "application/json" }),
    text: async () => texto,
    json: async () => JSON.parse(texto) as unknown,
  } as unknown as NextRequest;
}

beforeEach(() => {
  banco.draft = { estado: null, revisao: 1 };
  banco.salvos = [];
  banco.auditoria = [];
  banco.escopos = [];
});

describe("POST /api/admin/draft — capitães definidos", () => {
  it("grava a lista, responde os Riot IDs e registra antes/depois na auditoria, com o escopo de conduzir", async () => {
    const r = await POST(req({ acao: "capitaes", capitaes: ["i1", "i2"] }));
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ ok: true, capitaes: ["i1#BR1", "i2#BR1"] });
    expect(banco.salvos).toEqual([["i1", "i2"]]);
    expect(banco.escopos).toEqual(["draft:conduzir"]);
    expect(banco.auditoria).toEqual([
      { autor: "lucas", acao: "draft_capitaes_definidos", detalhe: { antes: ["Velho#BR1"], depois: ["i1#BR1", "i2#BR1"] } },
    ]);
  });

  it("com o draft já sorteado, recusa (409) sem gravar nada", async () => {
    banco.draft = { estado: { fase: "preparando", sorteio: { semente: "s" } }, revisao: 3 };
    const r = await POST(req({ acao: "capitaes", capitaes: ["i1"] }));
    expect(r.status).toBe(409);
    expect(((await r.json()) as { error: string }).error).toMatch(/já foi sorteado/);
    expect(banco.salvos).toEqual([]);
    expect(banco.auditoria).toEqual([]);
  });

  it("corpo sem lista (ou com item que não é texto): 400", async () => {
    for (const capitaes of [undefined, "i1", [1, 2], ["i1", null]]) {
      const r = await POST(req({ acao: "capitaes", capitaes }));
      expect(r.status).toBe(400);
    }
    expect(banco.salvos).toEqual([]);
  });

  it("o sorteio aceita o método «definidos»", async () => {
    // Não chega a montar (o mock de inscrições não tem configuração): basta não ser 400.
    const r = await POST(req({ acao: "montar", metodo: "definidos", sorteioVisto: null }));
    expect(r.status).not.toBe(400);
  });
});
