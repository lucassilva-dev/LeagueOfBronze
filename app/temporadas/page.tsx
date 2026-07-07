import Link from "next/link";
import { ArrowRight, Crown } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { PageHero } from "@/components/page-hero";
import { PageShell } from "@/components/page-shell";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatDateLabel } from "@/lib/format";
import { getServerArchivedSeasons } from "@/lib/server-data";

export const dynamic = "force-dynamic";

export default async function TemporadasPage() {
  const seasons = await getServerArchivedSeasons();

  return (
    <PageShell className="space-y-6">
      <PageHero
        badge="Histórico"
        title="Temporadas"
        description="Campeonatos encerrados, arquivados com tabela final, séries e campeão de cada temporada."
      />

      {seasons.length === 0 ? (
        <EmptyState
          title="Nenhuma temporada arquivada"
          description="Quando uma temporada for encerrada no admin, ela aparece aqui com tudo o que aconteceu."
        />
      ) : (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {seasons.map((season) => (
            <Link
              key={season.seasonId}
              href={`/temporadas/${encodeURIComponent(season.seasonId)}`}
              className="block"
            >
              <Card className="group h-full p-5 transition hover:-translate-y-0.5 hover:shadow-glow-strong">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="bronze">Encerrada</Badge>
                  <span className="text-xs text-muted">
                    {formatDateLabel(season.endedAtISO ?? season.archivedAtISO)}
                  </span>
                </div>

                <h2 className="mt-3 font-heading text-xl font-semibold tracking-tight">
                  {season.name}
                </h2>

                <div className="mt-3 flex items-center gap-2 text-sm">
                  <Crown className="h-4 w-4 text-accent2" />
                  <span className="font-semibold text-accent2">
                    {season.championTeamName ?? "Sem campeão"}
                  </span>
                </div>

                <p className="mt-2 text-xs text-muted">
                  {season.teamCount} times • {season.seriesCount} séries
                </p>

                <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-accent transition group-hover:gap-2">
                  Ver temporada
                  <ArrowRight className="h-4 w-4" />
                </span>
              </Card>
            </Link>
          ))}
        </section>
      )}
    </PageShell>
  );
}
