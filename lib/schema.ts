import { z } from "zod";

/**
 * Tetos de tamanho.
 *
 * Sem eles, uma única string podia ter 50 MB e os arrays eram ilimitados — cada
 * temporada arquivada embute um dataset inteiro, então o payload crescia sem
 * qualquer freio (bomba de payload / esgotamento de memória).
 *
 * Os números foram dimensionados pelos dados REAIS de produção, incluindo a
 * temporada arquivada (maiores observados: id 21, nick 22, motivo de W.O. 91,
 * imageUrl 30, 13 times, 66 jogadores, 37 séries). A folga é de ~3x.
 */
const LIMITES = {
  id: 64,
  slug: 80,
  nome: 120,
  nick: 64,
  rota: 24,
  elo: 24,
  texto: 300,
  url: 512,
  iso: 40,
  campeao: 60,
} as const;

const nonEmpty = z.string().trim().min(1).max(LIMITES.texto);
const limitado = (max: number) => z.string().trim().min(1).max(max);

/**
 * imageUrl só pode apontar para as pastas de imagem do próprio site ou para o
 * Data Dragon (ícones de campeão). Antes aceitava qualquer URL: um valor apontando
 * para um host externo transformaria cada visitante numa requisição rastreada por
 * terceiro (vazando IP e navegador). Verificado: as 36 imagens em produção são locais.
 */
const CAMINHO_LOCAL = /^\/(players|teams|cartas|elo|roles|borders)\/[A-Za-z0-9._-]+\.(png|jpe?g|webp|avif|gif|svg)$/i;
const HOSTS_PERMITIDOS = new Set(["ddragon.leagueoflegends.com"]);

export const imageUrlField = z
  .string()
  .trim()
  .max(LIMITES.url)
  .refine((valor) => {
    if (valor === "") return true;
    if (valor.includes("..") || valor.includes("\\")) return false;
    if (CAMINHO_LOCAL.test(valor)) return true; // ancorado em "/" => rejeita //evil.com/x.png
    try {
      const u = new URL(valor);
      return u.protocol === "https:" && HOSTS_PERMITIDOS.has(u.hostname);
    } catch {
      return false;
    }
  }, "URL de imagem não permitida (use um arquivo do próprio site).");

type IssuePath = Array<string | number>;
const seriesFormats = ["BO3", "BO5"] as const;
const seriesStages = ["REGULAR_SEASON", "SEMIFINAL", "FINAL"] as const;
const cardIds = [
  "ABCDRAFT",
  "DRAFT_SABOTADO",
  "INTER_CLASSE",
  "INVASAO_YUUMI",
  "INVERSAO_ROTAS",
  "TUDO_LIBERADO",
  // Duplas — sorteadas uma única vez quando os DOIS capitães usam a carta.
  "AMIGOS_NATUREZA",
  "DRAFT_INVERTIDO",
] as const;

function addCustomIssue(
  ctx: z.RefinementCtx,
  path: IssuePath,
  message: string,
) {
  ctx.addIssue({
    code: "custom",
    message,
    path,
  });
}

function hasUniqueValues<T extends Record<string, unknown>>(
  list: T[],
  key: keyof T,
) {
  const values = list.map((item) => item[key]);
  return new Set(values).size === values.length;
}

function validateUniqueListField<T extends Record<string, unknown>>(
  ctx: z.RefinementCtx,
  list: T[],
  key: keyof T,
  path: IssuePath,
  message: string,
) {
  if (!hasUniqueValues(list, key)) {
    addCustomIssue(ctx, path, message);
  }
}

function validateDatasetUniqueness(
  dataset: DatasetCore,
  ctx: z.RefinementCtx,
) {
  validateUniqueListField(ctx, dataset.teams, "id", ["teams"], "IDs de times duplicados.");
  validateUniqueListField(ctx, dataset.teams, "slug", ["teams"], "Slugs de times duplicados.");
  validateUniqueListField(
    ctx,
    dataset.players,
    "id",
    ["players"],
    "IDs de jogadores duplicados.",
  );
  validateUniqueListField(
    ctx,
    dataset.players,
    "slug",
    ["players"],
    "Slugs de jogadores duplicados.",
  );
  validateUniqueListField(
    ctx,
    dataset.seriesMatches,
    "id",
    ["seriesMatches"],
    "IDs de séries duplicados.",
  );
}

/**
 * Time do jogador: obrigatório, a não ser para o RESERVA (regra 6 da 4ª Edição).
 *
 * O reserva é quem ficou na fila e entra no dataset sem time, para poder substituir
 * jogo a jogo. As duas marcas não convivem: quando ele herda a vaga de quem saiu de vez,
 * recebe o `teamId` e perde o `reserva` NA MESMA gravação. Um reserva com time seria
 * ambíguo — titular para o elenco público ou não? — e por isso é recusado.
 */
