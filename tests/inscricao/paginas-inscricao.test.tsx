import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MESSAGES } from "@/lib/i18n/messages";

/**
 * As páginas /inscricao e /minha-inscricao (Server Components), com sessão, janela e
 * idioma dublados:
 *
 *  - MY-02: o título da aba sai no idioma da visita (antes era fixo em português).
 *  - INS-03: com a janela fechada, quem está sem sessão tem um caminho para entrar e ver a
 *    própria inscrição (o formulário some, e com ele o "Já tenho conta").
 *  - INS-11: o botão do aviso "Você já está inscrito" pode quebrar linha no celular.
 */

const cenario = vi.hoisted(() => ({
  lingua: "pt" as "pt" | "en",
  janela: "aberta" as string,
  jogador: null as { id: string; displayName: string; email: string } | null,
  inscricaoId: null as string | null,
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

vi.mock("@/lib/inscricoes/store", () => ({
  lerConfigOuNulo: async () => ({
    taxa_centavos: 2000,
    chave_pix: null,
    prazo_pagamento_dias: 14,
    min_ranqueadas: 5,
    pct_campeao: 70,
  }),
  inscricaoIdDoJogador: async () => cenario.inscricaoId,
}));

vi.mock("@/lib/inscricoes/schema", () => ({
  estadoDaJanela: () => cenario.janela,
}));

const paginaInscricao = await import("@/app/inscricao/page");
const paginaMinha = await import("@/app/minha-inscricao/page");

beforeEach(() => {
  cenario.lingua = "pt";
  cenario.janela = "aberta";
  cenario.jogador = null;
  cenario.inscricaoId = null;
});

async function htmlDaInscricao() {
  return renderToStaticMarkup(await paginaInscricao.default());
}

describe("título da aba no idioma da visita (MY-02)", () => {
  it("/inscricao em inglês e em português", async () => {
    cenario.lingua = "en";
    const en = await paginaInscricao.generateMetadata();
    expect(en.title).toBe(MESSAGES.en.metadados.inscricao.titulo);
    expect(en.title).not.toMatch(/Inscrição/);
    expect(en.description).toBe(MESSAGES.en.metadados.inscricao.descricao);

    cenario.lingua = "pt";
    expect((await paginaInscricao.generateMetadata()).title).toBe("Inscrição · League of Bronze");
  });

  it("/minha-inscricao em inglês, e continua fora dos buscadores", async () => {
    cenario.lingua = "en";
    const en = await paginaMinha.generateMetadata();
    expect(en.title).toBe(MESSAGES.en.metadados.minhaInscricao.titulo);
    expect(en.title).not.toMatch(/Minha inscrição/);
    expect(en.robots).toEqual({ index: false, follow: false });
  });
});

describe("janela fechada sem sessão (INS-03)", () => {
  it.each(["encerrada", "ainda_nao_abriu"])("%s: oferece entrar e voltar para /minha-inscricao", async (janela) => {
    cenario.janela = janela;
    const html = await htmlDaInscricao();
    expect(html).toContain('href="/entrar?volta=/minha-inscricao"');
    expect(html).toContain("JÁ ME INSCREVI — ENTRAR →");
  });

  it("em inglês também", async () => {
    cenario.lingua = "en";
    cenario.janela = "encerrada";
    const html = await htmlDaInscricao();
    expect(html).toContain('href="/entrar?volta=/minha-inscricao"');
    expect(html).toContain(MESSAGES.en.inscricao.encerradaTitulo);
  });

  it("controle: quem já está logado (sem inscrição) não recebe o convite para entrar", async () => {
    cenario.janela = "encerrada";
    cenario.jogador = { id: "conta-1", displayName: "Fulano", email: "fulano@exemplo.com" };
    const html = await htmlDaInscricao();
    expect(html).not.toContain("/entrar?volta=");
  });

  it("controle: janela 'indisponivel' (sem configuração) continua sem link", async () => {
    cenario.janela = "indisponivel";
    expect(await htmlDaInscricao()).not.toContain("/entrar?volta=");
  });
});

describe("aviso 'Você já está inscrito' no celular (INS-11)", () => {
  it("o botão pode quebrar linha e a seta fica presa à última palavra", async () => {
    cenario.jogador = { id: "conta-1", displayName: "Fulano", email: "fulano@exemplo.com" };
    cenario.inscricaoId = "inscricao-1";
    const html = await htmlDaInscricao();
    const botao = html.match(/<a[^>]*href="\/minha-inscricao"[^>]*>([^<]*)<\/a>/);
    expect(botao).not.toBeNull();
    expect(botao![0]).toMatch(/white-space:normal/);
    expect(botao![0]).toMatch(/max-width:100%/);
    expect(botao![1]).toBe("ACOMPANHAR MINHA INSCRIÇÃO →");
  });
});
