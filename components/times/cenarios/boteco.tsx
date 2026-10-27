import type { CSSProperties } from "react";

import b from "@/components/times/cenarios/boteco.module.css";
import bf from "@/components/times/cenarios/boteco-ficha.module.css";
import {
  BolachaDentada,
  CanecoCoroado,
  CanecoMini,
  GizNoNome,
  GizTatica,
  Letreiro,
  Luminaria,
} from "@/components/times/cenarios/ornamentos-boteco";
import type { CenarioDoTema } from "@/components/times/cenarios/tipos";
import { cx } from "@/components/times/util";

/** Bokeh das luzes do bar: x, y, diâmetro (px), cor, duração (s), atraso NEGATIVO, deriva x/y (px). */
const BOKEH: readonly (readonly [string, string, number, string, number, number, number, number])[] = [
  ["6%", "30%", 150, "255 196 110", 18, -3, 16, -12],
  ["93%", "26%", 120, "61 139 255", 22, -9, -14, 10],
  ["14%", "74%", 190, "61 139 255", 24, -14, 18, -16],
  ["88%", "70%", 160, "255 196 110", 20, -6, -20, -10],
  ["30%", "16%", 70, "255 236 200", 16, -2, 12, 8],
  ["70%", "18%", 90, "255 196 110", 19, -11, -10, 12],
  ["40%", "88%", 110, "61 139 255", 23, -17, 14, -8],
  ["62%", "84%", 80, "255 236 200", 17, -5, -12, -10],
];

/** As bolhas do chope no caneco do pato: x (% da caixa do caneco), duração (s), atraso NEGATIVO. */
const BOLHAS_DO_CANECO: readonly (readonly [string, number, number])[] = [
  ["22%", 2.4, -0.4],
  ["48%", 3.1, -1.7],
  ["70%", 2.7, -1.1],
  ["36%", 3.6, -2.6],
  ["60%", 2.9, -0.2],
];

/** Os respingos de espuma no TIM do brinde: ângulo (graus), distância (× escudo). Uma vez. */
const RESPINGOS: readonly (readonly [number, number])[] = [
  [-150, 0.13],
  [-120, 0.17],
  [-95, 0.15],
  [-70, 0.18],
  [-45, 0.12],
  [-20, 0.1],
];

/** Os jogadores na TV (pontinhos): y (%), duração (s), atraso NEGATIVO, cor, posição parada (movimento reduzido). */
const JOGADORES_NA_TV: readonly (readonly [string, number, number, string, string])[] = [
  ["30%", 7, -1.2, "#F2FAFF", "26cqi"],
  ["58%", 9, -4.4, "#FFD45E", "62cqi"],
  ["44%", 6, -2.8, "#F2FAFF", "44cqi"],
  ["70%", 8, -6.1, "#FFD45E", "78cqi"],
];

/** A TV do canto do bar (herói, ≥1024) e a TV da cartela: a mesma tela de jogo. */
function TelaDeJogo({ className }: Readonly<{ className?: string }>) {
  return (
    <div className={cx(b.enfTela, className)} aria-hidden="true">
      <span className={b.enfTelaPlacar} />
      {JOGADORES_NA_TV.map(([y, dur, atraso, cor, parado]) => (
        <span
          key={y}
          className={b.enfJogador}
          style={{ "--y": y, "--dur": `${dur}s`, "--atraso": `${atraso}s`, "--cor": cor, "--parado": parado } as CSSProperties}
        />
      ))}
      <span className={b.enfBola} />
      <span className={b.enfTelaLiga} />
    </div>
  );
}

/**
 * Cenário "boteco" — GALÁCTICOS DO BAR, «O Bar da Resenha»: noite de jogo no boteco do time. A
 * câmera entra pela porta, as luminárias âmbar acendem, a fita de LED corre pela prateleira de
 * garrafas azuis, o neon «Aqui é só RESENHA» dá uma faísca e acende e a TV do canto liga no jogo.
 * O escudo entra num BRINDE (sobe, TIM, assenta no balcão) e o nome enche de chope. O elenco é a
 * lousa tática com as bolachas de chope; a insígnia do capitão (o dono do caneco) é o caneco
 * coroado; a página fecha na TV do bar com a plaquinha «FIADO SÓ AMANHÃ».
 */
