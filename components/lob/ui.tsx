import type { ComponentProps, CSSProperties, ReactNode } from "react";

import { SeloHex, type Icone } from "@/components/lob/icones";
import { eloSvgUrl, resolveElo, resolveRole, roleIconUrl } from "@/lib/design";

// Rótulo pequeno com traço (eyebrow) usado no topo das seções/heros.
export function Eyebrow({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 11,
        fontSize: 11,
        letterSpacing: ".28em",
        color: "#a98a5f",
        textTransform: "uppercase",
      }}
    >
      <span style={{ width: 28, height: 1, background: "#a98a5f", flexShrink: 0 }} />
      {children}
    </div>
  );
}

// Título gigante Anton com gradiente dourado.
export function GoldTitle({
  children,
  style,
}: Readonly<{ children: ReactNode; style?: CSSProperties }>) {
  return (
    <h1 className="lob-h1 gold-text" style={style}>
      {children}
    </h1>
  );
}

/*
 * Quanto os glifos da Anton passam da linha de base, em "em" — medido no navegador com
 * `measureText` (actualBoundingBoxDescent/Ascent) em 2026-10-20. Só importa o que aparece
 * em título de caixa alta.
 */
const DESCIDAS_ANTON: readonly [RegExp, number][] = [
  [/Ç/, 0.31], // o rabinho do cedilha: o único que desce de verdade
  [/,/, 0.12],
  [/Q/, 0.1],
];
const DESCIDA_COMUM_ANTON = 0.01;
const SUBIDA_MAIUSCULA_ANTON = 0.87;
/** Maiúscula acentuada (Ã, É…) sobe mais que a letra comum. */
const SUBIDA_ACENTO_ANTON = 1.11;
const ACENTO_EM_MAIUSCULA = /[ÀÁÂÃÄÈÉÊËÌÍÎÏÒÓÔÕÖÙÚÛÜ]/;

/**
 * Espaço extra (em "em") a pôr entre duas linhas de um título para a de cima não encostar
 * na de baixo.
 *
 * Com altura de linha 1,08, "4ª EDIÇÃO" em cima de "LEAGUE OF BRONZE" fazia o cedilha
 * (0,31 abaixo da base) entrar no topo das maiúsculas de baixo (0,87 acima da base):
 * 0,31 + 0,87 − 1,08 = 0,10 de sobreposição — o Ç cravado no U. Só a linha que tem o
 * glifo que desce ganha espaço; as outras continuam com o ritmo do título.
 */
export function folgaEntreLinhas(deCima: string, deBaixo: string, alturaDaLinha: number, respiro = 0.08): number {
  const desce = DESCIDAS_ANTON.reduce((maior, [glifo, d]) => (glifo.test(deCima) ? Math.max(maior, d) : maior), DESCIDA_COMUM_ANTON);
  const sobe = ACENTO_EM_MAIUSCULA.test(deBaixo) ? SUBIDA_ACENTO_ANTON : SUBIDA_MAIUSCULA_ANTON;
  const falta = desce + sobe + respiro - alturaDaLinha;
  return falta > 0 ? Math.round(falta * 100) / 100 : 0;
}

/**
 * Título dourado em duas linhas ("4ª EDIÇÃO" / "LEAGUE OF BRONZE"), com o espaço entre
 * elas calculado pelo que cada linha tem — use no lugar de `<GoldTitle>` com `<br />`.
 */
export function GoldTitleEmDuasLinhas({
  linhas,
  alturaDaLinha = 1.08,
  style,
}: Readonly<{ linhas: readonly [string, string]; alturaDaLinha?: number; style?: CSSProperties }>) {
  const [deCima, deBaixo] = linhas;
  const folga = folgaEntreLinhas(deCima, deBaixo, alturaDaLinha);
  return (
    <GoldTitle style={{ lineHeight: alturaDaLinha, ...style }}>
      <span style={{ display: "block", marginBottom: folga ? `${folga}em` : undefined }}>{deCima}</span>
      <span style={{ display: "block" }}>{deBaixo}</span>
    </GoldTitle>
  );
}

/**
 * Título de seção: losango + Anton.
 *
 * Com `icone`, o selo hexagonal de bronze (com o desenho do que a seção trata) entra no
 * lugar do losango — e aí `tom` escolhe o metal do selo, não `color`. Sem `icone` o título
 * sai exatamente como sempre saiu: as outras páginas que usam o losango não mudam.
 *
 * O selo acompanha o tamanho do título (1,5× a fonte, nunca menor que 26px), para o de
 * uma subseção não ficar do tamanho do de uma seção.
 */
