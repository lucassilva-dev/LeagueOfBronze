import { describe, expect, it } from "vitest";

import { ajustarOrdemAoPool, montarDraft, ordemDasRodadas, type JogadorDoDraft } from "@/lib/draft/motor";
import { TIPO_DE_ORDEM_DA_EDICAO } from "@/lib/draft/store";
import { identidadeDoTime } from "@/lib/draft/times";

/*
 * Decisão da organização na hora do draft da 4ª (24/10/2026, 22h): a ordem é 1→7 em TODAS as
 * rodadas, e não mais a serpentina. O padrão do motor continua a serpentina (estados antigos e
 * outras edições); a montagem da 4ª pede "linear".
 */
describe("ordem linear (1 a N em todas as rodadas)", () => {
  it("ordemDasRodadas: linear repete a mesma ordem; serpentina continua o padrão", () => {
    expect(ordemDasRodadas(["a", "b", "c"], 3, "linear")).toEqual(["a", "b", "c", "a", "b", "c", "a", "b", "c"]);
    expect(ordemDasRodadas(["a", "b", "c"], 2)).toEqual(["a", "b", "c", "c", "b", "a"]);
  });

  it("a 4ª monta em ordem linear", () => {
    expect(TIPO_DE_ORDEM_DA_EDICAO).toBe("linear");
  });

  it("montarDraft linear com o time definido: 7 times × 4 rodadas, sempre 1→7, sem o definido", () => {
    const n = 8;
    const jogadores: JogadorDoDraft[] = Array.from({ length: n * 5 }, (_, i) => ({
      id: `j${i}`,
      riotId: `J${i}#BR1`,
      pontos: 0,
      rota1: "MID",
      rota2: "TOP",
      elo: "Prata",
      timeId: null,
    }));
    const times = Array.from({ length: n }, (_, i) => ({
      id: `time-${i + 1}`,
      ...identidadeDoTime(i),
      capitaoId: `j${i}`,
      ...(i === 2 ? { elencoDefinido: ["j2", "j8", "j9", "j10", "j11"] } : {}),
    }));
    const estado = ajustarOrdemAoPool(
      montarDraft({ times, jogadores, jogadoresPorTime: 5, orcamentoPorTime: 30, segundosPorEscolha: 60, tipoDeOrdem: "linear" }),
    );
    const sete = ["time-1", "time-2", "time-4", "time-5", "time-6", "time-7", "time-8"];
    expect(estado.ordem).toEqual([...sete, ...sete, ...sete, ...sete]);
    expect(estado.tipoDeOrdem).toBe("linear");
  });

  it("sem pedir, a montagem continua serpentina e não grava o campo", () => {
    const jogadores: JogadorDoDraft[] = Array.from({ length: 4 }, (_, i) => ({
      id: `j${i}`, riotId: `J${i}#BR1`, pontos: 1, rota1: "MID", rota2: "TOP", elo: "Prata", timeId: null,
    }));
    const estado = montarDraft({
      times: [0, 1].map((i) => ({ id: `time-${i + 1}`, ...identidadeDoTime(i), capitaoId: `j${i}` })),
      jogadores,
      jogadoresPorTime: 2,
      orcamentoPorTime: 10,
      segundosPorEscolha: 60,
    });
    expect(estado.ordem).toEqual(["time-1", "time-2"]);
    expect("tipoDeOrdem" in estado).toBe(false);
  });
});
