import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AdminIdentity } from "@/lib/admin-auth";

/**
 * A troca de senha provisória tem de ser exigida pelo SERVIDOR.
 *
 * Quando a organização redefine a senha de alguém, a conta nasce com
 * `must_change_password` e o painel mostra o modal. Antes a exigência acabava aí:
 * quem chamasse as rotas direto — fetch pelo console, cliente fora do navegador, ou
 * só fechando o modal — usava o painel inteiro com a senha provisória, que a pessoa
 * que redefiniu ainda conhece.
 */

const identidade = vi.hoisted(() => ({ atual: null as AdminIdentity | null }));

vi.mock("@/lib/admin-auth", () => ({
  isAdminConfigured: () => true,
  getAdminIdentity: async () => identidade.atual,
}));

const { requireAdmin } = await import("@/lib/security/route-guard");

function base(patch: Partial<AdminIdentity> = {}): AdminIdentity {
  return {
    id: "u1",
    username: "organizador",
    displayName: "Organizador",
    isMaster: true,
    scopes: [],
    mustChangePassword: false,
    legacy: false,
    ...patch,
  };
}

/** Requisição da própria origem: passa na barreira de CSRF, para isolar o que se testa. */
function req(method = "POST"): NextRequest {
  return {
    method,
    headers: new Headers({ host: "osbronzes.example", "sec-fetch-site": "same-origin" }),
  } as unknown as NextRequest;
}

describe("senha provisória pendente", () => {
  beforeEach(() => {
    identidade.atual = null;
  });

  it("recusa rota de escrita enquanto a senha não for trocada", async () => {
    identidade.atual = base({ mustChangePassword: true });

    const guarda = await requireAdmin(req());

    expect(guarda.ok).toBe(false);
    if (guarda.ok) return;
    expect(guarda.response.status).toBe(403);
    await expect(guarda.response.json()).resolves.toMatchObject({ code: "SENHA_PENDENTE" });
  });

  it("recusa ANTES de olhar escopo — quem é master também é barrado", async () => {
    // Sem isto, um master com senha provisória passaria direto por qualquer rota.
    identidade.atual = base({ mustChangePassword: true, isMaster: true });

    const guarda = await requireAdmin(req(), "series:cards");

    expect(guarda.ok).toBe(false);
    if (guarda.ok) return;
    await expect(guarda.response.json()).resolves.toMatchObject({ code: "SENHA_PENDENTE" });
  });

  it("DEIXA A LEITURA PASSAR — senão tranca a pessoa fora da tela de trocar a senha", async () => {
    /*
     * Regressão de verdade, encontrada depois que a barreira foi escrita: barrando
     * também o GET, `GET /api/admin/dataset` respondia 403, o painel parava no cartão
     * "Não foi possível abrir o painel" e o formulário de troca (que fica mais abaixo
     * NA MESMA página) nunca era renderizado. A pessoa ficava sem caminho nenhum no
     * site para trocar a senha — e com a única conta master nesse estado, ninguém mais
     * operaria o painel sem mexer no banco à mão.
     *
     * O que precisa ser impedido é AGIR com a senha provisória, e toda ação é escrita.
     */
    identidade.atual = base({ mustChangePassword: true });

    await expect(requireAdmin(req("GET"))).resolves.toMatchObject({ ok: true });
    await expect(requireAdmin(req("HEAD"))).resolves.toMatchObject({ ok: true });
  });

  it("libera depois que a senha foi trocada", async () => {
    identidade.atual = base({ mustChangePassword: false });

    const guarda = await requireAdmin(req());

    expect(guarda.ok).toBe(true);
  });

  it("não barra o modo legado, que não tem senha provisória", async () => {
    // A ponte legada é à prova de lockout de propósito (ver lib/admin-auth). Barrá-la
    // aqui trancaria o dono para fora durante a migração.
    identidade.atual = base({ legacy: true, mustChangePassword: true });

    const guarda = await requireAdmin(req());

    expect(guarda.ok).toBe(true);
  });
});
