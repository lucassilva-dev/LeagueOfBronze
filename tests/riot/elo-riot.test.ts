import { describe, expect, it } from "vitest";

import { pontosDoElo } from "@/lib/inscricoes/schema";
import { eloDaRiot } from "@/lib/riot/elo";

/**
 * O tier que a Riot devolve vira o rótulo do site, e o rótulo vira o preço no draft.
 *
 * O `resolveElo` do site devolve `null` para metade dos tiers da Riot (IRON, SILVER,
 * EMERALD, GRANDMASTER, CHALLENGER). Se o robô usasse ele, um jogador Esmeralda na Riot
 * travaria a ficha — por isso o mapa é explícito, e é este teste que o segura.
 */
describe("tier da Riot → elo do site", () => {
  const ESPERADO: [string, string, number][] = [
    ["IRON", "Ferro", 1],
    ["BRONZE", "Bronze", 2],
    ["SILVER", "Prata", 3],
    ["GOLD", "Ouro", 4],
    ["PLATINUM", "Platina", 5],
    ["EMERALD", "Esmeralda", 6],
    ["DIAMOND", "Diamante", 8],
    ["MASTER", "Mestre", 10],
    ["GRANDMASTER", "Grão-Mestre", 12],
    ["CHALLENGER", "Desafiante", 15],
  ];

  it.each(ESPERADO)("%s vira %s e vale %i pontos", (tier, rotulo, pontos) => {
    expect(eloDaRiot(tier)).toBe(rotulo);
    expect(pontosDoElo(eloDaRiot(tier)!)).toBe(pontos);
  });

  it("aceita caixa e espaço diferentes, como a Riot às vezes manda", () => {
    expect(eloDaRiot(" emerald ")).toBe("Esmeralda");
  });

  it("tier desconhecido ou vazio é nulo — nunca um elo inventado", () => {
    expect(eloDaRiot("UNRANKED")).toBeNull();
    expect(eloDaRiot("")).toBeNull();
    expect(eloDaRiot(null)).toBeNull();
  });
});
