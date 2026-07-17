import Link from "next/link";

import { Eyebrow, GoldTitle, Pill, SectionTitle, TeamMark } from "@/components/lob/ui";
import { buildCalendarDays } from "@/lib/calendar";
import { buildDesignPlayers } from "@/lib/roster";
import { getServerDataset } from "@/lib/server-data";

export const dynamic = "force-dynamic";

const EXPLORE = [
  { href: "/times", label: "TIMES", desc: "Os 6 elencos e seus lineups completos." },
  { href: "/jogadores", label: "JOGADORES", desc: "Os inscritos, do Ferro ao Mestre." },
  { href: "/calendario", label: "CALENDÁRIO", desc: "15 confrontos + a Grande Final em MD5." },
  { href: "/tabela", label: "TABELA", desc: "A classificação da fase de pontos corridos." },
  { href: "/stats", label: "ESTATÍSTICAS", desc: "Rankings de jogadores e campeões." },
  { href: "/cartas", label: "CARTAS", desc: "As cartinhas surpresa que viram o jogo." },
  { href: "/regras", label: "REGRAS", desc: "Formato, draft por pontos e regulamento." },
];

export default async function InicioPage() {
  const { dataset } = await getServerDataset();
  const players = buildDesignPlayers(dataset);
  const calDays = buildCalendarDays(dataset);

  const poolTotal = players.reduce((sum, player) => sum + player.pts, 0);
  const confrontos = calDays.reduce((sum, day) => sum + day.games.length, 0);
  const diasDeJogo = calDays.length + 1; // + Grande Final (02/08)
  const abertura = calDays[0];
  const preview = abertura ? abertura.games.slice(0, 3) : [];

  const numbers = [
    { v: String(dataset.teams.length), l: "TIMES" },
    { v: String(dataset.players.length), l: "JOGADORES" },
    { v: String(confrontos), l: "CONFRONTOS" },
    { v: String(diasDeJogo), l: "DIAS DE JOGO" },
  ];

  const finalCircle = {
    width: "clamp(76px,14vw,120px)",
    height: "clamp(76px,14vw,120px)",
    margin: "0 auto",
    borderRadius: "50%",
    border: "2px dashed rgba(201,138,75,.45)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "clamp(30px,6vw,52px)",
    color: "#8a7a5f",
  };
  const finalLabel = { marginTop: 12, fontSize: 12, letterSpacing: ".10em", color: "#cdbfa8" };

  return (
    <div style={{ position: "relative", maxWidth: 1280, margin: "0 auto", padding: "0 clamp(16px,4vw,24px) 96px" }}>
      {/* HERO */}
      <section className="lob-fade" style={{ padding: "clamp(48px,8vw,88px) 0 30px" }}>
        <Eyebrow>Campeonato amador de League of Legends</Eyebrow>
        <GoldTitle style={{ fontSize: "clamp(52px,11vw,148px)", lineHeight: 1.08, margin: "12px 0 14px" }}>
          3ª EDIÇÃO
          <br />
          DOS BRONZES
        </GoldTitle>
        <p style={{ maxWidth: 600, fontSize: "clamp(15px,2.2vw,18px)", lineHeight: 1.55, color: "#a99e8b", margin: "0 0 26px" }}>
          Onde o low elo é o protagonista. Seis times forjados no draft, trinta feras do Ferro ao
          Mestre e uma taça em disputa — de 25 de julho a 02 de agosto.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 11, marginBottom: 26 }}>
          <Link href="/times" className="lob-btn-gold" style={{ padding: "14px 24px", fontSize: 13 }}>
            VER OS TIMES →
          </Link>
          <Link href="/jogadores" className="lob-btn-ghost" style={{ padding: "14px 24px", fontSize: 13 }}>
            JOGADORES
          </Link>
          <Link href="/calendario" className="lob-btn-ghost" style={{ padding: "14px 24px", fontSize: 13 }}>
            CALENDÁRIO
          </Link>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 9 }}>
          <Pill>PONTOS CORRIDOS · MD3</Pill>
          <Pill>GRANDE FINAL · MD5</Pill>
          <Pill>POOL DE {poolTotal} PONTOS</Pill>
        </div>
      </section>

      {/* GRANDE FINAL */}
      <section className="lob-fade" style={{ margin: "18px 0 44px" }}>
        <div
          style={{
            position: "relative",
            overflow: "hidden",
            border: "1px solid rgba(201,138,75,.28)",
            borderRadius: 4,
            background: "linear-gradient(135deg,#231a0f,#130f08)",
            padding: "clamp(22px,4vw,40px)",
          }}
        >
          <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 10, fontSize: 11, letterSpacing: ".24em", color: "#e6c592", justifyContent: "center" }}>
            <span style={{ width: 22, height: 1, background: "#c98a4b" }} />A GRANDE FINAL
            <span style={{ width: 22, height: 1, background: "#c98a4b" }} />
          </div>
          <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", gap: "clamp(14px,4vw,48px)", marginTop: 20, flexWrap: "wrap" }}>
            <div style={{ textAlign: "center" }}>
              <div className="lob-display" style={finalCircle}>1º</div>
              <div style={finalLabel}>1º COLOCADO</div>
            </div>
            <div className="lob-display gold-text" style={{ fontSize: "clamp(28px,7vw,58px)", lineHeight: 1, marginBottom: 30 }}>
              VS
            </div>
            <div style={{ textAlign: "center" }}>
              <div className="lob-display" style={finalCircle}>2º</div>
              <div style={finalLabel}>2º COLOCADO</div>
            </div>
          </div>
          <div style={{ position: "relative", display: "flex", justifyContent: "center", gap: 9, marginTop: 22, flexWrap: "wrap" }}>
            <span style={{ padding: "7px 14px", background: "linear-gradient(180deg,#f0c88a,#b97e40)", color: "#160f06", fontWeight: 700, fontSize: 12, letterSpacing: ".10em", borderRadius: 2 }}>
              MELHOR DE 5
            </span>
            <span style={{ padding: "7px 14px", background: "rgba(10,8,4,.5)", border: "1px solid rgba(201,138,75,.35)", color: "#e6c592", fontSize: 12, letterSpacing: ".10em", borderRadius: 2 }}>
              02 DE AGOSTO · 14:00
            </span>
          </div>
        </div>
      </section>

      {/* NÚMEROS */}
      <section className="lob-fade" style={{ marginBottom: 44 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 14 }}>
          {numbers.map((n) => (
            <div key={n.l} className="lob-card-2" style={{ textAlign: "center", padding: "22px 12px" }}>
              <div className="lob-display" style={{ fontSize: 44, lineHeight: 1, color: "#f0c88a" }}>{n.v}</div>
              <div style={{ marginTop: 8, fontSize: 11, letterSpacing: ".12em", color: "#8f8472" }}>{n.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* EXPLORE */}
      <section className="lob-fade" style={{ marginBottom: 44 }}>
        <div style={{ marginBottom: 16 }}>
          <SectionTitle>EXPLORE O CAMPEONATO</SectionTitle>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 14 }}>
          {EXPLORE.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="lob-card-2 lob-lift"
              style={{ display: "flex", flexDirection: "column", gap: 8, padding: 18, textDecoration: "none" }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span className="lob-display" style={{ fontSize: 20, color: "#f3ece0" }}>{card.label}</span>
                <span style={{ color: "#c98a4b", fontSize: 18 }}>→</span>
              </div>
              <span style={{ fontSize: 12.5, lineHeight: 1.45, color: "#8f8472" }}>{card.desc}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ABERTURA */}
      {abertura ? (
        <section className="lob-fade">
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
            <SectionTitle>ABERTURA · {abertura.dateLabel}</SectionTitle>
            <Link href="/calendario" style={{ color: "#c98a4b", fontWeight: 600, fontSize: 12, letterSpacing: ".10em" }}>
              VER CALENDÁRIO COMPLETO →
            </Link>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(320px,1fr))", gap: 12 }}>
            {preview.map((game) => (
              <Link key={game.id} href={`/partidas/${game.id}`} className="lob-card-2" style={{ padding: 16, textDecoration: "none", display: "block" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 10.5, letterSpacing: ".08em", color: "#8f8472", marginBottom: 12 }}>
                  <span>JOGO {game.n} · {game.turno.toUpperCase()}</span>
                  <span style={{ color: "#cfa877" }}>{game.hora}</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                    <TeamMark imageUrl={game.teamA.imageUrl} color={game.teamA.color} name={game.teamA.name} size={24} />
                    <span style={{ fontWeight: 600, fontSize: 13, color: "#e9dfcd", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{game.teamA.name}</span>
                  </div>
                  <span className="lob-display" style={{ fontSize: 14, color: "#6f6656" }}>MD3</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end", minWidth: 0 }}>
                    <span style={{ fontWeight: 600, fontSize: 13, color: "#e9dfcd", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "right" }}>{game.teamB.name}</span>
                    <TeamMark imageUrl={game.teamB.imageUrl} color={game.teamB.color} name={game.teamB.name} size={24} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
