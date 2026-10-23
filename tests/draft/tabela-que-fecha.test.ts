import { describe, expect, it } from "vitest";

import { rankingDeCapitaes } from "@/lib/draft/capitaes";
import { previaDosPrecos } from "@/lib/draft/previa-de-precos";
import { type EloDoJogador } from "@/lib/draft/precos";
import { curvaturaEscrita, PASSO_DA_QUEDA, tabelaQueFecha, tentativasDaQueda } from "@/lib/draft/tabela-que-fecha";
import { POOL_4A_40, type JogadorDoPool } from "./_pool-4a";

/**
 * A queda automática (lib/draft/tabela-que-fecha.ts), sem banco: a ordem das tentativas, o
 * motivo em português e a mesma conta na prévia do painel — com o pool real da 4ª (40
 * pessoas, 8 times) e a curvatura padrão (0,1).
 */

const id = (j: JogadorDoPool) => `j${String(j.posicao).padStart(2, "0")}`;
const DA_4A = { times: 8, jogadoresPorTime: 5, orcamentoPorTime: 30 } as const;

function capitaesDaRegra(pool: readonly (EloDoJogador & { id: string; organizador: boolean })[]) {
  return rankingDeCapitaes(
    pool.map((j) => ({ id: j.id, riotId: j.id, organizador: j.organizador, elo: j.elo, eloRiot: j.eloRiot, divisao: j.divisao, pdl: j.pdl })),
    8,
  ).escolhidos;
}

const REAL = POOL_4A_40.map((j) => ({ ...j, id: id(j) }));
/** O Mestre do topo (#1, organizador, 208 PDL hoje) com outro PDL no congelamento. */
const comPdl = (pdl: number) => REAL.map((j) => (j.posicao === 1 ? { ...j, pdl } : j));
const MESTRE_450 = comPdl(450);
const MESTRE_550 = comPdl(550);

function contaCom(pool: typeof REAL, curvatura?: number) {
  return tabelaQueFecha({ pool: pool.map((j) => ({ id: j.id, elo: j })), capitaes: capitaesDaRegra(pool), ...DA_4A, curvatura });
}

describe("as tentativas", () => {
  it("a curvatura desce de 0,0125 em 0,0125 até 0 com a soma exata; depois a soma, até alvo − times", () => {
    // A partir da padrão de hoje (0,1) e com os 8 times da 4ª.
    expect(tentativasDaQueda(0.1, 8)).toEqual([
      { curvatura: 0.1, menos: 0 },
      { curvatura: 0.0875, menos: 0 },
      { curvatura: 0.075, menos: 0 },
      { curvatura: 0.0625, menos: 0 },
      { curvatura: 0.05, menos: 0 },
      { curvatura: 0.0375, menos: 0 },
      { curvatura: 0.025, menos: 0 },
      { curvatura: 0.0125, menos: 0 },
      { curvatura: 0, menos: 0 },
      ...[1, 2, 3, 4, 5, 6, 7, 8].map((menos) => ({ curvatura: 0, menos })),
    ]);
    // Curvatura que não é múltiplo do passo também termina em 0.
    expect(tentativasDaQueda(0.03, 1).map((t) => t.curvatura)).toEqual([0.03, 0.0175, 0.005, 0, 0]);
    expect(curvaturaEscrita(0.1)).toBe("0,1");
    expect(curvaturaEscrita(0.0875)).toBe("0,0875");
    expect(curvaturaEscrita(0.0625)).toBe("0,0625");
    expect(curvaturaEscrita(0)).toBe("0");
  });
});

