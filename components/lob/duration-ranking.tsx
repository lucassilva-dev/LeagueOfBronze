import Link from "next/link";

import type { GameDurationRow } from "@/lib/tournament";

const GRID = "40px 1fr 78px";

/** Textos da seção. Opcional: sem eles a seção fica em português (padrão do site). */
export type TextosDuracao = {
  titulo: string;
  /** Aceita o marcador {n} para a quantidade de jogos com tempo registrado. */
  descricao: string;
  maisLongas: string;
  maisLongasDesc: string;
  maisCurtas: string;
  maisCurtasDesc: string;
  jogo: string;
  vitoria: string;
};

const TEXTOS_PT: TextosDuracao = {
  titulo: "DURAÇÃO DAS PARTIDAS",
  descricao: "Os jogos mais demorados e os mais rápidos do campeonato ({n} jogos com tempo registrado).",
  maisLongas: "MAIS LONGAS",
  maisLongasDesc: "Do jogo mais demorado para o mais rápido.",
  maisCurtas: "MAIS CURTAS",
  maisCurtasDesc: "Os jogos mais rápidos do campeonato.",
  jogo: "Jogo",
  vitoria: "vitória",
};

function DurationList({
  title,
  desc,
  rows,
  hrefBase,
  t,
}: Readonly<{ title: string; desc: string; rows: GameDurationRow[]; hrefBase: string; t: TextosDuracao }>) {
  return (
    <div className="lob-card-2" style={{ padding: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
        <span style={{ width: 10, height: 10, background: "#c98a4b", transform: "rotate(45deg)" }} />
        <h3 className="lob-display" style={{ fontSize: 18, color: "#f2ebdf", margin: 0 }}>{title}</h3>
      </div>
      <p style={{ margin: "0 0 12px", fontSize: 11.5, color: "#8f8472" }}>{desc}</p>
      <div>
        {rows.map((row, i) => (
          <Link
            key={`${row.seriesId}-${row.gameIndex}`}
            href={`${hrefBase}${row.seriesId}`}
            style={{ display: "grid", gridTemplateColumns: GRID, alignItems: "center", gap: 8, padding: "10px 4px", borderTop: i === 0 ? "none" : "1px solid rgba(201,138,75,.10)", textDecoration: "none" }}
          >
            <span className="lob-display" style={{ fontSize: 15, color: i < 3 ? "#cfa877" : "#6f6656" }}>{i + 1}</span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12.5, color: "#e9dfcd", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {row.teamAName} <span style={{ color: "#7c715e" }}>×</span> {row.teamBName}
              </div>
              <div style={{ fontSize: 10, color: "#8f8472", marginTop: 2 }}>{t.jogo} {row.gameIndex} · {t.vitoria} {row.winnerName}</div>
            </div>
            <span className="lob-display" style={{ textAlign: "right", fontSize: 17, color: "#e6c592" }}>
              {row.durationMin}<span style={{ fontSize: 10, color: "#8f8472", marginLeft: 3 }}>min</span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function DurationRanking({
  rows,
  limit = 8,
  hrefBase = "/partidas/",
  t = TEXTOS_PT,
}: Readonly<{ rows: GameDurationRow[]; limit?: number; hrefBase?: string; t?: TextosDuracao }>) {
  if (rows.length === 0) return null;
  const longest = rows.slice(0, limit);
  const shortest = [...rows].reverse().slice(0, limit);

  return (
    <section className="lob-fade" style={{ marginTop: 36 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 5 }}>
        <span style={{ width: 11, height: 11, background: "#c98a4b", transform: "rotate(45deg)" }} />
        <h2 className="lob-display" style={{ fontSize: 23, color: "#f2ebdf", margin: 0 }}>{t.titulo}</h2>
      </div>
      <p style={{ margin: "0 0 14px", fontSize: 13, color: "#8f8472" }}>
        {t.descricao.replace("{n}", String(rows.length))}
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 16 }}>
        <DurationList title={t.maisLongas} desc={t.maisLongasDesc} rows={longest} hrefBase={hrefBase} t={t} />
        <DurationList title={t.maisCurtas} desc={t.maisCurtasDesc} rows={shortest} hrefBase={hrefBase} t={t} />
      </div>
    </section>
  );
}
