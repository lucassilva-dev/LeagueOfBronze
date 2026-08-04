import { JogadoresClient, type PlayerPerf } from "@/components/lob/jogadores-client";
import { Eyebrow, GoldTitle, Pill } from "@/components/lob/ui";
import { getMessages } from "@/lib/i18n/server";
import { buildDesignPlayers } from "@/lib/roster";
import { getServerDataset } from "@/lib/server-data";
import { calculatePlayerAggregates } from "@/lib/tournament";

export const dynamic = "force-dynamic";

export default async function JogadoresPage() {
  const { paginasHome: t, paginasStats: ts } = await getMessages();
  const { dataset } = await getServerDataset();
  const players = buildDesignPlayers(dataset);

  const perfByPlayer: Record<string, PlayerPerf> = {};
  for (const agg of calculatePlayerAggregates(dataset)) {
    perfByPlayer[agg.playerId] = {
      games: agg.gamesPlayed,
      wins: agg.wins,
      kills: agg.kills,
      deaths: agg.deaths,
      assists: agg.assists,
      kda: agg.kda,
      mvps: agg.gameMvps,
      winRate: agg.winRate,
    };
  }

  return (
    <div style={{ position: "relative", maxWidth: 1280, margin: "0 auto", padding: "0 clamp(16px,4vw,24px) 96px" }}>
      <section className="lob-fade" style={{ padding: "clamp(40px,7vw,56px) 0 26px" }}>
        <Eyebrow>{t.edicaoSobretitulo}</Eyebrow>
        <GoldTitle style={{ fontSize: "clamp(44px,10vw,128px)", lineHeight: 0.88, margin: "10px 0 16px" }}>{t.jogadoresTitulo}</GoldTitle>
        <p style={{ maxWidth: 580, fontSize: 16, lineHeight: 1.55, color: "#a99e8b", margin: "0 0 24px" }}>
          {t.jogadoresIntro}
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 9 }}>
          <Pill>{t.jogadoresInscritos.replace("{n}", String(players.length))}</Pill>
          <Pill>{t.jogadoresRotas}</Pill>
        </div>
      </section>
      <JogadoresClient players={players} perfByPlayer={perfByPlayer} textos={t} elos={ts.elos} />
    </div>
  );
}