function validatePlayerTeamReferences(
  dataset: DatasetCore,
  ctx: z.RefinementCtx,
  teamIds: Set<string>,
) {
  for (const [index, player] of dataset.players.entries()) {
    // Aqui, e não num `.refine` do campo, para a mensagem dizer QUEM: a recusa de um
    // refine de campo chega ao painel só como "precisa ser uma data válida".
    if (player.saiuEm !== undefined && Number.isNaN(Date.parse(player.saiuEm))) {
      addCustomIssue(
        ctx,
        ["players", index, "saiuEm"],
        `Jogador ${player.nick} tem uma data de saída do time inválida (${player.saiuEm}).`,
      );
    }
    if (player.teamId === undefined) {
      if (player.reserva === true) continue;
      addCustomIssue(
        ctx,
        ["players", index, "teamId"],
        `Jogador ${player.nick} está sem time e não é reserva: escolha o time ou marque como reserva.`,
      );
      continue;
    }
    if (player.reserva === true) {
      addCustomIssue(
        ctx,
        ["players", index, "reserva"],
        `Jogador ${player.nick} é reserva e não pode ter time: quem herda a vaga recebe o time e deixa de ser reserva.`,
      );
      continue;
    }
    if (teamIds.has(player.teamId)) continue;
    addCustomIssue(
      ctx,
      ["players", index, "teamId"],
      `Jogador ${player.nick} referencia teamId inexistente (${player.teamId}).`,
    );
  }
}

function validateStandingsSeedReferences(
  dataset: DatasetCore,
  ctx: z.RefinementCtx,
  teamIds: Set<string>,
) {
  for (const [index, seed] of dataset.standingsSeed.entries()) {
    if (teamIds.has(seed.teamId)) continue;
    addCustomIssue(
      ctx,
      ["standingsSeed", index, "teamId"],
      `Classificação inicial referencia teamId inexistente (${seed.teamId}).`,
    );
  }
}

function validateGameReferences(
  game: SeriesGame,
  series: SeriesMatch,
  seriesIndex: number,
  gameIndex: number,
  ctx: z.RefinementCtx,
  playersById: Map<string, Player>,
) {
  const allowedWinners = new Set([series.teamAId, series.teamBId]);

  if (!allowedWinners.has(game.winnerTeamId)) {
    addCustomIssue(
      ctx,
      ["seriesMatches", seriesIndex, "games", gameIndex, "winnerTeamId"],
      `Jogo ${gameIndex + 1} da série ${series.id} tem um vencedor que não é nenhum dos dois times.`,
    );
  }

  if (!playersById.has(game.mvpPlayerId)) {
    addCustomIssue(
      ctx,
      ["seriesMatches", seriesIndex, "games", gameIndex, "mvpPlayerId"],
      `Jogo ${gameIndex + 1} da série ${series.id} possui MVP inválido.`,
    );
  }

  const statsPlayerIds = new Set<string>();
  for (const [statIndex, stats] of game.statsByPlayer.entries()) {
    validateTimeDaLinha(
      stats,
      playersById.get(stats.playerId),
      allowedWinners,
      ctx,
      ["seriesMatches", seriesIndex, "games", gameIndex, "statsByPlayer", statIndex, "teamId"],
      `Jogo ${gameIndex + 1} da série ${series.id}`,
    );

    if (!playersById.has(stats.playerId)) {
      addCustomIssue(
        ctx,
        [
          "seriesMatches",
          seriesIndex,
          "games",
          gameIndex,
          "statsByPlayer",
          statIndex,
          "playerId",
        ],
        `Estatística com playerId inválido (${stats.playerId}) na série ${series.id}.`,
      );
    }

    if (statsPlayerIds.has(stats.playerId)) {
      addCustomIssue(
        ctx,
        [
          "seriesMatches",
          seriesIndex,
          "games",
          gameIndex,
          "statsByPlayer",
          statIndex,
          "playerId",
        ],
        `Jogador repetido nas estatísticas do jogo ${gameIndex + 1} da série ${series.id}.`,
      );
      continue;
    }

    statsPlayerIds.add(stats.playerId);
  }
}

/**
 * O time pelo qual a linha jogou (substituto avulso, regra 6).
 *
 * `teamId` na linha só pode ser um dos dois times da série. E o jogador SEM time (o
 * reserva) precisa dele: sem isso não haveria como saber de que lado contar os abates, a
 * vitória e o MVP daquele jogo.
 *
 * O caso "linha sem `teamId` de jogador cujo time não está na série" NÃO é recusado aqui
 * de propósito: o dado real tem sobras assim (jogador trocado de time depois de jogar), e
 * o schema roda em toda leitura — a agregação simplesmente não conta essas linhas.
 */
