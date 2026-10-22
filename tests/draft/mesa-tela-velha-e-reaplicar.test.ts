import type { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  aplicarEscolha,
  iniciarDraft,
  montarDraft,
  pausarDraft,
  type EstadoDraft,
  type JogadorDoDraft,
} from "@/lib/draft/motor";
import { identidadeDoTime } from "@/lib/draft/times";
import type { TournamentDataset } from "@/lib/schema";

/**
 * A mesa do draft com DUAS pessoas conduzindo (DRF-02) e a reaplicação da virada (DRF-04).
 *
 * DRF-02: um painel carregado antes do sorteio (ou do início) do colega continuava
 * oferecendo «Sortear» e «Iniciar». O clique refazia o sorteio que a TV acabara de animar,
 * retomava uma pausa da organização ou dava o prazo cheio a um time com o tempo vencido.
 * Agora a tela manda o sorteio que viu e o servidor recusa com 409 se não for o de agora;
 * «iniciar» só vale antes do apito.
 *
 * DRF-04: reaplicar a virada trocava times e jogadores inteiros e apagava, calado, a foto
 * e o nome editados depois. Agora pede confirmação explícita no corpo.
 */

const banco = vi.hoisted(() => ({
  draft: { estado: null as unknown, revisao: 1 },
  dataset: null as unknown,
  versao: 1,
  proximaSemente: "S2",
}));

vi.mock("@/lib/data-store", () => ({
  readDatasetComVersao: async () => ({ dataset: structuredClone(banco.dataset), versao: banco.versao }),
  saveDataset: async (ds: unknown) => {
    banco.dataset = structuredClone(ds);
    banco.versao++;
    return ds;
  },
  ConflitoDeVersaoError: class extends Error {},
  createSupabaseAdminClient: () => {
    throw new Error("sem banco no teste");
  },
}));
vi.mock("@/lib/security/route-guard", () => ({
  mesmaOrigem: () => true,
  requireAdmin: async () => ({ ok: true, identity: { username: "nakay", isMaster: false, scopes: ["draft:conduzir"] } }),
}));
vi.mock("@/lib/inscricoes/store", () => ({
  registrarAuditoria: async () => undefined,
  lerConfig: async () => {
    throw new Error("não usado");
  },
  // Todos do draft seguem aptos: com alguém fora, a virada pede uma confirmação a mais
  // (DRF-03, fora-do-draft.test.ts) — não é o que estes testes exercitam.
  listarInscricoes: async () =>
    ((banco.draft.estado as { jogadores?: { id: string }[] } | null)?.jogadores ?? []).map((j) => ({
      id: j.id,
      situacao: "apto",
    })),
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
    // O sorteio novo: só a semente importa aqui.
    montarDraftDosAprovados: async () => ({
      ...pequeno(),
      sorteio: { semente: banco.proximaSemente, capitaes: ["c1", "c2"], emISO: "2026-11-20T23:00:00Z" },
    }),
  };
});

const { POST } = await import("@/app/api/admin/draft/route");

function req(corpo: unknown): NextRequest {
  const texto = JSON.stringify(corpo);
  return {
    method: "POST",
    headers: new Headers({ host: "x", "sec-fetch-site": "same-origin", "content-type": "application/json" }),
    text: async () => texto,
    json: async () => JSON.parse(texto) as unknown,
  } as unknown as NextRequest;
}

const T0 = Date.parse("2026-11-20T23:00:00.000Z");

function pequeno(): EstadoDraft {
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
    jogadores: [j("c1", 5), j("c2", 5), j("p1", 3), j("p2", 3), j("p3", 3), j("p4", 3)],
    jogadoresPorTime: 3,
    orcamentoPorTime: 20,
    segundosPorEscolha: 60,
  });
}

