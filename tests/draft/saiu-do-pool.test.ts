import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  alcancarORelogio,
  aplicarEscolha,
  atualizarForaDoPool,
  avancarPorTempo,
  escolhiveisDaVez,
  iniciarDraft,
  jogadoresDisponiveis,
  montarDraft,
  podeEscolher,
  type EstadoDraft,
  type JogadorDoDraft,
} from "@/lib/draft/motor";
import { avisosDaVirada, problemasDaVirada } from "@/lib/draft/virada";

/**
 * C1 (decisão do Lucas, 2026-10-22): jogador do POOL cuja inscrição deixa de valer depois do
 * sorteio (desistiu, recusado, excluído) sai dos escolhíveis NA HORA — a sondagem lê a
 * situação atual — e a mesa e a transmissão mostram que saiu. C2: quem já está num elenco,
 * ou é capitão, e sai: o draft segue com ele.
 *
 * Antes, o draft copiava os aptos no sorteio e não olhava mais as inscrições: o desistente
 * continuava escolhível, a escolha automática podia levá-lo, e com o pool exato (40 para 40
 * vagas) não havia como o draft fechar sem ele.
 */

const banco = vi.hoisted(() => ({
  draft: { estado: null as unknown, revisao: 1 },
  /** O que a tabela `inscricoes` responde: id → situação. */
  situacoes: {} as Record<string, string>,
  leiturasDeSituacao: 0,
  falharLeitura: false,
  salvos: [] as unknown[],
  inscricaoDaConta: "ca" as string | null,
}));

vi.mock("@/lib/data-store", () => ({
  ConflitoDeVersaoError: class extends Error {},
  isSupabaseConfigured: () => true,
  createSupabaseAdminClient: () => ({
    from: (tabela: string) => {
      if (tabela !== "inscricoes") throw new Error(`tabela inesperada: ${tabela}`);
      return {
        select: (colunas: string) => {
          expect(colunas).toBe("id,situacao");
          return {
            in: (coluna: string, ids: string[]) => {
              expect(coluna).toBe("id");
              return {
                returns: async () => {
                  banco.leiturasDeSituacao++;
                  if (banco.falharLeitura) return { data: null, error: { message: "fora do ar" } };
                  return {
                    data: ids.filter((id) => id in banco.situacoes).map((id) => ({ id, situacao: banco.situacoes[id] })),
                    error: null,
                  };
                },
              };
            },
          };
        },
      };
    },
  }),
}));
vi.mock("@/lib/jogadores/auth", () => ({
  JOGADOR_COOKIE: "lob_jogador",
  identidadePorToken: async () => null,
  renovarCookieDeJogador: async () => null,
  atributosDoCookie: () => ({}),
  getJogadorIdentity: async () => ({ id: "conta", email: "x@x", displayName: "x", mustChangePassword: false }),
}));
vi.mock("@/lib/security/route-guard", () => ({ mesmaOrigem: () => true }));
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
      banco.salvos.push(structuredClone(estado));
      banco.draft = { estado: structuredClone(estado), revisao: revisao + 1 };
      return true;
    },
  };
});

const { esquecerSituacoesGuardadas, paraPublico } = await import("@/lib/draft/store");
const { GET } = await import("@/app/api/draft/estado/route");
const { POST } = await import("@/app/api/draft/escolha/route");

const T0 = Date.parse("2026-11-20T23:00:00.000Z");

const j = (id: string, pontos: number): JogadorDoDraft => ({
  id,
  riotId: `${id.toUpperCase()}#BR1`,
  pontos,
  rota1: "MID",
  rota2: "TOP",
  elo: "Prata",
  timeId: null,
});

/**
 * Dois times de 3 (capitão + 2), soma exata 20 = 2 × 10. A só fecha com 6 nos dois que
 * escolhe; B, com 4 — e o único jeito é B levar o L (1) e o p3 (3). Ordem: A, B, B, A.
 */
