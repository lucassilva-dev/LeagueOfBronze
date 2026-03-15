import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Crown } from "lucide-react";

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
import { formatDateLabel, formatKda } from "@/lib/format";
import { getOpGgMultiSearchUrlFromNicks } from "@/lib/opgg";
import { getServerDataset } from "@/lib/server-data";
import {
  calculateStandings,
  calculateTeamAggregates,
  getChampionshipResult,
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
  const championship = getChampionshipResult(dataset);
  const isChampion = championship?.championTeamId === team.id;
  const runnerUpTeam = championship
    ? indexes.teamsById.get(championship.runnerUpTeamId)
    : null;
  const finalMvp = championship?.summary.mvp
    ? indexes.playersById.get(championship.summary.mvp.playerId)
    : null;
  const championWins = championship
    ? championship.championTeamId === championship.summary.series.teamAId
      ? championship.summary.score.teamAWins
      : championship.summary.score.teamBWins
    : 0;
  const runnerUpWins = championship
    ? championship.championTeamId === championship.summary.series.teamAId
      ? championship.summary.score.teamBWins
      : championship.summary.score.teamAWins
    : 0;

  return (
    <PageShell className="space-y-6">
      <PageHero
        badge={isChampion ? "Campe\u00e3o" : "Time"}
        title={team.name}
        description="Elenco, hist\u00f3rico de s\u00e9ries e estat\u00edsticas agregadas calculadas automaticamente a partir dos jogos."
        extra={
          <div className="flex flex-wrap gap-2">
            {isChampion ? (
              <Badge className="border-amber-300/30 bg-amber-300/15 text-amber-100" variant="outline">
                Campe\u00e3o do campeonato
              </Badge>
            ) : null}
            {standingsRow ? (
              <>
                <Badge variant="accent">#{standingsRow.position} na tabela</Badge>
                <Badge variant="outline">{standingsRow.points} pts</Badge>
                <Badge variant="outline">
                  S\u00e9ries {standingsRow.seriesWon}-{standingsRow.seriesLost}
                </Badge>
              </>
            ) : null}
          </div>
        }
      />

      {isChampion && championship ? (
        <section>
          <Card className="champion-panel champion-glow overflow-hidden p-5 sm:p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-3xl">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="border-amber-300/30 bg-amber-300/15 text-amber-100" variant="outline">
                    T\u00edtulo confirmado
                  </Badge>
                  <Badge variant="outline">{championship.summary.formatLabel}</Badge>
                  <Badge variant="outline">
                    {formatDateLabel(championship.summary.series.date)}
                  </Badge>
                </div>

                <div className="mt-4 flex items-start gap-3">
                  <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-amber-300/25 bg-amber-300/10 text-amber-100">
                    <Crown className="h-6 w-6" />
                  </span>
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-amber-100/75">
                      Momento do t\u00edtulo
                    </p>
                    <h2 className="mt-1 font-display text-2xl font-black tracking-wide sm:text-3xl">
                      {team.name}
                    </h2>
                    <p className="mt-2 text-sm text-slate-200/80 sm:text-base">
                      Venceu a grande final contra{" "}
                      {runnerUpTeam?.name ?? championship.runnerUpTeamId} por{" "}
                      {championWins}-{runnerUpWins}.
                      {championship.summary.isWalkover
                        ? " S\u00e9rie encerrada por W.O."
                        : finalMvp
                          ? ` MVP da final: ${finalMvp.nick}.`
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
                  <p className="mt-1 text-xs text-muted">{championship.summary.stageLabel}</p>
                </div>

                <div className="flex flex-col justify-between rounded-2xl border border-white/10 bg-slate-950/35 p-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-muted">
                      Grande final
                    </p>
                    <p className="mt-2 text-sm text-slate-200/80">
                      Abra o detalhe completo da decis\u00e3o do campeonato.
                    </p>
                  </div>
                  <Link
                    href={`/partidas/${championship.summary.series.id}`}
                    className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-amber-100 transition hover:text-white"
                  >
                    Ver final completa
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>
          </Card>
        </section>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatChip label="Abates" value={teamStats?.kills ?? 0} />
        <StatChip label="Mortes" value={teamStats?.deaths ?? 0} />
        <StatChip label="Assist\u00eancias" value={teamStats?.assists ?? 0} />
        <StatChip
          label="KDA m\u00e9dio"
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
                        <TableCell>{player.role2 || "\u2014"}</TableCell>
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
          <h2 className="font-display text-xl font-bold tracking-wide">Hist\u00f3rico de S\u00e9ries</h2>
          {history.length === 0 ? (
            <EmptyState
              title="Sem s\u00e9ries ainda"
              description="Quando voc\u00ea lan\u00e7ar s\u00e9ries no admin, o hist\u00f3rico deste time aparecer\u00e1 aqui."
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
