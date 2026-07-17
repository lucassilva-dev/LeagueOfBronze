import Link from "next/link";
import { notFound } from "next/navigation";

import { PlayerCard } from "@/components/lob/player-card";
import { getOpGgMultiSearchUrlFromNicks } from "@/lib/opgg";
import { buildDesignTeams } from "@/lib/roster";
import { getServerDataset } from "@/lib/server-data";

export const dynamic = "force-dynamic";

type TeamPageParams = Readonly<{ params: Promise<{ slug: string }> }>;

export default async function TeamRosterPage({ params }: TeamPageParams) {
  const { slug } = await params;
  const { dataset } = await getServerDataset();
  const team = buildDesignTeams(dataset).find((t) => t.slug === slug);

  if (!team) {
    notFound();
  }

  const multiOpGg = getOpGgMultiSearchUrlFromNicks(team.roster.map((player) => player.nick));

  return (
    <div style={{ position: "relative", maxWidth: 1280, margin: "0 auto", padding: "0 clamp(16px,4vw,24px) 96px" }}>
      <section className="lob-fade" style={{ padding: "44px 0 0" }}>
        <Link href="/times" className="lob-btn-ghost" style={{ padding: "9px 16px", fontSize: 11.5, letterSpacing: ".12em", marginBottom: 26 }}>
          ← VOLTAR AOS TIMES
        </Link>
        <div style={{ display: "flex", gap: 22, alignItems: "stretch", flexWrap: "wrap", marginBottom: 34, marginTop: 20 }}>
          <div
            style={{
              position: "relative",
              width: 150,
              height: 200,
              flexShrink: 0,
              background: team.imageUrl ? "#0d0a05" : `linear-gradient(160deg,${team.color}33,#0d0a05 74%)`,
              border: "1px solid rgba(201,138,75,.3)",
              borderRadius: 3,
              overflow: "hidden",
              clipPath: "polygon(0 0,100% 0,100% calc(100% - 16px),calc(100% - 16px) 100%,0 100%)",
            }}
          >
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, zIndex: 2, background: team.color }} />
            {team.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={team.imageUrl} alt={team.name} style={{ width: "100%", height: "100%", objectFit: "contain", padding: 14, boxSizing: "border-box" }} />
            ) : null}
          </div>
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 12, minWidth: 240, flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 11, fontSize: 11, letterSpacing: ".22em", color: team.color }}>
              <span style={{ width: 24, height: 1, background: team.color }} />
              ELENCO OFICIAL
            </div>
            <h1 className="lob-h1 gold-text" style={{ fontSize: "clamp(40px,7vw,84px)", lineHeight: 0.86 }}>{team.name}</h1>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 9, marginTop: 2 }}>
              <span style={{ display: "inline-flex", alignItems: "baseline", gap: 5, padding: "8px 14px", background: "linear-gradient(180deg,#f0c88a,#b97e40)", color: "#160f06", borderRadius: 2, fontWeight: 700 }}>
                <span className="lob-display" style={{ fontSize: 18 }}>{team.total}</span>
                <span style={{ fontSize: 10, letterSpacing: ".10em" }}>PTS DE ELENCO</span>
              </span>
              {team.captain ? (
                <span className="lob-pill" style={{ letterSpacing: ".06em" }}>◆ CAPITÃO · {team.captain.displayNick}</span>
              ) : null}
              {multiOpGg.ok ? (
                <Link href={multiOpGg.url} target="_blank" rel="noreferrer" className="lob-pill" style={{ letterSpacing: ".08em", color: "#e6c592" }}>
                  MULTI OP.GG (5) →
                </Link>
              ) : null}
            </div>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(196px,1fr))", gap: 16 }}>
          {team.roster.map((player) => (
            <PlayerCard key={player.id} player={player} href={`/jogadores/${player.slug}`} />
          ))}
        </div>
      </section>
    </div>
  );
}