function validateTimeDaLinha(
  stats: PlayerGameStats,
  player: Player | undefined,
  timesDaSerie: ReadonlySet<string>,
  ctx: z.RefinementCtx,
  path: IssuePath,
  rotuloDoJogo: string,
) {
  const nick = player?.nick ?? stats.playerId;
  if (stats.teamId !== undefined) {
    if (timesDaSerie.has(stats.teamId)) return;
    addCustomIssue(
      ctx,
      path,
      `${rotuloDoJogo}: a linha de ${nick} diz que ele jogou por um time que não disputa a série (${stats.teamId}).`,
    );
    return;
  }
  if (player && player.teamId === undefined) {
    addCustomIssue(
      ctx,
      path,
      `${rotuloDoJogo}: ${nick} é reserva (sem time), então a linha dele precisa dizer por qual time jogou.`,
    );
  }
}

function validateSeriesTeams(
  series: SeriesMatch,
  seriesIndex: number,
  ctx: z.RefinementCtx,
  teamIds: Set<string>,
) {
  if (!teamIds.has(series.teamAId) || !teamIds.has(series.teamBId)) {
    addCustomIssue(
      ctx,
      ["seriesMatches", seriesIndex],
      `Série ${series.id} referencia time inexistente.`,
    );
  }

  if (series.teamAId === series.teamBId) {
    addCustomIssue(
      ctx,
      ["seriesMatches", seriesIndex],
      `Série ${series.id} possui times repetidos.`,
    );
  }
}

function validateSeriesGameLimit(
  series: SeriesMatch,
  seriesIndex: number,
  ctx: z.RefinementCtx,
  maxGames: number,
  seriesFormat: "BO3" | "BO5",
) {
  if (series.games.length <= maxGames) return;

  addCustomIssue(
    ctx,
    ["seriesMatches", seriesIndex, "games"],
    `Série ${series.id} no formato ${seriesFormat} não pode ter mais de ${maxGames} jogos.`,
  );
}

/**
 * W.O. — inclusive no MEIO da série ("jogos valem, W.O. completa", decisão de 22/10/2026).
 *
 * A série pode ter `walkoverWinnerTeamId` junto com jogos já disputados, desde que esses
 * jogos ainda não tivessem decidido a série: W.O. depois de 2x0 numa MD3 não completa
 * nada, só apagaria um resultado que já existe. O placar oficial é montado por
 * `placarComWalkover` (lib/tournament.ts).
 */
function validateWalkoverSeries(
  series: SeriesMatch,
  seriesIndex: number,
  ctx: z.RefinementCtx,
  vitoriasParaFechar: number,
) {
  if (!series.walkoverWinnerTeamId) return;

  const allowedWinners = new Set([series.teamAId, series.teamBId]);

  if (!allowedWinners.has(series.walkoverWinnerTeamId)) {
    addCustomIssue(
      ctx,
      ["seriesMatches", seriesIndex, "walkoverWinnerTeamId"],
      `Série ${series.id} possui vencedor de W.O. inválido.`,
    );
  }

  let placarA = 0;
  let placarB = 0;
  for (const jogo of series.games) {
    if (jogo.winnerTeamId === series.teamAId) placarA += 1;
    else if (jogo.winnerTeamId === series.teamBId) placarB += 1;
  }
  if (placarA >= vitoriasParaFechar || placarB >= vitoriasParaFechar) {
    addCustomIssue(
      ctx,
      ["seriesMatches", seriesIndex, "walkoverWinnerTeamId"],
      `Série ${series.id} já estava decidida pelos jogos lançados (${placarA}x${placarB}), então não pode receber W.O.`,
    );
  }
}

function validateSeriesReferences(
  dataset: DatasetCore,
  ctx: z.RefinementCtx,
  teamIds: Set<string>,
  playersById: Map<string, Player>,
) {
  for (const [seriesIndex, series] of dataset.seriesMatches.entries()) {
    const seriesFormat = series.format ?? dataset.tournament.format;
    const maxGames = seriesFormat === "BO5" ? 5 : 3;

    validateSeriesTeams(series, seriesIndex, ctx, teamIds);
    validateSeriesGameLimit(series, seriesIndex, ctx, maxGames, seriesFormat);
    validateWalkoverSeries(series, seriesIndex, ctx, seriesFormat === "BO5" ? 3 : 2);

    // Os jogos de uma série com W.O. também são validados: eles VALEM (W.O. no meio).
    for (const [gameIndex, game] of series.games.entries()) {
      validateGameReferences(game, series, seriesIndex, gameIndex, ctx, playersById);
    }
  }
}

export const seriesFormatSchema = z.enum(seriesFormats);
export const seriesStageSchema = z.enum(seriesStages);

