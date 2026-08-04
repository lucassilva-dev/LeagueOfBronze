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
  imageUrl?: string;
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

/** Uma métrica: rótulo do botão, cabeçalho da coluna e legenda embaixo da tabela. */
type Metrica = { label: string; head: string; desc: string };

/** Textos da seção. Opcional: sem eles a seção fica em português (padrão do site). */
export type TextosRankings = {
  jogadoresTitulo: string;
  aoVivo: string;
  jogadoresDescricao: string;
  colJogador: string;
  colTime: string;
  colCampeao: string;
  campeoesTitulo: string;
  campeoesDescricao: string;
  vazioJogadores: string;
  vazioCampeoes: string;
  vazioTexto: string;
  ordemDesc: string;
  ordemAsc: string;
  metricasJogador: Record<string, Metrica>;
  metricasCampeao: Record<string, Metrica>;
};

// A ordem dos botões é fixa; só os rótulos mudam de idioma.
const PLAYER_KEYS = ["abates", "kda", "mvps", "assist", "mortes"];
const CHAMP_KEYS = ["jogados", "banidos", "presenca", "winrate", "kda"];

const TEXTOS_PT: TextosRankings = {
  jogadoresTitulo: "RANKING DE JOGADORES",
  aoVivo: "AO VIVO · ATUALIZA A CADA JOGO",
  jogadoresDescricao: "Abates, KDA, MVPs, assistências e mortes — só de quem já entrou em jogo.",
  colJogador: "JOGADOR",
  colTime: "TIME",
  colCampeao: "CAMPEÃO",
  campeoesTitulo: "CAMPEÕES",
  campeoesDescricao: "Mais jogados, mais banidos, taxa de ban, presença e winrate.",
  vazioJogadores: "Sem partidas registradas ainda",
  vazioCampeoes: "Nenhum campeão registrado ainda",
  vazioTexto: "Assim que os jogos forem registrados, o ranking aparece aqui automaticamente.",
  ordemDesc: "Ordenado do maior para o menor · clique para inverter",
  ordemAsc: "Ordenado do menor para o maior · clique para inverter",
  metricasJogador: {
    abates: { label: "Abates", head: "ABATES", desc: "Quem mais elimina adversários ao longo do campeonato." },
    kda: { label: "KDA", head: "KDA", desc: "Média de (abates + assistências) dividida pelas mortes." },
    mvps: { label: "MVPs", head: "MVPs", desc: "Jogadores eleitos MVP do jogo mais vezes." },
    assist: { label: "Assistências", head: "ASSIST", desc: "Quem mais participa das jogadas do time." },
    mortes: { label: "Mortes", head: "MORTES", desc: "Quem menos cai em combate lidera aqui — menos é melhor." },
  },
  metricasCampeao: {
    jogados: { label: "Mais jogados", head: "PICKS", desc: "Os campeões mais escolhidos no draft das partidas." },
    banidos: { label: "Mais banidos", head: "BANS", desc: "Os campeões que o pessoal não quer ver na Rift." },
    presenca: { label: "Presença", head: "PRES%", desc: "Partidas em que foi escolhido ou banido (pick + ban)." },
    winrate: { label: "Winrate", head: "WIN%", desc: "Taxa de vitória de cada campeão no campeonato." },
    kda: { label: "KDA", head: "KDA", desc: "Melhor média de KDA registrada por campeão." },
  },
};

const METRICA_FALLBACK: Metrica = { label: "—", head: "—", desc: "" };

function montaMetricas(keys: string[], mapa: Record<string, Metrica>) {
  return keys.map((key) => ({ key, ...(mapa[key] ?? METRICA_FALLBACK) }));
}

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

function SortButton({
  head,
  dir,
  onToggle,
  titleDesc,
  titleAsc,
}: Readonly<{ head: string; dir: "desc" | "asc"; onToggle: () => void; titleDesc: string; titleAsc: string }>) {
  return (
    <button
      type="button"
      onClick={onToggle}
      title={dir === "desc" ? titleDesc : titleAsc}
      style={{ display: "inline-flex", alignItems: "center", gap: 5, marginLeft: "auto", padding: 0, border: "none", background: "transparent", color: "#a98a5f", fontSize: 10.5, letterSpacing: ".10em", fontWeight: 700, cursor: "pointer" }}
    >
      {head}
      <span style={{ fontSize: 9, color: "#e6c592" }}>{dir === "desc" ? "▼" : "▲"}</span>
    </button>
  );
}

function EmptyState({ title, texto }: Readonly<{ title: string; texto: string }>) {
  return (
    <div style={{ padding: "40px 24px", textAlign: "center", border: "1px dashed rgba(201,138,75,.28)", borderRadius: 4, background: "rgba(201,138,75,.03)" }}>
      <div className="lob-display" style={{ fontSize: 22, color: "#f2ebdf" }}>{title}</div>
      <p style={{ margin: "8px auto 0", maxWidth: 420, fontSize: 13, color: "#a99e8b" }}>
        {texto}
      </p>
    </div>
  );
}

