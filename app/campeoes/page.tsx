import { ChampionsPageClient } from "@/components/champions-page-client";
import { PageHero } from "@/components/page-hero";
import { PageShell } from "@/components/page-shell";
import { getServerDataset } from "@/lib/server-data";
import { buildChampionLeaderboards } from "@/lib/tournament";
import { CHAMPION_PATCH } from "@/lib/champions";

export const dynamic = "force-dynamic";

export default async function CampeoesPage() {
  const { dataset } = await getServerDataset();
  const boards = buildChampionLeaderboards(dataset);

  return (
    <PageShell className="space-y-6">
      <PageHero
        badge="Campeões"
        title="Campeões"
        description={`Mais jogados, mais banidos, taxa de ban, presença e winrate — calculados a partir dos picks e bans lançados nos jogos. Ícones do Data Dragon (patch ${CHAMPION_PATCH}).`}
      />
      <ChampionsPageClient boards={boards} />
    </PageShell>
  );
}
