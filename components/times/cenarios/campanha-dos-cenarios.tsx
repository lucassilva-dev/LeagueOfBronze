import type { ReactNode } from "react";

import academia from "@/components/times/cenarios/academia-campanha.module.css";
import album from "@/components/times/cenarios/album-campanha.module.css";
import boteco from "@/components/times/cenarios/boteco-campanha.module.css";
import chamada from "@/components/times/cenarios/chamada-campanha.module.css";
import estacao from "@/components/times/cenarios/estacao-campanha.module.css";
import estande from "@/components/times/cenarios/estande-campanha.module.css";
import { BarrasDeSinal } from "@/components/times/cenarios/ornamentos-chamada";
import { LuaDeQueijo } from "@/components/times/cenarios/ornamentos-estacao";
import picadeiro from "@/components/times/cenarios/picadeiro-campanha.module.css";
import tempestade from "@/components/times/cenarios/tempestade-campanha.module.css";
import { cx } from "@/components/times/util";
import type { Cenario } from "@/lib/temas/tipos";

/**
 * A CAMPANHA da ficha (components/times/campanha.tsx) com a cara de cada cenário: os GANCHOS
 * (cenarios/<cenario>-campanha.module.css — `.raiz .peca`, a classe com o nome da peça da base
 * campanha.module.css; o `.raiz` vai na raiz da ficha) e o enfeite `NaCampanha` (primeiro filho da
 * seção, aria-hidden, sem texto).
 *
 * Fica FORA do objeto do cenário (CENARIOS) de propósito: CENARIOS também é importado pela página
 * do time (pagina-do-time-com-tema.tsx) e pelo palco, que não mostram a campanha — com os módulos
 * aqui dentro, toda página de time baixava os ~24 KB (gzip) de CSS da campanha dos 8 times. Só a
 * ficha (ficha-do-jogador-com-tema.tsx) importa este registro.
 */
export type CampanhaDoCenario = Readonly<{
  /** Os ganchos: classes com o nome das peças da campanha. */
  classes: Readonly<Record<string, string>>;
  /** O cenário atrás da campanha. Enfeite: aria-hidden, sem texto. */
  NaCampanha?: () => ReactNode;
}>;

export const CAMPANHA_DOS_CENARIOS: Readonly<Record<Cenario, CampanhaDoCenario>> = {
  // O filme em cartaz (claquete, película, letreiro): duas tiras de película correndo nas bordas
  // (só nas telas largas).
  tempestade: {
    classes: tempestade,
    NaCampanha: () => (
      <div className={tempestade.enfPeliculas} aria-hidden="true">
        <span className={cx(tempestade.enfPelicula, tempestade.enfPeliculaEsq)} />
        <span className={cx(tempestade.enfPelicula, tempestade.enfPeliculaDir)} />
      </div>
    ),
  },
  // O diário de bordo (bilhetes na linha férrea, placas, etiquetas de mala): atrás, a lua de queijo
  // nascendo por trás das placas.
  estacao: {
    classes: estacao,
    NaCampanha: () => (
      <div className={estacao.enfCeuDaCampanha} aria-hidden="true">
        <span className={estacao.enfLuaDaCampanha}>
          <LuaDeQueijo id="qm-lua-campanha" />
        </span>
      </div>
    ),
  },
  // A lousa do bar com as bolachas, as comandas penduradas, a TV e o cardápio a giz.
  boteco: {
    classes: boteco,
    NaCampanha: () => <div className={boteco.enfLousa} aria-hidden="true" />,
  },
  // O quadro de recordes, a ficha na prancheta, o cronômetro e as anilhas de rosca: atrás, o painel
  // perfurado da parede de equipamentos.
  academia: {
    classes: academia,
    NaCampanha: () => <div className={academia.enfPainel} aria-hidden="true" />,
  },
  // As páginas e as figurinhas do álbum (o palco do álbum já fica atrás da seção).
  album: { classes: album },
  // A caderneta de tiro (o céu e a mata do palco já ficam atrás da seção).
  estande: { classes: estande },
  // A segunda janela da call, o histórico: a janela de vidro e a pílula de gravação (a bolinha
  // vermelha e as barras de sinal), no prumo do status do herói.
  chamada: {
    classes: chamada,
    NaCampanha: () => (
      <>
        <span className={chamada.enfHistorico} aria-hidden="true" />
        <span className={chamada.enfGravando} aria-hidden="true">
          <span className={chamada.enfRec} />
          <BarrasDeSinal className={chamada.enfBarrasHistorico} />
        </span>
      </>
    ),
  },
  // O PROGRAMA do espetáculo: atrás da folha, a poça de luz quente e os dois canhões de luz varrendo
  // o título.
  picadeiro: {
    classes: picadeiro,
    NaCampanha: () => (
      <span className={picadeiro.enfHolofotes} aria-hidden="true">
        <span className={cx(picadeiro.enfFacho, picadeiro.enfFachoEsq)} />
        <span className={cx(picadeiro.enfFacho, picadeiro.enfFachoDir)} />
      </span>
    ),
  },
};
