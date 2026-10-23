import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  alcancarORelogio,
  aplicarEscolha,
  atualizarForaDoPool,
  iniciarDraft,
  montarDraft,
  type EstadoDraft,
  type JogadorDoDraft,
} from "@/lib/draft/motor";
import { identidadeDoTime } from "@/lib/draft/times";
import { jogadoresForaDoDraft, listaForaDoDraft } from "@/lib/draft/virada";
import type { TournamentDataset } from "@/lib/schema";

/**
 * DRF-03 — recusa ou desistência DEPOIS do sorteio não aparecia no draft.
 *
 * O sorteio copia os aptos para o estado do draft e, dali em diante, o draft não olha mais
 * as inscrições. Quem desistia ou era recusado depois continuava no pool (escolhível), no
 * elenco, e atravessava a virada para o site — sem a mesa saber.
 *
 * A correção é só AVISO, sem mudar regra: a prévia do painel lista quem está no draft e
 * não é mais `apto`, a mesa mostra, e a virada (que publica os times no site) inclui os
 * nomes nos problemas e só segue com `confirmoForaDoDraft: true` no corpo. O que fazer
 * além disso é decisão da organização.
 */

type InscritoFalso = { id: string; riot_id: string; situacao: string };

const banco = vi.hoisted(() => ({
  dataset: null as unknown,
  versao: 4,
  salvos: [] as unknown[],
  draft: { estado: null as unknown, revisao: 1 },
  leiturasDoDraft: 0,
  inscritos: [] as InscritoFalso[],
  auditoria: [] as { acao: string; detalhe?: unknown }[],
}));

vi.mock("@/lib/data-store", () => ({
  readDatasetComVersao: async () => ({ dataset: structuredClone(banco.dataset), versao: banco.versao }),
  saveDataset: async (dataset: unknown) => {
    banco.salvos.push(dataset);
    banco.dataset = dataset;
    return dataset;
  },
  ConflitoDeVersaoError: class extends Error {},
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
  lerConfig: async () => ({
    jogadores_por_time: 2,
    max_times: 6,
    orcamento_por_time: 10,
    segundos_por_escolha: 60,
    inscricoes_abertas: false,
    fechamento_inscricoes: null,
  }),
  // A inscrição inteira (o que `listarInscricoes` lê): elo, rotas e pontos de cada um.
  listarInscricoes: async () =>
    banco.inscritos.map((i) => ({
      ...i,
      organizador: false,
      elo_declarado: "Prata",
      elo_verificado: null,
      elo_congelado: "Prata",
      pontos: 3,
      rota_primaria: "MID",
      rota_secundaria: "TOP",
    })),
}));
vi.mock("@/lib/draft/store", async () => {
  const real = await vi.importActual<typeof import("@/lib/draft/store")>("@/lib/draft/store");
  return {
    ...real,
    lerDraftCompleto: async () => {
      banco.leiturasDoDraft++;
      return { estado: structuredClone(banco.draft.estado), revisao: banco.draft.revisao };
    },
    salvarDraftSeIntacto: async () => true,
  };
});

const { GET, POST } = await import("@/app/api/admin/draft/route");

function req(corpo?: unknown): NextRequest {
  const texto = JSON.stringify(corpo ?? {});
  return {
    method: corpo === undefined ? "GET" : "POST",
    headers: new Headers({ host: "x", "sec-fetch-site": "same-origin", "content-type": "application/json" }),
    text: async () => texto,
    json: async () => JSON.parse(texto) as unknown,
  } as unknown as NextRequest;
}

