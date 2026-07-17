import Link from "next/link";
import { notFound } from "next/navigation";

import { EloCrest, RoleIcon } from "@/components/lob/ui";
import { formatKda } from "@/lib/format";
import { getOpGgSummonerUrlFromNick } from "@/lib/opgg";
import { buildDesignPlayers } from "@/lib/roster";
import { getServerDataset } from "@/lib/server-data";
import { calculatePlayerAggregates } from "@/lib/tournament";

export const dynamic = "force-dynamic";

type PlayerPageParams = Readonly<{ params: Promise<{ slug: string }> }>;

export default async function PlayerFichaPage({ params }: PlayerPageParams) {
  const { slug } = await params;
  const { dataset } = await getServerDataset();
  const player = buildDesignPlayers(dataset).find((p) => p.slug === slug);

  if (!player) {
    notFound();
  }

  const aggregate = calculatePlayerAggregates(dataset).find((a) => a.playerId === player.id);
  const games = aggregate?.gamesPlayed ?? 0;
  const dash = (value: string) => (games > 0 ? value : "—");
  const tiles = [
    { label: "PARTIDAS", val: String(games) },
    { label: "VITÓRIAS", val: "—" },
    { label: "ABATES", val: dash(String(aggregate?.kills ?? 0)) },
    { label: "MORTES", val: dash(String(aggregate?.deaths ?? 0)) },
    { label: "ASSIST.", val: dash(String(aggregate?.assists ?? 0)) },
    { label: "KDA", val: dash(formatKda(aggregate?.kda ?? 0)) },
    { label: "MVPs", val: String(aggregate?.gameMvps ?? 0) },
    { label: "WINRATE", val: "—" },
  ];
  const opggUrl = getOpGgSummonerUrlFromNick(player.nick);

  return (
    <div style={{ position: "relative", maxWidth: 1280, margin: "0 auto", padding: "44px clamp(16px,4vw,24px) 96px" }}>
      <Link href={`/times/${player.teamSlug}`} className="lob-btn-ghost" style={{ padding: "9px 16px", fontSize: 11.5, letterSpacing: ".12em", marginBottom: 26 }}>
        ← VOLTAR AO ELENCO
      </Link>
      <div className="lob-fade" style={{ marginTop: 20, position: "relative", background: "linear-gradient(180deg,#1d1710,#0d0a05)", border: "1px solid rgba(232,184,120,.4)", borderRadius: 8, overflow: "hidden", boxShadow: "0 44px 100px -30px rgba(0,0,0,.6)" }}>
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
              {player.captain ? (
                <span style={{ alignSelf: "flex-start", padding: "4px 10px", borderRadius: 2, background: "linear-gradient(180deg,#f0c88a,#b97e40)", color: "#160f06", fontWeight: 700, fontSize: 9.5, letterSpacing: ".08em" }}>◆ CAPITÃO</span>
              ) : null}
            </div>
            <div style={{ position: "absolute", top: 12, right: 12 }}>
              <EloCrest elo={player.elo} size={52} title={false} />
            </div>
            <div style={{ position: "absolute", left: 18, right: 18, bottom: 16 }}>
              <div style={{ fontSize: 11, letterSpacing: ".12em", color: player.teamColor, marginBottom: 5 }}>{player.teamName}</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 9, flexWrap: "wrap" }}>
                <span className="lob-display" style={{ fontSize: "clamp(26px,4.4vw,40px)", lineHeight: 1.08, color: "#f7f1e6", wordBreak: "break-word", textShadow: "0 2px 12px rgba(0,0,0,.8)" }}>{player.displayNick}</span>
                {player.mono ? (
                  <span style={{ padding: "2px 7px", border: "1px solid rgba(70,214,200,.6)", background: "rgba(10,20,19,.5)", color: "#7fe6db", borderRadius: 2, fontSize: 9, fontWeight: 600, letterSpacing: ".10em" }}>MONO</span>
                ) : null}
              </div>
            </div>
          </div>
          <div style={{ flex: "1.25 1 320px", padding: "26px 26px 24px", minWidth: 290, display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 14, color: "#8f8472" }}>{player.name}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 16 }}>
              <span className="lob-pill" style={{ fontSize: 11.5 }}>
                <span style={{ width: 7, height: 7, transform: "rotate(45deg)", background: player.roleMeta.color }} />
                {player.roleMeta.label}
              </span>
              <span className="lob-pill" style={{ fontSize: 11.5 }}>
                <EloCrest elo={player.elo} size={20} title={false} />
                {player.eloMeta?.label ?? player.elo}
              </span>
              <span style={{ display: "inline-flex", alignItems: "baseline", gap: 5, padding: "8px 13px", background: "linear-gradient(180deg,#f0c88a,#b97e40)", color: "#160f06", borderRadius: 2, fontWeight: 700 }}>
                <span className="lob-display" style={{ fontSize: 16 }}>{player.pts}</span>
                <span style={{ fontSize: 9, letterSpacing: ".08em" }}>PTS DRAFT</span>
              </span>
              {opggUrl ? (
                <Link href={opggUrl} target="_blank" rel="noreferrer" className="lob-pill" style={{ fontSize: 11.5, color: "#e6c592" }}>OP.GG →</Link>
              ) : null}
            </div>
            <div style={{ marginTop: 22, display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 11, letterSpacing: ".14em", color: "#c98a4b", whiteSpace: "nowrap" }}>PERFORMANCE NO CAMPEONATO</span>
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
            <p style={{ margin: "16px 0 0", fontSize: 11.5, lineHeight: 1.5, color: "#6f6656" }}>
              As estatísticas de performance zeram no apito inicial e são atualizadas a cada rodada do
              campeonato.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
