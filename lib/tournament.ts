import type {
  ArchivedSeason,
  Player,
  PlayerGameStats,
  SeriesFormat,
  SeriesGame,
  SeriesMatch,
  Team,
  TournamentDataset,
  TournamentDatasetSnapshot,
} from "@/lib/schema";
import { toDateEnd, toDateStart } from "@/lib/format";
import { resolveChampion } from "@/lib/champions";
import { ALL_CARDS } from "@/lib/cards";
import type {
  CardStat,
  ChampionAggregate,
  ChampionLeaderboardRow,
  ChampionMetric,
  ChampionshipResult,
  DateRangeFilter,
  LeaderboardMetric,
  LeaderboardRow,
  PlayerAggregate,
  SeriesMvpResult,
  SeriesScore,
  SeriesSummary,
  StandingsRow,
  StandingsSource,
  TeamAggregate,
} from "@/types/domain";

interface DatasetIndexes {
  teamsById: Map<string, Team>;
  teamsBySlug: Map<string, Team>;
  playersById: Map<string, Player>;
  playersBySlug: Map<string, Player>;
  playersByTeamId: Map<string, Player[]>;
}

interface AggregationFilters extends DateRangeFilter {
  teamId?: string;
}

export function getKda(kills: number, deaths: number, assists: number) {
  return (kills + assists) / Math.max(1, deaths);
}

export function inferGameMvpPlayerId(rows: PlayerGameStats[]) {
  const eligibleRows = rows.filter((row) => row.playerId.trim().length > 0);
  if (eligibleRows.length === 0) return "";

  const ranked = eligibleRows
    .slice()
    .sort((a, b) => {
      const aKda = getKda(a.kills, a.deaths, a.assists);
      const bKda = getKda(b.kills, b.deaths, b.assists);
      if (bKda !== aKda) return bKda - aKda;
      if (b.kills !== a.kills) return b.kills - a.kills;
      if (b.assists !== a.assists) return b.assists - a.assists;
      if (a.deaths !== b.deaths) return a.deaths - b.deaths;
      return a.playerId.localeCompare(b.playerId, "pt-BR");
    });

  return ranked[0].playerId;
}

// ============================================================
// Substituto avulso, reserva e saída de vez (regra 6 da 4ª Edição)
// ============================================================

/**
 * O time pelo qual a linha de K/D/A jogou AQUELE jogo: o da própria linha (substituto
 * avulso) ou, sem ele, o do jogador. `undefined` só quando nenhum dos dois diz — o que o
 * schema recusa para o reserva (sem time), e por isso na prática não acontece.
 *
 * É a ÚNICA regra de "de que lado esta linha conta": abates do time, vitória, MVP,
 * histórico do jogador, tabelas da partida, campeões. O mesmo reserva pode cobrir times
 * diferentes em séries diferentes, e o passado não muda quando ele herda uma vaga, porque
 * cada linha avulsa carrega o seu próprio time.
 */
export function timeDaLinha(
  linha: Pick<PlayerGameStats, "teamId">,
  jogador: Pick<Player, "teamId"> | undefined,
): string | undefined {
  return linha.teamId ?? jogador?.teamId;
}

/**
 * Se o jogador está no ELENCO PÚBLICO do time dele: tem time, não é reserva e não saiu de
 * vez. É o que conta em /times, no PTS do elenco, no Multi OP.GG e na contagem de 5.
 *
 * Quem saiu (`saiuEm`) continua no dataset, com o time, porque o K/D/A dele segue nas
 * partidas e na ficha — só deixa de ser exibido como titular.
 */
export function estaNoElenco(jogador: Pick<Player, "teamId" | "reserva" | "saiuEm">): boolean {
  return jogador.teamId !== undefined && jogador.reserva !== true && !jogador.saiuEm;
}

/** Os titulares de HOJE do time (ver `estaNoElenco`), na ordem do dataset. */
export function elencoAtivo(dataset: Pick<TournamentDataset, "players">, teamId: string): Player[] {
  return dataset.players.filter((jogador) => jogador.teamId === teamId && estaNoElenco(jogador));
}

/** Os reservas oficiais (sem time) do dataset, na ordem do dataset. */
export function reservasDoDataset(dataset: Pick<TournamentDataset, "players">): Player[] {
  return dataset.players.filter((jogador) => jogador.reserva === true && jogador.teamId === undefined);
}

/**
 * O jogador aparece em algum jogo (linha de K/D/A ou MVP gravado). Quem já jogou não pode
 * ser apagado: o histórico dele é das partidas — o caminho é "Substituir de vez".
 */
export function jogadorTemHistorico(dataset: Pick<TournamentDataset, "seriesMatches">, playerId: string): boolean {
  return dataset.seriesMatches.some((series) =>
    series.games.some(
      (game) => game.mvpPlayerId === playerId || game.statsByPlayer.some((linha) => linha.playerId === playerId),
    ),
  );
}

/**
 * "Substituir de vez" (regra 6): o titular sai do elenco público e o reserva herda a vaga.
 * Pura — devolve o dataset novo, não grava nada.
 *
 *   - o titular ganha `saiuEm` e FICA com o time: as linhas dele sem `teamId` próprio
 *     continuam contando para o time em que jogou (K/D/A nas partidas e na ficha);
 *   - o reserva recebe o `teamId` do titular e perde `reserva` — e também um `saiuEm`
 *     antigo, de quando saiu de outro time e voltou à reserva: com ele o herdeiro recebia o
 *     time e continuava FORA do elenco (`estaNoElenco`), e o time ficava com 4 no site;
 *   - as linhas avulsas do reserva (com `teamId` próprio) não mudam: continuam no time em
 *     que ele jogou cada jogo.
 *
 * A marca de capitão de quem sai fica gravada (é histórico), mas deixa de valer: o site só
 * reconhece capitão no elenco (lib/roster.ts), e a organização marca o novo capitão.
 *
 * Lança `Error` com a mensagem em português quando a troca não faz sentido.
 */
export function substituirDeVez(
  dataset: TournamentDataset,
  titularId: string,
  reservaId: string,
  quandoISO: string,
): TournamentDataset {
  const titular = dataset.players.find((jogador) => jogador.id === titularId);
  const reserva = dataset.players.find((jogador) => jogador.id === reservaId);
  if (!titular) throw new Error("Titular não encontrado.");
  if (!reserva) throw new Error("Reserva não encontrado.");
  if (!estaNoElenco(titular) || titular.teamId === undefined) {
    throw new Error(`${titular.nick} não está no elenco de nenhum time.`);
  }
  if (reserva.reserva !== true || reserva.teamId !== undefined) {
    throw new Error(`${reserva.nick} não é reserva (sem time).`);
  }

  const teamId = titular.teamId;
  return {
    ...dataset,
    players: dataset.players.map((jogador) => {
      if (jogador.id === titularId) return { ...jogador, saiuEm: quandoISO };
      if (jogador.id === reservaId) {
        const herdeiro: Player = { ...jogador, teamId };
        delete herdeiro.reserva;
        delete herdeiro.saiuEm;
        return herdeiro;
      }
      return jogador;
    }),
  };
}

/**
 * A linha jogou como SUBSTITUTO AVULSO: carrega um time próprio, diferente do time do
 * jogador (ou o jogador não tem time). Só serve para a exibição marcar a linha — a conta
 * é sempre por `timeDaLinha`.
 */
export function linhaDeSubstituto(
  linha: Pick<PlayerGameStats, "teamId">,
  jogador: Pick<Player, "teamId"> | undefined,
): boolean {
  return linha.teamId !== undefined && linha.teamId !== jogador?.teamId;
}

/**
 * Se a linha deste jogador NESTA série precisa dizer por qual time ele jogou: o jogador é
 * reserva (sem time) ou o time dele não disputa a série — o substituto avulso. Sem o
 * `teamId` na linha, o reserva é recusado pelo schema e o titular de outro time some das
 * duas colunas da partida (a linha conta para o time dele, que não está na série).
 *
 * Para quem joga pelo próprio time a linha fica sem `teamId`, como sempre foi.
 */
export function linhaPrecisaDeTime(
  jogador: Pick<Player, "teamId">,
  series: Pick<SeriesMatch, "teamAId" | "teamBId">,
): boolean {
  return jogador.teamId !== series.teamAId && jogador.teamId !== series.teamBId;
}

/** A linha como texto comparável: jogador, time da linha, campeão e K/D/A. */
function chaveDaLinha(linha: PlayerGameStats): string {
  return JSON.stringify([
    linha.playerId,
    linha.teamId ?? "",
    (linha.champion ?? "").trim(),
    linha.kills,
    linha.deaths,
    linha.assists,
  ]);
}

/**
 * A MESMA linha (jogador, "Jogou por", campeão e K/D/A) já está gravada nesta série — em
 * qualquer jogo dela, para que apagar ou reordenar um jogo não transforme uma sobra antiga
 * em linha "nova". Sem série gravada (série nova), nenhuma linha está.
 */
export function linhaJaGravada(
  linha: PlayerGameStats,
  gravada: Pick<SeriesMatch, "games"> | undefined,
): boolean {
  if (!gravada) return false;
  const chave = chaveDaLinha(linha);
  return gravada.games.some((jogo) => jogo.statsByPlayer.some((outra) => chaveDaLinha(outra) === chave));
}

/**
 * Linhas que o envio ACRESCENTA ou MUDA, de titular de um time que não disputa a série, sem
 * "Jogou por" (`teamId` na linha). É o substituto avulso esquecido: a linha sumia das duas
 * colunas da partida, e os abates e o jogo iam para o time DELE, que nem jogou a série.
 *
 * ⚠ NÃO ESTÁ NO SCHEMA DE PROPÓSITO, como `problemasDeJogoDepoisDaDecisao`: o dado real tem
 * sobras assim (jogador que trocou de time depois de jogar), e o schema roda em toda
 * leitura. Por isso só a linha que não está gravada igual na mesma série é recusada — a
 * sobra antiga, intocada, continua passando.
 */
