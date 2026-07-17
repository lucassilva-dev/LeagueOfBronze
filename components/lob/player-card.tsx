import Link from "next/link";

import { EloCrest, RoleIcon, RoleTag } from "@/components/lob/ui";
import type { DesignPlayer } from "@/lib/roster";

function PhotoArea({ player }: Readonly<{ player: DesignPlayer }>) {
  return (
    <div style={{ position: "relative", width: "100%", aspectRatio: "4 / 5", background: "linear-gradient(160deg,#2a2015,#140e07)" }}>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <RoleIcon role={player.role1} size={104} color="#c98a4b" opacity={0.14} />
      </div>
      {player.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={player.imageUrl} alt={player.displayNick} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
      ) : null}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "linear-gradient(180deg,rgba(8,6,3,.5) 0%,transparent 22%,transparent 48%,rgba(11,8,4,.96) 100%)" }} />
      <div style={{ position: "absolute", top: 10, left: 10, right: 10, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <RoleTag role={player.role1} />
        <EloCrest elo={player.elo} size={40} />
      </div>
      <div style={{ position: "absolute", left: 12, right: 12, bottom: 11 }}>
        {player.captain ? (
          <div style={{ display: "inline-block", marginBottom: 6, padding: "2px 8px", borderRadius: 2, background: "linear-gradient(180deg,#f0c88a,#b97e40)", color: "#160f06", fontWeight: 700, fontSize: 9, letterSpacing: ".10em" }}>◆ CAPITÃO</div>
        ) : null}
        <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
          <span className="lob-display" style={{ fontSize: 22, lineHeight: 1.08, color: "#f7f1e6", wordBreak: "break-word", textShadow: "0 2px 10px rgba(0,0,0,.75)" }}>{player.displayNick}</span>
          {player.mono ? (
            <span style={{ padding: "2px 6px", border: "1px solid rgba(70,214,200,.6)", background: "rgba(10,20,19,.5)", color: "#7fe6db", borderRadius: 2, fontSize: 8.5, fontWeight: 600, letterSpacing: ".10em" }}>MONO</span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Footer({ player }: Readonly<{ player: DesignPlayer }>) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "11px 13px 12px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
        <span style={{ width: 9, height: 9, transform: "rotate(45deg)", flexShrink: 0, background: player.teamColor }} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12.5, color: "#e4d8c2", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{player.name}</div>
          <div style={{ fontSize: 9.5, letterSpacing: ".05em", color: player.teamColor, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{player.teamName}</div>
        </div>
      </div>
      <span style={{ flexShrink: 0, fontSize: 9, letterSpacing: ".10em", color: "#c98a4b", whiteSpace: "nowrap" }}>FICHA →</span>
    </div>
  );
}

export function PlayerCard({
  player,
  href,
  onOpen,
}: Readonly<{ player: DesignPlayer; href?: string; onOpen?: () => void }>) {
  const cardStyle: React.CSSProperties = {
    position: "relative",
    display: "flex",
    flexDirection: "column",
    background: "linear-gradient(180deg,#221b11,#120e08)",
    border: "1px solid rgba(201,138,75,.22)",
    borderRadius: 4,
    overflow: "hidden",
  };

  return (
    <div className="lob-lift" style={cardStyle}>
      <PhotoArea player={player} />
      {href ? (
        <Link href={href} style={{ textDecoration: "none", display: "block" }}>
          <Footer player={player} />
        </Link>
      ) : (
        <button
          type="button"
          onClick={onOpen}
          style={{ display: "block", width: "100%", background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: 0 }}
        >
          <Footer player={player} />
        </button>
      )}
    </div>
  );
}