export const tournamentStatusSchema = z.enum(["active", "finished"]);

export const tournamentSchema = z.object({
  name: nonEmpty,
  lastUpdatedISO: nonEmpty,
  seriesPointsRule: z.object({
    win: z.number().int().nonnegative(),
    loss: z.number().int().nonnegative(),
  }),
  format: seriesFormatSchema,
  seasonId: z.string().trim().min(1).optional(),
  status: tournamentStatusSchema.default("active"),
  startedAtISO: z.string().trim().optional(),
  endedAtISO: z.string().trim().optional(),
});

export const cardIdSchema = z.enum(cardIds);

export const teamSchema = z.object({
  id: limitado(LIMITES.id),
  name: limitado(LIMITES.nome),
  slug: limitado(LIMITES.slug),
  imageUrl: imageUrlField.optional(),
});

export const playerSchema = z.object({
  id: limitado(LIMITES.id),
  nick: limitado(LIMITES.nick),
  slug: limitado(LIMITES.slug),
  /**
   * Time do jogador. Só pode faltar no RESERVA (`reserva: true`) — ver
   * `validatePlayerTeamReferences`. Quem saiu de vez (`saiuEm`) CONTINUA com o time: é por
   * ele que as linhas antigas de K/D/A (sem `teamId` próprio) seguem contando.
   */
  teamId: limitado(LIMITES.id).optional(),
  role1: limitado(LIMITES.rota),
  role2: z.string().trim().max(LIMITES.rota).optional(),
  elo: limitado(LIMITES.elo),
  imageUrl: imageUrlField.optional(),
  name: z.string().trim().max(LIMITES.nome).optional(),
  mono: z.boolean().optional(),
  /**
   * Capitão do time. Gravado pela virada do draft (lib/draft/virada.ts) no capitão que o
   * draft sorteou — na 4ª, o de maior elo, de qualquer rota, e nunca da organização.
   *
   * Opcional porque as temporadas até a 3ª não têm o campo: para elas o site segue a
   * regra antiga, capitão = MID (lib/roster.ts). Precisa estar AQUI porque o dataset é
   * validado em toda leitura e o Zod descarta campo desconhecido em silêncio — sem esta
   * linha, a marca sumiria na primeira leitura depois da virada. Vale também para os
   * snapshots arquivados, que usam este mesmo schema.
   */
  captain: z.boolean().optional(),
  /**
   * Reserva oficial (regra 6 da 4ª Edição): está no campeonato SEM time, para substituir
   * jogo a jogo, e não aparece em elenco nenhum. Quando herda a vaga de quem saiu de vez,
   * recebe o `teamId` e perde esta marca na mesma gravação.
   */
  reserva: z.boolean().optional(),
  /**
   * Quando o titular saiu DE VEZ (ISO). Some do elenco público — times, PTS do elenco,
   * Multi OP.GG, a contagem de 5 — mas o K/D/A dele continua nas partidas e na ficha, e
   * por isso o jogador não é apagado nem perde o `teamId`. Ver `elencoAtivo`.
   */
  saiuEm: limitado(LIMITES.iso).optional(),
});

export const playerGameStatsSchema = z.object({
  playerId: limitado(LIMITES.id),
  /**
   * O time pelo qual a pessoa jogou ESTE jogo — o substituto avulso (regra 6). Só pode ser
   * um dos dois times da série. Sem ele vale o time do jogador; o reserva (sem time) é
   * obrigado a ter. Toda agregação lê `timeDaLinha` (lib/tournament.ts).
   */
  teamId: limitado(LIMITES.id).optional(),
  champion: z.string().trim().max(LIMITES.campeao).optional(),
  kills: z.number().int().min(0).max(999),
  deaths: z.number().int().min(0).max(999),
  assists: z.number().int().min(0).max(999),
});

export const championBanSchema = z.object({
  teamId: limitado(LIMITES.id),
  championName: limitado(LIMITES.campeao),
});

export const seriesGameSchema = z.object({
  winnerTeamId: nonEmpty,
  durationMin: z.number().int().positive().optional(),
  mvpPlayerId: nonEmpty,
  statsByPlayer: z.array(playerGameStatsSchema).max(20),
  bans: z.array(championBanSchema).max(10).optional(),
});

export const cardUsageSchema = z.object({
  teamId: nonEmpty,
  cardId: cardIdSchema,
  gameIndex: z.number().int().min(1).optional(),
  // true quando os dois capitães usaram a carta e o sorteio (único) valeu para os dois times.
  dupla: z.boolean().optional(),
});

