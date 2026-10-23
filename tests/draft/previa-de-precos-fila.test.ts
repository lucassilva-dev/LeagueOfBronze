import { describe, expect, it } from "vitest";

import { previaDosPrecos, type InscricaoDaPrevia } from "@/lib/draft/previa-de-precos";
import { POOL_4A_40, type JogadorDoPool } from "./_pool-4a";

/**
 * ATUALIZAÇÃO de 23/10, item 3(a): a prévia de preços do painel (abas Times e vagas e
 * Inscritos, e a regra do substituto antes do draft) considera como "titulares" os TITULARES
 * DA FILA (`montarFila`) — organizadores e os primeiros por ordem de inscrição até as vagas.
 *
 * Antes eram "os elegíveis que não estão na sobra": com mais inscritos que vagas (o caso da
 * 4ª com a fila de reserva), essa conta nunca batia com as vagas e a prévia caía no cenário
 * "mais fracos" — preços que o draft não ia usar.
 */

function inscricao(j: JogadorDoPool, over: Partial<InscricaoDaPrevia> = {}): InscricaoDaPrevia {
  return {
    id: `insc-${j.posicao}`,
    riot_id: `Jogador${j.posicao}#BR1`,
    situacao: "apto",
    organizador: j.organizador,
    elo_declarado: j.elo,
    elo_verificado: j.elo,
    elo_congelado: null,
    elo_riot: j.eloRiot,
    riot_divisao: j.divisao,
    riot_pdl: j.pdl,
    // A ordem de inscrição é a da posição.
    criado_em: new Date(Date.UTC(2026, 9, 5, 12, 0, j.posicao)).toISOString(),
    ...over,
  };
}

/** Dois inscritos DEPOIS dos 40: um Desafiante-de-mentira (Mestre 900) e um Ferro. */
const DEPOIS_DOS_40: JogadorDoPool[] = [
  { posicao: 41, elo: "Mestre", eloRiot: "Mestre", divisao: "I", pdl: 900, organizador: false, rota1: "TOP", rota2: "MID", reserva: false },
  { posicao: 42, elo: "Ferro", eloRiot: null, divisao: null, pdl: null, organizador: false, rota1: "SUP", rota2: "ADC", reserva: false },
];

const FORMATO = { jogadoresPorTime: 5, orcamentoPorTime: 30, maxTimes: 8 } as const;

describe("a prévia de preços usa os titulares da fila (3a)", () => {
  it("42 inscritos para 40 vagas: o pool da prévia são os 40 primeiros da fila, não os mais fracos", () => {
    const inscritos = [...POOL_4A_40, ...DEPOIS_DOS_40].map((j) => inscricao(j));
    const previa = previaDosPrecos({ inscritos, ...FORMATO });

    expect(previa.origem).toBe("titulares");
    expect(previa.vagas).toBe(40);
    expect(previa.noPool.size).toBe(40);
    expect(previa.noPool.has("insc-41")).toBe(false);
    expect(previa.noPool.has("insc-42")).toBe(false);
    // A tabela é a mesma de quando só os 40 estavam inscritos: quem chegou depois não muda o
    // preço de ninguém — só recebe o preço da reta.
    const so40 = previaDosPrecos({ inscritos: POOL_4A_40.map((j) => inscricao(j)), ...FORMATO });
    expect(previa.tabela).toEqual(so40.tabela);
    for (const i of inscritos.slice(0, 40)) expect(previa.preco(i), i.riot_id).toBe(so40.preco(i));
  });

  it("organizador inscrito por último continua titular (a fila põe a organização dentro)", () => {
    const tarde = { ...POOL_4A_40[0]!, posicao: 99 };
    const inscritos = [...POOL_4A_40.slice(1), ...DEPOIS_DOS_40, tarde].map((j) => inscricao(j));
    const previa = previaDosPrecos({ inscritos, ...FORMATO });
    expect(previa.origem).toBe("titulares");
    // Os 4 organizadores contam primeiro nas vagas: ficam os 36 primeiros não organizadores, e
    // o 41º e o 42º — inscritos ANTES do organizador — vão para a reserva.
    expect(previa.noPool.has("insc-99")).toBe(true);
    expect(previa.noPool.has("insc-41")).toBe(false);
    expect(previa.noPool.has("insc-42")).toBe(false);
  });

  it("quem está na «sobra» vai para a reserva da fila, e o próximo por ordem de inscrição entra", () => {
    const inscritos = [...POOL_4A_40, ...DEPOIS_DOS_40].map((j) =>
      inscricao(j, j.posicao === 7 ? { situacao: "sobra" } : {}),
    );
    const previa = previaDosPrecos({ inscritos, ...FORMATO });
    expect(previa.origem).toBe("titulares");
    expect(previa.noPool.has("insc-7")).toBe(false);
    expect(previa.noPool.has("insc-41")).toBe(true);
    expect(previa.noPool.has("insc-42")).toBe(false);
  });

  it("menos inscritos que um múltiplo das vagas continua caindo nos mais fracos (nada mudou aí)", () => {
    // 38 elegíveis: 7 times (35 vagas), mas a fila tem 40 vagas — os 38 são titulares.
    const inscritos = POOL_4A_40.slice(0, 38).map((j) => inscricao(j));
    const previa = previaDosPrecos({ inscritos, ...FORMATO });
    expect(previa.times).toBe(7);
    expect(previa.origem).toBe("mais_fracos");
  });
});
