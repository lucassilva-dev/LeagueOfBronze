import Link from "next/link";
import { Crown, Skull, Swords } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { PageHero } from "@/components/page-hero";
import { PageShell } from "@/components/page-shell";
import { QuickLinkCard } from "@/components/quick-link-card";
import { SectionTitle } from "@/components/section-title";
import { SeriesSummaryCard } from "@/components/series-summary-card";
import { StatChip } from "@/components/stat-chip";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatDateTimeLabel, formatKda } from "@/lib/format";
import { getServerOverview } from "@/lib/server-data";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { dataset, indexes, overview } = await getServerOverview();
  const leader = overview.standings.rows[0];
  const topKills = overview.leaderboards.kills[0];
  const latestSeries = overview.seriesSummaries.slice(0, 3);
  const hasBo5 = dataset.seriesMatches.some((series) => series.format === "BO5");
  const tournamentFormatsLabel = hasBo5 || dataset.tournament.format === "BO5" ? "MD3 / MD5" : "MD3";

  return (
    <PageShell className="space-y-6">
      <PageHero
        badge="Campeonato"
        title={dataset.tournament.name}
        description="Acompanhe tabela da fase regular, séries, MVPs e os rankings em tempo real."
        extra={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="muted">Formato: {tournamentFormatsLabel}</Badge>
            <Badge variant="outline">
              Atualizado em {formatDateTimeLabel(dataset.tournament.lastUpdatedISO)}
            </Badge>
          </div>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
              <Crown className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-muted">Líder atual</p>
              <p className="font-display text-lg font-bold tracking-wide">
                {leader?.teamName ?? "—"}
              </p>
            </div>
          </div>
          {leader ? (
            <p className="mt-3 text-sm text-muted">
              {leader.points} pts • {leader.seriesWon}-{leader.seriesLost} na fase regular
            </p>
          ) : (
            <p className="mt-3 text-sm text-muted">Sem times cadastrados.</p>
          )}
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
              <Skull className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-muted">Mais Abates</p>
              <p className="font-display text-lg font-bold tracking-wide">
                {topKills?.player.playerNick ?? "—"}
              </p>
            </div>
          </div>
          <p className="mt-3 text-sm text-muted">
            {topKills
              ? `${topKills.player.kills} abates • KDA ${formatKda(topKills.player.kda)}`
              : "Sem jogos lançados ainda."}
          </p>
        </Card>

        <StatChip
          label="Séries registradas"
          value={dataset.seriesMatches.length}
          hint="Inclui fase regular, semifinal e final"
        />
        <StatChip
          label="Jogadores"
          value={dataset.players.length}
          hint={`${dataset.teams.length} times cadastrados`}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          <SectionTitle
            title="Últimas Séries"
            subtitle="As 3 séries mais recentes aparecem aqui com placar, etapa e MVP da série."
          />
          {latestSeries.length === 0 ? (
            <EmptyState
              title="Nenhuma série registrada"
              description="Use o painel /admin para lançar as primeiras séries. As páginas públicas já estão prontas para atualizar automaticamente."
            />
          ) : (
            <div className="space-y-3">
              {latestSeries.map((summary) => (
                <SeriesSummaryCard
                  key={summary.series.id}
                  summary={summary}
                  teamsById={indexes.teamsById}
                  playersById={indexes.playersById}
                />
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <SectionTitle
            title="Atalhos"
            subtitle="Acesso rápido para tabela, partidas e rankings."
          />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <QuickLinkCard
              href="/tabela"
              title="Tabela"
              description="Classificação da fase regular com filtros e busca por time."
            />
            <QuickLinkCard
              href="/partidas"
              title="Partidas"
              description="Lista de séries MD3 e MD5 com placar e detalhe jogo a jogo."
            />
            <QuickLinkCard
              href="/stats"
              title="Estatísticas"
              description="Rankings de abates, KDA, MVPs e assistências com filtros."
            />
          </div>

          <Card className="p-4">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-accent2">
                <Swords className="h-4 w-4" />
              </span>
              <div>
                <p className="font-semibold">Admin</p>
                <p className="mt-1 text-sm text-muted">
                  Lançamento de séries, times e jogadores com suporte a fase regular, semifinal, final, MD3 e MD5.
                </p>
                <Link href="/admin" className="mt-2 inline-flex text-sm font-semibold text-accent hover:underline">
                  Abrir painel admin
                </Link>
              </div>
            </div>
          </Card>
        </div>
      </section>
    </PageShell>
  );
}
