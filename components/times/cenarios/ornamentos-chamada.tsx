import type { CSSProperties } from "react";

import ch from "@/components/times/cenarios/chamada.module.css";
import { cx } from "@/components/times/util";

/*
 * Os ornamentos SVG do cenário "chamada" (Os 5 Sem Ping). Todos são ENFEITE: aria-hidden,
 * focusable=false, sem <text> e sem ids (nada a colidir com outro SVG da página). A cor sai de
 * `currentColor` ou de classe: variável CSS em atributo de apresentação não vale em todo navegador.
 */

type ComClasse = Readonly<{ className?: string; style?: CSSProperties }>;

/** Os arcos do Wi-Fi do escudo, continuando o sinal para fora (raios 42,1 a 98,9; ±45° da vertical). */
const ARCOS = [
  "M70.23 72.23A42.1 42.1 0 0 1 129.77 72.23",
  "M58.35 60.35A58.9 58.9 0 0 1 141.65 60.35",
  "M44.92 46.92A77.9 77.9 0 0 1 155.08 46.92",
  "M30.07 32.07A98.9 98.9 0 0 1 169.93 32.07",
] as const;

/**
 * O leque de Wi-Fi: o pé do SVG (100, 102) cai na origem dos arcos do escudo. Cada arco são três
 * traços iguais (brilho largo e fraco, halo e o núcleo de menta): um brilho falso, sem filter.
 * `--a` é a ordem do arco (0 = o menor), para acender do centro para fora.
 */
export function LequeWifi({ className, quantos = 4 }: ComClasse & Readonly<{ quantos?: number }>) {
  return (
    <svg className={className} viewBox="0 0 200 102" aria-hidden="true" focusable="false">
      <g fill="none" strokeLinecap="round">
        {ARCOS.slice(0, quantos).map((d, a) => (
          <g key={d} className={cx(ch.enfArcoWifi, ch[`enfArcoWifi${a + 1}`])} style={{ "--a": a } as CSSProperties}>
            <path d={d} stroke="#3DFF8F" strokeOpacity="0.1" strokeWidth="12" />
            <path d={d} stroke="#3DFF8F" strokeOpacity="0.24" strokeWidth="6.5" />
            <path d={d} stroke="#CFFFE5" strokeWidth="2.4" />
          </g>
        ))}
      </g>
    </svg>
  );
}

const OCULOS = "M0 0h32v1H0zM1 1h30v1H1zM2 2h12v1H2zM18 2h12v1H18zM2 3h12v1H2zM18 3h12v1H18zM3 4h10v1H3zM19 4h10v1H19zM4 5h8v1H4zM20 5h8v1H20z";
const OCULOS_BRILHO = "M4 2h2v1H4zM20 2h2v1H20zM5 3h2v1H5zM21 3h2v1H21z";

/**
 * Os óculos pixelados do "deal with it" (32×6, simétricos): a silhueta preta com o contorno de
 * menta POR FORA (paint-order: o traço por baixo do preenchimento) e o brilho branco das lentes.
 */
export function OculosPixel({ className, style }: ComClasse) {
  return (
    <svg className={className} style={style} viewBox="-1 -1 34 8" shapeRendering="crispEdges" aria-hidden="true" focusable="false">
      <path d={OCULOS} fill="#050505" stroke="#CFFFE5" strokeWidth="0.6" paintOrder="stroke" />
      <path d={OCULOS_BRILHO} fill="#FFFFFF" />
    </svg>
  );
}

/** Os mesmos óculos, chapados e pequenos (16×4): chips, placa, cartela, companheiros. */
export function OculosMini({ className }: ComClasse) {
  return (
    <svg className={className} viewBox="0 0 16 4" shapeRendering="crispEdges" aria-hidden="true" focusable="false" fill="currentColor">
      <path d="M0 0h16v1H0zM1 1h14v1H1zM2 2h5v1H2zM9 2h5v1H9zM3 3h3v1H3zM10 3h3v1H10z" />
    </svg>
  );
}

/** As 5 barras de sinal (uma por jogador): o status da call e a linha do «OS 5». `--b` é a ordem. */
export function BarrasDeSinal({ className }: ComClasse) {
  return (
    <svg className={className} viewBox="0 0 29 20" aria-hidden="true" focusable="false" fill="currentColor">
      {[0, 1, 2, 3, 4].map((k) => (
        <rect key={k} className={ch.enfBarra} style={{ "--b": k } as CSSProperties} x={6 * k} y={16 - 4 * k} width="4.6" height={4 + 4 * k} rx="1.2" />
      ))}
    </svg>
  );
}

export function IconeMicrofone({ className }: ComClasse) {
  return (
    <svg className={className} viewBox="0 0 16 20" aria-hidden="true" focusable="false" fill="currentColor">
      <rect x="4" y="0" width="8" height="13" rx="4" />
      <path d="M1 9a7 7 0 0 0 14 0" fill="none" stroke="currentColor" strokeWidth="2" />
      <rect x="7" y="15" width="2" height="4" />
    </svg>
  );
}

export function IconeCamera({ className }: ComClasse) {
  return (
    <svg className={className} viewBox="0 0 24 16" aria-hidden="true" focusable="false" fill="currentColor">
      <rect x="0" y="1" width="16" height="14" rx="3" />
      <path d="M17 6l7-4v12l-7-4z" />
    </svg>
  );
}

export function IconeTela({ className }: ComClasse) {
  return (
    <svg className={className} viewBox="0 0 24 20" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="1" y="1" width="22" height="14" rx="2" />
      <path d="M12 12V5M8.5 8.5L12 5l3.5 3.5M7 19h10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** O fone de desligar (branco, no botão vermelho). */
export function Fone({ className }: ComClasse) {
  return (
    <svg className={className} viewBox="0 0 28 12" aria-hidden="true" focusable="false" fill="currentColor">
      <path d="M2 8c7-6 17-6 24 0l-3 3-4-2v-3c-3-1-7-1-10 0v3l-4 2z" />
    </svg>
  );
}

/** O ✓ do status quando conecta. */
export function Check({ className }: ComClasse) {
  return (
    <svg className={className} viewBox="0 0 16 16" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="8" cy="8" r="7" />
      <path d="M4.6 8.2l2.3 2.3 4.6-4.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** A estrela da avaliação da chamada (cartela). */
export function Estrela({ className, style }: ComClasse) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="currentColor">
      <path d="M12 2.6l2.8 6 6.5.7-4.9 4.4 1.4 6.4L12 16.9l-5.8 3.2 1.4-6.4-4.9-4.4 6.5-.7z" />
    </svg>
  );
}

/** O ✦ que pisca na lente direita quando os óculos pousam. */
export function BrilhoLente({ className }: ComClasse) {
  return (
    <svg className={className} viewBox="0 0 20 20" aria-hidden="true" focusable="false" fill="currentColor">
      <path d="M10 0C10.8 7 13 9.2 20 10C13 10.8 10.8 13 10 20C9.2 13 7 10.8 0 10C7 9.2 9.2 7 10 0Z" />
    </svg>
  );
}
