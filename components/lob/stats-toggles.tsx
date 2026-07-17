"use client";

import { useState } from "react";

import { eloSvgUrl } from "@/lib/design";

export type RankRow = {
  rank: number;
  nick: string;
  roleLabel: string;
  teamName: string;
  teamColor: string;
  eloKey: string;
  eloLabel: string;
};

const PLAYER_METRICS = [
  { key: "abates", label: "Abates", desc: "Quem mais elimina adversários ao longo do campeonato." },
  { key: "kda", label: "KDA", desc: "Média de (abates + assistências) dividida pelas mortes." },
  { key: "mvps", label: "MVPs", desc: "Jogadores eleitos melhor da série mais vezes." },
  { key: "assist", label: "Assistências", desc: "Quem mais participa das jogadas do time." },
  { key: "mortes", label: "Mortes", desc: "Quem mais cai em combate — ninguém quer liderar aqui." },
];

const CHAMP_METRICS = [
  { key: "jogados", label: "Mais jogados", desc: "Os campeões mais escolhidos no draft das partidas." },
  { key: "banidos", label: "Mais banidos", desc: "Os campeões que o pessoal não quer ver na Rift." },
  { key: "taxaban", label: "Taxa de ban", desc: "Percentual de partidas em que o campeão foi banido." },
  { key: "presenca", label: "Presença", desc: "Partidas em que foi escolhido ou banido (pick + ban)." },
  { key: "winrate", label: "Winrate", desc: "Taxa de vitória de cada campeão no campeonato." },
  { key: "kda", label: "KDA", desc: "Melhor média de KDA registrada por campeão." },
];

