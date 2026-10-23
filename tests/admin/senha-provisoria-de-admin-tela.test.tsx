// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AdminUsersPanel } from "@/components/admin/admin-users-panel";

/**
 * O botão «Senha provisória» de Usuários (o «esqueci a senha» de admin): dois passos, a
 * senha aparece uma vez e some ao fechar o aviso.
 */

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const MASTER = {
  id: "m",
  username: "lucas",
  displayName: "Lucas",
  isMaster: true,
  scopes: [],
  disabled: false,
  mustChangePassword: false,
  activeSessions: 1,
};

const NAKAY = {
  id: "n",
  username: "nakay",
  displayName: "Nakay",
  isMaster: false,
  scopes: ["series:cards"],
  disabled: false,
  mustChangePassword: false,
  activeSessions: 1,
};

function servidor() {
  const patches: Array<{ url: string; corpo: Record<string, unknown> }> = [];
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>(async (entrada, init) => {
      const url = String(entrada);
      if (init?.method === "PATCH") {
        const corpo = JSON.parse(String(init.body)) as Record<string, unknown>;
        patches.push({ url, corpo });
        return new Response(JSON.stringify({ ok: true, senhaProvisoria: "k7wm-3qfa-x9pe" }), { status: 200 });
      }
      return new Response(JSON.stringify({ users: [MASTER, NAKAY] }), { status: 200 });
    }),
  );
  return { patches };
}

describe("senha provisória de admin na tela de Usuários", () => {
  it("pede confirmação, gera pela rota da conta e mostra a senha uma vez", async () => {
    const { patches } = servidor();
    render(<AdminUsersPanel onAlert={vi.fn()} />);

    // Só as contas que não são master têm o botão.
    const botoes = await screen.findAllByRole("button", { name: "Senha provisória" });
    expect(botoes).toHaveLength(1);

    fireEvent.click(botoes[0]!);
    expect(screen.getByText("Gerar uma senha provisória para Nakay?")).toBeTruthy();
    expect(patches).toHaveLength(0);

    fireEvent.click(screen.getByRole("button", { name: "Gerar senha" }));
    const codigo = await screen.findByText("k7wm-3qfa-x9pe");
    const aviso = codigo.closest<HTMLElement>('[role="status"]')!;
    expect(aviso).toBeTruthy();
    expect(patches).toEqual([{ url: "/api/admin/users/n", corpo: { gerarSenhaProvisoria: true } }]);

    fireEvent.click(within(aviso).getByRole("button", { name: "Já repassei" }));
    expect(screen.queryByText("k7wm-3qfa-x9pe")).toBeNull();
  });
});
