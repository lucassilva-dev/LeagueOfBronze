import b from "@/components/times/cenarios/boteco.module.css";
import { cx } from "@/components/times/util";

/*
 * Os ornamentos SVG do cenário "boteco" (Galácticos do Bar). Todos são ENFEITE: aria-hidden,
 * focusable=false, e os ids levam um prefixo para não colidir com outro SVG da página. O único
 * <text> é o do letreiro de neon (dentro de SVG, num enfeite aria-hidden): é cenário, não conteúdo.
 */

type ComClasse = Readonly<{ className?: string }>;

const COROINHA = "M181 147 L185 131 L192 138 L200 127 L208 138 L215 131 L219 147 Z";

/**
 * As frases do neon em três camadas que pintam o MESMO texto na mesma caixa: o resto vira tspan
 * sem tinta, para o "só" cair no mesmo pixel nas três.
 */
function Frase({ mostra }: Readonly<{ mostra: "tudo" | "semSo" | "so" }>) {
  const tinta = (pinta: boolean) => (pinta ? undefined : "none");
  return (
    <>
      <text x="200" y="58" textAnchor="middle" fontSize="40">
        <tspan fill={tinta(mostra !== "so")}>Aqui é </tspan>
        <tspan fill={tinta(mostra !== "semSo")}>só</tspan>
      </text>
      <text x="200" y="118" textAnchor="middle" fontSize="66" fill={tinta(mostra !== "so")}>
        RESENHA
      </text>
      <path d={COROINHA} fill={tinta(mostra !== "so")} />
    </>
  );
}

/**
 * O letreiro de neon «Aqui é só RESENHA» do escudo, em tamanho de parede. A placa com os tubos
 * APAGADOS está sempre lá (o quadro 0 já tem letreiro); o aceso e o "só" acendem por cima.
 */
export function Letreiro({ className }: ComClasse) {
  return (
    <div className={className} aria-hidden="true">
      <svg className={b.enfLetreiroPlaca} viewBox="0 0 400 160" aria-hidden="true" focusable="false">
        <rect x="5" y="5" width="390" height="150" rx="16" />
        <Frase mostra="tudo" />
      </svg>
      <svg className={b.enfLetreiroAceso} viewBox="0 0 400 160" aria-hidden="true" focusable="false">
        <Frase mostra="semSo" />
      </svg>
      <svg className={b.enfLetreiroSo} viewBox="0 0 400 160" aria-hidden="true" focusable="false">
        <Frase mostra="so" />
      </svg>
    </div>
  );
}

/** A luminária pendente: fio, cúpula de metal escuro, lâmpada; o cone de luz é um span à parte. */
export function Luminaria({ className, cone }: ComClasse & Readonly<{ cone: string }>) {
  return (
    <div className={className} aria-hidden="true">
      <span className={cone} />
      <svg viewBox="0 0 120 150" aria-hidden="true" focusable="false">
        <path d="M60 0V56" stroke="#1C2230" strokeWidth="2" />
        <rect x="53" y="50" width="14" height="10" rx="2" fill="#2A3142" />
        <path d="M16 100 Q18 62 60 58 Q102 62 104 100 Z" fill="#161B27" stroke="#3A4256" strokeWidth="2" />
        <path d="M30 76 Q42 64 58 62" fill="none" stroke="#5A6580" strokeWidth="3" strokeLinecap="round" />
        <ellipse cx="60" cy="100" rx="44" ry="6" fill="#FFCF8A" />
        <circle cx="60" cy="104" r="11" fill="#FFF4D6" />
      </svg>
    </div>
  );
}

/** A insígnia do capitão: o caneco de chope com espuma transbordando e uma coroinha na espuma. */
export function CanecoCoroado({ className, id = "gdb-caneco" }: ComClasse & Readonly<{ id?: string }>) {
  return (
    <svg className={className} viewBox="0 0 120 120" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={`${id}-chope`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFC23D" />
          <stop offset=".45" stopColor="#F29A12" />
          <stop offset="1" stopColor="#B35A04" />
        </linearGradient>
        <linearGradient id={`${id}-ouro`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFF4D6" />
          <stop offset=".5" stopColor="#F5A524" />
          <stop offset="1" stopColor="#7A3A02" />
        </linearGradient>
      </defs>
      <path d="M86 50 Q108 50 108 71 Q108 93 86 93" fill="none" stroke="#1A0D02" strokeWidth="13" strokeLinecap="round" />
      <path d="M86 50 Q108 50 108 71 Q108 93 86 93" fill="none" stroke="#CFE3F7" strokeWidth="7" strokeLinecap="round" />
      <rect x="22" y="36" width="68" height="78" rx="9" fill="#1A0D02" />
      <rect x="26" y="40" width="60" height="70" rx="7" fill={`url(#${id}-chope)`} />
      <path d="M33 48V102M45 48V104M57 48V104M69 48V104M79 48V102" stroke="#FFE7A8" strokeOpacity=".28" strokeWidth="3" />
      <circle cx="40" cy="88" r="2.4" fill="#FFF4D6" fillOpacity=".8" />
      <circle cx="62" cy="74" r="1.8" fill="#FFF4D6" fillOpacity=".8" />
      <circle cx="52" cy="96" r="1.6" fill="#FFF4D6" fillOpacity=".8" />
      <path
        d="M18 44 Q16 28 33 30 Q39 17 55 23 Q65 11 79 22 Q96 17 96 34 Q103 45 92 49 Q90 60 83 54 L83 48 L28 48 Q19 52 18 44 Z"
        fill="#FFF8E6"
        stroke="#1A0D02"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path d="M84 50 Q87 62 84 69 Q80 73 78 66 Q77 57 80 50 Z" fill="#FFF8E6" stroke="#1A0D02" strokeWidth="2" />
      <path d="M44 21 L48 5 L55 13 L61 2 L67 13 L74 5 L78 21 Z" fill={`url(#${id}-ouro)`} stroke="#1A0D02" strokeWidth="2.5" strokeLinejoin="round" />
    </svg>
  );
}

/** O caneco chapado (chips, placas, cartela, companheiros): pinta com currentColor. */
export function CanecoMini({ className }: ComClasse) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M5.5 9.5h10.5v10a2 2 0 0 1-2 2H7.5a2 2 0 0 1-2-2z" />
      <path d="M16 11.5h2a2.6 2.6 0 0 1 0 5.2h-2" />
      <path
        d="M4.4 9.4c-.3-1.8 1-3 2.6-2.6.6-1.5 2.3-2.2 3.7-1.4 1.1-1.3 3.4-1.1 4.1.4 1.6-.2 2.8 1 2.4 2.6.3.6 0 1.2-.6 1.5z"
        fill="currentColor"
        strokeWidth="1"
      />
    </svg>
  );
}

