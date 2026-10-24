import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { alcancarORelogio, iniciarDraft, montarDraft, type EstadoDraft, type JogadorDoDraft } from "@/lib/draft/motor";
import { identidadeDoTime } from "@/lib/draft/times";
import type { TournamentDataset } from "@/lib/schema";
import { calendarioDe8TimesDeTeste } from "@/tests/_calendarios";

/**
 * A rota da mesa do draft: as travas da virada e do calendário, e a escolha feita pela
 * organização. Banco, guarda e auditoria são simulados; o motor e a virada são os reais.
 */

/*
 * A grade do calendário, trocável por caso: a de 8 times de teste (o formato que o
 * calendário de verdade vai ter) ou "a divulgar" (o estado do arquivo oficial desde
 * 2026-10-22). O getter faz lib/calendario-4a.ts ler a grade da vez a cada chamada.
 */
// Começa "a divulgar" (é o que a carga do módulo lê); cada caso põe a grade que quer.
const grade = vi.hoisted(() => ({ atual: { divulgado: false, times: 8 } as unknown }));
vi.mock("@/lib/calendario-4a-grade", () => ({
  get CALENDARIO_OFICIAL_4A() {
    return grade.atual;
  },
}));

const banco = vi.hoisted(() => ({
  dataset: null as unknown,
  versao: 4,
  salvos: [] as { dataset: unknown; opcoes: unknown }[],
  draft: { estado: null as unknown, revisao: 1 },
  auditoria: [] as { acao: string; detalhe?: unknown }[],
}));

class ConflitoFake extends Error {
  constructor() {
    super("conflito");
    this.name = "ConflitoDeVersaoError";
  }
}