export function problemasDeLinhaSemTime(
  proposta: TournamentDataset,
  gravado: Pick<TournamentDataset, "seriesMatches"> | null,
): string[] {
  const antes = new Map((gravado?.seriesMatches ?? []).map((serie) => [serie.id, serie]));
  const nomes = new Map(proposta.teams.map((time) => [time.id, time.name]));
  const jogadores = new Map(proposta.players.map((jogador) => [jogador.id, jogador]));
  const nome = (teamId: string) => nomes.get(teamId) ?? teamId;
  const problemas: string[] = [];

  for (const serie of proposta.seriesMatches) {
    const anterior = antes.get(serie.id);
    serie.games.forEach((jogo, indice) => {
      for (const linha of jogo.statsByPlayer) {
        if (linha.teamId !== undefined) continue;
        const jogador = jogadores.get(linha.playerId);
        // Sem jogador ou sem time (reserva), quem recusa é o schema.
        if (!jogador || jogador.teamId === undefined) continue;
        if (!linhaPrecisaDeTime(jogador, serie) || linhaJaGravada(linha, anterior)) continue;
        problemas.push(
          `Jogo ${indice + 1} da série ${serie.id} (${nome(serie.teamAId)} x ${nome(serie.teamBId)}): ` +
            `${jogador.nick} é de ${nome(jogador.teamId)}, que não disputa a série. Se ele cobriu uma vaga ` +
            `como substituto, marque em “Jogou por” o time que ele cobriu (${nome(serie.teamAId)} ou ` +
            `${nome(serie.teamBId)}).`,
        );
      }
    });
  }
  return problemas;
}

/**
 * Linhas de K/D/A do jogador SEM "Jogou por" (`teamId` na linha): as que contam pelo time
 * do próprio jogador — e por isso mudam de lado junto com ele.
 */
export function linhasSemJogouPor(dataset: Pick<TournamentDataset, "seriesMatches">, playerId: string): number {
  let total = 0;
  for (const serie of dataset.seriesMatches) {
    for (const jogo of serie.games) {
      for (const linha of jogo.statsByPlayer) {
        if (linha.playerId === playerId && linha.teamId === undefined) total += 1;
      }
    }
  }
  return total;
}

/**
 * Troca de time PELO CADASTRO de quem já jogou pelo time antigo (FB-3, a outra metade do
 * `problemasDeLinhaSemTime`).
 *
 * A linha sem "Jogou por" vale pelo time do JOGADOR (`timeDaLinha`). Trocar o time dele no
 * campo Time move junto todo o passado: na série ALFA x BETA, a TOP da ALFA fez 9 abates e
 * passa para a GAMA — a linha some da partida, a ALFA cai de 13 para 4 abates e a GAMA, que
 * nem disputou a série, fica com 9. As linhas não mudam, então nem `problemasDeLinhaSemTime`
 * (que só olha linha nova) nem o diff de autorização (que cobra só `players:write`) viam.
 *
 * Recusa quando o jogador já tinha time, o envio troca por OUTRO time, e ele tem linha sem
 * "Jogou por" tanto no gravado (já jogou pelo time antigo) quanto no envio (alguma ainda
 * mudaria de lado). Fica de fora, de propósito:
 *   - quem nunca jogou pelo próprio time (sem linha sem "Jogou por" gravada) troca à vontade;
 *   - "Substituir de vez" não troca o time do titular, e o reserva que herda a vaga não tinha
 *     time — as linhas dele, de reserva, sempre carregam o próprio `teamId`;
 *   - virar reserva (sem time) quem recusa é o schema: a linha do reserva precisa do time;
 *   - quem carimba o time antigo nas linhas (ou as apaga) no mesmo envio: aí nada muda de
 *     lado, e mexer na linha já custa `results:write` no diff.
 *
 * ⚠ Como `problemasDeLinhaSemTime`, NÃO ESTÁ NO SCHEMA: o dado real tem sobras de quem
 * trocou de time depois de jogar, e o schema roda em toda leitura. Só a gravação que FAZ a
 * troca é recusada; o dataset gravado assim continua abrindo e salvando.
 */
export function problemasDeTrocaDeTimeComHistorico(
  proposta: TournamentDataset,
  gravado: (Pick<TournamentDataset, "players" | "seriesMatches"> & Partial<Pick<TournamentDataset, "teams">>) | null,
): string[] {
  if (!gravado) return [];
  const antes = new Map(gravado.players.map((jogador) => [jogador.id, jogador]));
  const nomes = new Map([...(gravado.teams ?? []), ...proposta.teams].map((time) => [time.id, time.name]));
  const nome = (teamId: string) => nomes.get(teamId) ?? teamId;
  const problemas: string[] = [];

  for (const jogador of proposta.players) {
    const novo = jogador.teamId;
    const antigo = antes.get(jogador.id)?.teamId;
    if (novo === undefined || antigo === undefined || novo === antigo) continue;
    if (linhasSemJogouPor(gravado, jogador.id) === 0) continue;
    const quantas = linhasSemJogouPor(proposta, jogador.id);
    if (quantas === 0) continue;
    problemas.push(
      `${jogador.nick} tem ${quantas} linha(s) de K/D/A sem “Jogou por”, que contam pelo time dele ` +
        `(${nome(antigo)}). Trocar o time dele para ${nome(novo)} pelo cadastro levaria esses abates, ` +
        `jogos e MVPs para ${nome(novo)}. Para tirá-lo do time sem mudar a história, use “Substituir de ` +
        `vez”; se ele só cobriu uma vaga num jogo, deixe o time dele como está e marque “Jogou por” na ` +
        `linha desse jogo.`,
    );
  }
  return problemas;
}

/**
 * O time pelo qual o jogador jogou ESTE jogo: o da linha dele; sem linha (MVP gravado à
 * mão num jogo sem estatística), o time do jogador.
 */
function timeNoJogo(
  game: SeriesGame,
  playerId: string,
  playersById: ReadonlyMap<string, Player>,
): string | undefined {
  const linha = game.statsByPlayer.find((row) => row.playerId === playerId);
  const jogador = playersById.get(playerId);
  return linha ? timeDaLinha(linha, jogador) : jogador?.teamId;
}

/** As linhas do jogo que jogaram por um dos dois times da série (substituto incluso). */
function linhasDosTimesDaSerie(
  game: SeriesGame,
  series: SeriesMatch,
  playersById: ReadonlyMap<string, Player>,
): PlayerGameStats[] {
  return game.statsByPlayer.filter((linha) => {
    const jogador = playersById.get(linha.playerId);
    if (!jogador) return false;
    const time = timeDaLinha(linha, jogador);
    return time === series.teamAId || time === series.teamBId;
  });
}

/**
 * O MVP do jogo, contando só quem jogou por um dos dois times — pela LINHA, o que inclui o
 * substituto avulso (ele pode ser MVP). Sem ninguém, vale o `mvpPlayerId` gravado à mão,
 * como sempre para jogo sem estatística.
 *
 * É o caminho das páginas e das agregações. `getGameMvpPlayerId` (com o elenco por
 * jogador) continua exportado para quem já o usa.
 */
export function mvpDoJogo(
  game: SeriesGame,
  series: SeriesMatch,
  playersById: ReadonlyMap<string, Player>,
): string {
  return inferGameMvpPlayerId(linhasDosTimesDaSerie(game, series, playersById)) || game.mvpPlayerId;
}

/**
 * Índice teamId → ids dos jogadores. Montado uma vez e reaproveitado.
 *
 * Existe para o elenco de uma série sair sem varrer `dataset.players` a cada jogo:
 * `applyAutoGameMvpsToDataset` roda em toda gravação E na canonicalização do diff de
 * autorização, então o custo aparece. O reserva (sem time) não entra em balde nenhum.
 */
function idsPorTime(dataset: TournamentDataset): Map<string, Set<string>> {
  const mapa = new Map<string, Set<string>>();
  for (const jogador of dataset.players) {
    if (jogador.teamId === undefined) continue;
    const balde = mapa.get(jogador.teamId);
    if (balde) balde.add(jogador.id);
    else mapa.set(jogador.teamId, new Set([jogador.id]));
  }
  return mapa;
}

/**
 * Quem pode ser MVP desta série: o elenco dos DOIS times que a disputam, MAIS quem jogou
 * por um deles como substituto avulso (linha com `teamId` de um dos dois).
 */
export function elencoDaSerie(
  series: SeriesMatch,
  dataset: TournamentDataset,
  indice = idsPorTime(dataset),
): Set<string> {
  const elenco = new Set([
    ...(indice.get(series.teamAId) ?? []),
    ...(indice.get(series.teamBId) ?? []),
  ]);
  for (const game of series.games) {
    for (const linha of game.statsByPlayer) {
      if (linha.teamId === series.teamAId || linha.teamId === series.teamBId) elenco.add(linha.playerId);
    }
  }
  return elenco;
}

/**
 * O MVP do jogo, restrito a quem de fato joga por um dos dois times.
 *
 * O `elenco` é OBRIGATÓRIO de propósito. `inferGameMvpPlayerId` escolhe a melhor linha de
 * K/D/A do jogo, e uma linha pode carregar um `playerId` que não é de nenhum dos dois
 * times — resto de uma troca de time na série, ou id digitado errado no painel. Sem o
 * recorte, o MVP anunciado podia ser alguém que não aparece em NENHUMA das duas tabelas
 * daquele jogo, o que na tela parece defeito de renderização e na verdade é o dado.
 *
 * Quando o recorte não sobra ninguém, vale o `mvpPlayerId` gravado à mão — que é o mesmo
 * comportamento de sempre para jogo sem estatística.
 */
