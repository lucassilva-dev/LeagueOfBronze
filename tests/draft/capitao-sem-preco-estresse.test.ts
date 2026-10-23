import { beforeEach, describe, expect, it, vi } from "vitest";

import { resolveElo } from "@/lib/design";
import {
  aplicarEscolha,
  escolhiveisDaVez,
  estadoFecha,
  gastoDoTime,
  iniciarDraft,
  maisBaratoValido,
  timeDaVez,
  vezSemSaida,
  type EstadoDraft,
} from "@/lib/draft/motor";
import { previaDosPrecos, type InscricaoDaPrevia } from "@/lib/draft/previa-de-precos";
import { ORCAMENTO_DA_MONTAGEM } from "@/lib/draft/viabilidade";
import { CAPITAES_23_10, POOL_4A_40_23_10, type JogadorDoPool } from "./_pool-4a";

/**
 * O DRAFT DA 4ª NÃO TRAVA com o capitão sem preço (decisão de 23/10/2026), em qualquer jeito
 * de escolher: drafts inteiros com o pool real de 23/10 e os 8 capitães definidos, escolhendo
 * ao acaso, sempre o mais caro que o motor deixa, e misturando com a escolha automática (o
 * relógio). Também com um titular a menos (C4), com gente saindo do pool no meio (C1) e com
 * capitães sorteados ao acaso entre os 40 — organizador incluído. Em todos: a vez nunca fica
 * sem saída, e com a soma exata todo time fecha os 30 pontos nas 4 escolhas.
 *
 * E a mesma conta nos três lugares: a prévia do servidor (mesa), a prévia do painel (Times e
 * vagas, Inscritos) e a montagem do sorteio dão o MESMO preço a cada um.
 */

const banco = vi.hoisted(() => ({
  inscritos: [] as Record<string, unknown>[],
  config: {} as Record<string, unknown>,
}));

vi.mock("@/lib/data-store", () => ({
  createSupabaseAdminClient: () => {
    throw new Error("sem banco no teste");
  },
}));
vi.mock("@/lib/inscricoes/store", () => ({
  lerConfig: async () => structuredClone(banco.config),
  listarInscricoes: async () => structuredClone(banco.inscritos),
}));

const { montarDraftDosAprovados, previaDoDraft } = await import("@/lib/draft/store");

const id = (p: number) => `insc-${p}`;

function inscricao(j: JogadorDoPool, capitaes: readonly number[]): Record<string, unknown> {
  return {
    id: id(j.posicao),
    riot_id: `Jogador${j.posicao}#BR1`,
    criado_em: `2026-10-${String(5 + Math.floor(j.posicao / 10)).padStart(2, "0")}T12:${String(j.posicao).padStart(2, "0")}:00Z`,
    situacao: "apto",
    organizador: j.organizador,
    elo_declarado: j.elo,
    elo_verificado: j.elo,
    elo_congelado: null,
    elo_riot: j.eloRiot,
    riot_divisao: j.divisao,
    riot_pdl: j.pdl,
    pontos: resolveElo(j.elo)!.pts,
    rota_primaria: j.rota1,
    rota_secundaria: j.rota2,
    jogador_id: `conta-${j.posicao}`,
    capitao: capitaes.includes(j.posicao),
  };
}

/** Gerador determinístico (mulberry32). */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function rodar(estado: EstadoDraft, aleatorio: () => number, modo: "aleatorio" | "caro" | "misto") {
  let e = iniciarDraft(estado, 0);
  let passo = 0;
  while (e.fase === "rodando") {
    passo++;
    const vez = timeDaVez(e)!;
    expect(vezSemSaida(e)).toBeNull();
    const ids = escolhiveisDaVez(e);
    expect(ids.length).toBeGreaterThan(0);
    let escolhido: string;
    const m = modo === "misto" ? (aleatorio() < 0.3 ? "auto" : aleatorio() < 0.5 ? "caro" : "aleatorio") : modo;
    if (m === "auto") {
      escolhido = maisBaratoValido(e, vez)!.id;
      expect(ids).toContain(escolhido);
    } else if (m === "caro") {
      const porId = new Map(e.jogadores.map((j) => [j.id, j]));
      escolhido = [...ids].sort((a, b) => porId.get(b)!.pontos - porId.get(a)!.pontos)[0]!;
    } else {
      escolhido = ids[Math.floor(aleatorio() * ids.length)]!;
    }
    e = aplicarEscolha(e, vez, escolhido, passo * 1000);
  }
  expect(e.fase).toBe("encerrado");
  return e;
}

beforeEach(() => {
  banco.config = {
    jogadores_por_time: 5,
    max_times: 8,
    orcamento_por_time: 30,
    segundos_por_escolha: 60,
    inscricoes_abertas: false,
    fechamento_inscricoes: null,
  };
  banco.inscritos = POOL_4A_40_23_10.map((j) => inscricao(j, CAPITAES_23_10));
});

