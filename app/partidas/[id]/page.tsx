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
import type { Player, Team } from "@/lib/schema";

export const dynamic = "force-dynamic";

type PartidaDetalhePageParams = Readonly<{
  params: Promise<{ id: string }>;
}>;
type SeriesIdentity = Readonly<{
  teamA: Team | null;
  teamB: Team | null;
  stageLabel: string;
  seriesFormatLabel: string;
  isGrandFinal: boolean;
}>;
type SeriesExtraBadgesProps = Readonly<{
  identity: SeriesIdentity;
  winnerTeam: Team | null;
  winnerTeamId: string | null;
  isWalkover: boolean;
  seriesMvpNick: string | null;
}>;
type FinalChampionPanelProps = Readonly<{
  winnerTeam: Team;
  identity: SeriesIdentity;
  championWins: number;
  runnerUpWins: number;
  finalSummaryText: string;
  date: string;
}>;
type QuickLinksCardProps = Readonly<{
  teamA: Team | null;
  teamB: Team | null;
}>;
type GameTeamBlock = Readonly<{
  teamName: string;
  rows: ReturnType<typeof getSeriesGamesWithTeamRows>[number]["teamARows"];
}>;
type GameDetailsCardProps = Readonly<{
  seriesId: string;
  gameIndex: number;
  winnerName: string;
  durationMin: number | undefined;
  gameMvpNick: string | null;
  kills: ReturnType<typeof getGameTeamKills>;
  teamAName: string;
  teamBName: string;
  blocks: readonly [GameTeamBlock, GameTeamBlock];
  playersById: Map<string, Player>;
}>;

function isGrandFinalStage(stage: string | undefined) {
  return (stage ?? "REGULAR_SEASON") === "FINAL";
}

function getWinnerScore(score: ReturnType<typeof getSeriesScore>, winnerTeamId: string, teamAId: string) {
  const winnerIsTeamA = winnerTeamId === teamAId;

  if (winnerIsTeamA) {
    return {
      championWins: score.teamAWins,
      runnerUpWins: score.teamBWins,
    };
  }

  return {
    championWins: score.teamBWins,
    runnerUpWins: score.teamAWins,
  };
}

function getSeriesStatusText(isWalkover: boolean, hasWinner: boolean) {
  if (isWalkover) return "Série encerrada por W.O.";
  if (hasWinner) return "Série finalizada";
  return "Série em andamento";
}

function getSeriesMvpLabel(isWalkover: boolean, winnerTeamName: string | null, seriesMvpNick: string | null) {
  if (isWalkover) {
    return {
      variant: "accent" as const,
      text: `Vencedor por W.O.: ${winnerTeamName ?? "—"}`,
    };
  }

  if (seriesMvpNick) {
    return {
      variant: "accent" as const,
      text: `MVP da série: ${seriesMvpNick}`,
    };
  }

  return {
    variant: "muted" as const,
    text: "MVP da série: —",
  };
}

function getFinalSummaryText(isWalkover: boolean, seriesMvpNick: string | null) {
  if (isWalkover) return "O resultado foi definido por W.O.";
  if (seriesMvpNick) return `MVP da final: ${seriesMvpNick}.`;
  return "";
}

function getEmptyGamesText(isWalkover: boolean, walkoverReason: string | undefined) {
  if (!isWalkover) return "Esta série ainda não possui jogos lançados.";
  const reasonText = walkoverReason ? ` ${walkoverReason}` : "";
  return `Esta série foi encerrada por W.O.${reasonText}`;
}

function SeriesExtraBadges({
  identity,
  winnerTeam,
  winnerTeamId,
  isWalkover,
  seriesMvpNick,
}: SeriesExtraBadgesProps) {
  const mvpLabel = getSeriesMvpLabel(isWalkover, winnerTeam?.name ?? winnerTeamId ?? null, seriesMvpNick);
  const hasWinner = Boolean(winnerTeamId);

  return (
    <div className="flex flex-wrap gap-2">
      <Badge variant="outline">{identity.seriesFormatLabel}</Badge>
      <Badge
        variant="muted"
        className={
          identity.isGrandFinal ? "border-amber-300/20 bg-amber-300/10 text-amber-100" : undefined
        }
      >
        {identity.stageLabel}
      </Badge>
      <Badge variant={hasWinner ? "success" : "muted"}>
        {getSeriesStatusText(isWalkover, hasWinner)}
      </Badge>
      <Badge variant={mvpLabel.variant}>{mvpLabel.text}</Badge>
    </div>
  );
}

