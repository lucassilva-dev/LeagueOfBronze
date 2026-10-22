// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MESSAGES } from "@/lib/i18n/messages";
import { motivoDeSenhaFraca } from "@/lib/security/password";
import { EVENTO_SESSAO } from "@/lib/sessao-mudou";

/**
 * INS-01 / DIFF-BE-04 / DIFF-UI-01 (parte do jogador): a tela de troca de senha.
 *
 * Quem recebia a senha provisória da organização não tinha onde trocá-la: nenhuma tela
 * chamava POST /api/conta/senha, `must_change_password` ficava ligado para sempre e a
 * organização seguia sabendo a senha. Esta é a tela — com a regra dita antes, os erros do
 * servidor no idioma dela e as saídas para /entrar quando a sessão não vale mais.
 */

const navegar = vi.hoisted(() => ({ para: vi.fn() }));
vi.mock("@/components/inscricao/navegar", async (original) => ({
  ...(await original<typeof import("@/components/inscricao/navegar")>()),
  navegarPara: navegar.para,
}));

const { default: TrocarSenha, problemaDaSenhaNova } = await import("@/components/inscricao/trocar-senha");

const t = MESSAGES.pt.inscricao;
const en = MESSAGES.en.inscricao;

function resposta(corpo: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(corpo), { status, headers: { "Content-Type": "application/json", ...headers } });
}

let pedidos: { url: string; corpo: unknown }[] = [];
function servidor(r: Response | (() => Promise<Response>)) {
  pedidos = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      pedidos.push({ url, corpo: JSON.parse(String(init?.body ?? "null")) });
      return typeof r === "function" ? r() : r.clone();
    }),
  );
}

function desenhar(props: Partial<Parameters<typeof TrocarSenha>[0]> = {}) {
  return render(<TrocarSenha t={t} obrigatoria={false} email="capitao@x.com" {...props} />);
}

function preencher(atual: string, nova: string, confirmacao = nova, rotulos = t) {
  fireEvent.change(screen.getByLabelText(rotulos.contaSenhaAtualLabel), { target: { value: atual } });
  fireEvent.change(screen.getByLabelText(rotulos.contaSenhaNovaLabel), { target: { value: nova } });
  fireEvent.change(screen.getByLabelText(rotulos.contaSenhaConfirmarLabel), { target: { value: confirmacao } });
  fireEvent.click(screen.getByRole("button", { name: rotulos.contaSenhaBotao }));
}

const PROVISORIA = "k7wm-3qfa-x9pe";
const NOVA = "minha-senha-nova-2026";

