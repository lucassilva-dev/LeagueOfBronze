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
import { getServerArchivedSeason } from "@/lib/server-data";
import {
  getGameMvpPlayerId,
  getGameTeamKills,
  getSeriesById,
  getSeriesFormatLabel,
  getSeriesMvp,
  getSeriesScore,
  getSeriesStageLabel,
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

  const { archived, dataset, indexes } = result;
  const series = getSeriesById(dataset, seriesId);
  if (!series) notFound();

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
  const formatLabel = getSeriesFormatLabel(series, dataset);
  const teamHref = (id: string, slug?: string) => `/temporadas/${seasonId}/times/${slug ?? id}`;

  const title = `${teamAName} ${score.teamAWins}–${score.teamBWins} ${teamBName}`;
  const description = `${getSeriesStageLabel(series)} • ${formatSeriesDateLabel(series.date)} • ${archived.name}`;

  const cards = series.cardsUsed ?? [];

  return (
    <PageShell className="space-y-6">
      <div>
        <Link
          href={`/temporadas/${seasonId}`}
          className="inline-flex items-center gap-1 text-sm font-semibold text-muted transition hover:text-text"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para {archived.name}
        </Link>
      </div>

      <PageHero
        badge="Partida arquivada"
        title={title}
        description={description}
        extra={
          <div className="flex flex-wrap gap-2">
            <Badge variant="bronze">Somente leitura</Badge>
            <Badge variant="outline">{formatLabel}</Badge>
            <Badge variant="outline">{getSeriesStageLabel(series)}</Badge>
            {seriesMvpNick ? <Badge variant="outline">MVP da série: {seriesMvpNick}</Badge> : null}
          </div>
        }
      />

      <div className="flex flex-wrap gap-2 text-sm">
        <Link href={teamHref(series.teamAId, teamA?.slug)} className="lob-pill hover:text-accent">{teamAName}</Link>
        <Link href={teamHref(series.teamBId, teamB?.slug)} className="lob-pill hover:text-accent">{teamBName}</Link>
      </div>

      {isWO ? (
        <Card className="p-5" style={{ borderColor: "rgba(232,184,120,.35)" }}>
          <p className="text-xs uppercase tracking-[0.14em] text-accent2">Vitória por W.O.</p>
          <p className="mt-2 text-sm text-text/80">
            {winnerName ? <><span className="font-semibold text-text">{winnerName}</span> venceu por W.O.</> : "Série encerrada por W.O."}
            {series.walkoverReason ? ` ${series.walkoverReason}` : ""}
          </p>
        </Card>
      ) : null}

      {!isWO && gameRows.length > 0 ? (
        <Card className="p-5">
          <p className="text-xs uppercase tracking-[0.14em] text-muted">Abates por time na série</p>
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
          <p className="text-xs uppercase tracking-[0.14em] text-muted">Cartinhas da série</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {cards.map((card, i) => (
              <Badge key={`${card.teamId}-${card.cardId}-${i}`} variant="outline">
                {(indexes.teamsById.get(card.teamId)?.name ?? card.teamId)}: {getCardTitle(card.cardId as CardId)}
                {card.dupla ? " (dupla)" : ""}
              </Badge>
            ))}
          </div>
        </Card>
      ) : null}

      <section className="space-y-4">
        {gameRows.length === 0 ? (
          isWO ? null : (
            <Card className="p-5 text-sm text-muted">Esta série não teve jogos registrados.</Card>
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
                    <p className="font-heading text-lg font-semibold tracking-wide">Jogo {gameIndex}</p>
                    <p className="mt-1 text-sm text-muted">
                      Vencedor: <span className="text-text">{winnerName}</span> • MVP:{" "}
                      <span className="text-text">{gameMvpNick}</span>
                      {typeof game.durationMin === "number" ? (
                        <>
                          {" "}• Duração: <span className="text-text">{game.durationMin} min</span>
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
                              <TableHeadCell className="min-w-[150px]">Jogador</TableHeadCell>
                              <TableHeadCell className="min-w-[96px]">Campeão</TableHeadCell>
                              <TableHeadCell className="whitespace-nowrap">K/D/A</TableHeadCell>
                              <TableHeadCell className="whitespace-nowrap text-right">KDA</TableHeadCell>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {block.rows.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={4} className="text-muted">Sem estatísticas neste jogo.</TableCell>
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
