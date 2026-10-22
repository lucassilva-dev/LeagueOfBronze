import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MESSAGES } from "@/lib/i18n/messages";

/**
 * As páginas /conta/senha e /entrar (Server Components) no caminho da senha provisória.
 *
 *  - Sem sessão de jogador, /conta/senha manda para /entrar, com volta para cá.
 *  - Com a troca pendente, a página ABRE (exigir a troca nunca impede de chegar nela) e
 *    explica o porquê.
 *  - O /entrar de quem já está logado com a troca pendente leva para ela, com o destino.
 */

const cenario = vi.hoisted(() => ({
  lingua: "pt" as "pt" | "en",
  jogador: null as { id: string; displayName: string; email: string; mustChangePassword: boolean } | null,
}));

class Redirecionou extends Error {
  constructor(readonly destino: string) {
    super(`redirect ${destino}`);
  }
}

vi.mock("next/navigation", () => ({
  redirect: (destino: string) => {
    throw new Redirecionou(destino);
  },
}));

vi.mock("@/lib/i18n/server", async () => {
  const { MESSAGES: M } = await import("@/lib/i18n/messages");
  return {
    getLocale: async () => cenario.lingua,
    getMessages: async () => M[cenario.lingua],
  };
});

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => (cenario.jogador ? { value: "token" } : undefined) }),
}));

vi.mock("@/lib/jogadores/auth", () => ({
  JOGADOR_COOKIE: "lob_jogador",
  identidadePorToken: async () => cenario.jogador,
}));

vi.mock("@/lib/admin-auth", () => ({
  getAdminIdentityDeCookies: async () => null,
}));

const paginaSenha = await import("@/app/conta/senha/page");
const paginaEntrar = await import("@/app/entrar/page");

const CAPITAO = { id: "c1", displayName: "Capitão", email: "capitao@x.com", mustChangePassword: true };

beforeEach(() => {
  cenario.lingua = "pt";
  cenario.jogador = null;
});

async function destinoDo(promessa: Promise<unknown>): Promise<string | null> {
  try {
    await promessa;
    return null;
  } catch (e) {
    if (e instanceof Redirecionou) return e.destino;
    throw e;
  }
}

const params = (volta?: string) => ({ searchParams: Promise.resolve(volta ? { volta } : {}) });

describe("/conta/senha", () => {
  it("sem sessão de jogador: vai para /entrar com volta para cá", async () => {
    expect(await destinoDo(paginaSenha.default(params()))).toBe("/entrar?volta=/conta/senha");
  });

  it("com a provisória: a página abre, com o aviso, a regra e o 'Agora não' para o destino conferido", async () => {
    cenario.jogador = CAPITAO;
    const html = renderToStaticMarkup(await paginaSenha.default(params("/capitao")));
    const t = MESSAGES.pt.inscricao;
    expect(html).toContain(t.contaSenhaTitulo);
    expect(html).toContain(t.contaSenhaObrigatoria);
    expect(html).toContain(t.contaSenhaRegra);
    expect(html).toContain('href="/capitao"');
  });

  it("volta fora da lista fechada é descartada", async () => {
    cenario.jogador = CAPITAO;
    const html = renderToStaticMarkup(await paginaSenha.default(params("//evil.example")));
    expect(html).not.toContain("evil.example");
    expect(html).toContain('href="/minha-inscricao"');
  });

  it("troca voluntária (sem provisória): sem o aviso", async () => {
    cenario.jogador = { ...CAPITAO, mustChangePassword: false };
    const html = renderToStaticMarkup(await paginaSenha.default(params()));
    expect(html).toContain(MESSAGES.pt.inscricao.contaSenhaBotao);
    expect(html).not.toContain(MESSAGES.pt.inscricao.contaSenhaObrigatoria);
  });

  it("em inglês, título da aba e página, e fora dos buscadores", async () => {
    cenario.lingua = "en";
    cenario.jogador = CAPITAO;
    const meta = await paginaSenha.generateMetadata();
    expect(meta.title).toBe("Change password · League of Bronze");
    expect(meta.robots).toEqual({ index: false, follow: false });
    const html = renderToStaticMarkup(await paginaSenha.default(params()));
    expect(html).toContain(MESSAGES.en.inscricao.contaSenhaBotao);
    expect(html).not.toContain("Trocar senha");
  });
});

describe("/entrar de quem já está logado", () => {
  it("com a troca pendente: vai para /conta/senha levando o destino", async () => {
    cenario.jogador = CAPITAO;
    expect(await destinoDo(paginaEntrar.default(params("/capitao")))).toBe("/conta/senha?volta=/capitao");
  });

  it("sem a troca pendente: o destino de sempre", async () => {
    cenario.jogador = { ...CAPITAO, mustChangePassword: false };
    expect(await destinoDo(paginaEntrar.default(params("/capitao")))).toBe("/capitao");
  });
});
