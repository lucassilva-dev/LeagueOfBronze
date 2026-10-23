"use client";

import { type CSSProperties, type ReactNode, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import { SorteioAoVivo } from "@/components/admin/sorteio-ao-vivo";
import { useCompacto } from "@/components/admin/responsivo";
import { IconeCarta, IconeCartas, SeloHex, type Icone } from "@/components/lob/icones";
import { RoleIcon, TeamMark } from "@/components/lob/ui";
import {
  AlertTriangle,
  Ban,
  CalendarClock,
  Check,
  ChevronDown,
  CloudDownload,
  Crown,
  Dices,
  Flag,
  Link2,
  Pencil,
  Plus,
  Shield,
  Swords,
  Trash2,
  Trophy,
  UserRound,
  UsersRound,
} from "lucide-react";

import {
  jogoDepoisDaDecisao,
  type CardId,
  type Player,
  type PlayerGameStats,
  type SeriesFormat,
  type SeriesGame,
  type SeriesStage,
  type SeriesMatch,
  type TournamentDataset,
} from "@/lib/schema";
import {
  elencoAtivo,
  estaNoElenco,
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
  jogosDeWalkoverDaSerie,
  linhaDeSubstituto,
  linhaJaGravada,
  linhaPrecisaDeTime,
  mvpDoJogo,
  placarComWalkover,
  reservasDoDataset,
  timeDaLinha,
  walkoverPermitido,
} from "@/lib/tournament";
import { avisosDeSubstituto, type AvisoDeSubstituto, type RegraDoSubstituto } from "@/lib/roster";
import { useRegraDoSubstituto } from "@/components/admin/regra-do-substituto";
import { formatDateLabel, formatSeriesDateLabel } from "@/lib/format";
import { resolveRole, roleIconUrl, teamColor } from "@/lib/design";
import {
  camposBrasiliaParaIso,
  createBlankGame,
  createBlankSeries,
  createBlankStatsRow,
  isoParaCamposBrasilia,
  slugifyValue,
  type MutateDraft,
} from "@/components/admin/shared";
import { CARD_OPTIONS, CARDS_BY_ID, CARTAS_ATIVAS, isDuplaCard } from "@/lib/cards";
import { CHAMPIONS } from "@/lib/champions";
import {
  Banner,
  BlockTitle,
  Button,
  C,
  Card,
  CartaoLinha,
  Chip,
  ChipFiltro,
  Empty,
  Field,
  Folha,
  Input,
  RolagemX,
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
 *
 * NO CELULAR (`useCompacto()`) o arranjo é outro, porque é lá que o resultado é lançado entre
 * uma rodada e outra:
 *  - a lista vira cartões de placar (logo, nome e vitórias de cada time, um embaixo do outro),
 *    com filtro de "em andamento" para achar o jogo que acabou de terminar;
 *  - o editor abre numa folha de tela cheia, com Excluir e Concluir presos no rodapé;
 *  - a grade de K/D/A — 620px que obrigavam a rolar de lado — vira um cartão por jogador,
 *    com abates, mortes e assistências lado a lado e o teclado numérico;
 *  - o vencedor do jogo é tocado num dos dois escudos, em vez de escolhido num select;
 *  - os jogos vêm antes dos dados da série: data, ID e W.O. mudam pouco, o placar muda a cada
 *    rodada. Só a série ainda sem os dois times abre com o Confronto em cima.
 * Toda a lógica (confirmações, auditoria, limpeza de linhas em branco) é a mesma dos dois
 * arranjos — muda só onde cada coisa fica.
 *
 * REGRA 6 e W.O. NO MEIO DA SÉRIE (decisões de 22/10/2026):
 *  - a linha de K/D/A pode ser de um SUBSTITUTO AVULSO (reserva sem time, ou titular de outro
 *    time cobrindo uma vaga): ela ganha "Jogou por", que grava o `teamId` da linha. Quem joga
 *    pelo próprio time fica sem ele, como sempre. Os pontos do substituto (regra 6) só viram
 *    AVISO — a organização aprova; nada trava;
 *  - o W.O. pode entrar numa série com jogos lançados: os jogos valem e o W.O. completa a
 *    série (`placarComWalkover`). Nada é apagado; só não cabe W.O. numa série que os jogos já
 *    decidiram — o servidor recusa, e o painel nem oferece.
 */

// ---------------------------------------------------------------- layout

/**
 * Regras que dependem de media query (não dá com estilo inline) e o realce de foco.
 * São classes próprias deste painel, não utilitárias do Tailwind.
 */
const CSS_PAINEL = `
.lob-series *:focus-visible{outline:2px solid ${C.bronzeHi};outline-offset:2px;border-radius:2px}
/* O cartão da lista do celular já desenha o anel em volta do cartão INTEIRO (globals.css). A
   regra de cima vem depois e empata em especificidade: sem esta, um segundo anel cercava só o
   título, por dentro do primeiro. */
.lob-series .adm-cartao__alvo:focus-visible{outline:none}
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

function getTeamName(dataset: TournamentDataset, teamId: string | undefined) {
  return dataset.teams.find((team) => team.id === teamId)?.name ?? teamId ?? "—";
}

/**
 * De onde o jogador é HOJE, em palavras: o time, "reserva" (sem time) ou o time com a marca
 * de quem saiu de vez — que continua no dataset, com o time, por causa do histórico.
 */
function ondeEstaHoje(dataset: TournamentDataset, player: Player) {
  if (player.teamId === undefined) return "reserva (sem time)";
  const time = getTeamName(dataset, player.teamId);
  return player.saiuEm ? `${time}, saiu do time` : time;
}

function getFormatOptionLabel(format: SeriesFormat) {
  return format === "BO5" ? "MD5" : "MD3";
}

function getStageOptionLabel(stage: SeriesStage) {
  if (stage === "SEMIFINAL") return "Semifinal";
  if (stage === "FINAL") return "Final";
  return "Fase regular";
}

/**
 * Formato que o regulamento prevê para cada etapa: só a final é MD5.
 *
 * Trocar a Etapa só mudava `stage`. Uma série nova nasce MD3 (formato do torneio), então a
 * FINAL criada no painel ficava MD3 — e com 2x0 o site já declarava campeão no meio de
 * uma MD5. A etapa agora puxa o formato; o select de formato continua editável depois.
 */
export function formatoDaEtapa(stage: SeriesStage): SeriesFormat {
  return stage === "FINAL" ? "BO5" : "BO3";
}

/**
 * Opções do select de cartinha de UMA linha.
 *
 * Carta retirada (a INVASÃO DA YUUMI saiu na 4ª) fica desabilitada para ninguém registrá-la
 * numa série nova — EXCETO a que já está nesta linha: uma série da 3ª que usou a Yuumi tem
 * de continuar abrindo com o registro certo. Se a opção gravada viesse desabilitada, o
 * navegador mostraria outra carta selecionada e o histórico pareceria errado.
 */
export function opcoesDeCartinha(cardIdDaLinha: string) {
  return CARD_OPTIONS.map((opcao) => ({
    ...opcao,
    disabled: CARDS_BY_ID[opcao.id]?.retirada === true && opcao.id !== cardIdDaLinha,
  }));
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
  return `${resolveRole(player.role1).short} · ${player.nick} — ${ondeEstaHoje(dataset, player)}`;
}

/**
 * Linha de quem não está em nenhuma das listas do select — em geral, troca de time feita
 * depois da série. Pelo nick e por onde ele está hoje: o id cru ("player-1729...") não dizia
 * quem era.
 */
function rotuloForaDaSerie(dataset: TournamentDataset, playerId: string) {
  const jogador = dataset.players.find((player) => player.id === playerId);
  if (!jogador) return `${playerId} (fora do cadastro)`;
  return jogador.teamId === undefined
    ? `${jogador.nick} (reserva, sem time)`
    : `${jogador.nick} (hoje em ${ondeEstaHoje(dataset, jogador)})`;
}

/**
 * As opções de jogador de uma linha, em grupos: os titulares de HOJE dos dois times, na ordem
 * das rotas (é a ordem do print), e depois quem pode entrar como substituto avulso — os
 * reservas e os titulares de outros times — e quem já saiu de vez de um dos dois (para lançar
 * jogo antigo, de antes da saída).
 */
type OpcoesDeJogador = {
  teamAPlayers: Player[];
  teamBPlayers: Player[];
  /** Os dez titulares de hoje: é o que "Preencher elenco" traz. */
  combined: Player[];
  reservas: Player[];
  sairam: Player[];
  outrosTimes: Player[];
  todos: Player[];
};

function opcoesDeJogador(dataset: TournamentDataset, series: SeriesMatch | null): OpcoesDeJogador {
  if (!series) {
    return { teamAPlayers: [], teamBPlayers: [], combined: [], reservas: [], sairam: [], outrosTimes: [], todos: [] };
  }
  const teamAPlayers = series.teamAId ? ordenarPorRota(elencoAtivo(dataset, series.teamAId)) : [];
  const teamBPlayers = series.teamBId ? ordenarPorRota(elencoAtivo(dataset, series.teamBId)) : [];
  const doConfronto = (player: Player) =>
    player.teamId !== undefined && (player.teamId === series.teamAId || player.teamId === series.teamBId);
  const reservas = ordenarPorRota(reservasDoDataset(dataset));
  const sairam = ordenarPorRota(dataset.players.filter((player) => doConfronto(player) && !estaNoElenco(player)));
  const outrosTimes = ordenarPorRota(
    dataset.players.filter((player) => estaNoElenco(player) && !doConfronto(player)),
  );
  const combined = [...teamAPlayers, ...teamBPlayers];
  return {
    teamAPlayers,
    teamBPlayers,
    combined,
    reservas,
    sairam,
    outrosTimes,
    todos: [...combined, ...reservas, ...sairam, ...outrosTimes],
  };
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

/** "jogo 3" / "jogos 2 e 3" / "jogos 3, 4 e 5". */
function listaDeJogos(numeros: number[]) {
  if (numeros.length === 1) return `jogo ${numeros[0]}`;
  return `jogos ${numeros.slice(0, -1).join(", ")} e ${numeros.at(-1)}`;
}

/**
 * O resumo do W.O. com o placar OFICIAL ("jogos valem, W.O. completa"): sem jogo, 2-0 (MD5:
 * 3-0), como sempre; com jogos lançados, as vitórias deles mais os jogos de W.O. — A venceu o
 * jogo 1 e B abandonou: 2-0, com o jogo 2 por W.O.; B venceu o jogo 1 e A leva o W.O.: 2-1.
 */
function getWalkoverSummaryText(dataset: TournamentDataset, series: SeriesMatch) {
  const winnerTeamId = series.walkoverWinnerTeamId;
  const teamName = getTeamName(dataset, winnerTeamId ?? "");
  const reasonLabel = series.walkoverReason ? ` • ${series.walkoverReason}` : "";
  const placar = placarComWalkover(series, getSeriesTargetWins(series, dataset));
  const placarDoVencedor =
    winnerTeamId === series.teamBId ? `${placar.teamBWins}-${placar.teamAWins}` : `${placar.teamAWins}-${placar.teamBWins}`;

  if (series.games.length === 0) {
    return `Série encerrada por W.O. com placar automático de ${placarDoVencedor} para ${teamName}${reasonLabel}`;
  }
  const deWalkover = jogosDeWalkoverDaSerie(series, dataset).map((jogo) => jogo.gameIndex);
  const disputados =
    series.games.length === 1 ? "O jogo disputado vale" : `Os ${series.games.length} jogos disputados valem`;
  const porWalkover =
    deWalkover.length > 0 ? `${listaDeJogos(deWalkover)} por W.O., sem K/D/A nem MVP` : "nenhum jogo por W.O.";
  return (
    `W.O. para ${teamName} no meio da série: ${placarDoVencedor} para ${teamName}. ` +
    `${disputados} (K/D/A e MVP); ${porWalkover}${reasonLabel}`
  );
}

function getGamesSectionDescription(
  isWalkover: boolean,
  formatLabel: string,
  maxGames: number,
  targetWins: number,
) {
  if (isWalkover) {
    return "Série encerrada por W.O.: os jogos já disputados valem (K/D/A e MVP) e o W.O. completa a série. Para lançar mais um jogo disputado, volte a série para “jogada normalmente” — os jogos ficam.";
  }

  return `${formatLabel} com até ${maxGames} jogos. A série fecha quando um time alcançar ${targetWins} vitórias.`;
}

// ---------------------------------------------------------------- auditoria do rascunho

/**
 * #3 da auditoria: uma linha em branco derrubava o salvamento do painel inteiro com um erro
 * técnico por índice de array. Aqui o problema é detectado ANTES, com nome de série e número
 * de jogo, e a linha totalmente vazia (que nunca é intencional) pode ser descartada de uma vez.
 */
/**
 * "incompleta" = números digitados sem jogador (o servidor recusa). "sem-campeao" e
 * "forasteira" são só AVISO: o servidor aceita, e tratá-los como bloqueio levava a pessoa a
 * apagar estatística histórica de quem trocou de time depois (ver `auditarSerie`).
 *
 * Regra 6 (substituto avulso): "sem-time" = linha do RESERVA (jogador sem time) que não diz
 * por qual time ele jogou; "time-fora" = linha que diz um time que não disputa a série;
 * "sem-jogou-por" = linha NOVA (não gravada igual nesta série) de titular de OUTRO time sem
 * "Jogou por" — o substituto avulso esquecido. Os três o servidor recusa. "forasteira" fica
 * só para a linha que já estava gravada: a história de quem trocou de time depois.
 */
type EstadoLinha =
  | "ok"
  | "vazia"
  | "incompleta"
  | "sem-campeao"
  | "repetida"
  | "forasteira"
  | "sem-time"
  | "sem-jogou-por"
  | "time-fora";

/** Estados que travam o salvamento (o servidor recusa). Os outros só pedem conferência. */
function linhaTrava(estado: EstadoLinha) {
  return (
    estado === "incompleta" ||
    estado === "repetida" ||
    estado === "sem-time" ||
    estado === "sem-jogou-por" ||
    estado === "time-fora"
  );
}

/** O motivo do estado da linha, para o `title` (monitor) e o texto do cartão (celular). */
function motivoDaLinha(estado: EstadoLinha): string | null {
  switch (estado) {
    case "incompleta":
      return "Falta escolher o jogador.";
    case "repetida":
      return "Este jogador já está em outra linha deste jogo.";
    case "forasteira":
      return "Jogador hoje não está em nenhum dos dois times da série. Se ele cobriu uma vaga como substituto, escolha o time em “Jogou por”; se jogou por outro time e trocou depois, está certo.";
    case "sem-time":
      return "Reserva (sem time): escolha em “Jogou por” o time que ele cobriu neste jogo.";
    case "sem-jogou-por":
      return "Titular de outro time: escolha em “Jogou por” o time que ele cobriu neste jogo.";
    case "time-fora":
      return "“Jogou por” aponta para um time que não disputa esta série.";
    case "sem-campeao":
      return "Falta o campeão.";
    case "vazia":
      return "Linha em branco — será descartada.";
    default:
      return null;
  }
}

/** Estados que pedem conferência sem travar. */
function linhaAvisa(estado: EstadoLinha) {
  return estado === "sem-campeao" || estado === "forasteira";
}

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

/**
 * Jogo que ninguém lançou: sem vencedor, sem ban e só com linhas descartáveis (o "Adicionar
 * jogo" sem nada digitado). Duração não conta — o jogo novo já nasce com 30 minutos.
 */
function jogoEmBranco(game: SeriesGame) {
  return !game.winnerTeamId && (game.bans?.length ?? 0) === 0 && game.statsByPlayer.every(isLinhaDescartavel);
}

function getEstadosDasLinhas(
  rows: PlayerGameStats[],
  series: SeriesMatch,
  idsDoConfronto: Set<string>,
  jogadoresPorId: ReadonlyMap<string, Player>,
  gravada: SeriesMatch | undefined,
): EstadoLinha[] {
  const vistos = new Set<string>();

  return rows.map((row) => {
    if (isLinhaDescartavel(row)) return "vazia";

    const playerId = row.playerId.trim();
    const champion = (row.champion ?? "").trim();
    if (!playerId) return "incompleta";
    if (vistos.has(playerId)) return "repetida";

    vistos.add(playerId);
    const jogador = jogadoresPorId.get(playerId);
    // A linha com time próprio (substituto avulso) conta para ESSE time: o que importa é ele
    // estar na série, não onde o jogador está hoje.
    if (row.teamId !== undefined) {
      if (row.teamId !== series.teamAId && row.teamId !== series.teamBId) return "time-fora";
    } else if (jogador && jogador.teamId === undefined) {
      return "sem-time";
    } else if (
      jogador &&
      series.teamAId &&
      series.teamBId &&
      linhaPrecisaDeTime(jogador, series) &&
      !linhaJaGravada(row, gravada)
    ) {
      // A mesma regra do PUT (`problemasDeLinhaSemTime`): linha nova de titular de outro time
      // sem "Jogou por" sumiria das duas colunas da partida e contaria para o time dele.
      return "sem-jogou-por";
    } else if (idsDoConfronto.size > 0 && !idsDoConfronto.has(playerId)) {
      return "forasteira";
    }
    if (!champion) return "sem-campeao";
    return "ok";
  });
}

type AuditoriaSerie = {
  bloqueios: string[];
  /**
   * Não travam o salvamento — o servidor aceita —, mas quase sempre são engano que muda
   * resultado: campeão declarado cedo demais ou pontos a mais na tabela. Inclui o aviso de
   * pontos do substituto (regra 6), que a organização aprova.
   */
  avisos: string[];
  estadosPorJogo: EstadoLinha[][];
  jogosComProblema: number[];
  descartaveis: number;
  /** O aviso de pontos de cada substituto avulso, por jogo (vazio sem a regra). */
  substitutosPorJogo: AvisoDeSubstituto[][];
};

/**
 * O texto do aviso da regra 6 para um substituto. Os pontos são do PAINEL (a organização
 * decide): não vão para o rascunho nem para página nenhuma.
 */
function textoDoAvisoDeSubstituto(draft: TournamentDataset, aviso: AvisoDeSubstituto) {
  const time = getTeamName(draft, aviso.teamId);
  if (aviso.motivo === "sem_preco") {
    return (
      `${aviso.nick} cobriu ${time}, mas não há preço para comparar com os titulares que ficaram de fora ` +
      `(inscrição com outro Riot ID ou elo que o site não reconhece). Confira a regra 6 à mão.`
    );
  }
  const valores =
    aviso.pontos !== null && aviso.teto !== null
      ? `${aviso.pontos} ponto(s), acima de ${aviso.teto} (o titular de fora mais caro)`
      : "mais que os titulares que ficaram de fora";
  return `${aviso.nick} cobriu ${time} valendo ${valores}. Pela regra 6, a troca precisa da aprovação da organização.`;
}

function etapaDa(series: SeriesMatch): SeriesStage {
  return series.stage ?? "REGULAR_SEASON";
}

/** Mesmo par de times, em qualquer ordem (A x B e B x A são o mesmo confronto). */
function mesmoConfronto(a: SeriesMatch, b: SeriesMatch) {
  return (
    (a.teamAId === b.teamAId && a.teamBId === b.teamBId) ||
    (a.teamAId === b.teamBId && a.teamBId === b.teamAId)
  );
}

/**
 * Etapa x formato x tabela. Vale também para W.O.: uma série de Fase regular por W.O. soma
 * pontos do mesmo jeito.
 */
function avisosDaEtapa(series: SeriesMatch, draft: TournamentDataset): string[] {
  const avisos: string[] = [];
  const etapa = etapaDa(series);
  const formato = getSeriesFormat(series, draft);

  if (etapa === "FINAL" && formato !== "BO5") {
    avisos.push(
      `Final em ${getFormatOptionLabel(formato)}: com 2 vitórias o site já declara o campeão. ` +
        `A final é MD5 — ajuste o formato da série.`,
    );
  }
  if (etapa === "SEMIFINAL" && formato !== "BO3") {
    avisos.push(`Semifinal em ${getFormatOptionLabel(formato)}: o regulamento prevê MD3 — ajuste o formato da série.`);
  }

  // Pontos corridos é um turno só: o mesmo par duas vezes na Fase regular é, quase sempre,
  // semifinal ou final criada sem trocar a Etapa — e ela entraria na tabela como mais uma
  // série valendo pontos, mexendo na classificação que define quem vai para a semifinal.
  if (etapa === "REGULAR_SEASON" && series.teamAId && series.teamBId && series.teamAId !== series.teamBId) {
    const repetida = draft.seriesMatches.find(
      (outra) => outra.id !== series.id && etapaDa(outra) === "REGULAR_SEASON" && mesmoConfronto(outra, series),
    );
    if (repetida) {
      const pontos = draft.tournament.seriesPointsRule.win;
      avisos.push(
        `${getTeamName(draft, series.teamAId)} x ${getTeamName(draft, series.teamBId)} já tem outra série de ` +
          `Fase regular (${formatSeriesDateLabel(repetida.date)}). Se esta é semifinal ou final, troque a ` +
          `Etapa: como Fase regular ela soma ${pontos} ponto(s) na tabela.`,
      );
    }
  }

  return avisos;
}

/**
 * O que trava (`bloqueios`) e o que só pede conferência (`avisos`) numa série do rascunho.
 *
 * Bloqueio é SÓ o que o servidor recusa — a lista existe para a pessoa resolver antes de
 * salvar, e um bloqueio que o servidor não faz é pior que nenhum: induz a apagar dado bom
 * (a linha de quem trocou de time depois, por exemplo). Tudo que o servidor aceita, mas
 * quase sempre é engano, vira aviso.
 *
 * `gravada` é a mesma série como está no servidor: o jogo lançado depois de a série estar
 * decidida só TRAVA quando o rascunho piora o que está gravado — a mesma regra do PUT. A
 * `serie-14` da 3ª já tem um 3º jogo depois de 2x0 e precisa continuar editável.
 *
 * W.O. no meio da série: a série com W.O. continua tendo os jogos auditados — eles VALEM, e
 * o servidor os valida do mesmo jeito. O W.O. numa série que os jogos já decidiram trava
 * (o servidor recusa).
 *
 * `regra` é a regra 6 (pontos do substituto, de `useRegraDoSubstituto`): com ela, cada
 * substituto avulso acima do teto vira AVISO; `null` = não deu para ler os preços, e o aviso
 * pede a conferência à mão; ausente = não confere pontos (uso isolado, testes antigos).
 */
export function auditarSerie(
  series: SeriesMatch,
  draft: TournamentDataset,
  gravada?: SeriesMatch,
  regra?: RegraDoSubstituto | null,
): AuditoriaSerie {
  const bloqueios: string[] = [];
  const avisos = avisosDaEtapa(series, draft);
  const estadosPorJogo: EstadoLinha[][] = [];
  const jogosComProblema: number[] = [];
  const substitutosPorJogo: AvisoDeSubstituto[][] = [];
  let descartaveis = 0;

  if (!series.teamAId || !series.teamBId) {
    bloqueios.push("Falta escolher o Time A e/ou o Time B.");
  } else if (series.teamAId === series.teamBId) {
    bloqueios.push("Time A e Time B são o mesmo time.");
  }

  // Cartinha vale também para série de W.O.: o schema confere o time de cada uma.
  (series.cardsUsed ?? []).forEach((carta, indice) => {
    if (!carta.teamId.trim()) bloqueios.push(`Cartinha ${indice + 1}: falta escolher o time.`);
  });

  if (isWalkoverSeries(series)) {
    const vencedor = series.walkoverWinnerTeamId;
    if (vencedor !== series.teamAId && vencedor !== series.teamBId) {
      bloqueios.push("O vencedor do W.O. não é nenhum dos dois times da série.");
    } else if (!walkoverPermitido(series, draft)) {
      const soOsJogos = placarComWalkover({ ...series, walkoverWinnerTeamId: undefined }, getSeriesTargetWins(series, draft));
      bloqueios.push(
        `A série já estava decidida pelos jogos lançados (${soOsJogos.teamAWins}x${soOsJogos.teamBWins}): ` +
          `não cabe W.O. Volte a série para “jogada normalmente” ou corrija o vencedor dos jogos.`,
      );
    }
  }

  const maxGames = getSeriesMaxGames(series, draft);
  if (series.games.length > maxGames) {
    bloqueios.push(
      `${getSeriesFormatLabel(series, draft)} aceita no máximo ${maxGames} jogos (esta série tem ${series.games.length}).`,
    );
  }

  const depoisDaDecisao = jogoDepoisDaDecisao(series, draft.tournament.format);
  if (depoisDaDecisao) {
    const jaHavia = gravada ? (jogoDepoisDaDecisao(gravada, draft.tournament.format)?.quantidade ?? 0) : 0;
    const texto =
      `Jogo ${depoisDaDecisao.jogo} lançado depois de a série estar decidida ` +
      `(${depoisDaDecisao.placarA}x${depoisDaDecisao.placarB} no jogo ${depoisDaDecisao.jogo - 1}). ` +
      `Apague esse jogo ou corrija o vencedor dos anteriores.`;
    if (depoisDaDecisao.quantidade > jaHavia) {
      bloqueios.push(texto);
      jogosComProblema.push(depoisDaDecisao.jogo - 1);
    } else {
      avisos.push(texto);
    }
  }

  const nomeA = getTeamName(draft, series.teamAId);
  const nomeB = getTeamName(draft, series.teamBId);
  const idsDoConfronto = new Set(
    draft.players
      .filter(
        (player) =>
          player.teamId !== undefined && (player.teamId === series.teamAId || player.teamId === series.teamBId),
      )
      .map((player) => player.id),
  );
  const jogadoresPorId = new Map(draft.players.map((player) => [player.id, player]));

  series.games.forEach((game, gameIndex) => {
    const estados = getEstadosDasLinhas(game.statsByPlayer, series, idsDoConfronto, jogadoresPorId, gravada);
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

    if (game.durationMin !== undefined && game.durationMin < 1) {
      bloqueios.push(`${jogo}: a duração precisa ser maior que 0 (ou fique em branco).`);
      temProblema = true;
    }

    (game.bans ?? []).forEach((ban, banIndex) => {
      const faltaTime = !ban.teamId.trim();
      const faltaCampeao = !ban.championName.trim();
      if (!faltaTime && !faltaCampeao) return;
      const falta = faltaTime && faltaCampeao ? "o time e o campeão" : faltaTime ? "o time" : "o campeão";
      bloqueios.push(`${jogo}, ban ${banIndex + 1}: falta ${falta}.`);
      temProblema = true;
    });

    estados.forEach((estado, rowIndex) => {
      const linha = `${jogo}, linha ${rowIndex + 1}`;
      const row = game.statsByPlayer[rowIndex];
      if (estado === "incompleta") {
        bloqueios.push(`${linha}: falta escolher o jogador.`);
        temProblema = true;
      } else if (estado === "repetida") {
        bloqueios.push(`${linha}: o mesmo jogador aparece duas vezes.`);
        temProblema = true;
      } else if (estado === "sem-time") {
        const nick = (row && jogadoresPorId.get(row.playerId)?.nick) ?? row?.playerId ?? "";
        bloqueios.push(
          `${linha}: ${nick} é reserva (sem time) — escolha em “Jogou por” o time que ele cobriu (${nomeA} ou ${nomeB}).`,
        );
        temProblema = true;
      } else if (estado === "sem-jogou-por") {
        const jogador = row ? jogadoresPorId.get(row.playerId) : undefined;
        const nick = jogador?.nick ?? row?.playerId ?? "";
        bloqueios.push(
          `${linha}: ${nick} é de ${jogador ? ondeEstaHoje(draft, jogador) : "outro time"}, que não disputa esta série — escolha em “Jogou por” o time que ele cobriu (${nomeA} ou ${nomeB}).`,
        );
        temProblema = true;
      } else if (estado === "time-fora") {
        const nick = (row && jogadoresPorId.get(row.playerId)?.nick) ?? row?.playerId ?? "";
        bloqueios.push(
          `${linha}: “Jogou por” de ${nick} aponta para ${getTeamName(draft, row?.teamId)}, que não disputa esta série — escolha ${nomeA} ou ${nomeB}.`,
        );
        temProblema = true;
      } else if (estado === "forasteira") {
        const jogador = row ? jogadoresPorId.get(row.playerId) : undefined;
        if (!jogador) {
          // Id que não existe mais no cadastro: isso o servidor recusa.
          bloqueios.push(`${linha}: o jogador ${row?.playerId ?? ""} não existe mais no cadastro.`);
          temProblema = true;
        } else {
          // Duas histórias possíveis, e o servidor aceita as duas: o jogador trocou de time
          // DEPOIS desta série (a linha é história — apagar mudaria estatística e MVP), ou
          // cobriu uma vaga como substituto e falta dizer por qual time (regra 6).
          avisos.push(
            `${linha}: ${jogador.nick} hoje está em ${ondeEstaHoje(draft, jogador)} (não em ${nomeA} nem em ${nomeB}). Se ele jogou esta série por outro time, está certo — não apague. Se cobriu uma vaga como substituto, escolha o time em “Jogou por”.`,
          );
        }
      } else if (estado === "sem-campeao") {
        avisos.push(`${linha}: falta o campeão.`);
      }
    });

    // Regra 6: o substituto vale pontos iguais ou menores que o titular substituído. Só
    // AVISO — a organização aprova a exceção; o servidor aceita de qualquer jeito.
    const substitutos =
      regra && series.teamAId && series.teamBId ? avisosDeSubstituto(game, draft, regra) : [];
    substitutosPorJogo.push(substitutos);
    for (const aviso of substitutos) avisos.push(`${jogo}: ${textoDoAvisoDeSubstituto(draft, aviso)}`);
    if (regra === null) {
      const avulsos = game.statsByPlayer.filter((linha) => {
        const jogador = jogadoresPorId.get(linha.playerId);
        return Boolean(jogador) && linhaDeSubstituto(linha, jogador);
      });
      for (const linha of avulsos) {
        const nick = jogadoresPorId.get(linha.playerId)?.nick ?? linha.playerId;
        avisos.push(
          `${jogo}: ${nick} jogou como substituto por ${getTeamName(draft, linha.teamId)}, e não deu para ler os pontos ` +
            `das inscrições (sem acesso ou sem rede). Confira a regra 6 à mão.`,
        );
      }
    }

    // O MVP automático sai da melhor linha com jogador cadastrado (é o que o painel envia);
    // sem nenhuma, vale o MVP gravado. Sem os dois, o servidor recusa.
    const temLinhaParaMvp = game.statsByPlayer.some(
      (linha) => linha.playerId.trim() !== "" && jogadoresPorId.has(linha.playerId),
    );
    const mvpGravadoValido = Boolean(game.mvpPlayerId) && jogadoresPorId.has(game.mvpPlayerId);
    if (!temLinhaParaMvp && !mvpGravadoValido) {
      bloqueios.push(`${jogo}: nenhuma linha de K/D/A válida — sem isso o MVP não é calculado.`);
      temProblema = true;
    }

    if (temProblema && !jogosComProblema.includes(gameIndex)) jogosComProblema.push(gameIndex);
  });

  return { bloqueios, avisos, estadosPorJogo, jogosComProblema, descartaveis, substitutosPorJogo };
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
      /** Quem pode ter entrado como substituto avulso: reservas e titulares de outros times. */
      substitutos: Player[];
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

  // Todos do time, inclusive quem saiu de vez: o jogo importado pode ser de antes da saída.
  const teamAPlayers = draft.players.filter((player) => player.teamId === series.teamAId);
  const teamBPlayers = draft.players.filter((player) => player.teamId === series.teamBId);

  if (teamAPlayers.length === 0 || teamBPlayers.length === 0) {
    return {
      ok: false,
      error: "Os dois times precisam ter jogadores cadastrados para importar a partida da Riot.",
    };
  }

  const substitutos = draft.players.filter(
    (player) => player.teamId !== series.teamAId && player.teamId !== series.teamBId,
  );
  return { ok: true, teamAPlayers, teamBPlayers, substitutos };
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

/**
 * Casa cada participante com um jogador: primeiro no elenco do lado dele; sem casar, entre os
 * substitutos possíveis (reserva, titular de outro time) — e aí a linha ganha o `teamId` do
 * lado em que ele jogou, como o "Jogou por" do lançamento à mão (regra 6).
 */
function mapImportedStatsByPlayer(
  teamAParticipants: RiotImportedParticipant[],
  teamAPlayers: Player[],
  teamBParticipants: RiotImportedParticipant[],
  teamBPlayers: Player[],
  lados: Readonly<{ teamAId: string; teamBId: string; substitutos: Player[] }>,
): ImportedStatsMappingResult {
  const usedPlayerIds = new Set<string>();
  const statsByPlayer: PlayerGameStats[] = [];
  const unmatched: string[] = [];

  const mapSideParticipants = (participants: RiotImportedParticipant[], roster: Player[], teamId: string) => {
    for (const participant of participants) {
      const doElenco = choosePlayerForParticipant(participant, roster, usedPlayerIds);
      const mappedPlayer = doElenco ?? choosePlayerForParticipant(participant, lados.substitutos, usedPlayerIds);
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
        ...(doElenco === null && teamId ? { teamId } : {}),
      });
    }
  };

  mapSideParticipants(teamAParticipants, teamAPlayers, lados.teamAId);
  mapSideParticipants(teamBParticipants, teamBPlayers, lados.teamBId);

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

/**
 * O MVP que o SITE vai mostrar: o da melhor linha entre quem jogou por um dos dois times —
 * pela linha, então o substituto avulso pode ser MVP (`mvpDoJogo`).
 */
function getAutoMvpDisplay(
  game: SeriesMatch["games"][number],
  series: SeriesMatch,
  playersById: ReadonlyMap<string, Player>,
) {
  const autoMvpPlayerId = mvpDoJogo({ ...game, mvpPlayerId: "" }, series, playersById);
  const autoMvpPlayer = playersById.get(autoMvpPlayerId) ?? null;

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
    { teamAId: series.teamAId, teamBId: series.teamBId, substitutos: rosters.substitutos },
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

/** O servidor exige `riot:import` na rota da Riot: sem ele o botão só entregaria um 403. */
const SEM_PERMISSAO_RIOT = "Falta a permissão: Importar partida pela Riot. Peça a quem administra as contas.";

/** Invólucro do botão "Sortear ao vivo" no celular — para devolver o foco a ele (ver `sorteioAoVivo`). */
const ID_SORTEIO_COMPACTO = "lob-series-sortear-compacto";

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

/**
 * Botão só de ícone: o nome acessível vem do texto escondido, não de um aria-label solto.
 * No celular vira um quadrado de 44px — a lixeira de 32px ao lado de um campo era alvo
 * fácil de errar com o polegar, e errar aqui apaga uma linha digitada.
 */
function BotaoIcone({
  onClick,
  label,
  disabled,
  tone = "ghost",
}: Readonly<{ onClick: () => void; label: string; disabled?: boolean; tone?: "ghost" | "danger" }>) {
  const compacto = useCompacto();
  return (
    <Button
      tone={tone}
      small
      onClick={onClick}
      disabled={disabled}
      title={label}
      style={compacto ? { padding: 0, width: 44, minHeight: 44, flexShrink: 0 } : { padding: "7px 8px" }}
    >
      <Trash2 size={compacto ? 17 : 14} aria-hidden />
      <span style={soLeitores}>{label}</span>
    </Button>
  );
}

/**
 * Campo de campeão com sugestões do datalist. Fica local (e não em ui.tsx) porque o `Input`
 * do kit não carrega `list` — e só esta tela precisa disso. O visual é o mesmo do kit,
 * inclusive no celular: 16px de fonte para o iPhone não dar zoom ao focar.
 */
function InputCampeao({
  value,
  onChange,
  ariaLabel,
  placeholder,
}: Readonly<{ value: string; onChange: (v: string) => void; ariaLabel: string; placeholder: string }>) {
  const compacto = useCompacto();
  return (
    <input
      aria-label={ariaLabel}
      placeholder={placeholder}
      list="champions-datalist"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      // Nome de campeão não é palavra do dicionário: o corretor do celular trocava "Zed" por "Zé".
      autoCorrect={compacto ? "off" : undefined}
      autoCapitalize={compacto ? "words" : undefined}
      spellCheck={compacto ? false : undefined}
      style={{
        width: "100%",
        minWidth: 0,
        padding: compacto ? "11px 12px" : "9px 11px",
        minHeight: compacto ? 44 : undefined,
        fontFamily: "inherit",
        fontSize: compacto ? 16 : 13,
        color: C.ink,
        background: "rgba(0,0,0,.34)",
        border: `1px solid ${C.line}`,
        borderRadius: 3,
      }}
    />
  );
}

// ---------------------------------------------------------------- peças do celular

type Time = TournamentDataset["teams"][number];

/** Rótulo miúdo em caixa-alta — o mesmo desenho do rótulo do `Field`, para campo que não é <label>. */
const rotuloMiudo: CSSProperties = {
  display: "block",
  fontSize: 10,
  letterSpacing: ".16em",
  textTransform: "uppercase",
  color: C.bronze,
  marginBottom: 6,
};

/**
 * Logo do time (ou o losango da cor dele, quando não há logo). Time ainda não escolhido sai
 * como um escudo tracejado: o lugar fica marcado sem fingir que já existe um time ali.
 * Decorativo — o nome do time está sempre escrito ao lado.
 */
function MarcaDoTime({ time, tamanho = 24 }: Readonly<{ time?: Time | null; tamanho?: number }>) {
  if (!time) {
    return (
      <span
        aria-hidden
        style={{
          width: tamanho,
          height: tamanho,
          display: "inline-grid",
          placeItems: "center",
          flexShrink: 0,
          color: C.ink4,
          border: `1px dashed ${C.line2}`,
          borderRadius: 4,
        }}
      >
        <Shield size={Math.round(tamanho * 0.55)} aria-hidden />
      </span>
    );
  }
  return <TeamMark imageUrl={time.imageUrl} color={teamColor(time.id)} size={tamanho} />;
}

/**
 * Retorno de ação no celular. O do monitor é um chip de uma linha só (`nowrap`); a 360px um
 * texto como "ID alterado — o link público só muda depois de salvar" estourava a página.
 */
function AvisoEmLinha({ texto, tom }: Readonly<{ texto: string; tom: "ok" | "warn" }>) {
  return (
    <p
      role="status"
      style={{
        width: "100%",
        margin: 0,
        padding: "8px 10px",
        borderRadius: 3,
        fontSize: 12.5,
        lineHeight: 1.45,
        border: `1px solid ${tom === "ok" ? "rgba(70,214,200,.40)" : "rgba(224,163,58,.45)"}`,
        background: tom === "ok" ? "rgba(70,214,200,.09)" : "rgba(224,163,58,.10)",
        color: tom === "ok" ? C.okSoft : C.warnSoft,
      }}
    >
      {texto}
    </p>
  );
}

/**
 * Título de bloco do editor no celular. O `BlockTitle` do kit põe as ações na mesma linha
 * do título, sem quebra — com dois botões e um aviso, a linha passava de 360px. Aqui o
 * aviso e as ações descem para baixo do título, e o selo hexagonal diz do que é o bloco
 * antes da leitura (espadas = jogos, cartas = cartinhas, calendário = data).
 */
function TituloCompacto({
  children,
  icone,
  aviso,
  acoes,
}: Readonly<{ children: ReactNode; icone?: Icone; aviso?: ReactNode; acoes?: ReactNode }>) {
  return (
    <div style={{ margin: "28px 0 12px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {icone ? <SeloHex icone={icone} tamanho={30} /> : null}
        <h3 style={{ fontFamily: display, fontSize: 18, lineHeight: 1.15, color: C.bronze, margin: 0 }}>{children}</h3>
        <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${C.line2}, transparent)` }} />
      </div>
      {aviso ? <div style={{ marginTop: 10 }}>{aviso}</div> : null}
      {acoes ? <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>{acoes}</div> : null}
    </div>
  );
}