export function getGameMvpPlayerId(game: SeriesGame, elenco: ReadonlySet<string>) {
  const doElenco = game.statsByPlayer.filter((linha) => elenco.has(linha.playerId));
  return inferGameMvpPlayerId(doElenco) || game.mvpPlayerId;
}

export function getSeriesFormat(series: SeriesMatch, dataset: TournamentDataset): SeriesFormat {
  return series.format ?? dataset.tournament.format;
}

export function getSeriesFormatLabel(series: SeriesMatch, dataset: TournamentDataset) {
  return getSeriesFormat(series, dataset) === "BO5" ? "MD5" : "MD3";
}

export function getSeriesTargetWins(series: SeriesMatch, dataset: TournamentDataset) {
  return getSeriesFormat(series, dataset) === "BO5" ? 3 : 2;
}

export function getSeriesMaxGames(series: SeriesMatch, dataset: TournamentDataset) {
  return getSeriesFormat(series, dataset) === "BO5" ? 5 : 3;
}

export function isRegularSeasonSeries(series: SeriesMatch) {
  return (series.stage ?? "REGULAR_SEASON") === "REGULAR_SEASON";
}

export function getSeriesStageLabel(series: SeriesMatch) {
  const stage = series.stage ?? "REGULAR_SEASON";
  if (stage === "SEMIFINAL") return "Semifinal";
  if (stage === "FINAL") return "Final";
  return "Fase regular";
}

/**
 * Carimba o MVP automático em cada jogo — SEM o recorte por elenco, de propósito.
 *
 * Esta função alimenta duas coisas que não podem depender de quem está em qual time:
 * `normalizeDatasetForSave` (o que vai para o banco) e `canonical()` do diff de
 * AUTORIZAÇÃO, que compara o dataset atual com o enviado.
 *
 * Com o recorte aqui, mover um jogador de time mudava o elenco das séries dele, mudava o
 * MVP derivado e fazia aparecer diferença em `seriesMatches[].games` — então transferir um
 * jogador passava a exigir `results:write`, e um admin com apenas `players:write` levava
 * 403 citando séries que ele nem abriu.
 *
 * O recorte por elenco vive onde ele resolve o problema para o qual foi criado: na
 * EXIBIÇÃO e na AGREGAÇÃO (`mvpDoJogo`: `buildSeriesPlayerTotals`,
 * `applyGameMvpToAccumulators`, `getPlayerGameHistory` e as duas páginas de partida), que
 * não gravam nada.
 *
 * Os jogos de uma série com W.O. são PRESERVADOS: com o W.O. no meio da série ("jogos
 * valem, W.O. completa", 22/10/2026), eles fazem parte do placar. Antes esta função
 * zerava `games` de toda série com W.O. — o que, agora, apagaria os jogos disputados na
 * primeira gravação.
 */
export function applyAutoGameMvpsToDataset(dataset: TournamentDataset): TournamentDataset {
  return {
    ...dataset,
    seriesMatches: dataset.seriesMatches.map((series) => ({
      ...series,
      games: series.games.map((game) => ({
        ...game,
        mvpPlayerId: inferGameMvpPlayerId(game.statsByPlayer) || game.mvpPlayerId,
      })),
    })),
  };
}

export function createIndexes(dataset: TournamentDataset): DatasetIndexes {
  const teamsById = new Map(dataset.teams.map((team) => [team.id, team]));
  const teamsBySlug = new Map(dataset.teams.map((team) => [team.slug, team]));
  const playersById = new Map(dataset.players.map((player) => [player.id, player]));
  const playersBySlug = new Map(dataset.players.map((player) => [player.slug, player]));
  // Todos os jogadores do time, INCLUSIVE quem saiu de vez (é o histórico); o elenco
  // público é `elencoAtivo`. O reserva, sem time, não entra em balde nenhum.
  const playersByTeamId = new Map<string, Player[]>();

  for (const player of dataset.players) {
    if (player.teamId === undefined) continue;
    const bucket = playersByTeamId.get(player.teamId);
    if (bucket) bucket.push(player);
    else playersByTeamId.set(player.teamId, [player]);
  }

  for (const roster of playersByTeamId.values()) {
    roster.sort((a, b) => a.nick.localeCompare(b.nick, "pt-BR"));
  }

  return { teamsById, teamsBySlug, playersById, playersBySlug, playersByTeamId };
}

/** Placar oficial de uma série, com a parte que veio do W.O. separada. */
export type PlacarComWalkover = SeriesScore & {
  /**
   * Jogos de W.O. somados ao vencedor do W.O. para completar a série (0 sem W.O.). São
   * jogos que NÃO aconteceram: sem K/D/A, sem MVP, fora de "jogos disputados" de todo
   * mundo — mas contam no placar e no saldo de games da tabela.
   */
  jogosDeWalkover: number;
};

/**
 * "Jogos valem, W.O. completa" (decisão de 22/10/2026): vitórias nos jogos disputados +
 * jogos de W.O. para o vencedor do W.O. até completar a série (MD3: 2; MD5: 3).
 *
 *   - A venceu o jogo 1 e B abandonou       → 2x0 A (1 jogo de W.O.);
 *   - B venceu o jogo 1 e A leva o W.O.     → 2x1 A (2 jogos de W.O.);
 *   - W.O. sem nenhum jogo (como sempre foi) → 2x0 (MD5: 3x0).
 *
 * O schema já recusa W.O. numa série que os jogos tinham decidido, então o vencedor do
 * W.O. nunca chega aqui com as vitórias completas do OUTRO lado.
 */
export function placarComWalkover(series: SeriesMatch, vitoriasParaFechar: number): PlacarComWalkover {
  let teamAWins = 0;
  let teamBWins = 0;

  for (const game of series.games) {
    if (game.winnerTeamId === series.teamAId) teamAWins += 1;
    if (game.winnerTeamId === series.teamBId) teamBWins += 1;
  }

  if (series.walkoverWinnerTeamId === series.teamAId) {
    const jogosDeWalkover = Math.max(0, vitoriasParaFechar - teamAWins);
    return { teamAWins: teamAWins + jogosDeWalkover, teamBWins, jogosDeWalkover };
  }
  if (series.walkoverWinnerTeamId === series.teamBId) {
    const jogosDeWalkover = Math.max(0, vitoriasParaFechar - teamBWins);
    return { teamAWins, teamBWins: teamBWins + jogosDeWalkover, jogosDeWalkover };
  }

  return { teamAWins, teamBWins, jogosDeWalkover: 0 };
}

export function getSeriesScore(series: SeriesMatch, dataset?: TournamentDataset): SeriesScore {
  const targetWins = dataset ? getSeriesTargetWins(series, dataset) : 2;
  const { teamAWins, teamBWins } = placarComWalkover(series, targetWins);
  return { teamAWins, teamBWins };
}

/**
 * Se a série ainda pode receber W.O.: os jogos lançados não a decidiram. É a mesma regra
 * que o schema aplica (`validateWalkoverSeries`), exposta para o painel avisar ANTES de
 * mandar — W.O. depois de 2x0 numa MD3 é recusado pelo servidor.
 */
export function walkoverPermitido(series: SeriesMatch, dataset?: TournamentDataset): boolean {
  const targetWins = dataset ? getSeriesTargetWins(series, dataset) : 2;
  const soOsJogos = placarComWalkover({ ...series, walkoverWinnerTeamId: undefined }, targetWins);
  return soOsJogos.teamAWins < targetWins && soOsJogos.teamBWins < targetWins;
}

/** Um jogo de W.O. da série, para a página da partida mostrar como tal. */
export type JogoDeWalkover = { gameIndex: number; winnerTeamId: string };

/**
 * Os jogos de W.O. da série, numerados DEPOIS dos disputados: B venceu o jogo 1 e A levou
 * o W.O. numa MD3 → jogos 2 e 3, de A. Vazio sem W.O.
 */
export function jogosDeWalkoverDaSerie(series: SeriesMatch, dataset?: TournamentDataset): JogoDeWalkover[] {
  const vencedor = series.walkoverWinnerTeamId;
  if (!vencedor) return [];
  const targetWins = dataset ? getSeriesTargetWins(series, dataset) : 2;
  const { jogosDeWalkover } = placarComWalkover(series, targetWins);
  return Array.from({ length: jogosDeWalkover }, (_, i) => ({
    gameIndex: series.games.length + i + 1,
    winnerTeamId: vencedor,
  }));
}

export function isWalkoverSeries(series: SeriesMatch) {
  return Boolean(series.walkoverWinnerTeamId);
}

export function getSeriesWinnerTeamId(
  series: SeriesMatch,
  dataset?: TournamentDataset,
): string | null {
  if (series.walkoverWinnerTeamId) return series.walkoverWinnerTeamId;
  const score = getSeriesScore(series, dataset);
  const targetWins = dataset ? getSeriesTargetWins(series, dataset) : 2;
  if (score.teamAWins >= targetWins) return series.teamAId;
  if (score.teamBWins >= targetWins) return series.teamBId;
  return null;
}

export function isSeriesComplete(series: SeriesMatch, dataset?: TournamentDataset) {
  return isWalkoverSeries(series) || getSeriesWinnerTeamId(series, dataset) !== null;
}

function compareDateDesc(a: string, b: string) {
  const ta = new Date(a).getTime();
  const tb = new Date(b).getTime();
  const safeA = Number.isNaN(ta) ? 0 : ta;
  const safeB = Number.isNaN(tb) ? 0 : tb;
  return safeB - safeA;
}

export function sortSeriesByDateDesc(seriesMatches: SeriesMatch[]) {
  return [...seriesMatches].sort((a, b) => {
    const byDate = compareDateDesc(a.date, b.date);
    if (byDate !== 0) return byDate;
    return b.id.localeCompare(a.id, "pt-BR");
  });
}

