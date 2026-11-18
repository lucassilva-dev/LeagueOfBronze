import type { CSSProperties } from "react";

import ef from "@/components/times/cenarios/estande-ficha.module.css";
import e from "@/components/times/cenarios/estande.module.css";
import {
  AlvoDaRaia,
  AlvoDoClube,
  FitaCortada,
  FlechaCravada,
  FlechaInteira,
  FlechaMini,
  Louro,
  LourosDaFlecha,
} from "@/components/times/cenarios/ornamentos-estande";
import type { CenarioDoTema } from "@/components/times/cenarios/tipos";
import { cx } from "@/components/times/util";

/** As nuvens da hora azul: x, y (% do palco), largura, altura, duração (s) da deriva. */
const NUVENS: readonly (readonly [string, string, string, string, number])[] = [
  ["8%", "30%", "38vw", "3.2vh", 80],
  ["58%", "22%", "30vw", "2.4vh", 95],
  ["36%", "46%", "44vw", "2.6vh", 70],
];

/** As lascas de palha que voam em cada impacto: ângulo (graus). Uma vez. */
const LASCAS = [-150, -116, -82, -48, -14] as const;

/** Uma flecha cravada: a ponta é o lugar do elemento; o voo e o tremor animam por dentro. */
function Flecha({ classe, id }: Readonly<{ classe: string; id: string }>) {
  return (
    <span className={cx(e.enfFlecha, classe)} aria-hidden="true">
      <span className={e.enfFlechaVoo}>
        <span className={e.enfFlechaHaste}>
          <FlechaCravada id={id} />
        </span>
      </span>
      <span className={e.enfFuro} />
      {LASCAS.map((a) => (
        <span key={a} className={e.enfLasca} style={{ "--a": `${a}deg` } as CSSProperties} />
      ))}
    </span>
  );
}

/**
 * Cenário "estande" — SO ADC BRONZE CLUBE, «A Mosca Intacta»: fim de tarde no estande de arco e
 * flecha do clube. O NOME fica no alto («So» em script, ADC de letreiro com extrusão de cobre,
 * BRONZE CLUBE em cima de uma flecha) e, embaixo, o alvo de palha com o ESCUDO no lugar da mosca.
 * Três flechas: uma no anel branco, uma na palha — e a terceira na mosca... do alvo da raia do lado
 * (≥1024; no celular ela passa reto). A mosca do clube segue intacta e brilha. O elenco são flechas
 * fincadas no gramado; o capitão, o ARQUEIRO-CHEFE, leva os louros com a flecha de ouro; a página
 * fecha na placa de bronze inaugurada, «MMR: ???».
 */
export const ESTANDE: CenarioDoTema = {
  classes: e,
  classesDaFicha: ef,
  Fundo: () => (
    <>
      <div className={e.enfCeu} />
      {NUVENS.map(([x, y, w, h, dur]) => (
        <span
          key={x}
          // ef.enfNuvem: a ficha (que leva o .raiz de estande-ficha) mostra só duas nuvens.
          className={cx(e.enfNuvem, ef.enfNuvem)}
          style={{ "--x": x, "--y": y, "--w": w, "--h": h, "--dur": `${dur}s` } as CSSProperties}
        />
      ))}
      <div className={e.enfSerra} />
      <div className={e.enfMata} />
    </>
  ),
  // A rajada de flechinhas no alto e a linha de tiro pintada embaixo.
  Moldura: () => (
    <>
      <span className={e.enfRajada} aria-hidden="true" />
      <span className={e.enfLinhaDeTiro} aria-hidden="true" />
    </>
  ),
  AtrasDoEscudo: () => (
    <>
      <span className={e.enfContraluz} aria-hidden="true" />
      <div className={cx(e.enfVizinho, e.enfVizinhoEsq)} aria-hidden="true">
        <AlvoDaRaia id="sa-raia-1" />
      </div>
      <div className={cx(e.enfVizinho, e.enfVizinhoDir)} aria-hidden="true">
        <AlvoDaRaia id="sa-raia-3" />
      </div>
      <div className={e.enfBiruta} aria-hidden="true">
        <span className={e.enfBirutaSaco} />
      </div>
      <div className={e.enfAlvo} aria-hidden="true">
        <AlvoDoClube id="sa-alvo" />
      </div>
      <Flecha classe={e.enfFlecha1} id="sa-flecha-1" />
      <Flecha classe={e.enfFlecha2} id="sa-flecha-2" />
      <Flecha classe={e.enfFlecha3} id="sa-flecha-3" />
      <span className={e.enfFlechaPerdida} aria-hidden="true">
        <span className={e.enfFlechaPerdidaVoo}>
          <FlechaInteira id="sa-flecha-perdida" />
        </span>
      </span>
    </>
  ),
  // A mosca intacta: o brilho na estrela do escudo.
  NoEscudo: () => <span className={e.enfBrilhoMosca} aria-hidden="true" />,
  // O gramado onde o cavalete pisa (sem espelho nem trilho nem balcão).
  Chao: () => <div className={e.enfGramado} aria-hidden="true" />,
  Insignia: ({ className, id }) => <LourosDaFlecha className={className} id={id} />,
  InsigniaMini: ({ className }) => <FlechaMini className={className} />,
  // A flecha embaixo do BRONZE CLUBE.
  TracoDoNome: ({ className }) => (
    <span className={className} aria-hidden="true">
      <FlechaInteira id="sa-flecha-do-nome" />
    </span>
  ),
  // As duas flechas cruzadas atrás da foto oficial (como as do escudo).
  AtrasDoRetrato: () => (
    <div className={ef.enfCruzadas} aria-hidden="true">
      <span className={cx(ef.enfCruzada, ef.enfCruzadaA)}>
        <span className={ef.enfCruzadaVoo}>
          <FlechaInteira id="sa-cruzada-a" />
        </span>
      </span>
      <span className={cx(ef.enfCruzada, ef.enfCruzadaB)}>
        <span className={ef.enfCruzadaVoo}>
          <FlechaInteira id="sa-cruzada-b" cor="#e2505f" />
        </span>
      </span>
    </div>
  ),
  // O gramado da raia atrás das flechas do elenco.
  AtrasDoElenco: () => <div className={e.enfCampo} aria-hidden="true" />,
  // O relevo da placa de bronze: os louros e as duas pontas da fita cortada.
  NaCartela: () => (
    <div className={e.enfPlaca} aria-hidden="true">
      <Louro className={cx(e.enfLouro, e.enfLouroEsq)} />
      <Louro className={cx(e.enfLouro, e.enfLouroDir)} />
      <span className={cx(e.enfFita, e.enfFitaEsq)}>
        <FitaCortada cor="#ff6b7a" />
      </span>
      <span className={cx(e.enfFita, e.enfFitaDir)}>
        <FitaCortada cor="#e2505f" />
      </span>
    </div>
  ),
};
