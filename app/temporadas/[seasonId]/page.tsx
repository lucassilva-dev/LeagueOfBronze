import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { ChampionshipHero } from "@/components/championship-hero";
import { DurationRanking } from "@/components/lob/duration-ranking";
import { EmptyState } from "@/components/empty-state";
import { RoleBests } from "@/components/lob/role-bests";
import { StatsToggles } from "@/components/lob/stats-toggles";
import { PageHero } from "@/components/page-hero";
import { PageShell } from "@/components/page-shell";
import { SectionTitle } from "@/components/section-title";
import { SeriesSummaryCard } from "@/components/series-summary-card";
import { StandingsPageClient } from "@/components/standings-page-client";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CARDS_BY_ID } from "@/lib/cards";
import { formatDateLabel } from "@/lib/format";
import type { CardId } from "@/lib/schema";
import { getServerArchivedSeason } from "@/lib/server-data";
import { buildRoleBests, buildStatsRows } from "@/lib/stats-view";
import { calculateCardStats, getGameDurations } from "@/lib/tournament";

export const dynamic = "force-dynamic";

type TemporadaPageParams = Readonly<{
  params: Promise<{ seasonId: string }>;
}>;

export default async function TemporadaDetailPage({ params }: TemporadaPageParams) {
  const { seasonId } = await params;
  const result = await getServerArchivedSeason(seasonId);

  if (!result) {
    notFound();
  }

  const { archived, dataset, indexes, overview } = result;
  const endedLabel = formatDateLabel(archived.endedAtISO ?? archived.archivedAtISO);
  const { playerRankings, champRankings } = buildStatsRows(dataset);
  const championTeamSlug = overview.championship
    ? indexes.teamsById.get(overview.championship.championTeamId)?.slug
    : undefined;
  const finalSeriesId = overview.championship?.summary.series.id;

  // Séries agrupadas por fase (Final / Semifinais / Fase regular).
  const stageBuckets = { FINAL: [], SEMIFINAL: [], REGULAR_SEASON: [] } as Record<
    string,
    typeof overview.seriesSummaries
  >;
  for (const summary of overview.seriesSummaries) {
    const stage = summary.series.stage ?? "REGULAR_SEASON";
    (stageBuckets[stage] ?? stageBuckets.REGULAR_SEASON).push(summary);
  }
  const seriesGroups = [
    { key: "FINAL", title: "Grande Final", list: stageBuckets.FINAL },
    { key: "SEMIFINAL", title: "Semifinais", list: stageBuckets.SEMIFINAL },
    { key: "REGULAR_SEASON", title: "Fase regular", list: stageBuckets.REGULAR_SEASON },
  ].filter((group) => group.list.length > 0);

  const cardStats = calculateCardStats(dataset).filter((c) => c.count > 0);

  return (
    <PageShell className="space-y-6">
      <div>
        <Link
          href="/temporadas"
          className="inline-flex items-center gap-1 text-sm font-semibold text-muted transition hover:text-text"
        >
          <ArrowLeft className="h-4 w-4" />
          Todas as temporadas
        </Link>
      </div>

      <PageHero
        badge="Temporada encerrada"
        title={archived.name}
        description={`Encerrada em ${endedLabel}. Visualização somente leitura do que foi registrado nesta temporada.`}
        extra={<Badge variant="bronze">Somente leitura</Badge>}
      />

      <ChampionshipHero
        championship={overview.championship}
        teamsById={indexes.teamsById}
        playersById={indexes.playersById}
        championTeamHref={championTeamSlug ? `/temporadas/${seasonId}/times/${championTeamSlug}` : undefined}
        grandFinalHref={finalSeriesId ? `/temporadas/${seasonId}/partidas/${finalSeriesId}` : undefined}
      />

      <section className="space-y-4">
        <SectionTitle
          title="Classificação final"
          subtitle="Tabela da fase regular no encerramento desta temporada."
        />
        <StandingsPageClient rows={overview.standings.rows} source={overview.standings.source} teamHrefBase={`/temporadas/${seasonId}/times/`} />
      </section>

      <section className="space-y-6">
        <SectionTitle title="Séries" subtitle="Todas as séries registradas nesta temporada, por fase." />
        {overview.seriesSummaries.length === 0 ? (
          <EmptyState
            title="Sem séries"
            description="Esta temporada não registrou séries antes de ser encerrada."
          />
        ) : (
          seriesGroups.map((group) => (
            <div key={group.key} className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent2/80">
                {group.title} · {group.list.length}
              </p>
              {group.list.map((summary) => (
                <SeriesSummaryCard
                  key={summary.series.id}
                  summary={summary}
                  teamsById={indexes.teamsById}
                  playersById={indexes.playersById}
                  readOnly
                  href={`/temporadas/${seasonId}/partidas/${summary.series.id}`}
                />
              ))}
            </div>
          ))
        )}
      </section>

      {cardStats.length > 0 ? (
        <section className="space-y-4">
          <SectionTitle title="Cartinhas mais sorteadas" subtitle="Cartas usadas ao longo desta temporada." />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {cardStats.map((card) => {
              const def = CARDS_BY_ID[card.cardId as CardId];
              return (
                <Card key={card.cardId} className="flex items-center gap-3 p-4">
                  {def?.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={def.imageUrl}
                      alt=""
                      width={48}
                      height={48}
                      className="h-12 w-12 shrink-0 rounded-xl object-cover"
                      style={{ border: `1px solid ${def.border}` }}
                    />
                  ) : (
                    <span
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl"
                      style={{ background: def ? `linear-gradient(135deg, ${def.from}, ${def.to})` : "rgba(255,255,255,0.04)" }}
                    >
                      {def?.emoji ?? "🎴"}
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{card.title}{def?.dupla ? " (dupla)" : ""}</p>
                    <p className="text-xs text-muted">{card.count} sorteio{card.count === 1 ? "" : "s"}</p>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
      ) : null}

      <section className="space-y-4">
        <SectionTitle
          title="Estatísticas"
          subtitle="Rankings de jogadores e campeões registrados nesta temporada."
        />
        <StatsToggles playerRankings={playerRankings} champRankings={champRankings} />
      </section>

      <RoleBests groups={buildRoleBests(dataset)} hrefBase={`/temporadas/${seasonId}/jogadores/`} />

      <DurationRanking rows={getGameDurations(dataset)} hrefBase={`/temporadas/${seasonId}/partidas/`} />
    </PageShell>
  );
}