function FinalChampionPanel({
  winnerTeam,
  identity,
  championWins,
  runnerUpWins,
  finalSummaryText,
  date,
}: FinalChampionPanelProps) {
  return (
    <section>
      <Card className="champion-panel champion-glow overflow-hidden p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border-amber-300/30 bg-amber-300/15 text-amber-100" variant="outline">
                Campeão do campeonato
              </Badge>
              <Badge variant="outline">{identity.seriesFormatLabel}</Badge>
              <Badge variant="outline">{formatDateLabel(date)}</Badge>
            </div>

            <div className="mt-4 flex items-start gap-3">
              <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-amber-300/25 bg-amber-300/10 text-amber-100">
                <Crown className="h-6 w-6" />
              </span>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-amber-100/75">
                  Título confirmado
                </p>
                <h2 className="mt-1 font-display text-2xl font-black tracking-wide sm:text-3xl">
                  {winnerTeam.name}
                </h2>
                <p className="mt-2 text-sm text-slate-200/80 sm:text-base">
                  Fechou a grande final por {championWins}-{runnerUpWins}.
                  {finalSummaryText ? ` ${finalSummaryText}` : ""}
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:w-[22rem]">
            <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-4 text-center">
              <p className="text-xs uppercase tracking-[0.16em] text-muted">Placar da final</p>
              <p className="mt-2 font-display text-4xl font-black tracking-wide text-amber-100">
                {championWins}
                <span className="mx-2 text-white/35">-</span>
                {runnerUpWins}
              </p>
              <p className="mt-1 text-xs text-muted">{identity.stageLabel}</p>
            </div>

            <div className="flex flex-col justify-between rounded-2xl border border-white/10 bg-slate-950/35 p-4">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-muted">Time campeão</p>
                <p className="mt-2 text-sm text-slate-200/80">
                  Abra a página do campeão para ver elenco, campanha e estatísticas.
                </p>
              </div>
              <Link
                href={`/times/${winnerTeam.slug}`}
                className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-amber-100 transition hover:text-white"
              >
                Ver time campeão
              </Link>
            </div>
          </div>
        </div>
      </Card>
    </section>
  );
}

function QuickLinksCard({ teamA, teamB }: QuickLinksCardProps) {
  return (
    <Card className="p-5">
      <p className="text-xs uppercase tracking-[0.14em] text-muted">Links rápidos</p>
      <div className="mt-3 grid gap-2">
        {teamA ? <TeamLink href={`/times/${teamA.slug}`} name={`Ver time: ${teamA.name}`} /> : null}
        {teamB ? <TeamLink href={`/times/${teamB.slug}`} name={`Ver time: ${teamB.name}`} /> : null}
        <Link href="/partidas" className="font-semibold text-accent hover:underline">
          Voltar para lista de partidas
        </Link>
      </div>
    </Card>
  );
}

