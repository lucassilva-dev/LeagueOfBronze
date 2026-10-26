import { ESTACAO } from "@/components/times/cenarios/estacao";
import { TEMPESTADE } from "@/components/times/cenarios/tempestade";
import type { CenarioDoTema } from "@/components/times/cenarios/tipos";
import type { Cenario } from "@/lib/temas/tipos";

/** Os cenários prontos, pela chave que o tema pede (`tema.cenario`). */
export const CENARIOS: Readonly<Record<Cenario, CenarioDoTema>> = {
  tempestade: TEMPESTADE,
  estacao: ESTACAO,
};
