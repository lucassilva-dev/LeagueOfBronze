/*
 * Os ornamentos SVG do cenário "picadeiro" (Desorganização). Todos são ENFEITE: aria-hidden,
 * focusable=false, sem <text>, e os ids levam um prefixo para não colidir com outro SVG da página.
 */

type ComClasse = Readonly<{ className?: string }>;

/**
 * A insígnia do capitão: a CARTOLA do mestre de picadeiro — copa de cetim preto com brilho,
 * fita carmim com debrum e estrela de ouro, aba curva. Viewbox 120×100.
 */
export function Cartola({ className, id = "dsg-cartola" }: ComClasse & Readonly<{ id?: string }>) {
  return (
    <svg className={className} viewBox="0 0 120 100" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={`${id}-copa`} x1="0" x2="1">
          <stop offset="0" stopColor="#050304" />
          <stop offset=".34" stopColor="#2c2124" />
          <stop offset=".55" stopColor="#0b0708" />
          <stop offset="1" stopColor="#1c1416" />
        </linearGradient>
        <linearGradient id={`${id}-ouro`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFF6D2" />
          <stop offset=".5" stopColor="#E0B04A" />
          <stop offset="1" stopColor="#6A420E" />
        </linearGradient>
      </defs>
      <path d="M30 72 L33 16 Q60 9 87 16 L90 72 Q60 80 30 72 Z" fill={`url(#${id}-copa)`} stroke="#000" strokeWidth="2" />
      <path d="M33 16 Q60 9 87 16 Q60 23 33 16 Z" fill="#3a2d31" stroke="#000" strokeWidth="1.5" />
      <path d="M31 58 Q60 65 89 58 L89.6 70 Q60 78 30.4 70 Z" fill="#8C1A2E" stroke={`url(#${id}-ouro)`} strokeWidth="1.6" />
      <path d="M60 60.5 l1.9 3.9 4.3.6-3.1 3 .7 4.2-3.8-2-3.9 2 .8-4.2-3.1-3 4.3-.6z" fill={`url(#${id}-ouro)`} />
      <path d="M41 21 Q45 40 42 56" fill="none" stroke="#fff" strokeOpacity=".22" strokeWidth="5" strokeLinecap="round" />
      <path
        d="M6 76 Q8 70 20 70 Q60 82 100 70 Q112 70 114 76 Q112 84 96 84 Q60 94 24 84 Q8 84 6 76 Z"
        fill="#0b0809"
        stroke="#000"
        strokeWidth="2"
      />
      <path d="M14 74 Q60 88 106 74" fill="none" stroke="#fff" strokeOpacity=".14" strokeWidth="2" />
    </svg>
  );
}

/** A cartola chapada (chips, placas, cartela, companheiros): pinta com currentColor. 24×24. */
export function CartolaMini({ className }: ComClasse) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="currentColor">
      <path d="M7 17 7.8 4.6Q12 3.4 16.2 4.6L17 17Z" />
      <path d="M7.2 13.2Q12 14.2 16.8 13.2L16.9 15.4Q12 16.4 7.1 15.4Z" fillOpacity=".4" />
      <path d="M2.5 18.2Q12 22.4 21.5 18.2Q20.8 16.6 19 16.8Q12 19.4 5 16.8Q3.2 16.6 2.5 18.2Z" />
    </svg>
  );
}

/**
 * O pedestal de circo (o tambor onde o leão pousa): corpo cilíndrico com listras diagonais carmim
 * e marfim, volume por gradiente, frisos de ouro em cima e embaixo, tampo vinho com estrela.
 * Viewbox 200×110: o tampo é a elipse (100, 24) 92×13; a base, (100, 88).
 */
export function Pedestal({ className, id = "dsg-pedestal" }: ComClasse & Readonly<{ id?: string }>) {
  return (
    <svg className={className} viewBox="0 0 200 110" aria-hidden="true" focusable="false">
      <defs>
        <pattern id={`${id}-listras`} width="24" height="24" patternUnits="userSpaceOnUse" patternTransform="rotate(30)">
          <rect width="24" height="24" fill="#7E1830" />
          <rect width="12" height="24" fill="#EADBC2" />
        </pattern>
        <linearGradient id={`${id}-volume`} x1="0" x2="1">
          <stop offset="0" stopColor="#000" stopOpacity=".62" />
          <stop offset=".3" stopColor="#fff" stopOpacity=".14" />
          <stop offset=".55" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity=".66" />
        </linearGradient>
        <linearGradient id={`${id}-ouro`} x1="0" x2="1">
          <stop offset="0" stopColor="#6A420E" />
          <stop offset=".3" stopColor="#F9DC8A" />
          <stop offset=".6" stopColor="#DDA43A" />
          <stop offset="1" stopColor="#6A420E" />
        </linearGradient>
      </defs>
      <ellipse cx="100" cy="100" rx="98" ry="9" fill="#000" fillOpacity=".55" />
      <path d="M8 24V88A92 13 0 0 0 192 88V24Z" fill={`url(#${id}-listras)`} />
      <path d="M8 24V88A92 13 0 0 0 192 88V24Z" fill={`url(#${id}-volume)`} />
      <path d="M8 80A92 13 0 0 0 192 80V90A92 13 0 0 1 8 90Z" fill={`url(#${id}-ouro)`} />
      <path d="M8 24A92 13 0 0 0 192 24V33A92 13 0 0 1 8 33Z" fill={`url(#${id}-ouro)`} />
      <ellipse cx="100" cy="24" rx="92" ry="13" fill="#4A0C19" stroke="#F2CF7A" strokeWidth="2" />
      <path d="M100 18.6l2.5 2.4 5.6.3-4.1 1.9 1.3 2.6-5.3-1.3-5.3 1.3 1.3-2.6-4.1-1.9 5.6-.3z" fill="#E0B04A" />
    </svg>
  );
}

/** Um da primeira fila, de braços para cima (pula no TÁ-DÁ). Silhueta com contorno quente. 60×70. */
export function Fa({ className }: ComClasse) {
  return (
    <span className={className} aria-hidden="true">
      <svg viewBox="0 0 60 70" aria-hidden="true" focusable="false">
        <g fill="#0b0705" stroke="#3a2412" strokeWidth="1.2">
          <path d="M4 70Q8 46 30 44Q52 46 56 70Z" />
          <circle cx="30" cy="30" r="12" />
          <path d="M11 53 4 22 10 20 18 49Z" />
          <path d="M49 53 56 22 50 20 42 49Z" />
          <circle cx="6" cy="19" r="4" />
          <circle cx="54" cy="19" r="4" />
        </g>
      </svg>
    </span>
  );
}
