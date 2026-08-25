import Link from "next/link";

import { Eyebrow, GoldTitle, Pill, TeamMark } from "@/components/lob/ui";
import { buildCalendarDays, buildFinalGame } from "@/lib/calendar";
import { getLocale, getMessages } from "@/lib/i18n/server";
import { getServerDataset } from "@/lib/server-data";

export const dynamic = "force-dynamic";

/**
 * O dia da semana vem pronto em pt-BR de lib/calendar. Em inglês reformatamos a partir da
 * data original, mantendo o fuso de Brasília para não trocar o dia perto da meia-noite.
 */
function diaDaSemanaEmIngles(dateKey: string, fallback: string) {
  const date = new Date(`${dateKey}T12:00:00-03:00`);
  if (Number.isNaN(date.getTime())) return fallback;
  return new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: "America/Sao_Paulo" })
    .format(date)
    .toUpperCase();
}

export default async function CalendarioPage() {
  const locale = await getLocale();
  const t = await getMessages();
  const textos = t.paginasCompeticao;
  const turnoLabel = (turno: string) => {
    if (turno === "Matutino") return textos.calendarioTurnoMatutino;
    if (turno === "Vespertino") return textos.calendarioTurnoVespertino;
    if (turno === "Noturno") return textos.calendarioTurnoNoturno;
    return turno.toUpperCase();
  };
  const { dataset } = await getServerDataset();
  const days = buildCalendarDays(dataset);
  const confrontos = days.reduce((sum, day) => sum + day.games.length, 0);
  const finalGame = buildFinalGame(dataset);
  const finalPlayed = finalGame ? finalGame.scoreA + finalGame.scoreB > 0 : false;
  const finalAWon = finalGame ? finalGame.done && finalGame.winnerId === finalGame.teamA.id : false;
  const finalBWon = finalGame ? finalGame.done && finalGame.winnerId === finalGame.teamB.id : false;

  return (
    <div style={{ position: "relative", maxWidth: 1280, margin: "0 auto", padding: "0 clamp(16px,4vw,24px) 96px" }}>
      <section className="lob-fade" style={{ padding: "clamp(40px,7vw,56px) 0 20px" }}>
        <Eyebrow>{textos.calendarioEyebrow}</Eyebrow>
        <GoldTitle style={{ fontSize: "clamp(44px,10vw,120px)", lineHeight: 0.88 }}>{textos.calendarioTitulo}</GoldTitle>
        <p style={{ maxWidth: 620, fontSize: 16, lineHeight: 1.55, color: "#a99e8b", margin: "0 0 20px" }}>
          {textos.calendarioIntro}
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 9 }}>
          <Pill dot={false}>{textos.calendarioPillMatutino}</Pill>
          <Pill dot={false}>{textos.calendarioPillVespertino}</Pill>
          <Pill dot={false}>{textos.calendarioPillNoturno}</Pill>
          <Pill dot={false}>{confrontos} {textos.calendarioPillConfrontos}</Pill>
        </div>
      </section>

      {days.map((day) => (
        <section key={day.dateKey} className="lob-fade" style={{ marginTop: 34 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
              <span className="lob-display" style={{ fontSize: 32, color: "#f2ebdf" }}>{day.dateLabel}</span>
              <span style={{ fontSize: 12, letterSpacing: ".12em", color: "#c98a4b" }}>
                {locale === "en" ? diaDaSemanaEmIngles(day.dateKey, day.dia) : day.dia}
              </span>
            </div>
            <div style={{ height: 1, flex: 1, background: "linear-gradient(90deg,rgba(201,138,75,.4),transparent)" }} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(330px,1fr))", gap: 12 }}>
            {day.games.map((game) => {
              const played = game.scoreA + game.scoreB > 0;
              const aWon = game.done && game.winnerId === game.teamA.id;
              const bWon = game.done && game.winnerId === game.teamB.id;
              const nameColor = (won: boolean) => (game.done ? (won ? "#f5d79a" : "#7c715e") : "#e9dfcd");
              return (
              <Link key={game.id} href={`/partidas/${game.id}`} className="lob-card-2 lob-lift" style={{ padding: "16px 18px", textDecoration: "none", display: "block", background: game.done ? "linear-gradient(180deg,#15170f,#0c0d07)" : undefined, borderColor: game.done ? (game.walkover ? "rgba(232,184,120,.42)" : "rgba(95,191,106,.32)") : undefined }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 10.5, letterSpacing: ".08em", color: "#8f8472", marginBottom: 14 }}>
                  <span>{textos.calendarioJogo} {game.n} · {turnoLabel(game.turno)}</span>
                  {game.done ? (
                    game.walkover ? (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 2, background: "rgba(232,184,120,.16)", border: "1px solid rgba(232,184,120,.5)", color: "#e6c592", fontWeight: 700 }}>⚖ {textos.calendarioStatusWo}</span>
                    ) : (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 2, background: "rgba(95,191,106,.16)", border: "1px solid rgba(95,191,106,.5)", color: "#8fe0a0", fontWeight: 700 }}>✓ {textos.calendarioStatusFinalizado}</span>
                    )
                  ) : (
                    <span style={{ padding: "2px 8px", border: "1px solid rgba(201,138,75,.3)", borderRadius: 2, color: "#cfa877" }}>{game.hora}</span>
                  )}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                    <TeamMark imageUrl={game.teamA.imageUrl} color={game.teamA.color} name={game.teamA.name} size={24} />
                    <span style={{ fontWeight: aWon ? 700 : 600, fontSize: 13.5, color: nameColor(aWon), overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{game.teamA.name}</span>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div className="lob-display" style={{ fontSize: 22, color: played ? "#f0c88a" : "#6f6656", letterSpacing: ".08em" }}>{played ? `${game.scoreA} – ${game.scoreB}` : "—"}</div>
                    <div style={{ fontSize: 9, letterSpacing: ".10em", color: "#5f5747", marginTop: 2 }}>{textos.formatoBo3}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, justifyContent: "flex-end" }}>
                    <span style={{ fontWeight: bWon ? 700 : 600, fontSize: 13.5, color: nameColor(bWon), overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "right" }}>{game.teamB.name}</span>
                    <TeamMark imageUrl={game.teamB.imageUrl} color={game.teamB.color} name={game.teamB.name} size={24} />
                  </div>
                </div>
                {game.walkover ? (
                  <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid rgba(201,138,75,.14)", fontSize: 11, lineHeight: 1.45, color: "#cbb892" }}>
                    <span style={{ color: "#e6b356", fontWeight: 700 }}>{textos.calendarioVitoriaWo}</span>
                    {game.walkoverReason ? <> · {game.walkoverReason}</> : null}
                  </div>
                ) : null}
              </Link>
              );
            })}
          </div>
        </section>
      ))}

      {/* GRANDE FINAL */}
      <section className="lob-fade" style={{ marginTop: 40 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <span className="lob-display" style={{ fontSize: 32, color: "#f2ebdf" }}>{finalGame?.dateLabel ?? "02/08"}</span>
            <span style={{ fontSize: 12, letterSpacing: ".12em", color: "#c98a4b" }}>{textos.calendarioFinalDia}</span>
          </div>
          <div style={{ height: 1, flex: 1, background: "linear-gradient(90deg,rgba(232,184,120,.5),transparent)" }} />
        </div>
        {finalGame ? (
          <Link href={`/partidas/${finalGame.id}`} className="lob-lift" style={{ position: "relative", overflow: "hidden", display: "block", textDecoration: "none", padding: 22, border: "1px solid rgba(232,184,120,.4)", borderRadius: 3, background: "linear-gradient(135deg,#241a0e,#130f08)" }}>
            <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(500px 220px at 50% -30%,rgba(232,184,120,.16),transparent 70%)" }} />
            <div style={{ position: "relative", display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "flex-end", minWidth: 0 }}>
                <span className="lob-display" style={{ textAlign: "right", fontSize: "clamp(15px,3vw,26px)", color: finalAWon ? "#f5d79a" : "#e9dfcd", overflow: "hidden", textOverflow: "ellipsis" }}>{finalGame.teamA.name}</span>
                <TeamMark imageUrl={finalGame.teamA.imageUrl} color={finalGame.teamA.color} name={finalGame.teamA.name} size={40} />
              </div>
              <div className="lob-display gold-text" style={{ textAlign: "center", fontSize: "clamp(22px,5vw,40px)", whiteSpace: "nowrap" }}>
                {finalPlayed ? `${finalGame.scoreA} – ${finalGame.scoreB}` : textos.calendarioVs}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "flex-start", minWidth: 0 }}>
                <TeamMark imageUrl={finalGame.teamB.imageUrl} color={finalGame.teamB.color} name={finalGame.teamB.name} size={40} />
                <span className="lob-display" style={{ textAlign: "left", fontSize: "clamp(15px,3vw,26px)", color: finalBWon ? "#f5d79a" : "#e9dfcd", overflow: "hidden", textOverflow: "ellipsis" }}>{finalGame.teamB.name}</span>
              </div>
            </div>
            <div style={{ position: "relative", display: "flex", justifyContent: "center", gap: 9, marginTop: 18, flexWrap: "wrap" }}>
              <span style={{ padding: "6px 13px", background: "linear-gradient(180deg,#f0c88a,#b97e40)", color: "#160f06", fontWeight: 700, fontSize: 11, letterSpacing: ".10em", borderRadius: 2 }}>{textos.calendarioFinalMelhorDe5}</span>
              <span style={{ padding: "6px 13px", background: "rgba(10,8,4,.5)", border: "1px solid rgba(201,138,75,.35)", color: "#e6c592", fontSize: 11, letterSpacing: ".10em", borderRadius: 2 }}>{finalGame.hora ? `${finalGame.hora} · ` : ""}{textos.calendarioFinalConfronto}</span>
            </div>
          </Link>
        ) : (
          <div style={{ position: "relative", overflow: "hidden", padding: 22, border: "1px solid rgba(232,184,120,.4)", borderRadius: 3, background: "linear-gradient(135deg,#241a0e,#130f08)" }}>
            <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(500px 220px at 50% -30%,rgba(232,184,120,.16),transparent 70%)" }} />
            <div style={{ position: "relative", display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 14 }}>
              <div className="lob-display" style={{ textAlign: "right", fontSize: "clamp(16px,3vw,26px)", color: "#e9dfcd" }}>{textos.calendarioFinalPrimeiro}</div>
              <div className="lob-display gold-text" style={{ textAlign: "center", fontSize: "clamp(24px,5vw,40px)" }}>{textos.calendarioVs}</div>
              <div className="lob-display" style={{ textAlign: "left", fontSize: "clamp(16px,3vw,26px)", color: "#e9dfcd" }}>{textos.calendarioFinalSegundo}</div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
