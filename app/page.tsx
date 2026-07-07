import Link from "next/link";
import { Crown, Skull, Swords } from "lucide-react";

import { ChampionshipHero } from "@/components/championship-hero";
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

type HomeQuickLinksProps = Readonly<{ latestSeriesCount: number }>;
type HomeStatsSectionProps = Readonly<{
  leaderName: string;
  leaderHint: string;
  topKillsName: string;
  topKillsHint: string;
  seriesCount: number;
  playerCount: number;
  teamCount: number;
}>;

function getTournamentFormatsLabel(hasBo5: boolean, defaultFormat: "BO3" | "BO5") {
  return hasBo5 || defaultFormat === "BO5" ? "MD3 / MD5" : "MD3";
}

function getLeaderHint(leader: Awaited<ReturnType<typeof getServerOverview>>["overview"]["standings"]["rows"][number] | undefined) {
  if (!leader) return "Sem times cadastrados.";
  return `${leader.points} pts • ${leader.seriesWon}-${leader.seriesLost} na fase regular`;
}

function getTopKillsHint(topKills: Awaited<ReturnType<typeof getServerOverview>>["overview"]["leaderboards"]["kills"][number] | undefined) {
  if (!topKills) return "Sem jogos lançados ainda.";
  return `${topKills.player.kills} abates • KDA ${formatKda(topKills.player.kda)}`;
}

function HomeStatsSection({
  leaderName,
  leaderHint,
  topKillsName,
  topKillsHint,
  seriesCount,
  playerCount,
  teamCount,
}: HomeStatsSectionProps) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
            <Crown className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-muted">Líder atual</p>
            <p className="font-heading text-lg font-semibold tracking-wide">{leaderName}</p>
          </div>
        </div>
        <p className="mt-3 text-sm text-muted">{leaderHint}</p>
      </Card>

      <Card className="p-4">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
            <Skull className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-muted">Mais abates</p>
            <p className="font-heading text-lg font-semibold tracking-wide">{topKillsName}</p>
          </div>
        </div>
        <p className="mt-3 text-sm text-muted">{topKillsHint}</p>
      </Card>

      <StatChip
        label="Séries registradas"
        value={seriesCount}
        hint="Inclui fase regular, semifinal e final"
      />
      <StatChip label="Jogadores" value={playerCount} hint={`${teamCount} times cadastrados`} />
    </section>
  );
}

function HomeQuickLinks({ latestSeriesCount }: HomeQuickLinksProps) {
  const latestSeriesDescription =
    latestSeriesCount === 0
      ? "Ainda não há séries lançadas, mas o layout já está pronto para atualizar automaticamente."
      : "As séries mais recentes aparecem com placar, etapa e MVP da série.";

  return (
    <div className="space-y-4">
      <SectionTitle title="Atalhos" subtitle="Acesso rápido para tabela, partidas e rankings." />
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
              Lançamento de séries, times e jogadores com suporte a fase regular, semifinal,
              final, MD3 e MD5.
            </p>
            <p className="mt-2 text-xs text-muted">{latestSeriesDescription}</p>
            <Link
              href="/admin"
              className="mt-2 inline-flex text-sm font-semibold text-accent hover:underline"
            >
              Abrir painel admin
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default async function HomePage() {
  const { dataset, indexes, overview } = await getServerOverview();
  const leader = overview.standings.rows[0];
  const topKills = overview.leaderboards.kills[0];
  const latestSeries = overview.seriesSummaries.slice(0, 3);
  const hasLiveSeries = overview.seriesSummaries.some((summary) => !summary.isComplete);
  const hasBo5 = dataset.seriesMatches.some((series) => series.format === "BO5");
  const tournamentFormatsLabel = getTournamentFormatsLabel(hasBo5, dataset.tournament.format);

  return (
    <PageShell className="space-y-6">
      <PageHero
        badge="Campeonato"
        title={dataset.tournament.name}
        description="Acompanhe tabela da fase regular, séries, MVPs e os rankings em tempo real."
        extra={
          <div className="flex flex-wrap items-center gap-2">
            {hasLiveSeries ? (
              <Badge variant="live" className="gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-lime/70" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-lime" />
                </span>
                AO VIVO
              </Badge>
            ) : null}
            <Badge variant="muted">Formato: {tournamentFormatsLabel}</Badge>
            <Badge variant="outline">
              Atualizado em {formatDateTimeLabel(dataset.tournament.lastUpdatedISO)}
            </Badge>
          </div>
        }
      />

      <ChampionshipHero
        championship={overview.championship}
        teamsById={indexes.teamsById}
        playersById={indexes.playersById}
      />

      <HomeStatsSection
        leaderName={leader?.teamName ?? "—"}
        leaderHint={getLeaderHint(leader)}
        topKillsName={topKills?.player.playerNick ?? "—"}
        topKillsHint={getTopKillsHint(topKills)}
        seriesCount={dataset.seriesMatches.length}
        playerCount={dataset.players.length}
        teamCount={dataset.teams.length}
      />

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          <SectionTitle
            title="Últimas séries"
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

        <HomeQuickLinks latestSeriesCount={latestSeries.length} />
      </section>
    </PageShell>
  );
}