/** 6 times de 2 (capitão + 1), encerrado: o bastante para virar. */
function draftEncerrado(): EstadoDraft {
  const jogadores: JogadorDoDraft[] = Array.from({ length: 12 }, (_, i) => ({
    id: `i${i}`,
    riotId: `Jog${i}#BR1`,
    pontos: 3,
    rota1: "MID",
    rota2: "TOP",
    elo: "Prata",
    timeId: null,
  }));
  let e = montarDraft({
    times: Array.from({ length: 6 }, (_, i) => ({ id: `time-${i + 1}`, ...identidadeDoTime(i), capitaoId: `i${i}` })),
    jogadores,
    jogadoresPorTime: 2,
    orcamentoPorTime: 10,
    segundosPorEscolha: 60,
  });
  e = iniciarDraft(e, Date.parse("2026-11-15T20:00:00Z"));
  // Uma escolha por vez, com sondagem a cada prazo: atraso de mais de uma escolha inteira
  // pausa o draft (decisão C3 de 2026-10-22).
  for (let k = 1; k <= 6; k++) e = alcancarORelogio(e, Date.parse("2026-11-15T20:00:00Z") + k * 60_000 + 1);
  expect(e.fase).toBe("encerrado");
  return e;
}

function datasetAberto(): TournamentDataset {
  return {
    tournament: { name: "4ª Edição", lastUpdatedISO: "2026-11-15T00:00:00.000Z", seriesPointsRule: { win: 3, loss: 0 }, format: "BO3", seasonId: "s4", status: "active" },
    teams: [],
    players: [],
    seriesMatches: [],
    standingsSeed: [],
  } as unknown as TournamentDataset;
}

/** Todos os 12 do draft aptos, menos os que o teste mudar. */
function inscritos(mudancas: Record<string, string> = {}): InscritoFalso[] {
  return Array.from({ length: 12 }, (_, i) => ({
    id: `i${i}`,
    riot_id: `Jog${i}#BR1`,
    situacao: mudancas[`i${i}`] ?? "apto",
  }));
}

beforeEach(() => {
  banco.salvos = [];
  banco.auditoria = [];
  banco.leiturasDoDraft = 0;
  banco.draft = { estado: draftEncerrado(), revisao: 1 };
  banco.dataset = datasetAberto();
  banco.inscritos = inscritos();
});

describe("quem está no draft e não é mais apto (função pura)", () => {
  it("lista recusado, desistente, sobra, pendente e inscrição sumida; apto não entra", () => {
    const estado = draftEncerrado();
    const fora = jogadoresForaDoDraft(estado, [
      ...inscritos({ i3: "desistiu", i7: "recusado", i8: "sobra", i9: "pendente" }).filter((i) => i.id !== "i11"),
    ] as never);
    expect(fora.map((f) => ({ riotId: f.riotId, situacao: f.situacao }))).toEqual([
      { riotId: "Jog3#BR1", situacao: "desistiu" },
      { riotId: "Jog7#BR1", situacao: "recusado" },
      { riotId: "Jog8#BR1", situacao: "sobra" },
      { riotId: "Jog9#BR1", situacao: "pendente" },
      { riotId: "Jog11#BR1", situacao: "sem_inscricao" },
    ]);
    expect(listaForaDoDraft(fora.slice(0, 3))).toBe("Jog3#BR1 (desistiu), Jog7#BR1 (recusado), Jog8#BR1 (na sobra)");
    // Onde cada um está (C2): o i3 é capitão do 4º time; os outros foram escolhidos.
    expect(fora[0]).toMatchObject({ lugar: "capitao", time: estado.times[3]!.nome });
    expect(fora[1]).toMatchObject({ lugar: "elenco" });
    expect(fora.every((f) => typeof f.time === "string")).toBe(true);
  });

  it("quem ainda está no pool sai com o lugar `pool` e sem time", () => {
    const meio = montarDraft({
      times: [{ id: "time-1", ...identidadeDoTime(0), capitaoId: "i0" }],
      jogadores: [
        { id: "i0", riotId: "Jog0#BR1", pontos: 3, rota1: "MID", rota2: "TOP", elo: "Prata", timeId: null },
        { id: "i1", riotId: "Jog1#BR1", pontos: 3, rota1: "MID", rota2: "TOP", elo: "Prata", timeId: null },
      ],
      jogadoresPorTime: 2,
      orcamentoPorTime: 10,
      segundosPorEscolha: 60,
    });
    expect(jogadoresForaDoDraft(meio, inscritos({ i1: "desistiu" }) as never)).toEqual([
      { riotId: "Jog1#BR1", situacao: "desistiu", lugar: "pool" },
    ]);
  });

  it("sem draft, ou com todos aptos, a lista é vazia", () => {
    expect(jogadoresForaDoDraft(null, inscritos() as never)).toEqual([]);
    expect(jogadoresForaDoDraft(draftEncerrado(), inscritos() as never)).toEqual([]);
  });
});

