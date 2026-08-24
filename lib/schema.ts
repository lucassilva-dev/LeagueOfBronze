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

function validatePlayerTeamReferences(
  dataset: DatasetCore,
  ctx: z.RefinementCtx,
  teamIds: Set<string>,
) {
  for (const [index, player] of dataset.players.entries()) {
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
  playerIds: Set<string>,
) {
  const allowedWinners = new Set([series.teamAId, series.teamBId]);

  if (!allowedWinners.has(game.winnerTeamId)) {
    addCustomIssue(
      ctx,
      ["seriesMatches", seriesIndex, "games", gameIndex, "winnerTeamId"],
      `Jogo ${gameIndex + 1} da série ${series.id} possui winnerTeamId inválido.`,
    );
  }

  if (!playerIds.has(game.mvpPlayerId)) {
    addCustomIssue(
      ctx,
      ["seriesMatches", seriesIndex, "games", gameIndex, "mvpPlayerId"],
      `Jogo ${gameIndex + 1} da série ${series.id} possui MVP inválido.`,
    );
  }

  const statsPlayerIds = new Set<string>();
  for (const [statIndex, stats] of game.statsByPlayer.entries()) {
    if (!playerIds.has(stats.playerId)) {
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

function validateWalkoverSeries(
  series: SeriesMatch,
  seriesIndex: number,
  ctx: z.RefinementCtx,
) {
  if (!series.walkoverWinnerTeamId) return false;

  const allowedWinners = new Set([series.teamAId, series.teamBId]);

  if (!allowedWinners.has(series.walkoverWinnerTeamId)) {
    addCustomIssue(
      ctx,
      ["seriesMatches", seriesIndex, "walkoverWinnerTeamId"],
      `Série ${series.id} possui vencedor de W.O. inválido.`,
    );
  }

  if (series.games.length > 0) {
    addCustomIssue(
      ctx,
      ["seriesMatches", seriesIndex, "games"],
      `Série ${series.id} marcada como W.O. não pode ter jogos registrados.`,
    );
  }

  return true;
}

function validateSeriesReferences(
  dataset: DatasetCore,
  ctx: z.RefinementCtx,
  teamIds: Set<string>,
  playerIds: Set<string>,
) {
  for (const [seriesIndex, series] of dataset.seriesMatches.entries()) {
    const seriesFormat = series.format ?? dataset.tournament.format;
    const maxGames = seriesFormat === "BO5" ? 5 : 3;

    validateSeriesTeams(series, seriesIndex, ctx, teamIds);
    validateSeriesGameLimit(series, seriesIndex, ctx, maxGames, seriesFormat);

    if (validateWalkoverSeries(series, seriesIndex, ctx)) {
      continue;
    }

    for (const [gameIndex, game] of series.games.entries()) {
      validateGameReferences(game, series, seriesIndex, gameIndex, ctx, playerIds);
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
  teamId: limitado(LIMITES.id),
  role1: limitado(LIMITES.rota),
  role2: z.string().trim().max(LIMITES.rota).optional(),
  elo: limitado(LIMITES.elo),
  imageUrl: imageUrlField.optional(),
  name: z.string().trim().max(LIMITES.nome).optional(),
  mono: z.boolean().optional(),
});

export const playerGameStatsSchema = z.object({
  playerId: limitado(LIMITES.id),
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
    .max(50)
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
  const playerIds = new Set(dataset.players.map((player) => player.id));

  validatePlayerTeamReferences(dataset, ctx, teamIds);
  validateStandingsSeedReferences(dataset, ctx, teamIds);
  validateSeriesReferences(dataset, ctx, teamIds, playerIds);
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