/**
 * Totais por jogador numa série, só de quem jogou por um dos dois times — pela LINHA de
 * cada jogo, então o substituto avulso entra (e pode ser o MVP da série).
 */
function buildSeriesPlayerTotals(series: SeriesMatch, dataset: TournamentDataset) {
  const indexes = createIndexes(dataset);
  const timesDaSerie = new Set([series.teamAId, series.teamBId]);

  const totals = new Map<
    string,
    { kills: number; deaths: number; assists: number; gameMvps: number }
  >();

  for (const game of series.games) {
    const gameMvpPlayerId = mvpDoJogo(game, series, indexes.playersById);
    const timeDoMvp = timeNoJogo(game, gameMvpPlayerId, indexes.playersById);
    if (indexes.playersById.has(gameMvpPlayerId) && timeDoMvp !== undefined && timesDaSerie.has(timeDoMvp)) {
      const bucket = totals.get(gameMvpPlayerId) ?? {
        kills: 0,
        deaths: 0,
        assists: 0,
        gameMvps: 0,
      };
      bucket.gameMvps += 1;
      totals.set(gameMvpPlayerId, bucket);
    }

    for (const stats of linhasDosTimesDaSerie(game, series, indexes.playersById)) {
      const bucket = totals.get(stats.playerId) ?? {
        kills: 0,
        deaths: 0,
        assists: 0,
        gameMvps: 0,
      };
      bucket.kills += stats.kills;
      bucket.deaths += stats.deaths;
      bucket.assists += stats.assists;
      totals.set(stats.playerId, bucket);
    }
  }

  return { totals, indexes };
}

export function getSeriesMvp(
  series: SeriesMatch,
  dataset: TournamentDataset,
): SeriesMvpResult | null {
  if (isWalkoverSeries(series)) return null;
  if (series.games.length === 0) return null;

  const { totals, indexes } = buildSeriesPlayerTotals(series, dataset);
  if (totals.size === 0) return null;

  let best: SeriesMvpResult | null = null;

  for (const [playerId, acc] of totals) {
    const candidate: SeriesMvpResult = {
      playerId,
      gameMvpCount: acc.gameMvps,
      kda: getKda(acc.kills, acc.deaths, acc.assists),
    };

    if (!best) {
      best = candidate;
      continue;
    }

    best = pickBestSeriesMvpCandidate(indexes, best, candidate);
  }

  return best;
}

function pickBestSeriesMvpCandidate(
  indexes: DatasetIndexes,
  current: SeriesMvpResult,
  candidate: SeriesMvpResult,
) {
  if (candidate.gameMvpCount !== current.gameMvpCount) {
    return candidate.gameMvpCount > current.gameMvpCount ? candidate : current;
  }

  if (candidate.kda !== current.kda) {
    return candidate.kda > current.kda ? candidate : current;
  }

  const candidateNick = indexes.playersById.get(candidate.playerId)!.nick;
  const currentNick = indexes.playersById.get(current.playerId)!.nick;

  return candidateNick.localeCompare(currentNick, "pt-BR") < 0 ? candidate : current;
}

export function getSeriesTeamKillTotals(
  series: SeriesMatch,
  dataset: TournamentDataset,
) {
  const indexes = createIndexes(dataset);
  let teamAKills = 0;
  let teamBKills = 0;

  for (const game of series.games) {
    for (const stats of game.statsByPlayer) {
      const player = indexes.playersById.get(stats.playerId);
      if (!player) continue;
      const time = timeDaLinha(stats, player);
      if (time === series.teamAId) teamAKills += stats.kills;
      if (time === series.teamBId) teamBKills += stats.kills;
    }
  }

  return {
    [series.teamAId]: teamAKills,
    [series.teamBId]: teamBKills,
  } as Record<string, number>;
}

function seriesInRange(series: SeriesMatch, range?: DateRangeFilter) {
  if (!range?.from && !range?.to) return true;
  const date = new Date(series.date);
  if (Number.isNaN(date.getTime())) return true;
  const from = toDateStart(range.from);
  const to = toDateEnd(range.to);
  if (from && date < from) return false;
  if (to && date > to) return false;
  return true;
}

/**
 * O que separa dois times ANTES de qualquer desempate.
 *
 * ⚠ O saldo de mapas NÃO entra aqui, e a ausência é o ponto.
 *
 * A regra publicada — no card da própria /tabela, na regra (u) e em "pontuação", nos
 * dois idiomas — é: **1º confronto direto · 2º saldo de mapas · 3º sorteio**. Com
 * `gameDiff` nesta comparação, o saldo era aplicado ANTES do confronto direto e os dois
 * times nem chegavam a formar um grupo empatado: o site anunciava um critério e aplicava
 * outro, numa tabela que decide quem vai para a final.
 *
 * `seriesWon` fica porque, com a regra de pontos em uso (vitória > 0, derrota = 0), ele
 * é redundante com `points` e não muda ordem nenhuma — mas protege o caso de alguém
 * configurar pontuação por derrota, em que "mais vitórias" continua sendo o critério
 * óbvio antes de ir para o desempate.
 */
function compareStandingsBase(a: StandingsRow, b: StandingsRow) {
  if (b.points !== a.points) return b.points - a.points;
  if (b.seriesWon !== a.seriesWon) return b.seriesWon - a.seriesWon;
  return 0;
}

type CriterioDeDesempate = (x: StandingsRow, y: StandingsRow) => number;

/**
 * Mini-tabela do confronto direto: vitórias e saldo de mapas contando SÓ as séries com
 * resultado ENTRE os times de `grupo`. Quem não enfrentou ninguém do grupo fica com 0.
 *
 * `completo` diz se TODOS os pares do grupo têm ao menos uma série com resultado entre si.
 */
function miniTabelaDoConfronto(grupo: readonly StandingsRow[], dataset: TournamentDataset) {
  const mini = new Map(grupo.map((linha) => [linha.teamId, { series: 0, mapas: 0 }]));
  const paresQueJogaram = new Set<string>();

  for (const series of getStandingsSeries(dataset)) {
    const a = mini.get(series.teamAId);
    const b = mini.get(series.teamBId);
    if (!a || !b) continue;

    const vencedor = getSeriesWinnerTeamId(series, dataset);
    if (!vencedor) continue;

    const placar = getSeriesScore(series, dataset);
    const saldoA = placar.teamAWins - placar.teamBWins;

    a.series += vencedor === series.teamAId ? 1 : 0;
    b.series += vencedor === series.teamBId ? 1 : 0;
    a.mapas += saldoA;
    b.mapas -= saldoA;
    paresQueJogaram.add([series.teamAId, series.teamBId].sort().join("|"));
  }

  const completo = paresQueJogaram.size === (grupo.length * (grupo.length - 1)) / 2;
  return { mini, completo };
}

/**
 * Separa o grupo em blocos por UM critério: ordena por ele e junta os vizinhos que ele
 * não distingue. Um critério só por vez — por isso a ordenação é transitiva.
 */
function separarPorCriterio(grupo: readonly StandingsRow[], criterio: CriterioDeDesempate) {
  const blocos: StandingsRow[][] = [];
  for (const linha of [...grupo].sort(criterio)) {
    const bloco = blocos[blocos.length - 1];
    if (bloco && criterio(bloco[0], linha) === 0) bloco.push(linha);
    else blocos.push([linha]);
  }
  return blocos;
}

/**
 * Desempate de um grupo de times iguais em pontos e séries vencidas — de qualquer tamanho.
 *
 * Critérios, nesta ordem:
 *   1º confronto direto, a mini-tabela SÓ entre os empatados: vitórias em séries e saldo
 *      de mapas entre eles (quem não enfrentou alguém do grupo conta 0);
 *   2º saldo de mapas geral · 3º mapas ganhos · 4º mapas perdidos;
 *   por fim o nome, só como ordem estável no lugar do sorteio.
 *
 * ⚠ CADA CRITÉRIO É APLICADO AO GRUPO INTEIRO, NUNCA A UM PAR. A versão anterior era um
 * comparador de sort que, quando faltava uma série no grupo (W.O. duplo, série sem
 * resultado, ou o simples meio da fase de pontos), decidia pelo confronto os pares que
 * se enfrentaram e pelo saldo geral os que não se enfrentaram. Isso forma ciclo — A
 * venceu B, B tem saldo melhor que C, C venceu A: basta que DOIS dos três pares tenham
 * jogado — e sort com comparador em ciclo devolve uma ordem que depende da ordem de
 * entrada, que aqui é a dos NOMES. Trocar só o nome dos times trocava o 1º colocado.
 *
 * Como funciona: o primeiro critério que distingue alguém separa o grupo em blocos, e
 * cada bloco que continua empatado RECOMEÇA do confronto direto, com a mini-tabela refeita
 * só entre os times do bloco — "o confronto direto considera só os jogos entre os
 * empatados", como diz a regra publicada. O bloco é sempre menor que o grupo, então a
 * recursão termina. Se o critério não distingue ninguém, passa-se ao seguinte.
 *
 * Vitórias e saldo entre os empatados — uma chave só, ou uma depois da outra:
 *   - TODOS do grupo se enfrentaram: uma chave só (vitórias, e no empate o saldo entre
 *     eles), a mini-tabela de sempre — cada um jogou contra todos os outros, e o saldo
 *     compara igual com igual;
 *   - NEM TODOS se enfrentaram (W.O. duplo, série sem resultado, meio da fase de pontos):
 *     as vitórias separam ANTES, e o saldo entre eles só fala se elas não distinguirem
 *     ninguém. Numa chave só, quem perdeu um mapa para um empatado (−1) ficaria atrás de
 *     quem nem enfrentou o grupo (0), mesmo com saldo geral melhor. Separado, os dois
 *     empatam em 0 vitórias, o bloco é refeito só entre eles — onde não houve jogo — e o
 *     saldo geral decide.
 * A escolha vale para o grupo INTEIRO daquela rodada da recursão (nunca por par), então
 * continua sendo um critério só aplicado a todos.
 */
