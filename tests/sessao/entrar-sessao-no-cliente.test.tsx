// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MESSAGES } from "@/lib/i18n/messages";

/**
 * O /entrar no navegador.
 *
 *  - INS-18: o cookie das contas é SameSite=Strict. Quem chega a /entrar por um link de
 *    outro site (WhatsApp Web, Discord no navegador) já logado não manda o cookie nessa
 *    navegação, e a página mostrava o login a quem já estava dentro. A tela pergunta a
 *    /api/sessao (mesma origem, com cookie) e, havendo sessão, segue para o destino.
 *  - INS-01: quem entra com a senha provisória da organização (`mustChangePassword`) vai
 *    direto para a troca de senha, levando junto para onde ia.
 */

const navegar = vi.hoisted(() => ({ para: vi.fn() }));
vi.mock("@/components/inscricao/navegar", async (original) => ({
  ...(await original<typeof import("@/components/inscricao/navegar")>()),
  navegarPara: navegar.para,
}));

const { default: Entrar } = await import("@/components/inscricao/entrar");

const t = MESSAGES.pt.inscricao;
const json = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { "Content-Type": "application/json" } });

type Rotas = Record<string, Response | (() => Response | Promise<Response>)>;

/** fetch dublado por "MÉTODO /caminho"; o que não estiver na lista é erro de rede. */
function dublarFetch(rotas: Rotas) {
  const f = vi.fn(async (url: string, init?: RequestInit) => {
    const chave = `${init?.method ?? "GET"} ${url}`;
    const r = rotas[chave];
    if (!r) throw new TypeError(`sem dublê para ${chave}`);
    return typeof r === "function" ? r() : r.clone();
  });
  vi.stubGlobal("fetch", f);
  return f;
}

const SEM_SESSAO = json({ jogador: null, organizacao: null });

beforeEach(() => {
  navegar.para.mockReset();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("sessão que a página não viu (INS-18)", () => {
  it("logado como jogador: segue para o destino conferido, sem pedir senha", async () => {
    const f = dublarFetch({ "GET /api/sessao": json({ jogador: { nome: "Fulano", temInscricao: true, precisaTrocarSenha: false }, organizacao: null }) });
    render(<Entrar t={t} volta="/capitao" />);
    await waitFor(() => expect(navegar.para).toHaveBeenCalledWith("/capitao"));
    expect(f).toHaveBeenCalledWith("/api/sessao", { cache: "no-store" });
  });

  it("sem volta: vai para a própria inscrição", async () => {
    dublarFetch({ "GET /api/sessao": json({ jogador: { nome: "Fulano", temInscricao: true, precisaTrocarSenha: false }, organizacao: null }) });
    render(<Entrar t={t} />);
    await waitFor(() => expect(navegar.para).toHaveBeenCalledWith("/minha-inscricao"));
  });

  it("volta fora da lista fechada não vira trampolim: cai na própria inscrição", async () => {
    dublarFetch({ "GET /api/sessao": json({ jogador: { nome: "Fulano", temInscricao: true, precisaTrocarSenha: false }, organizacao: null }) });
    render(<Entrar t={t} volta="//evil.example" />);
    await waitFor(() => expect(navegar.para).toHaveBeenCalledWith("/minha-inscricao"));
  });

  it("jogador com senha provisória pendente: vai para a troca, levando o destino", async () => {
    dublarFetch({ "GET /api/sessao": json({ jogador: { nome: "Fulano", temInscricao: true, precisaTrocarSenha: true }, organizacao: null }) });
    render(<Entrar t={t} volta="/capitao" />);
    await waitFor(() => expect(navegar.para).toHaveBeenCalledWith("/conta/senha?volta=/capitao"));
  });

  it("organização: vai para o painel, como a página faria", async () => {
    dublarFetch({ "GET /api/sessao": json({ jogador: null, organizacao: { nome: "Lucas", master: true } }) });
    render(<Entrar t={t} />);
    await waitFor(() => expect(navegar.para).toHaveBeenCalledWith("/admin"));
  });

  it("visitante de verdade: o formulário fica, ninguém é levado a lugar nenhum", async () => {
    const f = dublarFetch({ "GET /api/sessao": SEM_SESSAO });
    render(<Entrar t={t} />);
    await waitFor(() => expect(f).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 0));
    expect(navegar.para).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: t.entrarBotao })).toBeTruthy();
  });

  it.each([
    ["500", () => json({ error: "x" }, 500)],
    ["rede caída", () => Promise.reject(new TypeError("Failed to fetch"))],
  ])("falha na consulta (%s): nada muda", async (_nome, resposta) => {
    const f = vi.fn(resposta as () => Promise<Response>);
    vi.stubGlobal("fetch", f);
    render(<Entrar t={t} />);
    await waitFor(() => expect(f).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 0));
    expect(navegar.para).not.toHaveBeenCalled();
    expect(screen.queryByRole("alert")).toBeNull();
  });
});

describe("entrar com a senha provisória (INS-01)", () => {
  function entrarCom(email: string, senha: string, botao = t.entrarBotao) {
    fireEvent.change(screen.getByRole("textbox"), { target: { value: email } });
    fireEvent.change(document.querySelector('input[type="password"]')!, { target: { value: senha } });
    fireEvent.click(screen.getByRole("button", { name: botao }));
  }

  it("mustChangePassword: vai direto para /conta/senha, com o destino junto", async () => {
    dublarFetch({
      "GET /api/sessao": SEM_SESSAO,
      "POST /api/conta/login": json({ ok: true, jogador: { email: "c@x.com", displayName: "Capitão", mustChangePassword: true } }),
    });
    render(<Entrar t={t} volta="/capitao" />);
    entrarCom("c@x.com", "k7wm-3qfa-x9pe");
    await waitFor(() => expect(navegar.para).toHaveBeenCalledWith("/conta/senha?volta=/capitao"));
  });

  it("controle: sem troca pendente, segue para o destino de sempre", async () => {
    dublarFetch({
      "GET /api/sessao": SEM_SESSAO,
      "POST /api/conta/login": json({ ok: true, jogador: { email: "c@x.com", displayName: "Capitão", mustChangePassword: false } }),
    });
    render(<Entrar t={t} volta="/capitao" />);
    entrarCom("c@x.com", "senha-forte-123");
    await waitFor(() => expect(navegar.para).toHaveBeenCalledWith("/capitao"));
  });

  it("erro do login com código conhecido sai no idioma da tela", async () => {
    dublarFetch({
      "GET /api/sessao": SEM_SESSAO,
      "POST /api/conta/login": json({ error: "E-mail ou senha incorretos.", codigo: "credenciais_invalidas" }, 401),
    });
    render(<Entrar t={MESSAGES.en.inscricao} />);
    entrarCom("c@x.com", "errada", MESSAGES.en.inscricao.entrarBotao);
    expect((await screen.findByRole("alert")).textContent).toBe(MESSAGES.en.inscricao.erros.credenciais_invalidas);
  });
});
