import type { ComponentType, CSSProperties } from "react";

/**
 * Ícones da identidade "Bronze Hextech".
 *
 * Os desenhos são os do lucide-react (traço 2px, cantos redondos, grade 24×24) — uma
 * família só, para nenhum ícone parecer emprestado de outro lugar — mais as cartinhas,
 * que o lucide não tem e foram desenhadas aqui no mesmo traço.
 *
 * O que dá a cara do campeonato é a MOLDURA: o selo hexagonal em bronze (Hextech é
 * hexágono). Ele substitui o losango genérico que marcava seção, item de menu e título.
 *
 * Tudo aqui é componente sem estado nem hook: serve em página do servidor (/regras) e no
 * painel, que é cliente.
 */

/** Forma que todo ícone aceita — a mesma do lucide, para os dois se trocarem sem adaptador. */
export type PropsDoIcone = Readonly<{
  size?: number | string;
  color?: string;
  strokeWidth?: number | string;
  style?: CSSProperties;
  className?: string;
  "aria-hidden"?: boolean | "true" | "false";
}>;

export type Icone = ComponentType<PropsDoIcone>;

function Traco({
  size = 24,
  color = "currentColor",
  strokeWidth = 2,
  style,
  className,
  children,
}: PropsDoIcone & Readonly<{ children: React.ReactNode }>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable="false"
      style={style}
      className={className}
    >
      {children}
    </svg>
  );
}

/** Uma cartinha surpresa: a carta com a faísca no meio. */
export function IconeCarta(props: PropsDoIcone) {
  return (
    <Traco {...props}>
      <rect x="5" y="2" width="14" height="20" rx="2.2" />
      <path d="M12 7.2l1.25 3.55 3.55 1.25-3.55 1.25L12 16.8l-1.25-3.55L7.2 12l3.55-1.25z" />
    </Traco>
  );
}

/** Cartinha dupla: duas cartas, a de trás espiando — afeta os dois times. */
export function IconeCartas(props: PropsDoIcone) {
  return (
    <Traco {...props}>
      <path d="M8 18H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2" />
      <rect x="8" y="6" width="12" height="16" rx="2" />
      <path d="M14 10.6l.95 2.45 2.45.95-2.45.95L14 17.4l-.95-2.45L10.6 14l2.45-.95z" />
    </Traco>
  );
}

// ---------------------------------------------------------------- selo hexagonal

/** Hexágono de topo reto. A altura de um hexágono regular é √3/2 da largura. */
const HEXAGONO = "polygon(25% 0, 75% 0, 100% 50%, 75% 100%, 25% 100%, 0 50%)";
const PROPORCAO = 0.866;

type TomDoSelo = "bronze" | "teal" | "ouro";

const TONS: Record<
  TomDoSelo,
  { borda: string; fundo: string; brilho: string; glifo: string; ativoFundo: string; ativoGlifo: string }
> = {
  bronze: {
    borda: "linear-gradient(160deg,#f6d6a2 0%,#c98a4b 45%,#6e4520 100%)",
    fundo: "linear-gradient(180deg,#22180d 0%,#120c06 100%)",
    brilho: "radial-gradient(120% 70% at 50% 0%,rgba(240,200,138,.20),transparent 60%)",
    glifo: "#f0c88a",
    ativoFundo: "linear-gradient(180deg,#f6d6a2 0%,#d69a55 55%,#a5692f 100%)",
    ativoGlifo: "#1a1006",
  },
  ouro: {
    borda: "linear-gradient(160deg,#fff0c8 0%,#e6b325 50%,#8a5a12 100%)",
    fundo: "linear-gradient(180deg,#2a1e0a 0%,#140d04 100%)",
    brilho: "radial-gradient(120% 70% at 50% 0%,rgba(255,224,150,.24),transparent 60%)",
    glifo: "#ffd98a",
    ativoFundo: "linear-gradient(180deg,#fff0c8 0%,#e6b325 60%,#a9741a 100%)",
    ativoGlifo: "#1a1006",
  },
  teal: {
    borda: "linear-gradient(160deg,#b9f4ec 0%,#57d8cb 45%,#1f6b63 100%)",
    fundo: "linear-gradient(180deg,#10201d 0%,#08110f 100%)",
    brilho: "radial-gradient(120% 70% at 50% 0%,rgba(127,230,219,.20),transparent 60%)",
    glifo: "#7fe6db",
    ativoFundo: "linear-gradient(180deg,#b9f4ec 0%,#57d8cb 60%,#2a8a80 100%)",
    ativoGlifo: "#06110f",
  },
};

/**
 * Ícone dentro do selo hexagonal de bronze.
 *
 * `ativo` inverte (fundo dourado, desenho escuro): é como o item escolhido do menu se
 * distingue sem depender só da cor do texto. Decorativo por padrão — quem dá o nome é o
 * texto ao lado; passe `rotulo` quando o selo estiver sozinho.
 */
export function SeloHex({
  icone: Desenho,
  tamanho = 34,
  tom = "bronze",
  ativo = false,
  rotulo,
  style,
}: Readonly<{
  icone: Icone;
  tamanho?: number;
  tom?: TomDoSelo;
  ativo?: boolean;
  rotulo?: string;
  style?: CSSProperties;
}>) {
  const t = TONS[tom];
  const altura = Math.round(tamanho * PROPORCAO);
  // A borda diagonal sai mais fina que a de cima com o mesmo recuo; 1.6 acerta o olho.
  const recuo = tamanho >= 40 ? 2 : 1.6;
  return (
    // A sombra fica num invólucro: `clip-path` recorta também o `filter` do próprio
    // elemento, e a sombra no mesmo nó sumiria.
    <span
      role={rotulo ? "img" : undefined}
      aria-label={rotulo}
      aria-hidden={rotulo ? undefined : true}
      style={{
        position: "relative",
        display: "inline-grid",
        placeItems: "center",
        width: tamanho,
        height: altura,
        flexShrink: 0,
        filter: "drop-shadow(0 3px 8px rgba(0,0,0,.55))",
        ...style,
      }}
    >
      <span style={{ position: "absolute", inset: 0, clipPath: HEXAGONO, background: t.borda }} />
      <span
        style={{
          position: "absolute",
          inset: recuo,
          clipPath: HEXAGONO,
          background: ativo ? t.ativoFundo : `${t.brilho},${t.fundo}`,
        }}
      />
      <Desenho
        size={Math.round(tamanho * 0.46)}
        strokeWidth={tamanho >= 40 ? 1.75 : 2}
        color={ativo ? t.ativoGlifo : t.glifo}
        style={{ position: "relative" }}
        aria-hidden
      />
    </span>
  );
}
