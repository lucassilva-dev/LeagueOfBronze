import c from "@/components/times/cenarios/academia.module.css";
import type { CenarioDoTema } from "@/components/times/cenarios/tipos";

/**
 * Fãs de Rosca Esporte Clube — «Dia de Braço»: a academia do time às 6h, com anilhas de rosquinha.
 *
 * BASE: só o registro do cenário (lib/temas/fas-de-rosca-esporte-clube.ts pede `cenario: "academia"`). As peças e o
 * CSS de verdade chegam com a implementação do tema.
 */
export const ACADEMIA: CenarioDoTema = {
  Fundo: () => null,
  Moldura: () => null,
  AtrasDoEscudo: () => null,
  Chao: () => null,
  Insignia: () => null,
  InsigniaMini: () => null,
  classes: c,
};
