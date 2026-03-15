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
import type { ChampionshipResult } from "@/types/domain";
import type { Player, Team } from "@/lib/schema";

export const dynamic = "force-dynamic";

type TeamPageParams = Readonly<{
  params: Promise<{ slug: string }>;
}>;
type TeamTitleHeroData = Readonly<{
  championWins: number;
  runnerUpWins: number;
  runnerUpTeamName: string;
  finalMvpNick: string | null;
  summary: ChampionshipResult["summary"];
}>;
type TeamHeaderExtraProps = Readonly<{
  isChampion: boolean;
  standingsPosition: number | null;
  points: number | null;
  seriesRecord: string | null;
}>;
type TeamChampionPanelProps = Readonly<{
  teamName: string;
  data: TeamTitleHeroData;
}>;
type TeamRosterNoticeProps = Readonly<{
  error: string;
  invalidNicks: string[];
}>;
type TeamRosterCardProps = Readonly<{
  roster: Player[];
  multiOpGg: ReturnType<typeof getOpGgMultiSearchUrlFromNicks>;
}>;

function getFinalScore(championship: ChampionshipResult) {
  const championWonOnSideA = championship.championTeamId === championship.summary.series.teamAId;

  if (championWonOnSideA) {
    return {
      championWins: championship.summary.score.teamAWins,
      runnerUpWins: championship.summary.score.teamBWins,
    };
  }

  return {
    championWins: championship.summary.score.teamBWins,
    runnerUpWins: championship.summary.score.teamAWins,
  };
}

function getTeamTitleHeroData(
  championship: ChampionshipResult | null,
  team: Team,
  teamsById: Map<string, Team>,
  playersById: Map<string, Player>,
): TeamTitleHeroData | null {
  if (championship?.championTeamId !== team.id) return null;

  const finalMvpNick = championship.summary.mvp
    ? playersById.get(championship.summary.mvp.playerId)?.nick ?? null
    : null;
  const score = getFinalScore(championship);

  return {
    championWins: score.championWins,
    runnerUpWins: score.runnerUpWins,
    runnerUpTeamName: teamsById.get(championship.runnerUpTeamId)?.name ?? championship.runnerUpTeamId,
    finalMvpNick,
    summary: championship.summary,
  };
}