/**
 * Teto do histórico de sorteios de UMA série.
 *
 * Exportado porque as três rotas que escrevem em `sorteios` precisam do mesmo número:
 * chegar no teto tem de RECUSAR a gravação, nunca descartar registro para caber. As
 * rotas de carta e de lados faziam `.slice(-50)`, que jogava fora o registro mais
 * antigo em silêncio — num histórico que existe para auditoria, e cuja documentação
 * diz "append-only", isso é exatamente a falha que ele deveria impedir.
 */
export const MAX_SORTEIOS_POR_SERIE = 50;

export const seriesMatchSchema = z.object({
  id: limitado(LIMITES.id),
  date: limitado(LIMITES.iso),
  teamAId: limitado(LIMITES.id),
  teamBId: limitado(LIMITES.id),
  format: seriesFormatSchema.optional(),
  stage: seriesStageSchema.optional(),
  walkoverWinnerTeamId: z.string().trim().max(LIMITES.id).optional(),
  walkoverReason: z.string().trim().max(LIMITES.texto).optional(),
  games: z.array(seriesGameSchema).max(5),
  cardsUsed: z.array(cardUsageSchema).max(20).optional(),
  // Time que começa no lado azul no jogo 1 (sorteio de lados). O outro começa no vermelho.
  blueSideTeamId: z.string().trim().max(LIMITES.id).optional(),
  /**
   * Histórico dos sorteios, append-only.
   *
   * Existe para que o resultado não dependa da palavra de quem clicou: cada entrada
   * guarda a SEMENTE, e com ela qualquer pessoa recalcula o sorteio e confere
   * (`conferirSorteio` em lib/series/sorteio.ts).
   *
   * Refazer um sorteio é permitido — às vezes é legítimo — mas fica registrado que
   * houve dois. Antes, o segundo simplesmente apagava o primeiro sem deixar rastro.
   */
  sorteios: z
    .array(
      z.object({
        // "manual" = alguém definiu o resultado à mão, sem sorteio. Fica registrado
        // com a mesma dignidade dos outros: é justamente o que precisa aparecer.
        tipo: z.enum(["lados", "carta", "lados_manual", "carta_manual"]),
        semente: z.string().trim().max(64),
        emISO: limitado(LIMITES.iso),
        autor: limitado(LIMITES.nome),
        teamId: z.string().trim().max(LIMITES.id).optional(),
        resultado: limitado(LIMITES.id),
        /**
         * Fechado de propósito. Como `record(unknown)`, isto aceitava 200 KB por
         * registro — e o dataset inteiro vai para o navegador em toda página.
         */
        detalhe: z
          .object({
            dupla: z.boolean().optional(),
            letras: z.tuple([limitado(2), limitado(2)]).optional(),
            campeoes: z.number().int().min(0).max(999).optional(),
            /** Preenchido quando alguém sobrescreveu o sorteio à mão. */
            sobrescreveu: limitado(LIMITES.id).optional(),
          })
          .optional(),
      }),
    )
    .max(MAX_SORTEIOS_POR_SERIE)
    .optional(),
});

export const standingsSeedRowSchema = z.object({
  teamId: nonEmpty,
  played: z.number().int().min(0),
  points: z.number().int().min(0),
});

// Tetos com folga sobre a produção atual (13 times, 66 jogadores, 37 séries).
const datasetCoreSchema = z.object({
  tournament: tournamentSchema,
  teams: z.array(teamSchema).max(64),
  players: z.array(playerSchema).max(400),
  seriesMatches: z.array(seriesMatchSchema).max(400),
  standingsSeed: z.array(standingsSeedRowSchema).max(64).default([]),
});

type DatasetCore = z.infer<typeof datasetCoreSchema>;

function refineDatasetIntegrity(dataset: DatasetCore, ctx: z.RefinementCtx) {
  validateDatasetUniqueness(dataset, ctx);

  const teamIds = new Set(dataset.teams.map((team) => team.id));
  const playersById = new Map(dataset.players.map((player) => [player.id, player]));

  validatePlayerTeamReferences(dataset, ctx, teamIds);
  validateStandingsSeedReferences(dataset, ctx, teamIds);
  validateSeriesReferences(dataset, ctx, teamIds, playersById);
}

// Snapshot de uma temporada arquivada: é um dataset completo, porém SEM o campo
// archivedSeasons (evita aninhamento recursivo de históricos).
export const tournamentDatasetSnapshotSchema = datasetCoreSchema.superRefine(
  refineDatasetIntegrity,
);

export const archivedSeasonSchema = z.object({
  seasonId: nonEmpty,
  name: nonEmpty,
  archivedAtISO: nonEmpty,
  startedAtISO: z.string().trim().optional(),
  endedAtISO: z.string().trim().optional(),
  snapshot: tournamentDatasetSnapshotSchema,
});