function ordenarPorConfrontoDireto(grupo: StandingsRow[], dataset: TournamentDataset): StandingsRow[] {
  if (grupo.length <= 1) return grupo;

  const { mini, completo } = miniTabelaDoConfronto(grupo, dataset);
  const confronto = (linha: StandingsRow) => mini.get(linha.teamId) ?? { series: 0, mapas: 0 };
  const vitoriasEntreEles: CriterioDeDesempate = (x, y) => confronto(y).series - confronto(x).series;
  const saldoEntreEles: CriterioDeDesempate = (x, y) => confronto(y).mapas - confronto(x).mapas;

  const criterios: CriterioDeDesempate[] = [
    // 1º confronto direto (ver acima por que a forma muda com o grupo completo ou não).
    ...(completo
      ? [(x: StandingsRow, y: StandingsRow) => vitoriasEntreEles(x, y) || saldoEntreEles(x, y)]
      : [vitoriasEntreEles, saldoEntreEles]),

    // 2º saldo de mapas geral.
    (x, y) => y.gameDiff - x.gameDiff,

    /*
     * 3º mapas GANHOS, e 4º mapas PERDIDOS.
     *
     * Dois times podem ter o mesmo saldo com campanhas bem diferentes: 8-5 e 3-0 empatam
     * em +3. Quem venceu mais mapas fez mais dentro de quadra, e quem perdeu menos foi
     * menos batido — os dois são fato registrado, não sorte.
     *
     * Existem para que a ordem alfabética NÃO decida empate de verdade. Ela é só o último
     * recurso, e só é alcançada quando todos os números destes times são idênticos — o que
     * na prática quer dizer campanha zerada, no começo da temporada, quando ainda não há
     * nada a comparar.
     */
    (x, y) => y.gamesWon - x.gamesWon,
    (x, y) => x.gamesLost - y.gamesLost,

    // Último caso: nada distingue os times. O desempate de verdade é o SORTEIO, que a
    // organização faz à mão; aqui só se garante uma ordem ESTÁVEL, para a tabela não
    // dançar entre dois carregamentos com os mesmos dados.
    (x, y) => x.teamName.localeCompare(y.teamName, "pt-BR"),
  ];

  for (const criterio of criterios) {
    const blocos = separarPorCriterio(grupo, criterio);
    if (blocos.length > 1) {
      return blocos.flatMap((bloco) => ordenarPorConfrontoDireto(bloco, dataset));
    }
  }

  // Nem o nome separa (times homônimos): fica a ordem de entrada, que já é estável.
  return grupo;
}

/**
 * Ordena a classificação: primeiro o que separa objetivamente, depois o desempate.
 *
 * Times empatados em pontos e séries vencidas formam um GRUPO, e o grupo inteiro passa
 * por `ordenarPorConfrontoDireto` — um caminho só, para grupo de qualquer tamanho.
 */
function sortStandingsRows(rows: StandingsRow[], dataset: TournamentDataset) {
  const prelim = [...rows].sort((a, b) => {
    const base = compareStandingsBase(a, b);
    if (base !== 0) return base;
    return a.teamName.localeCompare(b.teamName, "pt-BR");
  });

  const resolved: StandingsRow[] = [];
  for (let i = 0; i < prelim.length; ) {
    const anchor = prelim[i];
    const group = [anchor];
    i += 1;

    while (i < prelim.length && compareStandingsBase(anchor, prelim[i]) === 0) {
      group.push(prelim[i]);
      i += 1;
    }

    resolved.push(...(group.length > 1 ? ordenarPorConfrontoDireto(group, dataset) : group));
  }

  return resolved.map((row, index) => ({ ...row, position: index + 1 }));
}

function buildSeedStandingsRows(dataset: TournamentDataset): StandingsRow[] {
  const winPoints = dataset.tournament.seriesPointsRule.win;
  const lossPoints = dataset.tournament.seriesPointsRule.loss;
  const inferWins = winPoints > 0 && lossPoints === 0;
  const seedByTeamId = new Map(dataset.standingsSeed.map((row) => [row.teamId, row]));

  const rows = dataset.teams.map<StandingsRow>((team) => {
    const seed = seedByTeamId.get(team.id);
    const seriesPlayed = seed?.played ?? 0;
    const points = seed?.points ?? 0;
    const seriesWon = inferWins ? Math.min(seriesPlayed, Math.floor(points / winPoints)) : 0;

    return {
      position: 0,
      teamId: team.id,
      teamName: team.name,
      teamSlug: team.slug,
      teamImageUrl: team.imageUrl,
      seriesPlayed,
      seriesWon,
      seriesLost: Math.max(0, seriesPlayed - seriesWon),
      points,
      gamesWon: 0,
      gamesLost: 0,
      gameDiff: 0,
      seriesWinRate: seriesPlayed > 0 ? (seriesWon / seriesPlayed) * 100 : 0,
      fromSeed: true,
    };
  });

  return sortStandingsRows(rows, dataset);
}

function getStandingsSeries(dataset: TournamentDataset) {
  return dataset.seriesMatches.filter((series) => isRegularSeasonSeries(series));
}

function buildSeriesStandingsRows(dataset: TournamentDataset): StandingsRow[] {
  const rowsByTeamId = new Map<string, StandingsRow>();
  for (const team of dataset.teams) {
    rowsByTeamId.set(team.id, {
      position: 0,
      teamId: team.id,
      teamName: team.name,
      teamSlug: team.slug,
      teamImageUrl: team.imageUrl,
      seriesPlayed: 0,
      seriesWon: 0,
      seriesLost: 0,
      points: 0,
      gamesWon: 0,
      gamesLost: 0,
      gameDiff: 0,
      seriesWinRate: 0,
      fromSeed: false,
    });
  }

  for (const series of getStandingsSeries(dataset)) {
    const winnerTeamId = getSeriesWinnerTeamId(series, dataset);
    if (!winnerTeamId) continue;
    const loserTeamId = winnerTeamId === series.teamAId ? series.teamBId : series.teamAId;

    const rowA = rowsByTeamId.get(series.teamAId);
    const rowB = rowsByTeamId.get(series.teamBId);
    if (!rowA || !rowB) continue;

    // Com W.O. no meio da série, o placar já traz os jogos de W.O. (placarComWalkover):
    // eles contam no saldo de games como vitória/derrota, como manda o regulamento.
    const score = getSeriesScore(series, dataset);
    rowA.seriesPlayed += 1;
    rowB.seriesPlayed += 1;
    rowA.gamesWon += score.teamAWins;
    rowA.gamesLost += score.teamBWins;
    rowB.gamesWon += score.teamBWins;
    rowB.gamesLost += score.teamAWins;

    const winnerRow = winnerTeamId === series.teamAId ? rowA : rowB;
    const loserRow = loserTeamId === series.teamAId ? rowA : rowB;
    winnerRow.seriesWon += 1;
    winnerRow.points += dataset.tournament.seriesPointsRule.win;
    loserRow.seriesLost += 1;
    loserRow.points += dataset.tournament.seriesPointsRule.loss;
  }

  const rows = [...rowsByTeamId.values()].map((row) => ({
    ...row,
    gameDiff: row.gamesWon - row.gamesLost,
    seriesWinRate: row.seriesPlayed > 0 ? (row.seriesWon / row.seriesPlayed) * 100 : 0,
  }));

  return sortStandingsRows(rows, dataset);
}

export function calculateStandings(dataset: TournamentDataset): {
  source: StandingsSource;
  rows: StandingsRow[];
} {
  if (getStandingsSeries(dataset).length === 0) {
    return { source: "seed", rows: buildSeedStandingsRows(dataset) };
  }

  return { source: "series", rows: buildSeriesStandingsRows(dataset) };
}

export function getSeriesSummaries(dataset: TournamentDataset): SeriesSummary[] {
  return sortSeriesByDateDesc(dataset.seriesMatches).map((series) => ({
    series,
    score: getSeriesScore(series, dataset),
    winnerTeamId: getSeriesWinnerTeamId(series, dataset),
    isComplete: isSeriesComplete(series, dataset),
    isWalkover: isWalkoverSeries(series),
    mvp: getSeriesMvp(series, dataset),
    formatLabel: getSeriesFormatLabel(series, dataset),
    stageLabel: getSeriesStageLabel(series),
  }));
}

/**
 * A ordem do /partidas: primeiro os RESULTADOS, do mais recente para o mais antigo; depois
 * as séries POR JOGAR, da mais próxima para a mais distante.
 *
 * Só por data decrescente, a página abria com as séries mais distantes no futuro: as 15 da
 * 4ª são criadas de uma vez, e em 21/11 a lista começava pela de 28/11 (sem resultado),
 * com a recém-terminada lá pela 13ª posição. Recebe a lista de `getSeriesSummaries` (já
 * em data decrescente) e não mexe nela — a ordem decrescente continua valendo para quem
 * a usa (campeão, histórico do time, últimos resultados).
 */
export function ordenarSeriesParaPartidas(resumos: SeriesSummary[]): SeriesSummary[] {
  const resultados = resumos.filter((resumo) => resumo.isComplete);
  const porJogar = resumos.filter((resumo) => !resumo.isComplete).reverse();
  return [...resultados, ...porJogar];
}

