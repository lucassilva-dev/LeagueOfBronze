"use client";

import { type CSSProperties, type ReactNode, useEffect, useMemo, useState } from "react";

import { SorteioAoVivo } from "@/components/admin/sorteio-ao-vivo";
import { AlertTriangle, Pencil, Plus, Trash2 } from "lucide-react";

import type {
  CardId,
  Player,
  PlayerGameStats,
  SeriesFormat,
  SeriesStage,
  SeriesMatch,
  TournamentDataset,
} from "@/lib/schema";
import {
  getKda,
  getSeriesFormat,
  getSeriesFormatLabel,
  getSeriesMaxGames,
  getSeriesScore,
  getSeriesStageLabel,
  getSeriesTargetWins,
  getSeriesWinnerTeamId,
  inferGameMvpPlayerId,
  isWalkoverSeries,
} from "@/lib/tournament";
import { formatDateLabel } from "@/lib/format";
import { resolveRole, teamColor } from "@/lib/design";
import {
  createBlankGame,
  createBlankSeries,
  createBlankStatsRow,
  slugifyValue,
  type MutateDraft,
} from "@/components/admin/shared";
import { CARD_OPTIONS, CARDS_BY_ID } from "@/lib/cards";
import { CHAMPIONS } from "@/lib/champions";
import {
  Banner,
  BlockTitle,
  Button,
  C,
  Card,
  Chip,
  Empty,
  Field,
  Input,
  ScrollX,
  SectionHead,
  Select,
  display,
  tabular,
} from "@/components/admin/ui";

/**
 * Painel de séries — a tela mais usada do admin: alguém pega o print do fim de partida e
 * lança o resultado.
 *
 * Desenho: LISTA à esquerda + EDITOR à direita. Antes as 16 séries vinham empilhadas, o que
 * obrigava a rolar a página inteira para achar o jogo do dia.
 *
 * O trabalho real acontece na grade de K/D/A, então ela ganhou cabeçalho de coluna visível,
 * números tabulares e o KDA calculado ao lado — dá para conferir o print sem sair do teclado.
 */

// ---------------------------------------------------------------- layout

/**
 * Regras que dependem de media query (não dá com estilo inline) e o realce de foco.
 * São classes próprias deste painel, não utilitárias do Tailwind.
 */
const CSS_PAINEL = `
.lob-series *:focus-visible{outline:2px solid ${C.bronzeHi};outline-offset:2px;border-radius:2px}
.lob-series-grid{display:grid;gap:16px;grid-template-columns:268px minmax(0,1fr);align-items:start}
.lob-series-lista{max-height:calc(100vh - 250px);min-height:180px;overflow-y:auto;overflow-x:hidden}
.lob-2col{display:grid;gap:12px;grid-template-columns:repeat(2,minmax(0,1fr))}
.lob-3col{display:grid;gap:12px;grid-template-columns:repeat(3,minmax(0,1fr))}
@media (max-width:1050px){
  .lob-series-grid{grid-template-columns:minmax(0,1fr)}
  .lob-series-lista{max-height:340px}
}
@media (max-width:640px){
  .lob-2col,.lob-3col{grid-template-columns:minmax(0,1fr)}
}
`;

/** Colunas da grade de estatísticas — usadas pelo cabeçalho E pelas linhas, para alinhar. */
const GRADE_STATS = "minmax(140px,1.6fr) minmax(120px,1.2fr) 54px 54px 54px 62px 42px";
const LARGURA_MIN_STATS = 620;
const GRADE_BANS = "minmax(120px,1fr) minmax(140px,1.3fr) 42px";

const soLeitores: CSSProperties = {
  position: "absolute",
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clipPath: "inset(50%)",
  whiteSpace: "nowrap",
  border: 0,
};

const caixaLeitura: CSSProperties = {
  padding: "9px 11px",
  fontSize: 13,
  color: C.ink2,
  background: "rgba(0,0,0,.20)",
  border: `1px dashed ${C.line}`,
  borderRadius: 3,
  wordBreak: "break-all",
};

// ---------------------------------------------------------------- helpers de leitura

function getTeamName(dataset: TournamentDataset, teamId: string) {
  return dataset.teams.find((team) => team.id === teamId)?.name ?? teamId ?? "—";
}

function getFormatOptionLabel(format: SeriesFormat) {
  return format === "BO5" ? "MD5" : "MD3";
}

function getStageOptionLabel(stage: SeriesStage) {
  if (stage === "SEMIFINAL") return "Semifinal";
  if (stage === "FINAL") return "Final";
  return "Fase regular";
}

function confirmBrowserAction(message: string) {
  return globalThis.confirm(message);
}

function getSeriesStateLabel(isWalkover: boolean, hasWinner: boolean) {
  if (isWalkover) return "W.O.";
  if (hasWinner) return "Finalizada";
  return "Em andamento";
}

/** Só dígitos: o campo é texto com teclado numérico, então limpamos o que vier colado. */
function soDigitos(value: string) {
  const limpo = value.replace(/[^0-9]/g, "");
  if (!limpo) return 0;
  const numero = Number(limpo);
  return Number.isFinite(numero) ? numero : 0;
}

/** Ordena o elenco por rota (TOP, SEL, MID, ADC, SUP) — a ordem em que o print mostra. */
function ordenarPorRota(players: Player[]) {
  return players
    .slice()
    .sort((a, b) => resolveRole(a.role1).order - resolveRole(b.role1).order || a.nick.localeCompare(b.nick, "pt-BR"));
}

function rotuloJogador(dataset: TournamentDataset, player: Player) {
  return `${resolveRole(player.role1).short} · ${player.nick} — ${getTeamName(dataset, player.teamId)}`;
}

function getDefaultSeriesSettings(format: SeriesFormat) {
  if (format === "BO5") {
    return { maxGames: 5, targetWins: 3, formatLabel: "MD5" };
  }

  return { maxGames: 3, targetWins: 2, formatLabel: "MD3" };
}

function getSelectedSeriesSettings(selectedSeries: SeriesMatch | null, draft: TournamentDataset) {
  const defaults = getDefaultSeriesSettings(draft.tournament.format);

  if (!selectedSeries) {
    return {
      isWalkover: false,
      format: draft.tournament.format,
      formatLabel: defaults.formatLabel,
      maxGames: defaults.maxGames,
      targetWins: defaults.targetWins,
    };
  }

  return {
    isWalkover: isWalkoverSeries(selectedSeries),
    format: getSeriesFormat(selectedSeries, draft),
    formatLabel: getSeriesFormatLabel(selectedSeries, draft),
    maxGames: getSeriesMaxGames(selectedSeries, draft),
    targetWins: getSeriesTargetWins(selectedSeries, draft),
  };
}

function getWalkoverSummaryText(
  dataset: TournamentDataset,
  winnerTeamId: string | undefined,
  targetWins: number,
  reason: string | undefined,
) {
  const teamName = getTeamName(dataset, winnerTeamId ?? "");
  const reasonLabel = reason ? ` • ${reason}` : "";
  return `Série encerrada por W.O. com placar automático de ${targetWins}-0 para ${teamName}${reasonLabel}`;
}

function getGamesSectionDescription(
  isWalkover: boolean,
  formatLabel: string,
  maxGames: number,
  targetWins: number,
) {
  if (isWalkover) {
    return "Série encerrada por W.O.; os jogos e stats ficam desabilitados.";
  }

  return `${formatLabel} com até ${maxGames} jogos. A série fecha quando um time alcançar ${targetWins} vitórias.`;
}

// ---------------------------------------------------------------- auditoria do rascunho

/**
 * #3 da auditoria: uma linha em branco derrubava o salvamento do painel inteiro com um erro
 * técnico por índice de array. Aqui o problema é detectado ANTES, com nome de série e número
 * de jogo, e a linha totalmente vazia (que nunca é intencional) pode ser descartada de uma vez.
 */
type EstadoLinha = "ok" | "vazia" | "incompleta" | "repetida" | "forasteira";

/** Linha sem jogador, sem campeão e sem número digitado: sobra de clique no "+ Linha". */
function isLinhaDescartavel(row: PlayerGameStats) {
  return (
    !row.playerId.trim() &&
    !(row.champion ?? "").trim() &&
    !row.kills &&
    !row.deaths &&
    !row.assists
  );
}

function getEstadosDasLinhas(rows: PlayerGameStats[], idsDoConfronto: Set<string>): EstadoLinha[] {
  const vistos = new Set<string>();

  return rows.map((row) => {
    if (isLinhaDescartavel(row)) return "vazia";

    const playerId = row.playerId.trim();
    const champion = (row.champion ?? "").trim();
    if (!playerId || !champion) return "incompleta";
    if (vistos.has(playerId)) return "repetida";

    vistos.add(playerId);
    if (idsDoConfronto.size > 0 && !idsDoConfronto.has(playerId)) return "forasteira";
    return "ok";
  });
}

type AuditoriaSerie = {
  bloqueios: string[];
  estadosPorJogo: EstadoLinha[][];
  jogosComProblema: number[];
  descartaveis: number;
};

function auditarSerie(series: SeriesMatch, draft: TournamentDataset): AuditoriaSerie {
  const bloqueios: string[] = [];
  const estadosPorJogo: EstadoLinha[][] = [];
  const jogosComProblema: number[] = [];
  let descartaveis = 0;

  if (!series.teamAId || !series.teamBId) {
    bloqueios.push("Falta escolher o Time A e/ou o Time B.");
  } else if (series.teamAId === series.teamBId) {
    bloqueios.push("Time A e Time B são o mesmo time.");
  }

  if (isWalkoverSeries(series)) {
    return { bloqueios, estadosPorJogo, jogosComProblema, descartaveis };
  }

  const maxGames = getSeriesMaxGames(series, draft);
  if (series.games.length > maxGames) {
    bloqueios.push(
      `${getSeriesFormatLabel(series, draft)} aceita no máximo ${maxGames} jogos (esta série tem ${series.games.length}).`,
    );
  }

  const nomeA = getTeamName(draft, series.teamAId);
  const nomeB = getTeamName(draft, series.teamBId);
  const idsDoConfronto = new Set(
    draft.players
      .filter((player) => player.teamId === series.teamAId || player.teamId === series.teamBId)
      .map((player) => player.id),
  );

  series.games.forEach((game, gameIndex) => {
    const estados = getEstadosDasLinhas(game.statsByPlayer, idsDoConfronto);
    estadosPorJogo.push(estados);
    descartaveis += estados.filter((estado) => estado === "vazia").length;

    let temProblema = false;
    const jogo = `Jogo ${gameIndex + 1}`;

    if (
      !game.winnerTeamId ||
      (game.winnerTeamId !== series.teamAId && game.winnerTeamId !== series.teamBId)
    ) {
      bloqueios.push(`${jogo}: falta marcar o time vencedor.`);
      temProblema = true;
    }

    estados.forEach((estado, rowIndex) => {
      const linha = `${jogo}, linha ${rowIndex + 1}`;
      if (estado === "incompleta") {
        bloqueios.push(`${linha}: falta o jogador ou o campeão.`);
        temProblema = true;
      } else if (estado === "repetida") {
        bloqueios.push(`${linha}: o mesmo jogador aparece duas vezes.`);
        temProblema = true;
      } else if (estado === "forasteira") {
        bloqueios.push(`${linha}: jogador não pertence a ${nomeA} nem a ${nomeB}.`);
        temProblema = true;
      }
    });

    if (!estados.includes("ok")) {
      bloqueios.push(`${jogo}: nenhuma linha de K/D/A válida — sem isso o MVP não é calculado.`);
      temProblema = true;
    }

    if (temProblema) jogosComProblema.push(gameIndex);
  });

  return { bloqueios, estadosPorJogo, jogosComProblema, descartaveis };
}

