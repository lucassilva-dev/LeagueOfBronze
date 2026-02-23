import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHero } from "@/components/page-hero";
import { PageShell } from "@/components/page-shell";
import { StatChip } from "@/components/stat-chip";
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
  calculatePlayerAggregates,
  getPlayerBySlug,
  getPlayerGameHistory,
  getPlayerLeaderboardPositions,
} from "@/lib/tournament";

export const dynamic = "force-dynamic";

export default async function PlayerPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { dataset, indexes } = await getServerDataset();
  const player = getPlayerBySlug(dataset, slug);
  if (!player) notFound();

  const aggregate = calculatePlayerAggregates(dataset).find((row) => row.playerId === player.id);
  const history = getPlayerGameHistory(dataset, player.id);
  const positions = getPlayerLeaderboardPositions(dataset, player.id);
  const team = indexes.teamsById.get(player.teamId);

  return (
    <PageShell className="space-y-6">
      <PageHero
        badge="Jogador"
        title={player.nick}
        description={`Time: ${team?.name ?? player.teamId} • Rotas: ${player.role1}${player.role2 ? ` / ${player.role2}` : ""} • Elo: ${player.elo}`}
        extra={
          <div className="flex flex-wrap gap-2">
            {typeof positions.kills === "number" ? (
              <Badge variant="accent">#{positions.kills} em abates</Badge>
            ) : null}
            {typeof positions.kda === "number" ? (
              <Badge variant="outline">#{positions.kda} em KDA</Badge>
            ) : null}
            {typeof positions.mvps === "number" ? (
              <Badge variant="outline">#{positions.mvps} em MVPs</Badge>
            ) : null}
            {team ? (
              <Link href={`/times/${team.slug}`} className="inline-flex items-center rounded-full border border-white/10 px-3 py-1 text-xs font-semibold hover:border-accent/30 hover:text-accent">
                Ver time
              </Link>
            ) : null}
          </div>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatChip label="Abates" value={aggregate?.kills ?? 0} />
        <StatChip label="Mortes" value={aggregate?.deaths ?? 0} />
        <StatChip label="Assistências" value={aggregate?.assists ?? 0} />
        <StatChip label="KDA" value={formatKda(aggregate?.kda ?? 0)} />
        <StatChip
          label="MVPs"
          value={aggregate?.gameMvps ?? 0}
          hint={`MVPs de série: ${aggregate?.seriesMvps ?? 0}`}
        />
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-xl font-bold tracking-wide">Histórico por jogo</h2>

        <div className="grid gap-3 md:hidden">
          {history.length === 0 ? (
            <Card className="p-5 text-sm text-muted">Sem jogos lançados para este jogador.</Card>
          ) : (
            history.map((row) => (
              <Card key={`${row.seriesId}-${row.gameIndex}`} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">
                      {formatDateLabel(row.date)} • Jogo {row.gameIndex}
                    </p>
                    <p className="text-xs text-muted">vs {row.opponentTeamName}</p>
                    <p className="mt-1 text-xs text-muted">
                      Série:{" "}
                      <Link href={`/partidas/${row.seriesId}`} className="hover:text-text">
                        {row.seriesId}
                      </Link>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-display font-bold">
                      {row.kills}/{row.deaths}/{row.assists}
                    </p>
                    <p className="text-xs text-muted">
                      {row.champion || "—"} {row.mvp ? "• MVP" : ""}
                    </p>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>

        <Card className="hidden p-2 md:block">
          <div className="overflow-x-auto scrollbar-thin">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHeadCell>Data</TableHeadCell>
                  <TableHeadCell>Série</TableHeadCell>
                  <TableHeadCell>Jogo</TableHeadCell>
                  <TableHeadCell>Adversário</TableHeadCell>
                  <TableHeadCell>Campeão</TableHeadCell>
                  <TableHeadCell>K/D/A</TableHeadCell>
                  <TableHeadCell className="text-right">KDA</TableHeadCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-muted">
                      Sem jogos lançados para este jogador.
                    </TableCell>
                  </TableRow>
                ) : (
                  history.map((row) => (
                    <TableRow key={`${row.seriesId}-${row.gameIndex}`}>
                      <TableCell>{formatDateLabel(row.date)}</TableCell>
                      <TableCell>
                        <Link href={`/partidas/${row.seriesId}`} className="font-semibold hover:text-accent">
                          {row.seriesId}
                        </Link>
                      </TableCell>
                      <TableCell>Jogo {row.gameIndex}</TableCell>
                      <TableCell>{row.opponentTeamName}</TableCell>
                      <TableCell>
                        {row.champion || "—"}{" "}
                        {row.mvp ? (
                          <span className="text-xs text-accent">(MVP)</span>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        {row.kills}/{row.deaths}/{row.assists}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatKda((row.kills + row.assists) / Math.max(1, row.deaths))}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </section>
    </PageShell>
  );
}
