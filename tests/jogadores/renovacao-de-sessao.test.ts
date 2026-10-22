import type { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { criarBancoEmMemoria, type BancoEmMemoria } from "../security/_banco-em-memoria";

/**
 * Renovação deslizante da sessão do jogador (DRF-10 / INF-03).
 *
 * A validade era fixa na emissão: quem entrou numa sexta às 20h05 caía às 20h05 da sexta
 * seguinte MESMO usando o site sem parar — no meio do draft, se o draft fosse nesse
 * horário, com a vez dele indo para o cronômetro. Agora as rotas que o cabeçalho chama em
 * toda página (`/api/sessao` e `/api/conta/sessao`) reemitem o cookie quando o token tem
 * mais de um dia, sem mudar o epoch.
 *
 * Código REAL de `lib/jogadores/{auth,store}` e das duas rotas, com cookie assinado de
 * verdade e relógio falso. Só o banco é simulado.
 */

process.env.ADMIN_SESSION_SECRET = "segredo-de-teste-com-tamanho-suficiente-1234567890";
process.env.ADMIN_PASSWORD_PEPPER = "pimenta-de-teste-com-tamanho-suficiente-1234567890";

const estado = vi.hoisted(() => ({ banco: null as unknown as BancoEmMemoria }));

vi.mock("@/lib/data-store", () => ({
  isSupabaseConfigured: () => true,
  createSupabaseAdminClient: () => estado.banco.cliente(),
}));

vi.mock("@/lib/admin-auth", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getAdminIdentity: async () => null,
}));

vi.mock("@/lib/inscricoes/store", () => ({ inscricaoIdDoJogador: async () => null }));

const { JOGADOR_COOKIE, emitirCookieDeJogador, identidadePorToken, renovarCookieDeJogador } = await import(
  "@/lib/jogadores/auth"
);
const { verifySessionToken } = await import("@/lib/security/session");
const { segredoDeSessao } = await import("@/lib/jogadores/auth");
const { GET: sessaoDoCabecalho } = await import("@/app/api/sessao/route");
const { GET: sessaoDaConta } = await import("@/app/api/conta/sessao/route");

const CONTA = {
  id: "conta-capitao",
  email: "capitao@x.com",
  display_name: "Capitão",
  password_hash: "x",
  must_change_password: false,
  session_epoch: 0,
  disabled_at: null,
};

function get(cookie?: string): NextRequest {
  return {
    method: "GET",
    headers: new Headers({ host: "leagueofbronze.xyz", "user-agent": "celular", "x-forwarded-for": "1.1.1.1" }),
    cookies: { get: (nome: string) => (nome === JOGADOR_COOKIE && cookie ? { value: cookie } : undefined) },
  } as unknown as NextRequest;
}

function sessao() {
  return estado.banco.tabelas.jogador_sessoes![0]!;
}

/** Login de sexta, 13/11, às 20:05 em Brasília — uma semana antes do draft. */
async function loginUmaSemanaAntes() {
  vi.setSystemTime(new Date("2026-11-13T23:05:00.000Z"));
  return (await emitirCookieDeJogador({ ...CONTA }, get())).value;
}

beforeEach(() => {
  // Só o relógio de parede é falso: a latência do banco simulado usa setTimeout de verdade.
  vi.useFakeTimers({ toFake: ["Date"] });
  estado.banco = criarBancoEmMemoria(1);
  estado.banco.tabelas.jogador_contas = [{ ...CONTA }];
});

afterEach(() => {
  vi.useRealTimers();
});