export function getChampionshipResult(
  dataset: TournamentDataset,
): ChampionshipResult | null {
  for (const summary of getSeriesSummaries(dataset)) {
    if ((summary.series.stage ?? "REGULAR_SEASON") !== "FINAL") continue;
    if (!summary.isComplete) continue;

    const winnerTeamId = summary.winnerTeamId!;

    const runnerUpTeamId =
      winnerTeamId === summary.series.teamAId
        ? summary.series.teamBId
        : summary.series.teamAId;

    return {
      summary,
      championTeamId: winnerTeamId,
      runnerUpTeamId,
    };
  }

  return null;
}

type PlayerAccumulator = {
  kills: number;
  deaths: number;
  assists: number;
  gamesPlayed: number;
  wins: number;
  gameMvps: number;
  seriesMvps: number;
};

function ensurePlayerAccumulator(
  accumulators: Map<string, PlayerAccumulator>,
  playerId: string,
): PlayerAccumulator {
  const existing = accumulators.get(playerId);
  if (existing) return existing;

  const created: PlayerAccumulator = {
    kills: 0,
    deaths: 0,
    assists: 0,
    gamesPlayed: 0,
    wins: 0,
    gameMvps: 0,
    seriesMvps: 0,
  };
  accumulators.set(playerId, created);
  return created;
}

/**
 * O time pelo qual o jogador jogou a SÉRIE: o da primeira linha dele nos jogos dela; sem
 * linha, o time do jogador. É o time em que conta o MVP da série.
 */
function timeNaSerie(
  series: SeriesMatch,
  playerId: string,
  playersById: ReadonlyMap<string, Player>,
): string | undefined {
  const jogador = playersById.get(playerId);
  for (const game of series.games) {
    const linha = game.statsByPlayer.find((row) => row.playerId === playerId);
    if (linha) return timeDaLinha(linha, jogador);
  }
  return jogador?.teamId;
}

/**
 * Cada coisa que um jogador soma nas estatísticas, junto do TIME pelo qual ela valeu.
 *
 * As linhas de K/D/A valem pelo `timeDaLinha` (o substituto avulso conta para o time em
 * que jogou, e não para o dele), o MVP do jogo pelo time em que o MVP jogou aquele jogo,
 * e o MVP da série pelo time em que ele jogou a série. Jogos de W.O. não estão em
 * `series.games` e por isso não somam nada aqui — nem K/D/A, nem MVP, nem jogo disputado.
 */
type Contribuicao =
  | { tipo: "linha"; jogador: Player; time: string | undefined; stats: PlayerGameStats; venceu: boolean }
  | { tipo: "mvpDoJogo"; jogador: Player; time: string | undefined }
  | { tipo: "mvpDaSerie"; jogador: Player; time: string | undefined };

function* contribuicoes(
  dataset: TournamentDataset,
  indexes: DatasetIndexes,
  range?: DateRangeFilter,
): Generator<Contribuicao> {
  for (const series of dataset.seriesMatches) {
    if (!seriesInRange(series, range)) continue;

    for (const game of series.games) {
      for (const stats of game.statsByPlayer) {
        const jogador = indexes.playersById.get(stats.playerId);
        if (!jogador) continue;
        const time = timeDaLinha(stats, jogador);
        yield { tipo: "linha", jogador, time, stats, venceu: time !== undefined && game.winnerTeamId === time };
      }

      const mvp = indexes.playersById.get(mvpDoJogo(game, series, indexes.playersById));
      if (mvp) yield { tipo: "mvpDoJogo", jogador: mvp, time: timeNoJogo(game, mvp.id, indexes.playersById) };
    }

    const seriesMvp = getSeriesMvp(series, dataset);
    const jogador = seriesMvp ? indexes.playersById.get(seriesMvp.playerId) : undefined;
    if (jogador) {
      yield { tipo: "mvpDaSerie", jogador, time: timeNaSerie(series, jogador.id, indexes.playersById) };
    }
  }
}

function somarContribuicao(bucket: PlayerAccumulator, contribuicao: Contribuicao) {
  if (contribuicao.tipo === "linha") {
    bucket.kills += contribuicao.stats.kills;
    bucket.deaths += contribuicao.stats.deaths;
    bucket.assists += contribuicao.stats.assists;
    bucket.gamesPlayed += 1;
    if (contribuicao.venceu) bucket.wins += 1;
  } else if (contribuicao.tipo === "mvpDoJogo") {
    bucket.gameMvps += 1;
  } else {
    bucket.seriesMvps += 1;
  }
}

function toPlayerAggregate(
  indexes: DatasetIndexes,
  player: Player,
  bucket: PlayerAccumulator | undefined,
): PlayerAggregate {
  const kills = bucket?.kills ?? 0;
  const deaths = bucket?.deaths ?? 0;
  const assists = bucket?.assists ?? 0;
  const gamesPlayed = bucket?.gamesPlayed ?? 0;
  const wins = bucket?.wins ?? 0;
  // O reserva não tem time: os três campos saem vazios ("") e a exibição escreve "Reserva".
  const teamId = player.teamId ?? "";
  const team = player.teamId === undefined ? undefined : indexes.teamsById.get(player.teamId);

  return {
    playerId: player.id,
    playerNick: player.nick,
    playerSlug: player.slug,
    teamId,
    teamName: team?.name ?? teamId,
    teamSlug: team?.slug ?? teamId,
    kills,
    deaths,
    assists,
    gamesPlayed,
    wins,
    winRate: gamesPlayed > 0 ? (wins / gamesPlayed) * 100 : 0,
    gameMvps: bucket?.gameMvps ?? 0,
    seriesMvps: bucket?.seriesMvps ?? 0,
    kda: getKda(kills, deaths, assists),
  };
}

/**
 * Estatística por jogador. Com `filters.teamId`, só o que o jogador fez POR AQUELE TIME
 * (o substituto avulso conta para o time em que jogou), e só os jogadores do time.
 */
export function calculatePlayerAggregates(
  dataset: TournamentDataset,
  filters?: AggregationFilters,
): PlayerAggregate[] {
  const indexes = createIndexes(dataset);
  const accumulators = new Map<string, PlayerAccumulator>();

  for (const contribuicao of contribuicoes(dataset, indexes, filters)) {
    if (filters?.teamId && contribuicao.time !== filters.teamId) continue;
    somarContribuicao(ensurePlayerAccumulator(accumulators, contribuicao.jogador.id), contribuicao);
  }

  return dataset.players
    .filter((player) => !filters?.teamId || player.teamId === filters.teamId)
    .map<PlayerAggregate>((player) => toPlayerAggregate(indexes, player, accumulators.get(player.id)));
}

export function buildLeaderboards(
  dataset: TournamentDataset,
  filters?: AggregationFilters,
): Record<LeaderboardMetric, LeaderboardRow[]> {
  const players = calculatePlayerAggregates(dataset, filters).filter(
    (row) => row.gamesPlayed > 0,
  );

  const makeBoard = (
    metric: LeaderboardMetric,
    getValue: (row: PlayerAggregate) => number,
    direction: "asc" | "desc" = "desc",
  ) =>
    [...players]
      .sort((a, b) => {
        const va = getValue(a);
        const vb = getValue(b);
        if (va !== vb) return direction === "desc" ? vb - va : va - vb;
        if (metric === "kda" && a.gamesPlayed !== b.gamesPlayed) {
          return b.gamesPlayed - a.gamesPlayed;
        }
        return a.playerNick.localeCompare(b.playerNick, "pt-BR");
      })
      .map<LeaderboardRow>((player, index) => ({
        position: index + 1,
        metric,
        value: getValue(player),
        player,
      }));

  return {
    kills: makeBoard("kills", (row) => row.kills),
    kda: makeBoard("kda", (row) => row.kda),
    mvps: makeBoard("mvps", (row) => row.gameMvps),
    assists: makeBoard("assists", (row) => row.assists),
    deathsLeast: makeBoard("deathsLeast", (row) => row.deaths, "asc"),
  };
}

/**
 * Estatística por time, somada pelo time em que cada coisa VALEU (`contribuicoes`): os
 * abates do substituto avulso vão para o time pelo qual ele jogou, e não para o dele —
 * somar pelos jogadores (como antes) jogava esses números no time errado, ou em time
 * nenhum, no caso do reserva.
 */
export function calculateTeamAggregates(dataset: TournamentDataset): TeamAggregate[] {
  const indexes = createIndexes(dataset);
  const gameDiffByTeam = new Map<string, number>();

  for (const team of dataset.teams) {
    gameDiffByTeam.set(team.id, 0);
  }

  for (const series of dataset.seriesMatches) {
    const score = getSeriesScore(series, dataset);
    gameDiffByTeam.set(
      series.teamAId,
      (gameDiffByTeam.get(series.teamAId) ?? 0) + (score.teamAWins - score.teamBWins),
    );
    gameDiffByTeam.set(
      series.teamBId,
      (gameDiffByTeam.get(series.teamBId) ?? 0) + (score.teamBWins - score.teamAWins),
    );
  }

  const acc = new Map<string, PlayerAccumulator>();
  for (const contribuicao of contribuicoes(dataset, indexes)) {
    if (contribuicao.time === undefined) continue;
    somarContribuicao(ensurePlayerAccumulator(acc, contribuicao.time), contribuicao);
  }

  return dataset.teams
    .map<TeamAggregate>((team) => {
      const bucket = acc.get(team.id);
      const kills = bucket?.kills ?? 0;
      const deaths = bucket?.deaths ?? 0;
      const assists = bucket?.assists ?? 0;
      return {
        teamId: team.id,
        teamName: team.name,
        teamSlug: team.slug,
        kills,
        deaths,
        assists,
        gamesPlayed: bucket?.gamesPlayed ?? 0,
        gameMvps: bucket?.gameMvps ?? 0,
        seriesMvps: bucket?.seriesMvps ?? 0,
        gameDiff: gameDiffByTeam.get(team.id)!,
        kda: getKda(kills, deaths, assists),
      };
    })
    .sort((a, b) => a.teamName.localeCompare(b.teamName, "pt-BR"));
}

