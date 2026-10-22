import type { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { criarBancoSimulado } from "../inscricoes/_banco-simulado";

/**
 * «Importar da Riot» no painel de séries usa a MESMA chave do robô e do formulário de
 * inscrição (RIOT-07). Então ele:
 *  - respeita a pausa gravada depois de um 429 (as políticas da Riot exigem parar até o
 *    Retry-After — esta rota inclusive);
 *  - grava a pausa quando ELE leva o 429, para o robô e o formulário pararem também;
 *  - não fica pendurado com a Riot sem responder.
 */

const estado = vi.hoisted(() => ({
  banco: null as unknown as ReturnType<typeof import("../inscricoes/_banco-simulado").criarBancoSimulado>,
  fetches: [] as { url: string; init?: RequestInit }[],
  resposta: (() => new Response("{}", { status: 200 })) as () => Response | Promise<Response>,
}));

vi.mock("@/lib/data-store", () => ({
  isSupabaseConfigured: () => true,
  createSupabaseAdminClient: () => estado.banco.cliente(),
}));

vi.mock("@/lib/security/route-guard", () => ({
  mesmaOrigem: () => true,
  requireAdmin: async () => ({ ok: true, identity: { username: "lucas", isMaster: true, scopes: [] } }),
}));

const { POST } = await import("@/app/api/admin/riot/match/route");

const AGORA = Date.parse("2026-11-21T20:00:00.000Z");

function req(corpo: unknown): NextRequest {
  return { json: async () => corpo, headers: new Headers() } as unknown as NextRequest;
}

const pausaGravada = () => estado.banco.tabelas.edicao_config![0]!.riot_pausa_ate as string | null;

beforeEach(() => {
  vi.spyOn(Date, "now").mockReturnValue(AGORA);
  estado.banco = criarBancoSimulado();
  estado.banco.tabelas = { edicao_config: [{ id: 1, riot_pausa_ate: null }] };
  estado.fetches = [];
  estado.resposta = () => new Response("{}", { status: 200 });
  vi.stubEnv("RIOT_API_KEY", "RGAPI-teste");
  vi.stubGlobal("fetch", async (url: string, init?: RequestInit) => {
    estado.fetches.push({ url: String(url), init });
    return estado.resposta();
  });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("importar partida da Riot", () => {
  it("com o robô pausado (429 recente), nem chama a Riot: responde 429 com o tempo que falta", async () => {
    estado.banco.tabelas.edicao_config![0]!.riot_pausa_ate = new Date(AGORA + 90_000).toISOString();
    const r = await POST(req({ matchId: "BR1_123456" }));
    expect(r.status).toBe(429);
    expect(r.headers.get("Retry-After")).toBe("90");
    expect((await r.json()).error).toMatch(/Aguarde 90 segundo/);
    expect(estado.fetches).toEqual([]);
  });

  it("a Riot responde 429: a pausa é gravada para todo mundo que usa a chave, pelo Retry-After", async () => {
    estado.resposta = () => new Response("{}", { status: 429, headers: { "retry-after": "75" } });
    const r = await POST(req({ matchId: "BR1_123456" }));
    expect(r.status).toBe(429);
    expect(pausaGravada()).toBe(new Date(AGORA + 75_000).toISOString());
  });

  it("a chamada leva tempo-limite (não fica pendurada até o fim da função)", async () => {
    estado.resposta = () => new Response("{}", { status: 404 });
    await POST(req({ matchId: "BR1_123456" }));
    expect(estado.fetches).toHaveLength(1);
    expect(estado.fetches[0]!.init?.signal).toBeInstanceOf(AbortSignal);
  });

  it("a Riot não respondeu a tempo: 504 com mensagem para o organizador", async () => {
    estado.resposta = () => {
      throw new DOMException("The operation timed out.", "TimeoutError");
    };
    const r = await POST(req({ matchId: "BR1_123456" }));
    expect(r.status).toBe(504);
    expect((await r.json()).error).toMatch(/não respondeu a tempo/);
  });

  it("controle: pausa já vencida não impede a importação", async () => {
    estado.banco.tabelas.edicao_config![0]!.riot_pausa_ate = new Date(AGORA - 1_000).toISOString();
    estado.resposta = () => new Response("{}", { status: 404 });
    const r = await POST(req({ matchId: "BR1_123456" }));
    expect(r.status).toBe(404);
    expect(estado.fetches).toHaveLength(1);
  });
});
