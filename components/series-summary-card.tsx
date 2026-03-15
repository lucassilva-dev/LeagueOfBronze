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

export function SeriesSummaryCard({
  summary,
  teamsById,
  playersById,
}: SeriesSummaryCardProps) {
  const teamA = teamsById.get(summary.series.teamAId);
  const teamB = teamsById.get(summary.series.teamBId);
  const winnerTeam = summary.winnerTeamId ? teamsById.get(summary.winnerTeamId) : null;
  const mvpPlayer = summary.mvp ? playersById.get(summary.mvp.playerId) : null;
  const isGrandFinal = (summary.series.stage ?? "REGULAR_SEASON") === "FINAL";
  const hasChampion = isGrandFinal && summary.isComplete && Boolean(summary.winnerTeamId);

  return (
    <Link href={`/partidas/${summary.series.id}`} className="block">
      <Card
        className={cn(
          "group p-4 transition hover:-translate-y-0.5 hover:shadow-glow-strong",
          isGrandFinal && "final-card",
          hasChampion && "champion-glow",
        )}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant={summary.isComplete ? "success" : "muted"}
                className={
                  isGrandFinal
                    ? "border-amber-300/30 bg-amber-300/15 text-amber-100"
                    : undefined
                }
              >
                {isGrandFinal
                  ? "Grande Final"
                  : summary.isWalkover
                    ? "W.O."
                    : summary.isComplete
                      ? "Finalizada"
                      : "Em andamento"}
              </Badge>
              <span className="text-xs text-muted">{formatDateLabel(summary.series.date)}</span>
              <span
                className={cn(
                  "text-xs text-muted",
                  isGrandFinal && "font-semibold text-amber-100/80",
                )}
              >
                {summary.stageLabel}
              </span>
            </div>

            <p className="mt-2 line-clamp-2 font-semibold">
              {teamA?.name ?? summary.series.teamAId}{" "}
              <span className="mx-1 text-muted">vs</span>{" "}
              {teamB?.name ?? summary.series.teamBId}
            </p>

            <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
              {hasChampion ? (
                <>
                  <span className="inline-flex items-center gap-1 font-semibold text-amber-100">
                    <Crown className="h-3.5 w-3.5" />
                    Campe\u00e3o: {winnerTeam?.name ?? summary.winnerTeamId}
                  </span>
                  {mvpPlayer ? <span>MVP da final: {mvpPlayer.nick}</span> : null}
                </>
              ) : summary.isWalkover ? (
                <span>
                  Vit\u00f3ria por W.O.
                  {summary.series.walkoverReason ? ` ${summary.series.walkoverReason}` : ""}
                </span>
              ) : mvpPlayer ? (
                <span>MVP da s\u00e9rie: {mvpPlayer.nick}</span>
              ) : (
                <span>MVP da s\u00e9rie: \u2014</span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-center">
            <div
              className={cn(
                "rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-2 text-center",
                isGrandFinal && "border-amber-300/20 bg-amber-300/[0.07]",
              )}
            >
              <p
                className={cn(
                  "font-display text-2xl font-bold tracking-wide text-accent",
                  isGrandFinal && "text-amber-100",
                )}
              >
                {summary.score.teamAWins} <span className="text-muted">-</span>{" "}
                {summary.score.teamBWins}
              </p>
              <p className="text-[10px] uppercase tracking-[0.16em] text-muted">
                {summary.isWalkover
                  ? `${summary.formatLabel} por W.O.`
                  : `S\u00e9rie ${summary.formatLabel}`}
              </p>
            </div>
            <ArrowRight
              className={cn(
                "h-4 w-4 text-muted transition group-hover:text-accent",
                isGrandFinal && "text-amber-100/70 group-hover:text-amber-100",
              )}
            />
          </div>
        </div>
      </Card>
    </Link>
  );
}
