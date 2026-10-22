// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MESSAGES } from "@/lib/i18n/messages";

/**
 * PNL-01 (cabeçalho): «Sair» do menu da conta com rascunho do painel por salvar.
 *
 * O painel guarda os cliques em LINK (captura no document) e o fechamento da aba
 * (beforeunload) — mas «Sair» é um botão, e o logout acontecia antes de qualquer navegação:
 * o rascunho morria sem pergunta. O painel marca o <html> com `data-lob-painel-sujo="1"`
 * enquanto há trabalho a perder (components/admin/admin-dashboard-client.tsx); o cabeçalho
 * pergunta ANTES de qualquer logout.
 */

vi.mock("next/navigation", () => ({ usePathname: () => "/admin" }));

const { SessaoNoCabecalho } = await import("@/components/sessao-no-cabecalho");

const t = MESSAGES.pt.comum;
const json = (corpo: unknown) =>
  new Response(JSON.stringify(corpo), { status: 200, headers: { "Content-Type": "application/json" } });

let chamadas: string[] = [];

beforeEach(() => {
  chamadas = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      chamadas.push(`${init?.method ?? "GET"} ${url}`);
      if (url === "/api/sessao") return json({ jogador: null, organizacao: { nome: "Lucas", master: true } });
      return json({ ok: true });
    }),
  );
  // O jsdom não navega: o `location.assign("/")` do fim só reclama no console.
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  delete document.documentElement.dataset.lobPainelSujo;
  delete document.documentElement.dataset.lobSaidaConfirmada;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

async function abrirMenuESair() {
  render(<SessaoNoCabecalho t={t} />);
  fireEvent.click(await screen.findByRole("button", { name: /Abrir menu da conta/ }));
  fireEvent.click(screen.getByRole("button", { name: t.sessaoSair }));
  // Deixa as promessas do sair() andarem.
  await new Promise((r) => setTimeout(r, 0));
}

const logouts = () => chamadas.filter((c) => c.startsWith("POST") && c.includes("logout"));

describe("sair com o painel sujo (PNL-01)", () => {
  it("rascunho por salvar e a pessoa NÃO confirma: ninguém sai", async () => {
    document.documentElement.dataset.lobPainelSujo = "1";
    const confirmar = vi.spyOn(window, "confirm").mockReturnValue(false);
    await abrirMenuESair();
    expect(confirmar).toHaveBeenCalledWith(t.sessaoSairPainelSujo);
    expect(logouts()).toEqual([]);
    expect(document.documentElement.dataset.lobSaidaConfirmada).toBeUndefined();
  });

  it("rascunho por salvar e a pessoa confirma: sai das duas contas", async () => {
    document.documentElement.dataset.lobPainelSujo = "1";
    vi.spyOn(window, "confirm").mockReturnValue(true);
    await abrirMenuESair();
    expect(logouts().sort()).toEqual(["POST /api/admin/logout", "POST /api/conta/logout"]);
    // Sinal para o beforeunload do painel não perguntar de novo na navegação do fim.
    expect(document.documentElement.dataset.lobSaidaConfirmada).toBe("1");
  });

  it("painel limpo: sai sem perguntar", async () => {
    const confirmar = vi.spyOn(window, "confirm").mockReturnValue(false);
    await abrirMenuESair();
    expect(confirmar).not.toHaveBeenCalled();
    expect(logouts()).toHaveLength(2);
  });
});
