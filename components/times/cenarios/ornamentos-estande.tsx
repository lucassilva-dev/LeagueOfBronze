/*
 * Os ornamentos SVG do cenário "estande" (SO ADC BRONZE CLUBE). Todos são ENFEITE: aria-hidden,
 * focusable=false, e os ids levam um prefixo (`id`) para não colidir com outro SVG da página.
 * Nenhum <text>: os números dos anéis ficaram de fora de propósito (liam como texto solto).
 * REGRA DO TEMA: nenhum alvo, mira ou flecha aponta para uma FOTO de jogador — só para o escudo do
 * clube e para os alvos de palha. As fotos são as próprias flechas (cartas) ou ficam na frente delas.
 */

type ComClasse = Readonly<{ className?: string }>;
type ComId = Readonly<{ id: string }>;

/** A palha do fardo: 72 traços radiais entre r 81,5 e 91 (viewBox centrado em 0,0; 1 unidade = 0,01 E). */
const PALHA = Array.from({ length: 72 }, (_, k) => {
  const a = (k / 72) * Math.PI * 2 + (k % 3) * 0.02;
  const r1 = 81.5 + (k % 4) * 0.7;
  const r2 = 91 - (k % 5) * 0.8;
  const torce = ((k % 7) - 3) * 0.05;
  return {
    d: `M${(r1 * Math.cos(a)).toFixed(1)} ${(r1 * Math.sin(a)).toFixed(1)}L${(r2 * Math.cos(a + torce)).toFixed(1)} ${(r2 * Math.sin(a + torce)).toFixed(1)}`,
    clara: k % 2 === 1,
    grossa: k % 3 === 0,
  };
});

/** Cavalete (perna de trás, duas da frente, travessa) e o fardo de palha com a borda amarrada. */
function Fardo({ id }: ComId) {
  return (
    <>
      <defs>
        <radialGradient id={`${id}-palha`} cx=".45" cy=".4" r=".62">
          <stop offset="0" stopColor="#d9ad62" />
          <stop offset=".78" stopColor="#b98a44" />
          <stop offset="1" stopColor="#7a5426" />
        </radialGradient>
        <linearGradient id={`${id}-perna`} x1="0" x2="1">
          <stop offset="0" stopColor="#4a2e18" />
          <stop offset=".45" stopColor="#7a5232" />
          <stop offset="1" stopColor="#3e2614" />
        </linearGradient>
      </defs>
      <path d="M-3 40L3 40L6 120L-6 120Z" fill="#2c1b0e" />
      <path d="M-42 50L-32 52L-54 122L-66 122Z" fill={`url(#${id}-perna)`} />
      <path d="M42 50L32 52L54 122L66 122Z" fill={`url(#${id}-perna)`} />
      <rect x="-56" y="100" width="112" height="6" rx="2" fill="#5a3a20" />
      <circle r="92" fill={`url(#${id}-palha)`} />
      <circle r="91" fill="none" stroke="#5c3e1c" strokeWidth="2" />
      {PALHA.map((p, k) => (
        <path
          key={k}
          d={p.d}
          stroke={p.clara ? "#e9c47c" : "#7d5626"}
          strokeOpacity={p.clara ? 0.55 : 0.5}
          strokeWidth={p.grossa ? 1.6 : 1.1}
          strokeLinecap="round"
        />
      ))}
      {/* a sombra da face de papel sobre a palha */}
      <circle r="81.6" fill="#000" fillOpacity=".35" />
    </>
  );
}

/** Os alfinetes que prendem a face no fardo. */
function Alfinetes() {
  return (
    <g fill="#c9ced6">
      <circle cx="-57" cy="-57" r="1.6" />
      <circle cx="57" cy="-57" r="1.6" />
      <circle cx="-57" cy="57" r="1.6" />
      <circle cx="57" cy="57" r="1.6" />
    </g>
  );
}

/**
 * O alvo do clube: os anéis branco, preto, azul e vermelho de 8 unidades; o DOURADO (r 49) fica
 * embaixo do escudo — o escudo É a mosca. viewBox −92 −92 184 214 (o cavalete pisa em y 122).
 */
export function AlvoDoClube({ id }: ComId) {
  return (
    <svg viewBox="-92 -92 184 214" aria-hidden="true" focusable="false">
      <Fardo id={id} />
      <circle r="81" fill="#ede3ca" />
      <circle r="77" fill="none" stroke="#1b1f27" strokeOpacity=".5" strokeWidth=".5" />
      <circle r="73" fill="#1d212a" />
      <circle r="69" fill="none" stroke="#ede3ca" strokeOpacity=".45" strokeWidth=".5" />
      <circle r="65" fill="#386aa3" />
      <circle r="61" fill="none" stroke="#0e1b30" strokeOpacity=".55" strokeWidth=".5" />
      <circle r="57" fill="#d4463e" />
      <circle r="53" fill="none" stroke="#5a1410" strokeOpacity=".5" strokeWidth=".5" />
      <circle r="49" fill="#e0a83f" />
      <Alfinetes />
    </svg>
  );
}