export const BOTECO: CenarioDoTema = {
  classes: b,
  classesDaFicha: bf,
  Fundo: () => (
    <>
      <div className={b.enfParede} />
      <div className={b.enfPrateleira}>
        <span className={b.enfLed} />
        <span className={b.enfReflexoGarrafas} />
      </div>
      <div className={b.enfBokehs}>
        {BOKEH.map(([x, y, d, cor, dur, atraso, dx, dy]) => (
          <span
            key={`${x}-${y}`}
            className={b.enfBokeh}
            style={
              {
                "--x": x,
                "--y": y,
                "--d": `${d}px`,
                "--cor": cor,
                "--dur": `${dur}s`,
                "--atraso": `${atraso}s`,
                "--dx": `${dx}px`,
                "--dy": `${dy}px`,
              } as CSSProperties
            }
          />
        ))}
      </div>
      <Luminaria className={cx(b.enfLuminaria, b.enfLuminariaEsq)} cone={b.enfCone} />
      <Luminaria className={cx(b.enfLuminaria, b.enfLuminariaDir)} cone={b.enfCone} />
    </>
  ),
  // O varal de flâmulas no teto (com as coroas e o GG das bandeiras da arte original) e a barra
  // listrada da camisa embaixo.
  Moldura: () => (
    <>
      <span className={b.enfVaral} aria-hidden="true" />
      <span className={b.enfFaixaCamisa} aria-hidden="true" />
    </>
  ),
  AtrasDoEscudo: () => (
    <>
      <span className={b.enfHaloEscudo} aria-hidden="true" />
      <Letreiro className={b.enfLetreiro} />
      <div className={b.enfTv} aria-hidden="true">
        <TelaDeJogo />
      </div>
    </>
  ),
  NoEscudo: () => (
    <>
      <span className={b.enfNeonMini} aria-hidden="true" />
      <span className={b.enfCaneco} aria-hidden="true">
        {BOLHAS_DO_CANECO.map(([x, dur, atraso]) => (
          <span
            key={x}
            className={b.enfBolha}
            style={{ "--x": x, "--dur": `${dur}s`, "--atraso": `${atraso}s` } as CSSProperties}
          />
        ))}
      </span>
      <span className={b.enfEspuma} aria-hidden="true" />
      <span className={b.enfGota} aria-hidden="true" />
      <span className={b.enfRespingos} aria-hidden="true">
        {RESPINGOS.map(([ang, dist]) => (
          <span key={ang} className={b.enfRespingo} style={{ "--ang": `${ang}deg`, "--dist": dist } as CSSProperties} />
        ))}
      </span>
      <span className={b.enfTim} aria-hidden="true" />
      <span className={b.enfAnelTim} aria-hidden="true" />
      <span className={b.enfBrilhoOculos} aria-hidden="true" />
    </>
  ),
  // O balcão de madeira onde o escudo pousa (sem espelho: o espelho é da RX).
  Chao: () => (
    <div className={b.enfBalcao} aria-hidden="true">
      <span className={b.enfSombraEscudo} />
      <span className={b.enfBrilhoBalcao} />
    </div>
  ),
  Insignia: ({ className, id }) => <CanecoCoroado className={className} id={id} />,
  InsigniaMini: ({ className }) => <CanecoMini className={className} />,
  TracoDoNome: ({ className }) => <GizNoNome className={className} />,
  AtrasDoRetrato: () => <BolachaDentada className={bf.enfBolacha} id="gdb-bolacha-retrato" />,
  AtrasDoElenco: () => (
    <div className={b.enfLousa} aria-hidden="true">
      <GizTatica className={b.enfGizTatica} />
    </div>
  ),
  NaCartela: () => <TelaDeJogo className={b.enfTelaCartela} />,
};