export function StatsToggles({
  playerRankings,
  champRankings,
  t = TEXTOS_PT,
}: Readonly<{
  playerRankings: Record<string, PlayerStatRow[]>;
  champRankings: Record<string, ChampStatRow[]>;
  t?: TextosRankings;
}>) {
  const [playerMetric, setPlayerMetric] = useState("abates");
  const [champMetric, setChampMetric] = useState("jogados");
  const [playerDir, setPlayerDir] = useState<"desc" | "asc">("desc");
  const [champDir, setChampDir] = useState<"desc" | "asc">("desc");
  const playerMetrics = montaMetricas(PLAYER_KEYS, t.metricasJogador);
  const champMetrics = montaMetricas(CHAMP_KEYS, t.metricasCampeao);
  const pm = playerMetrics.find((m) => m.key === playerMetric) ?? playerMetrics[0];
  const cm = champMetrics.find((m) => m.key === champMetric) ?? champMetrics[0];
  const rowsAll = playerRankings[playerMetric] ?? [];
  const rows = playerDir === "asc" ? [...rowsAll].reverse() : rowsAll;
  const crowsAll = champRankings[champMetric] ?? [];
  const crows = champDir === "asc" ? [...crowsAll].reverse() : crowsAll;

  return (
    <>
      <section className="lob-fade" style={{ marginTop: 36 }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 14, flexWrap: "wrap", marginBottom: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ width: 11, height: 11, background: "#c98a4b", transform: "rotate(45deg)" }} />
            <h2 className="lob-display" style={{ fontSize: 23, color: "#f2ebdf", margin: 0 }}>{t.jogadoresTitulo}</h2>
          </div>
          <span style={{ padding: "5px 12px", border: "1px solid rgba(201,138,75,.35)", borderRadius: 999, fontSize: 10, letterSpacing: ".12em", color: "#cfa877", whiteSpace: "nowrap" }}>{t.aoVivo}</span>
        </div>
        <p style={{ margin: "0 0 14px", fontSize: 13, color: "#8f8472" }}>{t.jogadoresDescricao}</p>
        <Toggle items={playerMetrics} value={playerMetric} onChange={setPlayerMetric} />
        {rows.length === 0 ? (
          <EmptyState title={t.vazioJogadores} texto={t.vazioTexto} />
        ) : (
          <div className="lob-scroll" style={{ overflow: "auto", maxHeight: 560, border: "1px solid rgba(201,138,75,.20)", borderRadius: 3, background: "linear-gradient(180deg,#1a150d,#120e08)" }}>
            <div style={{ minWidth: 600 }}>
              <div style={{ position: "sticky", top: 0, zIndex: 1, display: "grid", gridTemplateColumns: GRID_P, alignItems: "center", gap: 8, padding: "12px 16px", background: "#1d1710", borderBottom: "1px solid rgba(201,138,75,.20)", fontSize: 10.5, letterSpacing: ".10em", color: "#a98a5f" }}>
                <span>#</span>
                <span>{t.colJogador}</span>
                <span>{t.colTime}</span>
                <span style={{ display: "flex", justifyContent: "flex-end" }}>
                  <SortButton head={pm.head} dir={playerDir} titleDesc={t.ordemDesc} titleAsc={t.ordemAsc} onToggle={() => setPlayerDir((d) => (d === "desc" ? "asc" : "desc"))} />
                </span>
              </div>
              {rows.map((row) => (
                <div key={`${row.rank}-${row.nick}`} style={{ display: "grid", gridTemplateColumns: GRID_P, alignItems: "center", gap: 8, padding: "11px 16px", borderTop: "1px solid rgba(201,138,75,.10)" }}>
                  <span className="lob-display" style={{ fontSize: 15, color: row.rank <= 3 ? "#cfa877" : "#6f6656" }}>{row.rank}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
                    {row.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={row.imageUrl} alt={row.nick} width={30} height={30} style={{ width: 30, height: 30, borderRadius: "50%", objectFit: "cover", objectPosition: "center top", border: "1px solid rgba(201,138,75,.35)", flexShrink: 0 }} />
                    ) : null}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={eloSvgUrl(row.eloKey)} alt={row.eloLabel} width={22} style={{ height: "auto", flexShrink: 0 }} />
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
          <h2 className="lob-display" style={{ fontSize: 23, color: "#f2ebdf", margin: 0 }}>{t.campeoesTitulo}</h2>
        </div>
        <p style={{ margin: "0 0 14px", fontSize: 13, color: "#8f8472" }}>{t.campeoesDescricao}</p>
        <Toggle items={champMetrics} value={champMetric} onChange={setChampMetric} />
        {crows.length === 0 ? (
          <EmptyState title={t.vazioCampeoes} texto={t.vazioTexto} />
        ) : (
          <div className="lob-scroll" style={{ overflow: "auto", maxHeight: 560, border: "1px solid rgba(201,138,75,.20)", borderRadius: 3, background: "linear-gradient(180deg,#1a150d,#120e08)" }}>
            <div style={{ minWidth: 360 }}>
              <div style={{ position: "sticky", top: 0, zIndex: 1, display: "grid", gridTemplateColumns: GRID_C, alignItems: "center", gap: 8, padding: "12px 16px", background: "#1d1710", borderBottom: "1px solid rgba(201,138,75,.20)", fontSize: 10.5, letterSpacing: ".10em", color: "#a98a5f" }}>
                <span>#</span>
                <span>{t.colCampeao}</span>
                <span style={{ display: "flex", justifyContent: "flex-end" }}>
                  <SortButton head={cm.head} dir={champDir} titleDesc={t.ordemDesc} titleAsc={t.ordemAsc} onToggle={() => setChampDir((d) => (d === "desc" ? "asc" : "desc"))} />
                </span>
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
