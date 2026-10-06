import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * A rota do «Salvar tudo» da gaveta do inscrito (PATCH /api/admin/edicao, acao=inscrito).
 *
 * Os testes da gaveta trocam `executar` por um mock, então nada lá prova o que a rota
 * faz. Sem este arquivo, tirar o escopo da ação, trocá-lo pelo do caixa, ignorar a falha
 * de um requisito ou gravar a ficha antes dos requisitos deixava a suíte inteira verde.
 *
 * A guarda e o store são simulados: o que se mede é a ordem e o conteúdo do que a rota
 * manda gravar.
 */

const guarda = vi.hoisted(() => ({ escopos: [] as (string | undefined)[], negar: null as string | null }));
const banco = vi.hoisted(() => ({
  ordem: [] as string[],
  fichas: [] as Record<string, unknown>[],
  falharItem: null as string | null,
}));

vi.mock("@/lib/security/route-guard", async () => {
  const { NextResponse } = await import("next/server");
  return {
    mesmaOrigem: () => true,
    requireAdmin: async (_r: unknown, escopo?: string) => {
      guarda.escopos.push(escopo);
      if (escopo && escopo === guarda.negar) {
        return { ok: false, response: NextResponse.json({ error: "sem escopo", missing: [escopo] }, { status: 403 }) };
      }
      return { ok: true, identity: { username: "lucas", isMaster: false, scopes: ["inscricoes:conferir"] } };
    },
  };
});

vi.mock("@/lib/inscricoes/store", () => ({
  atualizarConferencia: async (a: { item: string }) => {
    // Um respiro, para a ordem "requisitos antes da ficha" não passar por acaso.
    await new Promise((r) => setTimeout(r, 5));
    if (a.item === banco.falharItem) throw new Error("falhou");
    banco.ordem.push(`conf:${a.item}`);
  },
  atualizarInscricao: async (_id: string, patch: Record<string, unknown>) => {
    banco.ordem.push("ficha");
    banco.fichas.push(patch);
  },
  atualizarPagamento: vi.fn(),
  congelarElos: vi.fn(),
  lerConfig: vi.fn(),
  listarAuditoria: vi.fn(),
  listarConferencias: vi.fn(),
  listarInscricoes: vi.fn(),
  listarPagamentos: vi.fn(),
  panorama: vi.fn(),
  salvarConfig: vi.fn(),
}));

const { PATCH } = await import("@/app/api/admin/edicao/route");

const ID = "3f2504e0-4f89-11d3-9a0c-0305e82c3301";

function req(corpo: unknown): NextRequest {
  const texto = JSON.stringify(corpo);
  return {
    method: "PATCH",
    headers: new Headers({ host: "x", "sec-fetch-site": "same-origin" }),
    text: async () => texto,
  } as unknown as NextRequest;
}

beforeEach(() => {
  guarda.escopos.length = 0;
  guarda.negar = null;
  banco.ordem.length = 0;
  banco.fichas.length = 0;
  banco.falharItem = null;
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("PATCH acao=inscrito", () => {
  it("exige inscricoes:conferir — e sem ele nada é gravado", async () => {
    guarda.negar = "inscricoes:conferir";
    const r = await PATCH(req({ acao: "inscrito", dados: { inscricaoId: ID, ficha: { situacao: "apto" } } }));
    expect(r.status).toBe(403);
    expect(guarda.escopos).toEqual([undefined, "inscricoes:conferir"]);
    expect(banco.ordem).toEqual([]);
  });

  it("corpo só com pontos (ou só com a data do grupo) é 400 e não grava nada", async () => {
    const r = await PATCH(
      req({ acao: "inscrito", dados: { inscricaoId: ID, ficha: { pontos: 15, entrouNoGrupo: "2026-08-01" } } }),
    );
    expect(r.status).toBe(400);
    expect(banco.ordem).toEqual([]);
  });

  it("observação longa demais é 400 dizendo qual requisito", async () => {
    const r = await PATCH(
      req({
        acao: "inscrito",
        dados: { inscricaoId: ID, conferencias: [{ item: "f", observacao: "x".repeat(501) }] },
      }),
    );
    expect(r.status).toBe(400);
    expect(((await r.json()) as { error: string }).error).toContain("(F)");
    expect(banco.ordem).toEqual([]);
  });

  it("requisitos primeiro, ficha depois; pontos e data do grupo não chegam ao store", async () => {
    const r = await PATCH(
      req({
        acao: "inscrito",
        dados: {
          inscricaoId: ID,
          conferencias: [
            { item: "a", estado: "ok" },
            { item: "b", observacao: "print" },
          ],
          ficha: { situacao: "apto", pontos: 15, entrouNoGrupo: "2026-08-01" },
        },
      }),
    );
    expect(r.status).toBe(200);
    expect(banco.ordem.at(-1)).toBe("ficha");
    expect(banco.ordem.slice(0, 2).sort()).toEqual(["conf:a", "conf:b"]);
    expect(banco.fichas).toEqual([{ situacao: "apto" }]);
  });

  it("se um requisito falha, a ficha (a situação) NÃO é gravada — e os outros terminam antes da resposta", async () => {
    banco.falharItem = "b";
    const r = await PATCH(
      req({
        acao: "inscrito",
        dados: {
          inscricaoId: ID,
          conferencias: [
            { item: "a", estado: "ok" },
            { item: "b", estado: "ok" },
            { item: "d", estado: "ok" },
          ],
          ficha: { situacao: "apto" },
        },
      }),
    );
    expect(r.status).toBe(500);
    expect(banco.ordem).not.toContain("ficha");
    // allSettled: a resposta só sai depois de as gravações que davam certo terminarem.
    expect([...banco.ordem].sort()).toEqual(["conf:a", "conf:d"]);
  });
});
