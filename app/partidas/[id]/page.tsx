import Link from "next/link";
import { notFound } from "next/navigation";
import { Crown } from "lucide-react";

import { PageHero } from "@/components/page-hero";
import { PageShell } from "@/components/page-shell";
import { TeamLink } from "@/components/team-link";
import { AnimatedCounter } from "@/components/ui/animated-counter";
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
import { ChampionIcon } from "@/components/champion-icon";
import { SeriesLiveDraw } from "@/components/series-live-draw";
import { formatKda, formatSeriesDateLabel } from "@/lib/format";
import type { Messages } from "@/lib/i18n/messages";
import { getMessages } from "@/lib/i18n/server";
import { getServerDataset } from "@/lib/server-data";
import {
  getGameMvpPlayerId,
  getGameTeamKills,
  getSeriesById,
  getSeriesFormatLabel,
  getSeriesGamesWithTeamRows,
  getSeriesMvp,
  getSeriesScore,
  getSeriesTeamKillTotals,
  getSeriesWinnerTeamId,
  isWalkoverSeries,
} from "@/lib/tournament";
import type { Player, Team } from "@/lib/schema";

export const dynamic = "force-dynamic";

/** Textos desta página no idioma da requisição. */
type Textos = Messages["paginasCompeticao"];

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
  textos: Textos;
}>;
type FinalChampionPanelProps = Readonly<{
  winnerTeam: Team;
  identity: SeriesIdentity;
  championWins: number;
  runnerUpWins: number;
  finalSummaryText: string;
  date: string;
  textos: Textos;
  localeTag: string;
}>;
type QuickLinksCardProps = Readonly<{
  teamA: Team | null;
  teamB: Team | null;
  textos: Textos;
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
  textos: Textos;
  /** Idioma para os números: sem ele o KDA saía com vírgula decimal no site em inglês. */
  localeTag: string;
}>;

function isGrandFinalStage(stage: string | undefined) {
  return (stage ?? "REGULAR_SEASON") === "FINAL";
}

/** Rótulo da fase no idioma da requisição (o helper do lib devolve só em português). */
function stageLabelTraduzido(stage: string | undefined, textos: Textos) {
  const atual = stage ?? "REGULAR_SEASON";
  if (atual === "SEMIFINAL") return textos.faseSemifinal;
  if (atual === "FINAL") return textos.faseFinal;
  return textos.faseRegular;
}

