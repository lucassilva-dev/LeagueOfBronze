import Link from "next/link";

import { Eyebrow, GoldTitle, Pill, SectionTitle, TeamMark } from "@/components/lob/ui";
import { buildCalendarDays, buildFinalGame } from "@/lib/calendar";
import { turnoLabel } from "@/lib/i18n/messages/paginas-home";
import { getMessages } from "@/lib/i18n/server";
import { getDisplayNick } from "@/lib/opgg";
import { buildDesignPlayers } from "@/lib/roster";
import { getServerDataset } from "@/lib/server-data";
import { getChampionshipResult } from "@/lib/tournament";

export const dynamic = "force-dynamic";

export default async function InicioPage() {
  const { paginasHome: t } = await getMessages();
  const { dataset, indexes } = await getServerDataset();

  const explore = [
    { href: "/times", label: t.homeExploreTimes, desc: t.homeExploreTimesDesc },
    { href: "/jogadores", label: t.homeExploreJogadores, desc: t.homeExploreJogadoresDesc },
    { href: "/calendario", label: t.homeExploreCalendario, desc: t.homeExploreCalendarioDesc },
    { href: "/tabela", label: t.homeExploreTabela, desc: t.homeExploreTabelaDesc },
    { href: "/stats", label: t.homeExploreStats, desc: t.homeExploreStatsDesc },
    { href: "/cartas", label: t.homeExploreCartas, desc: t.homeExploreCartasDesc },
    { href: "/regras", label: t.homeExploreRegras, desc: t.homeExploreRegrasDesc },
  ];
  const players = buildDesignPlayers(dataset);
  const calDays = buildCalendarDays(dataset);

  // Campeão (definido quando a Grande Final termina) e a própria série da final.
  const championship = getChampionshipResult(dataset);
  const finalGame = buildFinalGame(dataset);
  const championTeam = championship ? indexes.teamsById.get(championship.championTeamId) ?? null : null;
  const runnerUpTeam = championship ? indexes.teamsById.get(championship.runnerUpTeamId) ?? null : null;
  const championOnSideA = championship
    ? championship.championTeamId === championship.summary.series.teamAId
    : false;
  const championWins = championship
    ? (championOnSideA ? championship.summary.score.teamAWins : championship.summary.score.teamBWins)
    : 0;
  const runnerUpWins = championship
    ? (championOnSideA ? championship.summary.score.teamBWins : championship.summary.score.teamAWins)
    : 0;
  const finalMvpNick = championship?.summary.mvp
    ? indexes.playersById.get(championship.summary.mvp.playerId)?.nick
    : undefined;

  const poolTotal = players.reduce((sum, player) => sum + player.pts, 0);
  const confrontos = calDays.reduce((sum, day) => sum + day.games.length, 0);
  const diasDeJogo = calDays.length + 1; // + Grande Final (02/08)
  const abertura = calDays[0];
  const preview = abertura ? abertura.games.slice(0, 3) : [];

  const numbers = [
    { v: String(dataset.teams.length), l: t.homeNumTimes },
    { v: String(dataset.players.length), l: t.homeNumJogadores },
    { v: String(confrontos), l: t.homeNumConfrontos },
    { v: String(diasDeJogo), l: t.homeNumDias },
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
        <Eyebrow>{t.homeSobretitulo}</Eyebrow>
        <GoldTitle style={{ fontSize: "clamp(52px,11vw,148px)", lineHeight: 1.08, margin: "12px 0 14px" }}>
          {t.homeTituloLinha1}
          <br />
          {t.homeTituloLinha2}
        </GoldTitle>
        <p style={{ maxWidth: 600, fontSize: "clamp(15px,2.2vw,18px)", lineHeight: 1.55, color: "#a99e8b", margin: "0 0 26px" }}>
          {t.homeIntro}
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 11, marginBottom: 26 }}>
          <Link href="/times" className="lob-btn-gold" style={{ padding: "14px 24px", fontSize: 13 }}>
            {t.homeBotaoTimes}
          </Link>
          <Link href="/jogadores" className="lob-btn-ghost" style={{ padding: "14px 24px", fontSize: 13 }}>
            {t.homeBotaoJogadores}
          </Link>
          <Link href="/calendario" className="lob-btn-ghost" style={{ padding: "14px 24px", fontSize: 13 }}>
            {t.homeBotaoCalendario}
          </Link>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 9 }}>
          <Pill>{t.homePilulaFase}</Pill>
          <Pill>{t.homePilulaFinal}</Pill>
          <Pill>{t.homePilulaPool.replace("{n}", String(poolTotal))}</Pill>
        </div>
      </section>

      {/* GRANDE FINAL / CAMPEÃO */}
      <section className="lob-fade" style={{ margin: "18px 0 44px" }}>
        {championship && championTeam ? (
          <Link
            href={`/partidas/${championship.summary.series.id}`}
            className="lob-lift"
            style={{
              position: "relative",
              display: "block",
              overflow: "hidden",
              textDecoration: "none",
              border: "1px solid rgba(232,184,120,.5)",
              borderRadius: 4,
              background: "linear-gradient(135deg,#2b1f0f,#140f07)",
              padding: "clamp(24px,4vw,44px)",
              boxShadow: "0 30px 90px -40px rgba(232,184,120,.5)",
            }}
          >
            <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(640px 260px at 50% -10%,rgba(232,184,120,.22),transparent 70%)" }} />
            <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 10, fontSize: 11, letterSpacing: ".24em", color: "#e6c592", justifyContent: "center" }}>
              <span style={{ width: 22, height: 1, background: "#c98a4b" }} />{t.homeCampeaoSobretitulo}
              <span style={{ width: 22, height: 1, background: "#c98a4b" }} />
            </div>
            <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", marginTop: 22 }}>
              <div style={{ fontSize: "clamp(34px,7vw,56px)", lineHeight: 1 }}>🏆</div>
              <div style={{ marginTop: 16 }}>
                <TeamMark imageUrl={championTeam.imageUrl} color="#e6c592" name={championTeam.name} size={92} diamond={34} />
              </div>
              <div className="lob-display gold-text" style={{ marginTop: 16, fontSize: "clamp(28px,6.5vw,62px)", lineHeight: 1.06, textAlign: "center" }}>
                {championTeam.name.toUpperCase()}
              </div>
              <p style={{ margin: "14px 0 0", maxWidth: 560, textAlign: "center", fontSize: "clamp(13px,2vw,15px)", lineHeight: 1.55, color: "#cdbfa8" }}>
                {t.homeCampeaoAntes}
                {runnerUpTeam?.name ?? championship.runnerUpTeamId}
                {t.homeCampeaoMeio}
                <span style={{ color: "#f5d79a", fontWeight: 700 }}>{championWins}–{runnerUpWins}</span>
                {t.homeCampeaoDepois}
              </p>
            </div>
            <div style={{ position: "relative", display: "flex", justifyContent: "center", gap: 9, marginTop: 22, flexWrap: "wrap" }}>
              <span style={{ padding: "7px 14px", background: "linear-gradient(180deg,#f0c88a,#b97e40)", color: "#160f06", fontWeight: 700, fontSize: 12, letterSpacing: ".10em", borderRadius: 2 }}>
                {championWins}–{runnerUpWins} · {t.homeFinalMelhorDe5}
              </span>
              {finalMvpNick ? (
                <span style={{ padding: "7px 14px", background: "rgba(10,8,4,.5)", border: "1px solid rgba(201,138,75,.35)", color: "#e6c592", fontSize: 12, letterSpacing: ".10em", borderRadius: 2 }}>
                  {t.homeCampeaoMvp} · {getDisplayNick(finalMvpNick).toUpperCase()}
                </span>
              ) : null}
              <span style={{ padding: "7px 14px", background: "rgba(10,8,4,.5)", border: "1px solid rgba(201,138,75,.35)", color: "#e6c592", fontSize: 12, letterSpacing: ".10em", borderRadius: 2 }}>
                {t.homeCampeaoVerFinal}
              </span>
            </div>
          </Link>
        ) : (
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
              <span style={{ width: 22, height: 1, background: "#c98a4b" }} />{t.homeFinalSobretitulo}
              <span style={{ width: 22, height: 1, background: "#c98a4b" }} />
            </div>
            <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", gap: "clamp(14px,4vw,48px)", marginTop: 20, flexWrap: "wrap" }}>
              <div style={{ textAlign: "center" }}>
                {finalGame ? (
                  <>
                    <div style={{ display: "flex", justifyContent: "center" }}>
                      <TeamMark imageUrl={finalGame.teamA.imageUrl} color={finalGame.teamA.color} name={finalGame.teamA.name} size={76} diamond={28} />
                    </div>
                    <div style={finalLabel}>{finalGame.teamA.name.toUpperCase()}</div>
                  </>
                ) : (
                  <>
                    <div className="lob-display" style={finalCircle}>{t.homeFinalPrimeiro}</div>
                    <div style={finalLabel}>{t.homeFinalPrimeiroLabel}</div>
                  </>
                )}
              </div>
              <div className="lob-display gold-text" style={{ fontSize: "clamp(28px,7vw,58px)", lineHeight: 1, marginBottom: 30 }}>
                {t.homeFinalVs}
              </div>
              <div style={{ textAlign: "center" }}>
                {finalGame ? (
                  <>
                    <div style={{ display: "flex", justifyContent: "center" }}>
                      <TeamMark imageUrl={finalGame.teamB.imageUrl} color={finalGame.teamB.color} name={finalGame.teamB.name} size={76} diamond={28} />
                    </div>
                    <div style={finalLabel}>{finalGame.teamB.name.toUpperCase()}</div>
                  </>
                ) : (
                  <>
                    <div className="lob-display" style={finalCircle}>{t.homeFinalSegundo}</div>
                    <div style={finalLabel}>{t.homeFinalSegundoLabel}</div>
                  </>
                )}
              </div>
            </div>
            <div style={{ position: "relative", display: "flex", justifyContent: "center", gap: 9, marginTop: 22, flexWrap: "wrap" }}>
              <span style={{ padding: "7px 14px", background: "linear-gradient(180deg,#f0c88a,#b97e40)", color: "#160f06", fontWeight: 700, fontSize: 12, letterSpacing: ".10em", borderRadius: 2 }}>
                {t.homeFinalMelhorDe5}
              </span>
              <span style={{ padding: "7px 14px", background: "rgba(10,8,4,.5)", border: "1px solid rgba(201,138,75,.35)", color: "#e6c592", fontSize: 12, letterSpacing: ".10em", borderRadius: 2 }}>
                {t.homeFinalData}
              </span>
            </div>
          </div>
        )}
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
          <SectionTitle>{t.homeExploreTitulo}</SectionTitle>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 14 }}>
          {explore.map((card) => (
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
            <SectionTitle>{t.homeAbertura} · {abertura.dateLabel}</SectionTitle>
            <Link href="/calendario" style={{ color: "#c98a4b", fontWeight: 600, fontSize: 12, letterSpacing: ".10em" }}>
              {t.homeVerCalendario}
            </Link>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(320px,1fr))", gap: 12 }}>
            {preview.map((game) => {
              const played = game.scoreA + game.scoreB > 0;
              const aWon = game.done && game.winnerId === game.teamA.id;
              const bWon = game.done && game.winnerId === game.teamB.id;
              const nameColor = (won: boolean) => (game.done ? (won ? "#f5d79a" : "#7c715e") : "#e9dfcd");
              return (
              <Link key={game.id} href={`/partidas/${game.id}`} className="lob-card-2" style={{ padding: 16, textDecoration: "none", display: "block", background: game.done ? "linear-gradient(180deg,#15170f,#0c0d07)" : undefined, borderColor: game.done ? "rgba(95,191,106,.32)" : undefined }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 10.5, letterSpacing: ".08em", color: "#8f8472", marginBottom: 12 }}>
                  <span>{t.homeJogo} {game.n} · {turnoLabel(t, game.turno).toUpperCase()}</span>
                  {game.done ? (
                    <span style={{ padding: "1px 7px", borderRadius: 2, background: "rgba(95,191,106,.16)", border: "1px solid rgba(95,191,106,.5)", color: "#8fe0a0", fontWeight: 700 }}>{t.homeFinalizado}</span>
                  ) : (
                    <span style={{ color: "#cfa877" }}>{game.hora}</span>
                  )}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                    <TeamMark imageUrl={game.teamA.imageUrl} color={game.teamA.color} name={game.teamA.name} size={24} />
                    <span style={{ fontWeight: aWon ? 700 : 600, fontSize: 13, color: nameColor(aWon), overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{game.teamA.name}</span>
                  </div>
                  <span className="lob-display" style={{ fontSize: played ? 17 : 14, color: played ? "#f0c88a" : "#6f6656" }}>{played ? `${game.scoreA} – ${game.scoreB}` : t.homeMd3}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end", minWidth: 0 }}>
                    <span style={{ fontWeight: bWon ? 700 : 600, fontSize: 13, color: nameColor(bWon), overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "right" }}>{game.teamB.name}</span>
                    <TeamMark imageUrl={game.teamB.imageUrl} color={game.teamB.color} name={game.teamB.name} size={24} />
                  </div>
                </div>
              </Link>
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}
