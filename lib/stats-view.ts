import type { ChampStatRow, PlayerStatRow } from "@/components/lob/stats-toggles";
import type { TournamentDataset } from "@/lib/schema";
import { buildDesignPlayers } from "@/lib/roster";
import {
  buildChampionLeaderboards,
  buildLeaderboards,
  calculatePlayerAggregates,
} from "@/lib/tournament";

export type RoleBestRow = {
  rank: number;
  slug: string;
  nick: string;
  imageUrl?: string;
  teamName: string;
  teamColor: string;
  teamImageUrl?: string;
  role1: string;
  games: number;
  kills: number;
  deaths: number;
  assists: number;
  kda: number;
  mvps: number;
};

export type RoleBestGroup = {
  short: string;
  label: string;
  color: string;
  role1: string;
  rows: RoleBestRow[];
};

const ROLE_ORDER = ["TOP", "SEL", "MID", "ADC", "SUP"];

// Melhor jogador de cada rota, por KDA (desempate: mais jogos, mais MVPs, mais abates).
// Só entram jogadores que efetivamente jogaram.
export function buildRoleBests(dataset: TournamentDataset, limit = 3): RoleBestGroup[] {
  const aggById = new Map(calculatePlayerAggregates(dataset).map((a) => [a.playerId, a] as const));

  const rows = buildDesignPlayers(dataset)
    .map((p) => {
      const agg = aggById.get(p.id);
      return { p, agg };
    })
    .filter((r) => (r.agg?.gamesPlayed ?? 0) > 0);

  return ROLE_ORDER.map((short) => {
    const list = rows
      .filter((r) => r.p.roleMeta.short === short)
      .sort((a, b) => {
        const ka = a.agg!.kda;
        const kb = b.agg!.kda;
        if (ka !== kb) return kb - ka;
        if (a.agg!.gamesPlayed !== b.agg!.gamesPlayed) return b.agg!.gamesPlayed - a.agg!.gamesPlayed;
        if (a.agg!.gameMvps !== b.agg!.gameMvps) return b.agg!.gameMvps - a.agg!.gameMvps;
        return b.agg!.kills - a.agg!.kills;
      })
      .slice(0, limit)
      .map<RoleBestRow>((r, i) => ({
        rank: i + 1,
        slug: r.p.slug,
        nick: r.p.displayNick,
        imageUrl: r.p.imageUrl,
        teamName: r.p.teamName,
        teamColor: r.p.teamColor,
        teamImageUrl: r.p.teamImageUrl,
        role1: r.p.role1,
        games: r.agg!.gamesPlayed,
        kills: r.agg!.kills,
        deaths: r.agg!.deaths,
        assists: r.agg!.assists,
        kda: r.agg!.kda,
        mvps: r.agg!.gameMvps,
      }));

    const meta = rows.find((r) => r.p.roleMeta.short === short)?.p.roleMeta;
    return {
      short,
      label: meta?.label ?? short,
      color: meta?.color ?? "#c98a4b",
      role1: list[0]?.role1 ?? short,
      rows: list,
    };
  }).filter((group) => group.rows.length > 0);
}

/**
 * Siglas e rótulos usados nas linhas dos rankings (3V · 2D, 40% dos jogos, 5V/8J, rota do
 * jogador). Opcional: sem eles as linhas saem em português, como sempre foram.
 */
export type StatsRowLabels = {
  vitoria: string;
  derrota: string;
  jogo: string;
  pick: string;
  ban: string;
  dosJogos: string;
  /** Rótulo da rota pela sigla do design system (TOP, SEL, MID, ADC, SUP). */
  rotas?: Record<string, string>;
};

const LABELS_PT: StatsRowLabels = {
  vitoria: "V",
  derrota: "D",
  jogo: "J",
  pick: "P",
  ban: "B",
  dosJogos: "dos jogos",
};

// Monta as linhas dos rankings (jogadores + campeões) do <StatsToggles> a partir de um dataset
// qualquer — serve tanto para o campeonato ativo quanto para uma temporada arquivada.
export function buildStatsRows(
  dataset: TournamentDataset,
  labels: StatsRowLabels = LABELS_PT,
): {
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
      roleLabel: d ? (labels.rotas?.[d.roleMeta.short] ?? d.roleMeta.label) : "",
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
    jogados: cboards.picks.map((r) => ({ rank: r.position, championId: r.champion.championId, championName: r.champion.championName, valueLabel: `${r.value}×`, sub: `${r.champion.wins}${labels.vitoria} · ${r.champion.losses}${labels.derrota}` })),
    banidos: cboards.bans.map((r) => ({ rank: r.position, championId: r.champion.championId, championName: r.champion.championName, valueLabel: `${r.value}×`, sub: `${Math.round(r.champion.banRate)}% ${labels.dosJogos}` })),
    presenca: cboards.presence.map((r) => ({ rank: r.position, championId: r.champion.championId, championName: r.champion.championName, valueLabel: `${Math.round(r.value)}%`, sub: `${r.champion.picks}${labels.pick} · ${r.champion.bans}${labels.ban}` })),
    winrate: cboards.winRate.map((r) => ({ rank: r.position, championId: r.champion.championId, championName: r.champion.championName, valueLabel: `${Math.round(r.value)}%`, sub: `${r.champion.wins}${labels.vitoria}/${r.champion.games}${labels.jogo}` })),
    kda: cboards.kda.map((r) => ({ rank: r.position, championId: r.champion.championId, championName: r.champion.championName, valueLabel: r.value.toFixed(2), sub: `${r.champion.kills}/${r.champion.deaths}/${r.champion.assists}` })),
  };

  return { playerRankings, champRankings };
}