describe("renovação deslizante da sessão do jogador", () => {
  it("abrir o site no dia do draft renova: às 20:05 de 20/11 o capitão continua logado, até o fim da noite", async () => {
    const original = await loginUmaSemanaAntes();

    // 19:30 do dia do draft: o capitão abre /capitao; o cabeçalho chama /api/sessao.
    vi.setSystemTime(new Date("2026-11-20T22:30:00.000Z"));
    const r = await sessaoDoCabecalho(get(original));
    expect(await r.json()).toMatchObject({ jogador: { nome: "Capitão" } });

    const renovado = r.cookies.get(JOGADOR_COOKIE)?.value;
    expect(renovado).toBeDefined();
    expect(new Date(String(sessao().expira_em)).toISOString()).toBe("2026-11-27T22:30:00.000Z");

    // 20:05 — a hora em que a sessão antiga vencia, no meio do draft.
    vi.setSystemTime(new Date("2026-11-20T23:05:00.000Z"));
    expect(await identidadePorToken(original)).toBeNull();
    expect(await identidadePorToken(renovado)).not.toBeNull();

    // E segue valendo pela noite inteira, sondando ou não.
    vi.setSystemTime(new Date("2026-11-21T03:00:00.000Z"));
    expect(await identidadePorToken(renovado)).not.toBeNull();
  });

  it("/api/conta/sessao renova do mesmo jeito", async () => {
    const original = await loginUmaSemanaAntes();
    vi.setSystemTime(new Date("2026-11-20T22:30:00.000Z"));

    const r = await sessaoDaConta(get(original));
    const renovado = r.cookies.get(JOGADOR_COOKIE)?.value;
    expect(renovado).toBeDefined();
    expect(r.headers.get("Cache-Control")).toContain("no-store");

    vi.setSystemTime(new Date("2026-11-20T23:05:00.000Z"));
    expect(await identidadePorToken(renovado)).not.toBeNull();
  });

  it("token com menos de um dia não é reemitido — no máximo uma escrita por dia", async () => {
    const original = await loginUmaSemanaAntes();
    const expiraAntes = sessao().expira_em;

    vi.setSystemTime(new Date("2026-11-14T22:00:00.000Z")); // 23 h depois
    const r = await sessaoDoCabecalho(get(original));
    expect(r.cookies.get(JOGADOR_COOKIE)).toBeUndefined();
    expect(sessao().expira_em).toBe(expiraAntes);
  });

  it("renovar não muda sid nem epoch: trocar a senha continua derrubando o cookie renovado", async () => {
    const original = await loginUmaSemanaAntes();
    vi.setSystemTime(new Date("2026-11-16T12:00:00.000Z"));

    const renovado = (await renovarCookieDeJogador(original))!.value;
    const antes = verifySessionToken(original, segredoDeSessao(), Date.parse("2026-11-13T23:05:00.000Z"))!;
    const depois = verifySessionToken(renovado, segredoDeSessao())!;
    expect({ sid: depois.sid, uid: depois.uid, epoch: depois.epoch }).toEqual({
      sid: antes.sid,
      uid: antes.uid,
      epoch: antes.epoch,
    });

    estado.banco.tabelas.jogador_contas![0]!.session_epoch = 1; // troca de senha / "sair de todos"
    expect(await identidadePorToken(renovado)).toBeNull();
  });

  it("sessão encerrada (logout) não é renovada nem ressuscitada", async () => {
    const original = await loginUmaSemanaAntes();
    sessao().revogada_em = "2026-11-14T10:00:00.000Z";
    const expiraAntes = sessao().expira_em;

    vi.setSystemTime(new Date("2026-11-16T12:00:00.000Z"));
    const r = await sessaoDoCabecalho(get(original));
    expect(await r.json()).toMatchObject({ jogador: null });
    expect(r.cookies.get(JOGADOR_COOKIE)).toBeUndefined();

    // Nem chamando a renovação direto: sem sessão ativa no banco, não há cookie novo.
    expect(await renovarCookieDeJogador(original)).toBeNull();
    expect(sessao().expira_em).toBe(expiraAntes);
  });

  it("banco falhando na renovação: a resposta sai normal, só sem cookie novo", async () => {
    const original = await loginUmaSemanaAntes();
    estado.banco.falha = (tabela, op) => (tabela === "jogador_sessoes" && op === "update" ? "conexão caiu" : null);

    vi.setSystemTime(new Date("2026-11-16T12:00:00.000Z"));
    const r = await sessaoDoCabecalho(get(original));
    expect(r.status).toBe(200);
    expect(await r.json()).toMatchObject({ jogador: { nome: "Capitão" } });
    expect(r.cookies.get(JOGADOR_COOKIE)).toBeUndefined();
  });
});
