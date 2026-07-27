import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { ChampionshipHero } from "@/components/championship-hero";
import { EmptyState } from "@/components/empty-state";
import { StatsToggles } from "@/components/lob/stats-toggles";
import { PageHero } from "@/components/page-hero";
import { PageShell } from "@/components/page-shell";
import { SectionTitle } from "@/components/section-title";
import { SeriesSummaryCard } from "@/components/series-summary-card";
import { StandingsPageClient } from "@/components/standings-page-client";
import { Badge } from "@/components/ui/badge";
import { formatDateLabel } from "@/lib/format";
import { getServerArchivedSeason } from "@/lib/server-data";
import { buildStatsRows } from "@/lib/stats-view";

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
        <StandingsPageClient rows={overview.standings.rows} source={overview.standings.source} />
      </section>

      <section className="space-y-4">
        <SectionTitle title="Séries" subtitle="Todas as séries registradas nesta temporada." />
        {overview.seriesSummaries.length === 0 ? (
          <EmptyState
            title="Sem séries"
            description="Esta temporada não registrou séries antes de ser encerrada."
          />
        ) : (
          <div className="space-y-3">
            {overview.seriesSummaries.map((summary) => (
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
        )}
      </section>

      <section className="space-y-4">
        <SectionTitle
          title="Estatísticas"
          subtitle="Rankings de jogadores e campeões registrados nesta temporada."
        />
        <StatsToggles playerRankings={playerRankings} champRankings={champRankings} />
      </section>
    </PageShell>
  );
}
