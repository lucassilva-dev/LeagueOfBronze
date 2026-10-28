import c from "@/components/times/cenarios/estande.module.css";
import type { CenarioDoTema } from "@/components/times/cenarios/tipos";

/**
 * So ADC Bronze Clube — «A Mosca Intacta»: o estande de arco e flecha do clube ao fim da tarde.
 *
 * BASE: só o registro do cenário (lib/temas/so-adc-bronze-clube.ts pede `cenario: "estande"`). As peças e o
 * CSS de verdade chegam com a implementação do tema.
 */
export const ESTANDE: CenarioDoTema = {
  Fundo: () => null,
  Moldura: () => null,
  AtrasDoEscudo: () => null,
  Chao: () => null,
  Insignia: () => null,
  InsigniaMini: () => null,
  classes: c,
};
