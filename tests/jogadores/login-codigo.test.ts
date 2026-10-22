import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { inscricao } from "@/lib/i18n/messages/inscricao";

import { criarBancoEmMemoria, type BancoEmMemoria } from "../security/_banco-em-memoria";

/**
 * INS-15 (login) — POST /api/conta/login devolve um `codigo` estável junto do texto.
 *
 * O texto da rota é fixo em português, e o formulário de inscrição só traduz pelo
 * `codigo` (lib/i18n/messages/inscricao.ts, `erros.*`). Sem ele, no site em inglês o login
 * mostrava "E-mail ou senha incorretos." em português.
 *
 * SEG-08 junto: a conta desativada recebe o MESMO corpo da senha errada, código incluso —
 * um código próprio confirmaria a senha certa de quem saiu.
 *
 * Código REAL da rota, do limitador e do scrypt; só o banco é simulado.
 */

process.env.ADMIN_SESSION_SECRET = "segredo-de-teste-com-tamanho-suficiente-1234567890";
process.env.ADMIN_PASSWORD_PEPPER = "pimenta-de-teste-com-tamanho-suficiente-1234567890";

const estado = vi.hoisted(() => ({ banco: null as unknown as BancoEmMemoria, supabase: true }));

vi.mock("@/lib/data-store", () => ({
  isSupabaseConfigured: () => estado.supabase,
  createSupabaseAdminClient: () => estado.banco.cliente(),
}));

const { hashPassword } = await import("@/lib/security/password");
const { pepperDeSenhaJogador } = await import("@/lib/jogadores/auth");
const { POST: login } = await import("@/app/api/conta/login/route");

const SENHA = "capitaoForte2026";
let hash = "";

function pedido(corpo: unknown, ip = "1.1.1.1"): NextRequest {
  const texto = JSON.stringify(corpo);
  return {
    method: "POST",
    headers: new Headers({ host: "leagueofbronze.xyz", "sec-fetch-site": "same-origin", "x-forwarded-for": ip }),
    cookies: { get: () => undefined },
    json: async () => JSON.parse(texto),
    text: async () => texto,
  } as unknown as NextRequest;
}

beforeEach(async () => {
  estado.banco = criarBancoEmMemoria(1);
  estado.supabase = true;
  hash ||= await hashPassword(SENHA, pepperDeSenhaJogador());
  estado.banco.tabelas.jogador_contas = [
    {
      id: "capitao",
      email: "capitao@x.com",
      display_name: "Capitão",
      password_hash: hash,
      must_change_password: false,
      session_epoch: 0,
      disabled_at: null,
    },
  ];
});

describe("INS-15 — o login do jogador responde com código", () => {
  it("senha errada, conta inexistente e corpo inválido: 401 com codigo 'credenciais_invalidas'", async () => {
    const respostas = [
      await login(pedido({ email: "capitao@x.com", senha: "erradaErrada1" })),
      await login(pedido({ email: "ninguem@x.com", senha: "erradaErrada1" })),
      await login(pedido({ email: "nao-e-email", senha: "" })),
    ];
    for (const r of respostas) {
      expect(r.status).toBe(401);
      expect(await r.json()).toEqual({ error: "E-mail ou senha incorretos.", codigo: "credenciais_invalidas" });
    }
  });

  it("conta desativada, com a senha CERTA: o mesmo 401 e o mesmo código da senha errada (SEG-08)", async () => {
    estado.banco.tabelas.jogador_contas![0]!.disabled_at = "2026-10-01T00:00:00Z";
    const errada = await login(pedido({ email: "capitao@x.com", senha: "erradaErrada1" }));
    const certa = await login(pedido({ email: "capitao@x.com", senha: SENHA }));
    expect(certa.status).toBe(401);
    expect(await certa.json()).toEqual(await errada.json());
  });

  it("acima do teto: 429 com codigo 'muitas_tentativas' e Retry-After", async () => {
    for (let i = 0; i < 5; i++) await login(pedido({ email: "capitao@x.com", senha: `errada${i}abc` }));
    const r = await login(pedido({ email: "capitao@x.com", senha: SENHA }));
    expect(r.status).toBe(429);
    expect(r.headers.get("Retry-After")).toBeTruthy();
    expect(await r.json()).toEqual({
      error: "Muitas tentativas. Tente novamente mais tarde.",
      codigo: "muitas_tentativas",
    });
  });

  it("contas indisponíveis no ambiente: 503 com codigo 'indisponivel'", async () => {
    estado.supabase = false;
    const r = await login(pedido({ email: "capitao@x.com", senha: SENHA }));
    expect(r.status).toBe(503);
    expect(await r.json()).toEqual({ error: "Contas ainda não estão disponíveis.", codigo: "indisponivel" });
  });

  it("todo código que a rota devolve tem tradução no dicionário, em pt e em en", () => {
    for (const codigo of ["credenciais_invalidas", "muitas_tentativas", "indisponivel"]) {
      expect(inscricao.pt.erros).toHaveProperty(codigo);
      expect(inscricao.en.erros).toHaveProperty(codigo);
    }
  });

  it("controle: a senha certa segue entrando", async () => {
    const r = await login(pedido({ email: "capitao@x.com", senha: SENHA }));
    expect(r.status).toBe(200);
    expect(await r.json()).toMatchObject({ ok: true, jogador: { email: "capitao@x.com" } });
  });
});