// ---------------------------------------------------------------- importação da Riot

type RiotImportedParticipant = {
  participantId: number;
  side: "BLUE" | "RED";
  puuid: string;
  riotIdGameName: string | null;
  riotIdTagline: string | null;
  summonerName: string | null;
  riotId: string;
  champion: string;
  kills: number;
  deaths: number;
  assists: number;
  win: boolean;
};

type RiotImportedMatch = {
  matchId: string;
  durationSec: number;
  durationMin: number;
  winningSide: "BLUE" | "RED" | null;
  participants: RiotImportedParticipant[];
};

type RiotImportApiResponse = {
  match?: RiotImportedMatch;
  error?: string;
};

type RiotImportStatus = {
  kind: "success" | "error";
  text: string;
};

type ApplyRiotImportResult =
  | {
      ok: true;
      gamePatch: {
        winnerTeamId: string;
        durationMin: number;
        mvpPlayerId: string;
        statsByPlayer: PlayerGameStats[];
      };
      message: string;
    }
  | {
      ok: false;
      error: string;
    };

type TeamSide = "BLUE" | "RED";

type ImportSeriesRostersResult =
  | {
      ok: true;
      teamAPlayers: Player[];
      teamBPlayers: Player[];
    }
  | {
      ok: false;
      error: string;
    };

type ImportSideMappingResult =
  | {
      ok: true;
      blueSide: RiotImportedParticipant[];
      redSide: RiotImportedParticipant[];
      teamASide: TeamSide;
      teamBSide: TeamSide;
      warnings: string[];
    }
  | {
      ok: false;
      error: string;
    };

type ImportedStatsMappingResult =
  | {
      ok: true;
      statsByPlayer: PlayerGameStats[];
    }
  | {
      ok: false;
      error: string;
    };

function getGameImportKey(seriesId: string, gameIndex: number) {
  return `${seriesId}:${gameIndex}`;
}

function normalizeLookup(value: string) {
  return slugifyValue(value).replaceAll("-", "");
}

function getImportSeriesRosters(
  draft: TournamentDataset,
  series: SeriesMatch,
): ImportSeriesRostersResult {
  if (!series.teamAId || !series.teamBId) {
    return { ok: false, error: "Selecione Time A e Time B antes de importar da Riot." };
  }

  const teamAPlayers = draft.players.filter((player) => player.teamId === series.teamAId);
  const teamBPlayers = draft.players.filter((player) => player.teamId === series.teamBId);

  if (teamAPlayers.length === 0 || teamBPlayers.length === 0) {
    return {
      ok: false,
      error: "Os dois times precisam ter jogadores cadastrados para importar a partida da Riot.",
    };
  }

  return { ok: true, teamAPlayers, teamBPlayers };
}

function getImportedParticipantSides(
  match: RiotImportedMatch,
  teamAPlayers: Player[],
  teamBPlayers: Player[],
): ImportSideMappingResult {
  const blueSide = match.participants.filter((participant) => participant.side === "BLUE");
  const redSide = match.participants.filter((participant) => participant.side === "RED");

  if (blueSide.length === 0 || redSide.length === 0) {
    return {
      ok: false,
      error: "A partida da Riot não retornou os dois lados corretamente (azul/vermelho).",
    };
  }

  const blueToAComposite =
    scoreParticipantsAgainstRoster(blueSide, teamAPlayers) +
    scoreParticipantsAgainstRoster(redSide, teamBPlayers);
  const redToAComposite =
    scoreParticipantsAgainstRoster(redSide, teamAPlayers) +
    scoreParticipantsAgainstRoster(blueSide, teamBPlayers);

  const teamASide: TeamSide = blueToAComposite >= redToAComposite ? "BLUE" : "RED";

  return {
    ok: true,
    blueSide,
    redSide,
    teamASide,
    teamBSide: teamASide === "BLUE" ? "RED" : "BLUE",
    warnings: blueToAComposite === redToAComposite ? ["Mapeamento empatado; assumido Azul = Time A."] : [],
  };
}

function mapImportedStatsByPlayer(
  teamAParticipants: RiotImportedParticipant[],
  teamAPlayers: Player[],
  teamBParticipants: RiotImportedParticipant[],
  teamBPlayers: Player[],
): ImportedStatsMappingResult {
  const usedPlayerIds = new Set<string>();
  const statsByPlayer: PlayerGameStats[] = [];
  const unmatched: string[] = [];

  const mapSideParticipants = (participants: RiotImportedParticipant[], roster: Player[]) => {
    for (const participant of participants) {
      const mappedPlayer = choosePlayerForParticipant(participant, roster, usedPlayerIds);
      if (!mappedPlayer) {
        unmatched.push(participant.riotId || participant.summonerName || participant.puuid);
        continue;
      }

      usedPlayerIds.add(mappedPlayer.id);
      statsByPlayer.push({
        playerId: mappedPlayer.id,
        champion: participant.champion,
        kills: participant.kills,
        deaths: participant.deaths,
        assists: participant.assists,
      });
    }
  };

  mapSideParticipants(teamAParticipants, teamAPlayers);
  mapSideParticipants(teamBParticipants, teamBPlayers);

  if (unmatched.length > 0) {
    return {
      ok: false,
      error: `Não foi possível mapear os nicks: ${unmatched.join(", ")}.`,
    };
  }

  return { ok: true, statsByPlayer };
}

function getWinningImportedSide(
  match: RiotImportedMatch,
  blueSide: RiotImportedParticipant[],
  redSide: RiotImportedParticipant[],
): TeamSide | null {
  if (match.winningSide) return match.winningSide;

  const blueWins = blueSide.filter((participant) => participant.win).length;
  const redWins = redSide.filter((participant) => participant.win).length;

  if (blueWins === redWins) return null;
  return blueWins > redWins ? "BLUE" : "RED";
}

function getAutoMvpDisplay(game: SeriesMatch["games"][number], roster: Player[]) {
  const autoMvpPlayerId = inferGameMvpPlayerId(game.statsByPlayer);
  const autoMvpPlayer = roster.find((player) => player.id === autoMvpPlayerId) ?? null;

  if (autoMvpPlayer) {
    return { text: autoMvpPlayer.nick, muted: false };
  }

  if (autoMvpPlayerId) {
    return { text: autoMvpPlayerId, muted: false };
  }

  return { text: "Preencha K/D/A para calcular", muted: true };
}

function getNameVariants(value: string | null | undefined) {
  if (!value) return [];
  const trimmed = value.trim();
  if (!trimmed) return [];

  const keys = new Set<string>();
  const normalized = normalizeLookup(trimmed);
  if (normalized) keys.add(normalized);

  const hashIndex = trimmed.indexOf("#");
  if (hashIndex > 0) {
    const beforeHash = normalizeLookup(trimmed.slice(0, hashIndex));
    if (beforeHash) keys.add(beforeHash);
  }

  return [...keys];
}

function getPlayerLookupKeys(player: Player) {
  const keys = new Set<string>();
  for (const value of [player.nick, player.slug, player.id]) {
    for (const key of getNameVariants(value)) keys.add(key);
  }
  return [...keys];
}

function getParticipantLookupKeys(participant: RiotImportedParticipant) {
  const keys = new Set<string>();
  for (const value of [participant.riotId, participant.riotIdGameName, participant.summonerName]) {
    for (const key of getNameVariants(value)) keys.add(key);
  }
  return [...keys];
}

function scoreParticipantsAgainstRoster(participants: RiotImportedParticipant[], roster: Player[]) {
  const rosterKeys = new Set(roster.flatMap((player) => getPlayerLookupKeys(player)));
  let score = 0;
  for (const participant of participants) {
    if (getParticipantLookupKeys(participant).some((key) => rosterKeys.has(key))) {
      score += 1;
    }
  }
  return score;
}

function choosePlayerForParticipant(
  participant: RiotImportedParticipant,
  roster: Player[],
  usedPlayerIds: Set<string>,
) {
  const participantKeys = getParticipantLookupKeys(participant);
  if (participantKeys.length === 0) return null;

  for (const player of roster) {
    if (usedPlayerIds.has(player.id)) continue;
    const playerKeys = getPlayerLookupKeys(player);
    if (participantKeys.some((key) => playerKeys.includes(key))) {
      return player;
    }
  }

  return null;
}

function applyRiotMatchToSeriesGame({
  draft,
  series,
  match,
}: {
  draft: TournamentDataset;
  series: SeriesMatch;
  match: RiotImportedMatch;
}): ApplyRiotImportResult {
  const rosters = getImportSeriesRosters(draft, series);
  if (!rosters.ok) return rosters;

  const sideMapping = getImportedParticipantSides(match, rosters.teamAPlayers, rosters.teamBPlayers);
  if (!sideMapping.ok) return sideMapping;

  const teamAParticipants = sideMapping.teamASide === "BLUE" ? sideMapping.blueSide : sideMapping.redSide;
  const teamBParticipants = sideMapping.teamBSide === "BLUE" ? sideMapping.blueSide : sideMapping.redSide;
  const importedStats = mapImportedStatsByPlayer(
    teamAParticipants,
    rosters.teamAPlayers,
    teamBParticipants,
    rosters.teamBPlayers,
  );
  if (!importedStats.ok) return importedStats;

  const mvpPlayerId = inferGameMvpPlayerId(importedStats.statsByPlayer);
  if (!mvpPlayerId) {
    return {
      ok: false,
      error: "Não foi possível calcular o MVP automaticamente a partir dos dados importados.",
    };
  }

  const winningSide = getWinningImportedSide(match, sideMapping.blueSide, sideMapping.redSide);
  if (!winningSide) {
    return {
      ok: false,
      error: "Não foi possível identificar o vencedor da partida importada.",
    };
  }
  const winnerTeamId = winningSide === sideMapping.teamASide ? series.teamAId : series.teamBId;

  const warningText =
    sideMapping.warnings.length > 0 ? ` Aviso: ${sideMapping.warnings.join(" ")}` : "";

  return {
    ok: true,
    gamePatch: {
      winnerTeamId,
      durationMin: Math.max(1, match.durationMin || Math.round(match.durationSec / 60)),
      mvpPlayerId,
      statsByPlayer: importedStats.statsByPlayer,
    },
    message: `Partida importada da Riot (${importedStats.statsByPlayer.length} jogadores). MVP calculado automaticamente por KDA.${warningText}`,
  };
}

