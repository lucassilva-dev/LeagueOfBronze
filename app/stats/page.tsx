import { PageHero } from "@/components/page-hero";
import { PageShell } from "@/components/page-shell";
import { SectionTitle } from "@/components/section-title";
import { StatsPageClient } from "@/components/stats-page-client";
import { ChampionsPageClient } from "@/components/champions-page-client";
import { getServerDataset } from "@/lib/server-data";
import { buildChampionLeaderboards } from "@/lib/tournament";

export const dynamic = "force-dynamic";

export default async function StatsPage() {
  const { dataset } = await getServerDataset();
  const championBoards = buildChampionLeaderboards(dataset);

  return (
    <PageShell className="space-y-8">
      <PageHero
        badge="Estatísticas"
        title="Estatísticas"
        description="Tudo em uma página: rankings de jogadores e de campeões da temporada, com filtro por time e intervalo de datas."
      />

      <section className="space-y-4">
        <SectionTitle
          title="Jogadores"
          subtitle="Abates, KDA, MVPs de jogo, assistências e menos mortes."
        />
        <StatsPageClient dataset={dataset} />
      </section>

      <section className="space-y-4">
        <SectionTitle
          title="Campeões"
          subtitle="Mais jogados, mais banidos, taxa de ban, presença e winrate."
        />
        <ChampionsPageClient boards={championBoards} />
      </section>
    </PageShell>
  );
}
