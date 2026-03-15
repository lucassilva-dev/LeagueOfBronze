import Link from "next/link";
import { ArrowRight, Crown } from "lucide-react";

import type { Player, Team } from "@/lib/schema";
import type { SeriesSummary } from "@/types/domain";
import { formatDateLabel } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

type SeriesSummaryCardProps = Readonly<{
  summary: SeriesSummary;
  teamsById: Map<string, Team>;
  playersById: Map<string, Player>;
}>;

function isGrandFinal(summary: SeriesSummary) {
  return (summary.series.stage ?? "REGULAR_SEASON") === "FINAL";
}

function hasChampion(summary: SeriesSummary) {
  return isGrandFinal(summary) && summary.isComplete && Boolean(summary.winnerTeamId);
}

function getStatusLabel(summary: SeriesSummary) {
  if (isGrandFinal(summary)) return "Grande Final";
  if (summary.isWalkover) return "W.O.";
  if (summary.isComplete) return "Finalizada";
  return "Em andamento";
}

function getStatusClassName(summary: SeriesSummary) {
  if (!isGrandFinal(summary)) return undefined;
  return "border-amber-300/30 bg-amber-300/15 text-amber-100";
}

function getScoreLabel(summary: SeriesSummary) {
  return summary.isWalkover ? `${summary.formatLabel} por W.O.` : `Série ${summary.formatLabel}`;
}

function getWinnerTeamName(summary: SeriesSummary, teamsById: Map<string, Team>) {
  if (!summary.winnerTeamId) return undefined;
  return teamsById.get(summary.winnerTeamId)?.name;
}

function getMvpPlayerNick(summary: SeriesSummary, playersById: Map<string, Player>) {
  if (!summary.mvp) return undefined;
  return playersById.get(summary.mvp.playerId)?.nick;
}

function MetaLine({
  summary,
  winnerTeamName,
  mvpPlayerNick,
}: Readonly<{
  summary: SeriesSummary;
  winnerTeamName: string | undefined;
  mvpPlayerNick: string | undefined;
}>) {
  if (hasChampion(summary)) {
    return (
      <>
        <span className="inline-flex items-center gap-1 font-semibold text-amber-100">
          <Crown className="h-3.5 w-3.5" />
          Campeão: {winnerTeamName ?? summary.winnerTeamId}
        </span>
        {mvpPlayerNick ? <span>MVP da final: {mvpPlayerNick}</span> : null}
      </>
    );
  }

  if (summary.isWalkover) {
    return (
      <span>
        Vitória por W.O.
        {summary.series.walkoverReason ? ` ${summary.series.walkoverReason}` : ""}
      </span>
    );
  }

  return <span>MVP da série: {mvpPlayerNick ?? "—"}</span>;
}

export function SeriesSummaryCard({
  summary,
  teamsById,
  playersById,
}: SeriesSummaryCardProps) {
  const teamA = teamsById.get(summary.series.teamAId);
  const teamB = teamsById.get(summary.series.teamBId);
  const winnerTeamName = getWinnerTeamName(summary, teamsById);
  const mvpPlayerNick = getMvpPlayerNick(summary, playersById);
  const grandFinal = isGrandFinal(summary);
  const champion = hasChampion(summary);

  return (
    <Link href={`/partidas/${summary.series.id}`} className="block">
      <Card
        className={cn(
          "group p-4 transition hover:-translate-y-0.5 hover:shadow-glow-strong",
          grandFinal && "final-card",
          champion && "champion-glow",
        )}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant={summary.isComplete ? "success" : "muted"}
                className={getStatusClassName(summary)}
              >
                {getStatusLabel(summary)}
              </Badge>
              <span className="text-xs text-muted">{formatDateLabel(summary.series.date)}</span>
              <span
                className={cn("text-xs text-muted", grandFinal && "font-semibold text-amber-100/80")}
              >
                {summary.stageLabel}
              </span>
            </div>

            <p className="mt-2 line-clamp-2 font-semibold">
              {teamA?.name ?? summary.series.teamAId} <span className="mx-1 text-muted">vs</span>{" "}
              {teamB?.name ?? summary.series.teamBId}
            </p>

            <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
              <MetaLine
                summary={summary}
                winnerTeamName={winnerTeamName}
                mvpPlayerNick={mvpPlayerNick}
              />
            </p>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-center">
            <div
              className={cn(
                "rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-2 text-center",
                grandFinal && "border-amber-300/20 bg-amber-300/[0.07]",
              )}
            >
              <p
                className={cn(
                  "font-display text-2xl font-bold tracking-wide text-accent",
                  grandFinal && "text-amber-100",
                )}
              >
                {summary.score.teamAWins} <span className="text-muted">-</span>{" "}
                {summary.score.teamBWins}
              </p>
              <p className="text-[10px] uppercase tracking-[0.16em] text-muted">
                {getScoreLabel(summary)}
              </p>
            </div>
            <ArrowRight
              className={cn(
                "h-4 w-4 text-muted transition group-hover:text-accent",
                grandFinal && "text-amber-100/70 group-hover:text-amber-100",
              )}
            />
          </div>
        </div>
      </Card>
    </Link>
  );
}
