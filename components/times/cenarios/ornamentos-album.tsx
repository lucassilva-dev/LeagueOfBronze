import a from "@/components/times/cenarios/album.module.css";

/*
 * Os ornamentos SVG do cenário "album" (Os 5 Furiosos). Todos são ENFEITE: aria-hidden, focusable=false,
 * ids com prefixo. Os <text> («5F», «FOTO DO TIME», «FIGURINHAS») são impressão decorativa do álbum,
 * dentro de enfeite aria-hidden, como o neon dos Galácticos. As fontes vêm do CSS (classes
 * enfFonteTitulo/enfFonteAssinatura); o tamanho vem do atributo fontSize.
 */

type ComClasse = Readonly<{ className?: string }>;

/** Estrela de 16 pontas: o recorte creme (R 49, r 41) e o miolo holográfico (R 43, r 35), viewBox 100. */
const SELO_CREME =
  "M50 1L58 9.8L68.8 4.7L72.8 15.9L84.6 15.4L84.1 27.2L95.3 31.2L90.2 42L99 50L90.2 58L95.3 68.8L84.1 72.8L84.6 84.6L72.8 84.1L68.8 95.3L58 90.2L50 99L42 90.2L31.2 95.3L27.2 84.1L15.4 84.6L15.9 72.8L4.7 68.8L9.8 58L1 50L9.8 42L4.7 31.2L15.9 27.2L15.4 15.4L27.2 15.9L31.2 4.7L42 9.8Z";
const SELO_HOLO =
  "M50 7L56.8 15.7L66.5 10.3L69.4 20.9L80.4 19.6L79.1 30.6L89.7 33.5L84.3 43.2L93 50L84.3 56.8L89.7 66.5L79.1 69.4L80.4 80.4L69.4 79.1L66.5 89.7L56.8 84.3L50 93L43.2 84.3L33.5 89.7L30.6 79.1L19.6 80.4L20.9 69.4L10.3 66.5L15.7 56.8L7 50L15.7 43.2L10.3 33.5L20.9 30.6L19.6 19.6L30.6 20.9L33.5 10.3L43.2 15.7Z";
/** Estrela de 4 pontas côncava (o brilho), viewBox 100. */
const BRILHO_4 = "M50 20L57 43L80 50L57 57L50 80L43 57L20 50L43 43Z";
/** O pacotinho (viewBox 200×280): serrilhado de 4 em 4 (dentes de 8) em cima (22/30) e embaixo (262/270). */
const CORPO_PACOTE =
  "M4 30 L8 22 L12 30 L16 22 L20 30 L24 22 L28 30 L32 22 L36 30 L40 22 L44 30 L48 22 L52 30 L56 22 L60 30 L64 22 L68 30 L72 22 L76 30 L80 22 L84 30 L88 22 L92 30 L96 22 L100 30 L104 22 L108 30 L112 22 L116 30 L120 22 L124 30 L128 22 L132 30 L136 22 L140 30 L144 22 L148 30 L152 22 L156 30 L160 22 L164 30 L168 22 L172 30 L176 22 L180 30 L184 22 L188 30 L192 22 L196 30 L196 262 L192 270 L188 262 L184 270 L180 262 L176 270 L172 262 L168 270 L164 262 L160 270 L156 262 L152 270 L148 262 L144 270 L140 262 L136 270 L132 262 L128 270 L124 262 L120 270 L116 262 L112 270 L108 262 L104 270 L100 262 L96 270 L92 262 L88 270 L84 262 L80 270 L76 262 L72 270 L68 262 L64 270 L60 262 L56 270 L52 262 L48 270 L44 262 L40 270 L36 262 L32 270 L28 262 L24 270 L20 262 L16 270 L12 262 L8 270 L4 262 Z";
/** A tira que rasga: do topo (y 6) até o mesmo serrilhado do corpo, no mesmo viewBox. */
const TIRA =
  "M4 6 L196 6 L196 30 L192 22 L188 30 L184 22 L180 30 L176 22 L172 30 L168 22 L164 30 L160 22 L156 30 L152 22 L148 30 L144 22 L140 30 L136 22 L132 30 L128 22 L124 30 L120 22 L116 30 L112 22 L108 30 L104 22 L100 30 L96 22 L92 30 L88 22 L84 30 L80 22 L76 30 L72 22 L68 30 L64 22 L60 30 L56 22 L52 30 L48 22 L44 30 L40 22 L36 30 L32 22 L28 30 L24 22 L20 30 L16 22 L12 30 L8 22 L4 30 Z";

/** O «5F» gigante impresso na página: só o contorno (o traço vem do CSS). */
export function CincoF({ className }: ComClasse) {
  return (
    <svg className={className} viewBox="0 0 120 100" aria-hidden="true" focusable="false">
      <text x="0" y="86">
        5F
      </text>
    </svg>
  );
}

/** A etiqueta impressa embaixo da vaga da foto do time: «5F 1» na caixinha lima e «FOTO DO TIME». */
export function RotuloDaVaga({ className }: ComClasse) {
  return (
    <svg className={className} viewBox="0 0 190 20" aria-hidden="true" focusable="false">
      <rect width="44" height="20" rx="4" fill="#C8F54A" />
      <text className={a.enfFonteTitulo} x="22" y="15" textAnchor="middle" fontSize="14" fill="#1B0B3A">
        5F 1
      </text>
      <text className={a.enfFonteAssinatura} x="54" y="15" fontSize="12" letterSpacing="1.6" fill="#BBA9E0">
        FOTO DO TIME
      </text>
    </svg>
  );
}

