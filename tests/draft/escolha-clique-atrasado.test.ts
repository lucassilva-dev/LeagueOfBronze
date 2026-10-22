import type { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { aplicarEscolha, iniciarDraft, montarDraft, type EstadoDraft, type JogadorDoDraft } from "@/lib/draft/motor";
import { MESSAGES } from "@/lib/i18n/messages";

/**
 * POST /api/draft/escolha — o clique do capitão que chega depois do prazo (DRF-05) e o
 * código que acompanha cada recusa (DRF-11).
 *
 * Serpentina com 2 times: a, b, b, a, a, b … O time b tem as escolhas 1 e 2 seguidas. O
 * capitão de b clica com o relógio quase em zero e o pedido chega 1,5 s depois do prazo.
 * Antes, o servidor dava a escolha 1 ao auto-pick e gravava o clique, calado, como a
 * escolha 2. Agora a tela manda o número da escolha que mostrava, e o clique atrasado
 * volta 409 com o quadro novo.
 */

const banco = vi.hoisted(() => ({
  draft: { estado: null as unknown, revisao: 1 },
  inscricaoDaConta: "c2" as string | null,
}));

vi.mock("@/lib/data-store", () => ({
  ConflitoDeVersaoError: class extends Error {},
  createSupabaseAdminClient: () => {
    throw new Error("sem banco no teste");
  },
  isSupabaseConfigured: () => false,
}));
vi.mock("@/lib/security/route-guard", () => ({ mesmaOrigem: () => true }));
vi.mock("@/lib/jogadores/auth", () => ({
  getJogadorIdentity: async () => ({ id: "conta", email: "x@x", displayName: "x", mustChangePassword: false }),
}));
vi.mock("@/lib/inscricoes/store", () => ({
  inscricaoIdDoJogador: async () => banco.inscricaoDaConta,
  lerConfig: async () => {
    throw new Error("não usado");
  },
  listarInscricoes: async () => [],
}));
vi.mock("@/lib/draft/store", async () => {
  const real = await vi.importActual<typeof import("@/lib/draft/store")>("@/lib/draft/store");
  return {
    ...real,
    lerDraftCompleto: async () => ({ estado: structuredClone(banco.draft.estado), revisao: banco.draft.revisao }),
    salvarDraftSeIntacto: async (estado: unknown, revisao: number) => {
      if (revisao !== banco.draft.revisao) return false;
      banco.draft = { estado: structuredClone(estado), revisao: revisao + 1 };
      return true;
    },
  };
});

const { POST } = await import("@/app/api/draft/escolha/route");

type Resposta = { error?: string; codigo?: string; params?: Record<string, unknown>; draft?: { escolhaAtual: number } };

function req(corpo: unknown): NextRequest {
  const texto = JSON.stringify(corpo);
  return {
    method: "POST",
    headers: new Headers({ host: "x", "sec-fetch-site": "same-origin", "content-type": "application/json" }),
    cookies: { get: () => undefined },
    text: async () => texto,
    json: async () => JSON.parse(texto) as unknown,
  } as unknown as NextRequest;
}

const T0 = Date.parse("2026-11-20T23:00:00.000Z");

function draft(): EstadoDraft {
  const j = (id: string, pontos: number): JogadorDoDraft => ({
    id,
    riotId: `${id.toUpperCase()}#BR1`,
    pontos,
    rota1: "MID",
    rota2: "TOP",
    elo: "Prata",
    timeId: null,
  });
  return montarDraft({
    times: [
      { id: "a", nome: "A", cor: "#fff", capitaoId: "c1" },
      { id: "b", nome: "B", cor: "#fff", capitaoId: "c2" },
    ],
    jogadores: [j("c1", 5), j("c2", 5), j("barato", 3), j("medio", 4), j("caro", 6), j("outro", 4), j("x1", 3), j("x2", 3)],
    jogadoresPorTime: 4,
    orcamentoPorTime: 30,
    segundosPorEscolha: 60,
  });
}

/** Escolha 0 feita pelo time a; agora é a escolha 1, do time b (que também tem a 2). */
function naViradaDaSerpentina(): EstadoDraft {
  return aplicarEscolha(iniciarDraft(draft(), T0), "a", "outro", T0 + 5_000);
}

function noRelogio(ms: number) {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(ms);
}

afterEach(() => vi.useRealTimers());

describe("DRF-05 · o clique que chega depois do prazo", () => {
  it("na virada da serpentina, NÃO vira a escolha seguinte do mesmo time", async () => {
    const e = naViradaDaSerpentina();
    banco.draft = { estado: e, revisao: 7 };
    banco.inscricaoDaConta = "c2";
    noRelogio(Date.parse(e.prazoISO!) + 1_500);

    // A tela mostrava a escolha 1 quando o capitão clicou.
    const r = await POST(req({ jogadorId: "caro", escolha: 1 }));
    expect(r.status).toBe(409);
    const corpo = (await r.json()) as Resposta;
    expect(corpo.codigo).toBe("vez_passou");
    // O quadro novo vai junto: a 1 já foi automática, e agora é a 2 do mesmo time.
    expect(corpo.draft?.escolhaAtual).toBe(2);
    // Nada gravado em nome do capitão: o "caro" continua livre.
    expect(banco.draft.revisao).toBe(7);
    const salvo = banco.draft.estado as EstadoDraft;
    expect(salvo.jogadores.find((j) => j.id === "caro")!.timeId).toBeNull();
  });

  it("com o número certo, a escolha da vez continua entrando", async () => {
    const e = naViradaDaSerpentina();
    banco.draft = { estado: e, revisao: 7 };
    banco.inscricaoDaConta = "c2";
    noRelogio(Date.parse(e.prazoISO!) - 10_000);

    const r = await POST(req({ jogadorId: "caro", escolha: 1 }));
    expect(r.status).toBe(200);
    const salvo = banco.draft.estado as EstadoDraft;
    expect(salvo.historico.at(-1)).toMatchObject({ escolha: 1, timeId: "b", jogadorId: "caro", automatica: false });
  });

  it("depois do auto-pick, a escolha 2 (que a tela já mostra) entra normalmente", async () => {
    const e = naViradaDaSerpentina();
    banco.draft = { estado: e, revisao: 7 };
    banco.inscricaoDaConta = "c2";
    noRelogio(Date.parse(e.prazoISO!) + 1_500);

    // A tela recebeu o quadro novo (escolha 2) e o capitão escolhe de novo, sabendo.
    const r = await POST(req({ jogadorId: "caro", escolha: 2 }));
    expect(r.status).toBe(200);
    const salvo = banco.draft.estado as EstadoDraft;
    expect(salvo.historico.map((h) => [h.escolha, h.timeId, h.automatica])).toEqual([
      [0, "a", false],
      [1, "b", true],
      [2, "b", false],
    ]);
  });

  it("fora da serpentina, o recado é 'o seu tempo acabou', não 'não é a vez do seu time'", async () => {
    // Escolha 0 é do time a; o capitão de a clica (tela antiga, sem número) 1,5 s depois.
    const e = iniciarDraft(draft(), T0);
    banco.draft = { estado: e, revisao: 3 };
    banco.inscricaoDaConta = "c1";
    noRelogio(Date.parse(e.prazoISO!) + 1_500);

    const r = await POST(req({ jogadorId: "caro" }));
    expect(r.status).toBe(409);
    const corpo = (await r.json()) as Resposta;
    expect(corpo.codigo).toBe("vez_passou");
    expect(corpo.error).not.toBe("Não é a vez do seu time.");
  });

  it("quem nunca esteve na vez continua ouvindo 'não é a vez do seu time'", async () => {
    // Escolha 0 é do time a, ainda no prazo; o capitão de b tenta escolher.
    const e = iniciarDraft(draft(), T0);
    banco.draft = { estado: e, revisao: 3 };
    banco.inscricaoDaConta = "c2";
    noRelogio(T0 + 10_000);

    const r = await POST(req({ jogadorId: "caro", escolha: 0 }));
    expect(r.status).toBe(409);
    const corpo = (await r.json()) as Resposta;
    expect(corpo.codigo).toBe("nao_e_a_vez");
    expect(corpo.error).toBe("Não é a vez do seu time.");
  });
});

describe("DRF-11 · toda recusa leva um código que a tela traduz", () => {
  it("acima do teto: código e números para o recado no idioma do capitão", async () => {
    // O time a gastou quase tudo: 5 (capitão) + 20 = 25 de 30, com 2 vagas abertas.
    const e = iniciarDraft(
      montarDraft({
        times: [
          { id: "a", nome: "A", cor: "#fff", capitaoId: "c1" },
          { id: "b", nome: "B", cor: "#fff", capitaoId: "c2" },
        ],
        jogadores: [
          { id: "c1", riotId: "C1#BR1", pontos: 5, rota1: "MID", rota2: "TOP", elo: "Prata", timeId: null },
          { id: "c2", riotId: "C2#BR1", pontos: 5, rota1: "MID", rota2: "TOP", elo: "Prata", timeId: null },
          { id: "caro", riotId: "CARO#BR1", pontos: 9, rota1: "MID", rota2: "TOP", elo: "Prata", timeId: null },
          { id: "p1", riotId: "P1#BR1", pontos: 1, rota1: "MID", rota2: "TOP", elo: "Prata", timeId: null },
          { id: "p2", riotId: "P2#BR1", pontos: 1, rota1: "MID", rota2: "TOP", elo: "Prata", timeId: null },
          { id: "p3", riotId: "P3#BR1", pontos: 1, rota1: "MID", rota2: "TOP", elo: "Prata", timeId: null },
        ],
        jogadoresPorTime: 3,
        orcamentoPorTime: 12,
        segundosPorEscolha: 60,
      }),
      T0,
    );
    banco.draft = { estado: e, revisao: 2 };
    banco.inscricaoDaConta = "c1";
    noRelogio(T0 + 5_000);

    const r = await POST(req({ jogadorId: "caro", escolha: 0 }));
    expect(r.status).toBe(409);
    const corpo = (await r.json()) as Resposta;
    // Teto = 12 − 5 − (2 − 1) = 6.
    expect(corpo.codigo).toBe("acima_do_teto");
    expect(corpo.params).toEqual({ pontos: 9, teto: 6 });
    // O texto em português continua indo, para quem não conhece o código.
    expect(corpo.error).toContain("custa 9");
    // E o código tem tradução nos dois idiomas.
    expect(MESSAGES.en.draft.erros.acima_do_teto).toContain("{teto}");
  });

  it("conta sem inscrição e quem não capitaneia também levam código", async () => {
    banco.draft = { estado: iniciarDraft(draft(), T0), revisao: 1 };
    noRelogio(T0 + 1_000);

    banco.inscricaoDaConta = null;
    const semInscricao = (await (await POST(req({ jogadorId: "caro", escolha: 0 }))).json()) as Resposta;
    expect(semInscricao.codigo).toBe("sem_inscricao");

    banco.inscricaoDaConta = "x1";
    const naoCapitao = (await (await POST(req({ jogadorId: "caro", escolha: 0 }))).json()) as Resposta;
    expect(naoCapitao.codigo).toBe("nao_e_capitao");
  });
});
