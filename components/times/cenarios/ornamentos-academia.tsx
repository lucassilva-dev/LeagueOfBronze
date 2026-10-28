import a from "@/components/times/cenarios/academia.module.css";
import af from "@/components/times/cenarios/academia-ficha.module.css";
import { cx } from "@/components/times/util";

/*
 * Os ornamentos SVG do cenário "academia" (Fãs de Rosca). Todos são ENFEITE: aria-hidden,
 * focusable=false, e os ids levam o prefixo `fr-` (ou o `id` que a página passa à insígnia) para
 * não colidir com outro SVG da página. Os únicos <text> são os números da fita métrica e o muro
 * pintado, dentro de SVG em enfeite aria-hidden: são cenário, não conteúdo.
 */

type ComClasse = Readonly<{ className?: string }>;

/** Os números da fita: 1 a 64 cm, um a cada 40 unidades (1 unidade = 1 px na fita de 24 px). */
const CENTIMETROS = Array.from({ length: 64 }, (_, k) => k + 1);

/**
 * A fita métrica da moldura: amarela, risquinhos de milímetro, meio centímetro e centímetro (um
 * <pattern>, para o SVG não carregar 650 linhas) e os números. 2600 unidades de largura: cobre
 * 2560 px com a fita na altura máxima (24 px); `meet` + `width: auto` mantêm a escala.
 */
export function FitaMetrica() {
  return (
    <svg viewBox="0 0 2600 24" preserveAspectRatio="xMinYMin meet" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="fr-fita" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffe17a" />
          <stop offset=".55" stopColor="#ffd23f" />
          <stop offset="1" stopColor="#e6b300" />
        </linearGradient>
        <pattern id="fr-fita-tracos" width="40" height="24" patternUnits="userSpaceOnUse">
          <path
            d="M0.7 0V11M4 0V4.5M8 0V4.5M12 0V4.5M16 0V4.5M20 0V8M24 0V4.5M28 0V4.5M32 0V4.5M36 0V4.5"
            stroke="#1c1206"
            strokeWidth="0.9"
          />
          <path d="M0.7 0V11" stroke="#1c1206" strokeWidth="1.4" />
        </pattern>
      </defs>
      <rect width="2600" height="24" fill="url(#fr-fita)" />
      <rect width="2600" height="24" fill="url(#fr-fita-tracos)" />
      <rect width="2600" height="1.5" fill="#8a6a00" />
      <rect y="22.5" width="2600" height="1.5" fill="#8a6a00" />
      {CENTIMETROS.map((cm) => (
        <text key={cm} x={cm * 40 + 1.5} y="21">
          {cm}
        </text>
      ))}
    </svg>
  );
}

/** O relógio de parede: 6h em ponto (ponteiro das horas no 6, dos minutos no 12), segundos andando. */
export function Relogio() {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <circle cx="50" cy="50" r="46" fill="#f4efea" stroke="#2a2328" strokeWidth="6" />
      {Array.from({ length: 12 }, (_, k) => (
        <line
          key={k}
          x1="50"
          y1="9"
          x2="50"
          y2={k % 3 === 0 ? 18 : 14}
          stroke="#2a2328"
          strokeWidth={k % 3 === 0 ? 4 : 2.4}
          strokeLinecap="round"
          transform={`rotate(${k * 30} 50 50)`}
        />
      ))}
      <line x1="50" y1="50" x2="50" y2="74" stroke="#2a2328" strokeWidth="6" strokeLinecap="round" />
      <line x1="50" y1="50" x2="50" y2="18" stroke="#2a2328" strokeWidth="4" strokeLinecap="round" />
      <g className={a.enfPonteiro}>
        <line x1="50" y1="58" x2="50" y2="14" stroke="#ff5ea8" strokeWidth="2" strokeLinecap="round" />
      </g>
      <circle cx="50" cy="50" r="5.5" fill="#ff8ec3" stroke="#2a2328" strokeWidth="2" />
      <circle cx="50" cy="50" r="2" fill="#2a2328" />
    </svg>
  );
}

/** Os arcos de giz da rosca, à direita do escudo: desenhados por stroke-dashoffset e somem. */
export function ArcosDaRosca() {
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <path className={a.enfArco} pathLength={1} d="M70 96C92 80 98 52 84 22" />
      <path className={cx(a.enfArco, a.enfArco2)} pathLength={1} d="M84 98C104 78 108 46 94 14" />
    </svg>
  );
}