// ---------------------------------------------------------------- peças visuais locais

/**
 * #33: o painel é desmontado ao trocar de aba, então a seleção não pode morar só no estado
 * do componente. Guardar em módulo devolve a mesma série ao voltar, sem tocar no shell.
 */
let serieLembrada: string | null = null;

/** Cabeçalho de coluna da grade (sigla curta + nome por extenso no title). */
function ColunaTitulo({
  children,
  title,
  center,
}: Readonly<{ children: ReactNode; title?: string; center?: boolean }>) {
  return (
    <span
      title={title}
      style={{
        fontSize: 9.5,
        letterSpacing: ".16em",
        textTransform: "uppercase",
        color: C.bronze,
        textAlign: center ? "center" : "left",
      }}
    >
      {children}
    </span>
  );
}

/** Botão só de ícone: o nome acessível vem do texto escondido, não de um aria-label solto. */
function BotaoIcone({
  onClick,
  label,
  disabled,
  tone = "ghost",
}: Readonly<{ onClick: () => void; label: string; disabled?: boolean; tone?: "ghost" | "danger" }>) {
  return (
    <Button tone={tone} small onClick={onClick} disabled={disabled} title={label} style={{ padding: "7px 8px" }}>
      <Trash2 size={14} aria-hidden />
      <span style={soLeitores}>{label}</span>
    </Button>
  );
}

/**
 * Campo de campeão com sugestões do datalist. Fica local (e não em ui.tsx) porque o `Input`
 * do kit não carrega `list` — e só esta tela precisa disso. O visual é o mesmo do kit.
 */
function InputCampeao({
  value,
  onChange,
  ariaLabel,
  placeholder,
}: Readonly<{ value: string; onChange: (v: string) => void; ariaLabel: string; placeholder: string }>) {
  return (
    <input
      aria-label={ariaLabel}
      placeholder={placeholder}
      list="champions-datalist"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      style={{
        width: "100%",
        minWidth: 0,
        padding: "9px 11px",
        fontFamily: "inherit",
        fontSize: 13,
        color: C.ink,
        background: "rgba(0,0,0,.34)",
        border: `1px solid ${C.line}`,
        borderRadius: 3,
      }}
    />
  );
}

function LinhaVazia({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <p
      style={{
        margin: 0,
        padding: "12px 14px",
        border: `1px dashed ${C.line}`,
        borderRadius: 3,
        fontSize: 12.5,
        color: C.ink4,
      }}
    >
      {children}
    </p>
  );
}

// ---------------------------------------------------------------- painel

