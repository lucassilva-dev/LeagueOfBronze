import type { CSSProperties, ReactNode } from "react";

import { eloSvgUrl, resolveElo, resolveRole } from "@/lib/design";

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

// Título de seção: losango + Anton.
export function SectionTitle({
  children,
  color = "#c98a4b",
  size = 25,
}: Readonly<{ children: ReactNode; color?: string; size?: number }>) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <span
        style={{ width: 12, height: 12, background: color, transform: "rotate(45deg)", flexShrink: 0 }}
      />
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
}: Readonly<{ elo?: string | null; size?: number; title?: boolean }>) {
  const meta = resolveElo(elo);
  if (!meta) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={eloSvgUrl(meta.key)}
      alt={meta.label}
      title={title ? meta.label : undefined}
      width={size}
      style={{ height: "auto", filter: "drop-shadow(0 3px 7px rgba(0,0,0,.8))" }}
    />
  );
}

// Etiqueta de rota (badge colorido).
export function RoleTag({ role, size = 10.5 }: Readonly<{ role?: string | null; size?: number }>) {
  const rm = resolveRole(role);
  return (
    <span
      style={{
        padding: "4px 9px",
        borderRadius: 2,
        background: rm.color,
        color: "#120d06",
        fontWeight: 700,
        fontSize: size,
        letterSpacing: ".08em",
      }}
    >
      {rm.short}
    </span>
  );
}

// Container das páginas (largura máx. + padding + fade de entrada).
export function LobShell({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <main
      style={{
        position: "relative",
        maxWidth: 1280,
        margin: "0 auto",
        padding: "0 clamp(16px,4vw,24px) 96px",
      }}
    >
      {children}
    </main>
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
