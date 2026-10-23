import type { Metadata } from "next";
import Link from "next/link";

import { CalendarioDa4a } from "@/components/calendario-4a";
import { Eyebrow, GoldTitle, Pill, TeamMark } from "@/components/lob/ui";
import { PreTemporadaAviso } from "@/components/pre-temporada-aviso";
import {
  CALENDARIO_4A,
  calendarioEDestaTemporada,
  calendarioPorVirOuADivulgar,
  diaDoSlot,
  horaDoSlot,
} from "@/lib/calendario-4a";
import { emPreTemporada, semTemporadaAoVivo } from "@/lib/fase-do-site";
import { buildCalendarDays, buildFinalGame, buildSemifinalGames, type CalGame } from "@/lib/calendar";
import { metadadosDaPagina } from "@/lib/i18n/metadados";
import { getLocale, getMessages } from "@/lib/i18n/server";
import type { Messages } from "@/lib/i18n/messages";
import { getServerDataset } from "@/lib/server-data";
import { nomeDaTemporada } from "@/lib/i18n/nome-da-temporada";

export const dynamic = "force-dynamic";

/** Título e descrição próprios, no idioma da visita (lib/i18n/messages/metadados.ts). */
export async function generateMetadata(): Promise<Metadata> {
  return metadadosDaPagina("calendario", "/calendario");
}

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

type Textos = Messages["paginasCompeticao"];

/**
 * O calendário PLANEJADO da 4ª (lib/calendario-4a.ts) aparece enquanto a temporada ao vivo
 * não tem série nenhuma para mostrar:
 *  - na pré-temporada com a 3ª ainda no ar e já encerrada (o dataset ao vivo é o dela até
 *    alguém iniciar a 4ª no painel — mostrar o calendário de julho seria mostrar o passado);
 *  - entre iniciar a 4ª e criar as séries (sem times, ou com os times do draft e zero séries).
 * Assim que as séries existem (o painel cria as da fase de pontos a partir da grade), esta
 * página passa a mostrar as séries de verdade, com os nomes dos times.
 *
 * Com as datas a divulgar (8 times, desde 2026-10-22), o "planejado" é o formato com o aviso
 * de "a divulgar" — `CalendarioDa4a` decide. Depois de divulgada, só enquanto a grade
 * ainda está por vir: passada a final, a grade da 4ª com "Time 1…8" não pode reaparecer na
 * pré-temporada da edição seguinte.
 */
function mostrarPlanejado(dataset: Parameters<typeof semTemporadaAoVivo>[0] & { tournament: { status: string } }) {
  if (!calendarioPorVirOuADivulgar()) return false;
  if (dataset.seriesMatches.length === 0) return true;
  if (semTemporadaAoVivo(dataset)) return true;
  return emPreTemporada() && dataset.tournament.status === "finished";
}

function CartaoDaSerie({ game, textos, turnoLabel }: Readonly<{ game: CalGame; textos: Textos; turnoLabel: (turno: string) => string }>) {
  const played = game.scoreA + game.scoreB > 0;
  const aWon = game.done && game.winnerId === game.teamA.id;
  const bWon = game.done && game.winnerId === game.teamB.id;
  const nameColor = (won: boolean) => (game.done ? (won ? "#f5d79a" : "#7c715e") : "#e9dfcd");
  const rotulo = game.stage === "SEMIFINAL" ? textos.faseSemifinal.toUpperCase() : textos.calendarioJogo;
  return (
    <Link href={`/partidas/${game.id}`} className="lob-card-2 lob-lift" style={{ padding: "16px 18px", textDecoration: "none", display: "block", background: game.done ? "linear-gradient(180deg,#15170f,#0c0d07)" : undefined, borderColor: game.done ? (game.walkover ? "rgba(232,184,120,.42)" : "rgba(95,191,106,.32)") : undefined }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 10.5, letterSpacing: ".08em", color: "#8f8472", marginBottom: 14 }}>
        <span>{rotulo} {game.n}{game.turno ? ` · ${turnoLabel(game.turno)}` : ""}</span>
        {game.done ? (
          game.walkover ? (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 2, background: "rgba(232,184,120,.16)", border: "1px solid rgba(232,184,120,.5)", color: "#e6c592", fontWeight: 700 }}>⚖ {textos.calendarioStatusWo}</span>
          ) : (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 2, background: "rgba(95,191,106,.16)", border: "1px solid rgba(95,191,106,.5)", color: "#8fe0a0", fontWeight: 700 }}>✓ {textos.calendarioStatusFinalizado}</span>
          )
        ) : (
          // Sem horário definido não se desenha o selo: antes sobrava uma
          // borda com nada dentro na série ainda sem hora marcada.
          game.hora ? (
            <span style={{ padding: "2px 8px", border: "1px solid rgba(201,138,75,.3)", borderRadius: 2, color: "#cfa877" }}>{game.hora}</span>
          ) : null
        )}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <TeamMark imageUrl={game.teamA.imageUrl} color={game.teamA.color} name={game.teamA.name} size={24} />
          <span style={{ fontWeight: aWon ? 700 : 600, fontSize: 13.5, color: nameColor(aWon), overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{game.teamA.name}</span>
        </div>
        <div style={{ textAlign: "center" }}>
          <div className="lob-display" style={{ fontSize: 22, color: played ? "#f0c88a" : "#6f6656", letterSpacing: ".08em" }}>{played ? `${game.scoreA} – ${game.scoreB}` : "—"}</div>
          {/* #8f8472 e 10px: o #5f5747 de 9px dava 2,5:1 de contraste sobre o cartão (AA pede 4,5:1). */}
          <div style={{ fontSize: 10, letterSpacing: ".10em", color: "#8f8472", marginTop: 2 }}>{game.format === "BO5" ? textos.formatoBo5 : textos.formatoBo3}</div>
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
}

function CabecalhoDoDia({ titulo, detalhe, dourado = false }: Readonly<{ titulo: string; detalhe: string; dourado?: boolean }>) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
        <span className="lob-display" style={{ fontSize: 32, color: "#f2ebdf" }}>{titulo}</span>
        <span style={{ fontSize: 12, letterSpacing: ".12em", color: "#c98a4b" }}>{detalhe}</span>
      </div>
      <div style={{ height: 1, flex: 1, background: `linear-gradient(90deg,${dourado ? "rgba(232,184,120,.5)" : "rgba(201,138,75,.4)"},transparent)` }} />
    </div>
  );
}