/** Subtítulo dentro do cartão de um jogo (jogadores, bans), com o ícone do que é. */
function SubtituloDoJogo({
  icone: Desenho,
  children,
  contagem,
}: Readonly<{ icone: Icone; children: ReactNode; contagem?: string }>) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "20px 0 10px" }}>
      <Desenho size={16} aria-hidden style={{ color: C.bronze, flexShrink: 0 }} />
      <h5 style={{ margin: 0, fontFamily: display, fontSize: 15.5, lineHeight: 1.2, color: C.bronze }}>{children}</h5>
      {contagem ? (
        <span style={{ marginLeft: "auto", fontSize: 11.5, color: C.ink4, ...tabular }}>{contagem}</span>
      ) : null}
    </div>
  );
}

/** Retorno da importação da Riot — o mesmo parágrafo nos dois arranjos. */
function AvisoDaRiot({ status }: Readonly<{ status: RiotImportStatus }>) {
  return (
    <p
      role={status.kind === "error" ? "alert" : "status"}
      style={{
        margin: "10px 0 0",
        padding: "8px 10px",
        borderRadius: 3,
        fontSize: 12,
        lineHeight: 1.5,
        border: `1px solid ${status.kind === "error" ? "rgba(212,87,74,.45)" : "rgba(70,214,200,.40)"}`,
        background: status.kind === "error" ? "rgba(212,87,74,.10)" : "rgba(70,214,200,.09)",
        color: status.kind === "error" ? C.dangerSoft : C.okSoft,
      }}
    >
      {status.text}
    </p>
  );
}

