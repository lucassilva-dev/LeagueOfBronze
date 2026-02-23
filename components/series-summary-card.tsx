import Link from "next/link";
import { ArrowRight } from "lucide-react";

import type { Player, Team } from "@/lib/schema";
import type { SeriesSummary } from "@/types/domain";
import { formatDateLabel } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export function SeriesSummaryCard({
  summary,
  teamsById,
  playersById,
}: {
  summary: SeriesSummary;
  teamsById: Map<string, Team>;
  playersById: Map<string, Player>;
}) {
  const teamA = teamsById.get(summary.series.teamAId);
  const teamB = teamsById.get(summary.series.teamBId);
  const mvpPlayer = summary.mvp ? playersById.get(summary.mvp.playerId) : null;

  return (
    <Link href={`/partidas/${summary.series.id}`} className="block">
      <Card className="group p-4 transition hover:-translate-y-0.5 hover:shadow-glow-strong">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={summary.isComplete ? "success" : "muted"}>
                {summary.isComplete ? "Finalizada" : "Em andamento"}
              </Badge>
              <span className="text-xs text-muted">
                {formatDateLabel(summary.series.date)}
              </span>
            </div>
            <p className="mt-2 line-clamp-2 font-semibold">
              {teamA?.name ?? summary.series.teamAId}{" "}
              <span className="mx-1 text-muted">vs</span>{" "}
              {teamB?.name ?? summary.series.teamBId}
            </p>
            <p className="mt-1 text-xs text-muted">
              {mvpPlayer ? `MVP da série: ${mvpPlayer.nick}` : "MVP da série: —"}
            </p>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-center">
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-2 text-center">
              <p className="font-display text-2xl font-bold tracking-wide text-accent">
                {summary.score.teamAWins} <span className="text-muted">-</span>{" "}
                {summary.score.teamBWins}
              </p>
              <p className="text-[10px] uppercase tracking-[0.16em] text-muted">
                Série MD3
              </p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted transition group-hover:text-accent" />
          </div>
        </div>
      </Card>
    </Link>
  );
}
