import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AdminIdentity } from "@/lib/admin-auth";

import { criarBancoEmMemoria, type BancoEmMemoria } from "../security/_banco-em-memoria";

/**
 * «Esqueci a senha» de ADMIN (pedido do Lucas, 22/10 — o Nakay esqueceu a dele).
 *
 * A senha de ninguém pode ser lida de volta: o banco guarda só o hash. O que existe é a
 * master gerar uma provisória pela rota de verdade (`PATCH /api/admin/users/[id]` com
 * `gerarSenhaProvisoria`), repassar no privado, e a conta trocar no primeiro acesso.
 *
 * Roda o código REAL da rota, da guarda e do scrypt; só o banco é simulado e a identidade
 * do painel é trocada.
 */

process.env.ADMIN_SESSION_SECRET = "segredo-de-teste-com-tamanho-suficiente-1234567890";
process.env.ADMIN_PASSWORD_PEPPER = "pimenta-de-teste-com-tamanho-suficiente-1234567890";

const estado = vi.hoisted(() => ({
  banco: null as unknown as BancoEmMemoria,
  admin: null as AdminIdentity | null,
}));

vi.mock("@/lib/data-store", () => ({
  isSupabaseConfigured: () => true,
  createSupabaseAdminClient: () => estado.banco.cliente(),
}));

vi.mock("@/lib/admin-auth", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  isAdminConfigured: () => true,
  getAdminIdentity: async () => estado.admin,
}));

const { verifyPassword } = await import("@/lib/security/password");
const { getPasswordPepper } = await import("@/lib/admin-auth");
const { PATCH } = await import("@/app/api/admin/users/[id]/route");

const ID_NAKAY = "nakay-id";
const ID_LUCAS = "lucas-id";

function pedido(corpo: unknown): NextRequest {
  const texto = JSON.stringify(corpo);
  return {
    method: "PATCH",
    headers: new Headers({ host: "leagueofbronze.xyz", "sec-fetch-site": "same-origin", "x-forwarded-for": "1.1.1.1" }),
    cookies: { get: () => undefined },
    json: async () => JSON.parse(texto),
    text: async () => texto,
  } as unknown as NextRequest;
}

const contexto = (id: string) => ({ params: Promise.resolve({ id }) });

function master(patch: Partial<AdminIdentity> = {}): AdminIdentity {
  return {
    id: ID_LUCAS,
    username: "lucas",
    displayName: "Lucas",
    isMaster: true,
    scopes: [],
    mustChangePassword: false,
    legacy: false,
    ...patch,
  };
}

const nakay = () => estado.banco.tabelas.admin_users!.find((u) => u.id === ID_NAKAY)!;

beforeEach(() => {
  estado.banco = criarBancoEmMemoria(0);
  estado.admin = master();
  estado.banco.tabelas.admin_users = [
    { id: ID_LUCAS, username: "lucas", is_master: true, session_epoch: 0, password_hash: "h-lucas", must_change_password: false },
    { id: ID_NAKAY, username: "nakay", is_master: false, session_epoch: 3, password_hash: "h-esquecida", must_change_password: false },
  ];
  estado.banco.tabelas.admin_sessions = [{ id: "s1", user_id: ID_NAKAY, revoked_at: null }];
});

describe("senha provisória de admin", () => {
  it("a master gera: a provisória volta uma vez, vale no login, obriga a troca e derruba as sessões", async () => {
    const r = await PATCH(pedido({ gerarSenhaProvisoria: true }), contexto(ID_NAKAY));
    const corpo = (await r.json()) as { senhaProvisoria?: string };

    expect(r.status).toBe(200);
    expect(r.headers.get("Cache-Control")).toContain("no-store");
    expect(corpo.senhaProvisoria).toMatch(/^[a-z2-9]{4}-[a-z2-9]{4}-[a-z2-9]{4}$/);

    const linha = nakay();
    expect(linha.password_hash).not.toBe("h-esquecida");
    await expect(verifyPassword(corpo.senhaProvisoria!, String(linha.password_hash), getPasswordPepper()!)).resolves.toBe(true);
    expect(linha.must_change_password).toBe(true);
    expect(linha.session_epoch).toBe(4);
    expect(estado.banco.tabelas.admin_sessions![0]!.revoked_at).not.toBeNull();
  });

  it("não gera para a conta master", async () => {
    const r = await PATCH(pedido({ gerarSenhaProvisoria: true }), contexto(ID_LUCAS));
    expect(r.status).toBe(400);
    expect(estado.banco.tabelas.admin_users![0]!.password_hash).toBe("h-lucas");
  });

  it("quem não é master não gera (users:manage é exclusivo da master)", async () => {
    estado.admin = master({ id: "outro", username: "outro", isMaster: false, scopes: ["inscricoes:conferir"] });
    const r = await PATCH(pedido({ gerarSenhaProvisoria: true }), contexto(ID_NAKAY));
    expect(r.status).toBe(403);
    expect(nakay().password_hash).toBe("h-esquecida");
  });

  it("senha escolhida E provisória no mesmo pedido é recusado, sem mexer em nada", async () => {
    const r = await PATCH(pedido({ gerarSenhaProvisoria: true, newPassword: "abc12" }), contexto(ID_NAKAY));
    expect(r.status).toBe(400);
    expect(nakay().password_hash).toBe("h-esquecida");
  });
});
