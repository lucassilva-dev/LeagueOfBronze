import Link from "next/link";
import { notFound } from "next/navigation";
import { Crown } from "lucide-react";

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
import { getOpGgSummonerUrlFromNick } from "@/lib/opgg";
import { getServerDataset } from "@/lib/server-data";
import {
  calculatePlayerAggregates,
  getChampionshipResult,
  getPlayerBySlug,
  getPlayerGameHistory,
  getPlayerLeaderboardPositions,
} from "@/lib/tournament";
import type { ChampionshipResult } from "@/types/domain";
import type { Team } from "@/lib/schema";

export const dynamic = "force-dynamic";

type PlayerChampionBannerData = Readonly<{
  team: Team;
  titleScore: string;
  formatLabel: string;
}>;
type PlayerPageParams = Readonly<{
  params: Promise<{ slug: string }>;
}>;
type PlayerBadgesProps = Readonly<{
  isChampion: boolean;
  positions: ReturnType<typeof getPlayerLeaderboardPositions>;
  teamSlug: string | null;
  opggUrl: string | null;
}>;

function getPlayerDescription(
  teamName: string,
  role1: string,
  role2: string | undefined,
  elo: string,
) {
  const roles = role2 ? `${role1} / ${role2}` : role1;
  return `Time: ${teamName} • Rotas: ${roles} • Elo: ${elo}`;
}

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

function getPlayerChampionBannerData(
  championship: ChampionshipResult | null,
  team: Team | undefined,
  teamId: string,
): PlayerChampionBannerData | null {
  if (!championship || !team || championship.championTeamId !== teamId) return null;

  const score = getFinalScore(championship);

  return {
    team,
    titleScore: `${score.championWins}-${score.runnerUpWins}`,
    formatLabel: championship.summary.formatLabel,
  };
}

function PlayerChampionBanner({
  data,
  stageLabel,
}: Readonly<{ data: PlayerChampionBannerData; stageLabel: string }>) {
  return (
    <section>
      <Card className="champion-panel champion-glow overflow-hidden p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-3xl">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-amber-300/25 bg-amber-300/10 text-amber-100">
                <Crown className="h-6 w-6" />
              </span>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-amber-100/75">
                  Jogador campeão
                </p>
                <h2 className="mt-1 font-display text-2xl font-black tracking-wide sm:text-3xl">
                  {data.team.name}
                </h2>
                <p className="mt-2 text-sm text-slate-200/80 sm:text-base">
                  Este jogador faz parte do elenco campeão. Título confirmado na{" "}
                  {stageLabel.toLowerCase()} por {data.titleScore}.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:w-[18rem]">
            <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-4 text-center">
              <p className="text-xs uppercase tracking-[0.16em] text-muted">Conquista</p>
              <p className="mt-2 font-display text-3xl font-black tracking-wide text-amber-100">
                Campeão
              </p>
              <p className="mt-1 text-xs text-muted">{data.formatLabel}</p>
            </div>
          </div>
        </div>
      </Card>
    </section>
  );
}

function PlayerBadges({ isChampion, positions, teamSlug, opggUrl }: PlayerBadgesProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {isChampion ? (
        <Badge className="border-amber-300/30 bg-amber-300/15 text-amber-100" variant="outline">
          Elenco campeão
        </Badge>
      ) : null}
      {typeof positions.kills === "number" ? (
        <Badge variant="accent">#{positions.kills} em abates</Badge>
      ) : null}
      {typeof positions.kda === "number" ? (
        <Badge variant="outline">#{positions.kda} em KDA</Badge>
      ) : null}
      {typeof positions.mvps === "number" ? (
        <Badge variant="outline">#{positions.mvps} em MVPs</Badge>
      ) : null}
      {teamSlug ? (
        <Link
          href={`/times/${teamSlug}`}
          className="inline-flex items-center rounded-full border border-white/10 px-3 py-1 text-xs font-semibold hover:border-accent/30 hover:text-accent"
        >
          Ver time
        </Link>
      ) : null}
      {opggUrl ? (
        <a
          href={opggUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center rounded-full border border-white/10 px-3 py-1 text-xs font-semibold hover:border-accent/30 hover:text-accent"
        >
          Ver no OP.GG
        </a>
      ) : null}
    </div>
  );
}

function PlayerHistoryMobile({
  history,
}: Readonly<{
  history: ReturnType<typeof getPlayerGameHistory>;
}>) {
  if (history.length === 0) {
    return <Card className="p-5 text-sm text-muted">Sem jogos lançados para este jogador.</Card>;
  }

  return (
    <>
      {history.map((row) => (
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
                {row.champion || "—"}
                {row.mvp ? " • MVP" : ""}
              </p>
            </div>
          </div>
        </Card>
      ))}
    </>
  );
}

function PlayerHistoryTable({
  history,
}: Readonly<{
  history: ReturnType<typeof getPlayerGameHistory>;
}>) {
  return (
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
                    {row.mvp ? <span className="text-xs text-accent">(MVP)</span> : null}
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
  );
}

export default async function PlayerPage({ params }: PlayerPageParams) {
  const { slug } = await params;
  const { dataset, indexes } = await getServerDataset();
  const player = getPlayerBySlug(dataset, slug);

  if (!player) {
    notFound();
  }

  const aggregate = calculatePlayerAggregates(dataset).find((row) => row.playerId === player.id);
  const history = getPlayerGameHistory(dataset, player.id);
  const positions = getPlayerLeaderboardPositions(dataset, player.id);
  const team = indexes.teamsById.get(player.teamId);
  const opggUrl = getOpGgSummonerUrlFromNick(player.nick);
  const championship = getChampionshipResult(dataset);
  const championBannerData = getPlayerChampionBannerData(championship, team, player.teamId);
  const description = getPlayerDescription(
    team?.name ?? player.teamId,
    player.role1,
    player.role2,
    player.elo,
  );

  return (
    <PageShell className="space-y-6">
      <PageHero
        badge={championBannerData ? "Campeão" : "Jogador"}
        title={player.nick}
        description={description}
        extra={
          <PlayerBadges
            isChampion={Boolean(championBannerData)}
            positions={positions}
            teamSlug={team?.slug ?? null}
            opggUrl={opggUrl}
          />
        }
      />

      {championBannerData && championship ? (
        <PlayerChampionBanner data={championBannerData} stageLabel={championship.summary.stageLabel} />
      ) : null}

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
          <PlayerHistoryMobile history={history} />
        </div>
        <PlayerHistoryTable history={history} />
      </section>
    </PageShell>
  );
}
