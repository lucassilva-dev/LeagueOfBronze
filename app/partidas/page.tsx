import { EmptyState } from "@/components/empty-state";
import { PageHero } from "@/components/page-hero";
import { PageShell } from "@/components/page-shell";
import { SeriesSummaryCard } from "@/components/series-summary-card";
import { getMessages } from "@/lib/i18n/server";
import { getServerOverview } from "@/lib/server-data";

export const dynamic = "force-dynamic";

export default async function PartidasPage() {
  const t = await getMessages();
  const textos = t.paginasCompeticao;
  const { indexes, overview } = await getServerOverview();

  return (
    <PageShell className="space-y-6">
      <PageHero
        badge={textos.partidasBadge}
        title={textos.partidasTitulo}
        description={textos.partidasDescricao}
      />

      {overview.seriesSummaries.length === 0 ? (
        <EmptyState
          title={textos.partidasVazioTitulo}
          description={textos.partidasVazioDescricao}
        />
      ) : (
        <div className="grid gap-3">
          {overview.seriesSummaries.map((summary) => (
            <SeriesSummaryCard
              key={summary.series.id}
              summary={summary}
              teamsById={indexes.teamsById}
              playersById={indexes.playersById}
              textos={t.compartilhados}
            />
          ))}
        </div>
      )}
    </PageShell>
  );
}
