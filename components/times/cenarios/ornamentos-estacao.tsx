import type { CSSProperties } from "react";

import e from "@/components/times/cenarios/estacao.module.css";
import { cx } from "@/components/times/util";

/*
 * Os ornamentos SVG do cenário "estacao" (Queijo Minas). Todos são ENFEITE: aria-hidden, sem
 * texto, focusable=false. Os ids levam um prefixo para não colidir com outro SVG da página.
 */

type ComClasse = Readonly<{ className?: string; style?: CSSProperties }>;

/** Os furos do queijo: centro x/y e raios, no viewBox 400×400. */
const FUROS: readonly (readonly [number, number, number, number])[] = [
  [128, 96, 22, 18],
  [236, 70, 14, 12],
  [300, 150, 26, 22],
  [92, 210, 18, 15],
  [190, 168, 11, 9],
  [262, 262, 20, 17],
  [150, 300, 24, 19],
  [330, 250, 10, 9],
  [210, 330, 13, 11],
  [60, 150, 9, 8],
  [350, 110, 8, 7],
];

/** A lua de queijo: cada furo leva um crescente claro embaixo (dá fundura) e a sombra do terminador. */
export function LuaDeQueijo({ className, id }: ComClasse & Readonly<{ id: string }>) {
  return (
    <svg
      className={className}
      viewBox="0 0 400 400"
      preserveAspectRatio="xMidYMin meet"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <radialGradient id={`${id}-corpo`} cx=".38" cy=".32" r=".75">
          <stop offset="0" stopColor="#FFF1B8" />
          <stop offset=".45" stopColor="#F2C14E" />
          <stop offset=".85" stopColor="#D9982C" />
          <stop offset="1" stopColor="#9A6414" />
        </radialGradient>
        <radialGradient id={`${id}-sombra`} cx=".86" cy=".62" r=".72">
          <stop offset="0" stopColor="#3A2206" stopOpacity=".42" />
          <stop offset="1" stopColor="#3A2206" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="200" cy="200" r="198" fill={`url(#${id}-corpo)`} />
      {FUROS.map(([x, y, rx, ry]) => (
        <g key={`${x}-${y}`}>
          <ellipse cx={x + 1.5} cy={y + 2} rx={rx} ry={ry} fill="#FFE7A0" />
          <ellipse cx={x} cy={y} rx={rx} ry={ry} fill="#8A5410" />
        </g>
      ))}
      <circle cx="200" cy="200" r="198" fill={`url(#${id}-sombra)`} />
    </svg>
  );
}

/*
 * A serra: mar de morros com um vale no meio (onde a lua nasce). O viewBox 1000×372 tem a
 * proporção da faixa (2,2 × 0,818 do escudo), então nada se deforma. Três SVGs: cada camada
 * anima sozinha no compositor.
 */
const CRISTA_LONGE =
  "M0 190 Q70 152 140 170 T290 152 Q360 122 430 152 Q468 170 500 176 Q532 170 570 152 Q640 122 710 152 T860 170 Q930 152 1000 190";
const SVG_DA_SERRA = {
  viewBox: "0 0 1000 372",
  preserveAspectRatio: "xMidYMax slice",
  "aria-hidden": true,
  focusable: false,
} as const;

export const SERRA = {
  Longe: ({ className }: ComClasse) => (
    <svg className={className} {...SVG_DA_SERRA}>
      <path fill="#2A2130" d={`${CRISTA_LONGE} V372 H0 Z`} />
      <path fill="none" stroke="rgba(255,214,110,.22)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" d={CRISTA_LONGE} />
    </svg>
  ),
  Meio: ({ className, janelas }: ComClasse & Readonly<{ janelas: string }>) => (
    <svg className={className} {...SVG_DA_SERRA}>
      <g fill="#1C1622">
        <path d="M0 372 V238 Q90 208 180 224 T360 216 Q430 198 500 232 Q570 198 640 216 T820 224 Q910 208 1000 238 V372 Z" />
        {/* A igreja barroca de duas torres (à direita) e a capela de uma torre (à esquerda). */}
        <path d="M734 230 V194 L736 188 L740 184 L744 188 L746 194 V230 Z M746 230 V204 Q760 192 774 204 V230 Z M774 230 V194 L776 188 L780 184 L784 188 L786 194 V230 Z" />
        <path d="M204 231 V202 L206 196 L209 192 L212 196 L214 202 V231 Z M214 231 V212 Q222 205 230 212 V231 Z" />
      </g>
      <path
        d="M740 184 V177 M737.5 179.5 H742.5 M780 184 V177 M777.5 179.5 H782.5 M209 192 V186 M206.5 188.5 H211.5"
        stroke="#1C1622"
        strokeWidth="1.4"
        fill="none"
      />
      <g className={janelas} fill="#FFC94A">
        <rect x="738.5" y="200" width="3" height="5" />
        <rect x="778.5" y="200" width="3" height="5" />
        <rect x="757" y="217" width="6" height="13" opacity=".6" />
        <rect x="207.5" y="206" width="3" height="5" />
      </g>
    </svg>
  ),
  Perto: ({ className }: ComClasse) => (
    <svg className={className} {...SVG_DA_SERRA}>
      <path fill="#0F0C10" d="M0 372 V300 Q120 280 240 292 T480 300 Q600 286 720 296 T1000 290 V372 Z" />
    </svg>
  ),
};

