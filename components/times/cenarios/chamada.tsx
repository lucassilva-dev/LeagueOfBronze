import type { CSSProperties } from "react";

import chf from "@/components/times/cenarios/chamada-ficha.module.css";
import ch from "@/components/times/cenarios/chamada.module.css";
import {
  BarrasDeSinal,
  BrilhoLente,
  Check,
  Estrela,
  Fone,
  IconeCamera,
  IconeMicrofone,
  IconeTela,
  LequeWifi,
  OculosMini,
  OculosPixel,
} from "@/components/times/cenarios/ornamentos-chamada";
import type { CenarioDoTema } from "@/components/times/cenarios/tipos";
import { cx } from "@/components/times/util";

/** As outras câmeras da call, fora de foco: x, y (% do palco), largura (vw), falando? */
const TELAS: readonly (readonly [string, string, number, boolean])[] = [
  ["2%", "14%", 11, false],
  ["88%", "10%", 10, true],
  ["6%", "62%", 12, false],
  ["86%", "58%", 11, false],
  ["24%", "86%", 10, true],
  ["64%", "82%", 12, false],
  ["44%", "4%", 9, false],
];

/**
 * Cenário "chamada" — OS 5 SEM PING, «A Call que Nunca Cai»: a call de madrugada do time, todo
 * mundo de câmera ligada. O herói inteiro é a câmera do anfitrião (a janela com o anel verde de
 * quem fala, o status com ping e barras, os controles embaixo). A entrada TRAVA de propósito: o
 * escudo pula em degraus deixando fantasmas, o ping marca 999 ms em vermelho, as letras chegam
 * como pacotes fora de ordem; aos 900 ms conecta (0 ms, ✓, o anel e o leque de Wi-Fi acendem) e
 * o poro bota os óculos pixelados. O elenco é a galeria de câmeras, o capitão é o ADM DA CALL (os
 * óculos pixelados caem na carta dele) e a página fecha na "chamada encerrada", com cinco estrelas.
 */
export const CHAMADA: CenarioDoTema = {
  classes: ch,
  classesDaFicha: chf,
  Fundo: () => (
    <>
      <div className={ch.enfParede} />
      <div className={ch.enfDesfocadas}>
        {TELAS.map(([x, y, w, fala]) => (
          <span
            key={`${x}-${y}`}
            className={cx(ch.enfCamDesfocada, fala && ch.enfCamFalando)}
            style={{ "--x": x, "--y": y, "--w": `${w}vw` } as CSSProperties}
          />
        ))}
      </div>
    </>
  ),
  // A janela da câmera do anfitrião, o anel de quem fala, o status e os controles da call.
  Moldura: () => (
    <>
      <span className={ch.enfJanela} aria-hidden="true" />
      <span className={ch.enfFala} aria-hidden="true" />
      <span className={ch.enfStatus} aria-hidden="true">
        <span className={ch.enfRodinha} />
        <Check className={ch.enfCheck} />
        <span className={ch.enfPing} />
        <BarrasDeSinal className={ch.enfBarrasStatus} />
      </span>
      <span className={ch.enfControles} aria-hidden="true">
        <span className={ch.enfBotao}>
          <IconeMicrofone />
        </span>
        <span className={ch.enfBotao}>
          <IconeCamera />
        </span>
        <span className={ch.enfBotao}>
          <IconeTela />
        </span>
        <span className={cx(ch.enfBotao, ch.enfDesliga)}>
          <Fone />
        </span>
      </span>
    </>
  ),
  AtrasDoEscudo: () => (
    <>
      <span className={ch.enfHalo} aria-hidden="true" />
      <span className={ch.enfLuzRosa} aria-hidden="true" />
      <LequeWifi className={ch.enfLeque} />
    </>
  ),
  // Andam com o escudo: os óculos pixelados que caem no poro e o ✦ na lente.
  NoEscudo: () => (
    <>
      <OculosPixel className={ch.enfOculos} />
      <BrilhoLente className={ch.enfBrilhoLente} />
    </>
  ),
  // Os fantasmas do lag: duas cópias do escudo, atrás dele, onde ele estava antes de cada degrau.
  Chao: ({ imagem }) =>
    imagem ? (
      <span className={ch.enfFantasmas} aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className={cx(ch.enfFantasma, ch.enfFantasma1)} src={imagem} alt="" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className={cx(ch.enfFantasma, ch.enfFantasma2)} src={imagem} alt="" />
      </span>
    ) : null,
  // A posição vem da base (coroaDoCapitao/coroaDoRetrato); o SVG é enfeite e leva a classe dos
  // dois módulos: cai pela rolagem na carta e pelo relógio na ficha.
  Insignia: ({ className }) => (
    <span className={className} aria-hidden="true">
      <OculosPixel className={cx(ch.enfOculosQueCaem, chf.enfOculosQueCaem)} />
    </span>
  ),
  InsigniaMini: ({ className }) => <OculosMini className={className} />,
  TracoDoNome: ({ className }) => <BarrasDeSinal className={className} />,
  // A câmera fixada: a luz verde e dois arcos de sinal saindo de cima do retrato.
  AtrasDoRetrato: () => (
    <span className={chf.enfAtrasRetrato} aria-hidden="true">
      <LequeWifi className={chf.enfLequeRetrato} quantos={2} />
    </span>
  ),
  AtrasDoElenco: () => <span className={ch.enfMalha} aria-hidden="true" />,
  // A chamada encerrada: o botão de desligar e a avaliação (cinco estrelas, cinco jogadores).
  NaCartela: () => (
    <span className={ch.enfEncerrada} aria-hidden="true">
      <span className={ch.enfFone}>
        <Fone />
      </span>
      <span className={ch.enfEstrelas}>
        {[0, 1, 2, 3, 4].map((k) => (
          <Estrela key={k} className={ch.enfEstrela} style={{ "--k": k } as CSSProperties} />
        ))}
      </span>
    </span>
  ),
};