describe("a prévia do painel (GET) traz a lista", () => {
  it("com um desistente depois do sorteio, `previa.foraDoDraft` diz quem e como ficou", async () => {
    banco.inscritos = inscritos({ i7: "desistiu" });
    const r = await GET(req());
    expect(r.status).toBe(200);
    const corpo = (await r.json()) as { previa: { foraDoDraft?: unknown } };
    expect(corpo.previa.foraDoDraft).toEqual([
      expect.objectContaining({ riotId: "Jog7#BR1", situacao: "desistiu", lugar: "elenco" }),
    ]);
    // Uma leitura do draft só: o GET e a prévia usam a mesma.
    expect(banco.leiturasDoDraft).toBe(1);
  });

  it("todos aptos: lista vazia", async () => {
    const corpo = (await (await GET(req())).json()) as { previa: { foraDoDraft?: unknown } };
    expect(corpo.previa.foraDoDraft).toEqual([]);
  });
});

describe("a virada com alguém fora do draft", () => {
  it("prever devolve a lista, sem virar problema que trava", async () => {
    banco.inscritos = inscritos({ i7: "recusado" });
    const r = await POST(req({ acao: "prever" }));
    expect(r.status).toBe(200);
    const corpo = (await r.json()) as { problemas: string[]; foraDoDraft: unknown };
    expect(corpo.foraDoDraft).toEqual([expect.objectContaining({ riotId: "Jog7#BR1", situacao: "recusado" })]);
    expect(corpo.problemas).toEqual([]);
  });

  it("virar SEM confirmação: 409, os nomes nos problemas, e nada gravado", async () => {
    banco.inscritos = inscritos({ i7: "desistiu", i9: "recusado" });
    const r = await POST(req({ acao: "virar" }));
    expect(r.status).toBe(409);
    const corpo = (await r.json()) as { problemas: string[]; precisaConfirmarForaDoDraft?: boolean };
    expect(corpo.precisaConfirmarForaDoDraft).toBe(true);
    expect(corpo.problemas.join(" ")).toContain("Jog7#BR1 (desistiu), Jog9#BR1 (recusado)");
    expect(banco.salvos).toHaveLength(0);
  });

  it("confirmação que não é exatamente `true` não vale", async () => {
    banco.inscritos = inscritos({ i7: "desistiu" });
    expect((await POST(req({ acao: "virar", confirmoForaDoDraft: "sim" }))).status).toBe(409);
    expect((await POST(req({ acao: "virar", confirmoForaDoDraft: 1 }))).status).toBe(409);
    expect(banco.salvos).toHaveLength(0);
  });

  it("com `confirmoForaDoDraft: true`, aplica — e a auditoria guarda quem não era mais apto", async () => {
    banco.inscritos = inscritos({ i7: "desistiu" });
    const r = await POST(req({ acao: "virar", confirmoForaDoDraft: true }));
    expect(r.status).toBe(200);
    expect(banco.salvos).toHaveLength(1);
    const virada = banco.auditoria.find((a) => a.acao === "draft_virado_para_o_dataset");
    expect(virada?.detalhe).toMatchObject({ confirmadoForaDoDraft: [{ riotId: "Jog7#BR1", situacao: "desistiu" }] });
    // C2: quem estava num elenco vai para o site com o time (a vaga é reposta depois, pela
    // saída de vez), e não como reserva.
    const salvo = banco.salvos[0] as TournamentDataset;
    const jog7 = salvo.players.find((p) => p.nick === "Jog7#BR1");
    expect(jog7?.teamId).toBeTruthy();
    expect(jog7?.reserva).toBeUndefined();
  });

  it("todos aptos: a virada segue como sempre, sem confirmação a mais", async () => {
    const r = await POST(req({ acao: "virar" }));
    expect(r.status).toBe(200);
    expect(banco.salvos).toHaveLength(1);
  });

  it("a confirmação não passa por cima de problema de verdade (draft não terminado)", async () => {
    const meio = montarDraft({
      times: [{ id: "time-1", ...identidadeDoTime(0), capitaoId: "i0" }],
      jogadores: [
        { id: "i0", riotId: "Jog0#BR1", pontos: 3, rota1: "MID", rota2: "TOP", elo: "Prata", timeId: null },
        { id: "i1", riotId: "Jog1#BR1", pontos: 3, rota1: "MID", rota2: "TOP", elo: "Prata", timeId: null },
      ],
      jogadoresPorTime: 2,
      orcamentoPorTime: 10,
      segundosPorEscolha: 60,
    });
    banco.draft = { estado: meio, revisao: 1 };
    banco.inscritos = inscritos({ i1: "desistiu" });
    const r = await POST(req({ acao: "virar", confirmoForaDoDraft: true }));
    expect(r.status).toBe(409);
    expect(((await r.json()) as { problemas: string[] }).problemas.join(" ")).toContain("não terminou");
    expect(banco.salvos).toHaveLength(0);
  });
});

