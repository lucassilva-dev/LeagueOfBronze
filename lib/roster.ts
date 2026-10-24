import type { Player, SeriesGame, TournamentDataset } from "@/lib/schema";
import { resolveElo, resolveRole, teamColor, type EloMeta, type RoleMeta } from "@/lib/design";
import { podeSubstituir, type InscricaoDaPrevia, type PreviaDosPrecos } from "@/lib/draft/previa-de-precos";
import { contaParaTimes } from "@/lib/inscricoes/schema";
import { getDisplayNick } from "@/lib/opgg";
import { elencoAtivo, estaNoElenco, linhaDeSubstituto } from "@/lib/tournament";

/** Cor neutra do reserva, que não tem time (o mesmo cinza-bronze dos textos de apoio). */
const COR_DO_RESERVA = "#8f8472";

/** Rótulos que dependem do idioma. Sem eles, português. */
export type RotulosDoElenco = { reserva: string };
const ROTULOS_PT: RotulosDoElenco = { reserva: "Reserva" };

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
  /** Vazio ("") para o reserva, que não tem time — assim como `teamSlug`. */
  teamId: string;
  /** O nome do time; para o reserva, o rótulo "Reserva" do idioma. */
  teamName: string;
  teamSlug: string;
  teamColor: string;
  teamImageUrl?: string;
  /** Reserva oficial, sem time (regra 6). */
  reserva: boolean;
  /** Saiu do time de vez (`saiuEm`): tem ficha e histórico, mas não está no elenco. */
  saiu: boolean;
  /**
   * Está no elenco público de hoje (`estaNoElenco`): é o que /times, o PTS do elenco, o
   * Multi OP.GG, /jogadores e os números do pool contam.
   */
  noElenco: boolean;
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
 *
 * Só quem está no ELENCO conta como capitão: o capitão que saiu de vez fica com a marca
 * gravada (é histórico), mas a vaga de capitão passa para quem a organização escolher —
 * sem este recorte, a marca antiga, vindo antes no dataset, escondia o capitão novo.
 * O "tem marca no dataset" continua olhando todo mundo: a saída do único capitão marcado
 * não pode devolver o dataset da 4ª à regra antiga do MID.
 */
function capitaesMarcados(players: TournamentDataset["players"]): Map<string, string> | null {
  if (!players.some((player) => player.captain === true)) return null;

  const capitaoDoTime = new Map<string, string>();
  for (const player of players) {
    if (player.captain !== true || player.teamId === undefined || !estaNoElenco(player)) continue;
    if (!capitaoDoTime.has(player.teamId)) capitaoDoTime.set(player.teamId, player.id);
  }
  return capitaoDoTime;
}

/**
 * Todos os jogadores do dataset no formato do design — inclusive o reserva e quem saiu de
 * vez, que têm ficha. Quem lista ELENCO filtra por `noElenco` (ou usa `buildDesignTeams`).
 */
export function buildDesignPlayers(
  dataset: TournamentDataset,
  rotulos: RotulosDoElenco = ROTULOS_PT,
): DesignPlayer[] {
  const teamsById = new Map(dataset.teams.map((team) => [team.id, team]));
  const capitaoDoTime = capitaesMarcados(dataset.players);
  return dataset.players.map((player) => {
    const teamId = player.teamId ?? "";
    const team = player.teamId === undefined ? undefined : teamsById.get(player.teamId);
    const eloMeta = resolveElo(player.elo);
    const roleMeta = resolveRole(player.role1);
    const noElenco = estaNoElenco(player);
    const reserva = player.teamId === undefined;
    return {
      id: player.id,
      slug: player.slug,
      nick: player.nick,
      displayNick: getDisplayNick(player.nick),
      name: player.name?.trim() || getDisplayNick(player.nick),
      imageUrl: player.imageUrl,
      mono: Boolean(player.mono),
      captain: capitaoDoTime
        ? capitaoDoTime.get(teamId) === player.id
        : noElenco && roleMeta.short === "MID",
      elo: player.elo,
      eloMeta,
      pts: eloMeta?.pts ?? 0,
      role1: player.role1,
      roleMeta,
      teamId,
      teamName: reserva ? rotulos.reserva : (team?.name ?? teamId),
      teamSlug: team?.slug ?? teamId,
      teamColor: reserva ? COR_DO_RESERVA : teamColor(teamId),
      teamImageUrl: team?.imageUrl,
      reserva,
      saiu: Boolean(player.saiuEm),
      noElenco,
    };
  });
}

