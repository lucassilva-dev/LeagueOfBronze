import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { montarDraft, type EstadoDraft } from "@/lib/draft/motor";

/**
 * DRF-10 (residual) — a sondagem do draft também renova a sessão do jogador.
 *
 * A renovação deslizante (`renovarCookieDeJogador`) já acontecia em /api/sessao, que o
 * cabeçalho chama a cada página carregada. Mas o capitão que deixou o /capitao aberto desde
 * o login, sete dias antes, não navega: só a sondagem de 2 s (/api/draft/estado) fala com o
 * servidor. A sessão vencia no meio do draft, a tela trocava pelo "entre na sua conta" e a
 * vez dele ia para o cronômetro.
 *
 * Agora, com a identidade conferida, a sondagem chama a mesma renovação e regrava o cookie
 * quando ela devolve algo (a função só faz isso com token de mais de 1 dia).
 */

const cenario = vi.hoisted(() => ({
  identidade: null as { id: string } | null,
  renovado: null as { name: string; value: string; maxAge: number } | null,
  tokensRenovados: [] as (string | undefined)[],
  estado: null as unknown,
}));

vi.mock("@/lib/data-store", () => ({
  ConflitoDeVersaoError: class extends Error {},
  createSupabaseAdminClient: () => {
    throw new Error("sem banco no teste");
  },
  isSupabaseConfigured: () => false,
}));
vi.mock("@/lib/jogadores/auth", () => ({
  JOGADOR_COOKIE: "lob_jogador",
  identidadePorToken: async () => cenario.identidade,
  renovarCookieDeJogador: async (token: string | undefined) => {
    cenario.tokensRenovados.push(token);
    return cenario.renovado;
  },
  atributosDoCookie: (maxAge: number) => ({ httpOnly: true, sameSite: "strict" as const, secure: false, path: "/", maxAge }),
}));
vi.mock("@/lib/inscricoes/store", () => ({
  inscricaoIdDoJogador: async () => "insc-capitao",
  lerConfig: async () => {
    throw new Error("não usado");
  },
  listarInscricoes: async () => [],
}));
vi.mock("@/lib/draft/store", async () => {
  const real = await vi.importActual<typeof import("@/lib/draft/store")>("@/lib/draft/store");
  return {
    ...real,
    lerDraftCompleto: async () => ({ estado: structuredClone(cenario.estado), revisao: 4 }),
    salvarDraftSeIntacto: async () => true,
  };
});

const { GET } = await import("@/app/api/draft/estado/route");

function req(token: string | undefined): NextRequest {
  return { cookies: { get: () => (token ? { value: token } : undefined) } } as unknown as NextRequest;
}

function sorteado(): EstadoDraft {
  return montarDraft({
    times: [{ id: "a", nome: "A", cor: "#fff", capitaoId: "insc-capitao" }],
    jogadores: [
      { id: "insc-capitao", riotId: "Cap#BR1", pontos: 5, rota1: "MID", rota2: "TOP", elo: "Prata", timeId: null },
      { id: "p1", riotId: "P1#BR1", pontos: 3, rota1: "MID", rota2: "TOP", elo: "Prata", timeId: null },
    ],
    jogadoresPorTime: 2,
    orcamentoPorTime: 10,
    segundosPorEscolha: 60,
  });
}

beforeEach(() => {
  cenario.estado = sorteado();
  cenario.identidade = null;
  cenario.renovado = null;
  cenario.tokensRenovados = [];
});

describe("DRF-10 · a sondagem do draft renova a sessão do capitão", () => {
  it("token com mais de 1 dia: a resposta regrava o cookie, com os atributos de sempre", async () => {
    cenario.identidade = { id: "conta" };
    cenario.renovado = { name: "lob_jogador", value: "token-reassinado", maxAge: 604_800 };

    const r = await GET(req("token-velho"));
    expect(r.status).toBe(200);
    expect(cenario.tokensRenovados).toEqual(["token-velho"]);
    expect(r.cookies.get("lob_jogador")?.value).toBe("token-reassinado");
    const setCookie = r.headers.get("set-cookie") ?? "";
    expect(setCookie).toMatch(/HttpOnly/i);
    expect(setCookie).toMatch(/SameSite=strict/i);
    expect(setCookie).toMatch(/Path=\//);
    expect(setCookie).toMatch(/Max-Age=604800/);
    // E o resto da resposta continua o mesmo.
    expect(await r.json()).toMatchObject({ souCapitaoDe: "a", logado: true });
  });

  it("token novo (a função não renova): nenhum cookie na resposta", async () => {
    cenario.identidade = { id: "conta" };
    const r = await GET(req("token-de-hoje"));
    expect(cenario.tokensRenovados).toEqual(["token-de-hoje"]);
    expect(r.headers.get("set-cookie")).toBeNull();
  });

  it("sem identidade válida, nem tenta renovar (espectador da TV, sessão revogada)", async () => {
    cenario.renovado = { name: "lob_jogador", value: "nao-devia", maxAge: 604_800 };
    const r = await GET(req("token-revogado"));
    expect(cenario.tokensRenovados).toEqual([]);
    expect(r.headers.get("set-cookie")).toBeNull();
    expect(await r.json()).toMatchObject({ logado: false });
  });
});
