import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * BANCO FORA DO AR NA HORA DE CONFERIR A SESSÃO: 503 EM JSON, NÃO EXCEÇÃO.
 *
 * `requireAdmin` roda ANTES do `try` de cada rota. Quando o Supabase falhava ao ler a
 * sessão, a exceção escapava inteira: a rota respondia 500 sem corpo, e o painel mostrava
 * "Unexpected end of JSON input" (no Safari, "The string did not match the expected
 * pattern.") — no meio do dia de jogo, sem dizer que era só tentar de novo.
 */
const sessao = vi.hoisted(() => ({ falhar: true }));

vi.mock("@/lib/admin-auth", () => ({
  isAdminConfigured: () => true,
  getAdminIdentity: async () => {
    if (sessao.falhar) throw new Error("Falha ao consultar sessão: fetch failed");
    return {
      id: "u-lucas",
      username: "lucas",
      displayName: "Lucas",
      isMaster: true,
      scopes: [],
      mustChangePassword: false,
      legacy: false,
    };
  },
}));

const { requireAdmin } = await import("@/lib/security/route-guard");

function pedido(method = "PUT"): NextRequest {
  return {
    method,
    headers: new Headers({ "sec-fetch-site": "same-origin" }),
  } as unknown as NextRequest;
}

beforeEach(() => {
  sessao.falhar = true;
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("requireAdmin com o banco de sessões fora do ar", () => {
  it("responde 503 com uma mensagem em português e a referência do log", async () => {
    const guarda = await requireAdmin(pedido(), "results:write");
    expect(guarda.ok).toBe(false);
    if (guarda.ok) return;
    expect(guarda.response.status).toBe(503);
    const corpo = (await guarda.response.json()) as { error: string; ref: string };
    expect(corpo.error).toBe("Serviço de sessão indisponível. Tente de novo em instantes.");
    expect(corpo.ref).toMatch(/^[0-9a-f]{8}$/);
    // O detalhe técnico vai para o log, não para a tela.
    expect(JSON.stringify(corpo)).not.toContain("fetch failed");
  });

  it("com o banco no ar, segue normal", async () => {
    sessao.falhar = false;
    const guarda = await requireAdmin(pedido(), "results:write");
    expect(guarda.ok).toBe(true);
  });
});
