import type { CSSProperties } from "react";

import { Raio } from "@/components/times/ornamentos";
import c from "@/components/times/cenario-tempestade.module.css";
import s from "@/components/times/tema.module.css";
import type { TemaDoTime } from "@/lib/temas/tipos";

/**
 * O fundo animado das páginas temáticas (time e jogador): céu, nuvens, feixes, o raio do fundo
 * e as faíscas, mais vinheta e grão. Inteiro aria-hidden: é cenário, não conteúdo. Fica
 * sticky atrás do conteúdo e acompanha a rolagem (tema.module.css, `.palco`).
 */

/** As faíscas: posição, duração, atraso NEGATIVO (já nascem espalhadas) e deriva. */
const FAISCAS: readonly [string, number, number, number][] = [
  ["8%", 5.2, -1.1, 18],
  ["19%", 6.4, -3.9, -12],
  ["31%", 4.6, -2.2, 22],
  ["44%", 7.0, -5.5, -8],
  ["57%", 5.6, -0.6, 14],
  ["66%", 4.9, -4.1, -20],
  ["74%", 6.8, -2.8, 10],
  ["83%", 5.1, -1.9, -16],
  ["91%", 6.1, -4.7, 12],
  ["37%", 5.8, -3.2, -6],
];

export function cx(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function Palco({ tema }: Readonly<{ tema: TemaDoTime }>) {
  return (
    <div className={s.palco} aria-hidden="true" data-cenario={tema.cenario}>
      <div className={s.enfCamera}>
        <div className={c.enfCeu} />
        <div className={c.enfNuvens}>
          <div className={c.enfNuvem} />
          <div className={cx(c.enfNuvem, c.enfNuvemFundo)} />
        </div>
        <div className={c.enfFeixe} style={{ "--x": "10%", "--ang": "-16deg", "--periodo": "13s" } as CSSProperties} />
        <div className={c.enfFeixe} style={{ "--x": "70%", "--ang": "18deg", "--periodo": "11s" } as CSSProperties} />
        <Raio className={cx(c.enfRaio, c.enfRaioB)} />
        <div className={s.enfFaiscas}>
          {FAISCAS.map(([x, dur, atraso, deriva]) => (
            <span
              key={x}
              className={s.enfFaisca}
              style={{ "--x": x, "--dur": `${dur}s`, "--atraso": `${atraso}s`, "--deriva": `${deriva}px` } as CSSProperties}
            />
          ))}
        </div>
      </div>
      <div className={s.enfVinheta} />
      <div className={s.enfGrao} />
    </div>
  );
}

/** As barras de cinema do herói: moram no padding dele e entram de fora (nunca sobre conteúdo). */
export function BarrasDeCinema() {
  return (
    <>
      <span className={s.enfBarraTopo} aria-hidden="true" />
      <span className={s.enfBarraBase} aria-hidden="true" />
    </>
  );
}
