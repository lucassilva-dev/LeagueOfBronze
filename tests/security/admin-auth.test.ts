import type { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Testes de lib/admin-auth.ts — a função que decide "esta requisição é de um admin?".
 *
 * O que precisa ficar provado aqui:
 *  - o modo novo só liga com TODOS os segredos presentes (senão a migração trava o dono);
 *  - quando o modo novo está ligado, o cookie legado deixa de valer;
 *  - sessão revogada, conta desativada e "sair de todos os dispositivos" derrubam o acesso
 *    NA HORA, mesmo com o cookie ainda assinado e dentro da validade.
 *
 * O acesso ao banco é dublado: o alvo aqui é a lógica de decisão, não o Supabase.
 */

const dubles = vi.hoisted(() => ({
  findActiveSession: vi.fn(),
  findUserById: vi.fn(),
  supabaseConfigurado: vi.fn(() => true),
}));

vi.mock("@/lib/security/admin-store", () => ({
  findActiveSession: dubles.findActiveSession,
  findUserById: dubles.findUserById,
  createSession: vi.fn(),
  revokeSession: vi.fn(),
  getClientIp: () => "1.2.3.4",
  hashIp: () => "hash",
}));

vi.mock("@/lib/data-store", () => ({
  isSupabaseConfigured: dubles.supabaseConfigurado,
}));

const SEGREDO = "segredo-de-teste-com-tamanho-suficiente";

function pedido(cookies: Record<string, string>): NextRequest {
  return {
    cookies: { get: (nome: string) => (cookies[nome] ? { value: cookies[nome] } : undefined) },
    headers: new Headers(),
  } as unknown as NextRequest;
}

const usuarioAtivo = {
  id: "u1",
  username: "lucas",
  display_name: "Lucas",
  is_master: true,
  scopes: ["results:write"],
  must_change_password: false,
  session_epoch: 3,
  disabled_at: null,
  password_hash: "x",
};

async function tokenValido(overrides: Partial<{ sid: string; uid: string; epoch: number; exp: number }> = {}) {
  const { signSessionToken } = await import("@/lib/security/session");
  return signSessionToken(
    {
      sid: "s1",
      uid: "u1",
      exp: Math.floor(Date.now() / 1000) + 3600,
      epoch: 3,
      ...overrides,
    },
    SEGREDO,
  );
}

beforeEach(() => {
  vi.resetModules();
  dubles.findActiveSession.mockReset().mockResolvedValue({ id: "s1", user_id: "u1" });
  dubles.findUserById.mockReset().mockResolvedValue(usuarioAtivo);
  dubles.supabaseConfigurado.mockReturnValue(true);

  process.env.ADMIN_SESSION_SECRET = SEGREDO;
  process.env.ADMIN_PASSWORD_PEPPER = "pepper-de-teste";
  delete process.env.ADMIN_PASSWORD;
});

afterEach(() => {
  delete process.env.ADMIN_SESSION_SECRET;
  delete process.env.ADMIN_PASSWORD_PEPPER;
  delete process.env.ADMIN_PASSWORD;
});

describe("chave de virada entre os dois modos", () => {
  it("só liga o modo novo com segredo, pepper e banco juntos", async () => {
    const auth = await import("@/lib/admin-auth");
    expect(auth.isNewAuthEnabled()).toBe(true);

    delete process.env.ADMIN_PASSWORD_PEPPER;
    expect(auth.isNewAuthEnabled()).toBe(false);

    process.env.ADMIN_PASSWORD_PEPPER = "pepper-de-teste";
    dubles.supabaseConfigurado.mockReturnValue(false);
    expect(auth.isNewAuthEnabled()).toBe(false);
  });

  it("sem modo novo, a senha única ainda vale (a ponte que evita travar o dono fora)", async () => {
    delete process.env.ADMIN_SESSION_SECRET;
    process.env.ADMIN_PASSWORD = "senha-antiga";

    const auth = await import("@/lib/admin-auth");
    expect(auth.isAdminConfigured()).toBe(true);

    const token = auth.getAdminAuthToken()!;
    const id = await auth.getAdminIdentity(pedido({ [auth.ADMIN_COOKIE_NAME]: token }));
    expect(id?.legacy).toBe(true);
  });

  it("com o modo novo ligado, o cookie legado deixa de ser aceito", async () => {
    process.env.ADMIN_PASSWORD = "senha-antiga";
    const auth = await import("@/lib/admin-auth");

    // Token legado válido em si — mas o modo novo está ativo, então não vale mais.
    const tokenLegado = auth.getAdminAuthToken()!;
    const id = await auth.getAdminIdentity(pedido({ [auth.ADMIN_COOKIE_NAME]: tokenLegado }));
    expect(id).toBeNull();
  });

  it("sem nenhuma configuração, ninguém entra", async () => {
    delete process.env.ADMIN_SESSION_SECRET;
    const auth = await import("@/lib/admin-auth");
    expect(auth.isAdminConfigured()).toBe(false);
    expect(await auth.getAdminIdentity(pedido({ lob_admin_session: "qualquer" }))).toBeNull();
  });
});

describe("sessão do modo novo", () => {
  it("aceita cookie assinado de sessão ativa", async () => {
    const auth = await import("@/lib/admin-auth");
    const id = await auth.getAdminIdentity(pedido({ [auth.ADMIN_SESSION_COOKIE]: await tokenValido() }));

    expect(id).toMatchObject({ id: "u1", username: "lucas", isMaster: true, legacy: false });
    expect(await auth.isAuthorizedAdminRequest(pedido({ [auth.ADMIN_SESSION_COOKIE]: await tokenValido() }))).toBe(true);
  });

  it("recusa sem cookie, com lixo ou com assinatura de outro segredo", async () => {
    const auth = await import("@/lib/admin-auth");
    const { signSessionToken } = await import("@/lib/security/session");

    expect(await auth.getAdminIdentity(pedido({}))).toBeNull();
    expect(await auth.getAdminIdentity(pedido({ [auth.ADMIN_SESSION_COOKIE]: "lixo" }))).toBeNull();

    const forjado = signSessionToken(
      { sid: "s1", uid: "u1", exp: Math.floor(Date.now() / 1000) + 3600, epoch: 3 },
      "segredo-do-atacante",
    );
    expect(await auth.getAdminIdentity(pedido({ [auth.ADMIN_SESSION_COOKIE]: forjado }))).toBeNull();
  });

  it("cookie sem sessão viva no banco não entra — é isso que faz a revogação valer na hora", async () => {
    dubles.findActiveSession.mockResolvedValue(null);
    const auth = await import("@/lib/admin-auth");
    expect(await auth.getAdminIdentity(pedido({ [auth.ADMIN_SESSION_COOKIE]: await tokenValido() }))).toBeNull();
    // e não adianta a sessão existir se for de outro usuário
    dubles.findActiveSession.mockResolvedValue({ id: "s1", user_id: "outro" });
    expect(await auth.getAdminIdentity(pedido({ [auth.ADMIN_SESSION_COOKIE]: await tokenValido() }))).toBeNull();
  });

  it("conta desativada perde o acesso mesmo com cookie válido", async () => {
    dubles.findUserById.mockResolvedValue({ ...usuarioAtivo, disabled_at: new Date().toISOString() });
    const auth = await import("@/lib/admin-auth");
    expect(await auth.getAdminIdentity(pedido({ [auth.ADMIN_SESSION_COOKIE]: await tokenValido() }))).toBeNull();
  });

  it('"sair de todos os dispositivos" derruba cookies antigos', async () => {
    const auth = await import("@/lib/admin-auth");
    const antigo = await tokenValido({ epoch: 2 }); // emitido antes do incremento
    expect(await auth.getAdminIdentity(pedido({ [auth.ADMIN_SESSION_COOKIE]: antigo }))).toBeNull();
  });

  it("cookie expirado não entra e nem chega a consultar o banco", async () => {
    const auth = await import("@/lib/admin-auth");
    const vencido = await tokenValido({ exp: Math.floor(Date.now() / 1000) - 60 });
    expect(await auth.getAdminIdentity(pedido({ [auth.ADMIN_SESSION_COOKIE]: vencido }))).toBeNull();
    expect(dubles.findActiveSession).not.toHaveBeenCalled();
  });

  it("usuário apagado depois de logado perde o acesso", async () => {
    dubles.findUserById.mockResolvedValue(null);
    const auth = await import("@/lib/admin-auth");
    expect(await auth.getAdminIdentity(pedido({ [auth.ADMIN_SESSION_COOKIE]: await tokenValido() }))).toBeNull();
  });
});

describe("senha do modo legado", () => {
  it("compara a senha sem revelar tamanho por atalho", async () => {
    delete process.env.ADMIN_SESSION_SECRET;
    process.env.ADMIN_PASSWORD = "senha-antiga";
    const auth = await import("@/lib/admin-auth");

    expect(auth.verifyAdminPassword("senha-antiga")).toBe(true);
    expect(auth.verifyAdminPassword("senha-errada")).toBe(false);
    expect(auth.verifyAdminPassword("")).toBe(false);
    expect(auth.verifyAdminPassword("senha-antiga-mais-longa")).toBe(false);
  });

  it("sem ADMIN_PASSWORD não existe token legado", async () => {
    delete process.env.ADMIN_SESSION_SECRET;
    const auth = await import("@/lib/admin-auth");
    expect(auth.getAdminAuthToken()).toBeNull();
    expect(auth.verifyAdminPassword("qualquer")).toBe(false);
  });
});