/*
 * B6 (auditoria da retomada, 23/10): quem saiu do POOL depois do sorteio (C1) não é escolhido
 * e não vai para o site — nem em time, nem como reserva. A virada pedia mesmo assim a
 * confirmação «Não estão mais aptos: X. Para aplicar mesmo assim, confirme.», e a organização
 * tinha de confirmar que aplicava alguém que não estava sendo aplicado. A confirmação de C2 é
 * para quem está num ELENCO.
 */
describe("B6 · quem saiu do pool não pede a confirmação da virada", () => {
  /** O mesmo draft de 6 times de 2, mas o Jog11 desiste no meio: a ordem perde uma escolha. */
  function encerradoComSaida(): EstadoDraft {
    const T0 = Date.parse("2026-11-15T20:00:00Z");
    let e = iniciarDraft(
      montarDraft({
        times: Array.from({ length: 6 }, (_, i) => ({ id: `time-${i + 1}`, ...identidadeDoTime(i), capitaoId: `i${i}` })),
        jogadores: Array.from({ length: 12 }, (_, i) => ({
          id: `i${i}`,
          riotId: `Jog${i}#BR1`,
          pontos: 3,
          rota1: "MID",
          rota2: "TOP",
          elo: "Prata",
          timeId: null,
        })),
        jogadoresPorTime: 2,
        orcamentoPorTime: 10,
        segundosPorEscolha: 60,
      }),
      T0,
    );
    e = atualizarForaDoPool(e, new Set(["i11"]), T0);
    for (let k = 1; k <= 6 && e.fase === "rodando"; k++) e = alcancarORelogio(e, T0 + k * 60_000 + 1);
    expect(e.fase).toBe("encerrado");
    expect(e.foraDoPool).toEqual(["i11"]);
    return e;
  }

  it("função pura: quem o motor já tirou do pool não está mais «no draft»", () => {
    expect(jogadoresForaDoDraft(encerradoComSaida(), inscritos({ i11: "desistiu" }) as never)).toEqual([]);
  });

  it("virar SEM confirmação aplica — e a auditoria registra quem saiu sem ir para o site", async () => {
    banco.draft = { estado: encerradoComSaida(), revisao: 1 };
    banco.inscritos = inscritos({ i11: "desistiu" });
    const r = await POST(req({ acao: "virar" }));
    expect(r.status).toBe(200);
    const salvo = banco.salvos[0] as TournamentDataset;
    expect(salvo.players.some((p) => p.nick === "Jog11#BR1")).toBe(false);
    const virada = banco.auditoria.find((a) => a.acao === "draft_virado_para_o_dataset");
    expect(virada?.detalhe).toMatchObject({ naoAptosSemTime: ["Jog11#BR1"] });
    expect((virada?.detalhe as Record<string, unknown>).confirmadoForaDoDraft).toBeUndefined();
  });

  it("quem voltou a pendente e ficou no POOL sem escolha também não pede confirmação (vai como reserva)", async () => {
    // Soma exata 20 = 2 × 10: o L desiste, a 2ª escolha de B sai da ordem; B gasta os 10 e o L
    // volta (pendente) quando B já não cabe ninguém — o L termina o draft sem time.
    const T0 = Date.parse("2026-11-15T20:00:00Z");
    const jog = (id: string, pontos: number): JogadorDoDraft => ({
      id,
      riotId: `${id.toUpperCase()}#BR1`,
      pontos,
      rota1: "MID",
      rota2: "TOP",
      elo: "Prata",
      timeId: null,
    });
    let e = iniciarDraft(
      montarDraft({
        times: [
          { id: "time-1", ...identidadeDoTime(0), capitaoId: "ca" },
          { id: "time-2", ...identidadeDoTime(1), capitaoId: "cb" },
        ],
        jogadores: [jog("ca", 4), jog("cb", 6), jog("p2", 2), jog("p3", 3), jog("l", 1), jog("x", 4)],
        jogadoresPorTime: 3,
        orcamentoPorTime: 10,
        segundosPorEscolha: 60,
      }),
      T0,
    );
    e = atualizarForaDoPool(e, new Set(["l"]), T0);
    e = aplicarEscolha(e, "time-1", "p2", T0 + 1_000);
    e = aplicarEscolha(e, "time-2", "x", T0 + 2_000);
    e = atualizarForaDoPool(e, new Set(), T0 + 3_000);
    e = aplicarEscolha(e, "time-1", "p3", T0 + 4_000);
    expect(e.fase).toBe("encerrado");
    expect(e.jogadores.find((x) => x.id === "l")!.timeId).toBeNull();

    banco.draft = { estado: e, revisao: 1 };
    banco.inscritos = ["ca", "cb", "p2", "p3", "l", "x"].map((id) => ({
      id,
      riot_id: `${id.toUpperCase()}#BR1`,
      situacao: id === "l" ? "pendente" : "apto",
    }));
    expect(jogadoresForaDoDraft(e, banco.inscritos as never)).toEqual([{ riotId: "L#BR1", situacao: "pendente", lugar: "pool" }]);
    const r = await POST(req({ acao: "virar" }));
    expect(r.status).toBe(200);
    const salvo = banco.salvos[0] as TournamentDataset;
    expect(salvo.players.find((p) => p.nick === "L#BR1")).toMatchObject({ reserva: true });
    const virada = banco.auditoria.find((a) => a.acao === "draft_virado_para_o_dataset");
    expect(virada?.detalhe).toMatchObject({ naoAptosSemTime: ["L#BR1"] });
  });

  it("com alguém do elenco também fora: 409 só com o do elenco, e a confirmação aplica", async () => {
    banco.draft = { estado: encerradoComSaida(), revisao: 1 };
    banco.inscritos = inscritos({ i11: "desistiu", i7: "recusado" });
    const r = await POST(req({ acao: "virar" }));
    expect(r.status).toBe(409);
    const corpo = (await r.json()) as { problemas: string[]; precisaConfirmarForaDoDraft?: boolean };
    expect(corpo.precisaConfirmarForaDoDraft).toBe(true);
    expect(corpo.problemas.join(" ")).toContain("Jog7#BR1 (recusado)");
    expect(corpo.problemas.join(" ")).not.toContain("Jog11#BR1");

    expect((await POST(req({ acao: "virar", confirmoForaDoDraft: true }))).status).toBe(200);
    const virada = banco.auditoria.find((a) => a.acao === "draft_virado_para_o_dataset");
    expect(virada?.detalhe).toMatchObject({
      confirmadoForaDoDraft: [{ riotId: "Jog7#BR1", situacao: "recusado" }],
      naoAptosSemTime: ["Jog11#BR1"],
    });
  });
});
