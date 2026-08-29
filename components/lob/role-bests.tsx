import Link from "next/link";

import { RoleIcon, TeamMark } from "@/components/lob/ui";
import { formatKda } from "@/lib/format";
import type { RoleBestGroup, RoleBestRow } from "@/lib/stats-view";

/** Textos da seção. Opcional: sem eles a seção fica em português (padrão do site). */
export type TextosRoleBests = {
  titulo: string;
  descricao: string;
  /** Prefixo do rótulo de cada card: "MELHOR TOPO" / "BEST TOP". */
  melhor: string;
  jogos: string;
  /** Rótulo da rota pela sigla do design system (TOP, SEL, MID, ADC, SUP). */
  rotas: Record<string, string>;
};

const TEXTOS_PT: TextosRoleBests = {
  titulo: "MELHOR POR ROTA",
  descricao: "O destaque de cada posição, pelo melhor KDA entre quem entrou em jogo.",
  melhor: "MELHOR",
  jogos: "jogos",
  rotas: { TOP: "Topo", SEL: "Selva", MID: "Meio", ADC: "Atirador", SUP: "Suporte" },
};

function Photo({ row, size }: Readonly<{ row: RoleBestRow; size: number }>) {
  if (row.imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={row.imageUrl}
        alt={row.nick}
        width={size}
        height={size}
        style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", objectPosition: "center top", border: "1px solid rgba(201,138,75,.35)", flexShrink: 0 }}
      />
    );
  }
  return <TeamMark imageUrl={row.teamImageUrl} color={row.teamColor} name={row.teamName} size={size} diamond={Math.round(size / 2.6)} />;
}

function RoleCard({ group, hrefBase, t, localeTag }: Readonly<{ group: RoleBestGroup; hrefBase: string; t: TextosRoleBests; localeTag?: string }>) {
  const [first, ...rest] = group.rows;

  return (
    <div className="lob-card-2" style={{ padding: 18, display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 14 }}>
        <RoleIcon role={group.role1} size={18} color={group.color} />
        <span style={{ fontSize: 11.5, letterSpacing: ".14em", color: group.color, fontWeight: 700 }}>
          {t.melhor} {(t.rotas[group.short] ?? group.label).toUpperCase()}
        </span>
      </div>

      <Link href={`${hrefBase}${first.slug}`} style={{ display: "flex", alignItems: "center", gap: 12, textDecoration: "none" }}>
        <div style={{ position: "relative", flexShrink: 0 }}>
          <Photo row={first} size={56} />
          <span style={{ position: "absolute", bottom: -3, right: -3, width: 20, height: 20, borderRadius: "50%", background: "linear-gradient(180deg,#f0c88a,#b97e40)", color: "#160f06", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
            1
          </span>
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#f4ecdd", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{first.nick}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
            <TeamMark imageUrl={first.teamImageUrl} color={first.teamColor} name={first.teamName} size={16} diamond={6} />
            <span style={{ fontSize: 10.5, color: "#8f8472", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{first.teamName}</span>
          </div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div className="lob-display" style={{ fontSize: 22, color: "#e6c592", lineHeight: 1 }}>{formatKda(first.kda, localeTag)}</div>
          <div style={{ fontSize: 8.5, letterSpacing: ".08em", color: "#8f8472", marginTop: 4 }}>KDA</div>
        </div>
      </Link>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
        <span className="lob-pill" style={{ fontSize: 10.5 }}>{first.kills}/{first.deaths}/{first.assists}</span>
        <span className="lob-pill" style={{ fontSize: 10.5 }}>{first.games} {t.jogos}</span>
        {first.mvps > 0 ? <span className="lob-pill" style={{ fontSize: 10.5 }}>⭐ {first.mvps} MVP{first.mvps > 1 ? "s" : ""}</span> : null}
      </div>

      {rest.length > 0 ? (
        <div style={{ marginTop: 14, paddingTop: 10, borderTop: "1px solid rgba(201,138,75,.14)" }}>
          {rest.map((row) => (
            <Link
              key={row.slug}
              href={`${hrefBase}${row.slug}`}
              style={{ display: "grid", gridTemplateColumns: "16px 26px 1fr auto", alignItems: "center", gap: 8, padding: "6px 0", textDecoration: "none" }}
            >
              <span className="lob-display" style={{ fontSize: 12, color: "#6f6656" }}>{row.rank}</span>
              <Photo row={row} size={26} />
              <span style={{ fontSize: 12, color: "#cdbfa8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.nick}</span>
              <span className="lob-display" style={{ fontSize: 13, color: "#a98a5f" }}>{formatKda(row.kda, localeTag)}</span>
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function RoleBests({
  groups,
  hrefBase = "/jogadores/",
  t = TEXTOS_PT,
  // Sem o idioma, o KDA daqui saía sempre com vírgula (padrão pt-BR) mesmo com o site
  // em inglês — e divergia da tabela da mesma página.
  localeTag,
}: Readonly<{ groups: RoleBestGroup[]; hrefBase?: string; t?: TextosRoleBests; localeTag?: string }>) {
  if (groups.length === 0) return null;

  return (
    <section className="lob-fade" style={{ marginTop: 36 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 5 }}>
        <span style={{ width: 11, height: 11, background: "#c98a4b", transform: "rotate(45deg)" }} />
        <h2 className="lob-display" style={{ fontSize: 23, color: "#f2ebdf", margin: 0 }}>{t.titulo}</h2>
      </div>
      <p style={{ margin: "0 0 14px", fontSize: 13, color: "#8f8472" }}>
        {t.descricao}
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))", gap: 14 }}>
        {groups.map((group) => (
          <RoleCard key={group.short} group={group} hrefBase={hrefBase} t={t} localeTag={localeTag} />
        ))}
      </div>
    </section>
  );
}