describe("o draft com o capitão sem preço não trava", () => {
  it("prévia do servidor, prévia do painel e montagem dão os MESMOS preços", async () => {
    const previa = await previaDoDraft({ estado: null, revisao: 0 });
    const painel = previaDosPrecos({
      inscritos: banco.inscritos as unknown as InscricaoDaPrevia[],
      jogadoresPorTime: 5,
      orcamentoPorTime: 30,
      maxTimes: 8,
    });
    const estado = await montarDraftDosAprovados({ metodo: "definidos" });
    const doEstado = new Map(estado.jogadores.map((j) => [j.id, j.pontos]));
    for (const j of previa.jogadores) {
      const insc = (banco.inscritos as unknown as InscricaoDaPrevia[]).find((i) => i.id === j.id)!;
      expect([j.id, painel.preco(insc)]).toEqual([j.id, j.pontos]);
      expect([j.id, doEstado.get(j.id)]).toEqual([j.id, j.pontos]);
      expect(painel.semPreco(insc)).toBe(j.capitao === true);
    }
  });

  it("200 drafts aleatórios/caros/mistos com os 8 capitães: nunca trava e todo time fecha 30", async () => {
    const base = await montarDraftDosAprovados({ metodo: "definidos" });
    for (let s = 1; s <= 200; s++) {
      const modo = s % 3 === 0 ? "caro" : s % 3 === 1 ? "aleatorio" : "misto";
      const fim = rodar(base, rng(s), modo);
      for (const t of fim.times) {
        // O capitão entra com 0: os 30 são só das 4 escolhas.
        expect(fim.jogadores.find((j) => j.id === t.capitaoId)?.pontos).toBe(0);
        expect(gastoDoTime(fim, t.id)).toBe(30);
        expect(fim.jogadores.filter((j) => j.timeId === t.id)).toHaveLength(5);
      }
    }
  }, 120_000);

  it("C4: um titular não apto (39 no pool) e C1: saídas no meio — não trava", async () => {
    banco.inscritos = POOL_4A_40_23_10.map((j) => ({
      ...inscricao(j, CAPITAES_23_10),
      ...(j.posicao === 4 ? { situacao: "pendente" } : {}),
    }));
    const previa = await previaDoDraft({ estado: null, revisao: 0 });
    expect(previa.capitaesDaTabela).toBe("definidos");
    const base = await montarDraftDosAprovados({ metodo: "definidos" });
    const pv = new Map(previa.jogadores.map((j) => [j.id, j.pontos]));
    for (const j of base.jogadores) expect([j.id, j.pontos]).toEqual([j.id, pv.get(j.id)]);
    expect(base.ordem).toHaveLength(31);
    for (let s = 1; s <= 30; s++) rodar(base, rng(s), "misto");

    banco.inscritos = POOL_4A_40_23_10.map((j) => inscricao(j, CAPITAES_23_10));
    const cheio = await montarDraftDosAprovados({ metodo: "definidos" });
    const { atualizarForaDoPool } = await import("@/lib/draft/motor");
    for (let s = 1; s <= 30; s++) {
      const r = rng(1000 + s);
      let e = iniciarDraft(cheio, 0);
      let passo = 0;
      const saidas = new Set<string>();
      while (e.fase === "rodando") {
        passo++;
        if (r() < 0.06) {
          const livres = e.jogadores.filter((j) => j.timeId === null && !saidas.has(j.id));
          if (livres.length > 0) {
            saidas.add(livres[Math.floor(r() * livres.length)]!.id);
            e = atualizarForaDoPool(e, saidas, passo * 1000);
            if (e.fase !== "rodando") break;
          }
        }
        const vez = timeDaVez(e)!;
        const ids = escolhiveisDaVez(e);
        expect(ids.length).toBeGreaterThan(0);
        e = aplicarEscolha(e, vez, ids[Math.floor(r() * ids.length)]!, passo * 1000);
      }
      expect(e.fase).toBe("encerrado");
    }
  }, 120_000);

  it("capitães aleatórios (qualquer cenário): a tabela fecha e o draft não trava", async () => {
    const r = rng(99);
    for (let k = 0; k < 40; k++) {
      const posicoes = POOL_4A_40_23_10.map((j) => j.posicao).sort(() => r() - 0.5).slice(0, 8);
      banco.inscritos = POOL_4A_40_23_10.map((j) => inscricao(j, posicoes));
      const base = await montarDraftDosAprovados({ metodo: "definidos" });
      expect(estadoFecha(base, ORCAMENTO_DA_MONTAGEM)).toBe(true);
      const soma = base.jogadores.reduce((s, j) => s + j.pontos, 0);
      expect(soma).toBeLessThanOrEqual(240);
      for (let s = 1; s <= 5; s++) {
        const fim = rodar(base, rng(k * 100 + s), s % 2 ? "aleatorio" : "misto");
        const folga = 240 - soma;
        for (const t of fim.times) expect(gastoDoTime(fim, t.id)).toBeGreaterThanOrEqual(30 - folga);
      }
    }
  }, 240_000);
});