/**
 * O placar da série em duas linhas, como no fim de partida: logo, nome e vitórias de cada
 * time. Quem venceu fica aceso, quem perdeu apaga um tom — dá para ler a lista inteira sem
 * abrir nenhuma série.
 */
function LinhasDoPlacar({
  linhas,
}: Readonly<{ linhas: ReadonlyArray<{ chave: string; time?: Time; nome: string; vitorias: number; estado: "venceu" | "perdeu" | "aberto" }> }>) {
  return (
    <span style={{ display: "grid", gap: 6 }}>
      {linhas.map((linha) => (
        <span
          key={linha.chave}
          style={{ display: "grid", gridTemplateColumns: "26px minmax(0,1fr) auto", alignItems: "center", gap: 9 }}
        >
          <MarcaDoTime time={linha.time} tamanho={26} />
          <span
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              fontWeight: linha.estado === "venceu" ? 700 : 600,
              color: linha.estado === "venceu" ? C.ink : linha.estado === "perdeu" ? C.ink3 : C.ink2,
            }}
          >
            {linha.nome}
          </span>
          <span
            style={{
              fontFamily: display,
              fontSize: 21,
              lineHeight: 1,
              minWidth: 14,
              textAlign: "right",
              color: linha.estado === "venceu" ? C.bronzeHi : C.ink3,
              ...tabular,
            }}
          >
            {linha.vitorias}
          </span>
        </span>
      ))}
    </span>
  );
}