beforeEach(() => {
  navegar.para.mockReset();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("a tela existe e chama a rota de troca", () => {
  it("envia senhaAtual e senhaNova para POST /api/conta/senha; com { ok: true } diz que trocou e avisa o cabeçalho", async () => {
    servidor(resposta({ ok: true }));
    const avisos = vi.fn();
    window.addEventListener(EVENTO_SESSAO, avisos);
    desenhar({ volta: "/capitao" });
    preencher(PROVISORIA, NOVA);

    expect((await screen.findByRole("status")).textContent).toBe(t.contaSenhaPronto);
    expect(pedidos).toEqual([{ url: "/api/conta/senha", corpo: { senhaAtual: PROVISORIA, senhaNova: NOVA } }]);
    expect(avisos).toHaveBeenCalled();
    // Segue para onde ia.
    expect(screen.getByRole("link", { name: t.contaSenhaContinuar }).getAttribute("href")).toBe("/capitao");
    window.removeEventListener(EVENTO_SESSAO, avisos);
  });

  it("{ ok: true, entrarDeNovo: true }: a senha mudou, mas a sessão nova falhou — manda para /entrar", async () => {
    servidor(resposta({ ok: true, entrarDeNovo: true }));
    desenhar({ volta: "/capitao" });
    preencher(PROVISORIA, NOVA);
    await waitFor(() => expect(navegar.para).toHaveBeenCalledWith("/entrar?volta=/capitao"));
  });
});

describe("a regra da senha é dita antes, e conferida antes de enviar", () => {
  it("a regra aparece com o formulário, ligada ao campo da senha nova", () => {
    desenhar();
    const campo = screen.getByLabelText(t.contaSenhaNovaLabel);
    const ajuda = document.getElementById(campo.getAttribute("aria-describedby") ?? "");
    expect(ajuda?.textContent).toBe(t.contaSenhaRegra);
    expect(t.contaSenhaRegra).toMatch(/12 caracteres/);
  });

  it.each([
    ["curta", "abc123", "abc123", t.erros.senha_curta],
    ["sem número", "senhasemnumeroalgum", "senhasemnumeroalgum", t.erros.senha_fraca],
    ["confirmação diferente", NOVA, `${NOVA}x`, t.contaSenhaNaoConfere],
    ["igual à atual", PROVISORIA, PROVISORIA, t.contaSenhaIgual],
  ])("%s: avisa sem ir ao servidor", async (_caso, nova, confirmacao, mensagem) => {
    servidor(resposta({ ok: true }));
    desenhar();
    preencher(PROVISORIA, nova, confirmacao);
    expect((await screen.findByRole("alert")).textContent).toBe(mensagem);
    expect(pedidos).toEqual([]);
  });

  it("a regra daqui é a mesma do servidor (motivoDeSenhaFraca)", () => {
    for (const senha of ["", "abc", "a".repeat(11) + "1", "aaaaaaaaaaaa", "111111111111", "abcdefghijk1", "x".repeat(199) + "1", "x".repeat(200) + "1"]) {
      const motivo = motivoDeSenhaFraca(senha);
      const aqui = problemaDaSenhaNova(t, { atual: "outra-coisa-1", nova: senha, confirmacao: senha });
      expect(aqui, JSON.stringify(senha.slice(0, 20))).toBe(motivo ? t.erros[motivo] : null);
    }
  });
});

describe("respostas do servidor", () => {
  it("400 com problemas: mostra o que o servidor disse", async () => {
    servidor(resposta({ error: "A senha precisa combinar letras e números.", problemas: [{ campo: "senhaNova", mensagem: "A senha precisa combinar letras e números." }] }, 400));
    desenhar();
    preencher(PROVISORIA, NOVA);
    expect((await screen.findByRole("alert")).textContent).toBe("A senha precisa combinar letras e números.");
  });

  it("400 com código conhecido: no idioma da tela", async () => {
    servidor(resposta({ error: "A senha precisa ter pelo menos 12 caracteres.", codigo: "senha_curta" }, 400));
    render(<TrocarSenha t={en} obrigatoria={false} email="c@x.com" />);
    preencher(PROVISORIA, NOVA, NOVA, en);
    expect((await screen.findByRole("alert")).textContent).toBe(en.erros.senha_curta);
  });

  it("401 'Senha atual incorreta.': erro aqui mesmo, no idioma da tela, e o formulário fica", async () => {
    servidor(resposta({ error: "Senha atual incorreta." }, 401));
    render(<TrocarSenha t={en} obrigatoria={false} email="c@x.com" />);
    preencher("errada-123456", NOVA, NOVA, en);
    expect((await screen.findByRole("alert")).textContent).toBe(en.contaSenhaAtualIncorreta);
    expect(screen.getByRole("button", { name: en.contaSenhaBotao })).toBeTruthy();
  });

  it("401 sem sessão: a sessão acabou — caminho para entrar de novo", async () => {
    servidor(resposta({ error: "Entre na sua conta primeiro." }, 401));
    desenhar();
    preencher(PROVISORIA, NOVA);
    expect((await screen.findByRole("alert")).textContent).toBe(t.contaSenhaSessaoAcabou);
    expect(screen.getByRole("link", { name: t.contaSenhaEntrarDeNovo }).getAttribute("href")).toBe("/entrar");
  });

  it("409: 'sua conta mudou, entre de novo' → /entrar", async () => {
    servidor(resposta({ error: "A conta mudou." }, 409));
    desenhar({ volta: "/capitao" });
    preencher(PROVISORIA, NOVA);
    expect((await screen.findByRole("alert")).textContent).toBe(t.contaSenhaContaMudou);
    expect(screen.getByRole("link", { name: t.contaSenhaEntrarDeNovo }).getAttribute("href")).toBe("/entrar?volta=/capitao");
    expect(screen.queryByRole("button", { name: t.contaSenhaBotao })).toBeNull();
  });

  it("429 com Retry-After: diz quanto esperar", async () => {
    servidor(resposta({ error: "Muitas tentativas. Tente novamente mais tarde." }, 429, { "Retry-After": "900" }));
    desenhar();
    preencher(PROVISORIA, NOVA);
    expect((await screen.findByRole("alert")).textContent).toBe(t.contaSenhaEspere.replace("{minutos}", "15"));
  });

  it("429 sem Retry-After: 'tente mais tarde'", async () => {
    servidor(resposta({ error: "Muitas tentativas. Tente novamente mais tarde." }, 429));
    desenhar();
    preencher(PROVISORIA, NOVA);
    expect((await screen.findByRole("alert")).textContent).toBe(t.erros.muitas_tentativas);
  });

  it("500: mensagem genérica no idioma da tela, com o ref para a organização achar no log", async () => {
    servidor(resposta({ error: "Não foi possível trocar a senha.", ref: "a1b2c3d4" }, 500));
    render(<TrocarSenha t={en} obrigatoria={false} email="c@x.com" />);
    preencher(PROVISORIA, NOVA, NOVA, en);
    expect((await screen.findByRole("alert")).textContent).toBe(`${en.contaSenhaErro} (ref a1b2c3d4)`);
  });

  it("rede caída: mensagem genérica, e dá para tentar de novo", async () => {
    servidor(() => Promise.reject(new TypeError("Failed to fetch")));
    desenhar();
    preencher(PROVISORIA, NOVA);
    expect((await screen.findByRole("alert")).textContent).toBe(t.contaSenhaErro);
    expect((screen.getByRole("button", { name: t.contaSenhaBotao }) as HTMLButtonElement).disabled).toBe(false);
  });
});

describe("troca cobrada, nunca trancada", () => {
  it("com a provisória: explica o porquê e oferece 'Agora não' para o destino", () => {
    desenhar({ obrigatoria: true, volta: "/capitao" });
    expect(screen.getByText(t.contaSenhaObrigatoria)).toBeTruthy();
    expect(screen.getByRole("link", { name: t.contaSenhaAgoraNao }).getAttribute("href")).toBe("/capitao");
  });

  it("troca voluntária: sem o aviso e sem o 'Agora não'", () => {
    desenhar({ obrigatoria: false });
    expect(screen.queryByText(t.contaSenhaObrigatoria)).toBeNull();
    expect(screen.queryByRole("link", { name: t.contaSenhaAgoraNao })).toBeNull();
  });

  it("o gerenciador de senhas sabe de qual conta é a senha nova", () => {
    desenhar();
    const usuario = document.querySelector('input[autocomplete="username"]') as HTMLInputElement;
    expect(usuario.value).toBe("capitao@x.com");
    expect(document.querySelectorAll('input[autocomplete="new-password"]')).toHaveLength(2);
    expect(document.querySelector('input[autocomplete="current-password"]')).not.toBeNull();
  });
});
