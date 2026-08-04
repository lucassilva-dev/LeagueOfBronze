import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { ChampionIcon } from "@/components/champion-icon";
import { PageHero } from "@/components/page-hero";
import { PageShell } from "@/components/page-shell";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHeadCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getCardTitle } from "@/lib/cards";
import { formatKda, formatSeriesDateLabel } from "@/lib/format";
import { getMessages } from "@/lib/i18n/server";
import { getServerArchivedSeason } from "@/lib/server-data";
import {
  getGameMvpPlayerId,
  getGameTeamKills,
  getSeriesById,
  getSeriesFormatLabel,
  getSeriesMvp,
  getSeriesScore,
  getSeriesTeamKillTotals,
  getSeriesGamesWithTeamRows,
  getSeriesWinnerTeamId,
  isWalkoverSeries,
} from "@/lib/tournament";
import type { CardId } from "@/lib/schema";

export const dynamic = "force-dynamic";

type PageParams = Readonly<{
  params: Promise<{ seasonId: string; seriesId: string }>;
}>;

export default async function TemporadaPartidaPage({ params }: PageParams) {
  const { seasonId, seriesId } = await params;
  const result = await getServerArchivedSeason(seasonId);
  if (!result) notFound();

  const { paginasRegras: t, compartilhados: tc } = await getMessages();
  const { archived, dataset, indexes } = result;
  const series = getSeriesById(dataset, seriesId);
  if (!series) notFound();

  // Rótulo da fase no idioma da página (o helper do lib devolve sempre em português).
  const stage = series.stage ?? "REGULAR_SEASON";
  const stageLabel = stage === "FINAL" ? t.etapaFinal : stage === "SEMIFINAL" ? t.etapaSemifinal : t.etapaRegular;

  const teamA = indexes.teamsById.get(series.teamAId) ?? null;
  const teamB = indexes.teamsById.get(series.teamBId) ?? null;
  const teamAName = teamA?.name ?? series.teamAId;
  const teamBName = teamB?.name ?? series.teamBId;
  const score = getSeriesScore(series, dataset);
  const gameRows = getSeriesGamesWithTeamRows(series, dataset);
  const isWO = isWalkoverSeries(series);
  const winnerTeamId = getSeriesWinnerTeamId(series, dataset);
  const winnerName = winnerTeamId ? indexes.teamsById.get(winnerTeamId)?.name ?? winnerTeamId : null;
  const seriesMvp = getSeriesMvp(series, dataset);
  const seriesMvpNick = seriesMvp ? indexes.playersById.get(seriesMvp.playerId)?.nick ?? null : null;
  const killTotals = getSeriesTeamKillTotals(series, dataset);
  const formatLabel = getSeriesFormatLabel(series, dataset) === "MD5" ? t.formatoMd5 : t.formatoMd3;
  const teamHref = (id: string, slug?: string) => `/temporadas/${seasonId}/times/${slug ?? id}`;

  const title = `${teamAName} ${score.teamAWins}–${score.teamBWins} ${teamBName}`;
  const description = `${stageLabel} • ${formatSeriesDateLabel(series.date, tc.localeTag)} • ${archived.name}`;

  const cards = series.cardsUsed ?? [];

  return (
    <PageShell className="space-y-6">
      <div>
        <Link
          href={`/temporadas/${seasonId}`}
          className="inline-flex items-center gap-1 text-sm font-semibold text-muted transition hover:text-text"
        >
          <ArrowLeft className="h-4 w-4" />
          {t.voltarPara} {archived.name}
        </Link>
      </div>

      <PageHero
        badge={t.partidaBadge}
        title={title}
        description={description}
        extra={
          <div className="flex flex-wrap gap-2">
            <Badge variant="bronze">{t.somenteLeitura}</Badge>
            <Badge variant="outline">{formatLabel}</Badge>
            <Badge variant="outline">{stageLabel}</Badge>
            {seriesMvpNick ? <Badge variant="outline">{t.mvpDaSerie} {seriesMvpNick}</Badge> : null}
          </div>
        }
      />

      <div className="flex flex-wrap gap-2 text-sm">
        <Link href={teamHref(series.teamAId, teamA?.slug)} className="lob-pill hover:text-accent">{teamAName}</Link>
        <Link href={teamHref(series.teamBId, teamB?.slug)} className="lob-pill hover:text-accent">{teamBName}</Link>
      </div>

      {isWO ? (
        <Card className="p-5" style={{ borderColor: "rgba(232,184,120,.35)" }}>
          <p className="text-xs uppercase tracking-[0.14em] text-accent2">{t.woTitulo}</p>
          <p className="mt-2 text-sm text-text/80">
            {winnerName ? <><span className="font-semibold text-text">{winnerName}</span> {t.woVenceu}</> : t.woSerieEncerrada}
            {series.walkoverReason ? ` ${series.walkoverReason}` : ""}
          </p>
        </Card>
      ) : null}

      {!isWO && gameRows.length > 0 ? (
        <Card className="p-5">
          <p className="text-xs uppercase tracking-[0.14em] text-muted">{t.abatesPorTime}</p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
              <p className="text-xs text-muted">{teamAName}</p>
              <p className="mt-1 font-display text-2xl font-bold tracking-wide">{killTotals[series.teamAId] ?? 0}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
              <p className="text-xs text-muted">{teamBName}</p>
              <p className="mt-1 font-display text-2xl font-bold tracking-wide">{killTotals[series.teamBId] ?? 0}</p>
            </div>
          </div>
        </Card>
      ) : null}

      {cards.length > 0 ? (
        <Card className="p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-muted">{t.cartasDaSerie}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {cards.map((card, i) => (
              <Badge key={`${card.teamId}-${card.cardId}-${i}`} variant="outline">
                {(indexes.teamsById.get(card.teamId)?.name ?? card.teamId)}: {getCardTitle(card.cardId as CardId)}
                {card.dupla ? t.duplaSufixo : ""}
              </Badge>
            ))}
          </div>
        </Card>
      ) : null}

      <section className="space-y-4">
        {gameRows.length === 0 ? (
          isWO ? null : (
            <Card className="p-5 text-sm text-muted">{t.serieSemJogos}</Card>
          )
        ) : (
          gameRows.map(({ game, gameIndex, teamARows, teamBRows }) => {
            const winnerName = indexes.teamsById.get(game.winnerTeamId)?.name ?? game.winnerTeamId;
            const gameMvpNick = indexes.playersById.get(getGameMvpPlayerId(game))?.nick ?? "—";
            const kills = getGameTeamKills(game, series, dataset);
            const blocks = [
              { teamName: teamAName, rows: teamARows },
              { teamName: teamBName, rows: teamBRows },
            ];

            return (
              <Card key={`${series.id}-g${gameIndex}`} className="p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-heading text-lg font-semibold tracking-wide">{t.jogoRotulo} {gameIndex}</p>
                    <p className="mt-1 text-sm text-muted">
                      {t.vencedorRotulo} <span className="text-text">{winnerName}</span> • {t.mvpRotulo}{" "}
                      <span className="text-text">{gameMvpNick}</span>
                      {typeof game.durationMin === "number" ? (
                        <>
                          {" "}• {t.duracaoRotulo} <span className="text-text">{game.durationMin} {t.minutosAbreviacao}</span>
                        </>
                      ) : null}
                    </p>
                  </div>
                  <div className="w-full rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-sm sm:w-auto">
                    <div className="grid grid-cols-[minmax(0,1fr)_auto_auto_auto_minmax(0,1fr)] items-center gap-x-2">
                      <span className="truncate text-right text-muted" title={teamAName}>{teamAName}</span>
                      <span className="font-semibold">{kills.teamAKills}</span>
                      <span className="text-muted">x</span>
                      <span className="font-semibold">{kills.teamBKills}</span>
                      <span className="truncate text-muted" title={teamBName}>{teamBName}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 xl:grid-cols-2">
                  {blocks.map((block) => (
                    <div
                      key={`${series.id}-${gameIndex}-${block.teamName}`}
                      className="min-w-0 overflow-hidden rounded-2xl border border-white/8 bg-white/[0.015] p-3"
                    >
                      <p className="mb-2 text-xs uppercase tracking-[0.14em] text-muted">{block.teamName}</p>
                      <div className="max-w-full overflow-x-auto pb-1 scrollbar-thin">
                        <Table className="min-w-[440px]">
                          <TableHeader>
                            <TableRow>
                              <TableHeadCell className="min-w-[150px]">{t.colJogador}</TableHeadCell>
                              <TableHeadCell className="min-w-[96px]">{t.colCampeao}</TableHeadCell>
                              <TableHeadCell className="whitespace-nowrap">K/D/A</TableHeadCell>
                              <TableHeadCell className="whitespace-nowrap text-right">{t.colKda}</TableHeadCell>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {block.rows.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={4} className="text-muted">{t.semEstatisticasJogo}</TableCell>
                              </TableRow>
                            ) : (
                              block.rows.map((row) => (
                                <TableRow key={`${gameIndex}-${row.playerId}`}>
                                  <TableCell className="min-w-[150px] font-semibold">
                                    <Link href={`/temporadas/${seasonId}/jogadores/${indexes.playersById.get(row.playerId)?.slug ?? row.playerId}`} className="hover:text-accent">
                                      {row.playerNick}
                                    </Link>
                                  </TableCell>
                                  <TableCell className="whitespace-nowrap">
                                    <ChampionIcon champion={row.champion} size={22} showName />
                                  </TableCell>
                                  <TableCell className="whitespace-nowrap">
                                    {row.kills}/{row.deaths}/{row.assists}
                                  </TableCell>
                                  <TableCell className="whitespace-nowrap text-right">
                                    {formatKda((row.kills + row.assists) / Math.max(1, row.deaths))}
                                  </TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            );
          })
        )}
      </section>
    </PageShell>
  );
}
