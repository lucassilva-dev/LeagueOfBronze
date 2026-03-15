import { PageHero } from "@/components/page-hero";
import { PageShell } from "@/components/page-shell";
import { StandingsPageClient } from "@/components/standings-page-client";
import { getServerOverview } from "@/lib/server-data";

export const dynamic = "force-dynamic";

export default async function TabelaPage() {
  const { overview } = await getServerOverview();

  return (
    <PageShell className="space-y-6">
      <PageHero
        badge="Classificação"
        title="Tabela do Campeonato"
        description="Classificação da fase regular baseada em séries, com desempate automático por pontos, séries vencidas, saldo de jogos, confronto direto e ordem alfabética."
      />
      <StandingsPageClient rows={overview.standings.rows} source={overview.standings.source} />
    </PageShell>
  );
}
