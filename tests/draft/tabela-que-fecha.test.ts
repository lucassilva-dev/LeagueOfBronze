import { describe, expect, it } from "vitest";

import { rankingDeCapitaes } from "@/lib/draft/capitaes";
import { previaDosPrecos } from "@/lib/draft/previa-de-precos";
import { type EloDoJogador } from "@/lib/draft/precos";
import { curvaturaEscrita, tabelaQueFecha, tentativasDaQueda } from "@/lib/draft/tabela-que-fecha";
import { TITULARES_4A, type JogadorDoPool } from "./_pool-4a";

/**
 * A queda automática (lib/draft/tabela-que-fecha.ts), sem banco: a ordem das tentativas, o
 * motivo em português e a mesma conta na prévia do painel.
 */

const id = (j: JogadorDoPool) => `j${String(j.posicao).padStart(2, "0")}`;
const DA_4A = { times: 6, jogadoresPorTime: 5, orcamentoPorTime: 30 } as const;

function capitaesDaRegra(pool: readonly (EloDoJogador & { id: string; organizador: boolean })[]) {
  return rankingDeCapitaes(
    pool.map((j) => ({ id: j.id, riotId: j.id, organizador: j.organizador, elo: j.elo, eloRiot: j.eloRiot, divisao: j.divisao, pdl: j.pdl })),
    6,
  ).escolhidos;
}

const REAL = TITULARES_4A.map((j) => ({ ...j, id: id(j) }));
const MESTRE_450 = REAL.map((j) => (j.posicao === 1 ? { ...j, pdl: 450 } : j));

describe("as tentativas", () => {
  it("a curvatura desce de 0,0125 em 0,0125 até 0 com a soma exata; depois a soma, até alvo − times", () => {
    expect(tentativasDaQueda(0.075, 6)).toEqual([
      { curvatura: 0.075, menos: 0 },
      { curvatura: 0.0625, menos: 0 },
      { curvatura: 0.05, menos: 0 },
      { curvatura: 0.0375, menos: 0 },
      { curvatura: 0.025, menos: 0 },
      { curvatura: 0.0125, menos: 0 },
      { curvatura: 0, menos: 0 },
      ...[1, 2, 3, 4, 5, 6].map((menos) => ({ curvatura: 0, menos })),
    ]);
    // Curvatura que não é múltiplo do passo também termina em 0.
    expect(tentativasDaQueda(0.03, 1).map((t) => t.curvatura)).toEqual([0.03, 0.0175, 0.005, 0, 0]);
    expect(curvaturaEscrita(0.0625)).toBe("0,0625");
    expect(curvaturaEscrita(0)).toBe("0");
  });
});

describe("a tabela que fecha com os capitães", () => {
  it("pool real: vale a pedida, sem queda", () => {
    const r = tabelaQueFecha({ pool: REAL.map((j) => ({ id: j.id, elo: j })), capitaes: capitaesDaRegra(REAL), ...DA_4A });
    expect(r).toMatchObject({ fecha: true, queda: null });
    expect(r.tabela).toMatchObject({ curvatura: 0.075, soma: 180, folga: 0 });
    expect(r.precoDe.get("j01")).toBe(16);
  });

  it("Mestre #1 com 450 PDL: com 0,075 ele custaria 19 (o teto de uma escolha é 18); desce para 0,0625", () => {
    const r = tabelaQueFecha({ pool: MESTRE_450.map((j) => ({ id: j.id, elo: j })), capitaes: capitaesDaRegra(MESTRE_450), ...DA_4A });
    expect(r.fecha).toBe(true);
    expect(r.tabela).toMatchObject({ curvatura: 0.0625, soma: 180, folga: 0 });
    expect(r.precoDe.get("j01")).toBe(17);
    expect(r.queda).toEqual({
      curvaturaPedida: 0.075,
      motivo:
        "A curvatura caiu de 0,075 para 0,0625: com 0,075, o Mestre · 400–499 PDL custaria 19 e nenhum time conseguiria pagá-lo (cabem no máximo 18 numa escolha).",
    });
  });

  it("quanto mais o Mestre sobe, mais a curvatura desce — sempre a primeira que fecha", () => {
    const comPdl = (pdl: number) => REAL.map((j) => (j.posicao === 1 ? { ...j, pdl } : j));
    const curvaturaCom = (pdl: number) => {
      const pool = comPdl(pdl);
      return tabelaQueFecha({ pool: pool.map((j) => ({ id: j.id, elo: j })), capitaes: capitaesDaRegra(pool), ...DA_4A }).tabela.curvatura;
    };
    expect(curvaturaCom(399)).toBe(0.075);
    expect(curvaturaCom(450)).toBe(0.0625);
    expect(curvaturaCom(750)).toBe(0.0375);
    expect(curvaturaCom(1200)).toBe(0.0125);
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
    const previa = previaDosPrecos({ inscritos, jogadoresPorTime: 5, orcamentoPorTime: 30, maxTimes: 6 });
    expect(previa.origem).toBe("titulares");
    expect(previa.tabela).toMatchObject({ curvatura: 0.0625, soma: 180 });
    expect(previa.queda?.motivo).toContain("caiu de 0,075 para 0,0625");
    expect(previa.fechaComOsCapitaes).toBe(true);
    expect(previa.preco(inscritos[0]!)).toBe(17);
  });
});
