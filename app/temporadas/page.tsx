import Link from "next/link";
import { ArrowRight, Crown } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { PageHero } from "@/components/page-hero";
import { PageShell } from "@/components/page-shell";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatDateLabel } from "@/lib/format";
import { getMessages } from "@/lib/i18n/server";
import { getServerArchivedSeasons } from "@/lib/server-data";

export const dynamic = "force-dynamic";

export default async function TemporadasPage() {
  const seasons = await getServerArchivedSeasons();
  const { paginasRegras: t, compartilhados: tc } = await getMessages();

  return (
    <PageShell className="space-y-6">
      <PageHero
        badge={t.temporadasBadge}
        title={t.temporadasTitulo}
        description={t.temporadasDescricao}
      />

      {seasons.length === 0 ? (
        <EmptyState
          title={t.temporadasVazioTitulo}
          description={t.temporadasVazioDescricao}
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
                  <Badge variant="bronze">{t.temporadaEncerradaSelo}</Badge>
                  <span className="text-xs text-muted">
                    {formatDateLabel(season.endedAtISO ?? season.archivedAtISO, undefined, tc.localeTag)}
                  </span>
                </div>

                <h2 className="mt-3 font-heading text-xl font-semibold tracking-tight">
                  {season.name}
                </h2>

                <div className="mt-3 flex items-center gap-2 text-sm">
                  <Crown className="h-4 w-4 text-accent2" />
                  <span className="font-semibold text-accent2">
                    {season.championTeamName ?? t.semCampeao}
                  </span>
                </div>

                <p className="mt-2 text-xs text-muted">
                  {season.teamCount} {t.rotuloTimes} • {season.seriesCount} {t.rotuloSeries}
                </p>

                <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-accent transition group-hover:gap-2">
                  {t.verTemporada}
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
