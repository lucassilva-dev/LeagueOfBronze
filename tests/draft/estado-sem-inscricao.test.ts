import type { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

import { montarDraft, type EstadoDraft } from "@/lib/draft/motor";

/**
 * GET /api/draft/estado — conta logada SEM inscrição (DRF-13).
 *
 * O capitão que esquece a senha cria outra conta e entra no /capitao. A sondagem dava a
 * ele a mesma resposta de quem tem inscrição e não capitaneia (`souCapitaoDe: null`), e o
 * painel afirmava "Você não é capitão nesta edição": ele ia embora e as escolhas do time
 * caíam no auto-pick. Agora a resposta separa os dois casos com `semInscricao`.
 */

const cenario = vi.hoisted(() => ({
  identidade: null as { id: string } | null,
  inscricaoId: null as string | null,
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
  // Token novo: nada a renovar (a renovação tem o próprio teste, estado-renova-sessao.test.ts).
  renovarCookieDeJogador: async () => null,
  atributosDoCookie: (maxAge: number) => ({ httpOnly: true, sameSite: "strict", secure: false, path: "/", maxAge }),
}));
vi.mock("@/lib/inscricoes/store", () => ({
  inscricaoIdDoJogador: async () => cenario.inscricaoId,
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

function req(): NextRequest {
  return { cookies: { get: () => (cenario.identidade ? { value: "token" } : undefined) } } as unknown as NextRequest;
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

type Resposta = { souCapitaoDe: string | null; logado?: boolean; semInscricao?: boolean };

async function ler(): Promise<Resposta> {
  return (await (await GET(req())).json()) as Resposta;
}

describe("DRF-13 · conta logada sem inscrição", () => {
  it("logado e sem inscrição: a resposta diz isso, separado de 'não capitaneia'", async () => {
    cenario.estado = sorteado();
    cenario.identidade = { id: "conta-nova" };
    cenario.inscricaoId = null;
    const r = await ler();
    expect(r).toMatchObject({ souCapitaoDe: null, logado: true, semInscricao: true });
  });

  it("com inscrição que não capitaneia: não é 'sem inscrição'", async () => {
    cenario.estado = sorteado();
    cenario.identidade = { id: "conta" };
    cenario.inscricaoId = "insc-outro";
    expect(await ler()).toMatchObject({ souCapitaoDe: null, logado: true, semInscricao: false });
  });

  it("o capitão continua recebendo o próprio time", async () => {
    cenario.estado = sorteado();
    cenario.identidade = { id: "conta" };
    cenario.inscricaoId = "insc-capitao";
    expect(await ler()).toMatchObject({ souCapitaoDe: "a", semInscricao: false });
  });

  it("sem sessão: nem logado, nem 'sem inscrição'", async () => {
    cenario.estado = sorteado();
    cenario.identidade = null;
    cenario.inscricaoId = null;
    expect(await ler()).toMatchObject({ souCapitaoDe: null, logado: false, semInscricao: false });
  });
});
