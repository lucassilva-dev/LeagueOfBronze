"use client";

import { useState } from "react";

import { TeamMark } from "@/components/lob/ui";
import { championIconUrl } from "@/lib/champions";
import { eloSvgUrl } from "@/lib/design";

export type PlayerStatRow = {
  rank: number;
  nick: string;
  roleLabel: string;
  teamName: string;
  teamColor: string;
  teamImageUrl?: string;
  eloKey: string;
  eloLabel: string;
  valueLabel: string;
};

export type ChampStatRow = {
  rank: number;
  championId: string;
  championName: string;
  valueLabel: string;
  sub: string;
};

const PLAYER_METRICS = [
  { key: "abates", label: "Abates", head: "ABATES", desc: "Quem mais elimina adversários ao longo do campeonato." },
  { key: "kda", label: "KDA", head: "KDA", desc: "Média de (abates + assistências) dividida pelas mortes." },
  { key: "mvps", label: "MVPs", head: "MVPs", desc: "Jogadores eleitos MVP do jogo mais vezes." },
  { key: "assist", label: "Assistências", head: "ASSIST", desc: "Quem mais participa das jogadas do time." },
  { key: "mortes", label: "Mortes", head: "MORTES", desc: "Quem menos cai em combate lidera aqui — menos é melhor." },
];

const CHAMP_METRICS = [
  { key: "jogados", label: "Mais jogados", head: "PICKS", desc: "Os campeões mais escolhidos no draft das partidas." },
  { key: "banidos", label: "Mais banidos", head: "BANS", desc: "Os campeões que o pessoal não quer ver na Rift." },
  { key: "taxaban", label: "Taxa de ban", head: "BAN%", desc: "Percentual de partidas em que o campeão foi banido." },
  { key: "presenca", label: "Presença", head: "PRES%", desc: "Partidas em que foi escolhido ou banido (pick + ban)." },
  { key: "winrate", label: "Winrate", head: "WIN%", desc: "Taxa de vitória de cada campeão no campeonato." },
  { key: "kda", label: "KDA", head: "KDA", desc: "Melhor média de KDA registrada por campeão." },
];

const GRID_P = "44px minmax(130px,1fr) 210px 84px";
const GRID_C = "44px 1fr 92px";

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

function EmptyState({ title }: Readonly<{ title: string }>) {
  return (
    <div style={{ padding: "40px 24px", textAlign: "center", border: "1px dashed rgba(201,138,75,.28)", borderRadius: 4, background: "rgba(201,138,75,.03)" }}>
      <div className="lob-display" style={{ fontSize: 22, color: "#f2ebdf" }}>{title}</div>
      <p style={{ margin: "8px auto 0", maxWidth: 420, fontSize: 13, color: "#a99e8b" }}>
        Assim que os jogos forem registrados, o ranking aparece aqui automaticamente.
      </p>
    </div>
  );
}