function TeamHeaderExtra({
  isChampion,
  standingsPosition,
  points,
  seriesRecord,
}: TeamHeaderExtraProps) {
  const hasStandingsPosition = standingsPosition !== null;
  const hasPoints = points !== null;

  return (
    <div className="flex flex-wrap gap-2">
      {isChampion ? (
        <Badge className="border-amber-300/30 bg-amber-300/15 text-amber-100" variant="outline">
          Campeão do campeonato
        </Badge>
      ) : null}
      {hasStandingsPosition ? <Badge variant="accent">#{standingsPosition} na tabela</Badge> : null}
      {hasPoints ? <Badge variant="outline">{points} pts</Badge> : null}
      {seriesRecord ? <Badge variant="outline">Séries {seriesRecord}</Badge> : null}
    </div>
  );
}

function getChampionSummaryText(data: TeamTitleHeroData) {
  const baseText = `Venceu a grande final contra ${data.runnerUpTeamName} por ${data.championWins}-${data.runnerUpWins}.`;

  if (data.summary.isWalkover) {
    return `${baseText} Série encerrada por W.O.`;
  }

  if (data.finalMvpNick) {
    return `${baseText} MVP da final: ${data.finalMvpNick}.`;
  }

  return baseText;
}

function TeamChampionPanel({ teamName, data }: TeamChampionPanelProps) {
  return (
    <section>
      <Card className="champion-panel champion-glow overflow-hidden p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                className="border-amber-300/30 bg-amber-300/15 text-amber-100"
                variant="outline"
              >
                Título confirmado
              </Badge>
              <Badge variant="outline">{data.summary.formatLabel}</Badge>
              <Badge variant="outline">{formatDateLabel(data.summary.series.date)}</Badge>
            </div>

            <div className="mt-4 flex items-start gap-3">
              <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-amber-300/25 bg-amber-300/10 text-amber-100">
                <Crown className="h-6 w-6" />
              </span>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-amber-100/75">
                  Momento do título
                </p>
                <h2 className="mt-1 font-display text-2xl font-black tracking-wide sm:text-3xl">
                  {teamName}
                </h2>
                <p className="mt-2 text-sm text-slate-200/80 sm:text-base">
                  {getChampionSummaryText(data)}
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:w-[22rem]">
            <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-4 text-center">
              <p className="text-xs uppercase tracking-[0.16em] text-muted">Placar da final</p>
              <p className="mt-2 font-display text-4xl font-black tracking-wide text-amber-100">
                {data.championWins}
                <span className="mx-2 text-white/35">-</span>
                {data.runnerUpWins}
              </p>
              <p className="mt-1 text-xs text-muted">{data.summary.stageLabel}</p>
            </div>

            <div className="flex flex-col justify-between rounded-2xl border border-white/10 bg-slate-950/35 p-4">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-muted">Grande final</p>
                <p className="mt-2 text-sm text-slate-200/80">
                  Abra o detalhe completo da decisão do campeonato.
                </p>
              </div>
              <Link
                href={`/partidas/${data.summary.series.id}`}
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
  );
}

function TeamRosterNotice({ error, invalidNicks }: TeamRosterNoticeProps) {
  return (
    <div className="mt-3 rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-100">
      <p className="font-semibold">{error}</p>
      {invalidNicks.length > 0 ? (
        <p className="mt-1 text-xs text-red-200/90">
          Nicks com problema: {invalidNicks.join(", ")}
        </p>
      ) : null}
    </div>
  );
}

function TeamRosterCard({ roster, multiOpGg }: TeamRosterCardProps) {
  const showRosterNotice = multiOpGg.ok === false;

  return (
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

      {showRosterNotice ? (
        <TeamRosterNotice error={multiOpGg.error} invalidNicks={multiOpGg.invalidNicks} />
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
                    <Link
                      href={`/jogadores/${player.slug}`}
                      className="font-semibold hover:text-accent"
                    >
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
  );
}

export default async function TeamPage({ params }: TeamPageParams) {
  const { slug } = await params;
  const { dataset, indexes } = await getServerDataset();
  const team = getTeamBySlug(dataset, slug);

  if (!team) {
    notFound();
  }

  const roster = getPlayersForTeam(dataset, team.id);
  const history = getTeamSeriesHistory(dataset, team.id);
  const teamStats = calculateTeamAggregates(dataset).find((row) => row.teamId === team.id);
  const standingsRow = calculateStandings(dataset).rows.find((row) => row.teamId === team.id);
  const multiOpGg = getOpGgMultiSearchUrlFromNicks(roster.map((player) => player.nick));
  const championship = getChampionshipResult(dataset);
  const titleHeroData = getTeamTitleHeroData(
    championship,
    team,
    indexes.teamsById,
    indexes.playersById,
  );

  return (
    <PageShell className="space-y-6">
      <PageHero
        badge={titleHeroData ? "Campeão" : "Time"}
        title={team.name}
        description="Elenco, histórico de séries e estatísticas agregadas calculadas automaticamente a partir dos jogos."
        extra={
          <TeamHeaderExtra
            isChampion={Boolean(titleHeroData)}
            standingsPosition={standingsRow?.position ?? null}
            points={standingsRow?.points ?? null}
            seriesRecord={
              standingsRow ? `${standingsRow.seriesWon}-${standingsRow.seriesLost}` : null
            }
          />
        }
      />

      {titleHeroData ? <TeamChampionPanel teamName={team.name} data={titleHeroData} /> : null}

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
          <TeamRosterCard roster={roster} multiOpGg={multiOpGg} />
        </div>

        <div className="space-y-4">
          <h2 className="font-display text-xl font-bold tracking-wide">Histórico de séries</h2>
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
