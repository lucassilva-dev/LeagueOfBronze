import type { CSSProperties } from "react";

import a from "@/components/times/cenarios/academia.module.css";
import af from "@/components/times/cenarios/academia-ficha.module.css";
import {
  ArcosDaRosca,
  Barrinha,
  BrilhoDeQuatroPontas,
  FitaMetrica,
  HalterDeOuro,
  HalterMini,
  MaosDeMagnesio,
  MuroPintado,
  Relogio,
} from "@/components/times/cenarios/ornamentos-academia";
import type { CenarioDoTema } from "@/components/times/cenarios/tipos";

/**
 * A poeira de magnésio nos raios: x, y, diâmetro (px), duração (s), atraso NEGATIVO, deriva x/y (px).
 * Seis grãos que cobrem os três raios (o celular fica com os 3 primeiros: academia.module.css).
 */
const POEIRA: readonly (readonly [string, string, number, number, number, number, number])[] = [
  ["8%", "22%", 3, 18, -3, 60, 120],
  ["35%", "18%", 3, 16, -6, 70, 140],
  ["58%", "26%", 4, 19, -2, 40, 170],
  ["74%", "20%", 3, 17, -12, 50, 150],
  ["90%", "28%", 3, 24, -16, 40, 120],
  ["14%", "52%", 2, 18, -7, 60, 100],
];

/** A nuvem de magnésio da palma: centro x/y (% da nuvem), diâmetro (% da nuvem), deriva final x/y. */
const NUVENS: readonly (readonly [string, string, string, string, string])[] = [
  ["50%", "40%", "46%", "-8%", "-6%"],
  ["30%", "55%", "40%", "-14%", "4%"],
  ["70%", "55%", "40%", "12%", "4%"],
  ["40%", "75%", "36%", "-6%", "10%"],
  ["62%", "74%", "34%", "8%", "10%"],
];

/** As lascas de giz que voam na palma: deslocamento final x/y (px). Uma vez. */
const LASCAS: readonly (readonly [number, number])[] = [
  [-90, -60],
  [-60, -90],
  [-20, -110],
  [30, -100],
  [70, -70],
  [95, -40],
];

/** O suor que voa do bíceps no alto da rosca: origem x/y (% do escudo), deriva x/y (% do escudo), giro. */
const SUOR: readonly (readonly [string, string, string, string, string])[] = [
  ["38%", "48%", "-34%", "-30%", "-30deg"],
  ["46%", "44%", "-12%", "-44%", "-8deg"],
  ["52%", "55%", "22%", "-26%", "24deg"],
  ["30%", "52%", "-40%", "-6%", "-50deg"],
];

/**
 * Cenário "academia" — FÃS DE ROSCA ESPORTE CLUBE, «Dia de Braço»: a academia do time às 6h. A
 * câmera endireita (o celular nivelando), a fita métrica corre pelo teto, os basculantes clareiam
 * e os raios de sol entram com a poeira de magnésio. O escudo bate o magnésio, faz a ROSCA
 * DIRETA (sobe, segura tremendo, assenta) e dá um pump; o suor voa e o bíceps brilha. FÃS DE e
 * ROSCA são rosquinha com glacê de morango e granulado, letra por letra, inflando; o «esporte
 * clube» carrega a barrinha com duas anilhas de rosca. O elenco são crachás de sócio no gancho
 * (o capitão, o PERSONAL, no crachá black pendurado no halter de ouro); a cartela é o saco de
 * pão do pós-treino com o adesivo TÁ PAGO; a ficha é a selfie no espelho da academia.
 */
export const ACADEMIA: CenarioDoTema = {
  classes: a,
  classesDaFicha: af,
  Fundo: () => (
    <>
      <div className={a.enfParede} />
      <div className={a.enfJanelas}>
        {[0, 1, 2, 3].map((k) => (
          <span key={k} className={a.enfJanela} />
        ))}
      </div>
      <div className={a.enfRaios} />
      <div className={a.enfPoeira}>
        {POEIRA.map(([x, y, d, dur, atraso, dx, dy]) => (
          <span
            key={`${x}-${y}`}
            className={a.enfPo}
            style={
              {
                "--x": x,
                "--y": y,
                "--d": `${d}px`,
                "--dur": `${dur}s`,
                "--atraso": `${atraso}s`,
                "--dx": `${dx}px`,
                "--dy": `${dy}px`,
              } as CSSProperties
            }
          />
        ))}
      </div>
      <div className={a.enfRelogio}>
        <Relogio />
      </div>
    </>
  ),
  // A fita métrica esticada no teto (sai da trena na borda esquerda) e a faixa de segurança rosa
  // da plataforma no pé do herói.
  Moldura: () => (
    <>
      <div className={a.enfFita} aria-hidden="true">
        <span className={a.enfTrena} />
        <span className={a.enfFitaTira}>
          <FitaMetrica />
        </span>
      </div>
      <span className={a.enfFaixaSeguranca} aria-hidden="true" />
    </>
  ),
  AtrasDoEscudo: () => (
    <>
      <span className={a.enfHaloEscudo} aria-hidden="true" />
      <div className={a.enfMagnesio} aria-hidden="true">
        {NUVENS.map(([x, y, d, dx, dy]) => (
          <span key={`${x}-${y}`} className={a.enfNuvem} style={{ "--x": x, "--y": y, "--d": d, "--dx": dx, "--dy": dy } as CSSProperties} />
        ))}
        {LASCAS.map(([dx, dy]) => (
          <span key={`${dx}-${dy}`} className={a.enfLasca} style={{ "--dx": `${dx}px`, "--dy": `${dy}px` } as CSSProperties} />
        ))}
      </div>
      <div className={a.enfArcos} aria-hidden="true">
        <ArcosDaRosca />
      </div>
    </>
  ),
  NoEscudo: () => (
    <>
      {SUOR.map(([sx, sy, dx, dy, r]) => (
        <span
          key={`${sx}-${sy}`}
          className={a.enfSuor}
          aria-hidden="true"
          style={{ "--sx": sx, "--sy": sy, "--dx": dx, "--dy": dy, "--r": r } as CSSProperties}
        />
      ))}
      <span className={a.enfBrilho} aria-hidden="true">
        <BrilhoDeQuatroPontas />
      </span>
    </>
  ),
  // O piso de borracha com granulado (sem espelho: o espelho é da RX), a sombra do escudo e a
  // marca de magnésio no chão.
  Chao: () => (
    <div className={a.enfPiso} aria-hidden="true">
      <span className={a.enfSombraEscudo} />
      <span className={a.enfMarcaMagnesio} />
    </div>
  ),
  Insignia: ({ className, id }) => <HalterDeOuro className={className} id={id} />,
  InsigniaMini: ({ className }) => <HalterMini className={className} />,
  TracoDoNome: ({ className }) => <Barrinha className={className} />,
  AtrasDoRetrato: () => (
    <>
      <MaosDeMagnesio />
      <span className={af.enfFlash} aria-hidden="true">
        <BrilhoDeQuatroPontas />
      </span>
    </>
  ),
  AtrasDoElenco: () => (
    <div className={a.enfMuro} aria-hidden="true">
      <MuroPintado />
    </div>
  ),
  // A mancha de gordura da rosca no papel do saco (o resto do saco é o .cartelaCorpo).
  NaCartela: () => <span className={a.enfMancha} aria-hidden="true" />,
};