export function StatsToggles({
  playerRankings,
  champRankings,
}: Readonly<{
  playerRankings: Record<string, PlayerStatRow[]>;
  champRankings: Record<string, ChampStatRow[]>;
}>) {
  const [playerMetric, setPlayerMetric] = useState("abates");
  const [champMetric, setChampMetric] = useState("jogados");
  const pm = PLAYER_METRICS.find((m) => m.key === playerMetric) ?? PLAYER_METRICS[0];
  const cm = CHAMP_METRICS.find((m) => m.key === champMetric) ?? CHAMP_METRICS[0];
  const rows = (playerRankings[playerMetric] ?? []).slice(0, 10);
  const crows = (champRankings[champMetric] ?? []).slice(0, 10);

  return (
    <>
      <section className="lob-fade" style={{ marginTop: 36 }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 14, flexWrap: "wrap", marginBottom: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ width: 11, height: 11, background: "#c98a4b", transform: "rotate(45deg)" }} />
            <h2 className="lob-display" style={{ fontSize: 23, color: "#f2ebdf", margin: 0 }}>RANKING DE JOGADORES</h2>
          </div>
          <span style={{ padding: "5px 12px", border: "1px solid rgba(201,138,75,.35)", borderRadius: 999, fontSize: 10, letterSpacing: ".12em", color: "#cfa877", whiteSpace: "nowrap" }}>AO VIVO · ATUALIZA A CADA JOGO</span>
        </div>
        <p style={{ margin: "0 0 14px", fontSize: 13, color: "#8f8472" }}>Abates, KDA, MVPs, assistências e mortes — só de quem já entrou em jogo.</p>
        <Toggle items={PLAYER_METRICS} value={playerMetric} onChange={setPlayerMetric} />
        {rows.length === 0 ? (
          <EmptyState title="Sem partidas registradas ainda" />
        ) : (
          <div className="lob-scroll" style={{ overflowX: "auto", border: "1px solid rgba(201,138,75,.20)", borderRadius: 3, background: "linear-gradient(180deg,#1a150d,#120e08)" }}>
            <div style={{ minWidth: 560 }}>
              <div style={{ display: "grid", gridTemplateColumns: GRID_P, alignItems: "center", gap: 8, padding: "12px 16px", background: "rgba(201,138,75,.08)", fontSize: 10.5, letterSpacing: ".10em", color: "#a98a5f" }}>
                <span>#</span>
                <span>JOGADOR</span>
                <span>TIME</span>
                <span style={{ textAlign: "right" }}>{pm.head}</span>
              </div>
              {rows.map((row) => (
                <div key={`${row.rank}-${row.nick}`} style={{ display: "grid", gridTemplateColumns: GRID_P, alignItems: "center", gap: 8, padding: "11px 16px", borderTop: "1px solid rgba(201,138,75,.10)" }}>
                  <span className="lob-display" style={{ fontSize: 15, color: row.rank <= 3 ? "#cfa877" : "#6f6656" }}>{row.rank}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={eloSvgUrl(row.eloKey)} alt={row.eloLabel} width={26} style={{ height: "auto", flexShrink: 0 }} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, color: "#f0e9dd", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.nick}</div>
                      <div style={{ fontSize: 10, color: "#8f8472" }}>{row.roleLabel}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                    <TeamMark imageUrl={row.teamImageUrl} color={row.teamColor} name={row.teamName} size={22} diamond={8} />
                    <span style={{ fontSize: 11.5, color: "#b8ab97", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.teamName}</span>
                  </div>
                  <span className="lob-display" style={{ textAlign: "right", fontSize: 17, color: "#e6c592" }}>{row.valueLabel}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        <p style={{ margin: "12px 0 0", fontSize: 12, color: "#8f8472", textAlign: "center" }}>{pm.desc}</p>
      </section>

      <section className="lob-fade" style={{ marginTop: 36 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 5 }}>
          <span style={{ width: 11, height: 11, background: "#c98a4b", transform: "rotate(45deg)" }} />
          <h2 className="lob-display" style={{ fontSize: 23, color: "#f2ebdf", margin: 0 }}>CAMPEÕES</h2>
        </div>
        <p style={{ margin: "0 0 14px", fontSize: 13, color: "#8f8472" }}>Mais jogados, mais banidos, taxa de ban, presença e winrate.</p>
        <Toggle items={CHAMP_METRICS} value={champMetric} onChange={setChampMetric} />
        {crows.length === 0 ? (
          <EmptyState title="Nenhum campeão registrado ainda" />
        ) : (
          <div className="lob-scroll" style={{ overflowX: "auto", border: "1px solid rgba(201,138,75,.20)", borderRadius: 3, background: "linear-gradient(180deg,#1a150d,#120e08)" }}>
            <div style={{ minWidth: 360 }}>
              <div style={{ display: "grid", gridTemplateColumns: GRID_C, alignItems: "center", gap: 8, padding: "12px 16px", background: "rgba(201,138,75,.08)", fontSize: 10.5, letterSpacing: ".10em", color: "#a98a5f" }}>
                <span>#</span>
                <span>CAMPEÃO</span>
                <span style={{ textAlign: "right" }}>{cm.head}</span>
              </div>
              {crows.map((c) => (
                <div key={`${c.rank}-${c.championId}`} style={{ display: "grid", gridTemplateColumns: GRID_C, alignItems: "center", gap: 8, padding: "10px 16px", borderTop: "1px solid rgba(201,138,75,.10)" }}>
                  <span className="lob-display" style={{ fontSize: 15, color: c.rank <= 3 ? "#cfa877" : "#6f6656" }}>{c.rank}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={championIconUrl(c.championId)} alt={c.championName} width={32} height={32} style={{ borderRadius: 5, border: "1px solid rgba(201,138,75,.3)", flexShrink: 0 }} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, color: "#f0e9dd", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.championName}</div>
                      <div style={{ fontSize: 10, color: "#8f8472" }}>{c.sub}</div>
                    </div>
                  </div>
                  <span className="lob-display" style={{ textAlign: "right", fontSize: 17, color: "#e6c592" }}>{c.valueLabel}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        <p style={{ margin: "12px 0 0", fontSize: 12, color: "#8f8472", textAlign: "center" }}>{cm.desc}</p>
      </section>
    </>
  );
}
