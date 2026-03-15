import Link from "next/link";
import { notFound } from "next/navigation";
import { Crown } from "lucide-react";

import { PageHero } from "@/components/page-hero";
import { PageShell } from "@/components/page-shell";
import { TeamLink } from "@/components/team-link";
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
import { formatDateLabel, formatKda } from "@/lib/format";
import { getServerDataset } from "@/lib/server-data";
import {
  getGameMvpPlayerId,
  getGameTeamKills,
  getSeriesById,
  getSeriesFormatLabel,
  getSeriesGamesWithTeamRows,
  getSeriesMvp,
  getSeriesScore,
  getSeriesStageLabel,
  getSeriesTeamKillTotals,
  getSeriesWinnerTeamId,
  isWalkoverSeries,
} from "@/lib/tournament";

export const dynamic = "force-dynamic";

export default async function PartidaDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { dataset, indexes } = await getServerDataset();
  const series = getSeriesById(dataset, id);
  if (!series) notFound();

  const teamA = indexes.teamsById.get(series.teamAId);
  const teamB = indexes.teamsById.get(series.teamBId);
  const score = getSeriesScore(series, dataset);
  const winner = getSeriesWinnerTeamId(series, dataset);
  const winnerTeam = winner ? indexes.teamsById.get(winner) : null;
  const isWalkover = isWalkoverSeries(series);
  const seriesMvp = getSeriesMvp(series, dataset);
  const seriesKillTotals = getSeriesTeamKillTotals(series, dataset);
  const gameRows = getSeriesGamesWithTeamRows(series, dataset);
  const seriesFormatLabel = getSeriesFormatLabel(series, dataset);
  const stageLabel = getSeriesStageLabel(series);
  const isGrandFinal = (series.stage ?? "REGULAR_SEASON") === "FINAL";
  const championWins = winner
    ? winner === series.teamAId
      ? score.teamAWins
      : score.teamBWins
    : 0;
  const runnerUpWins = winner
    ? winner === series.teamAId
      ? score.teamBWins
      : score.teamAWins
    : 0;

  return (
    <PageShell className="space-y-6">
      <PageHero
        badge={isGrandFinal ? "Grande Final" : "Detalhe da S\u00e9rie"}
        title={`${teamA?.name ?? series.teamAId} ${score.teamAWins}–${score.teamBWins} ${teamB?.name ?? series.teamBId}`}
        description={`${stageLabel} • ${seriesFormatLabel} • S\u00e9rie ${series.id} • ${formatDateLabel(series.date)}`}
        extra={
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{seriesFormatLabel}</Badge>
            <Badge
              variant="muted"
              className={isGrandFinal ? "border-amber-300/20 bg-amber-300/10 text-amber-100" : undefined}
            >
              {stageLabel}
            </Badge>
            <Badge variant={winner ? "success" : "muted"}>
              {isWalkover
                ? "S\u00e9rie encerrada por W.O."
                : winner
                  ? "S\u00e9rie finalizada"
                  : "S\u00e9rie em andamento"}
            </Badge>
            {isWalkover ? (
              <Badge variant="accent">
                Vencedor por W.O.: {winnerTeam?.name ?? winner ?? "\u2014"}
              </Badge>
            ) : seriesMvp ? (
              <Badge variant="accent">
                MVP da s\u00e9rie: {indexes.playersById.get(seriesMvp.playerId)?.nick ?? seriesMvp.playerId}
              </Badge>
            ) : (
              <Badge variant="muted">MVP da s\u00e9rie: \u2014</Badge>
            )}
          </div>
        }
      />

      {isGrandFinal && winnerTeam ? (
        <section>
          <Card className="champion-panel champion-glow overflow-hidden p-5 sm:p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-3xl">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="border-amber-300/30 bg-amber-300/15 text-amber-100" variant="outline">
                    Campe\u00e3o do campeonato
                  </Badge>
                  <Badge variant="outline">{seriesFormatLabel}</Badge>
                  <Badge variant="outline">{formatDateLabel(series.date)}</Badge>
                </div>

                <div className="mt-4 flex items-start gap-3">
                  <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-amber-300/25 bg-amber-300/10 text-amber-100">
                    <Crown className="h-6 w-6" />
                  </span>
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-amber-100/75">
                      T\u00edtulo confirmado
                    </p>
                    <h2 className="mt-1 font-display text-2xl font-black tracking-wide sm:text-3xl">
                      {winnerTeam.name}
                    </h2>
                    <p className="mt-2 text-sm text-slate-200/80 sm:text-base">
                      Fechou a grande final por {championWins}-{runnerUpWins}.
                      {isWalkover
                        ? " O resultado foi definido por W.O."
                        : seriesMvp
                          ? ` MVP da final: ${indexes.playersById.get(seriesMvp.playerId)?.nick ?? seriesMvp.playerId}.`
                          : ""}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:w-[22rem]">
                <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-4 text-center">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted">
                    Placar da final
                  </p>
                  <p className="mt-2 font-display text-4xl font-black tracking-wide text-amber-100">
                    {championWins}
                    <span className="mx-2 text-white/35">-</span>
                    {runnerUpWins}
                  </p>
                  <p className="mt-1 text-xs text-muted">{stageLabel}</p>
                </div>

                <div className="flex flex-col justify-between rounded-2xl border border-white/10 bg-slate-950/35 p-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-muted">
                      Time campe\u00e3o
                    </p>
                    <p className="mt-2 text-sm text-slate-200/80">
                      Abra a p\u00e1gina do campe\u00e3o para ver elenco, campanha e estat\u00edsticas.
                    </p>
                  </div>
                  <Link
                    href={`/times/${winnerTeam.slug}`}
                    className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-amber-100 transition hover:text-white"
                  >
                    Ver time campe\u00e3o
                  </Link>
                </div>
              </div>
            </div>
          </Card>
        </section>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2">
        <Card className="p-5">
          <p className="text-xs uppercase tracking-[0.14em] text-muted">Abates por time na s\u00e9rie</p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
              <p className="text-xs text-muted">{teamA?.name ?? series.teamAId}</p>
              <p className="mt-1 font-display text-2xl font-bold tracking-wide">
                {seriesKillTotals[series.teamAId] ?? 0}
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
              <p className="text-xs text-muted">{teamB?.name ?? series.teamBId}</p>
              <p className="mt-1 font-display text-2xl font-bold tracking-wide">
                {seriesKillTotals[series.teamBId] ?? 0}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <p className="text-xs uppercase tracking-[0.14em] text-muted">Links r\u00e1pidos</p>
          <div className="mt-3 grid gap-2">
            {teamA ? (
              <TeamLink href={`/times/${teamA.slug}`} name={`Ver time: ${teamA.name}`} />
            ) : null}
            {teamB ? (
              <TeamLink href={`/times/${teamB.slug}`} name={`Ver time: ${teamB.name}`} />
            ) : null}
            <Link href="/partidas" className="font-semibold text-accent hover:underline">
              Voltar para lista de partidas
            </Link>
          </div>
        </Card>
      </section>

      <section className="space-y-4">
        {gameRows.length === 0 ? (
          <Card className="p-5 text-sm text-muted">
            {isWalkover
              ? `Esta s\u00e9rie foi encerrada por W.O.${series.walkoverReason ? ` ${series.walkoverReason}` : ""}`
              : "Esta s\u00e9rie ainda n\u00e3o possui jogos lan\u00e7ados."}
          </Card>
        ) : (
          gameRows.map(({ game, gameIndex, teamARows, teamBRows }) => {
            const winnerName = indexes.teamsById.get(game.winnerTeamId)?.name ?? game.winnerTeamId;
            const gameMvpPlayerId = getGameMvpPlayerId(game);
            const gameMvp = indexes.playersById.get(gameMvpPlayerId);
            const kills = getGameTeamKills(game, series, dataset);

            return (
              <Card key={`${series.id}-g${gameIndex}`} className="p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-display text-lg font-bold tracking-wide">Jogo {gameIndex}</p>
                    <p className="mt-1 text-sm text-muted">
                      Vencedor: <span className="text-text">{winnerName}</span>
                      {" • "}
                      MVP: <span className="text-text">{gameMvp?.nick ?? gameMvpPlayerId}</span>
                      {typeof game.durationMin === "number" ? (
                        <>
                          {" • "}Dura\u00e7\u00e3o: <span className="text-text">{game.durationMin} min</span>
                        </>
                      ) : null}
                    </p>
                  </div>
                  <div className="w-full rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-sm sm:w-auto">
                    <div className="grid grid-cols-[minmax(0,1fr)_auto_auto_auto_minmax(0,1fr)] items-center gap-x-2">
                      <span
                        className="truncate text-right text-muted"
                        title={teamA?.name ?? series.teamAId}
                      >
                        {teamA?.name ?? "A"}
                      </span>
                      <span className="font-semibold">{kills.teamAKills}</span>
                      <span className="text-muted">x</span>
                      <span className="font-semibold">{kills.teamBKills}</span>
                      <span
                        className="truncate text-muted"
                        title={teamB?.name ?? series.teamBId}
                      >
                        {teamB?.name ?? "B"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 xl:grid-cols-2">
                  {[
                    { teamName: teamA?.name ?? series.teamAId, rows: teamARows },
                    { teamName: teamB?.name ?? series.teamBId, rows: teamBRows },
                  ].map((block) => (
                    <div
                      key={`${series.id}-${gameIndex}-${block.teamName}`}
                      className="min-w-0 overflow-hidden rounded-2xl border border-white/8 bg-white/[0.015] p-3"
                    >
                      <p className="mb-2 text-xs uppercase tracking-[0.14em] text-muted">
                        {block.teamName}
                      </p>
                      <div className="max-w-full overflow-x-auto pb-1 scrollbar-thin">
                        <Table className="min-w-[500px]">
                          <TableHeader>
                            <TableRow>
                              <TableHeadCell className="min-w-[170px]">Jogador</TableHeadCell>
                              <TableHeadCell className="min-w-[96px]">
                                <span className="sm:hidden">Camp.</span>
                                <span className="hidden sm:inline">Campe\u00e3o</span>
                              </TableHeadCell>
                              <TableHeadCell className="whitespace-nowrap">K/D/A</TableHeadCell>
                              <TableHeadCell className="whitespace-nowrap text-right">KDA</TableHeadCell>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {block.rows.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={4} className="text-muted">
                                  Sem estat\u00edsticas neste jogo.
                                </TableCell>
                              </TableRow>
                            ) : (
                              block.rows.map((row) => (
                                <TableRow key={`${gameIndex}-${row.playerId}`}>
                                  <TableCell className="min-w-[170px]">
                                    <Link
                                      href={`/jogadores/${indexes.playersById.get(row.playerId)?.slug ?? row.playerId}`}
                                      className="block break-all font-semibold hover:text-accent"
                                    >
                                      {row.playerNick}
                                    </Link>
                                  </TableCell>
                                  <TableCell className="whitespace-nowrap">
                                    {row.champion || "\u2014"}
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