export function getTeamBySlug(dataset: TournamentDataset, slug: string) {
  return createIndexes(dataset).teamsBySlug.get(slug) ?? null;
}

export function getPlayerBySlug(dataset: TournamentDataset, slug: string) {
  return createIndexes(dataset).playersBySlug.get(slug) ?? null;
}

export function getSeriesById(dataset: TournamentDataset, id: string) {
  return dataset.seriesMatches.find((series) => series.id === id) ?? null;
}

export function getLatestSeries(dataset: TournamentDataset, limit = 3) {
  return getSeriesSummaries(dataset).slice(0, limit);
}

/**
 * Todos os jogadores com este time, INCLUSIVE quem saiu de vez (é o histórico). O elenco
 * público — só os titulares de hoje — é `elencoAtivo`.
 */
export function getPlayersForTeam(dataset: TournamentDataset, teamId: string) {
  return [...(createIndexes(dataset).playersByTeamId.get(teamId) ?? [])];
}

export function getTeamSeriesHistory(dataset: TournamentDataset, teamId: string) {
  return getSeriesSummaries(dataset).filter(
    ({ series }) => series.teamAId === teamId || series.teamBId === teamId,
  );
}

export interface PlayerGameHistoryRow {
  seriesId: string;
  date: string;
  /** O time pelo qual o jogador jogou ESTE jogo (`timeDaLinha`). */
  teamId: string;
  opponentTeamId: string;
  opponentTeamName: string;
  gameIndex: number;
  champion?: string;
  kills: number;
  deaths: number;
  assists: number;
  mvp: boolean;
  /** Jogou como substituto avulso (`linhaDeSubstituto`). */
  substituto: boolean;
}

export interface GameDurationRow {
  seriesId: string;
  gameIndex: number;
  durationMin: number;
  teamAName: string;
  teamBName: string;
  winnerTeamId: string;
  winnerName: string;
  date: string;
}

// Todos os jogos que têm duração registrada, ordenados do mais longo para o mais curto.
export function getGameDurations(dataset: TournamentDataset): GameDurationRow[] {
  const indexes = createIndexes(dataset);
  const rows: GameDurationRow[] = [];
  for (const series of dataset.seriesMatches) {
    series.games.forEach((game, i) => {
      if (typeof game.durationMin !== "number" || game.durationMin <= 0) return;
      rows.push({
        seriesId: series.id,
        gameIndex: i + 1,
        durationMin: game.durationMin,
        teamAName: indexes.teamsById.get(series.teamAId)?.name ?? series.teamAId,
        teamBName: indexes.teamsById.get(series.teamBId)?.name ?? series.teamBId,
        winnerTeamId: game.winnerTeamId,
        winnerName: indexes.teamsById.get(game.winnerTeamId)?.name ?? game.winnerTeamId,
        date: series.date,
      });
    });
  }
  return rows.sort((a, b) => b.durationMin - a.durationMin || a.seriesId.localeCompare(b.seriesId));
}

export function getPlayerGameHistory(
  dataset: TournamentDataset,
  playerId: string,
): PlayerGameHistoryRow[] {
  const indexes = createIndexes(dataset);
  const player = indexes.playersById.get(playerId);
  if (!player) return [];

  // Jogo a jogo, pelo time da LINHA: o reserva aparece com cada time que cobriu, e quem
  // herdou uma vaga continua com os jogos avulsos no time em que jogou cada um.
  const rows: PlayerGameHistoryRow[] = [];
  for (const series of dataset.seriesMatches) {
    series.games.forEach((game, gameIdx) => {
      const stat = game.statsByPlayer.find((row) => row.playerId === playerId);
      if (!stat) return;
      const teamId = timeDaLinha(stat, player);
      if (teamId !== series.teamAId && teamId !== series.teamBId) return;
      const opponentTeamId = teamId === series.teamAId ? series.teamBId : series.teamAId;
      rows.push({
        seriesId: series.id,
        date: series.date,
        teamId,
        opponentTeamId,
        opponentTeamName: indexes.teamsById.get(opponentTeamId)?.name ?? opponentTeamId,
        gameIndex: gameIdx + 1,
        champion: stat.champion,
        kills: stat.kills,
        deaths: stat.deaths,
        assists: stat.assists,
        mvp: mvpDoJogo(game, series, indexes.playersById) === playerId,
        substituto: linhaDeSubstituto(stat, player),
      });
    });
  }

  return rows.sort((a, b) => {
    const byDate = compareDateDesc(a.date, b.date);
    if (byDate !== 0) return byDate;
    return b.gameIndex - a.gameIndex;
  });
}

export function getPlayerLeaderboardPositions(
  dataset: TournamentDataset,
  playerId: string,
  filters?: AggregationFilters,
) {
  const boards = buildLeaderboards(dataset, filters);
  const positions: Partial<Record<LeaderboardMetric, number>> = {};

  (Object.keys(boards) as LeaderboardMetric[]).forEach((metric) => {
    const found = boards[metric].find((row) => row.player.playerId === playerId);
    if (found) positions[metric] = found.position;
  });

  return positions;
}

export function getDatasetOverview(dataset: TournamentDataset) {
  return {
    standings: calculateStandings(dataset),
    playerAggregates: calculatePlayerAggregates(dataset),
    teamAggregates: calculateTeamAggregates(dataset),
    leaderboards: buildLeaderboards(dataset),
    seriesSummaries: getSeriesSummaries(dataset),
    championship: getChampionshipResult(dataset),
  };
}

export function getGameTeamKills(
  game: SeriesGame,
  series: SeriesMatch,
  dataset: TournamentDataset,
) {
  const indexes = createIndexes(dataset);
  let teamAKills = 0;
  let teamBKills = 0;

  for (const stats of game.statsByPlayer) {
    const player = indexes.playersById.get(stats.playerId);
    if (!player) continue;
    const time = timeDaLinha(stats, player);
    if (time === series.teamAId) teamAKills += stats.kills;
    if (time === series.teamBId) teamBKills += stats.kills;
  }

  return { teamAKills, teamBKills };
}

/** Uma linha da tabela de um jogo na página da partida. */
export type LinhaDoJogo = PlayerGameStats & {
  playerNick: string;
  /** O time pelo qual jogou este jogo (`timeDaLinha`) — decide a coluna. */
  teamId: string;
  /** Jogou como substituto avulso: a página marca a linha. */
  substituto: boolean;
};

/**
 * Os jogos da série com as linhas separadas por time. A coluna de cada linha é o time pelo
 * qual ela jogou — o substituto avulso aparece na coluna do time que ele cobriu.
 */
export function getSeriesGamesWithTeamRows(
  series: SeriesMatch,
  dataset: TournamentDataset,
): Array<{
  game: SeriesGame;
  gameIndex: number;
  teamARows: LinhaDoJogo[];
  teamBRows: LinhaDoJogo[];
}> {
  const indexes = createIndexes(dataset);

  return series.games.map((game, idx) => {
    const rows: LinhaDoJogo[] = [];
    for (const stats of game.statsByPlayer) {
      const player = indexes.playersById.get(stats.playerId);
      const teamId = timeDaLinha(stats, player);
      if (!player || teamId === undefined) continue;
      rows.push({
        ...stats,
        playerNick: player.nick,
        teamId,
        substituto: linhaDeSubstituto(stats, player),
      });
    }

    return {
      game,
      gameIndex: idx + 1,
      teamARows: rows
        .filter((row) => row.teamId === series.teamAId)
        .sort((a, b) => b.kills - a.kills || a.playerNick.localeCompare(b.playerNick, "pt-BR")),
      teamBRows: rows
        .filter((row) => row.teamId === series.teamBId)
        .sort((a, b) => b.kills - a.kills || a.playerNick.localeCompare(b.playerNick, "pt-BR")),
    };
  });
}

// ============================================================
// Ciclo de vida do torneio (helpers puros — sem I/O)
// Um snapshot arquivado É um dataset completo, então as funções derivadas
// acima (getChampionshipResult, calculateStandings, getDatasetOverview...)
// operam sobre ele sem mudança.
// ============================================================

export interface ArchivedSeasonSummary {
  seasonId: string;
  name: string;
  startedAtISO?: string;
  endedAtISO?: string;
  archivedAtISO: string;
  championTeamName: string | null;
  teamCount: number;
  seriesCount: number;
}

// Um snapshot não carrega archivedSeasons; adiciona um vazio para reusar as
// funções derivadas (que ignoram esse campo) tratando-o como dataset.
export function snapshotToDataset(
  snapshot: TournamentDatasetSnapshot,
): TournamentDataset {
  return { ...snapshot, archivedSeasons: [] };
}

/** `2026-08-02T14:00` — com hora e SEM fuso escrito: é horário de Brasília. */
const HORA_SEM_FUSO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/;
/** `2026-08-02` — só a data. */
const DATA_PURA = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Instante (ms) da data gravada na série, lendo Brasília quando o fuso não está escrito —
 * o mesmo critério de `lib/format.ts`. O servidor roda em UTC: `new Date("2026-08-02T14:00")`
 * lá vira 14:00Z, três horas antes do jogo, e a data pura vira meia-noite UTC, que em
 * Brasília ainda é o dia ANTERIOR.
 */
function instanteDaDataDaSerie(texto: string): number | null {
  const normalizado = HORA_SEM_FUSO.test(texto)
    ? `${texto}-03:00`
    : DATA_PURA.test(texto)
      ? `${texto}T00:00:00-03:00`
      : texto;
  const instante = Date.parse(normalizado);
  return Number.isNaN(instante) ? null : instante;
}

