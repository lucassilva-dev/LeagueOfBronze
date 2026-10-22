import type { Metadata } from "next";

import { EmptyState } from "@/components/empty-state";
import { PageHero } from "@/components/page-hero";
import { PageShell } from "@/components/page-shell";
import { SeriesSummaryCard } from "@/components/series-summary-card";
import { metadadosDaPagina } from "@/lib/i18n/metadados";
import { getMessages } from "@/lib/i18n/server";
import { getServerOverview } from "@/lib/server-data";
import { ordenarSeriesParaPartidas } from "@/lib/tournament";

export const dynamic = "force-dynamic";

/**
 * Título, descrição e canônico próprios, no idioma da visita (lib/i18n/messages/metadados.ts).
 * Sem isto a lista de partidas herdava os da home ("… Inscrição para a 4ª Edição") e ficava
 * sem canônico — era a única página pública de lista nessa situação.
 */
export async function generateMetadata(): Promise<Metadata> {
  return metadadosDaPagina("partidas", "/partidas");
}

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
          {/* Resultados primeiro (do mais recente), depois as séries por jogar (da mais próxima). */}
          {ordenarSeriesParaPartidas(overview.seriesSummaries).map((summary) => (
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