/** MD3/MD5 vindos do lib viram Bo3/Bo5 em inglês. */
function formatLabelTraduzido(formatLabel: string, textos: Textos) {
  return formatLabel === "MD5" ? textos.formatoBo5 : textos.formatoBo3;
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

function getSeriesStatusText(isWalkover: boolean, hasWinner: boolean, textos: Textos) {
  if (isWalkover) return textos.detalheStatusWo;
  if (hasWinner) return textos.detalheStatusFinalizada;
  return textos.detalheStatusEmAndamento;
}

function getSeriesMvpLabel(
  isWalkover: boolean,
  winnerTeamName: string | null,
  seriesMvpNick: string | null,
  textos: Textos,
) {
  if (isWalkover) {
    return {
      variant: "accent" as const,
      text: `${textos.detalheVencedorWo} ${winnerTeamName ?? textos.vazio}`,
    };
  }

  if (seriesMvpNick) {
    return {
      variant: "accent" as const,
      text: `${textos.detalheMvpSerie} ${seriesMvpNick}`,
    };
  }

  return {
    variant: "muted" as const,
    text: `${textos.detalheMvpSerie} ${textos.vazio}`,
  };
}

function getFinalSummaryText(isWalkover: boolean, seriesMvpNick: string | null, textos: Textos) {
  if (isWalkover) return textos.detalheResultadoWo;
  if (seriesMvpNick) return `${textos.detalheMvpFinal} ${seriesMvpNick}.`;
  return "";
}

function getEmptyGamesText(isWalkover: boolean, walkoverReason: string | undefined, textos: Textos) {
  if (!isWalkover) return textos.detalheSemJogos;
  const reasonText = walkoverReason ? ` ${walkoverReason}` : "";
  return `${textos.detalheEncerradaWo}${reasonText}`;
}

function SeriesExtraBadges({
  identity,
  winnerTeam,
  winnerTeamId,
  isWalkover,
  seriesMvpNick,
  textos,
}: SeriesExtraBadgesProps) {
  const mvpLabel = getSeriesMvpLabel(
    isWalkover,
    winnerTeam?.name ?? winnerTeamId ?? null,
    seriesMvpNick,
    textos,
  );
  const hasWinner = Boolean(winnerTeamId);

  return (
    <div className="flex flex-wrap gap-2">
      <Badge variant="outline">{identity.seriesFormatLabel}</Badge>
      <Badge
        variant="muted"
        className={
          identity.isGrandFinal ? "border-accent2/20 bg-accent2/10 text-accent2" : undefined
        }
      >
        {identity.stageLabel}
      </Badge>
      <Badge variant={hasWinner ? "success" : "muted"}>
        {getSeriesStatusText(isWalkover, hasWinner, textos)}
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
  textos,
  localeTag,
}: FinalChampionPanelProps) {
  return (
    <section>
      <Card className="champion-panel champion-glow overflow-hidden p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="bronze">{textos.detalheCampeaoBadge}</Badge>
              <Badge variant="outline">{identity.seriesFormatLabel}</Badge>
              <Badge variant="outline">{formatSeriesDateLabel(date, localeTag)}</Badge>
            </div>

            <div className="mt-4 flex items-start gap-3">
              <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-accent2/25 bg-accent2/10 text-accent2">
                <Crown className="h-6 w-6" />
              </span>
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-accent2/80">
                  {textos.detalheTituloConfirmado}
                </p>
                <h2 className="mt-1 font-heading text-2xl font-bold tracking-tight sm:text-3xl">
                  {winnerTeam.name}
                </h2>
                <p className="mt-2 text-sm text-text/75 sm:text-base">
                  {textos.detalheFechouFinalAntes}
                  {championWins}-{runnerUpWins}.
                  {finalSummaryText ? ` ${finalSummaryText}` : ""}
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:w-[22rem]">
            <div className="rounded-2xl border border-accent2/20 bg-bg/40 p-4 text-center">
              <p className="text-xs uppercase tracking-[0.16em] text-muted">{textos.detalhePlacarFinal}</p>
              <p className="mt-2 font-display text-5xl tracking-wide text-accent2">
                <AnimatedCounter to={championWins} />
                <span className="mx-2 text-white/35">-</span>
                <AnimatedCounter to={runnerUpWins} />
              </p>
              <p className="mt-1 text-xs text-muted">{identity.stageLabel}</p>
            </div>

            <div className="flex flex-col justify-between rounded-2xl border border-border/60 bg-bg/40 p-4">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-muted">{textos.detalheTimeCampeao}</p>
                <p className="mt-2 text-sm text-text/75">
                  {textos.detalheTimeCampeaoTexto}
                </p>
              </div>
              <Link
                href={`/times/${winnerTeam.slug}`}
                className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-accent2 transition hover:text-text"
              >
                {textos.detalheVerTimeCampeao}
              </Link>
            </div>
          </div>
        </div>
      </Card>
    </section>
  );
}

function QuickLinksCard({ teamA, teamB, textos }: QuickLinksCardProps) {
  return (
    <Card className="p-5">
      <p className="text-xs uppercase tracking-[0.14em] text-muted">{textos.detalheLinksRapidos}</p>
      <div className="mt-3 grid gap-2">
        {teamA ? <TeamLink href={`/times/${teamA.slug}`} name={`${textos.detalheVerTime} ${teamA.name}`} /> : null}
        {teamB ? <TeamLink href={`/times/${teamB.slug}`} name={`${textos.detalheVerTime} ${teamB.name}`} /> : null}
        <Link href="/partidas" className="font-semibold text-accent hover:underline">
          {textos.detalheVoltarPartidas}
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
  textos,
  localeTag,
}: GameDetailsCardProps) {
  return (
    <Card className="p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-heading text-lg font-semibold tracking-wide">
            {textos.detalheJogo} {gameIndex}
          </p>
          <p className="mt-1 text-sm text-muted">
            {textos.detalheVencedor} <span className="text-text">{winnerName}</span> •{" "}
            {textos.detalheMvp} <span className="text-text">{gameMvpNick ?? textos.vazio}</span>
            {typeof durationMin === "number" ? (
              <>
                {" "}
                • {textos.detalheDuracao}{" "}
                <span className="text-text">
                  {durationMin} {textos.detalheMinutos}
                </span>
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
                    <TableHeadCell className="min-w-[170px]">{textos.detalheColJogador}</TableHeadCell>
                    <TableHeadCell className="min-w-[96px]">
                      <span className="sm:hidden">{textos.detalheColCampeaoCurto}</span>
                      <span className="hidden sm:inline">{textos.detalheColCampeao}</span>
                    </TableHeadCell>
                    <TableHeadCell className="whitespace-nowrap">{textos.detalheColKda}</TableHeadCell>
                    <TableHeadCell className="whitespace-nowrap text-right">{textos.detalheColKdaMedia}</TableHeadCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {block.rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-muted">
                        {textos.detalheSemEstatisticas}
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
                        <TableCell className="whitespace-nowrap">
                          <ChampionIcon champion={row.champion} size={22} showName />
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {row.kills}/{row.deaths}/{row.assists}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-right">
                          {formatKda((row.kills + row.assists) / Math.max(1, row.deaths), localeTag)}
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
  const t = await getMessages();
  const textos = t.paginasCompeticao;
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
    stageLabel: stageLabelTraduzido(series.stage, textos),
    seriesFormatLabel: formatLabelTraduzido(getSeriesFormatLabel(series, dataset), textos),
    isGrandFinal: isGrandFinalStage(series.stage),
  };
  const finalScore =
    winnerTeamId === null ? null : getWinnerScore(score, winnerTeamId, series.teamAId);
  const finalSummaryText = getFinalSummaryText(isWalkover, seriesMvpNick, textos);
  const title = `${teamA?.name ?? series.teamAId} ${score.teamAWins}–${score.teamBWins} ${teamB?.name ?? series.teamBId}`;
  const description = `${identity.stageLabel} • ${identity.seriesFormatLabel} • ${textos.detalheSerieRotulo} ${series.id} • ${formatSeriesDateLabel(series.date, t.compartilhados.localeTag)}`;

  return (
    <PageShell className="space-y-6">
      <PageHero
        badge={identity.isGrandFinal ? textos.detalheBadgeGrandeFinal : textos.detalheBadgeSerie}
        title={title}
        description={description}
        extra={
          <SeriesExtraBadges
            identity={identity}
            winnerTeam={winnerTeam}
            winnerTeamId={winnerTeamId}
            isWalkover={isWalkover}
            seriesMvpNick={seriesMvpNick}
            textos={textos}
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
          textos={textos}
          localeTag={t.compartilhados.localeTag}
        />
      ) : null}

      <SeriesLiveDraw
        seriesId={series.id}
        teamA={teamA}
        teamB={teamB}
        initialCards={series.cardsUsed ?? []}
        initialBlueSideTeamId={series.blueSideTeamId ?? null}
        initialUltimoCarta={
          [...(series.sorteios ?? [])]
            .reverse()
            .find((s) => s.tipo === "carta" || s.tipo === "carta_manual") ?? null
        }
        textos={t.compartilhados}
        nomesCartas={Object.fromEntries(
          Object.entries(t.paginasStats.cartas).map(([id, carta]) => [id, carta.nome]),
        )}
      />

      <section className="grid gap-4 md:grid-cols-2">
        <Card className="p-5">
          <p className="text-xs uppercase tracking-[0.14em] text-muted">{textos.detalheAbatesPorTime}</p>
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

        <QuickLinksCard teamA={teamA} teamB={teamB} textos={textos} />
      </section>

      <section className="space-y-4">
        {gameRows.length === 0 ? (
          <Card className="p-5 text-sm text-muted">
            {getEmptyGamesText(isWalkover, series.walkoverReason, textos)}
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
                localeTag={t.compartilhados.localeTag}
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
                textos={textos}
              />
            );
          })
        )}
      </section>
    </PageShell>
  );
}