/**
 * O pacotinho rasgado atrás da figurinha. De trás para a frente: os dois VERSOS (saem da boca na
 * entrada), o corpo laminado com o rótulo «5F / FIGURINHAS», e a TIRA rasgada (voa na entrada). Os três
 * SVG têm o mesmo viewBox: a tira encaixa no serrilhado do corpo.
 */
export function Pacotinho({ className, id }: ComClasse & Readonly<{ id: string }>) {
  return (
    <div className={className} aria-hidden="true">
      <span className={a.enfVersos}>
        <svg viewBox="0 0 200 280" aria-hidden="true" focusable="false">
          <rect x="34" y="-6" width="118" height="150" rx="8" fill="#2B1460" stroke="#FFF6E6" strokeWidth="3" transform="rotate(-9 90 70)" />
          <g transform="rotate(6 110 60)">
            <rect x="52" y="-18" width="118" height="150" rx="8" fill="#3A1C7E" stroke="#FFF6E6" strokeWidth="3" />
            <text className={a.enfFonteTitulo} x="111" y="40" textAnchor="middle" fontSize="34" fill="#C8F54A">
              5F
            </text>
          </g>
        </svg>
      </span>
      <svg className={a.enfCorpoPacote} viewBox="0 0 200 280" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id={`${id}-laminado`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#3A1A7A" />
            <stop offset=".35" stopColor="#8E5BFF" />
            <stop offset=".5" stopColor="#F2E6FF" />
            <stop offset=".62" stopColor="#7E44F0" />
            <stop offset="1" stopColor="#2A1060" />
          </linearGradient>
        </defs>
        <path d={CORPO_PACOTE} fill={`url(#${id}-laminado)`} stroke="#1A0838" strokeWidth="2" />
        <rect x="22" y="72" width="156" height="150" rx="10" fill="#1A0B33" fillOpacity=".9" />
        <text className={a.enfFonteTitulo} x="100" y="152" textAnchor="middle" fontSize="78" fill="#C8F54A">
          5F
        </text>
        <text className={a.enfFonteAssinatura} x="100" y="196" textAnchor="middle" fontSize="17" letterSpacing="2" fill="#FFF6E6">
          FIGURINHAS
        </text>
      </svg>
      <svg className={a.enfRasgo} viewBox="0 0 200 280" aria-hidden="true" focusable="false">
        <path d={TIRA} fill="#B88CFF" stroke="#1A0838" strokeWidth="2" />
      </svg>
    </div>
  );
}

/** A insígnia do capitão: o selo da BRILHANTE (16 pontas creme, miolo holográfico, brilho de 4 pontas). */
export function SeloBrilhante({ className, id }: ComClasse & Readonly<{ id: string }>) {
  return (
    <svg className={className} viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={`${id}-holo`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FF7AD9" />
          <stop offset=".3" stopColor="#FFD36E" />
          <stop offset=".5" stopColor="#B8FF6A" />
          <stop offset=".7" stopColor="#6AF2FF" />
          <stop offset="1" stopColor="#8A7DFF" />
        </linearGradient>
      </defs>
      <path d={SELO_CREME} fill="#FFF6E6" />
      <path d={SELO_HOLO} fill={`url(#${id}-holo)`} />
      <path d={BRILHO_4} fill="#FFFFFF" stroke="#1B0B3A" strokeWidth="3" strokeLinejoin="round" />
    </svg>
  );
}

/** A mesma insígnia, chapada e pequena: a estrela de 4 pontas (pinta com currentColor). */
export function Brilho4({ className }: ComClasse) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M12 1.5L14.6 9.4L22.5 12L14.6 14.6L12 22.5L9.4 14.6L1.5 12L9.4 9.4Z" fill="currentColor" />
    </svg>
  );
}

/** Os dois brilhinhos no canto do selo «OS 5» (o TracoDoNome). */
export function BrilhoNoSelo({ className }: ComClasse) {
  return (
    <svg className={className} viewBox="0 0 40 40" aria-hidden="true" focusable="false">
      <path className={a.enfBrilhoSeloA} d="M24 2L26.6 11.4L36 14L26.6 16.6L24 26L21.4 16.6L12 14L21.4 11.4Z" fill="#FFFFFF" />
      <path className={a.enfBrilhoSeloB} d="M9 22L10.3 26.7L15 28L10.3 29.3L9 34L7.7 29.3L3 28L7.7 26.7Z" fill="#FFF6E6" />
    </svg>
  );
}

/** O verso de uma figurinha (as «repetidas» da ficha): roxo listrado, borda creme, «5F» lima. 5:7. */
export function VersoDeFigurinha({ className, id }: ComClasse & Readonly<{ id: string }>) {
  return (
    <svg className={className} viewBox="0 0 100 140" aria-hidden="true" focusable="false">
      <defs>
        <pattern id={`${id}-listras`} width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="6" height="12" fill="#FFFFFF" fillOpacity=".05" />
        </pattern>
      </defs>
      <rect x="3" y="3" width="94" height="134" rx="10" fill="#3A1C7E" stroke="#FFF6E6" strokeWidth="6" />
      <rect x="3" y="3" width="94" height="134" rx="10" fill={`url(#${id}-listras)`} />
      <text className={a.enfFonteTitulo} x="50" y="84" textAnchor="middle" fontSize="44" fill="#C8F54A">
        5F
      </text>
    </svg>
  );
}
