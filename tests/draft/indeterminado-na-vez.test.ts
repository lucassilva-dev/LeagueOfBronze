import { beforeEach, describe, expect, it, vi } from "vitest";

import type { EstadoDraft, JogadorDoDraft } from "@/lib/draft/motor";

/**
 * B1 (auditoria da retomada, 23/10) — a busca de viabilidade responde "indeterminado" quando
 * passa do orçamento de passos, e isso contava como "fecha". Depois de saídas do pool a poda
 * fica fraca e provar que um preço NÃO fecha estoura: o "indeterminado" mais barato era o que
 * a escolha automática levava — e podia ser justamente o que travava o draft depois.
 *
 * Regra de agora: com algum candidato PROVADO, só os provados contam (lista da vez e escolha
 * automática). Sem nenhum provado, os indeterminados continuam valendo — o comportamento de
 * antes, que nunca trava uma edição grande demais para a busca.
 *
 * A busca é trocada por uma resposta fixa para isolar a regra: levar o P1 (1 ponto) é
 * "indeterminado"; qualquer outro, a resposta de `resposta.outros`.
 */

const resposta = vi.hoisted(() => ({ outros: "fecha" as "fecha" | "nao_fecha" | "indeterminado" }));

vi.mock("@/lib/draft/viabilidade", async () => {
  const real = await vi.importActual<typeof import("@/lib/draft/viabilidade")>("@/lib/draft/viabilidade");
  return {
    ...real,
    elencosFecham: (_times: unknown, custos: readonly number[]) => (custos.includes(1) ? resposta.outros : "indeterminado"),
  };
});

const { escolhiveisDaVez, iniciarDraft, maisBaratoValido, montarDraft } = await import("@/lib/draft/motor");

const j = (id: string, pontos: number): JogadorDoDraft => ({
  id,
  riotId: `${id.toUpperCase()}#BR1`,
  pontos,
  rota1: "MID",
  rota2: "TOP",
  elo: "Prata",
  timeId: null,
});

function draft(): EstadoDraft {
  return iniciarDraft(
    montarDraft({
      times: [
        { id: "a", nome: "A", cor: "#fff", capitaoId: "ca" },
        { id: "b", nome: "B", cor: "#fff", capitaoId: "cb" },
      ],
      jogadores: [j("ca", 3), j("cb", 3), j("p1", 1), j("p2", 2), j("p3", 5), j("p4", 2)],
      jogadoresPorTime: 3,
      orcamentoPorTime: 20,
      segundosPorEscolha: 60,
    }),
    0,
  );
}

beforeEach(() => {
  resposta.outros = "fecha";
});

describe("o «indeterminado» na vez", () => {
  it("com um candidato provado, a escolha automática NÃO leva o indeterminado mais barato", () => {
    expect(maisBaratoValido(draft(), "a")?.id).toBe("p2");
  });

  it("com um candidato provado, a lista da vez não oferece o indeterminado", () => {
    expect(escolhiveisDaVez(draft()).sort()).toEqual(["p2", "p3", "p4"]);
  });

  it("sem nenhum provado, o indeterminado continua valendo: o draft nunca trava por causa da busca", () => {
    resposta.outros = "indeterminado";
    expect(maisBaratoValido(draft(), "a")?.id).toBe("p1");
    expect(escolhiveisDaVez(draft()).sort()).toEqual(["p1", "p2", "p3", "p4"]);
  });

  it("e o que a busca provou que não fecha continua fora", () => {
    resposta.outros = "nao_fecha";
    expect(maisBaratoValido(draft(), "a")?.id).toBe("p1");
    expect(escolhiveisDaVez(draft())).toEqual(["p1"]);
  });
});
