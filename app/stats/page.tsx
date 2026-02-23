import { PageHero } from "@/components/page-hero";
import { PageShell } from "@/components/page-shell";
import { StatsPageClient } from "@/components/stats-page-client";
import { getServerDataset } from "@/lib/server-data";

export const dynamic = "force-dynamic";

export default async function StatsPage() {
  const { dataset } = await getServerDataset();

  return (
    <PageShell className="space-y-6">
      <PageHero
        badge="Rankings"
        title="Estatísticas"
        description="Rankings com foco em abates (principal), KDA, MVPs de jogo e assistências, com filtro por time e intervalo de datas."
      />
      <StatsPageClient dataset={dataset} />
    </PageShell>
  );
}