describe("a tabela que fecha com os capitães", () => {
  it("pool real: vale a pedida, sem queda", () => {
    const r = contaCom(REAL);
    expect(r).toMatchObject({ fecha: true, queda: null });
    expect(r.tabela).toMatchObject({ curvatura: 0.1, soma: 240, folga: 0 });
    expect(r.precoDe.get("j01")).toBe(15);
  });

  it("Mestre #1 com 399 PDL: ainda vale a pedida (ele custaria 17)", () => {
    const r = contaCom(comPdl(399));
    expect(r).toMatchObject({ fecha: true, queda: null });
    expect(r.tabela).toMatchObject({ curvatura: 0.1, soma: 240, folga: 0 });
    expect(r.precoDe.get("j01")).toBe(17);
  });

  it("Mestre #1 com 450 PDL: com 0,1 ele custaria 19 e a repartição não fecha; desce para 0,0875", () => {
    // 19 ainda cabe numa escolha (o teto é 19) — o que não existe é a divisão dos outros 32
    // jogadores que feche os 8 elencos com os 30 pontos certinhos.
    expect(contaCom(MESTRE_450, 0.0875)).toMatchObject({ fecha: true, queda: null }); // 0,0875 fecha de primeira
    const r = contaCom(MESTRE_450);
    expect(r.fecha).toBe(true);
    expect(r.tabela).toMatchObject({ curvatura: 0.0875, soma: 240, folga: 0 });
    expect(r.precoDe.get("j01")).toBe(17);
    expect(r.queda).toEqual({
      curvaturaPedida: 0.1,
      motivo:
        "A curvatura caiu de 0,1 para 0,0875: com 0,1, não existe divisão dos outros jogadores que feche os elencos de todos os capitães (cada time precisa terminar com os 30 pontos certinhos).",
    });
  });

  it("Mestre #1 com 550 PDL: com 0,1 ele custaria 20 (o teto de uma escolha é 19); desce para 0,075", () => {
    const r = contaCom(MESTRE_550);
    expect(r.fecha).toBe(true);
    expect(r.tabela).toMatchObject({ curvatura: 0.075, soma: 240, folga: 0 });
    expect(r.precoDe.get("j01")).toBe(17);
    expect(r.queda).toEqual({
      curvaturaPedida: 0.1,
      motivo:
        "A curvatura caiu de 0,1 para 0,075: com 0,1, o Mestre · 500–599 PDL custaria 20 e nenhum time conseguiria pagá-lo (cabem no máximo 19 numa escolha).",
    });
  });

  it("quanto mais o Mestre sobe, mais a curvatura desce — sempre a primeira que fecha", () => {
    // A tendência, não degrau a degrau: a tabela inteira muda junto com o PDL dele, e há faixas
    // em que a conta fecha numa curvatura um passo acima da faixa anterior.
    const esperado: [number, number][] = [
      [399, 0.1],
      [450, 0.0875],
      [550, 0.075],
      [750, 0.0625],
      [1200, 0.025],
      [1500, 0.0125],
      [2150, 0],
    ];
    for (const [pdl, curvatura] of esperado) {
      const r = contaCom(comPdl(pdl));
      expect(r.fecha, `${pdl} PDL`).toBe(true);
      expect(r.tabela.curvatura, `${pdl} PDL`).toBe(curvatura);
      expect(r.tabela.folga, `${pdl} PDL`).toBe(0);
      // A primeira que fecha: um passo acima, ela ainda não fechava.
      if (curvatura < 0.1) expect(contaCom(comPdl(pdl), curvatura + PASSO_DA_QUEDA).queda, `${pdl} PDL`).not.toBeNull();
    }
  });

  it("a prévia do painel faz a mesma queda, com os capitães da regra", () => {
    const inscritos = MESTRE_450.map((j) => ({
      id: j.id,
      riot_id: `${j.id}#BR1`,
      situacao: "apto",
      organizador: j.organizador,
      elo_declarado: j.elo,
      elo_verificado: j.elo,
      elo_congelado: null,
      elo_riot: j.eloRiot,
      riot_divisao: j.divisao,
      riot_pdl: j.pdl,
    }));
    const previa = previaDosPrecos({ inscritos, jogadoresPorTime: 5, orcamentoPorTime: 30, maxTimes: 8 });
    expect(previa.origem).toBe("titulares");
    expect(previa.times).toBe(8);
    expect(previa.tabela).toMatchObject({ curvatura: 0.0875, soma: 240 });
    expect(previa.queda?.motivo).toContain("caiu de 0,1 para 0,0875");
    expect(previa.fechaComOsCapitaes).toBe(true);
    expect(previa.preco(inscritos[0]!)).toBe(17);
  });
});
