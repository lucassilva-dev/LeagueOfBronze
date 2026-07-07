import Link from "next/link";
import { ArrowRight, Crown } from "lucide-react";

import { AnimatedCounter } from "@/components/ui/animated-counter";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatDateLabel } from "@/lib/format";
import type { Player, Team } from "@/lib/schema";
import type { ChampionshipResult } from "@/types/domain";

type ChampionshipHeroData = Readonly<{
  championTeam: Team;
  runnerUpTeamName: string;
  championWins: number;
  runnerUpWins: number;
  resultSuffix: string;
  championship: ChampionshipResult;
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

function getChampionshipResultSuffix(
  championship: ChampionshipResult,
  playersById: Map<string, Player>,
) {
  if (championship.summary.isWalkover) {
    return " Série encerrada por W.O.";
  }

  const finalMvpNick = championship.summary.mvp
    ? playersById.get(championship.summary.mvp.playerId)?.nick
    : undefined;

  return finalMvpNick ? ` MVP da final: ${finalMvpNick}.` : "";
}

function getChampionshipHeroData(
  championship: ChampionshipResult | null,
  teamsById: Map<string, Team>,
  playersById: Map<string, Player>,
): ChampionshipHeroData | null {
  if (!championship) return null;

  const championTeam = teamsById.get(championship.championTeamId);
  if (!championTeam) return null;

  const score = getFinalScore(championship);
  const runnerUpTeamName =
    teamsById.get(championship.runnerUpTeamId)?.name ?? championship.runnerUpTeamId;

  return {
    championTeam,
    runnerUpTeamName,
    championWins: score.championWins,
    runnerUpWins: score.runnerUpWins,
    resultSuffix: getChampionshipResultSuffix(championship, playersById),
    championship,
  };
}

export function ChampionshipHero({
  championship,
  teamsById,
  playersById,
}: Readonly<{
  championship: ChampionshipResult | null;
  teamsById: Map<string, Team>;
  playersById: Map<string, Player>;
}>) {
  const data = getChampionshipHeroData(championship, teamsById, playersById);
  if (!data) return null;

  return (
    <section>
      <Card className="champion-panel champion-glow overflow-hidden p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="bronze">Campeão definido</Badge>
              <Badge variant="outline">{data.championship.summary.formatLabel}</Badge>
              <Badge variant="outline">
                {formatDateLabel(data.championship.summary.series.date)}
              </Badge>
            </div>

            <div className="mt-4 flex items-start gap-3">
              <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-accent2/25 bg-accent2/10 text-accent2">
                <Crown className="h-6 w-6" />
              </span>
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-accent2/80">
                  Título do campeonato
                </p>
                <h2 className="mt-1 font-heading text-3xl font-bold tracking-tight sm:text-4xl">
                  {data.championTeam.name}
                </h2>
                <p className="mt-2 max-w-2xl text-sm text-text/75 sm:text-base">
                  Confirmou o título na grande final contra {data.runnerUpTeamName} por{" "}
                  {data.championWins}-{data.runnerUpWins}.{data.resultSuffix}
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:w-[22rem]">
            <div className="rounded-2xl border border-accent2/20 bg-bg/40 p-4 text-center">
              <p className="text-xs uppercase tracking-[0.16em] text-muted">Placar da final</p>
              <p className="mt-2 font-display text-5xl tracking-wide text-accent2">
                <AnimatedCounter to={data.championWins} />
                <span className="mx-2 text-white/35">-</span>
                <AnimatedCounter to={data.runnerUpWins} />
              </p>
              <p className="mt-1 text-xs text-muted">{data.championship.summary.stageLabel}</p>
            </div>

            <div className="flex flex-col justify-between rounded-2xl border border-border/60 bg-bg/40 p-4">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-muted">Acessos rápidos</p>
                <p className="mt-2 text-sm text-text/75">
                  Abra o campeão ou veja o detalhe completo da grande final.
                </p>
              </div>
              <div className="mt-4 space-y-2">
                <Link
                  href={`/times/${data.championTeam.slug}`}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-accent2 transition hover:text-text"
                >
                  Ver time campeão
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href={`/partidas/${data.championship.summary.series.id}`}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-accent transition hover:text-text"
                >
                  Abrir grande final
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </section>
  );
}