function apertado(): EstadoDraft {
  return montarDraft({
    times: [
      { id: "a", nome: "A", cor: "#fff", capitaoId: "ca" },
      { id: "b", nome: "B", cor: "#fff", capitaoId: "cb" },
    ],
    jogadores: [j("ca", 4), j("cb", 6), j("p2", 2), j("p3", 3), j("l", 1), j("x", 4)],
    jogadoresPorTime: 3,
    orcamentoPorTime: 10,
    segundosPorEscolha: 60,
  });
}

/** Dois times de 3 com folga: qualquer um cabe em qualquer time. */
function folgado(): EstadoDraft {
  return montarDraft({
    times: [
      { id: "a", nome: "A", cor: "#fff", capitaoId: "ca" },
      { id: "b", nome: "B", cor: "#fff", capitaoId: "cb" },
    ],
    jogadores: [j("ca", 3), j("cb", 3), j("p1", 1), j("p2", 2), j("p3", 2), j("p4", 2)],
    jogadoresPorTime: 3,
    orcamentoPorTime: 20,
    segundosPorEscolha: 60,
  });
}

/** Roda o relógio uma escolha por vez, como a sala sondando, até parar. */
function rodarAteParar(e: EstadoDraft, desdeMs: number): EstadoDraft {
  let atual = e;
  for (let k = 1; k <= 20 && atual.fase === "rodando"; k++) atual = alcancarORelogio(atual, desdeMs + k * 60_000 + 1);
  return atual;
}

beforeEach(() => {
  banco.salvos = [];
  banco.situacoes = {};
  banco.leiturasDeSituacao = 0;
  banco.falharLeitura = false;
  banco.inscricaoDaConta = "ca";
  esquecerSituacoesGuardadas();
});

describe("motor: quem sai do pool deixa de ser escolhível (C1)", () => {
  it("sai dos disponíveis e dos escolhíveis, e a escolha é recusada com código próprio", () => {
    const e = atualizarForaDoPool(iniciarDraft(folgado(), T0), new Set(["p2"]));
    expect(e.foraDoPool).toEqual(["p2"]);
    expect(jogadoresDisponiveis(e).map((x) => x.id)).not.toContain("p2");
    expect(escolhiveisDaVez(e)).not.toContain("p2");
    const recusa = podeEscolher(e, "a", "p2");
    expect(recusa).toMatchObject({ ok: false, codigo: "saiu_do_pool", params: { riotId: "P2#BR1" } });
    expect(() => aplicarEscolha(e, "a", "p2", T0)).toThrow(/saiu do draft/);
  });

  it("a escolha automática não leva quem saiu, mesmo sendo o mais barato", () => {
    const e = atualizarForaDoPool(iniciarDraft(folgado(), T0), new Set(["p1"]));
    const depois = avancarPorTempo(e, T0 + 60_001);
    expect(depois.historico[0]!.automatica).toBe(true);
    expect(depois.historico[0]!.jogadorId).not.toBe("p1");
  });

  it("com o pool exato, a ordem perde uma escolha, o draft fecha sem travar e o time fica com a vaga aberta", () => {
    const antes = iniciarDraft(folgado(), T0);
    expect(antes.ordem).toHaveLength(4);
    const e = atualizarForaDoPool(antes, new Set(["p4"]));
    expect(e.ordem).toHaveLength(3);

    const fim = rodarAteParar(e, T0);
    expect(fim.fase).toBe("encerrado");
    expect(fim.jogadores.find((x) => x.id === "p4")!.timeId).toBeNull();
    const tamanhos = fim.times.map((t) => fim.jogadores.filter((x) => x.timeId === t.id).length).sort();
    expect(tamanhos).toEqual([2, 3]);
    // A virada aceita o time incompleto (é a vaga da reserva) e avisa.
    expect(problemasDaVirada(fim)).toEqual([]);
    expect(avisosDaVirada(fim).join(" ")).toContain("vai para o site com 2 de 3");
  });

  it("o corte não deixa outro time sem saída: tira a escolha do time certo, não sempre a última", () => {
    // B só fechava com o L (1). Sem ele, tirar a última escolha (a de A) deixaria B precisando
    // de dois jogadores com 4 pontos entre {2, 3, 4} — impossível. A conta tira a de B.
    const e = atualizarForaDoPool(iniciarDraft(apertado(), T0), new Set(["l"]));
    expect(e.ordem).toEqual(["a", "b", "a"]);
    expect(escolhiveisDaVez(e).length).toBeGreaterThan(0);

    const fim = rodarAteParar(e, T0);
    expect(fim.fase).toBe("encerrado");
    expect(fim.motivoDaPausa).toBeUndefined();
    expect(fim.jogadores.filter((x) => x.timeId === "b")).toHaveLength(2);
    expect(fim.jogadores.filter((x) => x.timeId === "a")).toHaveLength(3);
    expect(problemasDaVirada(fim)).toEqual([]);
  });

  it("quem volta a valer volta ao pool, e a ordem recupera a escolha", () => {
    const comSaida = atualizarForaDoPool(iniciarDraft(folgado(), T0), new Set(["p4"]));
    const voltou = atualizarForaDoPool(comSaida, new Set());
    expect(voltou.foraDoPool).toBeUndefined();
    expect(voltou.ordem).toHaveLength(4);
    expect(jogadoresDisponiveis(voltou).map((x) => x.id)).toContain("p4");
  });

  it("sem mudança devolve o MESMO objeto (a sondagem não grava à toa)", () => {
    const e = iniciarDraft(folgado(), T0);
    expect(atualizarForaDoPool(e, new Set())).toBe(e);
    const comSaida = atualizarForaDoPool(e, new Set(["p2"]));
    expect(atualizarForaDoPool(comSaida, new Set(["p2"]))).toBe(comSaida);
  });

  it("C2: escolhido ou capitão que sai NÃO sai do draft — o draft segue", () => {
    let e = iniciarDraft(folgado(), T0);
    e = aplicarEscolha(e, "a", "p1", T0 + 1000);
    const depois = atualizarForaDoPool(e, new Set(["p1", "ca"]));
    expect(depois).toBe(e);
    expect(depois.jogadores.find((x) => x.id === "p1")!.timeId).toBe("a");
    expect(rodarAteParar(depois, T0 + 1000).fase).toBe("encerrado");
  });

  it("draft encerrado não muda mais (quem saiu, a virada pergunta)", () => {
    const fim = rodarAteParar(iniciarDraft(folgado(), T0), T0);
    expect(atualizarForaDoPool(fim, new Set(["p2"]))).toBe(fim);
  });
});

