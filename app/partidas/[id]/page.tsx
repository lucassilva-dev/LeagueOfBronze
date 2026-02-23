import Link from "next/link";
import { notFound } from "next/navigation";

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
  getGameTeamKills,
  getSeriesById,
  getSeriesGamesWithTeamRows,
  getSeriesMvp,
  getSeriesScore,
  getSeriesTeamKillTotals,
  getSeriesWinnerTeamId,
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
  const score = getSeriesScore(series);
  const winner = getSeriesWinnerTeamId(series);
  const seriesMvp = getSeriesMvp(series, dataset);
  const seriesKillTotals = getSeriesTeamKillTotals(series, dataset);
  const gameRows = getSeriesGamesWithTeamRows(series, dataset);

  return (
    <PageShell className="space-y-6">
      <PageHero
        badge="Detalhe da Série"
        title={`${teamA?.name ?? series.teamAId} ${score.teamAWins}–${score.teamBWins} ${teamB?.name ?? series.teamBId}`}
        description={`Série ${series.id} • ${formatDateLabel(series.date)}`}
        extra={
          <div className="flex flex-wrap gap-2">
            <Badge variant={winner ? "success" : "muted"}>
              {winner ? "Série finalizada" : "Série em andamento"}
            </Badge>
            {seriesMvp ? (
              <Badge variant="accent">
                MVP da série: {indexes.playersById.get(seriesMvp.playerId)?.nick ?? seriesMvp.playerId}
              </Badge>
            ) : (
              <Badge variant="muted">MVP da série: —</Badge>
            )}
          </div>
        }
      />

      <section className="grid gap-4 md:grid-cols-2">
        <Card className="p-5">
          <p className="text-xs uppercase tracking-[0.14em] text-muted">Abates por time na série</p>
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
          <p className="text-xs uppercase tracking-[0.14em] text-muted">Links rápidos</p>
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
            Esta série ainda não possui jogos lançados.
          </Card>
        ) : (
          gameRows.map(({ game, gameIndex, teamARows, teamBRows }) => {
            const winnerName = indexes.teamsById.get(game.winnerTeamId)?.name ?? game.winnerTeamId;
            const gameMvp = indexes.playersById.get(game.mvpPlayerId);
            const kills = getGameTeamKills(game, series, dataset);

            return (
              <Card key={`${series.id}-g${gameIndex}`} className="p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-display text-lg font-bold tracking-wide">Jogo {gameIndex}</p>
                    <p className="mt-1 text-sm text-muted">
                      Vencedor: <span className="text-text">{winnerName}</span>
                      {" • "}
                      MVP: <span className="text-text">{gameMvp?.nick ?? game.mvpPlayerId}</span>
                      {typeof game.durationMin === "number" ? (
                        <>
                          {" • "}Duração: <span className="text-text">{game.durationMin} min</span>
                        </>
                      ) : null}
                    </p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-sm">
                    <span className="text-muted">{teamA?.name ?? "A"} </span>
                    <span className="font-semibold">{kills.teamAKills}</span>
                    <span className="mx-2 text-muted">x</span>
                    <span className="font-semibold">{kills.teamBKills}</span>
                    <span className="text-muted"> {teamB?.name ?? "B"}</span>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 xl:grid-cols-2">
                  {[
                    { teamName: teamA?.name ?? series.teamAId, rows: teamARows },
                    { teamName: teamB?.name ?? series.teamBId, rows: teamBRows },
                  ].map((block) => (
                    <div key={`${series.id}-${gameIndex}-${block.teamName}`} className="rounded-2xl border border-white/8 bg-white/[0.015] p-3">
                      <p className="mb-2 text-xs uppercase tracking-[0.14em] text-muted">
                        {block.teamName}
                      </p>
                      <div className="overflow-x-auto scrollbar-thin">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHeadCell>Jogador</TableHeadCell>
                              <TableHeadCell>Campeão</TableHeadCell>
                              <TableHeadCell>K/D/A</TableHeadCell>
                              <TableHeadCell className="text-right">KDA</TableHeadCell>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {block.rows.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={4} className="text-muted">
                                  Sem estatísticas neste jogo.
                                </TableCell>
                              </TableRow>
                            ) : (
                              block.rows.map((row) => (
                                <TableRow key={`${gameIndex}-${row.playerId}`}>
                                  <TableCell>
                                    <Link href={`/jogadores/${indexes.playersById.get(row.playerId)?.slug ?? row.playerId}`} className="font-semibold hover:text-accent">
                                      {row.playerNick}
                                    </Link>
                                  </TableCell>
                                  <TableCell>{row.champion || "—"}</TableCell>
                                  <TableCell>
                                    {row.kills}/{row.deaths}/{row.assists}
                                  </TableCell>
                                  <TableCell className="text-right">{formatKda((row.kills + row.assists) / Math.max(1, row.deaths))}</TableCell>
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
