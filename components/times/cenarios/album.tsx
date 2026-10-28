import c from "@/components/times/cenarios/album.module.css";
import type { CenarioDoTema } from "@/components/times/cenarios/tipos";

/**
 * Os 5 Furiosos — «A Figurinha Brilhante»: a página do time no álbum de figurinhas.
 *
 * BASE: só o registro do cenário (lib/temas/os-5-furiosos.ts pede `cenario: "album"`). As peças e o
 * CSS de verdade chegam com a implementação do tema.
 */
export const ALBUM: CenarioDoTema = {
  Fundo: () => null,
  Moldura: () => null,
  AtrasDoEscudo: () => null,
  Chao: () => null,
  Insignia: () => null,
  InsigniaMini: () => null,
  classes: c,
};