describe("a visão pública mostra quem saiu, sem o id e sem o porquê", () => {
  it("fora de `disponiveis`, em `saiuDoPool`, e a ordem vai junto", () => {
    const e = atualizarForaDoPool(iniciarDraft(folgado(), T0), new Set(["p4"]));
    const publico = paraPublico(e, 7);
    expect(publico.disponiveis.map((x) => x.id)).not.toContain("p4");
    expect(publico.saiuDoPool).toEqual([{ riotId: "P4#BR1", pontos: 2, rota1: "MID", rota2: "TOP", elo: "Prata" }]);
    expect(publico.totalEscolhas).toBe(3);
    expect(publico.ordem).toEqual(e.ordem);
    expect(JSON.stringify(publico.saiuDoPool)).not.toMatch(/desist|recus|exclu/);
  });
});

describe("a sondagem lê a situação atual e grava (C1)", () => {
  it("desistência no meio do draft: some dos escolhíveis na sondagem seguinte, e o estado é gravado", async () => {
    banco.draft = { estado: iniciarDraft(folgado(), Date.now()), revisao: 3 };
    banco.situacoes = { p1: "apto", p2: "desistiu", p3: "apto", p4: "apto" };

    const r = await GET({ cookies: { get: () => undefined } } as unknown as NextRequest);
    expect(r.status).toBe(200);
    const corpo = (await r.json()) as { draft: { revisao: number; disponiveis: { id: string }[]; escolhiveis: string[]; saiuDoPool: { riotId: string }[] } };
    expect(corpo.draft.disponiveis.map((x) => x.id)).not.toContain("p2");
    expect(corpo.draft.escolhiveis).not.toContain("p2");
    expect(corpo.draft.saiuDoPool.map((x) => x.riotId)).toEqual(["P2#BR1"]);
    expect(corpo.draft.revisao).toBe(4);
    expect((banco.salvos[0] as EstadoDraft).foraDoPool).toEqual(["p2"]);
  });

  it("excluído e recusado também saem; sobra e pendente continuam no pool", async () => {
    banco.draft = { estado: iniciarDraft(folgado(), Date.now()), revisao: 3 };
    banco.situacoes = { p1: "excluido", p2: "recusado", p3: "sobra", p4: "pendente" };
    const corpo = (await (await GET({ cookies: { get: () => undefined } } as unknown as NextRequest)).json()) as {
      draft: { disponiveis: { id: string }[] };
    };
    expect(corpo.draft.disponiveis.map((x) => x.id).sort()).toEqual(["p3", "p4"]);
  });

  it("todos aptos: nada muda e nada é gravado", async () => {
    banco.draft = { estado: iniciarDraft(folgado(), Date.now()), revisao: 3 };
    banco.situacoes = { p1: "apto", p2: "apto", p3: "apto", p4: "apto" };
    await GET({ cookies: { get: () => undefined } } as unknown as NextRequest);
    expect(banco.salvos).toHaveLength(0);
  });

  it("a leitura das inscrições falhou: o draft segue como estava (não para nem tira ninguém)", async () => {
    banco.draft = { estado: iniciarDraft(folgado(), Date.now()), revisao: 3 };
    banco.falharLeitura = true;
    const erro = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const corpo = (await (await GET({ cookies: { get: () => undefined } } as unknown as NextRequest)).json()) as {
      draft: { disponiveis: { id: string }[] };
    };
    expect(corpo.draft.disponiveis).toHaveLength(4);
    expect(banco.salvos).toHaveLength(0);
    erro.mockRestore();
  });
});

