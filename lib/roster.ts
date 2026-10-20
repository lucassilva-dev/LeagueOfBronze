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

/**
 * Quem é o capitão de cada time, quando o dataset diz.
 *
 * Até a 3ª Edição a regra era fixa: capitão = MID. Na 4ª, o capitão vem do draft (o de
 * maior elo, de qualquer rota, e nunca alguém da organização), e a virada grava
 * `captain: true` nele (lib/draft/virada.ts). As temporadas arquivadas não têm o campo,
 * e o arquivo delas tem de continuar mostrando o que sempre mostrou.
 *
 * A decisão é pelo dataset EXIBIDO inteiro — o ao vivo, ou o snapshot de uma temporada
 * arquivada, que chega aqui como dataset próprio (snapshotToDataset) — e nunca por
 * time: se um jogador tem a marca, vale a marca para todos. Misturar as regras faria um
 * time da 4ª sem marca (criado à mão no painel, por exemplo) ganhar o MID como capitão,
 * que pode ser justamente alguém da organização.
 *
 * Devolve time → id do capitão, ou `null` quando o dataset não tem marca nenhuma (regra
 * do MID). Um capitão por time: se o painel deixar dois marcados no mesmo time (um
 * jogador trocado de time, por exemplo), vale o primeiro na ordem do dataset — melhor do
 * que o site exibir dois capitães.
 */
function capitaesMarcados(players: TournamentDataset["players"]): Map<string, string> | null {
  if (!players.some((player) => player.captain === true)) return null;

  const capitaoDoTime = new Map<string, string>();
  for (const player of players) {
    if (player.captain === true && !capitaoDoTime.has(player.teamId)) {
      capitaoDoTime.set(player.teamId, player.id);
    }
  }
  return capitaoDoTime;
}

export function buildDesignPlayers(dataset: TournamentDataset): DesignPlayer[] {
  const teamsById = new Map(dataset.teams.map((team) => [team.id, team]));
  const capitaoDoTime = capitaesMarcados(dataset.players);
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
      captain: capitaoDoTime ? capitaoDoTime.get(player.teamId) === player.id : roleMeta.short === "MID",
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
  const comMarca = capitaesMarcados(dataset.players) !== null;
  return dataset.teams.map((team) => {
    const roster = players
      .filter((player) => player.teamId === team.id)
      .sort((a, b) => a.roleMeta.order - b.roleMeta.order);
    // Sem MID, a regra antiga caía no primeiro do elenco — e é o que o arquivo da 3ª
    // sempre mostrou. Com a marca, time sem capitão marcado fica sem capitão: inventar
    // um (o TOP, que vem primeiro) poderia apontar alguém da organização.
    const marcado = roster.find((player) => player.captain);
    const captain = comMarca ? (marcado ?? null) : (marcado ?? roster[0] ?? null);
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