/**
 * Quando a temporada ACABOU de verdade: a data da final decidida ou, sem ela, a da série
 * com resultado mais tarde. `null` quando nenhuma série tem resultado (ou data legível).
 *
 * É a data que /temporadas mostra como "Encerrada em". Usar o instante do clique em
 * "Encerrar" fazia a 3ª — final em 02/08 — aparecer como encerrada em novembro, quando
 * ela for arquivada para começar a 4ª.
 */
export function dataDoFimDaTemporada(dataset: TournamentDataset): string | null {
  const final = getChampionshipResult(dataset);
  const comResultado = final
    ? [final.summary.series]
    : dataset.seriesMatches.filter((serie) => serie.games.length > 0 || Boolean(serie.walkoverWinnerTeamId));

  let maisTarde: number | null = null;
  for (const serie of comResultado) {
    const instante = instanteDaDataDaSerie(serie.date);
    if (instante !== null && (maisTarde === null || instante > maisTarde)) maisTarde = instante;
  }
  return maisTarde === null ? null : new Date(maisTarde).toISOString();
}

// Monta o registro arquivado da temporada atual (marca como finished).
export function buildArchivedSeason(
  dataset: TournamentDataset,
  now: string,
): ArchivedSeason {
  const endedAtISO = dataset.tournament.endedAtISO ?? now;

  const snapshot: TournamentDatasetSnapshot = {
    tournament: {
      ...dataset.tournament,
      status: "finished",
      endedAtISO,
    },
    teams: dataset.teams,
    players: dataset.players,
    seriesMatches: dataset.seriesMatches,
    standingsSeed: dataset.standingsSeed,
  };

  return {
    seasonId: dataset.tournament.seasonId ?? `season-${now.replace(/[:.]/g, "-")}`,
    name: dataset.tournament.name,
    archivedAtISO: now,
    startedAtISO: dataset.tournament.startedAtISO,
    endedAtISO,
    snapshot,
  };
}

// Constrói o dataset da nova temporada: limpa séries/standings, mantém
// teams/players conforme as flags, preserva o histórico arquivado.
//
// "Manter os jogadores" mantém o ELENCO de hoje (`estaNoElenco`): quem saiu de vez
// (`saiuEm`) e o reserva sem time ficam só no arquivo — sem isto, o titular que saiu
// nascia na edição nova escondido do elenco, mas ocupando o cadastro.
export function buildNextSeasonDataset(
  dataset: TournamentDataset,
  options: {
    name: string;
    format: SeriesFormat;
    keepTeams: boolean;
    keepPlayers: boolean;
    seasonId: string;
    now: string;
  },
): TournamentDataset {
  const teams = options.keepTeams ? dataset.teams : [];
  const teamIds = new Set(teams.map((team) => team.id));
  const players = options.keepPlayers
    ? dataset.players.filter(
        (player) => estaNoElenco(player) && player.teamId !== undefined && teamIds.has(player.teamId),
      )
    : [];

  return {
    tournament: {
      name: options.name,
      format: options.format,
      seriesPointsRule: dataset.tournament.seriesPointsRule,
      lastUpdatedISO: options.now,
      seasonId: options.seasonId,
      status: "active",
      startedAtISO: options.now,
    },
    teams,
    players,
    seriesMatches: [],
    standingsSeed: [],
    archivedSeasons: dataset.archivedSeasons,
  };
}

// Resumo leve de uma temporada arquivada (para listagens).
export function summarizeArchivedSeason(
  archived: ArchivedSeason,
): ArchivedSeasonSummary {
  const dataset = snapshotToDataset(archived.snapshot);
  const championship = getChampionshipResult(dataset);
  const championTeamName = championship
    ? createIndexes(dataset).teamsById.get(championship.championTeamId)?.name ??
      championship.championTeamId
    : null;

  return {
    seasonId: archived.seasonId,
    name: archived.name,
    startedAtISO: archived.startedAtISO,
    endedAtISO: archived.endedAtISO,
    archivedAtISO: archived.archivedAtISO,
    championTeamName,
    teamCount: dataset.teams.length,
    seriesCount: dataset.seriesMatches.length,
  };
}

// ============================================================
// Agregações de campeões (Data Dragon) e cartinhas (regulamento)
// ============================================================

type ChampionAccumulator = {
  name: string;
  picks: number;
  bans: number;
  wins: number;
  kills: number;
  deaths: number;
  assists: number;
  presenceGames: Set<string>;
};

export function calculateChampionAggregates(dataset: TournamentDataset): ChampionAggregate[] {
  const indexes = createIndexes(dataset);
  const acc = new Map<string, ChampionAccumulator>();
  let totalGames = 0;

  const bucketFor = (raw: string) => {
    const resolved = resolveChampion(raw);
    const id = resolved?.id ?? raw.trim().toLowerCase();
    const name = resolved?.name ?? raw.trim();
    let bucket = acc.get(id);
    if (!bucket) {
      bucket = {
        name,
        picks: 0,
        bans: 0,
        wins: 0,
        kills: 0,
        deaths: 0,
        assists: 0,
        presenceGames: new Set<string>(),
      };
      acc.set(id, bucket);
    }
    return bucket;
  };

  // Os jogos DISPUTADOS de uma série com W.O. no meio também contam ("jogos valem"); os
  // jogos de W.O. não estão em `series.games` e não somam nada (nem no total de jogos).
  for (const series of dataset.seriesMatches) {
    series.games.forEach((game, gameIndex) => {
      totalGames += 1;
      const gameKey = `${series.id}#${gameIndex}`;

      for (const stats of game.statsByPlayer) {
        const champ = stats.champion?.trim();
        if (!champ) continue;
        const bucket = bucketFor(champ);
        bucket.picks += 1;
        bucket.presenceGames.add(gameKey);
        bucket.kills += stats.kills;
        bucket.deaths += stats.deaths;
        bucket.assists += stats.assists;
        const time = timeDaLinha(stats, indexes.playersById.get(stats.playerId));
        if (time !== undefined && game.winnerTeamId === time) bucket.wins += 1;
      }

      for (const ban of game.bans ?? []) {
        const champ = ban.championName?.trim();
        if (!champ) continue;
        const bucket = bucketFor(champ);
        bucket.bans += 1;
        bucket.presenceGames.add(gameKey);
      }
    });
  }

  const denom = Math.max(1, totalGames);

  return [...acc.entries()]
    .map<ChampionAggregate>(([championId, b]) => ({
      championId,
      championName: b.name,
      picks: b.picks,
      bans: b.bans,
      games: b.picks,
      wins: b.wins,
      losses: Math.max(0, b.picks - b.wins),
      winRate: b.picks > 0 ? (b.wins / b.picks) * 100 : 0,
      pickRate: (b.picks / denom) * 100,
      banRate: (b.bans / denom) * 100,
      presence: (b.presenceGames.size / denom) * 100,
      kills: b.kills,
      deaths: b.deaths,
      assists: b.assists,
      kda: getKda(b.kills, b.deaths, b.assists),
    }))
    .sort((a, z) => z.picks - a.picks || a.championName.localeCompare(z.championName, "pt-BR"));
}

export function buildChampionLeaderboards(
  dataset: TournamentDataset,
): Record<ChampionMetric, ChampionLeaderboardRow[]> {
  const champions = calculateChampionAggregates(dataset);

  const makeBoard = (
    metric: ChampionMetric,
    getValue: (row: ChampionAggregate) => number,
    predicate: (row: ChampionAggregate) => boolean,
  ) =>
    champions
      .filter(predicate)
      .sort((a, b) => {
        const diff = getValue(b) - getValue(a);
        if (diff !== 0) return diff;
        return a.championName.localeCompare(b.championName, "pt-BR");
      })
      .map<ChampionLeaderboardRow>((champion, index) => ({
        position: index + 1,
        metric,
        value: getValue(champion),
        champion,
      }));

  return {
    picks: makeBoard("picks", (c) => c.picks, (c) => c.picks > 0),
    bans: makeBoard("bans", (c) => c.bans, (c) => c.bans > 0),
    banRate: makeBoard("banRate", (c) => c.banRate, (c) => c.bans > 0),
    presence: makeBoard("presence", (c) => c.presence, (c) => c.picks + c.bans > 0),
    winRate: makeBoard("winRate", (c) => c.winRate, (c) => c.picks > 0),
    kda: makeBoard("kda", (c) => c.kda, (c) => c.picks > 0),
  };
}

export function calculateCardStats(dataset: TournamentDataset): CardStat[] {
  const indexes = createIndexes(dataset);
  const usage = new Map<string, { count: number; byTeam: Map<string, number> }>();

  for (const series of dataset.seriesMatches) {
    // Um sorteio duplo grava a mesma carta nos dois times, mas foi sorteada uma única vez.
    const duplaCounted = new Set<string>();
    for (const card of series.cardsUsed ?? []) {
      const bucket = usage.get(card.cardId) ?? { count: 0, byTeam: new Map<string, number>() };
      if (card.dupla) {
        if (!duplaCounted.has(card.cardId)) {
          duplaCounted.add(card.cardId);
          bucket.count += 1;
        }
      } else {
        bucket.count += 1;
      }
      bucket.byTeam.set(card.teamId, (bucket.byTeam.get(card.teamId) ?? 0) + 1);
      usage.set(card.cardId, bucket);
    }
  }

  return ALL_CARDS.map<CardStat>((cardDef) => {
    const bucket = usage.get(cardDef.id);
    const byTeam = bucket
      ? [...bucket.byTeam.entries()]
          .map(([teamId, count]) => ({
            teamId,
            teamName: indexes.teamsById.get(teamId)?.name ?? teamId,
            count,
          }))
          .sort((a, b) => b.count - a.count)
      : [];
    return { cardId: cardDef.id, title: cardDef.title, count: bucket?.count ?? 0, byTeam };
  }).sort((a, b) => b.count - a.count);
}