export const tournamentDatasetSchema = datasetCoreSchema
  .extend({
    // Teto importante: cada temporada arquivada embute um dataset COMPLETO,
    // então este era o array com maior potencial de explodir o payload.
    archivedSeasons: z.array(archivedSeasonSchema).max(30).default([]),
  })
  .superRefine(refineDatasetIntegrity);

export const startTournamentSchema = z.object({
  name: nonEmpty,
  format: seriesFormatSchema,
  keepTeams: z.boolean().default(true),
  keepPlayers: z.boolean().default(true),
  archiveCurrent: z.boolean().default(false),
  confirm: z.literal(true),
});

export const adminLoginSchema = z.object({
  // Opcional para manter compatibilidade com o modo legado (senha única, sem usuário).
  username: z.string().trim().max(120).optional(),
  // O teto importa: senha sem limite vira ataque de CPU contra o scrypt.
  password: z.string().min(1, "Senha obrigatória.").max(200, "Senha longa demais."),
});

export type TournamentDataset = z.infer<typeof tournamentDatasetSchema>;
export type TournamentInfo = z.infer<typeof tournamentSchema>;
export type Team = z.infer<typeof teamSchema>;
export type Player = z.infer<typeof playerSchema>;
export type PlayerGameStats = z.infer<typeof playerGameStatsSchema>;
export type SeriesGame = z.infer<typeof seriesGameSchema>;
export type SeriesMatch = z.infer<typeof seriesMatchSchema>;
export type ChampionBan = z.infer<typeof championBanSchema>;
export type CardUsage = z.infer<typeof cardUsageSchema>;
export type CardId = z.infer<typeof cardIdSchema>;
export type StandingsSeedRow = z.infer<typeof standingsSeedRowSchema>;
export type SeriesFormat = z.infer<typeof seriesFormatSchema>;
export type SeriesStage = z.infer<typeof seriesStageSchema>;
export type TournamentStatus = z.infer<typeof tournamentStatusSchema>;
export type ArchivedSeason = z.infer<typeof archivedSeasonSchema>;
export type TournamentDatasetSnapshot = z.infer<typeof tournamentDatasetSnapshotSchema>;
export type StartTournamentInput = z.infer<typeof startTournamentSchema>;

// ============================================================
// Jogo lançado depois de a série estar decidida
// ============================================================

/**
 * O primeiro jogo registrado DEPOIS de a série já ter vencedor (MD3 com 2 vitórias, MD5
 * com 3), ou `null` quando não há nenhum.
 *
 * Um 3º jogo numa MD3 que já estava 2x0 vira 3x0 no site e dá +3 de saldo e 3 mapas
 * ganhos na tabela — o 2º e o 3º critérios do desempate. Quase sempre é erro de digitação
 * (o vencedor do jogo 2 marcado errado, ou o jogo da série seguinte lançado nesta).
 *
 * W.O. fica de fora: a série com W.O. pode ter jogos (W.O. no meio), mas o schema já
 * recusa W.O. numa série que os jogos lançados tinham decidido — e um jogo a mais depois
 * do W.O. que feche a série cai na mesma recusa.
 */
export function jogoDepoisDaDecisao(
  serie: SeriesMatch,
  formatoDoTorneio: SeriesFormat,
): { jogo: number; quantidade: number; placarA: number; placarB: number } | null {
  if (serie.walkoverWinnerTeamId) return null;
  const vitoriasParaFechar = (serie.format ?? formatoDoTorneio) === "BO5" ? 3 : 2;

  let placarA = 0;
  let placarB = 0;
  for (const [indice, jogo] of serie.games.entries()) {
    if (placarA >= vitoriasParaFechar || placarB >= vitoriasParaFechar) {
      return { jogo: indice + 1, quantidade: serie.games.length - indice, placarA, placarB };
    }
    if (jogo.winnerTeamId === serie.teamAId) placarA += 1;
    else if (jogo.winnerTeamId === serie.teamBId) placarB += 1;
  }
  return null;
}

/**
 * A regra acima aplicada a uma GRAVAÇÃO: mensagens das séries em que o envio acrescenta
 * jogo depois da decisão, comparado com o que está gravado.
 *
 * ⚠ NÃO ESTÁ NO SCHEMA DE PROPÓSITO. O schema valida o dataset em TODA leitura — inclusive
 * os retratos das temporadas arquivadas — e o dado real já tem esse caso: na 3ª Edição, a
 * `serie-14` (MD3) tem um 3º jogo lançado depois de um 2x0. Com a regra no schema, a
 * primeira leitura depois do deploy recusaria o campeonato inteiro e o site público cairia.
 *
 * Pelo mesmo motivo a comparação é com o GRAVADO: a recusa só vale quando o envio PIORA a
 * série (mais jogos depois da decisão do que havia). Corrigir o K/D/A da `serie-14` continua
 * possível; lançar um jogo novo numa série já decidida, não.
 */