export function AdminSeriesPanel({
  draft,
  mutateDraft,
  aplicarDoServidor,
  onVersaoDoServidor,
}: Readonly<{
  draft: TournamentDataset;
  mutateDraft: MutateDraft;
  /** Para o que o servidor já gravou: entra no rascunho E na baseline. */
  aplicarDoServidor: MutateDraft;
  /** Avisa a versão que a rota leu e a que ela gravou, para o painel acompanhar a trava. */
  onVersaoDoServidor: (versaoLida?: number, versaoGravada?: number) => void;
}>) {
  // O sorteio ao vivo grava DIRETO no servidor, fora do rascunho. Por isso ele DEVOLVE
  // o que gravou (`onSorteado`): o rascunho local sincroniza só `blueSideTeamId` e
  // `cardsUsed` e não fica velho, sem precisar da recarga que abria `window.confirm`
  // no meio da cerimônia — e salvar depois não cai na trava de versão (409).
  const [sorteioAberto, setSorteioAberto] = useState(false);
  const sortedSeries = useMemo(
    () =>
      draft.seriesMatches
        .slice()
        .sort((a, b) => (b.date || "").localeCompare(a.date || "") || b.id.localeCompare(a.id)),
    [draft.seriesMatches],
  );

  const [selectedId, setSelectedId] = useState<string | null>(serieLembrada);
  const [riotMatchIdsByGame, setRiotMatchIdsByGame] = useState<Record<string, string>>({});
  const [riotImportStatusByGame, setRiotImportStatusByGame] = useState<Record<string, RiotImportStatus>>({});
  const [riotImportingGameKey, setRiotImportingGameKey] = useState<string | null>(null);
  const [renomeandoId, setRenomeandoId] = useState(false);
  const [idRascunho, setIdRascunho] = useState("");
  const [erroId, setErroId] = useState<string | null>(null);
  const [aviso, setAviso] = useState<{ id: number; escopo: string; texto: string; tom: "ok" | "warn" } | null>(
    null,
  );

  useEffect(() => {
    if (!selectedId) return;
    if (draft.seriesMatches.some((series) => series.id === selectedId)) return;
    setSelectedId(null);
  }, [draft.seriesMatches, selectedId]);

  // Espelha a seleção fora do componente para sobreviver à troca de aba (#33).
  useEffect(() => {
    serieLembrada = selectedId;
  }, [selectedId]);

  // Trocar de série cancela uma renomeação pela metade.
  useEffect(() => {
    setRenomeandoId(false);
    setErroId(null);
  }, [selectedId]);

  // #32: o retorno some sozinho para não virar ruído permanente.
  useEffect(() => {
    if (!aviso) return;
    const timer = globalThis.setTimeout(() => setAviso(null), 5000);
    return () => globalThis.clearTimeout(timer);
  }, [aviso]);

  const avisar = (escopo: string, texto: string, tom: "ok" | "warn" = "ok") => {
    setAviso({ id: Date.now(), escopo, texto, tom });
  };

  const Aviso = ({ escopo }: Readonly<{ escopo: string }>) => {
    if (!aviso || aviso.escopo !== escopo) return null;
    return (
      <span role="status" style={{ display: "inline-flex" }}>
        <Chip tone={aviso.tom === "ok" ? "ok" : "warn"}>{aviso.texto}</Chip>
      </span>
    );
  };

  const selectedSeries = draft.seriesMatches.find((series) => series.id === selectedId) ?? null;

  const currentRosters = useMemo(() => {
    if (!selectedSeries) return { teamAPlayers: [], teamBPlayers: [], combined: [] as Player[] };
    const teamAPlayers = ordenarPorRota(draft.players.filter((player) => player.teamId === selectedSeries.teamAId));
    const teamBPlayers = ordenarPorRota(draft.players.filter((player) => player.teamId === selectedSeries.teamBId));
    return { teamAPlayers, teamBPlayers, combined: [...teamAPlayers, ...teamBPlayers] };
  }, [draft, selectedSeries]);

  const selectedSeriesSettings = getSelectedSeriesSettings(selectedSeries, draft);
  const selectedSeriesIsWalkover = selectedSeriesSettings.isWalkover;
  const selectedSeriesFormat = selectedSeriesSettings.format;
  const selectedSeriesFormatLabel = selectedSeriesSettings.formatLabel;
  const selectedSeriesMaxGames = selectedSeriesSettings.maxGames;
  const selectedSeriesTargetWins = selectedSeriesSettings.targetWins;

  // Auditoria de TODAS as séries: alimenta o aviso do topo, o selo na lista e o vermelho no editor.
  const auditorias = useMemo(() => {
    const mapa = new Map<string, AuditoriaSerie>();
    for (const series of draft.seriesMatches) mapa.set(series.id, auditarSerie(series, draft));
    return mapa;
  }, [draft]);

  const auditoriaSelecionada = selectedSeries ? auditorias.get(selectedSeries.id) ?? null : null;
  const seriesComProblema = sortedSeries.filter(
    (series) => (auditorias.get(series.id)?.bloqueios.length ?? 0) > 0,
  );
  const totalDescartaveis = [...auditorias.values()].reduce((total, item) => total + item.descartaveis, 0);

  const setRiotMatchIdForGame = (seriesId: string, gameIndex: number, value: string) => {
    const key = getGameImportKey(seriesId, gameIndex);
    setRiotMatchIdsByGame((prev) => ({ ...prev, [key]: value }));
  };

  const setRiotImportStatusForGame = (seriesId: string, gameIndex: number, status?: RiotImportStatus) => {
    const key = getGameImportKey(seriesId, gameIndex);
    setRiotImportStatusByGame((prev) => {
      if (!status) {
        if (!(key in prev)) return prev;
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return { ...prev, [key]: status };
    });
  };

  const clearRiotStateForSeries = (seriesId: string) => {
    const prefix = `${seriesId}:`;
    setRiotMatchIdsByGame((prev) =>
      Object.fromEntries(Object.entries(prev).filter(([key]) => !key.startsWith(prefix))),
    );
    setRiotImportStatusByGame((prev) =>
      Object.fromEntries(Object.entries(prev).filter(([key]) => !key.startsWith(prefix))),
    );
    setRiotImportingGameKey((prev) => (prev?.startsWith(prefix) ? null : prev));
  };

  /** Remove as linhas totalmente em branco de uma série (#3). Devolve quantas saíram. */
  const limparLinhasVazias = (seriesId: string) => {
    const alvo = draft.seriesMatches.find((series) => series.id === seriesId);
    if (!alvo) return 0;
    const total = alvo.games.reduce(
      (soma, game) => soma + game.statsByPlayer.filter((row) => isLinhaDescartavel(row)).length,
      0,
    );
    if (total === 0) return 0;

    mutateDraft((next) => {
      const series = next.seriesMatches.find((row) => row.id === seriesId);
      if (!series) return;
      for (const game of series.games) {
        game.statsByPlayer = game.statsByPlayer.filter((row) => !isLinhaDescartavel(row));
      }
    });
    return total;
  };

  const limparTodasAsLinhasVazias = () => {
    if (totalDescartaveis === 0) return;
    mutateDraft((next) => {
      for (const series of next.seriesMatches) {
        for (const game of series.games) {
          game.statsByPlayer = game.statsByPlayer.filter((row) => !isLinhaDescartavel(row));
        }
      }
    });
    avisar("topo", `${totalDescartaveis} linha(s) em branco descartada(s).`, "warn");
  };

  /**
   * Trocar de série descarta as linhas em branco da anterior — elas só existem por clique
   * acidental no "+ Linha" e derrubariam o salvamento do painel inteiro.
   */
  const selecionarSerie = (seriesId: string) => {
    if (selectedId && selectedId !== seriesId) limparLinhasVazias(selectedId);
    setSelectedId(seriesId);
  };

  const createSeries = () => {
    const series = createBlankSeries(draft.tournament.format);
    mutateDraft((next) => {
      next.seriesMatches.push(series);
    });
    if (selectedId) limparLinhasVazias(selectedId);
    setSelectedId(series.id);
    avisar("topo", "Série criada. Escolha os dois times para começar.");
  };

  const deleteSeries = (seriesId: string) => {
    mutateDraft((next) => {
      next.seriesMatches = next.seriesMatches.filter((series) => series.id !== seriesId);
    });
    if (selectedId === seriesId) setSelectedId(null);
  };

  /** #35: identificar pelos nomes dos times, não pelo id com timestamp. */
  const confirmDeleteSelectedSeries = () => {
    if (!selectedSeries) return;
    const score = getSeriesScore(selectedSeries, draft);
    const nomeA = getTeamName(draft, selectedSeries.teamAId);
    const nomeB = getTeamName(draft, selectedSeries.teamBId);
    const quandoLabel = selectedSeries.date ? ` de ${formatDateLabel(selectedSeries.date)}` : "";
    const jogos = selectedSeries.games.length;
    // O histórico de sorteios é append-only e some junto com a série. Avisar AQUI, e não
    // deixar a pessoa descobrir na hora de salvar: a exclusão já mexeu no rascunho, e o
    // servidor recusa o PUT inteiro para quem não é o responsável — o painel ficava
    // impossível de salvar, sem desfazer.
    const sorteios = selectedSeries.sorteios?.length ?? 0;
    const avisoSorteios =
      sorteios > 0
        ? `\n\nATENÇÃO: esta série tem ${sorteios} registro(s) de sorteio (com a semente que ` +
          `permite conferir cada resultado). Eles serão perdidos, e só o responsável pelo ` +
          `campeonato consegue salvar essa remoção.`
        : "";
    const shouldDelete = confirmBrowserAction(
      `Excluir a série ${nomeA} x ${nomeB}${quandoLabel} (${score.teamAWins}-${score.teamBWins})?\n\n` +
        `Isso remove ${jogos} jogo(s) lançado(s) desta série no rascunho. Não dá para desfazer.` +
        avisoSorteios,
    );
    if (!shouldDelete) return;
    deleteSeries(selectedSeries.id);
  };

  const updateSelectedSeries = (recipe: (series: SeriesMatch) => void) => {
    if (!selectedSeries) return;
    mutateDraft((next) => {
      const series = next.seriesMatches.find((row) => row.id === selectedSeries.id);
      if (!series) return;
      recipe(series);
    });
  };

  /**
   * #5: o ID da série vira a URL pública /partidas/[id] e também é a chave da seleção — editar
   * direto fechava o editor na primeira tecla e deixava um ID pela metade. Agora é somente
   * leitura e a renomeação é um ato explícito, com aviso do que muda.
   */
  const aplicarRenomeacao = () => {
    if (!selectedSeries) return;
    const novoId = slugifyValue(idRascunho);

    if (!novoId) {
      setErroId("Use letras, números e hífen — por exemplo: final-bronze-2026.");
      return;
    }
    if (novoId === selectedSeries.id) {
      setRenomeandoId(false);
      setErroId(null);
      return;
    }
    if (draft.seriesMatches.some((series) => series.id === novoId)) {
      setErroId("Já existe outra série com esse ID.");
      return;
    }

    // O histórico de sorteios é guardado pelo servidor POR ID da série: trocar o id faz
    // o registro do id antigo não ser reencontrado. O aviso antigo falava só do link.
    const sorteiosDaSerie = selectedSeries.sorteios?.length ?? 0;
    const confirmou = confirmBrowserAction(
      `Renomear a série para "${novoId}"?\n\n` +
        `O link público muda de /partidas/${selectedSeries.id} para /partidas/${novoId}. ` +
        `Quem tiver o link antigo salvo vai cair em página inexistente.` +
        (sorteiosDaSerie > 0
          ? `\n\nATENÇÃO: o histórico de sorteios é guardado pelo ID da série. Os ` +
            `${sorteiosDaSerie} registro(s) desta série serão perdidos na renomeação, e só ` +
            `o responsável pelo campeonato consegue salvar essa mudança.`
          : ""),
    );
    if (!confirmou) return;

    const idAnterior = selectedSeries.id;
    mutateDraft((next) => {
      const series = next.seriesMatches.find((row) => row.id === idAnterior);
      if (series) series.id = novoId;
    });
    clearRiotStateForSeries(idAnterior);
    setSelectedId(novoId);
    setRenomeandoId(false);
    setErroId(null);
    avisar("identidade", "ID alterado — o link público só muda de verdade depois de salvar.", "warn");
  };

  /**
   * #6: trocar um time numa série já lançada deixava vencedor, stats e bans do time ANTIGO
   * pendurados no rascunho. Confirmamos e limpamos o que ficou órfão.
   */
  const trocarTimeDaSerie = (lado: "A" | "B", novoTimeId: string) => {
    if (!selectedSeries) return;
    const anterior = lado === "A" ? selectedSeries.teamAId : selectedSeries.teamBId;
    if (anterior === novoTimeId) return;

    const timesFinais = lado === "A" ? [novoTimeId, selectedSeries.teamBId] : [selectedSeries.teamAId, novoTimeId];
    const idsValidos = new Set(
      draft.players.filter((player) => timesFinais.includes(player.teamId)).map((player) => player.id),
    );

    let linhasOrfas = 0;
    let bansOrfaos = 0;
    let vencedoresOrfaos = 0;
    for (const game of selectedSeries.games) {
      linhasOrfas += game.statsByPlayer.filter(
        (row) => row.playerId.trim() && !idsValidos.has(row.playerId),
      ).length;
      bansOrfaos += (game.bans ?? []).filter((ban) => ban.teamId && !timesFinais.includes(ban.teamId)).length;
      if (game.winnerTeamId && !timesFinais.includes(game.winnerTeamId)) vencedoresOrfaos += 1;
    }

    if (selectedSeries.games.length > 0) {
      const confirmou = confirmBrowserAction(
        `Trocar o Time ${lado} de "${getTeamName(draft, anterior)}" para "${getTeamName(draft, novoTimeId)}"?\n\n` +
          `Esta série já tem ${selectedSeries.games.length} jogo(s) lançado(s). Serão apagados: ` +
          `${linhasOrfas} linha(s) de K/D/A, ${bansOrfaos} ban(s) e o vencedor de ${vencedoresOrfaos} jogo(s) ` +
          `que ainda apontam para o time removido.`,
      );
      if (!confirmou) return;
    }

    updateSelectedSeries((series) => {
      if (lado === "A") series.teamAId = novoTimeId;
      else series.teamBId = novoTimeId;

      const times = [series.teamAId, series.teamBId];

      if (
        series.walkoverWinnerTeamId &&
        series.walkoverWinnerTeamId !== series.teamAId &&
        series.walkoverWinnerTeamId !== series.teamBId
      ) {
        delete series.walkoverWinnerTeamId;
        delete series.walkoverReason;
      }

      // O lado azul também aponta para um time e também fica órfão. Sem esta limpeza,
      // a série trocava de time mas seguia com `blueSideTeamId` do time REMOVIDO, e a
      // cerimônia de sorteio anunciava como lado azul alguém que não está no confronto.
      if (series.blueSideTeamId && !times.includes(series.blueSideTeamId)) {
        delete series.blueSideTeamId;
      }

      for (const game of series.games) {
        if (game.winnerTeamId && !times.includes(game.winnerTeamId)) game.winnerTeamId = "";
        game.statsByPlayer = game.statsByPlayer.filter(
          (row) => !row.playerId.trim() || idsValidos.has(row.playerId),
        );
        if (game.mvpPlayerId && !idsValidos.has(game.mvpPlayerId)) game.mvpPlayerId = "";
        if (game.bans) game.bans = game.bans.filter((ban) => !ban.teamId || times.includes(ban.teamId));
      }

      if (series.cardsUsed) {
        series.cardsUsed = series.cardsUsed.filter((card) => !card.teamId || times.includes(card.teamId));
      }
    });

    if (selectedSeries.games.length > 0) {
      avisar(
        "times",
        `Time ${lado} trocado. ${linhasOrfas} linha(s) e ${bansOrfaos} ban(s) órfãos removidos.`,
        "warn",
      );
    }
  };

  const updateWalkoverWinner = (winnerTeamId: string) => {
    if (!selectedSeries) return;

    if (!winnerTeamId) {
      updateSelectedSeries((series) => {
        delete series.walkoverWinnerTeamId;
        delete series.walkoverReason;
      });
      return;
    }

    if (selectedSeries.games.length > 0) {
      const shouldConvert = confirmBrowserAction(
        "Marcar esta série como W.O. vai remover os jogos e stats já lançados no rascunho. Deseja continuar?",
      );
      if (!shouldConvert) return;
    }

    updateSelectedSeries((series) => {
      series.walkoverWinnerTeamId = winnerTeamId;
      series.games = [];
    });
    clearRiotStateForSeries(selectedSeries.id);
  };

  const updateSeriesFormat = (nextFormat: SeriesFormat) => {
    if (!selectedSeries) return;
    const nextMaxGames = nextFormat === "BO5" ? 5 : 3;

    if (selectedSeries.games.length > nextMaxGames) {
      const shouldTrim = confirmBrowserAction(
        `Trocar esta série para ${getFormatOptionLabel(nextFormat)} vai remover os jogos excedentes acima de ${nextMaxGames}. Deseja continuar?`,
      );
      if (!shouldTrim) return;
    }

    updateSelectedSeries((series) => {
      series.format = nextFormat;
      if (series.games.length > nextMaxGames) {
        series.games = series.games.slice(0, nextMaxGames);
      }
    });
  };

  /** #2/#26: as linhas saem na ordem das rotas (TOP, SEL, MID, ADC, SUP), time A e depois B. */
  const fillRosterRowsForGame = (gameIndex: number) => {
    if (!selectedSeries) return;
    const game = selectedSeries.games[gameIndex];
    if (!game) return;

    const jaListados = new Set(game.statsByPlayer.map((row) => row.playerId));
    const faltando = currentRosters.combined.filter((player) => !jaListados.has(player.id));

    if (faltando.length === 0) {
      avisar(`jogo:${gameIndex}`, "O elenco dos dois times já está na lista.", "warn");
      return;
    }

    updateSelectedSeries((series) => {
      const alvo = series.games[gameIndex];
      if (!alvo) return;
      for (const player of faltando) alvo.statsByPlayer.push(createBlankStatsRow(player.id));
    });
    avisar(`jogo:${gameIndex}`, `${faltando.length} linha(s) adicionada(s) na ordem das rotas.`);
  };

  const updateGameWinner = (gameIndex: number, winnerTeamId: string) => {
    updateSelectedSeries((series) => {
      const current = series.games[gameIndex];
      if (!current) return;
      current.winnerTeamId = winnerTeamId;
    });
  };

  const updateGameDuration = (gameIndex: number, value: string) => {
    const digitos = value.replace(/[^0-9]/g, "");
    updateSelectedSeries((series) => {
      const current = series.games[gameIndex];
      if (!current) return;
      current.durationMin = digitos ? Number(digitos) : undefined;
    });
  };

  const addStatsRowToGame = (gameIndex: number) => {
    const total = (selectedSeries?.games[gameIndex]?.statsByPlayer.length ?? 0) + 1;
    updateSelectedSeries((series) => {
      const current = series.games[gameIndex];
      if (!current) return;
      current.statsByPlayer.push(createBlankStatsRow());
    });
    avisar(`jogo:${gameIndex}`, `Linha ${total} adicionada — escolha o jogador.`);
  };

  const updateStatsRowField = <K extends keyof PlayerGameStats>(
    gameIndex: number,
    rowIndex: number,
    field: K,
    value: PlayerGameStats[K],
  ) => {
    updateSelectedSeries((series) => {
      const current = series.games[gameIndex]?.statsByPlayer[rowIndex];
      if (!current) return;
      current[field] = value;
    });
  };

  const removeStatsRowFromGame = (gameIndex: number, rowIndex: number) => {
    updateSelectedSeries((series) => {
      series.games[gameIndex]?.statsByPlayer.splice(rowIndex, 1);
    });
  };

  const addBanToGame = (gameIndex: number) => {
    updateSelectedSeries((series) => {
      const game = series.games[gameIndex];
      if (!game) return;
      if (!game.bans) game.bans = [];
      game.bans.push({ teamId: series.teamAId || "", championName: "" });
    });
    avisar(`bans:${gameIndex}`, "Ban adicionado.");
  };

  const updateBanField = (
    gameIndex: number,
    banIndex: number,
    field: "teamId" | "championName",
    value: string,
  ) => {
    updateSelectedSeries((series) => {
      const ban = series.games[gameIndex]?.bans?.[banIndex];
      if (!ban) return;
      if (field === "teamId") ban.teamId = value;
      else ban.championName = value;
    });
  };

  const removeBanFromGame = (gameIndex: number, banIndex: number) => {
    updateSelectedSeries((series) => {
      series.games[gameIndex]?.bans?.splice(banIndex, 1);
    });
  };

  /** #8: remover jogo apaga muita digitação — confirma citando o jogo e o que se perde. */
  const removerJogo = (gameIndex: number) => {
    if (!selectedSeries) return;
    const game = selectedSeries.games[gameIndex];
    if (!game) return;

    const linhas = game.statsByPlayer.length;
    const bans = game.bans?.length ?? 0;
    const nomeA = getTeamName(draft, selectedSeries.teamAId);
    const nomeB = getTeamName(draft, selectedSeries.teamBId);

    const confirmou = confirmBrowserAction(
      `Remover o Jogo ${gameIndex + 1} de ${nomeA} x ${nomeB}?\n\n` +
        `Isso apaga o vencedor, a duração, ${linhas} linha(s) de K/D/A e ${bans} ban(s). Não dá para desfazer.`,
    );
    if (!confirmou) return;

    updateSelectedSeries((series) => {
      series.games.splice(gameIndex, 1);
    });
    // As chaves de importação são por índice; com os jogos deslocados elas deixam de valer.
    clearRiotStateForSeries(selectedSeries.id);
    avisar("jogos", `Jogo ${gameIndex + 1} removido.`, "warn");
  };

  const adicionarJogo = () => {
    if (!selectedSeries) return;
    const total = selectedSeries.games.length + 1;
    updateSelectedSeries((series) => {
      if (series.games.length >= selectedSeriesMaxGames) return;
      series.games.push(createBlankGame());
    });
    avisar("jogos", `Jogo ${total} adicionado.`);
  };

  const addCardToSeries = () => {
    updateSelectedSeries((series) => {
      if (!series.cardsUsed) series.cardsUsed = [];
      series.cardsUsed.push({ teamId: series.teamAId || "", cardId: CARD_OPTIONS[0].id });
    });
    avisar("cartinhas", "Cartinha adicionada.");
  };

  const updateCardField = (cardIndex: number, field: "teamId" | "cardId", value: string) => {
    updateSelectedSeries((series) => {
      const card = series.cardsUsed?.[cardIndex];
      if (!card) return;
      if (field === "cardId") card.cardId = value as CardId;
      else card.teamId = value;
    });
  };

  const removeCardFromSeries = (cardIndex: number) => {
    updateSelectedSeries((series) => {
      series.cardsUsed?.splice(cardIndex, 1);
    });
  };

  const importGameFromRiot = async (gameIndex: number) => {
    if (!selectedSeries) return;

    const gameKey = getGameImportKey(selectedSeries.id, gameIndex);
    const matchId = (riotMatchIdsByGame[gameKey] || "").trim();

    if (!matchId) {
      setRiotImportStatusForGame(selectedSeries.id, gameIndex, {
        kind: "error",
        text: "Informe o ID da partida do LoL (ex.: 3210692404 ou BR1_3210692404).",
      });
      return;
    }

    setRiotImportStatusForGame(selectedSeries.id, gameIndex);
    setRiotImportingGameKey(gameKey);

    try {
      const response = await fetch("/api/admin/riot/match", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId }),
      });
      const data = (await response.json()) as RiotImportApiResponse;

      if (!response.ok || !data.match) {
        throw new Error(data.error || "Falha ao consultar a Riot.");
      }

      const mapped = applyRiotMatchToSeriesGame({
        draft,
        series: selectedSeries,
        match: data.match,
      });

      if (!mapped.ok) {
        setRiotImportStatusForGame(selectedSeries.id, gameIndex, {
          kind: "error",
          text: mapped.error,
        });
        return;
      }

      updateSelectedSeries((series) => {
        const game = series.games[gameIndex];
        if (!game) return;

        game.winnerTeamId = mapped.gamePatch.winnerTeamId;
        game.durationMin = mapped.gamePatch.durationMin;
        game.mvpPlayerId = mapped.gamePatch.mvpPlayerId;
        game.statsByPlayer = mapped.gamePatch.statsByPlayer;
      });

      setRiotImportStatusForGame(selectedSeries.id, gameIndex, {
        kind: "success",
        text: mapped.message,
      });
    } catch (error) {
      setRiotImportStatusForGame(selectedSeries.id, gameIndex, {
        kind: "error",
        text: error instanceof Error ? error.message : "Falha ao importar partida da Riot.",
      });
    } finally {
      setRiotImportingGameKey((prev) => (prev === gameKey ? null : prev));
    }
  };

  /**
   * #41: a roda do mouse sobre um campo focado alterava o número sem a pessoa perceber.
   * Tirar o foco no wheel resolve para qualquer campo da grade de uma vez só.
   */
  const bloquearRoda = () => {
    const ativo = globalThis.document?.activeElement;
    if (ativo instanceof HTMLInputElement) ativo.blur();
  };

  // -------------------------------------------------------------- lista da esquerda

  const listaDeSeries =
    sortedSeries.length === 0 ? (
      <LinhaVazia>Nenhuma série cadastrada. Comece por &quot;Nova série&quot;.</LinhaVazia>
    ) : (
      sortedSeries.map((series) => {
        const score = getSeriesScore(series, draft);
        const winner = getSeriesWinnerTeamId(series, draft);
        const isWalkover = isWalkoverSeries(series);
        const teamA = getTeamName(draft, series.teamAId);
        const teamB = getTeamName(draft, series.teamBId);
        const isSelected = selectedSeries?.id === series.id;
        const estadoLabel = getSeriesStateLabel(isWalkover, Boolean(winner));
        const temProblema = (auditorias.get(series.id)?.bloqueios.length ?? 0) > 0;

        return (
          <button
            key={series.id}
            type="button"
            onClick={() => selecionarSerie(series.id)}
            style={{
              display: "block",
              width: "100%",
              textAlign: "left",
              padding: "10px 12px 10px 11px",
              borderRadius: 3,
              border: `1px solid ${isSelected ? C.line2 : C.line}`,
              borderLeft: `3px solid ${isSelected ? C.bronzeHi : "transparent"}`,
              background: isSelected ? "rgba(201,138,75,.12)" : "rgba(0,0,0,.20)",
              color: C.ink,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 10,
                letterSpacing: ".10em",
                textTransform: "uppercase",
                color: C.ink4,
                ...tabular,
              }}
            >
              <span>{formatDateLabel(series.date)}</span>
              <span aria-hidden>•</span>
              <span>{getSeriesStageLabel(series)}</span>
              <span aria-hidden>•</span>
              <span>{getSeriesFormatLabel(series, draft)}</span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <p
                  style={{
                    margin: 0,
                    fontSize: 12.5,
                    color: isSelected ? C.ink : C.ink2,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {teamA}
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: 12.5,
                    color: isSelected ? C.ink : C.ink2,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {teamB}
                </p>
              </div>
              <div
                style={{
                  fontFamily: display,
                  fontSize: 20,
                  lineHeight: 1,
                  color: isSelected ? C.bronzeHi : C.bronze,
                  ...tabular,
                }}
              >
                {score.teamAWins}-{score.teamBWins}
              </div>
            </div>

            <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
              <Chip tone={isWalkover ? "warn" : winner ? "ok" : "neutro"}>{estadoLabel}</Chip>
              {temProblema ? (
                <Chip tone="danger" title="Esta série tem pendências que travam o salvamento">
                  Pendências
                </Chip>
              ) : null}
            </div>
          </button>
        );
      })
    );

  // -------------------------------------------------------------- jogos da série

  const renderStatsRow = (
    gameIndex: number,
    row: PlayerGameStats,
    rowIndex: number,
    estado: EstadoLinha,
  ) => {
    const problema = estado === "incompleta" || estado === "repetida" || estado === "forasteira";
    const corBorda = problema ? "rgba(212,87,74,.55)" : estado === "vazia" ? "rgba(224,163,58,.40)" : C.line;
    const kda = getKda(row.kills, row.deaths, row.assists);

    const motivo =
      estado === "incompleta"
        ? "Falta o jogador ou o campeão"
        : estado === "repetida"
          ? "Este jogador já está em outra linha deste jogo"
          : estado === "forasteira"
            ? "Jogador não pertence a nenhum dos dois times da série"
            : estado === "vazia"
              ? "Linha em branco — será descartada"
              : undefined;

    return (
      <div
        key={`g${gameIndex}-r${rowIndex}`}
        title={motivo}
        style={{
          display: "grid",
          gridTemplateColumns: GRADE_STATS,
          gap: 8,
          alignItems: "center",
          minWidth: LARGURA_MIN_STATS,
          padding: "7px 8px",
          border: `1px solid ${corBorda}`,
          borderRadius: 3,
          background: problema ? "rgba(212,87,74,.06)" : "rgba(0,0,0,.18)",
        }}
      >
        <Select
          ariaLabel={`Jogador da linha ${rowIndex + 1}`}
          value={row.playerId}
          onChange={(value) => updateStatsRowField(gameIndex, rowIndex, "playerId", value)}
        >
          <option value="">Jogador…</option>
          {currentRosters.combined.map((player) => (
            <option key={player.id} value={player.id}>
              {rotuloJogador(draft, player)}
            </option>
          ))}
          {/* Jogador de fora do confronto continua listado para não sumir silenciosamente. */}
          {row.playerId && !currentRosters.combined.some((player) => player.id === row.playerId) ? (
            <option value={row.playerId}>{row.playerId} (fora da série)</option>
          ) : null}
        </Select>

        <InputCampeao
          ariaLabel={`Campeão da linha ${rowIndex + 1}`}
          placeholder="Campeão"
          value={row.champion ?? ""}
          onChange={(valor) => updateStatsRowField(gameIndex, rowIndex, "champion", valor)}
        />

        <Input
          numeric
          ariaLabel={`Abates da linha ${rowIndex + 1}`}
          value={row.kills}
          onChange={(value) => updateStatsRowField(gameIndex, rowIndex, "kills", soDigitos(value))}
        />
        <Input
          numeric
          ariaLabel={`Mortes da linha ${rowIndex + 1}`}
          value={row.deaths}
          onChange={(value) => updateStatsRowField(gameIndex, rowIndex, "deaths", soDigitos(value))}
        />
        <Input
          numeric
          ariaLabel={`Assistências da linha ${rowIndex + 1}`}
          value={row.assists}
          onChange={(value) => updateStatsRowField(gameIndex, rowIndex, "assists", soDigitos(value))}
        />

        {/* KDA calculado ao vivo: confere o print sem tirar a mão do teclado. */}
        <span
          style={{
            fontSize: 12.5,
            textAlign: "center",
            color: estado === "vazia" ? C.ink4 : C.okSoft,
            ...tabular,
          }}
        >
          {kda.toFixed(2)}
        </span>

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <BotaoIcone
            label={`Remover a linha ${rowIndex + 1}`}
            onClick={() => removeStatsRowFromGame(gameIndex, rowIndex)}
          />
        </div>
      </div>
    );
  };

  const renderGame = (game: SeriesMatch["games"][number], gameIndex: number) => {
    if (!selectedSeries) return null;

    const riotImportKey = getGameImportKey(selectedSeries.id, gameIndex);
    const riotImportStatus = riotImportStatusByGame[riotImportKey];
    const riotMatchId = riotMatchIdsByGame[riotImportKey] ?? "";
    const isImportingRiot = riotImportingGameKey === riotImportKey;
    const autoMvpDisplay = getAutoMvpDisplay(game, currentRosters.combined);
    const estados =
      auditoriaSelecionada?.estadosPorJogo[gameIndex] ??
      game.statsByPlayer.map((): EstadoLinha => "ok");
    const jogoComProblema = auditoriaSelecionada?.jogosComProblema.includes(gameIndex) ?? false;
    const vencedorLabel = game.winnerTeamId ? getTeamName(draft, game.winnerTeamId) : null;

    return (
      <Card
        key={`${selectedSeries.id}-game-${gameIndex}`}
        padding={14}
        style={{
          minWidth: 0,
          marginTop: 12,
          borderColor: jogoComProblema ? "rgba(212,87,74,.45)" : C.line,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <h4 style={{ fontFamily: display, fontSize: 17, color: C.ink, margin: 0 }}>
            Jogo {gameIndex + 1}
          </h4>
          {vencedorLabel ? <Chip tone="ok">Vitória: {vencedorLabel}</Chip> : <Chip tone="warn">Sem vencedor</Chip>}
          {jogoComProblema ? <Chip tone="danger">Pendências neste jogo</Chip> : null}

          <div style={{ display: "flex", gap: 8, marginLeft: "auto", alignItems: "center", flexWrap: "wrap" }}>
            <Aviso escopo={`jogo:${gameIndex}`} />
            <Button tone="ghost" small onClick={() => fillRosterRowsForGame(gameIndex)}>
              Preencher elenco
            </Button>
            {/* O destrutivo fica afastado do botão usado o tempo todo (#8). */}
            <span style={{ width: 1, height: 22, background: C.line, margin: "0 4px" }} aria-hidden />
            <Button tone="danger" small onClick={() => removerJogo(gameIndex)}>
              <Trash2 size={14} aria-hidden /> Remover jogo
            </Button>
          </div>
        </div>

        <div
          style={{
            marginTop: 12,
            padding: 12,
            border: `1px solid ${C.line}`,
            borderRadius: 3,
            background: "rgba(0,0,0,.18)",
          }}
        >
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
            <Field
              label="ID da partida no LoL (Riot)"
              style={{ flex: "1 1 240px" }}
              hint="Preenche vencedor, duração, campeões e K/D/A. O MVP sai do maior KDA."
            >
              <Input
                placeholder="Ex.: 3210692404 ou BR1_3210692404"
                value={riotMatchId}
                onChange={(value) => setRiotMatchIdForGame(selectedSeries.id, gameIndex, value)}
              />
            </Field>
            <Button
              tone="ghost"
              disabled={
                isImportingRiot ||
                !riotMatchId.trim() ||
                !selectedSeries.teamAId ||
                !selectedSeries.teamBId
              }
              onClick={() => void importGameFromRiot(gameIndex)}
              style={{ marginBottom: 22 }}
            >
              {isImportingRiot ? "Importando…" : "Importar da Riot"}
            </Button>
          </div>

          {riotImportStatus ? (
            <p
              role={riotImportStatus.kind === "error" ? "alert" : "status"}
              style={{
                margin: "10px 0 0",
                padding: "8px 10px",
                borderRadius: 3,
                fontSize: 12,
                lineHeight: 1.5,
                border: `1px solid ${riotImportStatus.kind === "error" ? "rgba(212,87,74,.45)" : "rgba(70,214,200,.40)"}`,
                background: riotImportStatus.kind === "error" ? "rgba(212,87,74,.10)" : "rgba(70,214,200,.09)",
                color: riotImportStatus.kind === "error" ? C.dangerSoft : C.okSoft,
              }}
            >
              {riotImportStatus.text}
            </p>
          ) : null}
        </div>

        <div className="lob-3col" style={{ marginTop: 12 }}>
          <Field label="Time vencedor">
            <Select
              value={game.winnerTeamId}
              onChange={(value) => updateGameWinner(gameIndex, value)}
              style={
                game.winnerTeamId ? undefined : { borderColor: "rgba(224,163,58,.45)" }
              }
            >
              <option value="">Selecione</option>
              {selectedSeries.teamAId ? (
                <option value={selectedSeries.teamAId}>{getTeamName(draft, selectedSeries.teamAId)}</option>
              ) : null}
              {selectedSeries.teamBId ? (
                <option value={selectedSeries.teamBId}>{getTeamName(draft, selectedSeries.teamBId)}</option>
              ) : null}
            </Select>
          </Field>

          <Field label="Duração (min)">
            <Input
              numeric
              value={game.durationMin ?? ""}
              onChange={(value) => updateGameDuration(gameIndex, value)}
            />
          </Field>

          <div>
            <span
              style={{
                display: "block",
                fontSize: 10,
                letterSpacing: ".16em",
                textTransform: "uppercase",
                color: C.bronze,
                marginBottom: 6,
              }}
            >
              MVP do jogo (automático)
            </span>
            <div style={caixaLeitura}>
              <span style={{ color: autoMvpDisplay.muted ? C.ink4 : C.ink }}>{autoMvpDisplay.text}</span>
            </div>
            <span style={{ display: "block", marginTop: 5, fontSize: 11, color: C.ink4 }}>
              Maior KDA; desempate por abates, assistências e menos mortes.
            </span>
          </div>
        </div>

        <BlockTitle
          right={
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <Button tone="ghost" small onClick={() => addStatsRowToGame(gameIndex)}>
                <Plus size={14} aria-hidden /> Linha
              </Button>
            </div>
          }
        >
          Estatísticas por jogador
        </BlockTitle>

        <div onWheelCapture={bloquearRoda}>
          <ScrollX>
            <div style={{ minWidth: LARGURA_MIN_STATS }}>
              {/* #4: as três caixas de número agora têm cabeçalho visível. */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: GRADE_STATS,
                  gap: 8,
                  padding: "0 8px 6px",
                }}
              >
                <ColunaTitulo>Jogador</ColunaTitulo>
                <ColunaTitulo>Campeão</ColunaTitulo>
                <ColunaTitulo center title="Abates">
                  A
                </ColunaTitulo>
                <ColunaTitulo center title="Mortes">
                  M
                </ColunaTitulo>
                <ColunaTitulo center title="Assistências">
                  As
                </ColunaTitulo>
                <ColunaTitulo center title="KDA calculado: (abates + assistências) ÷ mortes">
                  KDA
                </ColunaTitulo>
                <span />
              </div>

              <div style={{ display: "grid", gap: 6 }}>
                {game.statsByPlayer.length === 0 ? (
                  <LinhaVazia>
                    Nenhuma linha ainda. Use &quot;Preencher elenco&quot; para trazer os 10 jogadores na
                    ordem das rotas.
                  </LinhaVazia>
                ) : (
                  game.statsByPlayer.map((row, rowIndex) =>
                    renderStatsRow(gameIndex, row, rowIndex, estados[rowIndex] ?? "ok"),
                  )
                )}
              </div>
            </div>
          </ScrollX>
        </div>

        {selectedSeries.teamAId || selectedSeries.teamBId ? (
          <>
            <BlockTitle
              right={
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <Aviso escopo={`bans:${gameIndex}`} />
                  <Button tone="ghost" small onClick={() => addBanToGame(gameIndex)}>
                    <Plus size={14} aria-hidden /> Ban
                  </Button>
                </div>
              }
            >
              Campeões banidos
            </BlockTitle>

            {(game.bans ?? []).length === 0 ? (
              <LinhaVazia>Nenhum ban registrado neste jogo.</LinhaVazia>
            ) : (
              <ScrollX>
                <div style={{ minWidth: 360 }}>
                  <div style={{ display: "grid", gridTemplateColumns: GRADE_BANS, gap: 8, padding: "0 0 6px" }}>
                    <ColunaTitulo>Time</ColunaTitulo>
                    <ColunaTitulo>Campeão banido</ColunaTitulo>
                    <span />
                  </div>
                  <div style={{ display: "grid", gap: 6 }}>
                    {(game.bans ?? []).map((ban, banIndex) => (
                      <div
                        key={`g${gameIndex}-ban${banIndex}`}
                        style={{ display: "grid", gridTemplateColumns: GRADE_BANS, gap: 8, alignItems: "center" }}
                      >
                        <Select
                          ariaLabel={`Time do ban ${banIndex + 1}`}
                          value={ban.teamId}
                          onChange={(value) => updateBanField(gameIndex, banIndex, "teamId", value)}
                        >
                          <option value="">Time</option>
                          {selectedSeries.teamAId ? (
                            <option value={selectedSeries.teamAId}>
                              {getTeamName(draft, selectedSeries.teamAId)}
                            </option>
                          ) : null}
                          {selectedSeries.teamBId ? (
                            <option value={selectedSeries.teamBId}>
                              {getTeamName(draft, selectedSeries.teamBId)}
                            </option>
                          ) : null}
                        </Select>
                        <InputCampeao
                          ariaLabel={`Campeão banido ${banIndex + 1}`}
                          placeholder="Campeão banido"
                          value={ban.championName}
                          onChange={(valor) => updateBanField(gameIndex, banIndex, "championName", valor)}
                        />
                        <div style={{ display: "flex", justifyContent: "flex-end" }}>
                          <BotaoIcone
                            label={`Remover o ban ${banIndex + 1}`}
                            onClick={() => removeBanFromGame(gameIndex, banIndex)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </ScrollX>
            )}
          </>
        ) : null}
      </Card>
    );
  };

  let conteudoDosJogos: ReactNode = null;
  if (selectedSeries) {
    if (selectedSeriesIsWalkover) {
      conteudoDosJogos = (
        <LinhaVazia>
          {getWalkoverSummaryText(
            draft,
            selectedSeries.walkoverWinnerTeamId,
            selectedSeriesTargetWins,
            selectedSeries.walkoverReason,
          )}
        </LinhaVazia>
      );
    } else if (selectedSeries.games.length === 0) {
      conteudoDosJogos = <LinhaVazia>Nenhum jogo nesta série. Use &quot;Adicionar jogo&quot;.</LinhaVazia>;
    } else {
      conteudoDosJogos = selectedSeries.games.map((game, gameIndex) => renderGame(game, gameIndex));
    }
  }

  // -------------------------------------------------------------- editor da direita

  const placarSelecionado = selectedSeries ? getSeriesScore(selectedSeries, draft) : null;

  const editor = selectedSeries === null ? (
    <Empty
      title="Escolha uma série na lista"
      action={
        <Button tone="gold" onClick={createSeries}>
          <Plus size={15} aria-hidden /> Nova série
        </Button>
      }
    >
      À esquerda estão todas as séries do campeonato, da mais recente para a mais antiga. Clique em uma
      para lançar os jogos.
    </Empty>
  ) : (
    <Card padding={16} style={{ minWidth: 0 }}>
      {/* #40: o placar da série fica visível o tempo todo dentro do editor. */}
      <div style={{ display: "flex", gap: 14, alignItems: "flex-end", flexWrap: "wrap" }}>
        <div style={{ minWidth: 0, flex: "1 1 260px" }}>
          <div
            style={{
              display: "flex",
              gap: 6,
              fontSize: 10,
              letterSpacing: ".16em",
              textTransform: "uppercase",
              color: C.bronze,
            }}
          >
            <span>{getSeriesStageLabel(selectedSeries)}</span>
            <span aria-hidden>•</span>
            <span>{selectedSeriesFormatLabel}</span>
            <span aria-hidden>•</span>
            <span style={tabular}>{formatDateLabel(selectedSeries.date)}</span>
          </div>
          <p
            style={{
              margin: "8px 0 0",
              fontFamily: display,
              fontSize: "clamp(20px,2.6vw,28px)",
              lineHeight: 1.1,
              color: C.ink,
            }}
          >
            {getTeamName(draft, selectedSeries.teamAId)}{" "}
            <span style={{ color: C.bronzeHi, ...tabular }}>
              {placarSelecionado?.teamAWins}–{placarSelecionado?.teamBWins}
            </span>{" "}
            {getTeamName(draft, selectedSeries.teamBId)}
          </p>
          <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
            <Chip
              tone={
                selectedSeriesIsWalkover ? "warn" : getSeriesWinnerTeamId(selectedSeries, draft) ? "ok" : "neutro"
              }
            >
              {getSeriesStateLabel(
                selectedSeriesIsWalkover,
                Boolean(getSeriesWinnerTeamId(selectedSeries, draft)),
              )}
            </Chip>
            <Chip tone="neutro">
              {selectedSeries.games.length}/{selectedSeriesMaxGames} jogos
            </Chip>
          </div>
        </div>
        <Button tone="danger" small onClick={confirmDeleteSelectedSeries}>
          <Trash2 size={14} aria-hidden /> Excluir série
        </Button>
      </div>

      {auditoriaSelecionada && auditoriaSelecionada.bloqueios.length > 0 ? (
        <div style={{ marginTop: 16 }}>
          <Banner tone="danger" title="Esta série ainda não pode ser salva">
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {auditoriaSelecionada.bloqueios.slice(0, 6).map((texto) => (
                <li key={texto}>{texto}</li>
              ))}
              {auditoriaSelecionada.bloqueios.length > 6 ? (
                <li>+ {auditoriaSelecionada.bloqueios.length - 6} pendência(s)</li>
              ) : null}
            </ul>
          </Banner>
        </div>
      ) : null}

      <BlockTitle right={<Aviso escopo="identidade" />}>Identificação</BlockTitle>

      <div className="lob-2col">
        {renomeandoId ? (
          <div>
            <Field
              label="Novo ID da série"
              hint={`Link público: /partidas/${slugifyValue(idRascunho) || "…"}`}
            >
              <Input value={idRascunho} onChange={setIdRascunho} />
            </Field>
            {erroId ? (
              <p role="alert" style={{ margin: "6px 0 0", fontSize: 11.5, color: C.dangerSoft }}>
                {erroId}
              </p>
            ) : null}
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <Button tone="gold" small onClick={aplicarRenomeacao}>
                Aplicar novo ID
              </Button>
              <Button
                tone="ghost"
                small
                onClick={() => {
                  setRenomeandoId(false);
                  setErroId(null);
                }}
              >
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <div>
            {/* #5: o ID é a URL pública, então não se edita por acidente. */}
            <Field label="ID da série (vira o link público)" hint={`/partidas/${selectedSeries.id}`}>
              <div style={caixaLeitura}>{selectedSeries.id}</div>
            </Field>
            <div style={{ marginTop: 8 }}>
              <Button
                tone="ghost"
                small
                onClick={() => {
                  setIdRascunho(selectedSeries.id);
                  setErroId(null);
                  setRenomeandoId(true);
                }}
              >
                <Pencil size={14} aria-hidden /> Renomear ID…
              </Button>
            </div>
          </div>
        )}

        <Field label="Data">
          <Input
            type="date"
            value={selectedSeries.date?.slice(0, 10) ?? ""}
            onChange={(value) =>
              updateSelectedSeries((series) => {
                series.date = value;
              })
            }
          />
        </Field>
      </div>

      <BlockTitle right={<Aviso escopo="times" />}>Confronto</BlockTitle>

      <div className="lob-2col">
        <Field label="Time A">
          <Select value={selectedSeries.teamAId} onChange={(value) => trocarTimeDaSerie("A", value)}>
            <option value="">Selecione</option>
            {draft.teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Time B">
          <Select value={selectedSeries.teamBId} onChange={(value) => trocarTimeDaSerie("B", value)}>
            <option value="">Selecione</option>
            {draft.teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Etapa">
          <Select
            value={selectedSeries.stage ?? "REGULAR_SEASON"}
            onChange={(value) =>
              updateSelectedSeries((series) => {
                series.stage = value as SeriesStage;
              })
            }
          >
            <option value="REGULAR_SEASON">{getStageOptionLabel("REGULAR_SEASON")}</option>
            <option value="SEMIFINAL">{getStageOptionLabel("SEMIFINAL")}</option>
            <option value="FINAL">{getStageOptionLabel("FINAL")}</option>
          </Select>
        </Field>
        <Field label="Formato da série">
          <Select
            value={selectedSeriesFormat}
            onChange={(value) => updateSeriesFormat(value as SeriesFormat)}
          >
            <option value="BO3">{getFormatOptionLabel("BO3")}</option>
            <option value="BO5">{getFormatOptionLabel("BO5")}</option>
          </Select>
        </Field>
      </div>

      <BlockTitle>Resultado por W.O.</BlockTitle>
      <p style={{ margin: "0 0 12px", fontSize: 12, color: C.ink4 }}>
        Use quando a série não foi jogada: o placar vira {selectedSeriesTargetWins}-0 automático, sem stats
        de jogadores.
      </p>
      <div className="lob-2col">
        <Field label="Situação da série">
          <Select
            value={selectedSeries.walkoverWinnerTeamId ?? ""}
            onChange={(value) => updateWalkoverWinner(value)}
          >
            <option value="">Série jogada normalmente</option>
            {selectedSeries.teamAId ? (
              <option value={selectedSeries.teamAId}>
                W.O. para {getTeamName(draft, selectedSeries.teamAId)}
              </option>
            ) : null}
            {selectedSeries.teamBId ? (
              <option value={selectedSeries.teamBId}>
                W.O. para {getTeamName(draft, selectedSeries.teamBId)}
              </option>
            ) : null}
          </Select>
        </Field>
        <Field label="Observação do W.O. (opcional)">
          <Input
            disabled={!selectedSeriesIsWalkover}
            placeholder="Ex.: time não compareceu no horário"
            value={selectedSeries.walkoverReason ?? ""}
            onChange={(value) =>
              updateSelectedSeries((series) => {
                series.walkoverReason = value;
              })
            }
          />
        </Field>
      </div>

      <BlockTitle
        right={
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <Aviso escopo="cartinhas" />
            {/*
              O sorteio de verdade mora aqui. Os campos abaixo continuam existindo para
              CORRIGIR à mão — e agora toda correção manual entra no histórico, para a
              divergência entre o que foi sorteado e o que ficou gravado ficar visível.
            */}
            <Button tone="gold" small onClick={() => setSorteioAberto(true)}>
              Sortear ao vivo
            </Button>
            <Button tone="ghost" small onClick={addCardToSeries}>
              <Plus size={14} aria-hidden /> Cartinha
            </Button>
          </div>
        }
      >
        Cartinhas da série
      </BlockTitle>

      <SorteioAoVivo
        aberto={sorteioAberto}
        onFechar={() => setSorteioAberto(false)}
        serieId={selectedSeries.id}
        teamAId={selectedSeries.teamAId}
        teamBId={selectedSeries.teamBId}
        nomeDoTime={(id) => getTeamName(draft, id)}
        corDoTime={(id) => teamColor(id)}
        blueSideTeamId={selectedSeries.blueSideTeamId}
        cardsUsed={selectedSeries.cardsUsed}
        podeLados
        podeCartas
        onSorteado={({ tipo, blueSideTeamId, cardsUsed, versao, versaoLida, sorteios }) => {
          // Aplica no rascunho exatamente o que o servidor gravou, sem recarregar:
          // a recarga abre `window.confirm` quando há edição pendente e congelava a
          // roda na tela projetada — e, se passasse direto, descartaria em silêncio
          // o que o organizador estivesse editando.
          // A versão é atributo da LINHA no banco, não do documento — quem guarda é o
          // painel principal. Aqui só se repassa o que a rota informou.
          onVersaoDoServidor(versaoLida, versao);

          aplicarDoServidor((next) => {
            const serie = next.seriesMatches.find((row) => row.id === selectedSeries.id);
            if (!serie) return;

            /*
             * O HISTÓRICO acompanha nos DOIS tipos — lados e carta acrescentam registro.
             *
             * Os avisos de excluir/renomear série (e o de excluir time, que arrasta as
             * séries dele) leem `sorteios` DAQUI para prever a recusa do servidor. Sem
             * sincronizar, um sorteio feito nesta mesma sessão não aparecia no rascunho e
             * os avisos ficavam mudos justamente no dia de jogo: a pessoa excluía a série
             * achando que não havia histórico e só descobria no 403, com a série já fora
             * do rascunho e sem desfazer.
             *
             * Copia a lista inteira em vez de acrescentar, para não divergir de um
             * rascunho atrasado. O campo continua sendo propriedade do servidor: o PUT o
             * reancora a partir do que está gravado.
             */
            if (Array.isArray(sorteios)) {
              serie.sorteios = sorteios as NonNullable<SeriesMatch["sorteios"]>;
            }

            /*
             * Só o campo que ESTE sorteio mexeu.
             *
             * A rota responde sempre com os dois campos, inclusive o que ela não tocou —
             * num sorteio de LADOS ela devolve o `cardsUsed` que estava no servidor. Como
             * as cartinhas também são editáveis à mão neste painel e só chegam ao servidor
             * no "Salvar", espelhar os dois apagava do rascunho, sem aviso e sem desfazer,
             * as linhas que o organizador tinha acabado de montar. O caminho antigo
             * (recarregar tudo) ao menos PERGUNTAVA antes de descartar.
             */
            if (tipo === "lados") {
              if (blueSideTeamId) serie.blueSideTeamId = blueSideTeamId;
              else delete serie.blueSideTeamId;
            } else {
              // `cardsUsed` chega da rede com `cardId` solto como string. Conferir contra
              // as cartas conhecidas antes de gravar evita enfiar no rascunho um id que o
              // schema recusaria depois, na hora de salvar.
              const validas = cardsUsed.flatMap((uso) =>
                uso.cardId in CARDS_BY_ID ? [{ ...uso, cardId: uso.cardId as CardId }] : [],
              );
              /*
               * Lista vazia sobre campo AUSENTE tem de continuar ausente.
               *
               * `[]` e `undefined` são diferentes para o diff de autorização: gravar `[]`
               * onde o servidor não tem o campo cria uma mudança `series:cards` fantasma, e
               * quem tem só `series:sides` levava 403 ao salvar por um campo que nunca
               * tocou — sem outra saída além da recarga que descarta o rascunho.
               */
              if (validas.length === 0 && serie.cardsUsed === undefined) delete serie.cardsUsed;
              else serie.cardsUsed = validas;
            }
          });
        }}
      />

      {(selectedSeries.cardsUsed ?? []).length === 0 ? (
        <LinhaVazia>Nenhuma cartinha registrada nesta série.</LinhaVazia>
      ) : (
        <ScrollX>
          <div style={{ minWidth: 360, display: "grid", gap: 6 }}>
            <div style={{ display: "grid", gridTemplateColumns: GRADE_BANS, gap: 8 }}>
              <ColunaTitulo>Time</ColunaTitulo>
              <ColunaTitulo>Cartinha usada</ColunaTitulo>
              <span />
            </div>
            {(selectedSeries.cardsUsed ?? []).map((card, cardIndex) => (
              <div
                key={`card-${cardIndex}`}
                style={{ display: "grid", gridTemplateColumns: GRADE_BANS, gap: 8, alignItems: "center" }}
              >
                <Select
                  ariaLabel={`Time da cartinha ${cardIndex + 1}`}
                  value={card.teamId}
                  onChange={(value) => updateCardField(cardIndex, "teamId", value)}
                >
                  <option value="">Time</option>
                  {selectedSeries.teamAId ? (
                    <option value={selectedSeries.teamAId}>
                      {getTeamName(draft, selectedSeries.teamAId)}
                    </option>
                  ) : null}
                  {selectedSeries.teamBId ? (
                    <option value={selectedSeries.teamBId}>
                      {getTeamName(draft, selectedSeries.teamBId)}
                    </option>
                  ) : null}
                </Select>
                <Select
                  ariaLabel={`Cartinha ${cardIndex + 1}`}
                  value={card.cardId}
                  onChange={(value) => updateCardField(cardIndex, "cardId", value)}
                >
                  {CARD_OPTIONS.map((cardDef) => (
                    <option key={cardDef.id} value={cardDef.id}>
                      {cardDef.title}
                    </option>
                  ))}
                </Select>
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <BotaoIcone
                    label={`Remover a cartinha ${cardIndex + 1}`}
                    onClick={() => removeCardFromSeries(cardIndex)}
                  />
                </div>
              </div>
            ))}
          </div>
        </ScrollX>
      )}

      <BlockTitle
        right={
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <Aviso escopo="jogos" />
            <Button
              tone="gold"
              small
              disabled={selectedSeriesIsWalkover || selectedSeries.games.length >= selectedSeriesMaxGames}
              onClick={adicionarJogo}
            >
              <Plus size={14} aria-hidden /> Adicionar jogo
            </Button>
          </div>
        }
      >
        Jogos da série
      </BlockTitle>

      <p style={{ margin: "0 0 4px", fontSize: 12, color: C.ink4 }}>
        {getGamesSectionDescription(
          selectedSeriesIsWalkover,
          selectedSeriesFormatLabel,
          selectedSeriesMaxGames,
          selectedSeriesTargetWins,
        )}
      </p>

      <div>{conteudoDosJogos}</div>
    </Card>
  );

  // -------------------------------------------------------------- render

  return (
    <div className="lob-series">
      <style>{CSS_PAINEL}</style>
      <datalist id="champions-datalist">
        {CHAMPIONS.map((champion) => (
          <option key={champion.id} value={champion.name} />
        ))}
      </datalist>

      <SectionHead
        eyebrow="Resultados"
        title="Séries"
        description="Escolha a série na lista e lance jogo a jogo. O placar e o MVP são calculados sozinhos."
        actions={
          <>
            <Aviso escopo="topo" />
            <Button tone="gold" onClick={createSeries}>
              <Plus size={15} aria-hidden /> Nova série
            </Button>
          </>
        }
      />

      {/* #3: pendência aparece aqui ANTES de tentar salvar, com série e jogo por nome. */}
      {seriesComProblema.length > 0 ? (
        <Banner
          tone="danger"
          title={`${seriesComProblema.length} série(s) travariam o salvamento do painel`}
          actions={
            totalDescartaveis > 0 ? (
              <Button tone="ghost" small onClick={limparTodasAsLinhasVazias}>
                Descartar {totalDescartaveis} linha(s) em branco
              </Button>
            ) : undefined
          }
        >
          <div style={{ display: "grid", gap: 6 }}>
            {seriesComProblema.slice(0, 4).map((series) => {
              const auditoria = auditorias.get(series.id);
              return (
                <button
                  key={series.id}
                  type="button"
                  onClick={() => selecionarSerie(series.id)}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    padding: "6px 8px",
                    border: `1px solid ${C.line}`,
                    borderRadius: 3,
                    background: "rgba(0,0,0,.20)",
                    color: C.ink2,
                    fontFamily: "inherit",
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: C.ink }}>
                    <AlertTriangle size={13} aria-hidden />
                    {getTeamName(draft, series.teamAId)} x {getTeamName(draft, series.teamBId)}
                    <span style={{ color: C.ink4, ...tabular }}>({formatDateLabel(series.date)})</span>
                  </span>
                  <span style={{ display: "block", marginTop: 3, color: C.ink3 }}>
                    {auditoria?.bloqueios[0]}
                    {auditoria && auditoria.bloqueios.length > 1
                      ? ` (+${auditoria.bloqueios.length - 1})`
                      : ""}
                  </span>
                </button>
              );
            })}
            {seriesComProblema.length > 4 ? (
              <span style={{ fontSize: 12 }}>+ {seriesComProblema.length - 4} outra(s) série(s).</span>
            ) : null}
          </div>
        </Banner>
      ) : null}

      <div className="lob-series-grid">
        <Card padding={12} style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <h3 style={{ fontFamily: display, fontSize: 15, color: C.bronze, margin: 0 }}>
              Todas as séries
            </h3>
            <span style={{ fontSize: 11, color: C.ink4, marginLeft: "auto", ...tabular }}>
              {sortedSeries.length}
            </span>
          </div>
          <div className="lob-series-lista" style={{ display: "grid", gap: 6, paddingRight: 4 }}>
            {listaDeSeries}
          </div>
        </Card>

        <div style={{ minWidth: 0 }}>{editor}</div>
      </div>
    </div>
  );
}
