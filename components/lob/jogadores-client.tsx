"use client";

import { useEffect, useState } from "react";

import { PlayerCard } from "@/components/lob/player-card";
import { EloCrest, RoleIcon } from "@/components/lob/ui";
import type { DesignPlayer } from "@/lib/roster";

const ROLE_ORDER = ["TOP", "SEL", "MID", "ADC", "SUP"];

const PERF_TILES = [
  { label: "PARTIDAS", val: "0" },
  { label: "VITÓRIAS", val: "0" },
  { label: "ABATES", val: "—" },
  { label: "MORTES", val: "—" },
  { label: "ASSIST.", val: "—" },
  { label: "KDA", val: "—" },
  { label: "MVPs", val: "0" },
  { label: "WINRATE", val: "—" },
];

function PlayerModal({ player, onClose }: Readonly<{ player: DesignPlayer; onClose: () => void }>) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, background: "rgba(6,4,2,.82)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", animation: "fadeUp .22s both" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="lob-scroll"
        style={{ position: "relative", width: "min(860px,100%)", maxHeight: "92vh", overflow: "auto", background: "linear-gradient(180deg,#1d1710,#0d0a05)", border: "1px solid rgba(232,184,120,.4)", borderRadius: 8, boxShadow: "0 44px 100px -30px rgba(0,0,0,.95)" }}
      >
        <div style={{ height: 4, background: `linear-gradient(90deg,${player.teamColor},transparent)`, position: "sticky", top: 0, zIndex: 5 }} />
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          style={{ position: "absolute", top: 16, right: 16, zIndex: 6, width: 36, height: 36, borderRadius: "50%", background: "rgba(10,8,4,.75)", border: "1px solid rgba(201,138,75,.4)", color: "#e6c592", fontSize: 15, cursor: "pointer", lineHeight: 1 }}
        >
          ✕
        </button>
        <div style={{ display: "flex", flexWrap: "wrap" }}>
          <div style={{ position: "relative", flex: "1 1 300px", minWidth: 260, minHeight: 360, background: "#0d0a05" }}>
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
            </div>
            <div style={{ marginTop: 22, display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 11, letterSpacing: ".14em", color: "#c98a4b", whiteSpace: "nowrap" }}>PERFORMANCE NO CAMPEONATO</span>
              <div style={{ height: 1, flex: 1, background: "linear-gradient(90deg,rgba(201,138,75,.3),transparent)" }} />
            </div>
            <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
              {PERF_TILES.map((tile) => (
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

export function JogadoresClient({ players }: Readonly<{ players: DesignPlayer[] }>) {
  const [modal, setModal] = useState<DesignPlayer | null>(null);

  const byRole = new Map<string, DesignPlayer[]>();
  for (const player of players) {
    const list = byRole.get(player.roleMeta.short) ?? [];
    list.push(player);
    byRole.set(player.roleMeta.short, list);
  }
  const sections = ROLE_ORDER.map((short) => {
    const list = (byRole.get(short) ?? []).slice().sort((a, b) => b.pts - a.pts);
    if (list.length === 0) return null;
    return { short, label: list[0].roleMeta.label, color: list[0].roleMeta.color, players: list };
  }).filter((section): section is NonNullable<typeof section> => section !== null);

  return (
    <>
      {sections.map((section) => (
        <section key={section.short} className="lob-fade">
          <div style={{ display: "flex", alignItems: "center", gap: 16, margin: "36px 0 16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <RoleIcon role={section.players[0].role1} size={26} color={section.color} />
              <h2 className="lob-display" style={{ fontSize: 27, color: "#f2ebdf", margin: 0 }}>{section.label}</h2>
            </div>
            <div style={{ height: 1, flex: 1, background: "linear-gradient(90deg,rgba(201,138,75,.4),transparent)" }} />
            <span style={{ fontSize: 11, letterSpacing: ".10em", color: "#8f8472", whiteSpace: "nowrap" }}>{section.players.length} JOGADORES</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(188px,1fr))", gap: 16 }}>
            {section.players.map((player) => (
              <PlayerCard key={player.id} player={player} onOpen={() => setModal(player)} />
            ))}
          </div>
        </section>
      ))}
      {modal ? <PlayerModal player={modal} onClose={() => setModal(null)} /> : null}
    </>
  );
}
