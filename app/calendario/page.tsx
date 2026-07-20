import Link from "next/link";

import { Eyebrow, GoldTitle, Pill, TeamMark } from "@/components/lob/ui";
import { buildCalendarDays } from "@/lib/calendar";
import { getServerDataset } from "@/lib/server-data";

export const dynamic = "force-dynamic";

export default async function CalendarioPage() {
  const { dataset } = await getServerDataset();
  const days = buildCalendarDays(dataset);
  const confrontos = days.reduce((sum, day) => sum + day.games.length, 0);

  return (
    <div style={{ position: "relative", maxWidth: 1280, margin: "0 auto", padding: "0 clamp(16px,4vw,24px) 96px" }}>
      <section className="lob-fade" style={{ padding: "clamp(40px,7vw,56px) 0 20px" }}>
        <Eyebrow>3ª Edição dos Bronzes</Eyebrow>
        <GoldTitle style={{ fontSize: "clamp(44px,10vw,120px)", lineHeight: 0.88, margin: "10px 0 16px" }}>CALENDÁRIO</GoldTitle>
        <p style={{ maxWidth: 620, fontSize: 16, lineHeight: 1.55, color: "#a99e8b", margin: "0 0 20px" }}>
          Fase de pontos corridos: todos contra todos, cada confronto em melhor de 3 (MD3). Os dois
          primeiros da tabela decidem tudo na Grande Final em MD5.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 9 }}>
          <Pill dot={false}>MATUTINO · 9h–12h</Pill>
          <Pill dot={false}>NOTURNO · 20h–23h</Pill>
          <Pill dot={false}>{confrontos} CONFRONTOS + FINAL</Pill>
        </div>
      </section>

      {days.map((day) => (
        <section key={day.dateKey} className="lob-fade" style={{ marginTop: 34 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
              <span className="lob-display" style={{ fontSize: 32, color: "#f2ebdf" }}>{day.dateLabel}</span>
              <span style={{ fontSize: 12, letterSpacing: ".12em", color: "#c98a4b" }}>{day.dia}</span>
            </div>
            <div style={{ height: 1, flex: 1, background: "linear-gradient(90deg,rgba(201,138,75,.4),transparent)" }} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(330px,1fr))", gap: 12 }}>
            {day.games.map((game) => (
              <Link key={game.id} href={`/partidas/${game.id}`} className="lob-card-2 lob-lift" style={{ padding: "16px 18px", textDecoration: "none", display: "block" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 10.5, letterSpacing: ".08em", color: "#8f8472", marginBottom: 14 }}>
                  <span>JOGO {game.n} · {game.turno.toUpperCase()}</span>
                  <span style={{ padding: "2px 8px", border: "1px solid rgba(201,138,75,.3)", borderRadius: 2, color: "#cfa877" }}>{game.hora}</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                    <TeamMark imageUrl={game.teamA.imageUrl} color={game.teamA.color} name={game.teamA.name} size={24} />
                    <span style={{ fontWeight: 600, fontSize: 13.5, color: "#e9dfcd", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{game.teamA.name}</span>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div className="lob-display" style={{ fontSize: 22, color: "#6f6656", letterSpacing: ".05em" }}>—</div>
                    <div style={{ fontSize: 9, letterSpacing: ".10em", color: "#5f5747", marginTop: 2 }}>MD3</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, justifyContent: "flex-end" }}>
                    <span style={{ fontWeight: 600, fontSize: 13.5, color: "#e9dfcd", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "right" }}>{game.teamB.name}</span>
                    <TeamMark imageUrl={game.teamB.imageUrl} color={game.teamB.color} name={game.teamB.name} size={24} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ))}

      {/* GRANDE FINAL */}
      <section className="lob-fade" style={{ marginTop: 40 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <span className="lob-display" style={{ fontSize: 32, color: "#f2ebdf" }}>02/08</span>
            <span style={{ fontSize: 12, letterSpacing: ".12em", color: "#c98a4b" }}>DOMINGO · GRANDE FINAL</span>
          </div>
          <div style={{ height: 1, flex: 1, background: "linear-gradient(90deg,rgba(232,184,120,.5),transparent)" }} />
        </div>
        <div style={{ position: "relative", overflow: "hidden", padding: 22, border: "1px solid rgba(232,184,120,.4)", borderRadius: 3, background: "linear-gradient(135deg,#241a0e,#130f08)" }}>
          <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(500px 220px at 50% -30%,rgba(232,184,120,.16),transparent 70%)" }} />
          <div style={{ position: "relative", display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 14 }}>
            <div className="lob-display" style={{ textAlign: "right", fontSize: "clamp(16px,3vw,26px)", color: "#e9dfcd" }}>1º COLOCADO</div>
            <div className="lob-display gold-text" style={{ textAlign: "center", fontSize: "clamp(24px,5vw,40px)" }}>VS</div>
            <div className="lob-display" style={{ textAlign: "left", fontSize: "clamp(16px,3vw,26px)", color: "#e9dfcd" }}>2º COLOCADO</div>
          </div>
          <div style={{ position: "relative", display: "flex", justifyContent: "center", gap: 9, marginTop: 18, flexWrap: "wrap" }}>
            <span style={{ padding: "6px 13px", background: "linear-gradient(180deg,#f0c88a,#b97e40)", color: "#160f06", fontWeight: 700, fontSize: 11, letterSpacing: ".10em", borderRadius: 2 }}>MELHOR DE 5</span>
            <span style={{ padding: "6px 13px", background: "rgba(10,8,4,.5)", border: "1px solid rgba(201,138,75,.35)", color: "#e6c592", fontSize: 11, letterSpacing: ".10em", borderRadius: 2 }}>14:00 · VESPERTINO</span>
          </div>
        </div>
      </section>
    </div>
  );
}
