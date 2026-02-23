import { EmptyState } from "@/components/empty-state";
import { PageHero } from "@/components/page-hero";
import { PageShell } from "@/components/page-shell";
import { SeriesSummaryCard } from "@/components/series-summary-card";
import { getServerOverview } from "@/lib/server-data";

export const dynamic = "force-dynamic";

export default async function PartidasPage() {
  const { indexes, overview } = await getServerOverview();

  return (
    <PageShell className="space-y-6">
      <PageHero
        badge="Séries"
        title="Partidas (MD3)"
        description="Lista de confrontos em formato MD3, com placar da série e MVP da série calculado automaticamente."
      />

      {overview.seriesSummaries.length === 0 ? (
        <EmptyState
          title="Nenhuma série lançada"
          description="As séries cadastradas no /admin aparecerão aqui em ordem da mais recente para a mais antiga."
        />
      ) : (
        <div className="grid gap-3">
          {overview.seriesSummaries.map((summary) => (
            <SeriesSummaryCard
              key={summary.series.id}
              summary={summary}
              teamsById={indexes.teamsById}
              playersById={indexes.playersById}
            />
          ))}
        </div>
      )}
    </PageShell>
  );
}