/** Topo do editor no celular: os dois escudos e o placar grande entre eles. */
function PlacarDaSerie({
  timeA,
  timeB,
  nomeA,
  nomeB,
  vitoriasA,
  vitoriasB,
}: Readonly<{
  timeA?: Time;
  timeB?: Time;
  nomeA: string;
  nomeB: string;
  vitoriasA: number;
  vitoriasB: number;
}>) {
  const lado = (time: Time | undefined, nome: string) => (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 7, minWidth: 0 }}>
      <MarcaDoTime time={time} tamanho={44} />
      <span
        style={{
          fontSize: 12.5,
          fontWeight: 700,
          lineHeight: 1.25,
          color: C.ink2,
          textAlign: "center",
          overflowWrap: "anywhere",
        }}
      >
        {nome}
      </span>
    </div>
  );
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0,1fr) auto minmax(0,1fr)",
        alignItems: "center",
        gap: 10,
        padding: "16px 12px 14px",
        border: `1px solid ${C.line}`,
        borderRadius: 6,
        background: "radial-gradient(120% 90% at 50% 0%, rgba(201,138,75,.12), rgba(0,0,0,.24) 70%)",
      }}
    >
      {lado(timeA, nomeA)}
      <div
        aria-label={`Placar ${vitoriasA} a ${vitoriasB}`}
        role="img"
        style={{ fontFamily: display, fontSize: 38, lineHeight: 1, color: C.bronzeHi, ...tabular }}
      >
        {vitoriasA}
        <span style={{ color: C.ink4, margin: "0 6px" }}>–</span>
        {vitoriasB}
      </div>
      {lado(timeB, nomeB)}
    </div>
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
  seriesGravadas,
  podeLados = true,
  podeCartas = true,
  podeRiot = true,
  podeVerPrecos,
  regraDoSubstituto,
}: Readonly<{
  draft: TournamentDataset;
  mutateDraft: MutateDraft;
  /** Para o que o servidor já gravou: entra no rascunho E na baseline. */
  aplicarDoServidor: MutateDraft;
  /** Avisa a versão que a rota leu e a que ela gravou, para o painel acompanhar a trava. */
  onVersaoDoServidor: (versaoLida?: number, versaoGravada?: number) => void;
  /**
   * As séries como estão GRAVADAS no servidor (a baseline do painel). O sorteio ao vivo é
   * feito pelo servidor sobre a série gravada — não sobre o rascunho —, então ele só é
   * oferecido quando as duas batem. Sem a prop (uso isolado), nada é bloqueado.
   */
  seriesGravadas?: readonly SeriesMatch[];
  /** Escopos da pessoa: botão sem o escopo só entregaria um 403 depois da roda girar. */
  podeLados?: boolean;
  podeCartas?: boolean;
  podeRiot?: boolean;
  /**
   * Regra 6: a pessoa pode ler as inscrições (conferir ou financeiro), de onde vêm os pontos
   * do substituto. Verdadeiro: o painel lê os preços e avisa o substituto acima do teto.
   * Falso: avisa que a regra 6 tem de ser conferida à mão. Ausente (uso isolado): não confere.
   */
  podeVerPrecos?: boolean;
  /** A regra pronta, no lugar da leitura (`null` = indisponível). Para testes e usos isolados. */
  regraDoSubstituto?: RegraDoSubstituto | null;
}>) {
  // O sorteio ao vivo grava DIRETO no servidor, fora do rascunho. Por isso ele DEVOLVE
  // o que gravou (`onSorteado`): o rascunho local sincroniza só `blueSideTeamId` e
  // `cardsUsed` e não fica velho, sem precisar da recarga que abria `window.confirm`
  // no meio da cerimônia — e salvar depois não cai na trava de versão (409).
  const [sorteioAberto, setSorteioAberto] = useState(false);
  const compacto = useCompacto();
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
  // ---- só do celular
  /** Filtro da lista de cartões: entre uma rodada e outra o que se procura é a série em andamento. */
  const [filtroCompacto, setFiltroCompacto] = useState<"todas" | "abertas" | "pendencias">("todas");
  /** Caixa "Importar da Riot" de cada jogo, recolhida por padrão (chave = `serie:jogo`). */
  const [riotAbertos, setRiotAbertos] = useState<Record<string, boolean>>({});
  /**
   * Série aberta sem os dois times começa pelo Confronto; as outras, pelos jogos. Decidido
   * na ABERTURA e não a cada render: se dependesse dos times, escolher o Time B jogaria o
   * bloco que a pessoa acabou de usar para o fim da folha, debaixo do dedo dela.
   */
  const [confrontoNoTopo, setConfrontoNoTopo] = useState(() => {
    const lembrada = draft.seriesMatches.find((series) => series.id === serieLembrada);
    return Boolean(lembrada) && (!lembrada?.teamAId || !lembrada?.teamBId);
  });

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

  /** O retorno daquele escopo no celular, ou nada — para o bloco não reservar espaço vazio. */
  const avisoCompacto = (escopo: string) =>
    aviso && aviso.escopo === escopo ? <AvisoEmLinha texto={aviso.texto} tom={aviso.tom} /> : null;

  const Aviso = ({ escopo }: Readonly<{ escopo: string }>) => {
    if (!aviso || aviso.escopo !== escopo) return null;
    if (compacto) return avisoCompacto(escopo);
    return (
      <span role="status" style={{ display: "inline-flex" }}>
        <Chip tone={aviso.tom === "ok" ? "ok" : "warn"}>{aviso.texto}</Chip>
      </span>
    );
  };

  const selectedSeries = draft.seriesMatches.find((series) => series.id === selectedId) ?? null;

  // Regra 6: os pontos do substituto. A leitura só acontece quando a pessoa pode ver as
  // inscrições e ninguém entregou a regra pronta.
  const regraLida = useRegraDoSubstituto(podeVerPrecos === true && regraDoSubstituto === undefined);
  let regraDaSerie: RegraDoSubstituto | null | undefined;
  if (regraDoSubstituto !== undefined) regraDaSerie = regraDoSubstituto;
  else if (podeVerPrecos === false) regraDaSerie = null;
  else regraDaSerie = podeVerPrecos ? regraLida : undefined;

  const jogadoresPorId = useMemo(() => new Map(draft.players.map((player) => [player.id, player])), [draft.players]);
  const currentRosters = useMemo(() => opcoesDeJogador(draft, selectedSeries), [draft, selectedSeries]);

  const selectedSeriesSettings = getSelectedSeriesSettings(selectedSeries, draft);
  const selectedSeriesIsWalkover = selectedSeriesSettings.isWalkover;
  const selectedSeriesFormat = selectedSeriesSettings.format;
  const selectedSeriesFormatLabel = selectedSeriesSettings.formatLabel;
  const selectedSeriesMaxGames = selectedSeriesSettings.maxGames;
  const selectedSeriesTargetWins = selectedSeriesSettings.targetWins;

  const gravadasPorId = useMemo(
    () => (seriesGravadas ? new Map(seriesGravadas.map((series) => [series.id, series])) : null),
    [seriesGravadas],
  );

  // Auditoria de TODAS as séries: alimenta o aviso do topo, o selo na lista e o vermelho no editor.
  const auditorias = useMemo(() => {
    const mapa = new Map<string, AuditoriaSerie>();
    for (const series of draft.seriesMatches) {
      mapa.set(series.id, auditarSerie(series, draft, gravadasPorId?.get(series.id), regraDaSerie));
    }
    return mapa;
  }, [draft, gravadasPorId, regraDaSerie]);

  /**
   * Por que o "Sortear ao vivo" está desligado, ou `null` se pode sortear.
   *
   * A rota sorteia sobre a série GRAVADA. Série criada no rascunho e não salva dava "Série não
   * encontrada" a cada tentativa, com a roda girando na tela projetada; série com time trocado
   * e não salva sorteava entre os times ANTIGOS — e o lado azul podia cair num time que a tela
   * nem mostrava.
   */
  const motivoSemSorteio = (() => {
    if (!selectedSeries || !gravadasPorId) return null;
    const gravada = gravadasPorId.get(selectedSeries.id);
    if (!gravada) return "Salve a série antes de sortear: o sorteio é feito sobre a série gravada no site.";
    if (gravada.teamAId !== selectedSeries.teamAId || gravada.teamBId !== selectedSeries.teamBId) {
      return "Salve a troca de time antes de sortear: o sorteio é feito sobre a série gravada no site.";
    }
    return null;
  })();

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
    // As caixas abertas no celular também são por índice de jogo: deslocados, elas valeriam
    // para o jogo errado.
    setRiotAbertos((prev) => Object.fromEntries(Object.entries(prev).filter(([key]) => !key.startsWith(prefix))));
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
    const alvo = draft.seriesMatches.find((series) => series.id === seriesId);
    setConfrontoNoTopo(!alvo?.teamAId || !alvo?.teamBId);
    setSelectedId(seriesId);
  };

  const createSeries = () => {
    const series = createBlankSeries(draft.tournament.format);
    mutateDraft((next) => {
      next.seriesMatches.push(series);
    });
    if (selectedId) limparLinhasVazias(selectedId);
    setConfrontoNoTopo(true);
    setSelectedId(series.id);
    avisar("topo", "Série criada. Escolha os dois times para começar.");
  };

  /**
   * Fechar a folha do celular é o mesmo que, no monitor, sair da série escolhendo outra: as
   * linhas em branco dela vão embora (derrubariam o salvamento do painel inteiro). Não há
   * rascunho próprio a confirmar — cada campo já escreve direto no rascunho do painel.
   * O aviso diz quantas saíram, porque ali ninguém viu a limpeza acontecer.
   */
  const fecharEditorCompacto = () => {
    const descartadas = selectedId ? limparLinhasVazias(selectedId) : 0;
    setSelectedId(null);
    if (descartadas > 0) {
      avisar("topo", `${descartadas} linha(s) em branco descartada(s) ao fechar a série.`, "warn");
    }
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
      draft.players
        .filter((player) => player.teamId !== undefined && timesFinais.includes(player.teamId))
        .map((player) => player.id),
    );
    // A linha do substituto avulso vale pelo time DELA (o "Jogou por"): o reserva que cobriu o
    // time que fica continua; o que cobriu o time que sai fica órfão, como os titulares dele.
    const linhaContinua = (row: PlayerGameStats) => {
      if (!row.playerId.trim()) return true;
      return row.teamId !== undefined ? timesFinais.includes(row.teamId) : idsValidos.has(row.playerId);
    };

    let linhasOrfas = 0;
    let bansOrfaos = 0;
    let vencedoresOrfaos = 0;
    for (const game of selectedSeries.games) {
      linhasOrfas += game.statsByPlayer.filter((row) => !linhaContinua(row)).length;
      bansOrfaos += (game.bans ?? []).filter((ban) => ban.teamId && !timesFinais.includes(ban.teamId)).length;
      if (game.winnerTeamId && !timesFinais.includes(game.winnerTeamId)) vencedoresOrfaos += 1;
    }

    // O sorteio também aponta para os times: lado azul e cartinhas do time que sai somem.
    const ladoSorteado = Boolean(selectedSeries.blueSideTeamId) && !timesFinais.includes(selectedSeries.blueSideTeamId!);
    const cartasOrfas = (selectedSeries.cardsUsed ?? []).filter(
      (card) => card.teamId && !timesFinais.includes(card.teamId),
    ).length;
    const perdeSorteio = ladoSorteado || cartasOrfas > 0;

    if (selectedSeries.games.length > 0 || perdeSorteio) {
      const partes: string[] = [];
      if (selectedSeries.games.length > 0) {
        partes.push(
          `Esta série já tem ${selectedSeries.games.length} jogo(s) lançado(s). Serão apagados: ` +
            `${linhasOrfas} linha(s) de K/D/A, ${bansOrfaos} ban(s) e o vencedor de ${vencedoresOrfaos} jogo(s) ` +
            `que ainda apontam para o time removido.`,
        );
      }
      if (perdeSorteio) {
        const oQue = [
          ladoSorteado ? `o lado azul sorteado (${getTeamName(draft, selectedSeries.blueSideTeamId!)})` : null,
          cartasOrfas > 0 ? `${cartasOrfas} cartinha(s)` : null,
        ]
          .filter(Boolean)
          .join(" e ");
        partes.push(
          `O sorteio desta série deixa de valer: ${oQue} ${ladoSorteado && cartasOrfas > 0 ? "serão apagados" : "será apagado(a)"}. ` +
            `O site já pode ter anunciado esse sorteio.`,
        );
      }
      const confirmou = confirmBrowserAction(
        `Trocar o Time ${lado} de "${getTeamName(draft, anterior)}" para "${getTeamName(draft, novoTimeId)}"?\n\n` +
          partes.join("\n\n"),
      );
      if (!confirmou) return;
    }

    // Voltar ao confronto GRAVADO (troca desfeita antes de salvar) devolve o sorteio gravado
    // que a troca tinha apagado: sem isto, desfazer o engano não desfazia o estrago.
    const gravada = gravadasPorId?.get(selectedSeries.id);
    const voltaAoGravado = Boolean(gravada) && gravada!.teamAId === timesFinais[0] && gravada!.teamBId === timesFinais[1];

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
        game.statsByPlayer = game.statsByPlayer.filter(linhaContinua);
        const jogaram = new Set(game.statsByPlayer.map((row) => row.playerId));
        if (game.mvpPlayerId && !idsValidos.has(game.mvpPlayerId) && !jogaram.has(game.mvpPlayerId)) {
          game.mvpPlayerId = "";
        }
        if (game.bans) game.bans = game.bans.filter((ban) => !ban.teamId || times.includes(ban.teamId));
      }

      if (series.cardsUsed) {
        series.cardsUsed = series.cardsUsed.filter((card) => !card.teamId || times.includes(card.teamId));
      }

      if (voltaAoGravado && gravada) {
        if (!series.blueSideTeamId && gravada.blueSideTeamId) series.blueSideTeamId = gravada.blueSideTeamId;
        if ((series.cardsUsed?.length ?? 0) === 0 && gravada.cardsUsed !== undefined) {
          series.cardsUsed = structuredClone(gravada.cardsUsed);
        }
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

    /*
     * "Jogos valem, W.O. completa" (22/10/2026): o W.O. entra por cima dos jogos lançados, sem
     * apagar nada. Antes esta troca zerava `games` — com o W.O. no meio da série, isso jogava
     * fora o jogo 1 que de fato aconteceu (e o K/D/A e o MVP dele).
     *
     * Só não cabe W.O. numa série que os jogos já decidiram: o servidor recusa, então o painel
     * nem aplica.
     */
    if (!walkoverPermitido(selectedSeries, draft)) {
      const placar = getSeriesScore({ ...selectedSeries, walkoverWinnerTeamId: undefined }, draft);
      avisar(
        "wo",
        `A série já está decidida pelos jogos (${placar.teamAWins}x${placar.teamBWins}): não cabe W.O.`,
        "warn",
      );
      return;
    }

    /*
     * Jogo EM BRANCO (sem vencedor, sem linha preenchida e sem ban) não é jogo lançado: é o
     * "Adicionar jogo" do dia em que o adversário não apareceu. Ele sai junto com o W.O. —
     * guardado, virava "jogo disputado" na pergunta, empurrava os jogos de W.O. para 2 e 3 e
     * travava o salvamento ("falta marcar o time vencedor"). Os jogos com algo lançado ficam.
     */
    const lancados = selectedSeries.games.filter((game) => !jogoEmBranco(game));
    const emBranco = selectedSeries.games.length - lancados.length;
    const textoEmBranco =
      emBranco === 0
        ? ""
        : emBranco === 1
          ? " O jogo em branco (sem vencedor nem K/D/A) é descartado."
          : ` Os ${emBranco} jogos em branco (sem vencedor nem K/D/A) são descartados.`;

    if (lancados.length > 0) {
      const comWalkover = { ...selectedSeries, games: lancados, walkoverWinnerTeamId: winnerTeamId };
      const placar = getSeriesScore(comWalkover, draft);
      const jogos = lancados.length;
      const confirmou = confirmBrowserAction(
        `Aplicar W.O. para ${getTeamName(draft, winnerTeamId)}?\n\n` +
          `${jogos === 1 ? "O jogo já lançado continua" : `Os ${jogos} jogos já lançados continuam`} valendo ` +
          `(K/D/A e MVP), e o W.O. completa a série: placar final ` +
          `${getTeamName(draft, selectedSeries.teamAId)} ${placar.teamAWins} x ${placar.teamBWins} ` +
          `${getTeamName(draft, selectedSeries.teamBId)}.` +
          (emBranco === 0 ? " Nada é apagado." : textoEmBranco),
      );
      if (!confirmou) return;
    }

    updateSelectedSeries((series) => {
      series.walkoverWinnerTeamId = winnerTeamId;
      if (emBranco > 0) series.games = series.games.filter((game) => !jogoEmBranco(game));
    });
    if (emBranco > 0) {
      // As chaves de importação da Riot são por índice: com os jogos deslocados, deixam de valer.
      clearRiotStateForSeries(selectedSeries.id);
      avisar("wo", `W.O. aplicado.${textoEmBranco}`, "warn");
    }
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

  /**
   * Etapa puxa o formato do regulamento (`formatoDaEtapa`). Se o formato novo cortar jogos
   * já lançados (uma final MD5 com 4 jogos virando semifinal MD3), pergunta antes — mesma
   * regra do select de formato — e, sem confirmação, nada muda.
   */
  const updateSeriesStage = (nextStage: SeriesStage) => {
    if (!selectedSeries) return;
    const nextFormat = formatoDaEtapa(nextStage);
    const nextMaxGames = nextFormat === "BO5" ? 5 : 3;

    if (selectedSeries.games.length > nextMaxGames) {
      const shouldTrim = confirmBrowserAction(
        `Trocar a etapa para ${getStageOptionLabel(nextStage)} muda o formato para ${getFormatOptionLabel(nextFormat)} ` +
          `e remove os jogos excedentes acima de ${nextMaxGames}. Deseja continuar?`,
      );
      if (!shouldTrim) return;
    }

    const formatoMudou = getSeriesFormat(selectedSeries, draft) !== nextFormat;
    updateSelectedSeries((series) => {
      series.stage = nextStage;
      series.format = nextFormat;
      if (series.games.length > nextMaxGames) {
        series.games = series.games.slice(0, nextMaxGames);
      }
    });
    if (formatoMudou) {
      avisar("times", `${getStageOptionLabel(nextStage)}: formato ajustado para ${getFormatOptionLabel(nextFormat)}.`);
    }
  };

  /**
   * Data e horário são dois campos, mas UM texto gravado: cada campo regrava o texto
   * inteiro com o valor ATUAL do outro, então mexer na data mantém a hora (remarcar para
   * a reserva de sábado 19:00 não pode perder o horário) e vice-versa.
   */
  const updateSeriesDataHora = (data: string, hora: string) => {
    const novo = camposBrasiliaParaIso(data, hora);
    if (novo === undefined || novo === selectedSeries?.date) return;
    updateSelectedSeries((series) => {
      series.date = novo;
    });
  };

  /** #2/#26: as linhas saem na ordem das rotas (TOP, SEL, MID, ADC, SUP), time A e depois B. */
  const fillRosterRowsForGame = (gameIndex: number) => {
    if (!selectedSeries) return;
    const game = selectedSeries.games[gameIndex];
    if (!game) return;

    // Os titulares de HOJE (quem saiu de vez não volta sozinho para a lista). Time que já tem
    // as 5 linhas — um substituto avulso no lugar de alguém — não recebe mais ninguém.
    const jaListados = new Set(game.statsByPlayer.map((row) => row.playerId));
    const linhasDoTime = (teamId: string) =>
      game.statsByPlayer.filter((row) => timeDaLinha(row, jogadoresPorId.get(row.playerId)) === teamId).length;
    const completos = new Set(
      [selectedSeries.teamAId, selectedSeries.teamBId].filter((teamId) => teamId && linhasDoTime(teamId) >= 5),
    );
    const faltando = currentRosters.combined.filter(
      (player) => !jaListados.has(player.id) && !(player.teamId !== undefined && completos.has(player.teamId)),
    );

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

  /**
   * Trocar o jogador da linha refaz o "Jogou por": quem joga pelo próprio time fica sem o
   * `teamId` na linha (como sempre foi); o substituto avulso guarda o time escolhido se ele
   * ainda é um dos dois da série — senão a linha pede a escolha de novo.
   *
   * O substituto que chega sem time válido já vem com o lado que está FALTANDO gente: quando
   * só um dos dois times tem menos de 5 linhas neste jogo, é a vaga que ele cobriu. Com os
   * dois incompletos não há palpite — a linha trava até alguém escolher o “Jogou por”.
   */
  const trocarJogadorDaLinha = (gameIndex: number, rowIndex: number, playerId: string) => {
    const jogador = jogadoresPorId.get(playerId);
    updateSelectedSeries((series) => {
      const game = series.games[gameIndex];
      const current = game?.statsByPlayer[rowIndex];
      if (!game || !current) return;
      current.playerId = playerId;
      const timeValido = current.teamId === series.teamAId || current.teamId === series.teamBId;
      if (!jogador || !linhaPrecisaDeTime(jogador, series)) {
        delete current.teamId;
        return;
      }
      if (timeValido) return;
      delete current.teamId;
      const linhasDoLado = (teamId: string) =>
        game.statsByPlayer.filter(
          (row, indice) =>
            indice !== rowIndex && row.playerId.trim() !== "" && timeDaLinha(row, jogadoresPorId.get(row.playerId)) === teamId,
        ).length;
      const faltando = [series.teamAId, series.teamBId].filter((teamId) => teamId && linhasDoLado(teamId) < 5);
      if (faltando.length === 1) current.teamId = faltando[0];
    });
  };

  /** O "Jogou por" do substituto avulso: o time que ele cobriu NESTE jogo. Vazio tira a marca. */
  const updateTimeDaLinha = (gameIndex: number, rowIndex: number, teamId: string) => {
    updateSelectedSeries((series) => {
      const current = series.games[gameIndex]?.statsByPlayer[rowIndex];
      if (!current) return;
      if (teamId) current.teamId = teamId;
      else delete current.teamId;
    });
  };

  /**
   * Linha com algo digitado pede confirmação: no celular a lixeira fica ao lado do nome, e
   * um toque errado apagava campeão e K/D/A sem desfazer (recarregar descarta o rascunho
   * inteiro). Linha em branco sai direto — é sobra de clique no "+ Linha".
   */
  const removeStatsRowFromGame = (gameIndex: number, rowIndex: number) => {
    const row = selectedSeries?.games[gameIndex]?.statsByPlayer[rowIndex];
    if (!row) return;
    if (!isLinhaDescartavel(row)) {
      const jogador = draft.players.find((player) => player.id === row.playerId);
      const quem = jogador?.nick ?? (row.playerId || "sem jogador");
      const campeao = (row.champion ?? "").trim() || "sem campeão";
      const confirmou = confirmBrowserAction(
        `Remover a linha de ${quem} (${campeao}, ${row.kills}/${row.deaths}/${row.assists}) do Jogo ${gameIndex + 1}?`,
      );
      if (!confirmou) return;
    }
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
    const ban = selectedSeries?.games[gameIndex]?.bans?.[banIndex];
    if (ban?.championName.trim()) {
      const confirmou = confirmBrowserAction(
        `Remover o ban de ${ban.championName.trim()} (${getTeamName(draft, ban.teamId)}) do Jogo ${gameIndex + 1}?`,
      );
      if (!confirmou) return;
    }
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
    if (!selectedSeries || getSeriesWinnerTeamId(selectedSeries, draft)) return;
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
      // A linha nova nasce com uma carta EM VIGOR: retirada só aparece em registro antigo.
      series.cardsUsed.push({ teamId: series.teamAId || "", cardId: CARTAS_ATIVAS[0].cardId });
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

  /** A cartinha é o resultado de um sorteio anunciado: tirar pede confirmação. */
  const removeCardFromSeries = (cardIndex: number) => {
    const carta = selectedSeries?.cardsUsed?.[cardIndex];
    if (carta) {
      const nomeDaCarta = CARDS_BY_ID[carta.cardId]?.title ?? carta.cardId;
      const confirmou = confirmBrowserAction(
        `Remover a cartinha ${nomeDaCarta}${carta.teamId ? ` de ${getTeamName(draft, carta.teamId)}` : ""}?`,
      );
      if (!confirmou) return;
    }
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
        const temAviso = (auditorias.get(series.id)?.avisos.length ?? 0) > 0;

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
                flexWrap: "wrap",
                alignItems: "center",
                gap: 6,
                fontSize: 10,
                letterSpacing: ".10em",
                textTransform: "uppercase",
                color: C.ink4,
                ...tabular,
              }}
            >
              {/* Com hora quando houver: é por ela que se acha "o jogo das 10:30". */}
              <span>{formatSeriesDateLabel(series.date)}</span>
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
              {temAviso ? (
                <Chip tone="warn" title={auditorias.get(series.id)?.avisos[0]}>
                  Conferir etapa
                </Chip>
              ) : null}
            </div>
          </button>
        );
      })
    );

  // -------------------------------------------------------------- lista no celular

  const timeDe = (teamId: string) => draft.teams.find((team) => team.id === teamId);
  /** Nome do time daquele lado, ou "Time A"/"Time B" enquanto ninguém foi escolhido. */
  const nomeOuVaga = (teamId: string, vaga: string) => (teamId ? getTeamName(draft, teamId) : vaga);

  /** Em andamento = nem vencedor nem W.O.: é a série que espera o resultado da rodada. */
  const estaEmAndamento = (series: SeriesMatch) =>
    !isWalkoverSeries(series) && !getSeriesWinnerTeamId(series, draft);
  const totalEmAndamento = sortedSeries.filter(estaEmAndamento).length;

  let seriesDoFiltro = sortedSeries;
  if (filtroCompacto === "abertas") seriesDoFiltro = sortedSeries.filter(estaEmAndamento);
  else if (filtroCompacto === "pendencias") seriesDoFiltro = seriesComProblema;

  const textoSemSeriesNoFiltro =
    filtroCompacto === "abertas"
      ? "Nenhuma série em andamento: todas têm vencedor ou W.O."
      : "Nenhuma série com pendência.";

  /**
   * A lista no celular: um cartão de placar por série, a mesma ordem do monitor (mais
   * recente primeiro). O cartão inteiro abre a série na folha; o nome acessível do toque
   * diz o confronto, o placar e o estado de uma vez, para quem navega por leitor de tela.
   */
  const listaCompacta = compacto ? (
    <section aria-label="Séries do campeonato">
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <h3 style={{ fontFamily: display, fontSize: 17, color: C.bronze, margin: 0 }}>Todas as séries</h3>
        <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${C.line2}, transparent)` }} />
        <span style={{ fontSize: 11.5, color: C.ink4, ...tabular }}>{sortedSeries.length}</span>
      </div>

      {sortedSeries.length > 0 ? (
        <RolagemX rotulo="Filtrar séries" style={{ marginBottom: 12 }}>
          <ChipFiltro ativo={filtroCompacto === "todas"} onClick={() => setFiltroCompacto("todas")}>
            Todas <span style={tabular}>{sortedSeries.length}</span>
          </ChipFiltro>
          <ChipFiltro ativo={filtroCompacto === "abertas"} onClick={() => setFiltroCompacto("abertas")}>
            <Swords size={14} aria-hidden /> Em andamento <span style={tabular}>{totalEmAndamento}</span>
          </ChipFiltro>
          <ChipFiltro ativo={filtroCompacto === "pendencias"} onClick={() => setFiltroCompacto("pendencias")}>
            <AlertTriangle size={14} aria-hidden /> Com pendência <span style={tabular}>{seriesComProblema.length}</span>
          </ChipFiltro>
        </RolagemX>
      ) : null}

      {sortedSeries.length === 0 ? (
        <LinhaVazia>Nenhuma série cadastrada. Comece por &quot;Nova série&quot;.</LinhaVazia>
      ) : seriesDoFiltro.length === 0 ? (
        <LinhaVazia>{textoSemSeriesNoFiltro}</LinhaVazia>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
          {seriesDoFiltro.map((series) => {
            const score = getSeriesScore(series, draft);
            const winner = getSeriesWinnerTeamId(series, draft);
            const isWalkover = isWalkoverSeries(series);
            const nomeA = nomeOuVaga(series.teamAId, "Time A");
            const nomeB = nomeOuVaga(series.teamBId, "Time B");
            const estadoLabel = getSeriesStateLabel(isWalkover, Boolean(winner));
            const auditoria = auditorias.get(series.id);
            const temProblema = (auditoria?.bloqueios.length ?? 0) > 0;
            const temAviso = (auditoria?.avisos.length ?? 0) > 0;
            const estadoDoLado = (teamId: string): "venceu" | "perdeu" | "aberto" => {
              if (!winner) return "aberto";
              return winner === teamId ? "venceu" : "perdeu";
            };

            return (
              <li key={series.id}>
                <CartaoLinha
                  abreDialogo
                  selecionado={selectedSeries?.id === series.id}
                  destaque={temProblema ? C.danger : temAviso ? C.warn : undefined}
                  rotuloAlvo={`Abrir a série ${nomeA} x ${nomeB}, ${score.teamAWins} a ${score.teamBWins}, ${estadoLabel}`}
                  onClick={() => selecionarSerie(series.id)}
                  titulo={
                    <LinhasDoPlacar
                      linhas={[
                        {
                          chave: `a-${series.teamAId}`,
                          time: timeDe(series.teamAId),
                          nome: nomeA,
                          vitorias: score.teamAWins,
                          estado: estadoDoLado(series.teamAId),
                        },
                        {
                          chave: `b-${series.teamBId}`,
                          time: timeDe(series.teamBId),
                          nome: nomeB,
                          vitorias: score.teamBWins,
                          estado: estadoDoLado(series.teamBId),
                        },
                      ]}
                    />
                  }
                  subtitulo={
                    // Com hora quando houver: é por ela que se acha "o jogo das 10:30".
                    <span style={tabular}>
                      {formatSeriesDateLabel(series.date)} · {getSeriesStageLabel(series)} ·{" "}
                      {getSeriesFormatLabel(series, draft)}
                    </span>
                  }
                >
                  <span style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                    <Chip tone={isWalkover ? "warn" : winner ? "ok" : "neutro"}>{estadoLabel}</Chip>
                    {temProblema ? (
                      <Chip tone="danger" title="Esta série tem pendências que travam o salvamento">
                        <AlertTriangle size={11} aria-hidden /> Pendências
                      </Chip>
                    ) : null}
                    {temAviso ? (
                      <Chip tone="warn" title={auditoria?.avisos[0]}>
                        Conferir etapa
                      </Chip>
                    ) : null}
                  </span>
                </CartaoLinha>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  ) : null;

  // -------------------------------------------------------------- jogos da série

  /**
   * As opções do select de jogador da linha (monitor e celular): os titulares de hoje dos
   * dois times e, em grupos, quem pode entrar como substituto avulso. Um jogador que não
   * está em lista nenhuma continua listado, para não sumir em silêncio.
   */
  const opcoesDoJogador = (row: PlayerGameStats) => {
    const grupo = (rotulo: string, jogadores: Player[]) =>
      jogadores.length > 0 ? (
        <optgroup label={rotulo}>
          {jogadores.map((player) => (
            <option key={player.id} value={player.id}>
              {rotuloJogador(draft, player)}
            </option>
          ))}
        </optgroup>
      ) : null;
    return (
      <>
        <option value="">Jogador…</option>
        {currentRosters.combined.map((player) => (
          <option key={player.id} value={player.id}>
            {rotuloJogador(draft, player)}
          </option>
        ))}
        {grupo("Reservas (substituto)", currentRosters.reservas)}
        {grupo("Outros times (substituto)", currentRosters.outrosTimes)}
        {grupo("Saíram do time", currentRosters.sairam)}
        {row.playerId && !currentRosters.todos.some((player) => player.id === row.playerId) ? (
          <option value={row.playerId}>{rotuloForaDaSerie(draft, row.playerId)}</option>
        ) : null}
      </>
    );
  };

  /**
   * "Jogou por": aparece na linha do substituto avulso — o reserva (sem time) ou o titular de
   * um time que não disputa a série. Grava o `teamId` da LINHA: é por ele que abates, vitória
   * e MVP daquele jogo contam para o time coberto, sem mudar o time do jogador. Embaixo, o
   * aviso de pontos da regra 6, quando a troca passa do teto (só aviso).
   */
  const blocoJogouPor = (gameIndex: number, row: PlayerGameStats, rowIndex: number) => {
    if (!selectedSeries) return null;
    const jogador = jogadoresPorId.get(row.playerId);
    if (!jogador || (!linhaPrecisaDeTime(jogador, selectedSeries) && row.teamId === undefined)) return null;
    const aviso = auditoriaSelecionada?.substitutosPorJogo[gameIndex]?.find((item) => item.jogadorId === jogador.id);
    const semEscolha = row.teamId === undefined;
    // "Pelo próprio time" só vale para a linha JÁ GRAVADA assim (quem trocou de time depois de
    // jogar). Na linha nova de titular de outro time o servidor recusa, e o reserva não tem
    // time próprio: nos dois casos a escolha é obrigatória.
    const proprioTimeVale =
      jogador.teamId !== undefined &&
      linhaJaGravada({ ...row, teamId: undefined }, gravadasPorId?.get(selectedSeries.id));
    const escolhaObrigatoria = semEscolha && !proprioTimeVale;
    return (
      <div style={{ display: "grid", gap: 6, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <Chip tone="warn" title="Substituto avulso: joga este jogo por outro time">
            SUB
          </Chip>
          <span style={{ fontSize: 12, color: C.ink3 }}>Jogou por</span>
          <span style={{ flex: compacto ? "1 1 100%" : "0 1 240px", minWidth: 0 }}>
            <Select
              ariaLabel={`Time pelo qual a linha ${rowIndex + 1} jogou`}
              value={row.teamId ?? ""}
              onChange={(value) => updateTimeDaLinha(gameIndex, rowIndex, value)}
              style={escolhaObrigatoria ? { borderColor: "rgba(212,87,74,.55)" } : undefined}
            >
              <option value="">{proprioTimeVale ? `Pelo próprio time (${ondeEstaHoje(draft, jogador)})` : "Escolha o time…"}</option>
              {selectedSeries.teamAId ? (
                <option value={selectedSeries.teamAId}>{getTeamName(draft, selectedSeries.teamAId)}</option>
              ) : null}
              {selectedSeries.teamBId ? (
                <option value={selectedSeries.teamBId}>{getTeamName(draft, selectedSeries.teamBId)}</option>
              ) : null}
            </Select>
          </span>
        </div>
        {aviso ? (
          <p
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 6,
              margin: 0,
              fontSize: 12,
              lineHeight: 1.45,
              color: C.warnSoft,
            }}
          >
            <AlertTriangle size={14} aria-hidden style={{ flexShrink: 0, marginTop: 1 }} />
            {textoDoAvisoDeSubstituto(draft, aviso)}
          </p>
        ) : null}
      </div>
    );
  };

  const renderStatsRow = (
    gameIndex: number,
    row: PlayerGameStats,
    rowIndex: number,
    estado: EstadoLinha,
  ) => {
    const problema = linhaTrava(estado);
    const corBorda = problema
      ? "rgba(212,87,74,.55)"
      : estado === "vazia" || linhaAvisa(estado)
        ? "rgba(224,163,58,.40)"
        : C.line;
    const kda = getKda(row.kills, row.deaths, row.assists);

    const motivoBase = motivoDaLinha(estado);
    const motivo = motivoBase
      ? `${motivoBase}${linhaTrava(estado) || estado === "vazia" ? "" : " (não trava o salvamento)"}`
      : undefined;
    const jogouPor = blocoJogouPor(gameIndex, row, rowIndex);

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
          onChange={(value) => trocarJogadorDaLinha(gameIndex, rowIndex, value)}
        >
          {opcoesDoJogador(row)}
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

        {/* O "Jogou por" do substituto ocupa a largura inteira, numa segunda fileira da grade. */}
        {jogouPor ? <div style={{ gridColumn: "1 / -1" }}>{jogouPor}</div> : null}
      </div>
    );
  };

  const renderGame = (game: SeriesMatch["games"][number], gameIndex: number) => {
    if (!selectedSeries) return null;

    const riotImportKey = getGameImportKey(selectedSeries.id, gameIndex);
    const riotImportStatus = riotImportStatusByGame[riotImportKey];
    const riotMatchId = riotMatchIdsByGame[riotImportKey] ?? "";
    const isImportingRiot = riotImportingGameKey === riotImportKey;
    const autoMvpDisplay = getAutoMvpDisplay(game, selectedSeries, jogadoresPorId);
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
                !podeRiot ||
                isImportingRiot ||
                !riotMatchId.trim() ||
                !selectedSeries.teamAId ||
                !selectedSeries.teamBId
              }
              title={podeRiot ? undefined : SEM_PERMISSAO_RIOT}
              onClick={() => void importGameFromRiot(gameIndex)}
              style={{ marginBottom: 22 }}
            >
              {isImportingRiot ? "Importando…" : podeRiot ? "Importar da Riot" : "Importar da Riot (sem permissão)"}
            </Button>
          </div>

          {riotImportStatus ? <AvisoDaRiot status={riotImportStatus} /> : null}
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

  // -------------------------------------------------------------- jogos no celular

  /**
   * Uma linha de K/D/A no celular: um cartão por jogador. Em cima quem é (ícone da rota +
   * jogador + lixeira), no meio o campeão, embaixo abates, mortes e assistências lado a
   * lado com o KDA calculado — a mesma leitura do print, de cima para baixo, com o teclado
   * numérico. A faixa à esquerda é a cor do time do jogador: dá para ver de relance que os
   * cinco primeiros são de um lado e os cinco últimos do outro.
   *
   * O motivo do problema, que no monitor fica no `title` (mouse por cima), aqui aparece
   * escrito: no celular não existe passar o mouse.
   */
  const renderStatsCartao = (
    gameIndex: number,
    row: PlayerGameStats,
    rowIndex: number,
    estado: EstadoLinha,
  ) => {
    const problema = linhaTrava(estado);
    const corBorda = problema
      ? "rgba(212,87,74,.55)"
      : estado === "vazia" || linhaAvisa(estado)
        ? "rgba(224,163,58,.40)"
        : C.line;
    const kda = getKda(row.kills, row.deaths, row.assists);
    const jogador = jogadoresPorId.get(row.playerId) ?? null;
    const rota = jogador ? resolveRole(jogador.role1) : null;
    // A faixa é a cor do time pelo qual a LINHA jogou: o substituto aparece do lado que cobriu.
    const timeDaFaixa = jogador ? timeDaLinha(row, jogador) : undefined;

    const motivo = motivoDaLinha(estado);
    const jogouPor = blocoJogouPor(gameIndex, row, rowIndex);

    const campoNumero = (rotulo: string, nomeLongo: string, campo: "kills" | "deaths" | "assists") => (
      <Field label={rotulo}>
        <Input
          numeric
          ariaLabel={`${nomeLongo} da linha ${rowIndex + 1}`}
          value={row[campo]}
          onChange={(value) => updateStatsRowField(gameIndex, rowIndex, campo, soDigitos(value))}
        />
      </Field>
    );

    return (
      <div
        key={`g${gameIndex}-r${rowIndex}`}
        style={{
          padding: "10px 10px 12px 12px",
          border: `1px solid ${corBorda}`,
          borderRadius: 4,
          background: problema ? "rgba(212,87,74,.06)" : "rgba(0,0,0,.20)",
          boxShadow: timeDaFaixa ? `inset 3px 0 0 ${teamColor(timeDaFaixa)}` : undefined,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            aria-hidden
            title={rota?.label}
            style={{
              width: 34,
              height: 34,
              flexShrink: 0,
              display: "grid",
              placeItems: "center",
              borderRadius: 4,
              border: `1px solid ${C.line}`,
              background: "rgba(0,0,0,.30)",
            }}
          >
            {rota && roleIconUrl(rota) ? (
              <RoleIcon role={jogador?.role1} size={19} color={rota.color} />
            ) : (
              <UserRound size={17} aria-hidden style={{ color: C.ink4 }} />
            )}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Select
              ariaLabel={`Jogador da linha ${rowIndex + 1}`}
              value={row.playerId}
              onChange={(value) => trocarJogadorDaLinha(gameIndex, rowIndex, value)}
            >
              {opcoesDoJogador(row)}
            </Select>
          </div>
          <BotaoIcone
            label={`Remover a linha ${rowIndex + 1}`}
            onClick={() => removeStatsRowFromGame(gameIndex, rowIndex)}
          />
        </div>

        {jogouPor ? <div style={{ marginTop: 8 }}>{jogouPor}</div> : null}

        <div style={{ marginTop: 8 }}>
          <InputCampeao
            ariaLabel={`Campeão da linha ${rowIndex + 1}`}
            placeholder="Campeão"
            value={row.champion ?? ""}
            onChange={(valor) => updateStatsRowField(gameIndex, rowIndex, "champion", valor)}
          />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0,1fr)) 50px",
            gap: 8,
            marginTop: 10,
            alignItems: "end",
          }}
        >
          {campoNumero("Abates", "Abates", "kills")}
          {campoNumero("Mortes", "Mortes", "deaths")}
          {campoNumero("Assist.", "Assistências", "assists")}
          <div title="KDA calculado: (abates + assistências) ÷ mortes">
            <span style={{ ...rotuloMiudo, textAlign: "center" }}>KDA</span>
            <span
              style={{
                display: "grid",
                placeItems: "center",
                minHeight: 44,
                fontSize: 14,
                fontWeight: 700,
                color: estado === "vazia" ? C.ink4 : C.okSoft,
                ...tabular,
              }}
            >
              {kda.toFixed(2)}
            </span>
          </div>
        </div>

        {motivo ? (
          <p
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 6,
              margin: "9px 0 0",
              fontSize: 12,
              lineHeight: 1.45,
              color: problema ? C.dangerSoft : C.warnSoft,
            }}
          >
            <AlertTriangle size={14} aria-hidden style={{ flexShrink: 0, marginTop: 1 }} />
            {motivo}
          </p>
        ) : null}
      </div>
    );
  };

  /**
   * Um jogo no celular, na ordem em que o resultado é conferido: quem venceu, quanto durou,
   * os dez jogadores e, por último, os bans. A importação da Riot fica recolhida — partida
   * personalizada não tem ID público, então na prática ela quase nunca é usada, e aberta
   * empurrava os jogadores para baixo em todo jogo.
   */
  const renderGameCompacto = (game: SeriesMatch["games"][number], gameIndex: number) => {
    if (!selectedSeries) return null;

    const numero = gameIndex + 1;
    const riotImportKey = getGameImportKey(selectedSeries.id, gameIndex);
    const riotImportStatus = riotImportStatusByGame[riotImportKey];
    const riotMatchId = riotMatchIdsByGame[riotImportKey] ?? "";
    const isImportingRiot = riotImportingGameKey === riotImportKey;
    const importAberto =
      riotAbertos[riotImportKey] ?? Boolean(riotMatchId.trim() || riotImportStatus || isImportingRiot);
    const autoMvpDisplay = getAutoMvpDisplay(game, selectedSeries, jogadoresPorId);
    const estados =
      auditoriaSelecionada?.estadosPorJogo[gameIndex] ??
      game.statsByPlayer.map((): EstadoLinha => "ok");
    const jogoComProblema = auditoriaSelecionada?.jogosComProblema.includes(gameIndex) ?? false;
    const linhasOk = estados.filter((estado) => estado === "ok").length;
    const temOsDoisTimes = Boolean(selectedSeries.teamAId && selectedSeries.teamBId);
    // O id da série é slug (letras, números, hífen): serve de pedaço de id do DOM.
    const idVencedor = `serie-${selectedSeries.id}-jogo-${numero}-vencedor`;
    const idImportacao = `serie-${selectedSeries.id}-jogo-${numero}-riot`;
    const bans = game.bans ?? [];

    return (
      <Card
        key={`${selectedSeries.id}-game-${gameIndex}`}
        padding={12}
        style={{ minWidth: 0, marginTop: 12, borderColor: jogoComProblema ? "rgba(212,87,74,.45)" : C.line }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <h4 style={{ fontFamily: display, fontSize: 19, color: C.ink, margin: 0 }}>Jogo {numero}</h4>
          {jogoComProblema ? <Chip tone="danger">Pendências</Chip> : null}
          {/* O destrutivo fica na ponta oposta e sem rótulo grande (#8). */}
          <span style={{ marginLeft: "auto" }}>
            <BotaoIcone tone="danger" label={`Remover o Jogo ${numero}`} onClick={() => removerJogo(gameIndex)} />
          </span>
        </div>

        {/*
          Vencedor em dois botões grandes com o escudo de cada time, no lugar do select: é o
          campo mais tocado do jogo, e o select abria a roleta do sistema para escolher entre
          dois nomes. Tocar no que já está marcado não desmarca (toque duplo acidental apagaria
          o resultado); para isso há o "Desmarcar".
        */}
        <div style={{ marginTop: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span id={idVencedor} style={{ ...rotuloMiudo, marginBottom: 0 }}>
              Quem venceu
            </span>
            {game.winnerTeamId ? (
              <span style={{ marginLeft: "auto" }}>
                <Button tone="ghost" small onClick={() => updateGameWinner(gameIndex, "")}>
                  Desmarcar
                </Button>
              </span>
            ) : null}
          </div>
          {temOsDoisTimes ? (
            <div
              role="group"
              aria-labelledby={idVencedor}
              style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 8 }}
            >
              {[selectedSeries.teamAId, selectedSeries.teamBId].map((teamId, lado) => {
                const venceu = game.winnerTeamId === teamId;
                return (
                  <button
                    key={`${lado}-${teamId}`}
                    type="button"
                    aria-pressed={venceu}
                    className="adm-toque"
                    onClick={() => {
                      if (!venceu) updateGameWinner(gameIndex, teamId);
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      minWidth: 0,
                      minHeight: 54,
                      padding: "8px 10px",
                      borderRadius: 4,
                      border: `1px solid ${venceu ? "transparent" : game.winnerTeamId ? C.line : "rgba(224,163,58,.45)"}`,
                      background: venceu
                        ? `linear-gradient(180deg, ${C.bronzeHi}, ${C.bronzeDeep})`
                        : "rgba(0,0,0,.26)",
                      boxShadow: `inset 3px 0 0 ${teamColor(teamId)}`,
                      color: venceu ? "#160f06" : C.ink2,
                      fontFamily: "inherit",
                      fontSize: 13.5,
                      fontWeight: venceu ? 800 : 600,
                      textAlign: "left",
                      cursor: "pointer",
                    }}
                  >
                    <MarcaDoTime time={timeDe(teamId)} tamanho={26} />
                    {/* Até duas linhas: meio botão tem ~70px de texto, e "Capangas do Moto Moto"
                        cortado em reticências virava "Capangas…" — dois times assim ficavam iguais. */}
                    <span
                      style={{
                        flex: 1,
                        minWidth: 0,
                        lineHeight: 1.2,
                        overflow: "hidden",
                        overflowWrap: "anywhere",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                      }}
                    >
                      {getTeamName(draft, teamId)}
                    </span>
                    {venceu ? <Trophy size={16} aria-hidden style={{ flexShrink: 0 }} /> : null}
                  </button>
                );
              })}
            </div>
          ) : (
            <LinhaVazia>Escolha os dois times no Confronto para marcar o vencedor.</LinhaVazia>
          )}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0,1fr) minmax(0,1.35fr)",
            gap: 10,
            marginTop: 14,
            alignItems: "start",
          }}
        >
          <Field label="Duração (min)">
            <Input numeric value={game.durationMin ?? ""} onChange={(value) => updateGameDuration(gameIndex, value)} />
          </Field>
          <div title="Maior KDA; desempate por abates, assistências e menos mortes.">
            <span style={rotuloMiudo}>MVP (automático)</span>
            <div
              style={{
                ...caixaLeitura,
                display: "flex",
                alignItems: "center",
                gap: 7,
                minHeight: 44,
                wordBreak: "normal",
                overflowWrap: "anywhere",
              }}
            >
              <Crown
                size={16}
                aria-hidden
                style={{ flexShrink: 0, color: autoMvpDisplay.muted ? C.ink4 : C.bronzeHi }}
              />
              <span style={{ minWidth: 0, color: autoMvpDisplay.muted ? C.ink4 : C.ink }}>{autoMvpDisplay.text}</span>
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: 12,
            border: `1px solid ${C.line}`,
            borderRadius: 4,
            background: "rgba(0,0,0,.18)",
          }}
        >
          <button
            type="button"
            aria-expanded={importAberto}
            aria-controls={idImportacao}
            onClick={() => setRiotAbertos((prev) => ({ ...prev, [riotImportKey]: !importAberto }))}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
              width: "100%",
              minHeight: 46,
              padding: "0 12px",
              border: "none",
              background: "none",
              color: C.ink2,
              fontFamily: "inherit",
              fontSize: 13,
              textAlign: "left",
              cursor: "pointer",
            }}
          >
            <CloudDownload size={17} aria-hidden style={{ flexShrink: 0, color: C.bronze }} />
            <span style={{ flex: 1, minWidth: 0 }}>Importar da Riot pelo ID da partida</span>
            <ChevronDown
              size={17}
              aria-hidden
              style={{ flexShrink: 0, color: C.ink4, transform: importAberto ? "rotate(180deg)" : undefined }}
            />
          </button>
          {importAberto ? (
            <div id={idImportacao} style={{ padding: "2px 12px 12px" }}>
              <Field
                label="ID da partida no LoL (Riot)"
                hint="Preenche vencedor, duração, campeões e K/D/A. O MVP sai do maior KDA."
              >
                <Input
                  placeholder="Ex.: BR1_3210692404"
                  value={riotMatchId}
                  onChange={(value) => setRiotMatchIdForGame(selectedSeries.id, gameIndex, value)}
                />
              </Field>
              <div style={{ marginTop: 10 }}>
                <Button
                  tone="ghost"
                  fullWidth
                  disabled={!podeRiot || isImportingRiot || !riotMatchId.trim() || !temOsDoisTimes}
                  title={podeRiot ? undefined : SEM_PERMISSAO_RIOT}
                  onClick={() => void importGameFromRiot(gameIndex)}
                >
                  {isImportingRiot ? "Importando…" : podeRiot ? "Importar da Riot" : "Importar da Riot (sem permissão)"}
                </Button>
              </div>
              {riotImportStatus ? <AvisoDaRiot status={riotImportStatus} /> : null}
            </div>
          ) : null}
        </div>

        <SubtituloDoJogo icone={UsersRound} contagem={`${linhasOk}/${game.statsByPlayer.length} ok`}>
          Estatísticas por jogador
        </SubtituloDoJogo>
        {avisoCompacto(`jogo:${gameIndex}`) ? (
          <div style={{ marginBottom: 10 }}>{avisoCompacto(`jogo:${gameIndex}`)}</div>
        ) : null}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
          <Button
            // Jogo sem linha nenhuma: trazer o elenco é o primeiro passo, então ele acende.
            tone={game.statsByPlayer.length === 0 ? "gold" : "ghost"}
            small
            onClick={() => fillRosterRowsForGame(gameIndex)}
            style={{ flex: "1 1 auto" }}
          >
            <UsersRound size={15} aria-hidden /> Preencher elenco
          </Button>
          <Button tone="ghost" small onClick={() => addStatsRowToGame(gameIndex)} style={{ flex: "0 0 auto" }}>
            <Plus size={15} aria-hidden /> Linha
          </Button>
        </div>

        <div onWheelCapture={bloquearRoda} style={{ display: "grid", gap: 8 }}>
          {game.statsByPlayer.length === 0 ? (
            <LinhaVazia>
              Nenhuma linha ainda. &quot;Preencher elenco&quot; traz os 10 jogadores na ordem das rotas.
            </LinhaVazia>
          ) : (
            game.statsByPlayer.map((row, rowIndex) =>
              renderStatsCartao(gameIndex, row, rowIndex, estados[rowIndex] ?? "ok"),
            )
          )}
        </div>

        {selectedSeries.teamAId || selectedSeries.teamBId ? (
          <>
            <SubtituloDoJogo icone={Ban} contagem={bans.length > 0 ? String(bans.length) : undefined}>
              Campeões banidos
            </SubtituloDoJogo>
            {avisoCompacto(`bans:${gameIndex}`) ? (
              <div style={{ marginBottom: 10 }}>{avisoCompacto(`bans:${gameIndex}`)}</div>
            ) : null}
            <div style={{ display: "grid", gap: 8 }}>
              {bans.length === 0 ? (
                <LinhaVazia>Nenhum ban registrado neste jogo.</LinhaVazia>
              ) : (
                bans.map((ban, banIndex) => (
                  <div
                    key={`g${gameIndex}-ban${banIndex}`}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "minmax(0,1fr) auto",
                      gap: 8,
                      padding: 10,
                      border: `1px solid ${C.line}`,
                      borderRadius: 4,
                      background: "rgba(0,0,0,.20)",
                      boxShadow: ban.teamId ? `inset 3px 0 0 ${teamColor(ban.teamId)}` : undefined,
                    }}
                  >
                    <Select
                      ariaLabel={`Time do ban ${banIndex + 1}`}
                      value={ban.teamId}
                      onChange={(value) => updateBanField(gameIndex, banIndex, "teamId", value)}
                    >
                      <option value="">Time</option>
                      {selectedSeries.teamAId ? (
                        <option value={selectedSeries.teamAId}>{getTeamName(draft, selectedSeries.teamAId)}</option>
                      ) : null}
                      {selectedSeries.teamBId ? (
                        <option value={selectedSeries.teamBId}>{getTeamName(draft, selectedSeries.teamBId)}</option>
                      ) : null}
                    </Select>
                    <BotaoIcone
                      label={`Remover o ban ${banIndex + 1}`}
                      onClick={() => removeBanFromGame(gameIndex, banIndex)}
                    />
                    <div style={{ gridColumn: "1 / -1" }}>
                      <InputCampeao
                        ariaLabel={`Campeão banido ${banIndex + 1}`}
                        placeholder="Campeão banido"
                        value={ban.championName}
                        onChange={(valor) => updateBanField(gameIndex, banIndex, "championName", valor)}
                      />
                    </div>
                  </div>
                ))
              )}
              <Button tone="ghost" small fullWidth onClick={() => addBanToGame(gameIndex)}>
                <Plus size={15} aria-hidden /> Ban
              </Button>
            </div>
          </>
        ) : null}
      </Card>
    );
  };

  /**
   * W.O. no meio da série: os jogos disputados continuam aqui, editáveis (eles VALEM), e os
   * jogos de W.O. aparecem depois deles, numerados, sem K/D/A — como na página da partida.
   */
  const jogosDeWalkover = selectedSeries ? jogosDeWalkoverDaSerie(selectedSeries, draft) : [];
  const cartoesDeWalkover = selectedSeries ? (
    <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
      {jogosDeWalkover.map((jogo) => (
        <div
          key={`wo-${jogo.gameIndex}`}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
            padding: "10px 12px",
            border: `1px dashed ${C.line2}`,
            borderRadius: 4,
            background: "rgba(0,0,0,.16)",
            boxShadow: `inset 3px 0 0 ${teamColor(jogo.winnerTeamId)}`,
          }}
        >
          <span style={{ fontFamily: display, fontSize: 16, color: C.ink }}>Jogo {jogo.gameIndex}</span>
          <Chip tone="warn">W.O.</Chip>
          <span style={{ fontSize: 12.5, color: C.ink3 }}>
            Vitória de {getTeamName(draft, jogo.winnerTeamId)} por W.O. — sem K/D/A nem MVP.
          </span>
        </div>
      ))}
    </div>
  ) : null;

  let conteudoDosJogos: ReactNode = null;
  if (selectedSeries) {
    if (selectedSeriesIsWalkover) {
      conteudoDosJogos = (
        <>
          <LinhaVazia>{getWalkoverSummaryText(draft, selectedSeries)}</LinhaVazia>
          {selectedSeries.games.map((game, gameIndex) =>
            compacto ? renderGameCompacto(game, gameIndex) : renderGame(game, gameIndex),
          )}
          {cartoesDeWalkover}
        </>
      );
    } else if (selectedSeries.games.length === 0) {
      conteudoDosJogos = compacto ? (
        <LinhaVazia>Nenhum jogo nesta série. Toque em &quot;Adicionar jogo&quot; logo abaixo.</LinhaVazia>
      ) : (
        <LinhaVazia>Nenhum jogo nesta série. Use &quot;Adicionar jogo&quot;.</LinhaVazia>
      );
    } else {
      conteudoDosJogos = selectedSeries.games.map((game, gameIndex) =>
        compacto ? renderGameCompacto(game, gameIndex) : renderGame(game, gameIndex),
      );
    }
  }

  // -------------------------------------------------------------- editor da direita

  const placarSelecionado = selectedSeries ? getSeriesScore(selectedSeries, draft) : null;
  /**
   * Série que já tem vencedor (2 vitórias na MD3, 3 na MD5) não aceita jogo NOVO: um 3º jogo
   * depois de 2x0 vira 3x0 no site e mexe no saldo de mapas do desempate. Editar os jogos
   * existentes continua livre — inclusive trocar o vencedor de um deles.
   */
  const serieDecidida = selectedSeries ? Boolean(getSeriesWinnerTeamId(selectedSeries, draft)) : false;
  const dataHoraSelecionada = isoParaCamposBrasilia(selectedSeries?.date);

  /*
   * Blocos que os dois arranjos usam IGUAIS: o monitor os põe na ordem de sempre, o celular
   * na ordem de quem lança resultado. Um bloco só por campo garante que confirmação, aviso e
   * validação não divergem entre o editor ao lado da lista e o da folha.
   */

  const bannersDaSerie = auditoriaSelecionada ? (
    <>
      {auditoriaSelecionada.bloqueios.length > 0 ? (
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

      {/* Não trava o salvamento, mas costuma ser engano: campeão cedo demais, pontos a mais,
          linha sem campeão, jogador que hoje está em outro time. */}
      {auditoriaSelecionada.avisos.length > 0 ? (
        <div style={{ marginTop: 16 }}>
          <Banner tone="warn" title="Confira esta série (não trava o salvamento)">
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {auditoriaSelecionada.avisos.map((texto) => (
                <li key={texto}>{texto}</li>
              ))}
            </ul>
          </Banner>
        </div>
      ) : null}
    </>
  ) : null;

  const blocoIdentidade = selectedSeries ? (
    renomeandoId ? (
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
    )
  ) : null;

  /*
    Data e horário separados, e não um `datetime-local`: aquele campo só aceita data E
    hora juntas — uma série gravada só com data apareceria inteira em branco, e apagar a
    hora apagaria a data junto. Aqui a hora em branco é estado válido (grava só a data).
    Os dois mostram e gravam a hora de BRASÍLIA, seja qual for o fuso do computador.
  */
  const camposDataHora = selectedSeries ? (
    <div className="lob-2col">
      <Field label="Data">
        <Input
          type="date"
          ariaLabel="Data da série"
          value={dataHoraSelecionada.data}
          onChange={(value) => updateSeriesDataHora(value, dataHoraSelecionada.hora)}
          // Sem colorScheme escuro o navegador desenha o seletor nativo em preto sobre preto.
          style={{ colorScheme: "dark" }}
        />
      </Field>
      <Field label="Horário (Brasília)" hint="Em branco = só a data.">
        <Input
          type="time"
          ariaLabel="Horário da série (Brasília)"
          value={dataHoraSelecionada.hora}
          onChange={(value) => updateSeriesDataHora(dataHoraSelecionada.data, value)}
          style={{ colorScheme: "dark" }}
        />
      </Field>
    </div>
  ) : null;

  /**
   * No celular o escudo do time escolhido aparece ao lado do select — o select nativo não
   * mostra imagem, e é pelo escudo que se confere de relance se o confronto está certo.
   */
  const comEscudo = (teamId: string, controle: ReactNode) =>
    compacto ? (
      <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <MarcaDoTime time={timeDe(teamId)} tamanho={34} />
        <span style={{ flex: 1, minWidth: 0 }}>{controle}</span>
      </span>
    ) : (
      controle
    );

  const camposConfronto = selectedSeries ? (
    <div className="lob-2col">
      <Field label="Time A">
        {comEscudo(
          selectedSeries.teamAId,
          <Select value={selectedSeries.teamAId} onChange={(value) => trocarTimeDaSerie("A", value)}>
            <option value="">Selecione</option>
            {draft.teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </Select>,
        )}
      </Field>
      <Field label="Time B">
        {comEscudo(
          selectedSeries.teamBId,
          <Select value={selectedSeries.teamBId} onChange={(value) => trocarTimeDaSerie("B", value)}>
            <option value="">Selecione</option>
            {draft.teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </Select>,
        )}
      </Field>
      <Field label="Etapa">
        <Select
          ariaLabel="Etapa"
          value={selectedSeries.stage ?? "REGULAR_SEASON"}
          onChange={(value) => updateSeriesStage(value as SeriesStage)}
        >
          <option value="REGULAR_SEASON">{getStageOptionLabel("REGULAR_SEASON")}</option>
          <option value="SEMIFINAL">{getStageOptionLabel("SEMIFINAL")}</option>
          <option value="FINAL">{getStageOptionLabel("FINAL")}</option>
        </Select>
      </Field>
      <Field label="Formato da série">
        <Select
          ariaLabel="Formato da série"
          value={selectedSeriesFormat}
          onChange={(value) => updateSeriesFormat(value as SeriesFormat)}
        >
          <option value="BO3">{getFormatOptionLabel("BO3")}</option>
          <option value="BO5">{getFormatOptionLabel("BO5")}</option>
        </Select>
      </Field>
    </div>
  ) : null;

  // Os jogos lançados já decidiram a série: não cabe W.O. (o servidor recusa). A opção fica
  // desligada — menos a que já está gravada, para a série com problema abrir mostrando o dado.
  const cabeWalkover = selectedSeries ? walkoverPermitido(selectedSeries, draft) : true;
  const placarSoDosJogos = selectedSeries
    ? getSeriesScore({ ...selectedSeries, walkoverWinnerTeamId: undefined }, draft)
    : null;

  const camposWo = selectedSeries ? (
    <>
      <p style={{ margin: "0 0 12px", fontSize: 12, color: C.ink4 }}>
        Use quando um time não comparece ou abandona. Sem jogo lançado, o placar vira{" "}
        {selectedSeriesTargetWins}-0 automático. Com jogos lançados, eles valem (K/D/A e MVP) e o W.O.
        completa a série — ex.: 1x0 e o outro time abandona, {selectedSeriesTargetWins}x0. Nada é apagado.
      </p>
      {!cabeWalkover && placarSoDosJogos ? (
        <div style={{ marginBottom: 12 }}>
          <AvisoEmLinha
            tom="warn"
            texto={`Os jogos lançados já decidiram a série (${placarSoDosJogos.teamAWins}x${placarSoDosJogos.teamBWins}): não cabe W.O.`}
          />
        </div>
      ) : null}
      <div className="lob-2col">
        <Field label="Situação da série">
          <Select
            ariaLabel="Situação da série"
            value={selectedSeries.walkoverWinnerTeamId ?? ""}
            onChange={(value) => updateWalkoverWinner(value)}
          >
            <option value="">Série jogada normalmente</option>
            {[selectedSeries.teamAId, selectedSeries.teamBId].map((teamId) =>
              teamId ? (
                <option
                  key={teamId}
                  value={teamId}
                  disabled={!cabeWalkover && selectedSeries.walkoverWinnerTeamId !== teamId}
                >
                  W.O. para {getTeamName(draft, teamId)}
                </option>
              ) : null,
            )}
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
    </>
  ) : null;

  /**
   * A cerimônia do sorteio. No monitor ela continua dentro do editor, onde sempre esteve.
   * No celular ela vai para o <body> por portal, FORA da folha: dentro, o Esc chegava
   * primeiro à folha — que fechava a série e desmontava a cerimônia no meio do giro — e o
   * z-index dela ficava preso ao da folha. Fechada a cerimônia, o foco volta ao botão que a
   * abriu, senão quem usa teclado cairia no topo da página, atrás da folha.
   */
  const sorteioAoVivo = selectedSeries ? (
    <SorteioAoVivo
      aberto={sorteioAberto}
      onFechar={() => {
        setSorteioAberto(false);
        if (compacto) {
          requestAnimationFrame(() =>
            document.querySelector<HTMLButtonElement>(`#${ID_SORTEIO_COMPACTO} button`)?.focus(),
          );
        }
      }}
      serieId={selectedSeries.id}
      teamAId={selectedSeries.teamAId}
      teamBId={selectedSeries.teamBId}
      nomeDoTime={(id) => getTeamName(draft, id)}
      corDoTime={(id) => teamColor(id)}
      blueSideTeamId={selectedSeries.blueSideTeamId}
      cardsUsed={selectedSeries.cardsUsed}
      podeLados={podeLados}
      podeCartas={podeCartas}
      onSorteado={({ tipo, blueSideTeamId, cardsUsed, versao, versaoLida, sorteios }) => {
        // Lado azul fora do confronto da tela = o servidor sorteou sobre outra série gravada
        // (times trocados e não salvos). Não entra no rascunho como se fosse desta.
        if (
          tipo === "lados" &&
          blueSideTeamId &&
          blueSideTeamId !== selectedSeries.teamAId &&
          blueSideTeamId !== selectedSeries.teamBId
        ) {
          avisar(
            "cartinhas",
            `O servidor sorteou entre os times GRAVADOS desta série (${getTeamName(draft, blueSideTeamId)} no azul). Salve o confronto e sorteie de novo.`,
            "warn",
          );
          return;
        }
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
  ) : null;

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
              flexWrap: "wrap",
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
            {/* Com hora quando houver: no domingo da final são três séries no mesmo dia. */}
            <span style={tabular}>{formatSeriesDateLabel(selectedSeries.date)}</span>
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

      {bannersDaSerie}

      <BlockTitle right={<Aviso escopo="identidade" />}>Identificação</BlockTitle>

      <div className="lob-2col">
        {blocoIdentidade}
        {camposDataHora}
      </div>

      <BlockTitle right={<Aviso escopo="times" />}>Confronto</BlockTitle>

      {camposConfronto}

      <BlockTitle right={<Aviso escopo="wo" />}>Resultado por W.O.</BlockTitle>
      {camposWo}

      <BlockTitle
        right={
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <Aviso escopo="cartinhas" />
            {/*
              O sorteio de verdade mora aqui. Os campos abaixo continuam existindo para
              CORRIGIR à mão — e agora toda correção manual entra no histórico, para a
              divergência entre o que foi sorteado e o que ficou gravado ficar visível.
            */}
            <Button
              tone="gold"
              small
              onClick={() => setSorteioAberto(true)}
              disabled={motivoSemSorteio !== null}
              title={motivoSemSorteio ?? undefined}
            >
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

      {sorteioAoVivo}

      {motivoSemSorteio ? <AvisoEmLinha texto={motivoSemSorteio} tom="warn" /> : null}

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
                  {opcoesDeCartinha(card.cardId).map((cardDef) => (
                    <option key={cardDef.id} value={cardDef.id} disabled={cardDef.disabled}>
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
              disabled={
                selectedSeriesIsWalkover || serieDecidida || selectedSeries.games.length >= selectedSeriesMaxGames
              }
              title={
                selectedSeriesIsWalkover
                  ? "Série com W.O.: para lançar mais um jogo disputado, volte a série para “jogada normalmente” (os jogos ficam)."
                  : serieDecidida
                    ? `Série decidida (${placarSelecionado?.teamAWins}x${placarSelecionado?.teamBWins})`
                    : undefined
              }
              onClick={adicionarJogo}
            >
              <Plus size={14} aria-hidden /> {serieDecidida && !selectedSeriesIsWalkover ? "Série decidida" : "Adicionar jogo"}
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

  // -------------------------------------------------------------- editor no celular

  /** "Alfa x Beta" — ou "Nova série" enquanto nenhum time foi escolhido. */
  const tituloDaFolha = selectedSeries
    ? selectedSeries.teamAId || selectedSeries.teamBId
      ? `${nomeOuVaga(selectedSeries.teamAId, "Time A")} x ${nomeOuVaga(selectedSeries.teamBId, "Time B")}`
      : "Nova série"
    : "";

  const blocoConfrontoCompacto = selectedSeries ? (
    <>
      <TituloCompacto icone={Shield} aviso={avisoCompacto("times")}>
        Confronto
      </TituloCompacto>
      {camposConfronto}
    </>
  ) : null;

  let cartinhasCompactas: ReactNode = null;
  if (compacto && selectedSeries) {
    const cartinhas = selectedSeries.cardsUsed ?? [];
    cartinhasCompactas =
      cartinhas.length === 0 ? (
        <LinhaVazia>Nenhuma cartinha registrada nesta série.</LinhaVazia>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {cartinhas.map((card, cardIndex) => {
            // A dupla vale para os dois times: o desenho das duas cartas diz isso sem texto.
            const dupla = card.dupla === true || isDuplaCard(card.cardId);
            const Desenho = dupla ? IconeCartas : IconeCarta;
            return (
              <div
                key={`card-${cardIndex}`}
                style={{
                  display: "grid",
                  gridTemplateColumns: "auto minmax(0,1fr) auto",
                  gap: 10,
                  alignItems: "center",
                  padding: 10,
                  border: `1px solid ${C.line}`,
                  borderRadius: 4,
                  background: "rgba(0,0,0,.20)",
                  boxShadow: card.teamId ? `inset 3px 0 0 ${teamColor(card.teamId)}` : undefined,
                }}
              >
                <span
                  title={dupla ? "Cartinha dupla: vale para os dois times" : "Cartinha de um time"}
                  style={{ display: "grid", placeItems: "center", color: C.bronzeHi }}
                >
                  <Desenho size={26} aria-hidden />
                </span>
                <div style={{ display: "grid", gap: 8, minWidth: 0 }}>
                  <Select
                    ariaLabel={`Time da cartinha ${cardIndex + 1}`}
                    value={card.teamId}
                    onChange={(value) => updateCardField(cardIndex, "teamId", value)}
                  >
                    <option value="">Time</option>
                    {selectedSeries.teamAId ? (
                      <option value={selectedSeries.teamAId}>{getTeamName(draft, selectedSeries.teamAId)}</option>
                    ) : null}
                    {selectedSeries.teamBId ? (
                      <option value={selectedSeries.teamBId}>{getTeamName(draft, selectedSeries.teamBId)}</option>
                    ) : null}
                  </Select>
                  <Select
                    ariaLabel={`Cartinha ${cardIndex + 1}`}
                    value={card.cardId}
                    onChange={(value) => updateCardField(cardIndex, "cardId", value)}
                  >
                    {opcoesDeCartinha(card.cardId).map((cardDef) => (
                      <option key={cardDef.id} value={cardDef.id} disabled={cardDef.disabled}>
                        {cardDef.title}
                      </option>
                    ))}
                  </Select>
                </div>
                <BotaoIcone
                  label={`Remover a cartinha ${cardIndex + 1}`}
                  onClick={() => removeCardFromSeries(cardIndex)}
                />
              </div>
            );
          })}
        </div>
      );
  }

  const serieCompleta = selectedSeries ? selectedSeries.games.length >= selectedSeriesMaxGames : false;
  const rotuloDoAdicionarCompacto = !selectedSeries
    ? ""
    : serieDecidida
      ? `Série decidida (${placarSelecionado?.teamAWins}x${placarSelecionado?.teamBWins})`
      : serieCompleta
        ? `${selectedSeriesFormatLabel} completa: ${selectedSeriesMaxGames} jogos`
        : `Adicionar jogo ${selectedSeries.games.length + 1}`;

  const editorCompacto =
    compacto && selectedSeries ? (
    // A folha vai para o <body>: a classe traz junto o anel de foco e as grades do painel.
    <div className="lob-series">
      <PlacarDaSerie
        timeA={timeDe(selectedSeries.teamAId)}
        timeB={timeDe(selectedSeries.teamBId)}
        nomeA={nomeOuVaga(selectedSeries.teamAId, "Time A")}
        nomeB={nomeOuVaga(selectedSeries.teamBId, "Time B")}
        vitoriasA={placarSelecionado?.teamAWins ?? 0}
        vitoriasB={placarSelecionado?.teamBWins ?? 0}
      />
      <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap", justifyContent: "center" }}>
        <Chip
          tone={selectedSeriesIsWalkover ? "warn" : getSeriesWinnerTeamId(selectedSeries, draft) ? "ok" : "neutro"}
        >
          {getSeriesStateLabel(selectedSeriesIsWalkover, Boolean(getSeriesWinnerTeamId(selectedSeries, draft)))}
        </Chip>
        <Chip tone="neutro">
          {selectedSeries.games.length}/{selectedSeriesMaxGames} jogos
        </Chip>
      </div>

      {bannersDaSerie}

      {confrontoNoTopo ? blocoConfrontoCompacto : null}

      <TituloCompacto icone={Swords}>Jogos da série</TituloCompacto>
      <p style={{ margin: "0 0 4px", fontSize: 12.5, lineHeight: 1.5, color: C.ink4 }}>
        {getGamesSectionDescription(
          selectedSeriesIsWalkover,
          selectedSeriesFormatLabel,
          selectedSeriesMaxGames,
          selectedSeriesTargetWins,
        )}
      </p>
      <div>{conteudoDosJogos}</div>
      {/* O retorno de adicionar/remover jogo fica junto do botão, que é onde o dedo está. */}
      {avisoCompacto("jogos") ? <div style={{ marginTop: 12 }}>{avisoCompacto("jogos")}</div> : null}
      {selectedSeriesIsWalkover ? null : (
        <div style={{ marginTop: 12 }}>
          <Button tone="gold" fullWidth disabled={serieCompleta || serieDecidida} onClick={adicionarJogo}>
            <Plus size={17} aria-hidden />
            {rotuloDoAdicionarCompacto}
          </Button>
        </div>
      )}

      <TituloCompacto
        icone={IconeCartas}
        aviso={avisoCompacto("cartinhas")}
        acoes={
          <>
            {/* O id é do invólucro: o `Button` do kit não repassa id, e o foco volta para cá. */}
            <span id={ID_SORTEIO_COMPACTO} style={{ display: "flex", flex: "1 1 auto" }}>
              <Button
                tone="gold"
                small
                fullWidth
                onClick={() => setSorteioAberto(true)}
                disabled={motivoSemSorteio !== null}
                title={motivoSemSorteio ?? undefined}
              >
                <Dices size={15} aria-hidden /> Sortear ao vivo
              </Button>
            </span>
            <Button tone="ghost" small onClick={addCardToSeries} style={{ flex: "1 1 auto" }}>
              <Plus size={15} aria-hidden /> Cartinha
            </Button>
          </>
        }
      >
        Cartinhas da série
      </TituloCompacto>
      {motivoSemSorteio ? <AvisoEmLinha texto={motivoSemSorteio} tom="warn" /> : null}
      {cartinhasCompactas}

      {confrontoNoTopo ? null : blocoConfrontoCompacto}

      <TituloCompacto icone={CalendarClock}>Data e horário</TituloCompacto>
      {camposDataHora}

      <TituloCompacto icone={Flag} aviso={avisoCompacto("wo")}>
        Resultado por W.O.
      </TituloCompacto>
      {camposWo}

      <TituloCompacto icone={Link2} aviso={avisoCompacto("identidade")}>
        Identificação
      </TituloCompacto>
      {blocoIdentidade}
    </div>
  ) : null;

  /**
   * Rodapé fixo da folha: o destrutivo à esquerda, pequeno; o Concluir ocupa o resto, no
   * alcance do polegar. A nota existe porque a folha cobre a barra de baixo, onde fica o
   * Salvar — sem ela, "Concluir" parecia gravar no site.
   */
  const rodapeCompacto = selectedSeries ? (
    <>
      <p style={{ flexBasis: "100%", margin: 0, fontSize: 11, lineHeight: 1.4, color: C.ink4 }}>
        Cada mudança já está no rascunho. Para publicar, conclua e toque em Salvar.
      </p>
      <Button tone="danger" onClick={confirmDeleteSelectedSeries}>
        <Trash2 size={16} aria-hidden /> Excluir série
      </Button>
      <Button tone="gold" onClick={fecharEditorCompacto} style={{ flex: "1 1 auto" }}>
        <Check size={17} aria-hidden /> Concluir
      </Button>
    </>
  ) : null;

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
            <Button tone="gold" onClick={createSeries} fullWidth={compacto}>
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

      {compacto ? (
        <>
          {listaCompacta}

          <Folha
            aberta={selectedSeries !== null}
            cheia
            icone={Swords}
            titulo={tituloDaFolha}
            subtitulo={
              selectedSeries ? (
                <span style={tabular}>
                  {getSeriesStageLabel(selectedSeries)} · {selectedSeriesFormatLabel} ·{" "}
                  {formatSeriesDateLabel(selectedSeries.date)}
                </span>
              ) : undefined
            }
            onFechar={fecharEditorCompacto}
            rotuloFechar="Fechar a série"
            rodape={rodapeCompacto}
          >
            {editorCompacto}
          </Folha>

          {/* Fora da folha e por cima dela — ver o comentário de `sorteioAoVivo`. */}
          {sorteioAoVivo && typeof document !== "undefined" ? createPortal(sorteioAoVivo, document.body) : null}
        </>
      ) : (
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
      )}
    </div>
  );
}
