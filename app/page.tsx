import Link from "next/link";
import { ArrowRight, Crown, Skull, Swords } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { PageHero } from "@/components/page-hero";
import { PageShell } from "@/components/page-shell";
import { QuickLinkCard } from "@/components/quick-link-card";
import { SectionTitle } from "@/components/section-title";
import { SeriesSummaryCard } from "@/components/series-summary-card";
import { StatChip } from "@/components/stat-chip";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatDateLabel, formatDateTimeLabel, formatKda } from "@/lib/format";
import { getServerOverview } from "@/lib/server-data";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { dataset, indexes, overview } = await getServerOverview();
  const leader = overview.standings.rows[0];
  const topKills = overview.leaderboards.kills[0];
  const latestSeries = overview.seriesSummaries.slice(0, 3);
  const hasBo5 = dataset.seriesMatches.some((series) => series.format === "BO5");
  const tournamentFormatsLabel =
    hasBo5 || dataset.tournament.format === "BO5" ? "MD3 / MD5" : "MD3";
  const championship = overview.championship;
  const championTeam = championship
    ? indexes.teamsById.get(championship.championTeamId)
    : null;
  const runnerUpTeam = championship
    ? indexes.teamsById.get(championship.runnerUpTeamId)
    : null;
  const finalMvp = championship?.summary.mvp
    ? indexes.playersById.get(championship.summary.mvp.playerId)
    : null;
  const championWins = championship
    ? championship.championTeamId === championship.summary.series.teamAId
      ? championship.summary.score.teamAWins
      : championship.summary.score.teamBWins
    : 0;
  const runnerUpWins = championship
    ? championship.championTeamId === championship.summary.series.teamAId
      ? championship.summary.score.teamBWins
      : championship.summary.score.teamAWins
    : 0;

  return (
    <PageShell className="space-y-6">
      <PageHero
        badge="Campeonato"
        title={dataset.tournament.name}
        description="Acompanhe tabela da fase regular, s\u00e9ries, MVPs e os rankings em tempo real."
        extra={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="muted">Formato: {tournamentFormatsLabel}</Badge>
            <Badge variant="outline">
              Atualizado em {formatDateTimeLabel(dataset.tournament.lastUpdatedISO)}
            </Badge>
          </div>
        }
      />

      {championship && championTeam ? (
        <section>
          <Card className="champion-panel champion-glow overflow-hidden p-5 sm:p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-3xl">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="border-amber-300/30 bg-amber-300/15 text-amber-100" variant="outline">
                    Campe\u00e3o definido
                  </Badge>
                  <Badge variant="outline">{championship.summary.formatLabel}</Badge>
                  <Badge variant="outline">
                    {formatDateLabel(championship.summary.series.date)}
                  </Badge>
                </div>

                <div className="mt-4 flex items-start gap-3">
                  <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-amber-300/25 bg-amber-300/10 text-amber-100">
                    <Crown className="h-6 w-6" />
                  </span>
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-amber-100/75">
                      T\u00edtulo do campeonato
                    </p>
                    <h2 className="mt-1 font-display text-3xl font-black tracking-wide sm:text-4xl">
                      {championTeam.name}
                    </h2>
                    <p className="mt-2 max-w-2xl text-sm text-slate-200/78 sm:text-base">
                      Confirmou o t\u00edtulo na grande final contra{" "}
                      {runnerUpTeam?.name ?? championship.runnerUpTeamId} por{" "}
                      {championWins}-{runnerUpWins}.
                      {championship.summary.isWalkover
                        ? " S\u00e9rie encerrada por W.O."
                        : finalMvp
                          ? ` MVP da final: ${finalMvp.nick}.`
                          : ""}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:w-[22rem]">
                <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-4 text-center">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted">
                    Placar da final
                  </p>
                  <p className="mt-2 font-display text-4xl font-black tracking-wide text-amber-100">
                    {championWins}
                    <span className="mx-2 text-white/35">-</span>
                    {runnerUpWins}
                  </p>
                  <p className="mt-1 text-xs text-muted">{championship.summary.stageLabel}</p>
                </div>

                <div className="flex flex-col justify-between rounded-2xl border border-white/10 bg-slate-950/35 p-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-muted">
                      Acessos r\u00e1pidos
                    </p>
                    <p className="mt-2 text-sm text-slate-200/80">
                      Abra o campe\u00e3o ou veja o detalhe completo da grande final.
                    </p>
                  </div>
                  <div className="mt-4 space-y-2">
                    <Link
                      href={`/times/${championTeam.slug}`}
                      className="inline-flex items-center gap-2 text-sm font-semibold text-amber-100 transition hover:text-white"
                    >
                      Ver time campe\u00e3o
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                    <Link
                      href={`/partidas/${championship.summary.series.id}`}
                      className="inline-flex items-center gap-2 text-sm font-semibold text-accent transition hover:text-white"
                    >
                      Abrir grande final
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </section>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
              <Crown className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-muted">L\u00edder atual</p>
              <p className="font-display text-lg font-bold tracking-wide">
                {leader?.teamName ?? "\u2014"}
              </p>
            </div>
          </div>
          {leader ? (
            <p className="mt-3 text-sm text-muted">
              {leader.points} pts • {leader.seriesWon}-{leader.seriesLost} na fase regular
            </p>
          ) : (
            <p className="mt-3 text-sm text-muted">Sem times cadastrados.</p>
          )}
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
              <Skull className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-muted">Mais Abates</p>
              <p className="font-display text-lg font-bold tracking-wide">
                {topKills?.player.playerNick ?? "\u2014"}
              </p>
            </div>
          </div>
          <p className="mt-3 text-sm text-muted">
            {topKills
              ? `${topKills.player.kills} abates • KDA ${formatKda(topKills.player.kda)}`
              : "Sem jogos lan\u00e7ados ainda."}
          </p>
        </Card>

        <StatChip
          label="S\u00e9ries registradas"
          value={dataset.seriesMatches.length}
          hint="Inclui fase regular, semifinal e final"
        />
        <StatChip
          label="Jogadores"
          value={dataset.players.length}
          hint={`${dataset.teams.length} times cadastrados`}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          <SectionTitle
            title="\u00daltimas S\u00e9ries"
            subtitle="As 3 s\u00e9ries mais recentes aparecem aqui com placar, etapa e MVP da s\u00e9rie."
          />
          {latestSeries.length === 0 ? (
            <EmptyState
              title="Nenhuma s\u00e9rie registrada"
              description="Use o painel /admin para lan\u00e7ar as primeiras s\u00e9ries. As p\u00e1ginas p\u00fablicas j\u00e1 est\u00e3o prontas para atualizar automaticamente."
            />
          ) : (
            <div className="space-y-3">
              {latestSeries.map((summary) => (
                <SeriesSummaryCard
                  key={summary.series.id}
                  summary={summary}
                  teamsById={indexes.teamsById}
                  playersById={indexes.playersById}
                />
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <SectionTitle
            title="Atalhos"
            subtitle="Acesso r\u00e1pido para tabela, partidas e rankings."
          />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <QuickLinkCard
              href="/tabela"
              title="Tabela"
              description="Classifica\u00e7\u00e3o da fase regular com filtros e busca por time."
            />
            <QuickLinkCard
              href="/partidas"
              title="Partidas"
              description="Lista de s\u00e9ries MD3 e MD5 com placar e detalhe jogo a jogo."
            />
            <QuickLinkCard
              href="/stats"
              title="Estat\u00edsticas"
              description="Rankings de abates, KDA, MVPs e assist\u00eancias com filtros."
            />
          </div>

          <Card className="p-4">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-accent2">
                <Swords className="h-4 w-4" />
              </span>
              <div>
                <p className="font-semibold">Admin</p>
                <p className="mt-1 text-sm text-muted">
                  Lan\u00e7amento de s\u00e9ries, times e jogadores com suporte a fase regular, semifinal, final, MD3 e MD5.
                </p>
                <Link
                  href="/admin"
                  className="mt-2 inline-flex text-sm font-semibold text-accent hover:underline"
                >
                  Abrir painel admin
                </Link>
              </div>
            </div>
          </Card>
        </div>
      </section>
    </PageShell>
  );
}