/** O alvo de uma raia vizinha: a face regulamentar inteira (5 cores, mosca com a cruzinha). */
export function AlvoDaRaia({ id }: ComId) {
  return (
    <svg viewBox="-92 -92 184 214" aria-hidden="true" focusable="false">
      <Fardo id={id} />
      <circle r="81" fill="#ede3ca" />
      <circle r="64.8" fill="#1d212a" />
      <circle r="48.6" fill="#386aa3" />
      <circle r="32.4" fill="#d4463e" />
      <circle r="16.2" fill="#e0a83f" />
      <circle r="8.1" fill="none" stroke="#7a5a1a" strokeOpacity=".6" strokeWidth=".6" />
      <path d="M-2.4 0H2.4M0 -2.4V2.4" stroke="#3a2a0a" strokeWidth=".7" />
      <Alfinetes />
    </svg>
  );
}

/** A haste de madeira (gradiente) — o mesmo para as flechas cravadas e as inteiras. */
function Haste({ id }: ComId) {
  return (
    <defs>
      <linearGradient id={`${id}-haste`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#f3dfb8" />
        <stop offset=".5" stopColor="#cfa56c" />
        <stop offset="1" stopColor="#8e6337" />
      </linearGradient>
    </defs>
  );
}

/**
 * A flecha cravada: a PONTA (enterrada) em x 0, a haste com as listras pintadas (coral, creme,
 * marinho), as penas coral e o encaixe de bronze em x 100. viewBox 0 0 100 30, esticado na caixa.
 */
export function FlechaCravada({ id }: ComId) {
  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <Haste id={id} />
      <rect x="0" y="13.3" width="94" height="3.4" rx="1.2" fill={`url(#${id}-haste)`} />
      <rect x="56" y="13" width="3" height="4" fill="#ff6b7a" />
      <rect x="60" y="13" width="1.6" height="4" fill="#f1e5cb" />
      <rect x="62.6" y="13" width="2" height="4" fill="#16233d" />
      <path d="M68 13.4Q78 1 95 2L95 13.4Z" fill="#ff6b7a" />
      <path d="M68 16.6Q78 29 95 28L95 16.6Z" fill="#e2505f" />
      <path d="M70 14.6H95V15.4H70Z" fill="#f1e5cb" />
      <rect x="94" y="12.2" width="6" height="5.6" rx="1.4" fill="#c98a3e" />
    </svg>
  );
}

/**
 * A flecha inteira, apontando para a DIREITA: encaixe e penas na esquerda, ponta de bronze na direita.
 * viewBox 0 0 120 30, esticado na caixa. A flecha do nome, a que passa reto e as cruzadas da ficha.
 */
export function FlechaInteira({ id, cor = "#ff6b7a" }: ComId & Readonly<{ cor?: string }>) {
  return (
    <svg viewBox="0 0 120 30" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <Haste id={id} />
      <rect x="0" y="12.2" width="6" height="5.6" rx="1.4" fill="#c98a3e" />
      <path d="M27 13.4Q17 1 5 2V13.4Z" fill={cor} />
      <path d="M27 16.6Q17 29 5 28V16.6Z" fill={cor} fillOpacity=".8" />
      <path d="M5 14.6H25V15.4H5Z" fill="#f1e5cb" />
      <rect x="5" y="13.3" width="98" height="3.4" rx="1.2" fill={`url(#${id}-haste)`} />
      <rect x="31" y="13" width="2" height="4" fill="#16233d" />
      <rect x="34" y="13" width="1.6" height="4" fill="#f1e5cb" />
      <rect x="36.6" y="13" width="3" height="4" fill="#ff6b7a" />
      <path d="M101 8L120 15L101 22L104 15Z" fill="#d9a066" />
      <path d="M101 8L120 15L104 15Z" fill="#f6d3a0" />
    </svg>
  );
}

/**
 * A insígnia do ARQUEIRO-CHEFE: a coroa de louros de bronze (dois ramos em U, abertos em cima), a
 * flecha de ouro atravessando na diagonal (penas coral embaixo à esquerda, ponta clara em cima à
 * direita) e a estrela do escudo no nó dos ramos. viewBox 0 0 120 100.
 */
