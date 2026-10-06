import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * O que mudou na rota do painel (PATCH /api/admin/edicao) com o robô:
 *  - depois de toda gravação que pode completar alguém, a situação é reavaliada;
 *  - a reavaliação falhar NÃO vira "não foi possível salvar" (o que foi salvo, foi);
 *  - "Atualizar da Riot agora" exige o escopo de conferência.
 */

const guarda = vi.hoisted(() => ({ negar: null as string | null }));
const banco = vi.hoisted(() => ({
  reavaliados: [] as [string, string][],
  promover: false,
  quebrarReavaliacao: false,
  falharConferencia: false,
  sincronizacoes: [] as unknown[],
}));

vi.mock("@/lib/security/route-guard", async () => {
  const { NextResponse } = await import("next/server");
  return {
    mesmaOrigem: () => true,
    requireAdmin: async (_r: unknown, escopo?: string) => {
      if (escopo && escopo === guarda.negar) {
        return { ok: false, response: NextResponse.json({ error: "sem escopo", missing: [escopo] }, { status: 403 }) };
      }
      return { ok: true, identity: { username: "lucas", isMaster: false, scopes: [] } };
    },
  };
});

vi.mock("@/lib/inscricoes/store", () => ({
  atualizarConferencia: async () => {
    if (banco.falharConferencia) throw new Error("falhou");
  },
  atualizarInscricao: async () => {},
  atualizarPagamento: async () => {},
  congelarElos: async () => 0,
  lerConfig: vi.fn(),
  listarAuditoria: vi.fn(),
  listarConferencias: vi.fn(),
  listarInscricoes: vi.fn(),
  listarPagamentos: vi.fn(),
  panorama: vi.fn(),
  salvarConfig: async () => ({}),
  reavaliarSituacao: async (id: string, gatilho: string) => {
    banco.reavaliados.push([id, gatilho]);
    if (banco.quebrarReavaliacao) throw new Error("banco caiu");
    return banco.promover;
  },
  reavaliarPendentes: async () => [],
}));

vi.mock("@/lib/riot/sincronizar", () => ({
  sincronizarComRiot: async (opcoes: unknown) => {
    banco.sincronizacoes.push(opcoes);
    return { simular: false, naFila: 2, processados: 2, elosMudados: 1, itensGravados: 3, erros: 0, chamadas: 4 };
  },
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
  guarda.negar = null;
  banco.reavaliados.length = 0;
  banco.sincronizacoes.length = 0;
  banco.promover = false;
  banco.quebrarReavaliacao = false;
  banco.falharConferencia = false;
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("a situação é reavaliada depois de cada gravação", () => {
  it.each([
    ["inscrito", { inscricaoId: ID, conferencias: [{ item: "a", estado: "ok" }] }],
    ["conferencia", { inscricaoId: ID, item: "a", estado: "ok" }],
    ["ficha", { inscricaoId: ID, observacao: "x" }],
    ["pagamento", { inscricaoId: ID, estado: "pago" }],
  ])("depois de «%s»", async (acao, dados) => {
    const r = await PATCH(req({ acao, dados }));
    expect(r.status).toBe(200);
    expect(banco.reavaliados).toEqual([[ID, acao]]);
  });

  it("nunca depois de mudar a configuração", async () => {
    await PATCH(req({ acao: "config", dados: { min_ranqueadas: 5 } }));
    expect(banco.reavaliados).toEqual([]);
  });

  it("virou apto: a tela é avisada", async () => {
    banco.promover = true;
    const r = await PATCH(req({ acao: "pagamento", dados: { inscricaoId: ID, estado: "pago" } }));
    expect(await r.json()).toMatchObject({ ok: true, promovido: true, mensagem: expect.stringMatching(/Apto/) });
  });

  it("a reavaliação falhou: o salvamento continua sendo sucesso", async () => {
    banco.quebrarReavaliacao = true;
    const r = await PATCH(req({ acao: "pagamento", dados: { inscricaoId: ID, estado: "pago" } }));
    expect(r.status).toBe(200);
    expect(await r.json()).toMatchObject({ ok: true, promovido: false });
  });

  it("o requisito não gravou: não reavalia nada", async () => {
    banco.falharConferencia = true;
    const r = await PATCH(req({ acao: "inscrito", dados: { inscricaoId: ID, conferencias: [{ item: "a", estado: "ok" }] } }));
    expect(r.status).toBe(500);
    expect(banco.reavaliados).toEqual([]);
  });
});

describe("«Atualizar da Riot agora»", () => {
  it("exige o escopo de conferência — quem só cuida do caixa não roda o robô", async () => {
    guarda.negar = "inscricoes:conferir";
    const r = await PATCH(req({ acao: "sincronizar_riot" }));
    expect(r.status).toBe(403);
    expect(banco.sincronizacoes).toEqual([]);
  });

  it("roda curto (25 s) e devolve um resumo legível", async () => {
    const r = await PATCH(req({ acao: "sincronizar_riot" }));
    expect(r.status).toBe(200);
    expect(banco.sincronizacoes).toEqual([{ orcamentoMs: 25_000, inscricaoId: undefined }]);
    expect((await r.json()).mensagem).toMatch(/2 de 2 consultados, 1 elo/);
  });

  it("só um inscrito, pela gaveta", async () => {
    await PATCH(req({ acao: "sincronizar_riot", dados: { inscricaoId: ID } }));
    expect(banco.sincronizacoes).toEqual([{ orcamentoMs: 25_000, inscricaoId: ID }]);
    expect(banco.reavaliados).toEqual([[ID, "riot"]]);
  });

  it("id que não é UUID: 400 sem rodar", async () => {
    const r = await PATCH(req({ acao: "sincronizar_riot", dados: { inscricaoId: "1 or 1=1" } }));
    expect(r.status).toBe(400);
    expect(banco.sincronizacoes).toEqual([]);
  });
});
