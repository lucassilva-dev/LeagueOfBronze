import Link from "next/link";
import { notFound } from "next/navigation";

import { ChampionIcon } from "@/components/champion-icon";
import { EloCrest, RoleIcon } from "@/components/lob/ui";
import { formatKda, formatSeriesDateLabel } from "@/lib/format";
import { buildDesignPlayers } from "@/lib/roster";
import { getServerArchivedSeason } from "@/lib/server-data";
import { calculatePlayerAggregates, getPlayerGameHistory } from "@/lib/tournament";

export const dynamic = "force-dynamic";

type PageParams = Readonly<{ params: Promise<{ seasonId: string; playerSlug: string }> }>;

export default async function TemporadaJogadorPage({ params }: PageParams) {
  const { seasonId, playerSlug } = await params;
  const result = await getServerArchivedSeason(seasonId);
  if (!result) notFound();

  const { archived, dataset } = result;
  const player = buildDesignPlayers(dataset).find((p) => p.slug === playerSlug);
  if (!player) notFound();

  const aggregate = calculatePlayerAggregates(dataset).find((a) => a.playerId === player.id);
  const history = getPlayerGameHistory(dataset, player.id);
  const games = aggregate?.gamesPlayed ?? 0;
  const dash = (value: string) => (games > 0 ? value : "—");
  const tiles = [
    { label: "PARTIDAS", val: String(games) },
    { label: "VITÓRIAS", val: dash(String(aggregate?.wins ?? 0)) },
    { label: "ABATES", val: dash(String(aggregate?.kills ?? 0)) },
    { label: "MORTES", val: dash(String(aggregate?.deaths ?? 0)) },
    { label: "ASSIST.", val: dash(String(aggregate?.assists ?? 0)) },
    { label: "KDA", val: dash(formatKda(aggregate?.kda ?? 0)) },
    { label: "MVPs", val: String(aggregate?.gameMvps ?? 0) },
    { label: "WINRATE", val: dash(`${Math.round(aggregate?.winRate ?? 0)}%`) },
  ];

  return (
    <div style={{ position: "relative", maxWidth: 1280, margin: "0 auto", padding: "44px clamp(16px,4vw,24px) 96px" }}>
      <Link href={`/temporadas/${seasonId}/times/${player.teamSlug}`} className="lob-btn-ghost" style={{ padding: "9px 16px", fontSize: 11.5, letterSpacing: ".12em", marginBottom: 26 }}>
        ← VOLTAR AO ELENCO
      </Link>
      <div style={{ fontSize: 11, letterSpacing: ".14em", color: "#8f8472", margin: "18px 0 0" }}>{archived.name} · somente leitura</div>
      <div className="lob-fade" style={{ marginTop: 10, position: "relative", background: "linear-gradient(180deg,#1d1710,#0d0a05)", border: "1px solid rgba(232,184,120,.4)", borderRadius: 8, overflow: "hidden", boxShadow: "0 44px 100px -30px rgba(0,0,0,.6)" }}>
        <div style={{ height: 4, background: `linear-gradient(90deg,${player.teamColor},transparent)` }} />
        <div style={{ display: "flex", flexWrap: "wrap" }}>
          <div style={{ position: "relative", flex: "1 1 300px", minWidth: 260, minHeight: 380, background: "#0d0a05" }}>
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "radial-gradient(120% 80% at 50% 0%,rgba(201,138,75,.16),transparent 62%)" }}>
              <RoleIcon role={player.role1} size={188} color="#c98a4b" opacity={0.09} />
            </div>
            {player.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={player.imageUrl} alt={player.displayNick} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
            ) : null}
            <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "linear-gradient(180deg,rgba(8,6,3,.45) 0%,transparent 24%,transparent 44%,rgba(13,10,5,.96) 100%)" }} />
            <div style={{ position: "absolute", top: 14, left: 14, display: "flex", flexDirection: "column", gap: 7 }}>
              <span style={{ alignSelf: "flex-start", padding: "4px 10px", borderRadius: 2, background: player.roleMeta.color, color: "#120d06", fontWeight: 700, fontSize: 10.5, letterSpacing: ".08em" }}>{player.roleMeta.label}</span>
            </div>
            <div style={{ position: "absolute", top: 12, right: 12 }}>
              <EloCrest elo={player.elo} size={52} title={false} />
            </div>
            <div style={{ position: "absolute", left: 18, right: 18, bottom: 16 }}>
              <div style={{ fontSize: 11, letterSpacing: ".12em", color: player.teamColor, marginBottom: 5 }}>{player.teamName}</div>
              <span className="lob-display" style={{ fontSize: "clamp(26px,4.4vw,40px)", lineHeight: 1.08, color: "#f7f1e6", wordBreak: "break-word", textShadow: "0 2px 12px rgba(0,0,0,.8)" }}>{player.displayNick}</span>
            </div>
          </div>
          <div style={{ flex: "1.25 1 320px", padding: "26px 26px 24px", minWidth: 290, display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 14, color: "#8f8472" }}>{player.name}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 16 }}>
              <span className="lob-pill" style={{ fontSize: 11.5 }}>
                <RoleIcon role={player.role1} size={14} color={player.roleMeta.color} />
                {player.roleMeta.label}
              </span>
              <span className="lob-pill" style={{ fontSize: 11.5 }}>
                <EloCrest elo={player.elo} size={20} title={false} />
                {player.eloMeta?.label ?? player.elo}
              </span>
            </div>
            <div style={{ marginTop: 22, display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 11, letterSpacing: ".14em", color: "#c98a4b", whiteSpace: "nowrap" }}>DESEMPENHO NA TEMPORADA</span>
              <div style={{ height: 1, flex: 1, background: "linear-gradient(90deg,rgba(201,138,75,.3),transparent)" }} />
            </div>
            <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
              {tiles.map((tile) => (
                <div key={tile.label} style={{ padding: "13px 6px", textAlign: "center", background: "linear-gradient(180deg,rgba(201,138,75,.08),rgba(201,138,75,.02))", border: "1px solid rgba(201,138,75,.16)", borderRadius: 3 }}>
                  <div className="lob-display" style={{ fontSize: 23, color: "#e6c592", lineHeight: 1 }}>{tile.val}</div>
                  <div style={{ fontSize: 8, letterSpacing: ".04em", color: "#8f8472", marginTop: 5 }}>{tile.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="lob-fade" style={{ marginTop: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <span style={{ width: 10, height: 10, background: "#c98a4b", transform: "rotate(45deg)" }} />
          <h2 className="lob-display" style={{ fontSize: 20, color: "#f2ebdf", margin: 0 }}>JOGO A JOGO</h2>
        </div>
        {history.length === 0 ? (
          <div style={{ padding: "28px 20px", textAlign: "center", border: "1px dashed rgba(201,138,75,.28)", borderRadius: 4, color: "#a99e8b", fontSize: 13 }}>
            Este jogador não entrou em nenhum jogo registrado nesta temporada.
          </div>
        ) : (
          <div className="lob-scroll" style={{ overflowX: "auto", border: "1px solid rgba(201,138,75,.20)", borderRadius: 3, background: "linear-gradient(180deg,#1a150d,#120e08)" }}>
            <div style={{ minWidth: 560 }}>
              <div style={{ display: "grid", gridTemplateColumns: "104px 1fr 150px 96px 64px 60px", alignItems: "center", gap: 8, padding: "11px 16px", background: "rgba(201,138,75,.08)", fontSize: 10, letterSpacing: ".08em", color: "#a98a5f" }}>
                <span>DATA</span>
                <span>ADVERSÁRIO</span>
                <span>CAMPEÃO</span>
                <span>K/D/A</span>
                <span style={{ textAlign: "right" }}>KDA</span>
                <span style={{ textAlign: "right" }}>MVP</span>
              </div>
              {history.map((h, i) => (
                <div key={`${h.seriesId}-${h.gameIndex}-${i}`} style={{ display: "grid", gridTemplateColumns: "104px 1fr 150px 96px 64px 60px", alignItems: "center", gap: 8, padding: "10px 16px", borderTop: "1px solid rgba(201,138,75,.10)" }}>
                  <span style={{ fontSize: 11.5, color: "#b8ab97" }}>{formatSeriesDateLabel(h.date)}</span>
                  <span style={{ fontSize: 12.5, color: "#e6ddcd" }}>vs {h.opponentTeamName} · J{h.gameIndex}</span>
                  <span><ChampionIcon champion={h.champion} size={20} showName /></span>
                  <span style={{ fontSize: 12.5, color: "#e6ddcd" }}>{h.kills}/{h.deaths}/{h.assists}</span>
                  <span className="lob-display" style={{ textAlign: "right", fontSize: 14, color: "#e6c592" }}>{formatKda((h.kills + h.assists) / Math.max(1, h.deaths))}</span>
                  <span style={{ textAlign: "right", fontSize: 13 }}>{h.mvp ? "⭐" : "—"}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