export function LourosDaFlecha({ className, id }: ComClasse & ComId) {
  const folhasEsq: readonly (readonly [number, number, number])[] = [
    [14, 48, -70],
    [18, 64, -52],
    [28, 78, -32],
    [42, 88, -14],
  ];
  return (
    <svg className={className} viewBox="0 0 120 100" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={`${id}-folha`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffe9c9" />
          <stop offset=".5" stopColor="#e0a866" />
          <stop offset="1" stopColor="#9c5f2c" />
        </linearGradient>
        <linearGradient id={`${id}-ouro`} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#c98642" />
          <stop offset=".5" stopColor="#ffd59a" />
          <stop offset="1" stopColor="#fff4e0" />
        </linearGradient>
      </defs>
      <path d="M60 94C34 92 14 72 12 44" fill="none" stroke="#5a2e12" strokeWidth="5" strokeLinecap="round" />
      <path d="M60 94C86 92 106 72 108 44" fill="none" stroke="#5a2e12" strokeWidth="5" strokeLinecap="round" />
      <path d="M60 94C34 92 14 72 12 44" fill="none" stroke="#9c5f2c" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M60 94C86 92 106 72 108 44" fill="none" stroke="#9c5f2c" strokeWidth="2.6" strokeLinecap="round" />
      <g fill={`url(#${id}-folha)`} stroke="#5a2e12" strokeWidth="1.2">
        {folhasEsq.map(([x, y, giro]) => (
          <g key={`${x}-${y}`}>
            <ellipse cx={x} cy={y} rx="9" ry="4.4" transform={`rotate(${giro} ${x} ${y})`} />
            <ellipse cx={120 - x} cy={y} rx="9" ry="4.4" transform={`rotate(${-giro} ${120 - x} ${y})`} />
          </g>
        ))}
        <ellipse cx="22" cy="40" rx="7" ry="3.6" transform="rotate(-20 22 40)" />
        <ellipse cx="98" cy="40" rx="7" ry="3.6" transform="rotate(20 98 40)" />
      </g>
      <path d="M24 86L92 18" stroke="#5a2e12" strokeWidth="7" strokeLinecap="round" />
      <path d="M24 86L92 18" stroke={`url(#${id}-ouro)`} strokeWidth="4" strokeLinecap="round" />
      <path d="M24 86L14 84L20 92Z M24 86L26 96L32 90Z" fill="#ff6b7a" stroke="#5a2e12" strokeWidth="1" />
      <path d="M88 10L104 4L98 20L94 22L86 14Z" fill="#ffe9c9" stroke="#5a2e12" strokeWidth="1.6" strokeLinejoin="round" />
      <path
        d="M60 66L63 74L71 74L65 79L67 87L60 82L53 87L55 79L49 74L57 74Z"
        fill="#ffe9c9"
        stroke="#5a2e12"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** A mesma insígnia chapada (chips, placas, cartela, companheiros): pinta com currentColor. */
export function FlechaMini({ className }: ComClasse) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5.5 20.5C3 18 2.4 13.6 3.8 9.5" />
      <path d="M18.5 20.5C21 18 21.6 13.6 20.2 9.5" />
      <path d="M3.2 13.2l2.3-.9M3.8 17l2.3-.2M20.8 13.2l-2.3-.9M20.2 17l-2.3-.2" strokeWidth="1.4" />
      <path d="M6.5 17.5L18.5 5.5" />
      <path d="M18.5 5.5l-4.2.6M18.5 5.5l-.6 4.2" />
      <path d="M6.5 17.5l-2.2.4M6.5 17.5l-.4 2.2" />
    </svg>
  );
}

/** Um ramo de louro em relevo de bronze (placa da cartela). viewBox 0 0 60 120. */
export function Louro({ className }: ComClasse) {
  const folhas: readonly (readonly [number, number, number])[] = [
    [16, 14, -40],
    [30, 30, 40],
    [16, 46, -40],
    [30, 62, 40],
    [18, 78, -40],
    [34, 94, 40],
  ];
  return (
    <svg className={className} viewBox="0 0 60 120" aria-hidden="true" focusable="false">
      <path d="M50 116C24 98 14 64 22 8" fill="none" stroke="#2c170a" strokeWidth="3" />
      <path d="M49 115C23 97 13 63 21 7" fill="none" stroke="#9c5f2c" strokeWidth="2" />
      {folhas.map(([x, y, giro]) => (
        <ellipse key={y} cx={x} cy={y} rx="9" ry="4.5" transform={`rotate(${giro} ${x} ${y})`} fill="#7a4a25" stroke="#c98642" />
      ))}
    </svg>
  );
}

/** Uma ponta da fita da inauguração, recém-cortada (rabo de andorinha), presa num anel. viewBox 0 0 26 92. */
export function FitaCortada({ cor }: Readonly<{ cor: string }>) {
  return (
    <svg viewBox="0 0 26 92" aria-hidden="true" focusable="false">
      <circle cx="13" cy="5" r="4.5" fill="none" stroke="#e0a866" strokeWidth="2" />
      <path d="M8 9Q14 30 7 60L4 88L13 80L22 88L21 58Q24 30 18 9Z" fill={cor} />
      <path d="M11 12Q15 36 11 62" stroke="#fff" strokeOpacity=".35" strokeWidth="2" fill="none" />
    </svg>
  );
}
