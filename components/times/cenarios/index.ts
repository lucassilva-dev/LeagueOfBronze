import { ACADEMIA } from "@/components/times/cenarios/academia";
import { ALBUM } from "@/components/times/cenarios/album";
import { BOTECO } from "@/components/times/cenarios/boteco";
import { CHAMADA } from "@/components/times/cenarios/chamada";
import { ESTACAO } from "@/components/times/cenarios/estacao";
import { ESTANDE } from "@/components/times/cenarios/estande";
import { PICADEIRO } from "@/components/times/cenarios/picadeiro";
import { TEMPESTADE } from "@/components/times/cenarios/tempestade";
import type { CenarioDoTema } from "@/components/times/cenarios/tipos";
import type { Cenario } from "@/lib/temas/tipos";

/** Os cenários prontos, pela chave que o tema pede (`tema.cenario`). */
export const CENARIOS: Readonly<Record<Cenario, CenarioDoTema>> = {
  tempestade: TEMPESTADE,
  estacao: ESTACAO,
  boteco: BOTECO,
  academia: ACADEMIA,
  album: ALBUM,
  estande: ESTANDE,
  chamada: CHAMADA,
  picadeiro: PICADEIRO,
};
