import type { CSSProperties } from "react";

import a from "@/components/times/cenarios/album.module.css";
import af from "@/components/times/cenarios/album-ficha.module.css";
import {
  Brilho4,
  BrilhoNoSelo,
  CincoF,
  Pacotinho,
  RotuloDaVaga,
  SeloBrilhante,
  VersoDeFigurinha,
} from "@/components/times/cenarios/ornamentos-album";
import type { CenarioDoTema } from "@/components/times/cenarios/tipos";
import { cx } from "@/components/times/util";

/** O estouro quando a figurinha cola (uma vez): x, y (% do escudo), lado (px), deriva x/y (px). */
const ESTOURO: readonly (readonly [string, string, number, number, number])[] = [
  ["2%", "2%", 26, -14, -14],
  ["98%", "2%", 30, 14, -14],
  ["98%", "98%", 22, 14, 14],
  ["2%", "98%", 26, -14, 14],
  ["50%", "-1%", 18, 0, -18],
  ["50%", "101%", 18, 0, 18],
];

/**
 * Os brilhos que piscam na figurinha, em cantos opostos: x, y, lado (px), atraso (s). Período COMUM de
 * 4,8 s com o pico a 82% do ciclo (atraso = pico − 3,936 s): o primeiro aos 2,4 s, o segundo aos 3,6 s,
 * e daí a cada 4,8 s cada um — nunca os dois no mesmo segundo. Dois em toda largura (o orçamento de
 * laços infinitos do herói é 4: o aro, a faixa e estes dois).
 */
const BRILHOS: readonly (readonly [string, string, number, number])[] = [
  ["97%", "4%", 30, -1.536],
  ["3%", "95%", 22, -0.336],
];

/**
 * Cenário "album" — OS 5 FURIOSOS, «A Figurinha Brilhante»: a página do time no álbum de figurinhas,
 * de noite, debaixo do abajur. A folha anterior vira; o pôster (a FOTO DO TIME) desce da mão e cola na
 * vaga impressa, torta, soltando brilhos — o aro holográfico gira, uma faixa arco-íris atravessa; o
 * pacotinho rasgado mostra os versos; «OS 5» e as letras de FURIOSOS são colados no tapa (bafo). O
 * elenco são as figurinhas 5F 2–6 coladas nas vagas; o capitão é a BRILHANTE; a página fecha no
 * pacotinho «nas bancas» com o selo SABOR MEIO ROXO.
 */
export const ALBUM: CenarioDoTema = {
  classes: a,
  classesDaFicha: af,
  Fundo: () => (
    <>
      <div className={a.enfPagina} />
      <div className={a.enfRaios} />
      <div className={a.enfReticula} />
      <CincoF className={a.enfCincoF} />
      <div className={a.enfLuz} />
      <div className={a.enfFolhaSombra} />
      <div className={a.enfFolha} />
    </>
  ),
  // O picote da margem do álbum em cima e a fita holográfica colada embaixo.
  Moldura: () => (
    <>
      <span className={a.enfPicote} aria-hidden="true" />
      <span className={a.enfFitaHolo} aria-hidden="true" />
    </>
  ),
  AtrasDoEscudo: () => (
    <>
      <span className={a.enfHalo} aria-hidden="true" />
      <span className={a.enfVaga} aria-hidden="true" />
      <RotuloDaVaga className={a.enfRotuloVaga} />
      <Pacotinho className={a.enfPacote} id="furiosos-pacote" />
    </>
  ),
  NoEscudo: () => (
    <>
      <span className={a.enfAro} aria-hidden="true">
        <span className={a.enfAroGira} />
      </span>
      <span className={a.enfPapel} aria-hidden="true" />
      <span className={a.enfBafo} aria-hidden="true" />
      <span className={a.enfFaixa} aria-hidden="true" />
      <span className={a.enfVerniz} aria-hidden="true" />
      {ESTOURO.map(([x, y, t, dx, dy]) => (
        <span
          key={`estouro-${x}-${y}`}
          className={a.enfEstouro}
          aria-hidden="true"
          style={{ "--x": x, "--y": y, "--t": `${t}px`, "--dx": `${dx}px`, "--dy": `${dy}px` } as CSSProperties}
        />
      ))}
      {BRILHOS.map(([x, y, t, atraso]) => (
        <span
          key={`brilho-${x}-${y}`}
          className={a.enfBrilho}
          aria-hidden="true"
          style={{ "--x": x, "--y": y, "--t": `${t}px`, "--atraso": `${atraso}s` } as CSSProperties}
        />
      ))}
    </>
  ),
  // A sombra da figurinha no papel (longe na mão, encostada depois de colar).
  Chao: () => <span className={a.enfSombra} aria-hidden="true" />,
  Insignia: ({ className, id }) => <SeloBrilhante className={className} id={id} />,
  InsigniaMini: ({ className }) => <Brilho4 className={className} />,
  TracoDoNome: ({ className }) => <BrilhoNoSelo className={className} />,
  // As duas repetidas abertas em leque e a vaga do retrato (de trás para a frente).
  AtrasDoRetrato: () => (
    <>
      <VersoDeFigurinha className={cx(af.enfRepetida, af.enfRepetida1)} id="furiosos-repetida-1" />
      <VersoDeFigurinha className={cx(af.enfRepetida, af.enfRepetida2)} id="furiosos-repetida-2" />
      <span className={af.enfVagaRetrato} aria-hidden="true" />
    </>
  ),
  NaCartela: () => (
    <>
      <span className={a.enfBrilhoPacote} aria-hidden="true" />
      <span className={a.enfPicotePacote} aria-hidden="true" />
      <span className={a.enfRotuloPacote} aria-hidden="true" />
    </>
  ),
};
