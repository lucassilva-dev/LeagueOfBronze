import type { TournamentDataset } from "@/lib/schema";
import { resolveElo, resolveRole, teamColor, type EloMeta, type RoleMeta } from "@/lib/design";
import { getDisplayNick } from "@/lib/opgg";

export type DesignPlayer = {
  id: string;
  slug: string;
  nick: string;
  displayNick: string;
  name: string;
  imageUrl?: string;
  mono: boolean;
  captain: boolean;
  elo: string;
  eloMeta: EloMeta | null;
  pts: number;
  role1: string;
  roleMeta: RoleMeta;
  teamId: string;
  teamName: string;
  teamSlug: string;
  teamColor: string;
  teamImageUrl?: string;
};

export type DesignTeam = {
  id: string;
  name: string;
  slug: string;
  color: string;
  imageUrl?: string;
  roster: DesignPlayer[];
  captain: DesignPlayer | null;
  total: number;
};

export function buildDesignPlayers(dataset: TournamentDataset): DesignPlayer[] {
  const teamsById = new Map(dataset.teams.map((team) => [team.id, team]));
  return dataset.players.map((player) => {
    const team = teamsById.get(player.teamId);
    const eloMeta = resolveElo(player.elo);
    const roleMeta = resolveRole(player.role1);
    return {
      id: player.id,
      slug: player.slug,
      nick: player.nick,
      displayNick: getDisplayNick(player.nick),
      name: player.name?.trim() || getDisplayNick(player.nick),
      imageUrl: player.imageUrl,
      mono: Boolean(player.mono),
      captain: roleMeta.short === "MID",
      elo: player.elo,
      eloMeta,
      pts: eloMeta?.pts ?? 0,
      role1: player.role1,
      roleMeta,
      teamId: player.teamId,
      teamName: team?.name ?? player.teamId,
      teamSlug: team?.slug ?? player.teamId,
      teamColor: teamColor(player.teamId),
      teamImageUrl: team?.imageUrl,
    };
  });
}

export function buildDesignTeams(dataset: TournamentDataset): DesignTeam[] {
  const players = buildDesignPlayers(dataset);
  return dataset.teams.map((team) => {
    const roster = players
      .filter((player) => player.teamId === team.id)
      .sort((a, b) => a.roleMeta.order - b.roleMeta.order);
    const captain = roster.find((player) => player.captain) ?? roster[0] ?? null;
    const total = roster.reduce((sum, player) => sum + player.pts, 0);
    return {
      id: team.id,
      name: team.name,
      slug: team.slug,
      color: teamColor(team.id),
      imageUrl: team.imageUrl,
      roster,
      captain,
      total,
    };
  });
}