function GameDetailsCard({
  seriesId,
  gameIndex,
  winnerName,
  durationMin,
  gameMvpNick,
  kills,
  teamAName,
  teamBName,
  blocks,
  playersById,
}: GameDetailsCardProps) {
  return (
    <Card className="p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-display text-lg font-bold tracking-wide">Jogo {gameIndex}</p>
          <p className="mt-1 text-sm text-muted">
            Vencedor: <span className="text-text">{winnerName}</span> • MVP:{" "}
            <span className="text-text">{gameMvpNick ?? "—"}</span>
            {typeof durationMin === "number" ? (
              <>
                {" "}
                • Duração: <span className="text-text">{durationMin} min</span>
              </>
            ) : null}
          </p>
        </div>
        <div className="w-full rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-sm sm:w-auto">
          <div className="grid grid-cols-[minmax(0,1fr)_auto_auto_auto_minmax(0,1fr)] items-center gap-x-2">
            <span className="truncate text-right text-muted" title={teamAName}>
              {teamAName}
            </span>
            <span className="font-semibold">{kills.teamAKills}</span>
            <span className="text-muted">x</span>
            <span className="font-semibold">{kills.teamBKills}</span>
            <span className="truncate text-muted" title={teamBName}>
              {teamBName}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        {blocks.map((block) => (
          <div
            key={`${seriesId}-${gameIndex}-${block.teamName}`}
            className="min-w-0 overflow-hidden rounded-2xl border border-white/8 bg-white/[0.015] p-3"
          >
            <p className="mb-2 text-xs uppercase tracking-[0.14em] text-muted">{block.teamName}</p>
            <div className="max-w-full overflow-x-auto pb-1 scrollbar-thin">
              <Table className="min-w-[500px]">
                <TableHeader>
                  <TableRow>
                    <TableHeadCell className="min-w-[170px]">Jogador</TableHeadCell>
                    <TableHeadCell className="min-w-[96px]">
                      <span className="sm:hidden">Camp.</span>
                      <span className="hidden sm:inline">Campeão</span>
                    </TableHeadCell>
                    <TableHeadCell className="whitespace-nowrap">K/D/A</TableHeadCell>
                    <TableHeadCell className="whitespace-nowrap text-right">KDA</TableHeadCell>
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
                        <TableCell className="min-w-[170px]">
                          <Link
                            href={`/jogadores/${playersById.get(row.playerId)?.slug ?? row.playerId}`}
                            className="block break-all font-semibold hover:text-accent"
                          >
                            {row.playerNick}
                          </Link>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{row.champion || "—"}</TableCell>
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
}

export default async function PartidaDetalhePage({ params }: PartidaDetalhePageParams) {
  const { id } = await params;
  const { dataset, indexes } = await getServerDataset();
  const series = getSeriesById(dataset, id);

  if (!series) {
    notFound();
  }

  const teamA = indexes.teamsById.get(series.teamAId) ?? null;
  const teamB = indexes.teamsById.get(series.teamBId) ?? null;
  const score = getSeriesScore(series, dataset);
  const winnerTeamId = getSeriesWinnerTeamId(series, dataset);
  const winnerTeam = winnerTeamId ? indexes.teamsById.get(winnerTeamId) ?? null : null;
  const isWalkover = isWalkoverSeries(series);
  const seriesMvp = getSeriesMvp(series, dataset);
  const seriesMvpNick = seriesMvp ? indexes.playersById.get(seriesMvp.playerId)?.nick ?? seriesMvp.playerId : null;
  const seriesKillTotals = getSeriesTeamKillTotals(series, dataset);
  const gameRows = getSeriesGamesWithTeamRows(series, dataset);
  const identity: SeriesIdentity = {
    teamA,
    teamB,
    stageLabel: getSeriesStageLabel(series),
    seriesFormatLabel: getSeriesFormatLabel(series, dataset),
    isGrandFinal: isGrandFinalStage(series.stage),
  };
  const finalScore =
    winnerTeamId === null ? null : getWinnerScore(score, winnerTeamId, series.teamAId);
  const finalSummaryText = getFinalSummaryText(isWalkover, seriesMvpNick);
  const title = `${teamA?.name ?? series.teamAId} ${score.teamAWins}–${score.teamBWins} ${teamB?.name ?? series.teamBId}`;
  const description = `${identity.stageLabel} • ${identity.seriesFormatLabel} • Série ${series.id} • ${formatDateLabel(series.date)}`;

  return (
    <PageShell className="space-y-6">
      <PageHero
        badge={identity.isGrandFinal ? "Grande Final" : "Detalhe da Série"}
        title={title}
        description={description}
        extra={
          <SeriesExtraBadges
            identity={identity}
            winnerTeam={winnerTeam}
            winnerTeamId={winnerTeamId}
            isWalkover={isWalkover}
            seriesMvpNick={seriesMvpNick}
          />
        }
      />

      {identity.isGrandFinal && winnerTeam && finalScore ? (
        <FinalChampionPanel
          winnerTeam={winnerTeam}
          identity={identity}
          championWins={finalScore.championWins}
          runnerUpWins={finalScore.runnerUpWins}
          finalSummaryText={finalSummaryText}
          date={series.date}
        />
      ) : null}

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

        <QuickLinksCard teamA={teamA} teamB={teamB} />
      </section>

      <section className="space-y-4">
        {gameRows.length === 0 ? (
          <Card className="p-5 text-sm text-muted">
            {getEmptyGamesText(isWalkover, series.walkoverReason)}
          </Card>
        ) : (
          gameRows.map(({ game, gameIndex, teamARows, teamBRows }) => {
            const winnerName = indexes.teamsById.get(game.winnerTeamId)?.name ?? game.winnerTeamId;
            const gameMvpPlayerId = getGameMvpPlayerId(game);
            const gameMvpNick = indexes.playersById.get(gameMvpPlayerId)?.nick ?? gameMvpPlayerId;
            const kills = getGameTeamKills(game, series, dataset);

            return (
              <GameDetailsCard
                key={`${series.id}-g${gameIndex}`}
                seriesId={series.id}
                gameIndex={gameIndex}
                winnerName={winnerName}
                durationMin={game.durationMin}
                gameMvpNick={gameMvpNick}
                kills={kills}
                teamAName={teamA?.name ?? series.teamAId}
                teamBName={teamB?.name ?? series.teamBId}
                blocks={[
                  { teamName: teamA?.name ?? series.teamAId, rows: teamARows },
                  { teamName: teamB?.name ?? series.teamBId, rows: teamBRows },
                ]}
                playersById={indexes.playersById}
              />
            );
          })
        )}
      </section>
    </PageShell>
  );
}

