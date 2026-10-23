import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { criarBancoEmMemoria, type BancoEmMemoria } from "../security/_banco-em-memoria";

/**
 * INS-15 (parte da conta): no site em inglês, o cadastro de jogador respondia em
 * português — "A senha precisa ter pelo menos 5 caracteres.", "Já existe uma conta com
 * esse e-mail…", "Confira os campos destacados." — e o formulário mostra o `error` tal
 * como vem. Agora a rota responde no idioma do site (cookie `lob_locale` >
 * Accept-Language > pt) e cada recusa leva um `codigo` estável.
 *
 * Código REAL da rota, do schema, da regra de senha e do limitador; só o banco é simulado.
 */

process.env.ADMIN_SESSION_SECRET = "segredo-de-teste-com-tamanho-suficiente-1234567890";
process.env.ADMIN_PASSWORD_PEPPER = "pimenta-de-teste-com-tamanho-suficiente-1234567890";

const estado = vi.hoisted(() => ({ banco: null as unknown as BancoEmMemoria }));

vi.mock("@/lib/data-store", () => ({
  isSupabaseConfigured: () => true,
  createSupabaseAdminClient: () => estado.banco.cliente(),
}));

const { POST: cadastro } = await import("@/app/api/conta/cadastro/route");

type Idioma = { cookie?: string; acceptLanguage?: string };

function pedido(corpo: unknown, { cookie, acceptLanguage }: Idioma = {}): NextRequest {
  const texto = JSON.stringify(corpo);
  const cabecalhos: Record<string, string> = {
    host: "leagueofbronze.xyz",
    "sec-fetch-site": "same-origin",
    "x-forwarded-for": "4.4.4.4",
  };
  if (acceptLanguage) cabecalhos["accept-language"] = acceptLanguage;
  return {
    method: "POST",
    headers: new Headers(cabecalhos),
    cookies: { get: (nome: string) => (nome === "lob_locale" && cookie ? { value: cookie } : undefined) },
    json: async () => JSON.parse(texto),
    text: async () => texto,
  } as unknown as NextRequest;
}

type Resposta = { error: string; codigo: string; problemas?: Array<{ campo: string; mensagem: string }> };

async function corpo(r: Response): Promise<Resposta> {
  return (await r.json()) as Resposta;
}

beforeEach(() => {
  estado.banco = criarBancoEmMemoria(1);
  estado.banco.tabelas.jogador_contas = [];
});

describe("cadastro de jogador no idioma do site", () => {
  it("senha curta, no site em inglês: a mensagem sai em inglês, com código estável", async () => {
    const r = await cadastro(pedido({ email: "novo@x.com", nome: "Novo Jogador", senha: "ab1" }, { cookie: "en" }));
    expect(r.status).toBe(400);
    const c = await corpo(r);
    expect(c).toMatchObject({ codigo: "senha_curta", error: "The password must be at least 5 characters long." });
    expect(c.problemas).toEqual([{ campo: "senha", mensagem: "The password must be at least 5 characters long." }]);
  });

  it("senha sem número, no site em inglês", async () => {
    const r = await cadastro(pedido({ email: "novo@x.com", nome: "Novo Jogador", senha: "somenteletras" }, { cookie: "en" }));
    expect(await corpo(r)).toMatchObject({ codigo: "senha_fraca", error: "The password must mix letters and numbers." });
  });

  it("campos inválidos, no site em inglês: o resumo E a mensagem de cada campo saem em inglês", async () => {
    const r = await cadastro(pedido({ email: "nao-e-email", nome: "A", senha: "senhaBoa12345" }, { cookie: "en" }));
    expect(r.status).toBe(400);
    const c = await corpo(r);
    expect(c).toMatchObject({ codigo: "campos_invalidos", error: "Check the highlighted fields." });
    expect(c.problemas).toEqual(
      expect.arrayContaining([
        { campo: "email", mensagem: "Invalid e-mail." },
        { campo: "nome", mensagem: "Enter your first and last name." },
      ]),
    );
  });

  it("e-mail que já tem conta, no site em inglês", async () => {
    estado.banco.falha = (tabela, op) =>
      tabela === "jogador_contas" && op === "insert" ? { message: "duplicate key", code: "23505" } : null;

    const r = await cadastro(pedido({ email: "ja@x.com", nome: "Já Tenho", senha: "senhaBoa12345" }, { cookie: "en" }));
    expect(r.status).toBe(409);
    expect(await corpo(r)).toEqual({
      codigo: "email_existe",
      error: "An account with this e-mail already exists. Sign in with it or talk to the organisers.",
    });
  });

  it("sem cookie, o Accept-Language em inglês decide", async () => {
    const r = await cadastro(
      pedido({ email: "novo@x.com", nome: "Novo Jogador", senha: "ab1" }, { acceptLanguage: "en-US,en;q=0.9" }),
    );
    expect((await corpo(r)).error).toBe("The password must be at least 5 characters long.");
  });

  it("controle: o site em português continua em português, com os mesmos códigos", async () => {
    const curta = await cadastro(pedido({ email: "novo@x.com", nome: "Novo Jogador", senha: "ab1" }));
    expect(await corpo(curta)).toMatchObject({
      codigo: "senha_curta",
      error: "A senha precisa ter pelo menos 5 caracteres.",
    });

    const campos = await cadastro(pedido({ email: "nao-e-email", nome: "A", senha: "senhaBoa12345" }, { cookie: "pt" }));
    const c = await corpo(campos);
    expect(c.error).toBe("Confira os campos destacados.");
    expect(c.problemas).toEqual(expect.arrayContaining([{ campo: "email", mensagem: "E-mail inválido." }]));
  });

  it("controle: o cadastro válido segue criando a conta", async () => {
    const r = await cadastro(pedido({ email: "novo@x.com", nome: "Novo Jogador", senha: "senhaBoa12345" }, { cookie: "en" }));
    expect(r.status).toBe(200);
    expect(estado.banco.tabelas.jogador_contas).toHaveLength(1);
  });
});
