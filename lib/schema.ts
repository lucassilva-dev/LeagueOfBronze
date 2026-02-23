import { z } from "zod";

const nonEmpty = z.string().trim().min(1);
type IssuePath = Array<string | number>;

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
  dataset: TournamentDataset,
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
  dataset: TournamentDataset,
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
  dataset: TournamentDataset,
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

function validateSeriesReferences(
  dataset: TournamentDataset,
  ctx: z.RefinementCtx,
  teamIds: Set<string>,
  playerIds: Set<string>,
) {
  for (const [seriesIndex, series] of dataset.seriesMatches.entries()) {
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

    for (const [gameIndex, game] of series.games.entries()) {
      validateGameReferences(game, series, seriesIndex, gameIndex, ctx, playerIds);
    }
  }
}

export const tournamentSchema = z.object({
  name: nonEmpty,
  lastUpdatedISO: nonEmpty,
  seriesPointsRule: z.object({
    win: z.number().int().nonnegative(),
    loss: z.number().int().nonnegative(),
  }),
  format: z.literal("BO3"),
});

export const teamSchema = z.object({
  id: nonEmpty,
  name: nonEmpty,
  slug: nonEmpty,
});

export const playerSchema = z.object({
  id: nonEmpty,
  nick: nonEmpty,
  slug: nonEmpty,
  teamId: nonEmpty,
  role1: nonEmpty,
  role2: z.string().trim().optional(),
  elo: nonEmpty,
});

export const playerGameStatsSchema = z.object({
  playerId: nonEmpty,
  champion: z.string().trim().optional(),
  kills: z.number().int().min(0),
  deaths: z.number().int().min(0),
  assists: z.number().int().min(0),
});

export const seriesGameSchema = z.object({
  winnerTeamId: nonEmpty,
  durationMin: z.number().int().positive().optional(),
  mvpPlayerId: nonEmpty,
  statsByPlayer: z.array(playerGameStatsSchema).max(20),
});

export const seriesMatchSchema = z.object({
  id: nonEmpty,
  date: nonEmpty,
  teamAId: nonEmpty,
  teamBId: nonEmpty,
  games: z.array(seriesGameSchema).max(3),
});

export const standingsSeedRowSchema = z.object({
  teamId: nonEmpty,
  played: z.number().int().min(0),
  points: z.number().int().min(0),
});

export const tournamentDatasetSchema = z
  .object({
    tournament: tournamentSchema,
    teams: z.array(teamSchema),
    players: z.array(playerSchema),
    seriesMatches: z.array(seriesMatchSchema),
    standingsSeed: z.array(standingsSeedRowSchema).default([]),
  })
  .superRefine((dataset, ctx) => {
    validateDatasetUniqueness(dataset, ctx);

    const teamIds = new Set(dataset.teams.map((team) => team.id));
    const playerIds = new Set(dataset.players.map((player) => player.id));

    validatePlayerTeamReferences(dataset, ctx, teamIds);
    validateStandingsSeedReferences(dataset, ctx, teamIds);
    validateSeriesReferences(dataset, ctx, teamIds, playerIds);
  });

export const adminLoginSchema = z.object({
  password: z.string().min(1, "Senha obrigatória."),
});

export type TournamentDataset = z.infer<typeof tournamentDatasetSchema>;
export type TournamentInfo = z.infer<typeof tournamentSchema>;
export type Team = z.infer<typeof teamSchema>;
export type Player = z.infer<typeof playerSchema>;
export type PlayerGameStats = z.infer<typeof playerGameStatsSchema>;
export type SeriesGame = z.infer<typeof seriesGameSchema>;
export type SeriesMatch = z.infer<typeof seriesMatchSchema>;
export type StandingsSeedRow = z.infer<typeof standingsSeedRowSchema>;
