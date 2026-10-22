import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { criarBancoEmMemoria, type BancoEmMemoria } from "../security/_banco-em-memoria";

/**
 * DIFF-BE-05 — redefinição da organização × troca de senha do próprio jogador.
 *
 * `trocarSenhaJogador` gravava SEM condição. Se a master gerasse a senha provisória (para
 * tirar da conta quem descobriu a senha) entre a leitura da conta e a gravação da troca —
 * a janela tem dois scrypt —, a troca passava por cima: a provisória entregue à organização
 * não abria a conta, a troca obrigatória sumia e o epoch ficava no MESMO número da
 * redefinição, então o cookie emitido pela troca sobrevivia a ela. A organização recebia
 * 200 com uma provisória inútil.
 *
 * Agora a troca é condicionada ao epoch lido: com a conta mudada no meio, nada é gravado,
 * a rota responde 409 e não emite cookie.
 *
 * Código REAL da rota, de `lib/jogadores/{auth,store}`, do limitador, do cookie assinado e
 * do scrypt. Só o banco é simulado; a redefinição "cai no meio" logo depois de a senha
 * atual ser conferida.
 */

process.env.ADMIN_SESSION_SECRET = "segredo-de-teste-com-tamanho-suficiente-1234567890";
process.env.ADMIN_PASSWORD_PEPPER = "pimenta-de-teste-com-tamanho-suficiente-1234567890";

const estado = vi.hoisted(() => ({
  banco: null as unknown as BancoEmMemoria,
  noMeio: null as null | (() => Promise<void>),
}));

vi.mock("@/lib/data-store", () => ({
  isSupabaseConfigured: () => true,
  createSupabaseAdminClient: () => estado.banco.cliente(),
}));

vi.mock("@/lib/security/password", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/security/password")>();
  return {
    ...real,
    // A conferência da senha atual acontece DEPOIS da leitura da conta e ANTES da gravação
    // da troca: é aqui que a redefinição da organização cai no meio.
    verifyPassword: async (...args: Parameters<typeof real.verifyPassword>) => {
      const ok = await real.verifyPassword(...args);
      const noMeio = estado.noMeio;
      estado.noMeio = null;
      if (noMeio) await noMeio();
      return ok;
    },
  };
});

const { hashPassword, verifyPassword } = await import("@/lib/security/password");
const { JOGADOR_COOKIE, identidadePorToken, pepperDeSenhaJogador } = await import("@/lib/jogadores/auth");
const { redefinirSenhaJogador } = await import("@/lib/jogadores/store");
const { POST: loginJogador } = await import("@/app/api/conta/login/route");
const { POST: senhaJogador } = await import("@/app/api/conta/senha/route");

const ID = "0b6f1d2e-3c4a-4b5c-8d6e-7f8091a2b3c4";
const SENHA_ATUAL = "senhaAntiga2026";
const SENHA_NOVA = "senhaNovaDoIntruso99";
let hashAtual = "";

function pedido(corpo: unknown, cookie?: string): NextRequest {
  const texto = JSON.stringify(corpo);
  return {
    method: "POST",
    headers: new Headers({ host: "leagueofbronze.xyz", "sec-fetch-site": "same-origin", "x-forwarded-for": "9.9.9.9" }),
    cookies: { get: (nome: string) => (nome === JOGADOR_COOKIE && cookie ? { value: cookie } : undefined) },
    json: async () => JSON.parse(texto),
    text: async () => texto,
  } as unknown as NextRequest;
}

function conta() {
  return estado.banco.tabelas.jogador_contas![0]!;
}

async function confere(senha: string) {
  return verifyPassword(senha, String(conta().password_hash), pepperDeSenhaJogador());
}

async function entrar(): Promise<string> {
  const r = await loginJogador(pedido({ email: "capitao@x.com", senha: SENHA_ATUAL }));
  expect(r.status).toBe(200);
  return r.cookies.get(JOGADOR_COOKIE)!.value;
}

beforeEach(async () => {
  estado.banco = criarBancoEmMemoria(2);
  estado.noMeio = null;
  hashAtual ||= await hashPassword(SENHA_ATUAL, pepperDeSenhaJogador());
  estado.banco.tabelas.jogador_contas = [
    {
      id: ID,
      email: "capitao@x.com",
      display_name: "Capitão",
      password_hash: hashAtual,
      must_change_password: false,
      session_epoch: 0,
      disabled_at: null,
    },
  ];
});

describe("DIFF-BE-05 — a redefinição que cai no meio da troca de senha prevalece", () => {
  it("a troca não grava nada, responde 409 sem cookie, e a provisória da organização abre a conta", async () => {
    const cookie = await entrar();
    let provisoria = "";
    estado.noMeio = async () => {
      provisoria = (await redefinirSenhaJogador({ id: ID }, pepperDeSenhaJogador()))!.senhaProvisoria;
    };

    const r = await senhaJogador(pedido({ senhaAtual: SENHA_ATUAL, senhaNova: SENHA_NOVA }, cookie));

    expect(provisoria).not.toBe("");
    expect(r.status).toBe(409);
    expect(await r.json()).toMatchObject({ error: "Sua conta mudou enquanto você trocava a senha. Entre de novo." });
    expect(r.cookies.get(JOGADOR_COOKIE)).toBeUndefined();

    // A redefinição vale inteira: provisória, troca obrigatória e epoch dela.
    expect(await confere(provisoria)).toBe(true);
    expect(await confere(SENHA_NOVA)).toBe(false);
    expect(conta().must_change_password).toBe(true);
    expect(conta().session_epoch).toBe(1);
    // Quem estava dentro caiu.
    expect(await identidadePorToken(cookie)).toBeNull();
  });

  it("os dois 401 da troca levam códigos diferentes (a tela decide por eles), e o 409 leva 'conta_mudou'", async () => {
    const semSessao = await senhaJogador(pedido({ senhaAtual: SENHA_ATUAL, senhaNova: SENHA_NOVA }));
    expect(semSessao.status).toBe(401);
    expect(await semSessao.json()).toMatchObject({ codigo: "sem_sessao" });

    const cookie = await entrar();
    const errada = await senhaJogador(pedido({ senhaAtual: "naoEhEssa2026", senhaNova: SENHA_NOVA }, cookie));
    expect(errada.status).toBe(401);
    expect(await errada.json()).toEqual({ error: "Senha atual incorreta.", codigo: "senha_atual_incorreta" });

    estado.noMeio = async () => void (await redefinirSenhaJogador({ id: ID }, pepperDeSenhaJogador()));
    const mudou = await senhaJogador(pedido({ senhaAtual: SENHA_ATUAL, senhaNova: SENHA_NOVA }, cookie));
    expect(mudou.status).toBe(409);
    expect(await mudou.json()).toMatchObject({ codigo: "conta_mudou" });
  });

  it("controle: sem nada no meio, a troca grava, sobe o epoch e emite a sessão nova", async () => {
    const cookie = await entrar();
    const r = await senhaJogador(pedido({ senhaAtual: SENHA_ATUAL, senhaNova: SENHA_NOVA }, cookie));

    expect(r.status).toBe(200);
    expect(await confere(SENHA_NOVA)).toBe(true);
    expect(conta().session_epoch).toBe(1);
    expect(conta().must_change_password).toBe(false);
    expect(await identidadePorToken(r.cookies.get(JOGADOR_COOKIE)!.value)).not.toBeNull();
  });
});
