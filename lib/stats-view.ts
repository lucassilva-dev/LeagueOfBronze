import type { ChampStatRow, PlayerStatRow } from "@/components/lob/stats-toggles";
import type { TournamentDataset } from "@/lib/schema";
import { buildDesignPlayers } from "@/lib/roster";
import { buildChampionLeaderboards, buildLeaderboards } from "@/lib/tournament";

// Monta as linhas dos rankings (jogadores + campeões) do <StatsToggles> a partir de um dataset
// qualquer — serve tanto para o campeonato ativo quanto para uma temporada arquivada.
export function buildStatsRows(dataset: TournamentDataset): {
  playerRankings: Record<string, PlayerStatRow[]>;
  champRankings: Record<string, ChampStatRow[]>;
} {
  const players = buildDesignPlayers(dataset);
  const designById = new Map(players.map((p) => [p.id, p] as const));
  const pboards = buildLeaderboards(dataset);

  const toRow = (
    r: { position: number; value: number; player: { playerId: string; playerNick: string; teamName: string } },
    valueLabel: string,
  ): PlayerStatRow => {
    const d = designById.get(r.player.playerId);
    return {
      rank: r.position,
      nick: d?.displayNick ?? r.player.playerNick,
      roleLabel: d?.roleMeta.label ?? "",
      teamName: r.player.teamName,
      teamColor: d?.teamColor ?? "#c98a4b",
      teamImageUrl: d?.teamImageUrl,
      imageUrl: d?.imageUrl,
      eloKey: d?.eloMeta?.key ?? "ferro",
      eloLabel: d?.eloMeta?.label ?? "",
      valueLabel,
    };
  };

  const playerRankings: Record<string, PlayerStatRow[]> = {
    abates: pboards.kills.map((r) => toRow(r, String(r.value))),
    kda: pboards.kda.map((r) => toRow(r, r.value.toFixed(2))),
    mvps: pboards.mvps.map((r) => toRow(r, String(r.value))),
    assist: pboards.assists.map((r) => toRow(r, String(r.value))),
    mortes: pboards.deathsLeast.map((r) => toRow(r, String(r.value))),
  };

  const cboards = buildChampionLeaderboards(dataset);
  const champRankings: Record<string, ChampStatRow[]> = {
    jogados: cboards.picks.map((r) => ({ rank: r.position, championId: r.champion.championId, championName: r.champion.championName, valueLabel: `${r.value}×`, sub: `${r.champion.wins}V · ${r.champion.losses}D` })),
    banidos: cboards.bans.map((r) => ({ rank: r.position, championId: r.champion.championId, championName: r.champion.championName, valueLabel: `${r.value}×`, sub: `banido ${r.value}×` })),
    taxaban: cboards.banRate.map((r) => ({ rank: r.position, championId: r.champion.championId, championName: r.champion.championName, valueLabel: `${Math.round(r.value)}%`, sub: `${r.champion.bans} bans` })),
    presenca: cboards.presence.map((r) => ({ rank: r.position, championId: r.champion.championId, championName: r.champion.championName, valueLabel: `${Math.round(r.value)}%`, sub: `${r.champion.picks}P · ${r.champion.bans}B` })),
    winrate: cboards.winRate.map((r) => ({ rank: r.position, championId: r.champion.championId, championName: r.champion.championName, valueLabel: `${Math.round(r.value)}%`, sub: `${r.champion.wins}V/${r.champion.games}J` })),
    kda: cboards.kda.map((r) => ({ rank: r.position, championId: r.champion.championId, championName: r.champion.championName, valueLabel: r.value.toFixed(2), sub: `${r.champion.kills}/${r.champion.deaths}/${r.champion.assists}` })),
  };

  return { playerRankings, champRankings };
}