/** Só o elenco público de hoje (ver `DesignPlayer.noElenco`). */
export function buildDesignPlayersDoElenco(
  dataset: TournamentDataset,
  rotulos: RotulosDoElenco = ROTULOS_PT,
): DesignPlayer[] {
  return buildDesignPlayers(dataset, rotulos).filter((player) => player.noElenco);
}

export function buildDesignTeams(dataset: TournamentDataset): DesignTeam[] {
  const players = buildDesignPlayers(dataset);
  const comMarca = capitaesMarcados(dataset.players) !== null;
  return dataset.teams.map((team) => {
    // O elenco é o de HOJE: quem saiu de vez não conta no PTS, no Multi OP.GG nem nos 5.
    const roster = players
      .filter((player) => player.noElenco && player.teamId === team.id)
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

// ---------------------------------------------------------------- regra 6: o preço do substituto

/**
 * Como a regra 6 compara dois jogadores do DATASET ("valor igual ou menor ao do
 * substituído"). O dataset não tem preço nem divisão — o preço é da inscrição —, então a
 * comparação vem montada de fora, por `regraDoSubstitutoPelosPrecos`.
 */
export type RegraDoSubstituto = {
  /**
   * O preço do jogador na tabela; nulo sem inscrição casada, sem elo legível ou sem preço (o
   * capitão sem preço e o time definido pela organização).
   */
  preco: (jogador: Pick<Player, "nick">) => number | null;
  /**
   * `true`: o substituto vale igual ou menos que o substituído; `false`: vale mais;
   * `null`: não há valor para comparar (um dos dois sem inscrição casada, sem elo legível ou
   * sem preço).
   */
  comparar: (substituto: Pick<Player, "nick">, substituido: Pick<Player, "nick">) => boolean | null;
};

/** O Riot ID como chave de casamento: a Riot não diferencia maiúsculas, e espaço sobra é digitação. */
function chaveDoRiotId(riotId: string): string {
  return riotId.trim().toLowerCase();
}

/**
 * A regra 6 pelos MESMOS preços da aba Times e vagas: a tabela do SORTEIO
 * (`precosDoSorteio`) depois do draft, a prévia (`previaDosPrecos`) antes dele — quem chama
 * escolhe, exatamente como a aba faz. A comparação é a `podeSubstituir` de lá.
 *
 * O jogador do dataset casa com a inscrição pelo Riot ID (o `nick` do dataset É o Riot ID
 * que a virada gravou), sem diferenciar maiúsculas. Sem inscrição casada, ou com elo que o
 * site não reconhece, não há preço: a comparação devolve `null` e o aviso diz isso — a
 * tabela fixa da 3ª (`pontos` do elo) não serve, porque não é o preço que o draft usou.
 *
 * Também não há preço para quem a tabela não precifica (`semPreco`): o capitão sem preço
 * (23/10/2026) e os cinco do time definido pela organização (24/10/2026), que não passaram
 * pelo draft. No draft eles constam com 0 pontos, e comparar esse 0 diria que qualquer
 * substituto "vale mais" — ou que qualquer um deles cabe no lugar de qualquer titular. A troca
 * de um deles é decisão da organização: a comparação devolve `null`, e o aviso pede a
 * conferência à mão.
 */
export function regraDoSubstitutoPelosPrecos(
  precos: PreviaDosPrecos,
  inscritos: readonly InscricaoDaPrevia[],
): RegraDoSubstituto {
  // A mesma pessoa pode ter mais de uma linha (desistiu e se inscreveu de novo): vale a
  // que ainda conta (`contaParaTimes`); entre iguais, a primeira da lista.
  const porRiotId = new Map<string, InscricaoDaPrevia>();
  for (const inscricao of inscritos) {
    if (inscricao.riot_id === undefined) continue;
    const chave = chaveDoRiotId(inscricao.riot_id);
    const atual = porRiotId.get(chave);
    if (!atual || (!contaParaTimes(atual.situacao) && contaParaTimes(inscricao.situacao))) {
      porRiotId.set(chave, inscricao);
    }
  }
  const inscricaoDe = (jogador: Pick<Player, "nick">) => porRiotId.get(chaveDoRiotId(jogador.nick));
  // `podeSubstituir` compara pelo preço quando há tabela e pela força antes dela; "sem valor"
  // é o mesmo critério dela, olhado antes para separar "vale mais" de "não dá para saber".
  const temValor = (inscricao: InscricaoDaPrevia) =>
    !precos.semPreco(inscricao) &&
    (precos.tabela ? precos.preco(inscricao) !== null : precos.forca(inscricao) !== null);

  return {
    preco: (jogador) => {
      const inscricao = inscricaoDe(jogador);
      return inscricao && !precos.semPreco(inscricao) ? precos.preco(inscricao) : null;
    },
    comparar: (substituto, substituido) => {
      const a = inscricaoDe(substituto);
      const b = inscricaoDe(substituido);
      if (!a || !b || !temValor(a) || !temValor(b)) return null;
      return podeSubstituir(precos, a, b);
    },
  };
}

/** Um substituto avulso que a regra 6 manda a organização aprovar (o painel avisa). */
export type AvisoDeSubstituto = {
  jogadorId: string;
  nick: string;
  /** O time que ele cobriu neste jogo (o `teamId` da linha). */
  teamId: string;
  /** "acima": vale mais que todo titular de fora com preço; "sem_preco": não há como comparar. */
  motivo: "acima" | "sem_preco";
  /** O preço do substituto na tabela; nulo sem preço. */
  pontos: number | null;
  /** O maior preço entre os titulares do time que ficaram sem linha neste jogo; nulo sem preço. */
  teto: number | null;
};

/**
 * Regra 6: o substituto tem de valer pontos iguais ou menores que os do titular que ele
 * substituiu; acima disso, a substituição depende de aprovação da organização. O painel
 * AVISA com isto — não bloqueia nada, e o servidor não recusa.
 *
 * O preço é o da tabela automática do draft (`regra`, de `regraDoSubstitutoPelosPrecos`),
 * nunca a tabela fixa da 3ª. O dataset não grava QUEM foi substituído, então vale o
 * titular do time que ficou sem linha naquele jogo com quem a troca passa: se passa com
 * algum deles, não há aviso. Sem titular de fora (o time lançou as 5 linhas dos titulares e
 * mais o substituto), não há com quem comparar e também não sai aviso. Sem preço de nenhum
 * lado, sai o aviso "sem_preco": a organização confere à mão.
 */
export function avisosDeSubstituto(
  game: SeriesGame,
  dataset: TournamentDataset,
  regra: RegraDoSubstituto,
): AvisoDeSubstituto[] {
  const playersById = new Map(dataset.players.map((player) => [player.id, player]));
  const jogaram = new Set(game.statsByPlayer.map((linha) => linha.playerId));

  const avisos: AvisoDeSubstituto[] = [];
  for (const linha of game.statsByPlayer) {
    const jogador = playersById.get(linha.playerId);
    if (!jogador || linha.teamId === undefined || !linhaDeSubstituto(linha, jogador)) continue;

    const deFora = elencoAtivo(dataset, linha.teamId).filter((titular) => !jogaram.has(titular.id));
    if (deFora.length === 0) continue;

    const comparacoes = deFora.map((titular) => regra.comparar(jogador, titular));
    if (comparacoes.includes(true)) continue;

    const precosDeFora = deFora.map((titular) => regra.preco(titular)).filter((p): p is number => p !== null);
    avisos.push({
      jogadorId: jogador.id,
      nick: jogador.nick,
      teamId: linha.teamId,
      motivo: comparacoes.includes(false) ? "acima" : "sem_preco",
      pontos: regra.preco(jogador),
      teto: precosDeFora.length > 0 ? Math.max(...precosDeFora) : null,
    });
  }
  return avisos;
}