/** O draft com o sorteio S1, do jeito que a montagem grava. */
function sorteado(semente = "S1"): EstadoDraft {
  return { ...pequeno(), sorteio: { semente, capitaes: ["c1", "c2"], emISO: "2026-11-20T22:00:00Z" } };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("DRF-02 · «Sortear» de um painel que não viu o sorteio do colega", () => {
  it("painel sem draft na tela não refaz o sorteio que já está no ar", async () => {
    banco.draft = { estado: sorteado("S1"), revisao: 3 };
    banco.proximaSemente = "S2";
    const r = await POST(req({ acao: "montar", metodo: "maior_elo", sorteioVisto: null }));
    expect(r.status).toBe(409);
    expect(((await r.json()) as { desatualizado?: boolean }).desatualizado).toBe(true);
    expect((banco.draft.estado as EstadoDraft).sorteio?.semente).toBe("S1");
    expect(banco.draft.revisao).toBe(3);
  });

  it("cliente que não diz o que viu também é recusado com um sorteio no ar", async () => {
    banco.draft = { estado: sorteado("S1"), revisao: 3 };
    const r = await POST(req({ acao: "montar", metodo: "maior_elo" }));
    expect(r.status).toBe(409);
    expect((banco.draft.estado as EstadoDraft).sorteio?.semente).toBe("S1");
  });

  it("a confirmação de descarte vale só para o sorteio que a tela mostrava", async () => {
    // A tela viu o S1 rodando e marcou «descartar»; nesse meio-tempo o colega sorteou o S3.
    banco.draft = { estado: sorteado("S3"), revisao: 8 };
    const r = await POST(req({ acao: "montar", metodo: "maior_elo", sorteioVisto: "S1", confirmoDescartar: true }));
    expect(r.status).toBe(409);
    expect((banco.draft.estado as EstadoDraft).sorteio?.semente).toBe("S3");
  });

  it("sortear de novo, vendo o sorteio de agora, continua funcionando", async () => {
    banco.draft = { estado: sorteado("S1"), revisao: 3 };
    banco.proximaSemente = "S2";
    const r = await POST(req({ acao: "montar", metodo: "maior_elo", sorteioVisto: "S1" }));
    expect(r.status).toBe(200);
    expect((banco.draft.estado as EstadoDraft).sorteio?.semente).toBe("S2");
  });

  it("primeiro sorteio, sem draft nenhum, continua funcionando", async () => {
    banco.draft = { estado: null, revisao: 0 };
    banco.proximaSemente = "S1";
    const r = await POST(req({ acao: "montar", metodo: "maior_elo", sorteioVisto: null }));
    expect(r.status).toBe(200);
    expect((banco.draft.estado as EstadoDraft).sorteio?.semente).toBe("S1");
  });

  it("draft rodando ainda exige a confirmação de descarte", async () => {
    banco.draft = { estado: iniciarDraft(sorteado("S1"), T0), revisao: 5 };
    const r = await POST(req({ acao: "montar", metodo: "maior_elo", sorteioVisto: "S1" }));
    expect(r.status).toBe(409);
    expect(((await r.json()) as { precisaConfirmar?: boolean }).precisaConfirmar).toBe(true);
  });
});

describe("DRF-02 · «Iniciar» de um painel velho", () => {
  it("com o draft PAUSADO pela organização, não retoma o relógio", async () => {
    const pausado = pausarDraft(iniciarDraft(sorteado("S1"), T0));
    banco.draft = { estado: pausado, revisao: 5 };
    const r = await POST(req({ acao: "iniciar", sorteioVisto: "S1" }));
    expect(r.status).toBe(409);
    expect((banco.draft.estado as EstadoDraft).fase).toBe("pausado");
    expect(banco.draft.revisao).toBe(5);
  });

  it("com o draft RODANDO e o prazo vencido, não devolve o prazo cheio ao time", async () => {
    const rodando = iniciarDraft(sorteado("S1"), T0);
    banco.draft = { estado: rodando, revisao: 5 };
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(Date.parse(rodando.prazoISO!) + 15_000);
    const r = await POST(req({ acao: "iniciar", sorteioVisto: "S1" }));
    expect(r.status).toBe(409);
    expect((banco.draft.estado as EstadoDraft).prazoISO).toBe(rodando.prazoISO);
    expect(banco.draft.revisao).toBe(5);
  });

  it("com o draft ENCERRADO, responde 409 com recado em vez de 500", async () => {
    let e = iniciarDraft(sorteado("S1"), T0);
    e = aplicarEscolha(e, "a", "p1", T0 + 1000);
    e = aplicarEscolha(e, "b", "p2", T0 + 2000);
    e = aplicarEscolha(e, "b", "p3", T0 + 3000);
    e = aplicarEscolha(e, "a", "p4", T0 + 4000);
    expect(e.fase).toBe("encerrado");
    banco.draft = { estado: e, revisao: 9 };
    const r = await POST(req({ acao: "iniciar", sorteioVisto: "S1" }));
    expect(r.status).toBe(409);
    expect(((await r.json()) as { error: string }).error).toContain("já terminou");
  });

  it("não inicia um sorteio que a tela não viu", async () => {
    banco.draft = { estado: sorteado("S2"), revisao: 4 };
    const r = await POST(req({ acao: "iniciar", sorteioVisto: "S1" }));
    expect(r.status).toBe(409);
    expect((banco.draft.estado as EstadoDraft).fase).toBe("preparando");
  });

  it("iniciar o sorteio que a tela vê continua funcionando", async () => {
    banco.draft = { estado: sorteado("S1"), revisao: 4 };
    const r = await POST(req({ acao: "iniciar", sorteioVisto: "S1" }));
    expect(r.status).toBe(200);
    expect((banco.draft.estado as EstadoDraft).fase).toBe("rodando");
  });
});

function draftEncerrado6(): EstadoDraft {
  const jogadores: JogadorDoDraft[] = Array.from({ length: 12 }, (_, i) => ({
    id: `j${i}`,
    riotId: `Jogador${i}#BR1`,
    pontos: 3,
    rota1: "MID",
    rota2: "TOP",
    elo: "Prata",
    timeId: null,
  }));
  let e = montarDraft({
    times: Array.from({ length: 6 }, (_, i) => ({ id: `time-${i + 1}`, ...identidadeDoTime(i), capitaoId: `j${i}` })),
    jogadores,
    jogadoresPorTime: 2,
    orcamentoPorTime: 10,
    segundosPorEscolha: 60,
  });
  e = iniciarDraft(e, T0);
  // Uma escolha por time, todas pelo relógio.
  for (const time of e.ordem) {
    const livre = e.jogadores.find((j) => j.timeId === null)!;
    e = aplicarEscolha(e, time, livre.id, T0 + 1000);
  }
  return e;
}

function datasetAtivo(): TournamentDataset {
  return {
    tournament: {
      name: "4ª Edição",
      lastUpdatedISO: "2026-11-20T00:00:00.000Z",
      seriesPointsRule: { win: 3, loss: 0 },
      format: "BO3",
      seasonId: "s4",
      status: "active",
    },
    teams: [],
    players: [],
    seriesMatches: [],
    standingsSeed: [],
  } as unknown as TournamentDataset;
}

describe("DRF-04 · reaplicar a virada", () => {
  beforeEach(() => {
    banco.draft = { estado: draftEncerrado6(), revisao: 20 };
    banco.dataset = datasetAtivo();
    banco.versao = 1;
  });

  it("a primeira aplicação não pede confirmação", async () => {
    expect((banco.draft.estado as EstadoDraft).fase).toBe("encerrado");
    const r = await POST(req({ acao: "virar" }));
    expect(r.status).toBe(200);
    expect((banco.dataset as TournamentDataset).teams).toHaveLength(6);
  });

  it("reaplicar sem confirmar recusa e NÃO apaga a foto e o nome editados depois", async () => {
    expect((await POST(req({ acao: "virar" }))).status).toBe(200);
    const ds = banco.dataset as TournamentDataset;
    ds.players[0]!.imageUrl = "/players/foto.png";
    ds.teams[0]!.name = "Os Bronzeados";
    banco.dataset = ds;
    const versaoAntes = banco.versao;

    const r = await POST(req({ acao: "virar" }));
    expect(r.status).toBe(409);
    const corpo = (await r.json()) as { error: string; precisaConfirmar?: boolean };
    expect(corpo.precisaConfirmar).toBe(true);
    expect(corpo.error).toContain("já foi aplicado");

    const depois = banco.dataset as TournamentDataset;
    expect(banco.versao).toBe(versaoAntes);
    expect(depois.players[0]!.imageUrl).toBe("/players/foto.png");
    expect(depois.teams[0]!.name).toBe("Os Bronzeados");
  });

  it("com a confirmação explícita no corpo, reaplica", async () => {
    expect((await POST(req({ acao: "virar" }))).status).toBe(200);
    const ds = banco.dataset as TournamentDataset;
    const nomeOriginal = ds.teams[0]!.name;
    ds.teams[0]!.name = "Os Bronzeados";
    banco.dataset = ds;

    const r = await POST(req({ acao: "virar", confirmoReaplicar: true }));
    expect(r.status).toBe(200);
    expect((banco.dataset as TournamentDataset).teams[0]!.name).toBe(nomeOriginal);
  });

  it("confirmação que não é exatamente `true` não vale", async () => {
    expect((await POST(req({ acao: "virar" }))).status).toBe(200);
    const r = await POST(req({ acao: "virar", confirmoReaplicar: "sim" }));
    expect(r.status).toBe(409);
  });
});
