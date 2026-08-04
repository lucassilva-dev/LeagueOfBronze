import Link from "next/link";
import { ArrowRight, Crown } from "lucide-react";

import type { Player, Team } from "@/lib/schema";
import type { SeriesSummary } from "@/types/domain";
import { formatSeriesDateLabel, getSeriesTurnoLabel } from "@/lib/format";
import { getDisplayNick } from "@/lib/opgg";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { TeamCrest } from "@/components/team-crest";
import {
  compartilhados,
  faseLabel,
  formatoLabel,
  turnoLabel,
} from "@/lib/i18n/messages/compartilhados";

/** Textos do card. Opcional: sem eles o card fica em português (padrão do site). */
type TextosCard = (typeof compartilhados)["pt"];

type SeriesSummaryCardProps = Readonly<{
  summary: SeriesSummary;
  teamsById: Map<string, Team>;
  playersById: Map<string, Player>;
  readOnly?: boolean;
  // Destino do clique. Se omitido no modo normal, usa /partidas/{id}. No modo readOnly,
  // o card só vira link quando um href é informado (ex.: partida de temporada arquivada).
  href?: string;
  textos?: TextosCard;
}>;

function isGrandFinal(summary: SeriesSummary) {
  return (summary.series.stage ?? "REGULAR_SEASON") === "FINAL";
}

function hasChampion(summary: SeriesSummary) {
  return isGrandFinal(summary) && summary.isComplete && Boolean(summary.winnerTeamId);
}

function getStatusLabel(summary: SeriesSummary, t: TextosCard) {
  if (isGrandFinal(summary)) return t.serieGrandeFinal;
  if (summary.isWalkover) return t.serieWalkover;
  if (summary.isComplete) return t.serieFinalizada;
  return t.serieEmAndamento;
}

function getStatusClassName(summary: SeriesSummary) {
  if (!isGrandFinal(summary)) return undefined;
  return "border-accent2/30 bg-accent2/15 text-accent2";
}

function getScoreLabel(summary: SeriesSummary, t: TextosCard) {
  const formato = formatoLabel(t, summary.formatLabel);
  return summary.isWalkover
    ? `${formato} ${t.seriePlacarWalkover}`
    : `${t.seriePlacarPrefixo} ${formato}`;
}

function getWinnerTeamName(summary: SeriesSummary, teamsById: Map<string, Team>) {
  if (!summary.winnerTeamId) return undefined;
  return teamsById.get(summary.winnerTeamId)?.name;
}

function getMvpPlayerNick(summary: SeriesSummary, playersById: Map<string, Player>) {
  if (!summary.mvp) return undefined;
  const nick = playersById.get(summary.mvp.playerId)?.nick;
  return nick ? getDisplayNick(nick) : undefined;
}

function MetaLine({
  summary,
  winnerTeamName,
  mvpPlayerNick,
  t,
}: Readonly<{
  summary: SeriesSummary;
  winnerTeamName: string | undefined;
  mvpPlayerNick: string | undefined;
  t: TextosCard;
}>) {
  if (hasChampion(summary)) {
    return (
      <>
        <span className="inline-flex items-center gap-1 font-semibold text-accent2">
          <Crown className="h-3.5 w-3.5" />
          {t.serieCampeao} {winnerTeamName ?? summary.winnerTeamId}
        </span>
        {mvpPlayerNick ? (
          <span>
            {t.serieMvpFinal} {mvpPlayerNick}
          </span>
        ) : null}
      </>
    );
  }

  if (summary.isWalkover) {
    return (
      <span>
        {t.serieVitoriaWalkover}
        {summary.series.walkoverReason ? ` ${summary.series.walkoverReason}` : ""}
      </span>
    );
  }

  return (
    <span>
      {t.serieMvp} {mvpPlayerNick ?? "—"}
    </span>
  );
}

export function SeriesSummaryCard({
  summary,
  teamsById,
  playersById,
  readOnly = false,
  href,
  textos: t = compartilhados.pt,
}: SeriesSummaryCardProps) {
  const teamA = teamsById.get(summary.series.teamAId);
  const teamB = teamsById.get(summary.series.teamBId);
  const winnerTeamName = getWinnerTeamName(summary, teamsById);
  const mvpPlayerNick = getMvpPlayerNick(summary, playersById);
  const grandFinal = isGrandFinal(summary);
  const champion = hasChampion(summary);
  const turno = getSeriesTurnoLabel(summary.series.date);

  const body = (
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
                {getStatusLabel(summary, t)}
              </Badge>
              <span className="text-xs text-muted">
                {formatSeriesDateLabel(summary.series.date, t.localeTag)}
              </span>
              {turno ? (
                <Badge variant="outline" className="text-[10px]">
                  {turnoLabel(t, turno)}
                </Badge>
              ) : null}
              <span
                className={cn("text-xs text-muted", grandFinal && "font-semibold text-accent2/80")}
              >
                {faseLabel(t, summary.stageLabel)}
              </span>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 font-semibold">
              <span className="inline-flex items-center gap-1.5">
                {teamA ? <TeamCrest team={teamA} size={20} /> : null}
                {teamA?.name ?? summary.series.teamAId}
              </span>
              <span className="text-muted">vs</span>
              <span className="inline-flex items-center gap-1.5">
                {teamB ? <TeamCrest team={teamB} size={20} /> : null}
                {teamB?.name ?? summary.series.teamBId}
              </span>
            </div>

            <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
              <MetaLine
                summary={summary}
                winnerTeamName={winnerTeamName}
                mvpPlayerNick={mvpPlayerNick}
                t={t}
              />
            </p>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-center">
            <div
              className={cn(
                "rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-2 text-center",
                grandFinal && "border-accent2/20 bg-accent2/[0.07]",
              )}
            >
              <p
                className={cn(
                  "font-display text-2xl tracking-wide text-accent",
                  grandFinal && "text-accent2",
                )}
              >
                {summary.score.teamAWins} <span className="text-muted">-</span>{" "}
                {summary.score.teamBWins}
              </p>
              <p className="text-[10px] uppercase tracking-[0.16em] text-muted">
                {getScoreLabel(summary, t)}
              </p>
            </div>
            <ArrowRight
              className={cn(
                "h-4 w-4 text-muted transition group-hover:text-accent",
                grandFinal && "text-accent2/70 group-hover:text-accent2",
              )}
            />
          </div>
        </div>
      </Card>
  );

  const target = href ?? (readOnly ? null : `/partidas/${summary.series.id}`);

  if (!target) {
    return <div className="block">{body}</div>;
  }

  return (
    <Link href={target} className="block">
      {body}
    </Link>
  );
}
