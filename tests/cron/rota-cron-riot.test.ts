import type { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * A rotina diária (`GET /api/cron/riot`). É uma rota pública na internet: sem o segredo,
 * qualquer um poderia gastar a cota da Riot do campeonato ou forçar congelamento.
 */

const chamadas = vi.hoisted(() => ({
  sync: [] as unknown[],
  congelar: 0,
  reavaliar: [] as unknown[],
  config: { congelamento_elo: null as string | null },
  quebrarRiot: false,
}));

vi.mock("@/lib/riot/sincronizar", () => ({
  sincronizarComRiot: async (opcoes: unknown) => {
    chamadas.sync.push(opcoes);
    if (chamadas.quebrarRiot) throw new Error("Riot fora do ar");
    return { simular: false, naFila: 0, processados: 0, elosMudados: 0, itensGravados: 0, erros: 0, chamadas: 0 };
  },
}));

vi.mock("@/lib/inscricoes/store", () => ({
  lerConfig: async () => chamadas.config,
  congelarElos: async () => {
    chamadas.congelar += 1;
    return 3;
  },
  reavaliarPendentes: async (opcoes: unknown) => {
    chamadas.reavaliar.push(opcoes);
    return ["A#1"];
  },
}));

const { GET } = await import("@/app/api/cron/riot/route");

function req(autorizacao?: string, query = ""): NextRequest {
  const url = new URL(`https://www.leagueofbronze.xyz/api/cron/riot${query}`);
  return {
    method: "GET",
    nextUrl: url,
    headers: new Headers(autorizacao ? { authorization: autorizacao } : {}),
  } as unknown as NextRequest;
}

beforeEach(() => {
  chamadas.sync.length = 0;
  chamadas.reavaliar.length = 0;
  chamadas.congelar = 0;
  chamadas.config = { congelamento_elo: null };
  chamadas.quebrarRiot = false;
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.stubEnv("CRON_SECRET", "segredo-do-cron-de-teste");
});

afterEach(() => vi.unstubAllEnvs());

describe("GET /api/cron/riot", () => {
  it("sem CRON_SECRET no ambiente: 503 e nada roda (o site de teste fica assim)", async () => {
    vi.stubEnv("CRON_SECRET", "");
    const r = await GET(req("Bearer qualquer"));
    expect(r.status).toBe(503);
    expect(chamadas.sync).toEqual([]);
  });

  it("segredo errado, ausente ou de outro tamanho: 401 sem rodar nada", async () => {
    for (const autorizacao of [undefined, "Bearer errado", "Bearer segredo-do-cron-de-teste-e-mais", "segredo-do-cron-de-teste"]) {
      const r = await GET(req(autorizacao));
      expect(r.status).toBe(401);
    }
    expect(chamadas.sync).toEqual([]);
    expect(chamadas.reavaliar).toEqual([]);
  });

  it("segredo certo: roda a Riot, reavalia os pendentes e devolve o resumo", async () => {
    const r = await GET(req("Bearer segredo-do-cron-de-teste"));
    expect(r.status).toBe(200);
    expect(chamadas.sync).toEqual([{ simular: false, orcamentoMs: 240_000 }]);
    expect(chamadas.reavaliar).toEqual([{ simular: false }]);
    expect(await r.json()).toMatchObject({ ok: true, promovidos: 1, congelados: 0 });
  });

  it("congela sozinho só quando a data de congelamento já passou", async () => {
    chamadas.config = { congelamento_elo: new Date(Date.now() + 86_400_000).toISOString() };
    await GET(req("Bearer segredo-do-cron-de-teste"));
    expect(chamadas.congelar).toBe(0);

    chamadas.config = { congelamento_elo: new Date(Date.now() - 1000).toISOString() };
    const r = await GET(req("Bearer segredo-do-cron-de-teste"));
    expect(chamadas.congelar).toBe(1);
    expect(await r.json()).toMatchObject({ congelados: 3 });
  });

  it("a rodada da Riot falhou: congelamento e promoção rodam mesmo assim, e a resposta acusa a falha", async () => {
    chamadas.quebrarRiot = true;
    chamadas.config = { congelamento_elo: new Date(Date.now() - 1000).toISOString() };
    const r = await GET(req("Bearer segredo-do-cron-de-teste"));
    expect(chamadas.congelar).toBe(1);
    expect(chamadas.reavaliar).toEqual([{ simular: false }]);
    expect(r.status).toBe(500);
    expect(await r.json()).toMatchObject({ ok: false, falhas: ["riot"], congelados: 3 });
  });

  it("simulação: não congela, não promove e diz quem SERIA promovido", async () => {
    chamadas.config = { congelamento_elo: new Date(Date.now() - 1000).toISOString() };
    const r = await GET(req("Bearer segredo-do-cron-de-teste", "?simular=1"));
    expect(chamadas.sync).toEqual([{ simular: true, orcamentoMs: 240_000 }]);
    expect(chamadas.congelar).toBe(0);
    expect(chamadas.reavaliar).toEqual([{ simular: true }]);
    expect(await r.json()).toMatchObject({ simular: true, promoveria: ["A#1"] });
  });
});