describe("a escolha do capitão lê na hora (C1)", () => {
  const req = (corpo: unknown) => {
    const texto = JSON.stringify(corpo);
    return {
      method: "POST",
      headers: new Headers({ host: "x", "sec-fetch-site": "same-origin", "content-type": "application/json" }),
      cookies: { get: () => undefined },
      text: async () => texto,
      json: async () => JSON.parse(texto) as unknown,
    } as unknown as NextRequest;
  };

  it("o capitão clica em quem acabou de desistir: 409 com o código, e nada entra", async () => {
    banco.draft = { estado: iniciarDraft(folgado(), Date.now()), revisao: 3 };
    banco.situacoes = { p1: "apto", p2: "desistiu", p3: "apto", p4: "apto" };
    const r = await POST(req({ jogadorId: "p2", escolha: 0 }));
    expect(r.status).toBe(409);
    const corpo = (await r.json()) as { codigo: string; params: { riotId: string } };
    expect(corpo.codigo).toBe("saiu_do_pool");
    expect(corpo.params.riotId).toBe("P2#BR1");
    expect(banco.salvos).toHaveLength(0);
  });

  it("mesmo com a leitura da sondagem guardada (feita antes da desistência), a escolha confere de novo", async () => {
    banco.draft = { estado: iniciarDraft(folgado(), Date.now()), revisao: 3 };
    banco.situacoes = { p1: "apto", p2: "apto", p3: "apto", p4: "apto" };
    await GET({ cookies: { get: () => undefined } } as unknown as NextRequest);
    banco.situacoes.p2 = "desistiu";
    const r = await POST(req({ jogadorId: "p2", escolha: 0 }));
    expect(((await r.json()) as { codigo: string }).codigo).toBe("saiu_do_pool");
  });

  it("escolher outro jogador segue normal, e o estado gravado já leva quem saiu", async () => {
    banco.draft = { estado: iniciarDraft(folgado(), Date.now()), revisao: 3 };
    banco.situacoes = { p1: "apto", p2: "desistiu", p3: "apto", p4: "apto" };
    const r = await POST(req({ jogadorId: "p3", escolha: 0 }));
    expect(r.status).toBe(200);
    const gravado = banco.salvos.at(-1) as EstadoDraft;
    expect(gravado.jogadores.find((x) => x.id === "p3")!.timeId).toBe("a");
    expect(gravado.foraDoPool).toEqual(["p2"]);
  });
});