/** O giz que circula o DO BAR: dois traços de mão, desenhados por stroke-dashoffset (enfeite). */
export function GizNoNome({ className }: ComClasse) {
  return (
    <span className={className} aria-hidden="true">
      <svg className={b.enfGiz} viewBox="0 0 200 80" preserveAspectRatio="none" aria-hidden="true" focusable="false">
        <path
          className={b.enfGizRisco}
          pathLength={1}
          d="M16 46 C10 20 70 7 116 8 C166 10 196 26 191 45 C186 66 128 76 82 73 C36 71 8 60 13 40 C16 29 32 20 48 16"
        />
        <path
          className={cx(b.enfGizRisco, b.enfGizRisco2)}
          pathLength={1}
          d="M22 51 C15 27 73 13 118 13 C162 15 189 30 185 47 C181 64 122 71 80 69 C40 67 15 57 19 41"
        />
      </svg>
    </span>
  );
}

/**
 * Os rabiscos de giz da lousa tática, nos cantos de baixo (abaixo das bolachas): à esquerda a
 * conta dos chopes (IIII IIII II), à direita a jogada (X, O e a seta curva até a bola).
 */
export function GizTatica({ className }: ComClasse) {
  return (
    <span className={className} aria-hidden="true">
      <svg className={b.enfGizConta} viewBox="0 0 190 56" aria-hidden="true" focusable="false">
        <path
          className={b.enfGizRisco}
          pathLength={1}
          d="M10 10V46M24 9V46M38 10V47M52 9V46M4 40L60 14M84 10V46M98 9V46M112 10V47M126 9V46M78 40L134 14M156 10V46M170 9V47"
        />
      </svg>
      <svg className={b.enfGizJogada} viewBox="0 0 220 80" aria-hidden="true" focusable="false">
        <path className={b.enfGizRisco} pathLength={1} d="M10 18L30 38M30 18L10 38M58 50L78 70M78 50L58 70" />
        <circle className={b.enfGizRisco} pathLength={1} cx="128" cy="28" r="11" />
        <path className={b.enfGizRisco} pathLength={1} d="M38 30C80 0 150 4 188 40M188 40L174 40M188 40L184 27" />
        <circle className={b.enfGizRisco} pathLength={1} cx="202" cy="56" r="9" />
      </svg>
    </span>
  );
}

/** Os dentes do papelão da bolacha (48), no viewBox 200×200. */
const DENTES = Array.from({ length: 96 }, (_, k) => {
  const ang = (k * Math.PI) / 48;
  const r = k % 2 === 0 ? 99 : 94;
  return `${(100 + r * Math.cos(ang)).toFixed(1)} ${(100 + r * Math.sin(ang)).toFixed(1)}`;
}).join(" L");

/** A bolacha de chope atrás do retrato da ficha: papelão de borda dentada, anéis impressos. */
export function BolachaDentada({ className, id }: ComClasse & Readonly<{ id: string }>) {
  return (
    <svg className={className} viewBox="0 0 200 200" aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id={`${id}-papelao`} cx=".42" cy=".38" r=".7">
          <stop offset="0" stopColor="#F3E9D2" />
          <stop offset="1" stopColor="#C9B68E" />
        </radialGradient>
      </defs>
      <path d={`M${DENTES} Z`} fill={`url(#${id}-papelao)`} stroke="#8C7550" strokeWidth="1" />
      <circle cx="100" cy="100" r="88" fill="none" stroke="#0A1236" strokeWidth="5" />
      <circle cx="100" cy="100" r="82" fill="none" stroke="#F5A524" strokeWidth="2" />
      <circle cx="100" cy="100" r="92" fill="none" stroke="#0A1236" strokeWidth="1" strokeDasharray="2 4" />
    </svg>
  );
}