vi.mock("@/lib/data-store", () => ({
  readDatasetComVersao: async () => ({ dataset: structuredClone(banco.dataset), versao: banco.versao }),
  saveDataset: async (dataset: unknown, opcoes: unknown) => {
    banco.salvos.push({ dataset, opcoes });
    banco.dataset = dataset;
    return dataset;
  },
  ConflitoDeVersaoError: ConflitoFake,
  createSupabaseAdminClient: () => {
    throw new Error("sem banco no teste");
  },
}));
vi.mock("@/lib/security/route-guard", () => ({
  mesmaOrigem: () => true,
  requireAdmin: async () => ({ ok: true, identity: { username: "lucas", isMaster: true, scopes: [] } }),
}));
vi.mock("@/lib/inscricoes/store", () => ({
  registrarAuditoria: async (r: { acao: string; detalhe?: unknown }) => {
    banco.auditoria.push(r);
  },
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
      banco.draft = { estado, revisao: revisao + 1 };
      return true;
    },
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

/** Draft de N times de 2 (capitão + 1), já encerrado — o bastante para virar e criar o calendário. */
function draftEncerrado(n = 8): EstadoDraft {
  const jogadores: JogadorDoDraft[] = Array.from({ length: 2 * n }, (_, i) => ({
    id: `i${i}`,
    riotId: `Jog${i}#BR1`,
    pontos: 3,
    rota1: "MID",
    rota2: "TOP",
    elo: "Prata",
    timeId: null,
  }));
  let e = montarDraft({
    times: Array.from({ length: n }, (_, i) => ({ id: `time-${i + 1}`, ...identidadeDoTime(i), capitaoId: `i${i}` })),
    jogadores,
    jogadoresPorTime: 2,
    orcamentoPorTime: 10,
    segundosPorEscolha: 60,
  });
  e = iniciarDraft(e, Date.parse("2026-11-15T20:00:00Z"));
  // N escolhas (uma por time), todas pelo relógio: o auto-pick leva o mais barato válido.
  // Uma por vez — com mais de uma escolha de atraso o draft pausa (decisão C3).
  for (let k = 1; k <= n; k++) e = alcancarORelogio(e, Date.parse("2026-11-15T20:00:00Z") + k * 60_000 + 1);
  expect(e.fase).toBe("encerrado");
  return e;
}

function datasetAberto(teams: TournamentDataset["teams"], series: TournamentDataset["seriesMatches"] = []): TournamentDataset {
  return {
    tournament: { name: "4ª Edição", lastUpdatedISO: "2026-11-15T00:00:00.000Z", seriesPointsRule: { win: 3, loss: 0 }, format: "BO3", seasonId: "s4", status: "active" },
    teams,
    players: [],
    seriesMatches: series,
    standingsSeed: [],
  } as unknown as TournamentDataset;
}

beforeEach(() => {
  grade.atual = calendarioDe8TimesDeTeste();
  banco.salvos = [];
  banco.auditoria = [];
  banco.versao = 4;
  banco.draft = { estado: null, revisao: 1 };
});

describe("virada", () => {
  it("recusa aplicar o draft numa temporada encerrada (a 3ª, arquivada)", async () => {
    banco.draft = { estado: draftEncerrado(), revisao: 1 };
    banco.dataset = { ...datasetAberto([]), tournament: { ...datasetAberto([]).tournament, status: "finished" } };
    const r = await POST(req({ acao: "virar" }));
    expect(r.status).toBe(409);
    expect(((await r.json()) as { error: string }).error).toContain("inicie a 4ª Edição");
    expect(banco.salvos).toHaveLength(0);
  });
});

describe("calendário da 4ª", () => {
  it("com as datas a divulgar, recusa antes de tudo e diz por quê — nada é gravado", async () => {
    grade.atual = { divulgado: false, times: 8 };
    banco.draft = { estado: draftEncerrado(), revisao: 1 };
    banco.dataset = datasetAberto([]);
    const virada = await POST(req({ acao: "virar" }));
    expect(virada.status).toBe(200);
    const salvosAntes = banco.salvos.length;

    const r = await POST(req({ acao: "calendario" }));
    expect(r.status).toBe(409);
    const corpo = (await r.json()) as { error: string; semCalendario?: boolean };
    expect(corpo.semCalendario).toBe(true);
    expect(corpo.error).toContain("O calendário de 8 times ainda não foi definido");
    expect(corpo.error).toContain("28 séries da fase de pontos");
    expect(banco.salvos).toHaveLength(salvosAntes);
    expect((banco.dataset as TournamentDataset).seriesMatches).toHaveLength(0);
  });

  it("com um draft de 6 times e o calendário de 8, recusa e manda criar as séries à mão", async () => {
    banco.draft = { estado: draftEncerrado(6), revisao: 1 };
    banco.dataset = datasetAberto([]);
    expect((await POST(req({ acao: "virar" }))).status).toBe(200);
    const r = await POST(req({ acao: "calendario" }));
    expect(r.status).toBe(409);
    expect(((await r.json()) as { error: string }).error).toContain("O calendário da 4ª é de 8 times, e há 6 no ar.");
  });

  it("sem draft, recusa", async () => {
    banco.dataset = datasetAberto([]);
    const r = await POST(req({ acao: "calendario" }));
    expect(r.status).toBe(409);
  });

  it("recusa com os times da 3ª no ar (antes da virada)", async () => {
    banco.draft = { estado: draftEncerrado(), revisao: 1 };
    banco.dataset = datasetAberto(
      ["pantera", "vanguarda", "presas", "time4", "capangas", "lgtv"].map((id) => ({ id, name: id, slug: id })),
    );
    const r = await POST(req({ acao: "calendario" }));
    expect(r.status).toBe(409);
    expect(((await r.json()) as { error: string }).error).toContain("não são os deste draft");
    expect(banco.salvos).toHaveLength(0);
  });

  it("depois da virada, com a grade de 8 times: sorteia as posições e cria as 28 séries com data, uma vez só", async () => {
    banco.draft = { estado: draftEncerrado(), revisao: 1 };
    banco.dataset = datasetAberto([]);
    const virada = await POST(req({ acao: "virar" }));
    expect(virada.status).toBe(200);
    const times = (banco.dataset as TournamentDataset).teams.map((t) => t.id);
    expect(times).toHaveLength(8);

    const r = await POST(req({ acao: "calendario" }));
    expect(r.status).toBe(200);
    const corpo = (await r.json()) as { posicoes: { posicao: number; teamId: string }[]; semente: string; series: number };
    expect(corpo.posicoes.map((p) => p.posicao)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect([...corpo.posicoes.map((p) => p.teamId)].sort()).toEqual([...times].sort());
    expect(corpo.series).toBe(28);

    const series = (banco.dataset as TournamentDataset).seriesMatches;
    expect(series).toHaveLength(28);
    const primeiro = calendarioDe8TimesDeTeste().slots.find((s) => s.tipo === "pontos")!;
    expect(series[0]!.date).toBe(primeiro.quando);
    // A 1ª série é o 1º confronto da grade (Time 1 x Time 8), com os times sorteados.
    const [a, b] = primeiro.confronto!;
    expect([series[0]!.teamAId, series[0]!.teamBId]).toEqual([corpo.posicoes[a - 1]!.teamId, corpo.posicoes[b - 1]!.teamId]);
    const jogos = new Map<string, number>();
    for (const s of series) for (const t of [s.teamAId, s.teamBId]) jogos.set(t, (jogos.get(t) ?? 0) + 1);
    expect([...jogos.values()]).toEqual(Array(8).fill(7));
    // Gravou com a trava de versão, e a semente foi para a auditoria.
    expect(banco.salvos.at(-1)!.opcoes).toMatchObject({ versaoEsperada: 4 });
    expect(banco.auditoria.find((a) => a.acao === "calendario_sorteado")?.detalhe).toMatchObject({ semente: corpo.semente });

    // Segunda vez: já há séries, recusa em vez de duplicar.
    const deNovo = await POST(req({ acao: "calendario" }));
    expect(deNovo.status).toBe(409);
    expect((banco.dataset as TournamentDataset).seriesMatches).toHaveLength(28);
  });

  /*
   * 24/10/2026: o time definido pela organização é o Time 1 do calendário. O sorteio das posições
   * é só dos outros 7 (do 2 ao 8), em qualquer posição em que o time definido tenha saído no
   * sorteio do draft.
   */
  it("o time definido pela organização fica fixo no Time 1; os outros 7 são sorteados do 2 ao 8", async () => {
    const n = 8;
    for (const posicaoDoDefinido of [0, 3, 7]) {
      const jogadores: JogadorDoDraft[] = Array.from({ length: 2 * n }, (_, i) => ({
        id: `i${i}`,
        riotId: `Jog${i}#BR1`,
        pontos: i === n + posicaoDoDefinido ? 0 : 3,
        rota1: "MID",
        rota2: "TOP",
        elo: "Prata",
        timeId: null,
      }));
      const times = Array.from({ length: n }, (_, i) => ({
        id: `time-${i + 1}`,
        ...identidadeDoTime(i),
        capitaoId: `i${i}`,
        ...(i === posicaoDoDefinido ? { elencoDefinido: [`i${i}`, `i${n + i}`] } : {}),
      }));
      let e = montarDraft({ times, jogadores, jogadoresPorTime: 2, orcamentoPorTime: 10, segundosPorEscolha: 60 });
      expect(e.ordem).toHaveLength(n - 1);
      e = iniciarDraft(e, Date.parse("2026-11-15T20:00:00Z"));
      for (let k = 1; k < n; k++) e = alcancarORelogio(e, Date.parse("2026-11-15T20:00:00Z") + k * 60_000 + 1);
      expect(e.fase).toBe("encerrado");

      banco.draft = { estado: e, revisao: 1 };
      banco.dataset = datasetAberto([]);
      expect((await POST(req({ acao: "virar" }))).status).toBe(200);
      const idDoDefinido = (banco.dataset as TournamentDataset).teams[posicaoDoDefinido]!.id;

      const r = await POST(req({ acao: "calendario" }));
      expect(r.status).toBe(200);
      const corpo = (await r.json()) as { posicoes: { posicao: number; teamId: string }[] };
      expect(corpo.posicoes[0]).toMatchObject({ posicao: 1, teamId: idDoDefinido });
      expect(new Set(corpo.posicoes.map((p) => p.teamId)).size).toBe(8);
      expect(banco.auditoria.at(-1)?.detalhe).toMatchObject({ fixoNoTime1: idDoDefinido });
    }
  });
});

describe("escolher pelo time da vez", () => {
  function draftRodando() {
    const jogadores: JogadorDoDraft[] = [
      { id: "ca", riotId: "CapA#BR1", pontos: 5, rota1: "MID", rota2: "TOP", elo: "Platina", timeId: null },
      { id: "cb", riotId: "CapB#BR1", pontos: 5, rota1: "MID", rota2: "TOP", elo: "Platina", timeId: null },
      { id: "x", riotId: "X#BR1", pontos: 3, rota1: "ADC", rota2: "SUP", elo: "Prata", timeId: null },
      { id: "y", riotId: "Y#BR1", pontos: 3, rota1: "ADC", rota2: "SUP", elo: "Prata", timeId: null },
    ];
    return iniciarDraft(
      montarDraft({
        times: [
          { id: "a", nome: "A", cor: "#fff", capitaoId: "ca" },
          { id: "b", nome: "B", cor: "#fff", capitaoId: "cb" },
        ],
        jogadores,
        jogadoresPorTime: 2,
        orcamentoPorTime: 10,
        segundosPorEscolha: 600,
      }),
      Date.now(),
    );
  }

  it("escolhe para o time da vez que a tela confirmou, e audita", async () => {
    banco.draft = { estado: draftRodando(), revisao: 1 };
    const r = await POST(req({ acao: "escolher", jogadorId: "x", timeId: "a", escolha: 0 }));
    expect(r.status).toBe(200);
    const estado = banco.draft.estado as EstadoDraft;
    expect(estado.jogadores.find((j) => j.id === "x")?.timeId).toBe("a");
    expect(banco.auditoria.at(-1)).toMatchObject({ acao: "draft_escolha_pela_organizacao", detalhe: { timeId: "a", jogadorId: "x" } });
  });

  it("se a vez mudou entre a tela e o servidor, recusa em vez de dar o jogador ao time seguinte", async () => {
    // A tela mostrava a vez de "a" (escolha 0); o relógio virou e agora é a de "b".
    const e = draftRodando();
    const virou = { ...e, escolhaAtual: 1 };
    banco.draft = { estado: virou, revisao: 1 };
    const r = await POST(req({ acao: "escolher", jogadorId: "x", timeId: "a", escolha: 0 }));
    expect(r.status).toBe(409);
    expect(((await r.json()) as { error: string }).error).toContain("A vez mudou");
    expect((banco.draft.estado as EstadoDraft).jogadores.find((j) => j.id === "x")?.timeId).toBeNull();
    // Sem dizer a vez, também não escolhe.
    const semVez = await POST(req({ acao: "escolher", jogadorId: "x" }));
    expect(semVez.status).toBe(409);
  });

  it("recusa jogador que já foi escolhido", async () => {
    const e = draftRodando();
    banco.draft = { estado: { ...e, jogadores: e.jogadores.map((j) => (j.id === "x" ? { ...j, timeId: "b" } : j)) }, revisao: 1 };
    const r = await POST(req({ acao: "escolher", jogadorId: "x", timeId: "a", escolha: 0 }));
    expect(r.status).toBe(409);
  });
});