/** A faixa marinho do escudo por trás de MINAS (pontas em V, borda de ouro, friso ciano) e os dois raios. */
export function FaixaDoNome({ className }: ComClasse) {
  const faixa = "M0 0H100L95 12L100 24H0L5 12Z";
  const raio = "M13 0 L3 22 H10 L6 40 L18 15 H11 Z";
  return (
    <span className={className} aria-hidden="true">
      <svg className={e.enfFaixa} viewBox="0 0 100 24" preserveAspectRatio="none" aria-hidden="true" focusable="false">
        <path d={faixa} fill="#0A1A2E" />
        <path d={faixa} fill="none" stroke="#3EE6F2" strokeOpacity=".35" strokeWidth="6" vectorEffect="non-scaling-stroke" />
        <path d={faixa} fill="none" stroke="#E8A92A" strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        <path d="M9 4.5H91" stroke="#3EE6F2" strokeOpacity=".45" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      </svg>
      <svg className={cx(e.enfRaioDoNome, e.enfRaioEsq)} viewBox="0 0 20 40" aria-hidden="true" focusable="false">
        <path d={raio} fill="#3EE6F2" />
      </svg>
      <svg className={cx(e.enfRaioDoNome, e.enfRaioDir)} viewBox="0 0 20 40" aria-hidden="true" focusable="false">
        <path d={raio} fill="#3EE6F2" />
      </svg>
    </span>
  );
}

/** O crepitar ciano das rodas (o do escudo): pisca uma vez a cada 7 s. */
export function Crepita({ className }: ComClasse) {
  const d = "M0 18 L14 8 L22 20 L36 6 L46 22 L60 10 L70 20 L84 4 L100 16";
  return (
    <svg
      className={className}
      viewBox="0 0 100 30"
      aria-hidden="true"
      focusable="false"
      fill="none"
      strokeLinejoin="round"
      strokeLinecap="round"
    >
      <path d={d} stroke="#3EE6F2" strokeWidth="3" />
      <path d={d} stroke="#F2FEFF" strokeWidth="1.1" />
    </svg>
  );
}

/** A insígnia do maquinista: a roda alada da ferrovia, com um queijinho no cubo. Mesmo viewBox da Coroa. */
export function RodaAlada({ className, style, id = "qm-roda" }: ComClasse & Readonly<{ id?: string }>) {
  const ouro = `${id}-ouro`;
  const asa = (
    <>
      <path d="M80 62 C60 44 30 40 4 46 C24 54 44 62 60 70 Z" />
      <path d="M76 78 C54 70 28 72 6 80 C28 86 48 86 66 86 Z" />
      <path d="M80 94 C62 92 42 98 26 110 C46 110 64 106 82 100 Z" />
    </>
  );
  return (
    <svg className={className} style={style} viewBox="0 0 240 150" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={ouro} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFF4C2" />
          <stop offset=".46" stopColor="#F2B632" />
          <stop offset=".5" stopColor="#8A5410" />
          <stop offset=".56" stopColor="#E2A126" />
          <stop offset="1" stopColor="#7A4E0C" />
        </linearGradient>
      </defs>
      <g fill={`url(#${ouro})`} stroke="#0A1A2E" strokeWidth="3" strokeLinejoin="round">
        {asa}
        <g transform="matrix(-1 0 0 1 240 0)">{asa}</g>
      </g>
      <path
        d="M6 46 L20 49 M8 80 L22 80 M28 109 L40 104 M234 46 L220 49 M232 80 L218 80 M212 109 L200 104"
        fill="none"
        stroke="#3EE6F2"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx="120" cy="78" r="50" fill="none" stroke="#3EE6F2" strokeOpacity=".6" strokeWidth="1.5" />
      <circle cx="120" cy="78" r="44" fill="#0A1A2E" stroke={`url(#${ouro})`} strokeWidth="10" />
      <path
        d="M120 42 V114 M84 78 H156 M94.5 52.5 L145.5 103.5 M145.5 52.5 L94.5 103.5"
        stroke={`url(#${ouro})`}
        strokeWidth="6"
        strokeLinecap="round"
      />
      <circle cx="120" cy="78" r="14" fill={`url(#${ouro})`} stroke="#0A1A2E" strokeWidth="3" />
      <circle cx="115" cy="74" r="3.2" fill="#8A5410" />
      <circle cx="125" cy="83" r="2.4" fill="#8A5410" />
      <circle cx="124" cy="71" r="1.6" fill="#8A5410" />
    </svg>
  );
}

/** A roda chapada (chips, placa, cartela, companheiros): pinta com currentColor. */
export function RodaMini({ className, style }: ComClasse) {
  return (
    <svg
      className={className}
      style={style}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6 5.6 18.4" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="3" fill="currentColor" />
    </svg>
  );
}
