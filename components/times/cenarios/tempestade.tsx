import type { CSSProperties } from "react";

import type { CenarioDoTema } from "@/components/times/cenarios/tipos";
import c from "@/components/times/cenarios/tempestade.module.css";
import { Coroa, CoroaMini, Lascas, Raio, TracoDePincel } from "@/components/times/ornamentos";
import s from "@/components/times/tema.module.css";
import { cx } from "@/components/times/util";

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

/**
 * Cenário "tempestade" — Equipe RX, «A Coroa Elétrica»: céu de tempestade com nuvens, feixes e
 * faíscas; um raio que acerta a coroa gigante atrás do escudo, lascas azuis dos lados, o aro de
 * neon e o chão espelhado. A insígnia do capitão é a coroa do escudo. O CSS das peças comuns
 * (aro, ondas, chão, faíscas, barras) continua em tema.module.css.
 */
export const TEMPESTADE: CenarioDoTema = {
  Fundo: () => (
    <>
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
    </>
  ),
  // As barras de cinema: moram no padding do herói e entram de fora (nunca sobre conteúdo).
  Moldura: () => (
    <>
      <span className={s.enfBarraTopo} aria-hidden="true" />
      <span className={s.enfBarraBase} aria-hidden="true" />
    </>
  ),
  AtrasDoEscudo: () => (
    <>
      {/* A coroa gigante que acende com o raio, o clarão e as lascas; o aro, o arco e as ondas. */}
      <Coroa className={c.enfCoroa} id="tm-coroa-gigante" />
      <Raio className={cx(c.enfRaio, c.enfRaioA)} />
      <div className={c.enfClarao} aria-hidden="true" />
      <Lascas className={cx(c.enfLascas, c.enfLascasEsq)} id="tm-lascas-esq" />
      <Lascas className={cx(c.enfLascas, c.enfLascasDir)} id="tm-lascas-dir" />
      <div className={s.enfAro} aria-hidden="true" />
      <div className={s.enfArco} aria-hidden="true" />
      <div className={cx(s.enfOnda, s.enfOnda1)} aria-hidden="true" />
      <div className={cx(s.enfOnda, s.enfOnda2)} aria-hidden="true" />
    </>
  ),
  // O chão espelhado: o horizonte (flare) na base do escudo, o reflexo e a grade.
  Chao: ({ imagem }) => (
    <div className={s.enfChao} aria-hidden="true">
      <div className={s.enfHorizonte} />
      {imagem ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className={s.enfReflexo} src={imagem} alt="" width={512} height={512} />
      ) : null}
      <div className={s.enfGrade} />
    </div>
  ),
  Insignia: ({ className, id }) => <Coroa className={className} id={id} />,
  InsigniaMini: ({ className }) => <CoroaMini className={className} />,
  TracoDoNome: ({ className }) => <TracoDePincel className={className} />,
};