export function problemasDeJogoDepoisDaDecisao(
  proposta: TournamentDataset,
  gravado: TournamentDataset | null,
): string[] {
  const antes = new Map((gravado?.seriesMatches ?? []).map((serie) => [serie.id, serie]));
  const nomes = new Map(proposta.teams.map((time) => [time.id, time.name]));
  const problemas: string[] = [];

  for (const serie of proposta.seriesMatches) {
    const depois = jogoDepoisDaDecisao(serie, proposta.tournament.format);
    if (!depois) continue;

    const anterior = antes.get(serie.id);
    const jaHavia =
      anterior && gravado ? (jogoDepoisDaDecisao(anterior, gravado.tournament.format)?.quantidade ?? 0) : 0;
    if (depois.quantidade <= jaHavia) continue;

    const timeA = nomes.get(serie.teamAId) ?? serie.teamAId;
    const timeB = nomes.get(serie.teamBId) ?? serie.teamBId;
    problemas.push(
      `Série ${serie.id} (${timeA} x ${timeB}): a série já estava decidida em ` +
        `${depois.placarA}x${depois.placarB} depois do jogo ${depois.jogo - 1}, então o jogo ` +
        `${depois.jogo} não pode ser registrado. Apague esse jogo ou corrija o vencedor dos anteriores.`,
    );
  }
  return problemas;
}

// ============================================================
// Mensagens de validação em português, com o nome do que falhou
// ============================================================

/**
 * Nome de cada campo como a organização o vê no painel.
 *
 * Antes a recusa chegava como "seriesMatches.1.games.0.bans.0.championName: Too small:
 * expected string to have >=1 characters" — em inglês, e com o índice do ARRAY, que não
 * bate com a lista do painel (ordenada por data). Ninguém achava a série.
 */
const NOME_DO_CAMPO: Record<string, string> = {
  name: "nome",
  nick: "nick",
  slug: "endereço (slug)",
  imageUrl: "imagem",
  teamId: "time",
  reserva: "reserva",
  saiuEm: "saída do time",
  role1: "rota principal",
  role2: "rota secundária",
  elo: "elo",
  date: "data",
  teamAId: "time A",
  teamBId: "time B",
  format: "formato",
  stage: "fase",
  walkoverWinnerTeamId: "vencedor do W.O.",
  walkoverReason: "motivo do W.O.",
  games: "jogos",
  winnerTeamId: "vencedor",
  durationMin: "duração (min)",
  mvpPlayerId: "MVP",
  statsByPlayer: "K/D/A",
  champion: "campeão",
  championName: "campeão",
  kills: "abates",
  deaths: "mortes",
  assists: "assistências",
  playerId: "jogador",
  bans: "bans",
  cardsUsed: "cartinhas",
  cardId: "carta",
  gameIndex: "jogo da carta",
  dupla: "carta dupla",
  blueSideTeamId: "lado azul",
  sorteios: "histórico de sorteios",
  seriesPointsRule: "pontuação",
  lastUpdatedISO: "data de atualização",
  teams: "times",
  players: "jogadores",
  seriesMatches: "séries",
  standingsSeed: "classificação inicial",
  archivedSeasons: "temporadas arquivadas",
  played: "jogos disputados",
  points: "pontos",
};

type ProblemaDeValidacao = z.ZodError["issues"][number];
type Registro = Record<string, unknown>;

function comoRegistro(valor: unknown): Registro | undefined {
  return valor && typeof valor === "object" && !Array.isArray(valor) ? (valor as Registro) : undefined;
}

function textoDe(valor: unknown): string | undefined {
  return typeof valor === "string" && valor.trim() ? valor.trim() : undefined;
}

function nomesDosTimes(dataset: unknown): Map<string, string> {
  const lista = comoRegistro(dataset)?.teams;
  const nomes = new Map<string, string>();
  if (!Array.isArray(lista)) return nomes;
  for (const time of lista) {
    const id = textoDe(comoRegistro(time)?.id);
    if (id) nomes.set(id, textoDe(comoRegistro(time)?.name) ?? id);
  }
  return nomes;
}

