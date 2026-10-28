import c from "@/components/times/cenarios/chamada.module.css";
import type { CenarioDoTema } from "@/components/times/cenarios/tipos";

/**
 * Os 5 Sem Ping — «A Call que Nunca Cai»: a videochamada do time de madrugada.
 *
 * BASE: só o registro do cenário (lib/temas/os-5-sem-ping.ts pede `cenario: "chamada"`). As peças e o
 * CSS de verdade chegam com a implementação do tema.
 */
export const CHAMADA: CenarioDoTema = {
  Fundo: () => null,
  Moldura: () => null,
  AtrasDoEscudo: () => null,
  Chao: () => null,
  Insignia: () => null,
  InsigniaMini: () => null,
  classes: c,
};
