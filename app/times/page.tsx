import Link from "next/link";

import { Eyebrow, GoldTitle, RoleIcon, SectionTitle } from "@/components/lob/ui";
import { rotaCurto, type PaginasHomeTextos } from "@/lib/i18n/messages/paginas-home";
import { getMessages } from "@/lib/i18n/server";
import { buildDesignTeams, type DesignTeam } from "@/lib/roster";
import { getServerDataset } from "@/lib/server-data";
import { calculateStandings } from "@/lib/tournament";

export const dynamic = "force-dynamic";

// Campanha do time na fase de pontos (vitórias/derrotas em séries e pontos).
type Campaign = { position: number; wins: number; losses: number; points: number } | null;

function TeamCard({
  team,
  campaign,
  t,
}: Readonly<{ team: DesignTeam; campaign: Campaign; t: PaginasHomeTextos }>) {
  return (
    <Link
      href={`/times/${team.slug}`}
      className="lob-lift"
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        background: "linear-gradient(180deg,#1f190f,#130f08)",
        border: "1px solid rgba(201,138,75,.22)",
        borderRadius: 3,
        overflow: "hidden",
        clipPath: "polygon(0 0,100% 0,100% calc(100% - 18px),calc(100% - 18px) 100%,0 100%)",
        textDecoration: "none",
      }}
    >
      <div style={{ height: 4, background: team.color }} />
      <div
        style={{
          position: "relative",
          width: "100%",
          height: 172,
          background: team.imageUrl
            ? "#0d0a05"
            : `linear-gradient(160deg,${team.color}2e,#0d0a05 72%)`,
        }}
      >
        {team.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={team.imageUrl} alt={team.name} style={{ width: "100%", height: "100%", objectFit: "contain", objectPosition: "center 40%", padding: 16, boxSizing: "border-box" }} />
        ) : null}
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "linear-gradient(180deg,rgba(0,0,0,.28) 0%,transparent 30%,transparent 42%,rgba(13,10,5,.97) 100%)" }} />
        <div style={{ position: "absolute", top: 11, right: 11, display: "flex", alignItems: "baseline", gap: 4, padding: "5px 10px", borderRadius: 2, background: "linear-gradient(180deg,#f0c88a,#b97e40)", color: "#160f06", fontWeight: 700, boxShadow: "0 4px 14px -4px rgba(0,0,0,.6)" }}>
          <span className="lob-display" style={{ fontSize: 17, lineHeight: 1 }}>{team.total}</span>
          <span style={{ fontSize: 10, letterSpacing: ".10em" }}>{t.ptsDraft}</span>
        </div>
        <div style={{ position: "absolute", left: 14, bottom: 12, right: 14 }}>
          <div className="lob-display" style={{ fontSize: "clamp(22px,3.4vw,30px)", lineHeight: 0.9, color: "#f4ede1", letterSpacing: ".01em" }}>{team.name}</div>
          {team.captain ? (
            <div style={{ marginTop: 6, fontSize: 11, letterSpacing: ".05em", color: "#cfa877" }}>{t.timesCapitaoCurto} · {team.captain.displayNick}</div>
          ) : null}
        </div>
      </div>
      <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 13 }}>
        <div style={{ display: "flex", gap: 6 }}>
          {team.roster.map((player) => (
            <span
              key={player.id}
              style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "6px 0", borderRadius: 2, background: "rgba(201,138,75,.10)", borderBottom: `2px solid ${player.roleMeta.color}`, color: "#cdbfa8", fontSize: 9.5, fontWeight: 600, letterSpacing: ".03em" }}
            >
              <RoleIcon role={player.role1} size={15} color={player.roleMeta.color} />
              {rotaCurto(t, player.roleMeta.short)}
            </span>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 11, letterSpacing: ".05em", color: "#8f8472" }}>
          <span>{t.timesCampanha}{campaign ? ` · #${campaign.position}` : ""}</span>
          {campaign ? (
            <span style={{ color: "#b8ab97" }}>
              {campaign.wins}{t.timesVitoriasCurto} · {campaign.losses}{t.timesDerrotasCurto} ·{" "}
              <span style={{ color: "#cfa877" }}>{campaign.points} {t.timesPontosCurto}</span>
            </span>
          ) : (
            <span style={{ color: "#6f6656" }}>{t.timesSemSeries}</span>
          )}
        </div>
        <span className="lob-btn-ghost" style={{ width: "100%", padding: 12, fontSize: 12, letterSpacing: ".16em" }}>{t.timesVerElenco}</span>
      </div>
    </Link>
  );
}

export default async function TimesPage() {
  const { paginasHome: t } = await getMessages();
  const { dataset } = await getServerDataset();
  const teams = buildDesignTeams(dataset);

  const standings = calculateStandings(dataset);
  // Só entra no mapa quem já jogou. A classificação lista TODOS os times, inclusive os
  // que ainda não têm série, então sem este filtro o `?? null` abaixo nunca acontecia:
  // um time recém-criado aparecia com "1º · 0V 0D · 0 pts" — igual a quem jogou e
  // perdeu tudo — em vez do rótulo "sem séries" que o card já sabe mostrar.
  const campaignByTeam = new Map<string, NonNullable<Campaign>>(
    standings.rows
      .filter((row) => row.seriesPlayed > 0)
      .map((row) => [
        row.teamId,
        { position: row.position, wins: row.seriesWon, losses: row.seriesLost, points: row.points },
      ]),
  );

  return (
    <div style={{ position: "relative", maxWidth: 1280, margin: "0 auto", padding: "0 clamp(16px,4vw,24px) 96px" }}>
      <section className="lob-fade" style={{ padding: "clamp(40px,7vw,56px) 0 26px" }}>
        <Eyebrow>{t.edicaoSobretitulo}</Eyebrow>
        <GoldTitle style={{ fontSize: "clamp(52px,11vw,138px)", lineHeight: 0.88 }}>{t.timesTitulo}</GoldTitle>
        <p style={{ maxWidth: 560, fontSize: 16, lineHeight: 1.55, color: "#a99e8b", margin: 0 }}>
          {t.timesIntro}
        </p>
      </section>
      <section className="lob-fade">
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
          <SectionTitle size={26}>{t.timesSecao.replace("{n}", String(teams.length))}</SectionTitle>
          <span style={{ fontSize: 11, letterSpacing: ".10em", color: "#8f8472" }}>{t.timesDica}</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 18 }}>
          {teams.map((team) => (
            <TeamCard key={team.id} team={team} campaign={campaignByTeam.get(team.id) ?? null} t={t} />
          ))}
        </div>
      </section>
    </div>
  );
}
