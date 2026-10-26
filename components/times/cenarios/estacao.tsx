import type { CSSProperties } from "react";

import e from "@/components/times/cenarios/estacao.module.css";
import ef from "@/components/times/cenarios/estacao-ficha.module.css";
import {
  Crepita,
  FaixaDoNome,
  LuaDeQueijo,
  RodaAlada,
  RodaMini,
  SERRA,
} from "@/components/times/cenarios/ornamentos-estacao";
import type { CenarioDoTema } from "@/components/times/cenarios/tipos";
import { cx } from "@/components/times/util";

/** Vaga-lumes: x, y, duração (s), atraso NEGATIVO, deriva x/y (px). No celular, os 5 primeiros. */
const VAGA_LUMES: readonly (readonly [string, string, number, number, number, number])[] = [
  ["12%", "58%", 6.2, -1.4, 18, -14],
  ["24%", "76%", 7.4, -4.1, -12, -20],
  ["37%", "54%", 5.8, -2.6, 14, -10],
  ["51%", "82%", 8.0, -6.2, -16, -12],
  ["63%", "64%", 6.6, -0.8, 12, -18],
  ["74%", "56%", 7.0, -3.3, -14, -10],
  ["86%", "72%", 6.0, -5.0, 10, -16],
  ["93%", "50%", 7.8, -2.1, -10, -12],
];

/** Faíscas da freada, em leque a partir das rodas: ângulo (graus), distância (× escudo), duração, cor. */
const FAISCAS_DE_FREIO: readonly (readonly [number, number, number, string])[] = [
  [200, 0.36, 2.0, "#FFE9A6"],
  [214, 0.3, 2.1, "#3EE6F2"],
  [190, 0.25, 2.05, "#FFE9A6"],
  [226, 0.21, 2.15, "#3EE6F2"],
  [204, 0.15, 1.95, "#FFE9A6"],
  [-20, 0.17, 2.0, "#3EE6F2"],
  [-34, 0.26, 2.1, "#FFE9A6"],
  [-12, 0.29, 1.95, "#3EE6F2"],
  [-28, 0.36, 2.15, "#FFE9A6"],
  [-14, 0.4, 2.05, "#3EE6F2"],
];

/**
 * Cenário "estacao" — QUEIJO MINAS, «O Expresso da Lua de Queijo»: noite na serra mineira, a lua
 * de queijo nascendo atrás do escudo sobre os morros com igrejinhas, a maria-fumaça do escudo
 * chegando pelos trilhos e freando (faíscas, vapor, apito), o farol ciano acendendo e varrendo o
 * letreiro por baixo. O elenco é o trem; a insígnia do capitão (o maquinista) é a roda alada.
 */
export const ESTACAO: CenarioDoTema = {
  classes: e,
  classesDaFicha: ef,
  Fundo: () => (
    <>
      <div className={e.enfCeu} />
      <div className={e.enfEstrelas} />
      <div className={cx(e.enfEstrelas, e.enfEstrelasPisca)} />
      <div className={e.enfNeblina}>
        <div className={e.enfNeblinaFaixa} />
        <div className={cx(e.enfNeblinaFaixa, e.enfNeblinaFundo)} />
      </div>
      <div className={e.enfVagaLumes}>
        {VAGA_LUMES.map(([x, y, dur, atraso, dx, dy]) => (
          <span
            key={x}
            className={e.enfVagaLume}
            style={
              {
                "--x": x,
                "--y": y,
                "--dur": `${dur}s`,
                "--atraso": `${atraso}s`,
                "--dx": `${dx}px`,
                "--dy": `${dy}px`,
              } as CSSProperties
            }
          />
        ))}
      </div>
    </>
  ),
  // As faixas de latão rebitadas no lugar das barras de cinema (entram pelos lados).
  Moldura: () => (
    <>
      <span className={e.enfFaixaTopo} aria-hidden="true" />
      <span className={e.enfFaixaBase} aria-hidden="true" />
    </>
  ),
  AtrasDoEscudo: () => (
    <>
      <div className={e.enfLuaHalo} aria-hidden="true" />
      <LuaDeQueijo className={e.enfLua} id="qm-lua" />
      <div className={e.enfSerra} aria-hidden="true">
        <div className={e.enfSerraFundo}>
          <SERRA.Longe className={cx(e.enfSerraCamada, e.enfSerraLonge)} />
          <SERRA.Meio className={cx(e.enfSerraCamada, e.enfSerraMeio)} janelas={e.enfJanelas} />
          <SERRA.Perto className={cx(e.enfSerraCamada, e.enfSerraPerto)} />
        </div>
      </div>
      <span className={cx(e.enfVaporFreio, e.enfVaporEsq)} aria-hidden="true" />
      <span className={cx(e.enfVaporFreio, e.enfVaporDir)} aria-hidden="true" />
    </>
  ),
  NoEscudo: () => (
    <>
      <span className={e.enfFeixe} aria-hidden="true" />
      <span className={e.enfFlare} aria-hidden="true">
        <span className={e.enfRaiosFlare} />
      </span>
      <span className={e.enfBaforada} aria-hidden="true" />
      <span className={cx(e.enfBaforada, e.enfBaforada2)} aria-hidden="true" />
      <span className={cx(e.enfBaforada, e.enfBaforada3)} aria-hidden="true" />
      <span className={e.enfApito} aria-hidden="true" />
      <span className={cx(e.enfApito, e.enfApito2)} aria-hidden="true" />
      <span className={e.enfFaiscasDeFreio} aria-hidden="true">
        {FAISCAS_DE_FREIO.map(([ang, dist, dur, cor]) => (
          <span
            key={`${ang}-${dist}`}
            className={e.enfFaiscaDeFreio}
            style={{ "--ang": `${ang}deg`, "--dist": dist, "--dur": `${dur}s`, "--cor": cor } as CSSProperties}
          />
        ))}
      </span>
      <Crepita className={e.enfCrepita} />
    </>
  ),
  // Os trilhos ficam parados: quem chega é o trem.
  Chao: () => (
    <div className={e.enfTrilhos} aria-hidden="true">
      <div className={e.enfLeito}>
        <span className={e.enfBrilhoTrilho} />
      </div>
    </div>
  ),
  Insignia: ({ className, id }) => <RodaAlada className={className} id={id} />,
  InsigniaMini: ({ className }) => <RodaMini className={className} />,
  TracoDoNome: ({ className }) => <FaixaDoNome className={className} />,
  AtrasDoRetrato: () => <LuaDeQueijo className={ef.enfLuaRetrato} id="qm-lua-retrato" />,
};
