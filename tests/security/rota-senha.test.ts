import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Regressão da troca da própria senha.
 *
 * O ponto que importa não é "a senha mudou" — é o que a troca leva junto. Uma senha
 * provisória foi digitada por OUTRA pessoa e pode ter sido usada por ela para entrar.
 * Se a troca não derrubar as sessões existentes, quem criou a conta continua dentro
 * dela, e a troca vira teatro.
 *
 * O banco é simulado para exercitar a rota inteira; o scrypt e a assinatura da sessão
 * são os de verdade.
 */

process.env.ADMIN_SESSION_SECRET = "segredo-de-teste-com-tamanho-suficiente-1234567890";
process.env.ADMIN_PASSWORD_PEPPER = "pimenta-de-teste-com-tamanho-suficiente-1234567890";

const banco = vi.hoisted(() => ({
  updates: [] as Record<string, unknown>[],
  revogacoes: [] as Record<string, unknown>[],
  sessoesCriadas: [] as unknown[],
}));

const conta = vi.hoisted(() => ({
  atual: null as Record<string, unknown> | null,
}));

vi.mock("@/lib/data-store", () => ({
  isSupabaseConfigured: () => true,
  createSupabaseAdminClient: () => ({
    from: (tabela: string) => ({
      update: (campos: Record<string, unknown>) => {
        const alvo = tabela === "admin_users" ? banco.updates : banco.revogacoes;
        alvo.push(campos);
        const encadeia = { eq: () => encadeia, is: () => encadeia, then: (r: (v: unknown) => void) => r({ error: null }) };
        return encadeia;
      },
    }),
  }),
}));

vi.mock("@/lib/security/admin-store", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  findUserById: async () => conta.atual,
  createSession: async (p: unknown) => void banco.sessoesCriadas.push(p),
}));

const identidade = vi.hoisted(() => ({ valor: null as unknown }));
vi.mock("@/lib/admin-auth", async (importOriginal) => {
  const real = await importOriginal<Record<string, unknown>>();
  return { ...real, getAdminIdentity: async () => identidade.valor };
});

const { hashPassword, verifyPassword } = await import("@/lib/security/password");
const { POST } = await import("@/app/api/admin/senha/route");

const PEPPER = process.env.ADMIN_PASSWORD_PEPPER;
const SENHA_PROVISORIA = "bronze1234567";

function req(corpo: unknown): NextRequest {
  const texto = JSON.stringify(corpo);
  return {
    method: "POST",
    headers: new Headers({ host: "x", "sec-fetch-site": "same-origin" }),
    cookies: { get: () => undefined },
    text: async () => texto,
  } as unknown as NextRequest;
}

beforeEach(async () => {
  banco.updates.length = 0;
  banco.revogacoes.length = 0;
  banco.sessoesCriadas.length = 0;
  identidade.valor = { id: "u1", username: "nakay", isMaster: false, scopes: [], legacy: false };
  conta.atual = {
    id: "u1",
    username: "nakay",
    display_name: "Nakay",
    password_hash: await hashPassword(SENHA_PROVISORIA, PEPPER),
    must_change_password: true,
    is_master: false,
    scopes: [],
    disabled_at: null,
    session_epoch: 7,
  };
});

describe("a troca derruba quem já estava dentro", () => {
  it("sobe o epoch e revoga as sessões abertas", async () => {
    const r = await POST(req({ senhaAtual: SENHA_PROVISORIA, senhaNova: "minhasenha2026" }));
    expect(r.status).toBe(200);

    const [update] = banco.updates;
    // 7 → 8 invalida TODO token assinado antes, inclusive o de quem criou a conta.
    expect(update.session_epoch).toBe(8);
    expect(update.must_change_password).toBe(false);
    expect(banco.revogacoes[0]?.revoked_reason).toBe("troca_de_senha");
  });

  it("a senha guardada é a nova, e com scrypt de verdade", async () => {
    await POST(req({ senhaAtual: SENHA_PROVISORIA, senhaNova: "minhasenha2026" }));
    const hash = banco.updates[0]?.password_hash as string;

    expect(hash).not.toContain("minhasenha2026");
    expect(await verifyPassword("minhasenha2026", hash, PEPPER)).toBe(true);
    expect(await verifyPassword(SENHA_PROVISORIA, hash, PEPPER)).toBe(false);
  });

  it("quem trocou não é expulso do próprio painel", async () => {
    // A sessão antiga acabou de ser invalidada pelo epoch; sem um cookie novo, a
    // pessoa trocaria a senha e cairia na tela de login no instante seguinte.
    const r = await POST(req({ senhaAtual: SENHA_PROVISORIA, senhaNova: "minhasenha2026" }));
    expect(banco.sessoesCriadas).toHaveLength(1);
    expect(r.cookies.get("lob_admin")?.value).toBeTruthy();
  });
});

describe("o que a rota recusa", () => {
  it("senha atual errada não troca nada", async () => {
    const r = await POST(req({ senhaAtual: "chutedaerrado123", senhaNova: "minhasenha2026" }));
    expect(r.status).toBe(401);
    expect(banco.updates).toHaveLength(0);
  });

  it("senha nova fraca não troca nada", async () => {
    const r = await POST(req({ senhaAtual: SENHA_PROVISORIA, senhaNova: "1234" }));
    expect(r.status).toBe(400);
    expect(banco.updates).toHaveLength(0);
  });

  it("repetir a senha atual não conta como troca", async () => {
    const r = await POST(req({ senhaAtual: SENHA_PROVISORIA, senhaNova: SENHA_PROVISORIA }));
    expect(r.status).toBe(400);
    expect(banco.updates).toHaveLength(0);
  });

  it("sem sessão da organização, nada acontece", async () => {
    identidade.valor = null;
    const r = await POST(req({ senhaAtual: SENHA_PROVISORIA, senhaNova: "minhasenha2026" }));
    expect(r.status).toBe(401);
    expect(banco.updates).toHaveLength(0);
  });

  it("sessão do modo legado não troca senha de conta nenhuma", async () => {
    // No legado o cookie equivale à senha do ambiente e não aponta para uma linha do
    // banco: aceitar aqui trocaria a senha de uma conta que a sessão não representa.
    identidade.valor = { id: "u1", username: "admin", isMaster: true, scopes: [], legacy: true };
    const r = await POST(req({ senhaAtual: SENHA_PROVISORIA, senhaNova: "minhasenha2026" }));
    expect(r.status).toBe(401);
    expect(banco.updates).toHaveLength(0);
  });
});
