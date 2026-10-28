import c from "@/components/times/cenarios/picadeiro.module.css";
import type { CenarioDoTema } from "@/components/times/cenarios/tipos";

/**
 * Desorganização — «O Circo da Desorganização»: o picadeiro do leão coroado.
 *
 * BASE: só o registro do cenário (lib/temas/desorganizacao.ts pede `cenario: "picadeiro"`). As peças e o
 * CSS de verdade chegam com a implementação do tema.
 */
export const PICADEIRO: CenarioDoTema = {
  Fundo: () => null,
  Moldura: () => null,
  AtrasDoEscudo: () => null,
  Chao: () => null,
  Insignia: () => null,
  InsigniaMini: () => null,
  classes: c,
};
