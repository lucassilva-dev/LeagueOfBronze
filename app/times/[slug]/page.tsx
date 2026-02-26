import Link from "next/link";
import { notFound } from "next/navigation";

import { EmptyState } from "@/components/empty-state";
import { PageHero } from "@/components/page-hero";
import { PageShell } from "@/components/page-shell";
import { SeriesSummaryCard } from "@/components/series-summary-card";
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
import { formatKda } from "@/lib/format";
import { getOpGgMultiSearchUrlFromNicks } from "@/lib/opgg";
import { getServerDataset } from "@/lib/server-data";
import {
  calculateStandings,
  calculateTeamAggregates,
  getPlayersForTeam,
  getTeamBySlug,
  getTeamSeriesHistory,
} from "@/lib/tournament";

export const dynamic = "force-dynamic";

export default async function TeamPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { dataset, indexes } = await getServerDataset();
  const team = getTeamBySlug(dataset, slug);
  if (!team) notFound();

  const roster = getPlayersForTeam(dataset, team.id);
  const history = getTeamSeriesHistory(dataset, team.id);
  const teamStats = calculateTeamAggregates(dataset).find((row) => row.teamId === team.id);
  const standingsRow = calculateStandings(dataset).rows.find((row) => row.teamId === team.id);
  const multiOpGg = getOpGgMultiSearchUrlFromNicks(roster.map((player) => player.nick));

  return (
    <PageShell className="space-y-6">
      <PageHero
        badge="Time"
        title={team.name}
        description="Elenco, histórico de séries e estatísticas agregadas calculadas automaticamente a partir dos jogos."
        extra={
          standingsRow ? (
            <div className="flex flex-wrap gap-2">
              <Badge variant="accent">#{standingsRow.position} na tabela</Badge>
              <Badge variant="outline">{standingsRow.points} pts</Badge>
              <Badge variant="outline">
                Séries {standingsRow.seriesWon}-{standingsRow.seriesLost}
              </Badge>
            </div>
          ) : null
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatChip label="Abates" value={teamStats?.kills ?? 0} />
        <StatChip label="Mortes" value={teamStats?.deaths ?? 0} />
        <StatChip label="Assistências" value={teamStats?.assists ?? 0} />
        <StatChip
          label="KDA médio"
          value={formatKda(teamStats?.kda ?? 0)}
          hint={`MVPs (jogo): ${teamStats?.gameMvps ?? 0} • Saldo de jogos: ${teamStats?.gameDiff ?? 0}`}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-xl font-bold tracking-wide">Elenco</h2>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <Badge variant="muted">{roster.length} jogadores</Badge>
                {multiOpGg.ok ? (
                  <Link
                    href={multiOpGg.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-8 items-center justify-center rounded-lg border border-border/80 bg-panel2/90 px-3 text-xs font-semibold tracking-wide text-text transition hover:bg-panel2"
                  >
                    Multi OP.GG (5)
                  </Link>
                ) : null}
              </div>
            </div>
            {!multiOpGg.ok ? (
              <div className="mt-3 rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-100">
                <p className="font-semibold">{multiOpGg.error}</p>
                {multiOpGg.invalidNicks.length > 0 ? (
                  <p className="mt-1 text-xs text-red-200/90">
                    Nicks com problema: {multiOpGg.invalidNicks.join(", ")}
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="mt-4 grid gap-3 md:hidden">
              {roster.map((player) => (
                <Card key={player.id} className="p-3">
                  <Link href={`/jogadores/${player.slug}`} className="font-semibold hover:text-accent">
                    {player.nick}
                  </Link>
                  <p className="mt-1 text-xs text-muted">
                    {player.role1}
                    {player.role2 ? ` / ${player.role2}` : ""} • {player.elo}
                  </p>
                </Card>
              ))}
            </div>

            <div className="hidden md:block">
              <div className="mt-4 overflow-x-auto scrollbar-thin">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHeadCell>Nick</TableHeadCell>
                      <TableHeadCell>Rota 1</TableHeadCell>
                      <TableHeadCell>Rota 2</TableHeadCell>
                      <TableHeadCell>Elo</TableHeadCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {roster.map((player) => (
                      <TableRow key={player.id}>
                        <TableCell>
                          <Link href={`/jogadores/${player.slug}`} className="font-semibold hover:text-accent">
                            {player.nick}
                          </Link>
                        </TableCell>
                        <TableCell>{player.role1}</TableCell>
                        <TableCell>{player.role2 || "—"}</TableCell>
                        <TableCell>{player.elo}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <h2 className="font-display text-xl font-bold tracking-wide">Histórico de Séries</h2>
          {history.length === 0 ? (
            <EmptyState
              title="Sem séries ainda"
              description="Quando você lançar séries no admin, o histórico deste time aparecerá aqui."
            />
          ) : (
            <div className="space-y-3">
              {history.map((summary) => (
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
      </section>
    </PageShell>
  );
}