function rotuloDoItem(lista: string, indice: number, item: Registro | undefined, times: Map<string, string>) {
  const numero = indice + 1;
  switch (lista) {
    case "teams":
      return `Time ${textoDe(item?.name) ?? textoDe(item?.id) ?? `nº ${numero}`}`;
    case "players":
      return `Jogador ${textoDe(item?.nick) ?? textoDe(item?.id) ?? `nº ${numero}`}`;
    case "seriesMatches": {
      // O ID e o confronto, e não a posição: é assim que a série aparece no painel.
      const a = textoDe(item?.teamAId);
      const b = textoDe(item?.teamBId);
      const confronto = a && b ? ` (${times.get(a) ?? a} x ${times.get(b) ?? b})` : "";
      return `Série ${textoDe(item?.id) ?? `nº ${numero}`}${confronto}`;
    }
    case "games":
      return `jogo ${numero}`;
    case "bans":
      return `ban ${numero}`;
    case "statsByPlayer":
      return `linha ${numero} do K/D/A`;
    case "cardsUsed":
      return `cartinha ${numero}`;
    case "sorteios":
      return `registro de sorteio ${numero}`;
    case "standingsSeed":
      return `Classificação inicial, linha ${numero}`;
    case "archivedSeasons":
      return `Temporada arquivada ${textoDe(item?.name) ?? textoDe(item?.seasonId) ?? `nº ${numero}`}`;
    default:
      return `${NOME_DO_CAMPO[lista] ?? lista} ${numero}`;
  }
}

/** "Série 4a-jogo-04 (Alfa x Beta) › jogo 1 › ban 1 › campeão", a partir do caminho do erro. */
function descreverLocal(caminho: readonly PropertyKey[], entrada: unknown): string {
  const partes: string[] = [];
  let atual: unknown = entrada;
  let times = nomesDosTimes(entrada);

  for (let i = 0; i < caminho.length; i++) {
    const chave = String(caminho[i]);
    const proximo = caminho[i + 1];
    const valor = comoRegistro(atual)?.[chave];

    if (typeof proximo === "number" && Array.isArray(valor)) {
      partes.push(rotuloDoItem(chave, proximo, comoRegistro(valor[proximo]), times));
      atual = valor[proximo];
      i += 1;
      continue;
    }

    if (chave === "tournament") partes.push("Torneio");
    else if (chave === "snapshot") times = nomesDosTimes(valor); // o retrato tem os times DELE
    else partes.push(NOME_DO_CAMPO[chave] ?? chave);
    atual = valor;
  }

  return partes.join(" › ") || "Dados do campeonato";
}

function descreverMotivo(problema: ProblemaDeValidacao): string {
  const p = problema as ProblemaDeValidacao & Registro;
  const origem = p.origin;
  switch (problema.code) {
    case "too_small": {
      const minimo = Number(p.minimum);
      if (origem === "string") {
        return minimo <= 1 ? "não pode ficar vazio" : `precisa ter pelo menos ${minimo} caracteres`;
      }
      if (origem === "number") {
        return p.inclusive === false ? `precisa ser maior que ${minimo}` : `não pode ser menor que ${minimo}`;
      }
      if (origem === "array") return `precisa ter pelo menos ${minimo} item(ns)`;
      return "está abaixo do mínimo";
    }
    case "too_big": {
      const maximo = Number(p.maximum);
      if (origem === "string") return `passou do limite de ${maximo} caracteres`;
      if (origem === "number") {
        return p.inclusive === false ? `precisa ser menor que ${maximo}` : `não pode passar de ${maximo}`;
      }
      if (origem === "array") return `passou do limite de ${maximo} itens`;
      return "passou do limite";
    }
    case "invalid_type":
      return /received undefined/i.test(problema.message) ? "está faltando" : "está num formato inválido";
    case "invalid_value": {
      const valores = Array.isArray(p.values) ? (p.values as unknown[]).map(String) : [];
      return valores.length > 0 ? `precisa ser um destes: ${valores.join(", ")}` : "tem um valor não permitido";
    }
    case "invalid_format":
      return "está num formato inválido";
    case "unrecognized_keys":
      return "tem campos desconhecidos";
    case "custom":
      return problema.message;
    default:
      return "tem um valor inválido";
  }
}

/**
 * Resumo legível dos problemas de validação de um dataset, em português.
 *
 * As mensagens próprias das regras de integridade (`refineDatasetIntegrity`) já nascem em
 * português e já dizem a série ou o jogador — essas passam como estão, a não ser dentro de
 * uma temporada arquivada ou de uma imagem, onde falta dizer de onde vieram.
 */
export function descreverProblemasDoDataset(
  problemas: readonly ProblemaDeValidacao[],
  entrada: unknown,
  limite = 10,
): string {
  const linhas: string[] = [];
  for (const problema of problemas) {
    const motivo = descreverMotivo(problema);
    const jaTemContexto =
      problema.code === "custom" &&
      problema.path[0] !== "archivedSeasons" &&
      problema.path[problema.path.length - 1] !== "imageUrl";
    const linha = jaTemContexto ? motivo : `${descreverLocal(problema.path, entrada)}: ${motivo}`;
    if (!linhas.includes(linha)) linhas.push(linha);
  }
  const resto = linhas.length - limite;
  return [...linhas.slice(0, limite), ...(resto > 0 ? [`e mais ${resto} problema(s)`] : [])].join(" | ");
}