export function SectionTitle({
  children,
  color = "#c98a4b",
  size = 25,
  icone,
  tom,
}: Readonly<{
  children: ReactNode;
  color?: string;
  size?: number;
  icone?: Icone;
  tom?: ComponentProps<typeof SeloHex>["tom"];
}>) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      {icone ? (
        <SeloHex icone={icone} tom={tom} tamanho={Math.max(26, Math.round(size * 1.5))} />
      ) : (
        <span
          style={{ width: 12, height: 12, background: color, transform: "rotate(45deg)", flexShrink: 0 }}
        />
      )}
      <h2 className="lob-display" style={{ fontSize: size, color: "#f2ebdf", margin: 0 }}>
        {children}
      </h2>
    </div>
  );
}

export function Pill({ children, dot = true }: Readonly<{ children: ReactNode; dot?: boolean }>) {
  return (
    <span className="lob-pill">
      {dot ? <span className="lob-mark" /> : null}
      {children}
    </span>
  );
}

// Emblema de crista do elo (PNG oficial em /public/elo).
export function EloCrest({
  elo,
  size = 40,
  title = true,
  labels,
}: Readonly<{
  elo?: string | null;
  size?: number;
  title?: boolean;
  /**
   * Rótulos de elo por chave do design system (ferro, bronze, …), para o alt e o title.
   * Opcional e aditivo: sem ele vale o rótulo em português de lib/design.ts.
   */
  labels?: Record<string, string>;
}>) {
  const meta = resolveElo(elo);
  if (!meta) return null;
  const rotulo = labels?.[meta.key] ?? meta.label;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={eloSvgUrl(meta.key)}
      alt={rotulo}
      title={title ? rotulo : undefined}
      width={size}
      style={{ height: "auto", filter: "drop-shadow(0 3px 7px rgba(0,0,0,.8))" }}
    />
  );
}

// Ícone oficial de posição, tingível (via máscara CSS) — /public/roles.
export function RoleIcon({
  role,
  size = 14,
  color = "#120d06",
  opacity = 1,
}: Readonly<{ role?: string | null; size?: number; color?: string; opacity?: number }>) {
  const meta = resolveRole(role);
  const url = roleIconUrl(meta);
  if (!url) return null;
  return (
    <span
      aria-hidden
      style={{
        display: "inline-block",
        width: size,
        height: size,
        flexShrink: 0,
        background: color,
        opacity,
        WebkitMaskImage: `url(${url})`,
        maskImage: `url(${url})`,
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
        WebkitMaskSize: "contain",
        maskSize: "contain",
      }}
    />
  );
}

// Etiqueta de rota (badge colorido) com ícone oficial da posição.
// `label` permite passar a sigla já traduzida (ex.: SEL → JG); sem ela, usa a do design.
export function RoleTag({
  role,
  size = 10.5,
  label,
}: Readonly<{ role?: string | null; size?: number; label?: string }>) {
  const rm = resolveRole(role);
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "4px 9px",
        borderRadius: 2,
        background: rm.color,
        color: "#120d06",
        fontWeight: 700,
        fontSize: size,
        letterSpacing: ".08em",
      }}
    >
      <RoleIcon role={role} size={size + 3} color="#120d06" opacity={0.82} />
      {label ?? rm.short}
    </span>
  );
}

// Container das páginas (largura máx. + padding + fade de entrada).
// É <div>, não <main>: o <main id="conteudo"> é um só e mora no SiteFrame, por fora.
export function LobShell({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div
      style={{
        position: "relative",
        maxWidth: 1280,
        margin: "0 auto",
        /*
         * O respiro de cima NÃO é enfeite: o cabeçalho é `sticky`, e sem ele o
         * primeiro elemento da página nasce colado nele. As páginas antigas resolvem
         * isso com um padding na primeira seção; quem usa o LobShell ganha de graça.
         */
        padding: "clamp(32px,6vw,52px) clamp(16px,4vw,24px) 96px",
      }}
    >
      {children}
    </div>
  );
}

// Losango pequeno com cor de time.
export function TeamDot({ color, size = 9 }: Readonly<{ color: string; size?: number }>) {
  return (
    <span
      style={{
        width: size,
        height: size,
        transform: "rotate(45deg)",
        background: color,
        flexShrink: 0,
      }}
    />
  );
}

// Marcador do time: logo (avatar) se houver imageUrl, senão o losango colorido.
// Slot de tamanho fixo (`size`) para os nomes ao lado ficarem alinhados.
export function TeamMark({
  imageUrl,
  color,
  name,
  size = 24,
  diamond,
}: Readonly<{ imageUrl?: string | null; color: string; name?: string; size?: number; diamond?: number }>) {
  const dSize = diamond ?? Math.round(size * 0.42);
  return (
    <span
      style={{ width: size, height: size, flexShrink: 0, display: "inline-flex", alignItems: "center", justifyContent: "center" }}
    >
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt={name ?? ""} style={{ width: size, height: size, objectFit: "contain", borderRadius: 4 }} />
      ) : (
        <span style={{ width: dSize, height: dSize, transform: "rotate(45deg)", background: color, flexShrink: 0 }} />
      )}
    </span>
  );
}
