// @vitest-environment jsdom
import { existsSync, readFileSync } from "node:fs";

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * Tela de falha do site (app/error.tsx e app/global-error.tsx).
 *
 * Não havia nenhuma das duas: com o Supabase fora numa instância fria da Vercel (sem a
 * última cópia boa em memória), qualquer página que lê o banco caía na tela padrão do Next,
 * em inglês, sem cabeçalho, sem menu e sem o visual do site — o sintoma do dia da pausa.
 */

afterEach(() => {
  cleanup();
  document.documentElement.lang = "";
  document.cookie = "lob_locale=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
});

const erro = Object.assign(new Error("TypeError: fetch failed (tournament_state)"), { digest: "3977104363" });

describe("PUB-02 / INF-01 — app/error.tsx: falha dentro de uma página", () => {
  it("existe e mostra o painel do site em português, com o código do erro e sem a mensagem do servidor", async () => {
    expect(existsSync("app/error.tsx")).toBe(true);
    const { default: Erro } = await import("@/app/error");
    const m = renderToStaticMarkup(<Erro error={erro} reset={() => {}} />);
    expect(m).toContain('role="alert"');
    expect(m).toContain("ALGO SAIU DO LUGAR");
    expect(m).toContain("TENTAR DE NOVO");
    expect(m).toContain('href="/"');
    expect(m).toContain("3977104363");
    // Nada do que veio do servidor vai para a tela.
    expect(m).not.toContain("fetch failed");
    // Fica DENTRO do layout: nada de <html> próprio aqui (cabeçalho e menu continuam).
    expect(m).not.toContain("<html");
  });

  it("segue o idioma que o layout pôs no <html lang>", async () => {
    document.documentElement.lang = "en";
    const { default: Erro } = await import("@/app/error");
    render(<Erro error={erro} reset={() => {}} />);
    expect(screen.getByRole("button").textContent).toBe("TRY AGAIN");
    expect(screen.getByText("SOMETHING WENT WRONG")).toBeTruthy();
  });

  it("'Tentar de novo' busca a página de novo (retry) e, sem ele, recai no reset", async () => {
    const { default: Erro } = await import("@/app/error");
    const retry = vi.fn();
    const reset = vi.fn();
    vi.spyOn(console, "error").mockImplementation(() => {});

    render(<Erro error={erro} retry={retry} reset={reset} />);
    fireEvent.click(screen.getByRole("button", { name: "TENTAR DE NOVO" }));
    expect(retry).toHaveBeenCalledTimes(1);
    expect(reset).not.toHaveBeenCalled();
    cleanup();

    render(<Erro error={erro} reset={reset} />);
    fireEvent.click(screen.getByRole("button", { name: "TENTAR DE NOVO" }));
    expect(reset).toHaveBeenCalledTimes(1);
  });
});

describe("PUB-02 / INF-01 — app/global-error.tsx: falha no próprio layout", () => {
  it("existe e traz o próprio <html><body>, com o aviso da Riot e o botão", async () => {
    expect(existsSync("app/global-error.tsx")).toBe(true);
    const { default: ErroGeral } = await import("@/app/global-error");
    const m = renderToStaticMarkup(<ErroGeral error={erro} />);
    expect(m.startsWith("<html")).toBe(true);
    expect(m).toContain("<body");
    expect(m).toContain("TENTAR DE NOVO");
    expect(m).toContain("League of Bronze isn");
    expect(m).not.toContain("fetch failed");
  });

  it("sem o layout, o idioma vem do cookie da escolha", async () => {
    document.cookie = "lob_locale=en; path=/";
    const { idiomaDoNavegador } = await import("@/components/tela-de-erro");
    expect(idiomaDoNavegador()).toBe("en");
  });
});

describe("armadilha do projeto: a tela de erro não pode depender de animação", () => {
  it("nenhum dos três arquivos anima nada (opacidade animada já apagou o site 4 vezes)", () => {
    for (const arquivo of ["app/error.tsx", "app/global-error.tsx", "components/tela-de-erro.tsx"]) {
      const codigo = readFileSync(arquivo, "utf8").replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "");
      expect(codigo, arquivo).not.toMatch(/opacity|animation|transition|filter|framer-motion/);
    }
  });
});