function Toggle<T extends { key: string; label: string }>({
  items,
  value,
  onChange,
}: Readonly<{ items: T[]; value: string; onChange: (key: string) => void }>) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 5, padding: 5, background: "rgba(10,8,4,.5)", border: "1px solid rgba(201,138,75,.2)", borderRadius: 999, marginBottom: 16, width: "fit-content", maxWidth: "100%" }}>
      {items.map((item) => {
        const active = item.key === value;
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => onChange(item.key)}
            style={{
              padding: "8px 16px",
              border: "none",
              borderRadius: 999,
              fontWeight: 700,
              fontSize: 12,
              letterSpacing: ".07em",
              cursor: "pointer",
              whiteSpace: "nowrap",
              background: active ? "linear-gradient(180deg,#f0c88a,#b97e40)" : "transparent",
              color: active ? "#160f06" : "#a99e8b",
            }}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

export function StatsToggles({ ranking }: Readonly<{ ranking: RankRow[] }>) {
  const [playerMetric, setPlayerMetric] = useState("abates");
  const [champMetric, setChampMetric] = useState("jogados");
  const pm = PLAYER_METRICS.find((m) => m.key === playerMetric) ?? PLAYER_METRICS[0];
  const cm = CHAMP_METRICS.find((m) => m.key === champMetric) ?? CHAMP_METRICS[0];

  return (
    <>
      <section className="lob-fade" style={{ marginTop: 36 }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 14, flexWrap: "wrap", marginBottom: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ width: 11, height: 11, background: "#c98a4b", transform: "rotate(45deg)" }} />
            <h2 className="lob-display" style={{ fontSize: 23, color: "#f2ebdf", margin: 0 }}>RANKING DE JOGADORES</h2>
          </div>
          <span style={{ padding: "5px 12px", border: "1px solid rgba(201,138,75,.35)", borderRadius: 999, fontSize: 10, letterSpacing: ".12em", color: "#cfa877", whiteSpace: "nowrap" }}>PRÉ-TORNEIO · ZERADO ATÉ 25/07</span>
        </div>
        <p style={{ margin: "0 0 14px", fontSize: 13, color: "#8f8472" }}>Abates, KDA, MVPs, assistências e mortes — atualiza a cada rodada.</p>
        <Toggle items={PLAYER_METRICS} value={playerMetric} onChange={setPlayerMetric} />
        <div className="lob-scroll" style={{ overflowX: "auto", border: "1px solid rgba(201,138,75,.20)", borderRadius: 3, background: "linear-gradient(180deg,#1a150d,#120e08)" }}>
          <div style={{ minWidth: 440 }}>
            <div style={{ display: "grid", gridTemplateColumns: "44px 1fr 130px 84px", alignItems: "center", gap: 8, padding: "12px 16px", background: "rgba(201,138,75,.08)", fontSize: 10.5, letterSpacing: ".10em", color: "#a98a5f" }}>
              <span>#</span>
              <span>JOGADOR</span>
              <span>TIME</span>
              <span style={{ textAlign: "right" }}>{pm.label.toUpperCase()}</span>
            </div>
            {ranking.map((row) => (
              <div key={row.rank} style={{ display: "grid", gridTemplateColumns: "44px 1fr 130px 84px", alignItems: "center", gap: 8, padding: "11px 16px", borderTop: "1px solid rgba(201,138,75,.10)" }}>
                <span className="lob-display" style={{ fontSize: 15, color: "#6f6656" }}>{row.rank}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={eloSvgUrl(row.eloKey)} alt={row.eloLabel} width={26} style={{ height: "auto", flexShrink: 0 }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: "#f0e9dd", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.nick}</div>
                    <div style={{ fontSize: 10, color: "#8f8472" }}>{row.roleLabel}</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
                  <span style={{ width: 8, height: 8, transform: "rotate(45deg)", flexShrink: 0, background: row.teamColor }} />
                  <span style={{ fontSize: 11, color: "#b8ab97", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.teamName}</span>
                </div>
                <span className="lob-display" style={{ textAlign: "right", fontSize: 16, color: "#6f6656" }}>—</span>
              </div>
            ))}
          </div>
        </div>
        <p style={{ margin: "12px 0 0", fontSize: 12, color: "#8f8472", textAlign: "center" }}>{pm.desc}</p>
      </section>

      <section className="lob-fade" style={{ marginTop: 36 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 5 }}>
          <span style={{ width: 11, height: 11, background: "#c98a4b", transform: "rotate(45deg)" }} />
          <h2 className="lob-display" style={{ fontSize: 23, color: "#f2ebdf", margin: 0 }}>CAMPEÕES</h2>
        </div>
        <p style={{ margin: "0 0 14px", fontSize: 13, color: "#8f8472" }}>Mais jogados, mais banidos, taxa de ban, presença e winrate.</p>
        <Toggle items={CHAMP_METRICS} value={champMetric} onChange={setChampMetric} />
        <div style={{ position: "relative", overflow: "hidden", padding: "46px 24px", textAlign: "center", border: "1px dashed rgba(201,138,75,.28)", borderRadius: 4, background: "rgba(201,138,75,.03)" }}>
          <div style={{ width: 56, height: 56, margin: "0 auto 16px", transform: "rotate(45deg)", background: "linear-gradient(135deg,rgba(240,200,138,.18),rgba(164,106,52,.10))", border: "1px solid rgba(201,138,75,.3)", borderRadius: 8 }} />
          <div className="lob-display" style={{ fontSize: 26, color: "#f2ebdf" }}>{cm.label}</div>
          <p style={{ maxWidth: 430, margin: "10px auto 18px", fontSize: 13.5, lineHeight: 1.5, color: "#a99e8b" }}>{cm.desc}</p>
          <span style={{ display: "inline-block", padding: "7px 16px", background: "rgba(201,138,75,.1)", border: "1px solid rgba(201,138,75,.3)", borderRadius: 999, fontSize: 11, letterSpacing: ".10em", color: "#cfa877" }}>AGUARDANDO A 1ª RODADA · 25/07</span>
        </div>
      </section>
    </>
  );
}