/** A estrela de quatro pontas: o brilho do bíceps e o flash da selfie. */
export function BrilhoDeQuatroPontas() {
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true" focusable="false">
      <path d="M20 0C21 13 27 19 40 20C27 21 21 27 20 40C19 27 13 21 0 20C13 19 19 13 20 0Z" fill="#fffaf2" />
      <circle cx="20" cy="20" r="4" fill="#fff" />
    </svg>
  );
}

/** Uma anilha de rosca em três quartos: massa dourada, glacê de morango, granulado, o furo com a barra. */
function AnilhaDeRosca({ className, id }: ComClasse & Readonly<{ id: string }>) {
  return (
    <svg className={className} viewBox="0 0 62 90" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={`${id}-massa`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffd79a" />
          <stop offset=".6" stopColor="#e6a04f" />
          <stop offset="1" stopColor="#b2692e" />
        </linearGradient>
        <linearGradient id={`${id}-glace`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffe3f0" />
          <stop offset=".5" stopColor="#ff9fcb" />
          <stop offset="1" stopColor="#e9649f" />
        </linearGradient>
      </defs>
      <ellipse cx="31" cy="45" rx="27" ry="42" fill={`url(#${id}-massa)`} stroke="#2b1408" strokeWidth="3" />
      <path
        d="M8 40C6 18 18 6 31 6C45 6 56 18 54 40C54 46 50 47 49 43C48 38 45 40 45 46C45 52 40 52 40 46C40 40 36 38 33 42C30 46 26 44 25 40C24 36 20 36 18 42C16 48 12 49 11 44C10 41 9 41 8 40Z"
        fill={`url(#${id}-glace)`}
        stroke="#2b1408"
        strokeWidth="2"
      />
      <g strokeLinecap="round" strokeWidth="2.6">
        <path d="M18 18l4-3" stroke="#fff" />
        <path d="M38 14l1 5" stroke="#7fd3ff" />
        <path d="M44 26l4 2" stroke="#ffe45c" />
        <path d="M14 30l2 4" stroke="#8be08a" />
      </g>
      <ellipse cx="31" cy="49" rx="8" ry="13" fill="#3a2a32" stroke="#2b1408" strokeWidth="2.4" />
      <rect x="27" y="44" width="8" height="10" rx="2" fill="#c9ced4" />
    </svg>
  );
}

/**
 * O traço do nome: a BARRINHA embaixo do «esporte clube» — barra cromada e duas anilhas de
 * rosca que deslizam para as pontas na entrada (enfeite inteiro; o texto é o do .pincel).
 */
export function Barrinha({ className }: ComClasse) {
  return (
    <span className={className} aria-hidden="true">
      <span className={a.enfBarra} />
      <AnilhaDeRosca className={cx(a.enfAnilha, a.enfAnilhaEsq)} id="fr-anilha-e" />
      <AnilhaDeRosca className={cx(a.enfAnilha, a.enfAnilhaDir)} id="fr-anilha-d" />
    </span>
  );
}

/** As anilhas do halter de ouro (de pé): x, largura. Glacê na metade de cima, com um pingo. */
const PLACAS: readonly (readonly [number, number])[] = [
  [10, 19],
  [91, 19],
];

/** A insígnia do capitão (o PERSONAL): halter de ouro com anilhas de rosca, inclinado, e um brilho. */
export function HalterDeOuro({ className, id }: ComClasse & Readonly<{ id: string }>) {
  return (
    <svg className={className} viewBox="0 0 120 120" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={`${id}-ouro`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff3b0" />
          <stop offset=".45" stopColor="#ffd23f" />
          <stop offset="1" stopColor="#a87400" />
        </linearGradient>
        <linearGradient id={`${id}-glace`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffe3f0" />
          <stop offset=".55" stopColor="#ff8ec3" />
          <stop offset="1" stopColor="#c2457e" />
        </linearGradient>
        <linearGradient id={`${id}-massa`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffd79a" />
          <stop offset="1" stopColor="#b2692e" />
        </linearGradient>
      </defs>
      <g transform="rotate(-14 60 60)">
        <rect x="32" y="55" width="56" height="10" rx="5" fill={`url(#${id}-ouro)`} stroke="#2b1408" strokeWidth="2.5" />
        <path d="M42 57v6M48 57v6M54 57v6M60 57v6M66 57v6M72 57v6M78 57v6" stroke="#a87400" strokeWidth="1.6" />
        {PLACAS.map(([x, w]) => (
          <g key={x}>
            <rect x={x} y="28" width={w} height="64" rx={w / 2} fill={`url(#${id}-massa)`} stroke="#2b1408" strokeWidth="2.6" />
            <path
              d={`M${x + 1.5} ${28 + w / 2}C${x + 1.5} 31 ${x + w - 1.5} 31 ${x + w - 1.5} ${28 + w / 2}V54C${x + w - 1.5} 58 ${x + w * 0.62} 58 ${x + w * 0.62} 54C${x + w * 0.5} 50 ${x + w * 0.38} 60 ${x + 1.5} 56Z`}
              fill={`url(#${id}-glace)`}
            />
            <path d={`M${x + 5} 38l3-3M${x + 11} 44l1 4`} stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
          </g>
        ))}
        <rect x="28" y="50" width="7" height="20" rx="2" fill={`url(#${id}-ouro)`} stroke="#2b1408" strokeWidth="2" />
        <rect x="85" y="50" width="7" height="20" rx="2" fill={`url(#${id}-ouro)`} stroke="#2b1408" strokeWidth="2" />
      </g>
      <path d="M98 10C99 18 102 21 110 22C102 23 99 26 98 34C97 26 94 23 86 22C94 21 97 18 98 10Z" fill="#fffaf2" />
    </svg>
  );
}

/** O halter chapado (chips, placa, cartela, companheiros): pinta com currentColor. */
export function HalterMini({ className }: ComClasse) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="currentColor">
      <rect x="6.5" y="10.8" width="11" height="2.4" rx="1.2" />
      <rect x="2.2" y="6" width="3.2" height="12" rx="1.6" />
      <rect x="5" y="8" width="2.6" height="8" rx="1.3" />
      <rect x="18.6" y="6" width="3.2" height="12" rx="1.6" />
      <rect x="16.4" y="8" width="2.6" height="8" rx="1.3" />
    </svg>
  );
}

const MAO =
  "M30 118C14 104 10 84 14 66L18 44C19 38 27 38 27 45L28 62L31 18C32 10 41 10 41 18L42 56L46 10C47 2 56 2 56 10L56 56L61 16C62 8 71 9 70 17L68 60L76 34C78 27 87 29 85 37L76 78C72 98 62 112 50 118Z";

/** As duas mãos de magnésio na parede, atrás do espelho da ficha (pó: um desfoque parado). */
export function MaosDeMagnesio() {
  return (
    <span className={af.enfMaos} aria-hidden="true">
      {[1, 2].map((k) => (
        <svg key={k} className={cx(af.enfMao, k === 1 ? af.enfMao1 : af.enfMao2)} viewBox="0 0 100 120" aria-hidden="true" focusable="false">
          <defs>
            {/* Pó de giz: ruído que fura a mão (parado: o filtro é calculado uma vez) e borda macia. */}
            <filter id={`fr-po-${k}`} x="-10%" y="-10%" width="120%" height="120%">
              <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed={k * 7} result="ruido" />
              <feColorMatrix in="ruido" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 2.4 -0.7" result="furos" />
              <feComposite in="SourceGraphic" in2="furos" operator="in" result="po" />
              <feGaussianBlur in="po" stdDeviation="0.9" />
            </filter>
          </defs>
          <path d={MAO} fill="#f4efea" filter={`url(#fr-po-${k})`} />
        </svg>
      ))}
    </span>
  );
}

/** O muro pintado atrás dos crachás: FOCO · FORÇA · FÉ / & ROSCA, só o contorno, a 7,5% de giz. */
export function MuroPintado() {
  return (
    <svg viewBox="0 0 1600 440" aria-hidden="true" focusable="false">
      <text x="800" y="190" textAnchor="middle" fontSize="200">
        FOCO · FORÇA · FÉ
      </text>
      <text x="800" y="400" textAnchor="middle" fontSize="200">
        &amp; ROSCA
      </text>
    </svg>
  );
}
