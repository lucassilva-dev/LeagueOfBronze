import Link from "next/link";
import { ArrowRight, Crown } from "lucide-react";

import { AnimatedCounter } from "@/components/ui/animated-counter";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatDateLabel } from "@/lib/format";
import { compartilhados, formatoLabel, faseLabel } from "@/lib/i18n/messages/compartilhados";
import type { Player, Team } from "@/lib/schema";
import type { ChampionshipResult } from "@/types/domain";

/** Textos do painel. Opcional: sem eles o painel fica em português (padrão do site). */
type TextosHero = (typeof compartilhados)["pt"];

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
  t: TextosHero,
) {
  if (championship.summary.isWalkover) {
    return t.heroEncerradaWalkover;
  }

  const finalMvpNick = championship.summary.mvp
    ? playersById.get(championship.summary.mvp.playerId)?.nick
    : undefined;

  return finalMvpNick ? ` ${t.heroMvpFinal} ${finalMvpNick}.` : "";
}

function getChampionshipHeroData(
  championship: ChampionshipResult | null,
  teamsById: Map<string, Team>,
  playersById: Map<string, Player>,
  t: TextosHero,
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
    resultSuffix: getChampionshipResultSuffix(championship, playersById, t),
    championship,
  };
}

export function ChampionshipHero({
  championship,
  teamsById,
  playersById,
  championTeamHref,
  grandFinalHref,
  textos: t = compartilhados.pt,
}: Readonly<{
  championship: ChampionshipResult | null;
  teamsById: Map<string, Team>;
  playersById: Map<string, Player>;
  // Sobrescreve os destinos dos atalhos (usado nas temporadas arquivadas, cujos
  // dados não vivem nas rotas do campeonato ativo).
  championTeamHref?: string;
  grandFinalHref?: string;
  textos?: TextosHero;
}>) {
  const data = getChampionshipHeroData(championship, teamsById, playersById, t);
  if (!data) return null;

  const championHref = championTeamHref ?? `/times/${data.championTeam.slug}`;
  const finalHref = grandFinalHref ?? `/partidas/${data.championship.summary.series.id}`;

  return (
    <section>
      <Card className="champion-panel champion-glow overflow-hidden p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="bronze">{t.heroCampeaoDefinido}</Badge>
              <Badge variant="outline">
                {formatoLabel(t, data.championship.summary.formatLabel)}
              </Badge>
              <Badge variant="outline">
                {formatDateLabel(data.championship.summary.series.date, undefined, t.localeTag)}
              </Badge>
            </div>

            <div className="mt-4 flex items-start gap-3">
              <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-accent2/25 bg-accent2/10 text-accent2">
                <Crown className="h-6 w-6" />
              </span>
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-accent2/80">
                  {t.heroTituloCampeonato}
                </p>
                <h2 className="mt-1 font-heading text-3xl font-bold tracking-tight sm:text-4xl">
                  {data.championTeam.name}
                </h2>
                <p className="mt-2 max-w-2xl text-sm text-text/75 sm:text-base">
                  {t.heroConfirmouTitulo} {data.runnerUpTeamName} {t.heroPor}{" "}
                  {data.championWins}-{data.runnerUpWins}.{data.resultSuffix}
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:w-[22rem]">
            <div className="rounded-2xl border border-accent2/20 bg-bg/40 p-4 text-center">
              <p className="text-xs uppercase tracking-[0.16em] text-muted">{t.heroPlacarFinal}</p>
              <p className="mt-2 font-display text-5xl tracking-wide text-accent2">
                <AnimatedCounter to={data.championWins} />
                <span className="mx-2 text-white/35">-</span>
                <AnimatedCounter to={data.runnerUpWins} />
              </p>
              <p className="mt-1 text-xs text-muted">
                {faseLabel(t, data.championship.summary.stageLabel)}
              </p>
            </div>

            <div className="flex flex-col justify-between rounded-2xl border border-border/60 bg-bg/40 p-4">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-muted">
                  {t.heroAcessosRapidos}
                </p>
                <p className="mt-2 text-sm text-text/75">{t.heroAcessosRapidosDescricao}</p>
              </div>
              <div className="mt-4 space-y-2">
                <Link
                  href={championHref}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-accent2 transition hover:text-text"
                >
                  {t.heroVerTimeCampeao}
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href={finalHref}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-accent transition hover:text-text"
                >
                  {t.heroAbrirGrandeFinal}
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
