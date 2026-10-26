/*
 * Os ornamentos SVG das páginas temáticas dos times. Todos são ENFEITE: aria-hidden, sem texto,
 * focusable=false — o que se lê na página está no HTML ao lado. Os ids levam o prefixo do tema
 * para não colidir com outro SVG da página.
 */

type ComClasse = Readonly<{ className?: string; style?: React.CSSProperties }>;

/** A coroa do escudo, em contorno de cromo — a coroa gigante atrás do escudo e a do capitão. */
export function Coroa({ className, style, id = "tm-coroa" }: ComClasse & Readonly<{ id?: string }>) {
  return (
    <svg className={className} style={style} viewBox="0 0 240 150" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={`${id}-cromo`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset=".42" stopColor="#C9D2DD" />
          <stop offset=".5" stopColor="#4A5563" />
          <stop offset=".58" stopColor="#E3E9F1" />
          <stop offset="1" stopColor="#8A96A6" />
        </linearGradient>
      </defs>
      <g fill={`url(#${id}-cromo)`} stroke="#B9E6FF" strokeOpacity=".55" strokeWidth="1.5" strokeLinejoin="round">
        <path d="M24 118 L10 40 L70 80 L120 12 L170 80 L230 40 L216 118 Z" />
        <path d="M24 126 H216 V140 H24 Z" />
        <circle cx="10" cy="40" r="6" />
        <circle cx="230" cy="40" r="6" />
        <path d="M120 0 L128 12 L120 24 L112 12 Z" />
      </g>
      <path d="M40 112 L32 64 L74 92 L120 30 L166 92 L208 64 L200 112 Z" fill="none" stroke="#03050B" strokeOpacity=".45" strokeWidth="2" />
    </svg>
  );
}

/** Coroa pequena e chapada (placa do capitão e chip): a mesma silhueta, sem gradiente. */
export function CoroaMini({ className, style }: ComClasse) {
  return (
    <svg className={className} style={style} viewBox="0 0 240 150" aria-hidden="true" focusable="false" fill="currentColor">
      <path d="M24 118 L10 40 L70 80 L120 12 L170 80 L230 40 L216 118 Z" />
      <path d="M24 126 H216 V146 H24 Z" />
    </svg>
  );
}

/**
 * O raio: três traços iguais (halo largo e fraco, corpo neon e núcleo branco) em vez de um
 * filtro de brilho. `pathLength=1` deixa o desenho (stroke-dashoffset 1 → 0) independente do
 * tamanho.
 */
export function Raio({ className }: ComClasse) {
  const tronco = "M118 0 L104 92 L132 98 L88 214 L118 222 L74 352 L104 358 L62 470 L92 476 L100 600";
  const galho1 = "M88 214 L52 268 L64 272 L30 340";
  const galho2 = "M74 352 L120 404 L110 410 L146 470";
  const camada = (classe: string) => (
    <g className={classe}>
      <path d={tronco} pathLength={1} />
      <path d={galho1} pathLength={1} />
      <path d={galho2} pathLength={1} />
    </g>
  );
  return (
    <svg className={className} viewBox="0 0 200 600" preserveAspectRatio="xMidYMax meet" aria-hidden="true" focusable="false">
      {camada("halo")}
      {camada("meio")}
      {camada("nucleo")}
    </svg>
  );
}

/** As lascas azuis que saem dos lados do escudo. O lado direito é o mesmo desenho espelhado. */
export function Lascas({ className, id }: ComClasse & Readonly<{ id: string }>) {
  return (
    <svg className={className} viewBox="0 0 160 220" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={id} x1="1" y1="0" x2="0" y2="0">
          <stop offset="0" stopColor="#EAF6FF" />
          <stop offset=".35" stopColor="#4DA3FF" />
          <stop offset="1" stopColor="#1F6BFF" stopOpacity="0" />
        </linearGradient>
      </defs>
      <g fill={`url(#${id})`}>
        <polygon points="160,74 6,30 116,98" />
        <polygon points="160,110 0,116 122,128" />
        <polygon points="160,146 14,200 118,160" />
      </g>
    </svg>
  );
}

/** O traço de pincel azul por baixo da assinatura ("EQUIPE"), como no escudo. */
export function TracoDePincel({ className }: ComClasse) {
  return (
    <svg className={className} viewBox="0 0 300 30" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <path
        d="M4 22 C60 12 140 8 296 4 L290 12 C200 14 120 18 70 22 L120 20 C90 26 40 28 4 26 Z"
        fill="#1F6BFF"
      />
      <path d="M30 20 C90 13 170 10 280 7" fill="none" stroke="#B9E6FF" strokeWidth="1.2" strokeOpacity=".7" />
    </svg>
  );
}