export default async function CalendarioPage() {
  const locale = await getLocale();
  const t = await getMessages();
  const textos = t.paginasCompeticao;
  const tCal = t.calendario4a;
  const turnoLabel = (turno: string) => {
    if (turno === "Matutino") return textos.calendarioTurnoMatutino;
    if (turno === "Vespertino") return textos.calendarioTurnoVespertino;
    if (turno === "Noturno") return textos.calendarioTurnoNoturno;
    return turno.toUpperCase();
  };
  const planejado = (
    <div style={{ position: "relative", maxWidth: 1280, margin: "0 auto", padding: "0 clamp(16px,4vw,24px) 96px" }}>
      <section className="lob-fade" style={{ padding: "clamp(40px,7vw,56px) 0 20px" }}>
        <Eyebrow>{t.preTemporada.avisoSobretitulo}</Eyebrow>
        <GoldTitle style={{ fontSize: "clamp(44px,10vw,120px)", lineHeight: 0.88 }}>{textos.calendarioTitulo}</GoldTitle>
        <p style={{ maxWidth: 680, fontSize: 16, lineHeight: 1.55, color: "#a99e8b", margin: "0 0 8px" }}>{tCal.intro}</p>
      </section>
      <section className="lob-fade">
        <CalendarioDa4a t={tCal} localeTag={t.compartilhados.localeTag} />
      </section>
    </div>
  );

  /*
   * Banco fora numa instância que ainda não leu o dataset (sem cópia boa em memória): a
   * leitura lança. Na pré-temporada o que esta página mostra é o calendário PLANEJADO, que
   * não depende do banco — então ele sai mesmo assim, em vez da tela de erro. Com a
   * temporada no ar o erro segue para app/error.tsx: mostrar a grade planejada no lugar das
   * séries de verdade esconderia resultados.
   */
  let dataset: Awaited<ReturnType<typeof getServerDataset>>["dataset"];
  try {
    ({ dataset } = await getServerDataset());
  } catch (erro) {
    if (emPreTemporada() && calendarioPorVirOuADivulgar()) return planejado;
    throw erro;
  }

  if (mostrarPlanejado(dataset)) return planejado;

  if (semTemporadaAoVivo(dataset)) return <PreTemporadaAviso pagina="calendario" />;

  const days = buildCalendarDays(dataset);
  const semifinais = buildSemifinalGames(dataset);
  const finalGame = buildFinalGame(dataset);

  // O calendário oficial completa o que ainda não virou série — as semifinais e a final só
  // são criadas quando a tabela fecha —, mas só se ele for DESTA temporada (e divulgado). Sem
  // isto, com as séries de pontos criadas, a página contava só elas (a home conta também as
  // semifinais e a final) e os horários do último dia sumiam até alguém cadastrar as semis.
  const diasDasSeries = [...days.map((d) => d.dateKey), ...semifinais.map((g) => g.dateKey), ...(finalGame ? [finalGame.dateKey] : [])];
  const oficial = calendarioEDestaTemporada(diasDasSeries);
  const semisPrevistas = oficial && semifinais.length === 0 ? CALENDARIO_4A.filter((s) => s.tipo === "semifinal") : [];
  const confrontos =
    days.reduce((sum, day) => sum + day.games.length, 0) +
    semifinais.length +
    semisPrevistas.length +
    (finalGame || oficial ? 1 : 0);
  const finalPlayed = finalGame ? finalGame.scoreA + finalGame.scoreB > 0 : false;
  const finalAWon = finalGame ? finalGame.done && finalGame.winnerId === finalGame.teamA.id : false;
  const finalBWon = finalGame ? finalGame.done && finalGame.winnerId === finalGame.teamB.id : false;

  // Sem a final no dataset, o cartão de espera usa a data do calendário oficial (e não
  // mais "02/08", a final da 3ª que ficou escrita aqui) — só se ele for desta temporada.
  const slotDaFinal = oficial ? CALENDARIO_4A.find((s) => s.tipo === "final") : undefined;
  const dataDaFinal = slotDaFinal ? diaDoSlot(slotDaFinal).slice(5).split("-").reverse().join("/") : "";
  const dataDasSemisPrevistas = semisPrevistas[0] ? diaDoSlot(semisPrevistas[0]).slice(5).split("-").reverse().join("/") : "";
  const semisPorDia = new Map<string, CalGame[]>();
  for (const semi of semifinais) semisPorDia.set(semi.dateKey, [...(semisPorDia.get(semi.dateKey) ?? []), semi]);

  return (
    <div style={{ position: "relative", maxWidth: 1280, margin: "0 auto", padding: "0 clamp(16px,4vw,24px) 96px" }}>
      <section className="lob-fade" style={{ padding: "clamp(40px,7vw,56px) 0 20px" }}>
        <Eyebrow>
          {textos.calendarioEyebrow.replace("{temporada}", nomeDaTemporada(dataset.tournament.name, t.compartilhados.localeTag))}
        </Eyebrow>
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
          <CabecalhoDoDia titulo={day.dateLabel} detalhe={locale === "en" ? diaDaSemanaEmIngles(day.dateKey, day.dia) : day.dia} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(100%,330px),1fr))", gap: 12 }}>
            {day.games.map((game) => (
              <CartaoDaSerie key={game.id} game={game} textos={textos} turnoLabel={turnoLabel} />
            ))}
          </div>
        </section>
      ))}

      {/* SEMIFINAIS — existem a partir da 4ª; antes desta página elas não apareciam. */}
      {[...semisPorDia.entries()].map(([dateKey, jogos]) => (
        <section key={`semi-${dateKey}`} className="lob-fade" style={{ marginTop: 40 }}>
          <CabecalhoDoDia titulo={jogos[0]!.dateLabel} detalhe={`${textos.calendarioSemifinaisTitulo} · ${textos.calendarioSemifinaisDia}`} dourado />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(100%,330px),1fr))", gap: 12 }}>
            {jogos.map((game) => (
              <CartaoDaSerie key={game.id} game={game} textos={textos} turnoLabel={turnoLabel} />
            ))}
          </div>
        </section>
      ))}

      {/* SEMIFINAIS PREVISTAS — do calendário oficial, enquanto as séries não existem. */}
      {semisPrevistas.length > 0 ? (
        <section className="lob-fade" style={{ marginTop: 40 }}>
          <CabecalhoDoDia titulo={dataDasSemisPrevistas} detalhe={`${textos.calendarioSemifinaisTitulo} · ${textos.calendarioSemifinaisDia}`} dourado />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(100%,330px),1fr))", gap: 12 }}>
            {semisPrevistas.map((slot) => (
              <div key={slot.quando} className="lob-card-2" style={{ padding: "16px 18px", borderStyle: "dashed", borderColor: "rgba(232,97,140,.45)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 10.5, letterSpacing: ".08em", color: "#8f8472", marginBottom: 10 }}>
                  <span>{textos.faseSemifinal.toUpperCase()} {slot.semifinal}</span>
                  <span style={{ padding: "2px 8px", border: "1px solid rgba(201,138,75,.3)", borderRadius: 2, color: "#cfa877" }}>{horaDoSlot(slot)}</span>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#f6c6d5" }}>{slot.semifinal === 1 ? tCal.semifinal1 : tCal.semifinal2}</div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* GRANDE FINAL */}
      <section className="lob-fade" style={{ marginTop: 40 }}>
        <CabecalhoDoDia titulo={finalGame?.dateLabel ?? dataDaFinal} detalhe={textos.calendarioFinalDia} dourado />
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
              <span style={{ padding: "6px 13px", background: "linear-gradient(180deg,#f0c88a,#b97e40)", color: "#160f06", fontWeight: 700, fontSize: 11, letterSpacing: ".10em", borderRadius: 2 }}>{finalGame.format === "BO5" ? textos.calendarioFinalMelhorDe5 : textos.formatoBo3}</span>
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
            {slotDaFinal ? (
              <div style={{ position: "relative", display: "flex", justifyContent: "center", marginTop: 16 }}>
                <span style={{ padding: "6px 13px", background: "linear-gradient(180deg,#f0c88a,#b97e40)", color: "#160f06", fontWeight: 700, fontSize: 11, letterSpacing: ".10em", borderRadius: 2 }}>
                  {horaDoSlot(slotDaFinal)} · {textos.calendarioFinalMelhorDe5}
                </span>
              </div>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}
