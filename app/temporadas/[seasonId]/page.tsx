import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { ChampionshipHero } from "@/components/championship-hero";
import { DurationRanking } from "@/components/lob/duration-ranking";
import { EmptyState } from "@/components/empty-state";
import { RoleBests } from "@/components/lob/role-bests";
import { StatsToggles } from "@/components/lob/stats-toggles";
import { PageHero } from "@/components/page-hero";
import { PageShell } from "@/components/page-shell";
import { SectionTitle } from "@/components/section-title";
import { SeriesSummaryCard } from "@/components/series-summary-card";
import { StandingsPageClient } from "@/components/standings-page-client";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CARDS_BY_ID } from "@/lib/cards";
import { formatDateLabel } from "@/lib/format";
import { getMessages } from "@/lib/i18n/server";
import type { CardId } from "@/lib/schema";
import { getServerArchivedSeason } from "@/lib/server-data";
import { buildRoleBests, buildStatsRows } from "@/lib/stats-view";
import { calculateCardStats, getGameDurations } from "@/lib/tournament";

export const dynamic = "force-dynamic";

type TemporadaPageParams = Readonly<{
  params: Promise<{ seasonId: string }>;
}>;

export default async function TemporadaDetailPage({ params }: TemporadaPageParams) {
  const { seasonId } = await params;
  const result = await getServerArchivedSeason(seasonId);

  if (!result) {
    notFound();
  }

  // `paginasRegras` cobre os textos próprios desta página; `paginasStats` alimenta os painéis
  // de estatísticas e `compartilhados` os componentes que também servem o campeonato ativo.
  const { paginasRegras: t, paginasStats: ts, compartilhados: tc } = await getMessages();
  const { archived, dataset, indexes, overview } = result;
  // A temporada arquivada usa os MESMOS rótulos traduzidos da página /stats. Sem eles,
  // esta página caía nos padrões em português (`LABELS_PT`) e a data no fuso/idioma do
  // servidor: a temporada arquivada era a única parte do site que continuava em
  // português com o site inteiro em inglês.
  const endedLabel = formatDateLabel(
    archived.endedAtISO ?? archived.archivedAtISO,
    undefined,
    tc.localeTag,
  );
  const { playerRankings, champRankings } = buildStatsRows(dataset, {
    vitoria: ts.siglaVitoria,
    derrota: ts.siglaDerrota,
    jogo: ts.siglaJogo,
    pick: ts.siglaPick,
    ban: ts.siglaBan,
    dosJogos: ts.siglaDosJogos,
    rotas: ts.rotas,
    localeTag: tc.localeTag,
  });
  const championTeamSlug = overview.championship
    ? indexes.teamsById.get(overview.championship.championTeamId)?.slug
    : undefined;
  const finalSeriesId = overview.championship?.summary.series.id;

  // Séries agrupadas por fase (Final / Semifinais / Fase regular).
  const stageBuckets = { FINAL: [], SEMIFINAL: [], REGULAR_SEASON: [] } as Record<
    string,
    typeof overview.seriesSummaries
  >;
  for (const summary of overview.seriesSummaries) {
    const stage = summary.series.stage ?? "REGULAR_SEASON";
    (stageBuckets[stage] ?? stageBuckets.REGULAR_SEASON).push(summary);
  }
  const seriesGroups = [
    { key: "FINAL", title: t.faseFinal, list: stageBuckets.FINAL },
    { key: "SEMIFINAL", title: t.faseSemifinais, list: stageBuckets.SEMIFINAL },
    { key: "REGULAR_SEASON", title: t.faseRegular, list: stageBuckets.REGULAR_SEASON },
  ].filter((group) => group.list.length > 0);

  const cardStats = calculateCardStats(dataset).filter((c) => c.count > 0);

  return (
    <PageShell className="space-y-6">
      <div>
        <Link
          href="/temporadas"
          className="inline-flex items-center gap-1 text-sm font-semibold text-muted transition hover:text-text"
        >
          <ArrowLeft className="h-4 w-4" />
          {t.voltarTodasTemporadas}
        </Link>
      </div>

      <PageHero
        badge={t.detalheBadge}
        title={archived.name}
        description={`${t.detalheEncerradaEm} ${endedLabel}. ${t.detalheSomenteLeituraTexto}`}
        extra={<Badge variant="bronze">{t.somenteLeitura}</Badge>}
      />

      <ChampionshipHero
        championship={overview.championship}
        teamsById={indexes.teamsById}
        playersById={indexes.playersById}
        championTeamHref={championTeamSlug ? `/temporadas/${seasonId}/times/${championTeamSlug}` : undefined}
        grandFinalHref={finalSeriesId ? `/temporadas/${seasonId}/partidas/${finalSeriesId}` : undefined}
        textos={tc}
      />

      <section className="space-y-4">
        <SectionTitle
          title={t.classificacaoTitulo}
          subtitle={t.classificacaoSubtitulo}
        />
        <StandingsPageClient
          rows={overview.standings.rows}
          source={overview.standings.source}
          teamHrefBase={`/temporadas/${seasonId}/times/`}
          textos={tc}
        />
      </section>

      <section className="space-y-6">
        <SectionTitle title={t.seriesTitulo} subtitle={t.seriesSubtitulo} />
        {overview.seriesSummaries.length === 0 ? (
          <EmptyState
            title={t.seriesVazioTitulo}
            description={t.seriesVazioDescricao}
          />
        ) : (
          seriesGroups.map((group) => (
            <div key={group.key} className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent2/80">
                {group.title} · {group.list.length}
              </p>
              {group.list.map((summary) => (
                <SeriesSummaryCard
                  key={summary.series.id}
                  summary={summary}
                  teamsById={indexes.teamsById}
                  playersById={indexes.playersById}
                  readOnly
                  href={`/temporadas/${seasonId}/partidas/${summary.series.id}`}
                  textos={tc}
                />
              ))}
            </div>
          ))
        )}
      </section>

      {cardStats.length > 0 ? (
        <section className="space-y-4">
          <SectionTitle title={t.cartasMaisSorteadasTitulo} subtitle={t.cartasMaisSorteadasSubtitulo} />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {cardStats.map((card) => {
              const def = CARDS_BY_ID[card.cardId as CardId];
              return (
                <Card key={card.cardId} className="flex items-center gap-3 p-4">
                  {def?.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={def.imageUrl}
                      alt=""
                      width={48}
                      height={48}
                      className="h-12 w-12 shrink-0 rounded-xl object-cover"
                      style={{ border: `1px solid ${def.border}` }}
                    />
                  ) : (
                    <span
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl"
                      style={{ background: def ? `linear-gradient(135deg, ${def.from}, ${def.to})` : "rgba(255,255,255,0.04)" }}
                    >
                      {def?.emoji ?? "🎴"}
                    </span>
                  )}
                  <div className="min-w-0">
                    {/*
                      O nome sai do dicionário, como /cartas já faz. `card.title` vem de
                      `calculateCardStats` fixo em português — era a única string de
                      domínio que escapava do i18n, e com o site em inglês a seção
                      mostrava "DRAFT SABOTADO — 3 draws", metade em cada idioma.
                    */}
                    <p className="truncate font-semibold">
                      {ts.cartas[card.cardId as CardId]?.nome ?? card.title}
                      {def?.dupla ? t.duplaSufixo : ""}
                    </p>
                    <p className="text-xs text-muted">{card.count} {card.count === 1 ? t.sorteioSingular : t.sorteioPlural}</p>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
      ) : null}

      <section className="space-y-4">
        <SectionTitle
          title={t.estatisticasTitulo}
          subtitle={t.estatisticasSubtitulo}
        />
        <StatsToggles
          playerRankings={playerRankings}
          champRankings={champRankings}
          t={{
            jogadoresTitulo: ts.rankJogadoresTitulo,
            aoVivo: ts.rankAoVivo,
            jogadoresDescricao: ts.rankJogadoresDescricao,
            colJogador: ts.rankColJogador,
            colTime: ts.rankColTime,
            colCampeao: ts.rankColCampeao,
            campeoesTitulo: ts.rankCampeoesTitulo,
            campeoesDescricao: ts.rankCampeoesDescricao,
            vazioJogadores: ts.rankVazioJogadores,
            vazioCampeoes: ts.rankVazioCampeoes,
            vazioTexto: ts.rankVazioTexto,
            ordemDesc: ts.rankOrdemDesc,
            ordemAsc: ts.rankOrdemAsc,
            metricasJogador: ts.metricasJogador,
            metricasCampeao: ts.metricasCampeao,
          }}
        />
      </section>

      <RoleBests
        groups={buildRoleBests(dataset)}
        localeTag={tc.localeTag}
        hrefBase={`/temporadas/${seasonId}/jogadores/`}
        t={{
          titulo: ts.rotaTitulo,
          descricao: ts.rotaDescricao,
          melhor: ts.rotaMelhor,
          jogos: ts.rotaJogos,
          rotas: ts.rotas,
        }}
      />

      <DurationRanking
        rows={getGameDurations(dataset)}
        hrefBase={`/temporadas/${seasonId}/partidas/`}
        t={{
          titulo: ts.duracaoTitulo,
          descricao: ts.duracaoDescricao,
          maisLongas: ts.duracaoMaisLongas,
          maisLongasDesc: ts.duracaoMaisLongasDesc,
          maisCurtas: ts.duracaoMaisCurtas,
          maisCurtasDesc: ts.duracaoMaisCurtasDesc,
          jogo: ts.duracaoJogo,
          vitoria: ts.duracaoVitoria,
        }}
      />
    </PageShell>
  );
}
