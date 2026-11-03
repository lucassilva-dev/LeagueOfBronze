import { riotIdComparavel } from "@/lib/riot/decidir";
import type { Player, TournamentDataset } from "@/lib/schema";

/**
 * O nick do site acompanha a conta da Riot.
 *
 * O `nick` de cada jogador do dataset é o Riot ID ("Nome#TAG") — e é dele que o site inteiro
 * lê: times, fichas, /jogadores, stats, partidas, MVPs, os links do OP.GG e as temporadas
 * arquivadas. Quando o jogador troca de nick na Riot, o robô descobre o Riot ID novo pela
 * conta (PUUID) e esta função o grava no dataset, em toda temporada onde a conta aparece.
 *
 * Função pura: recebe o dataset e as contas conhecidas (das inscrições e das consultas do
 * robô) e devolve o dataset novo e a lista do que mudou. Não toca em `id` nem em `slug`: as
 * estatísticas apontam para o id, e o slug é o endereço da ficha que circula no grupo.
 *
 * O vínculo:
 *  - o jogador que já tem `puuid` casa SÓ por ele (ou pelo puuid antigo de uma conta que a
 *    troca da chave da API cifrou de novo). Nunca pelo nome: um Riot ID trocado fica livre, e
 *    outra pessoa pode pegá-lo;
 *  - o que ainda não tem casa pelo nome — o Riot ID dele igual a um dos nomes conhecidos de UMA
 *    conta só — e ganha o `puuid` a partir daí. Nas temporadas arquivadas, só contas que
 *    `ligaArquivo` (a inscrição apta, conferida pela organização): uma inscrição pendente, de
 *    graça, não herda o histórico de quem tinha aquele nome.
 */

/** Uma conta da Riot com o Riot ID de hoje. */
export type ContaConhecida = Readonly<{
  puuid: string;
  /** O Riot ID que a conta tem ("Nome#TAG"). */
  riotId: string;
  /** Outros nomes pelos quais a conta pode estar no site (o Riot ID declarado na inscrição). */
  outrosNomes?: readonly string[];
  /** PUUIDs antigos da mesma conta (a chave da API mudou e a Riot cifrou de novo). */
  puuidsAntigos?: readonly string[];
  /**
   * `false`: o Riot ID pode ser velho (a inscrição não foi consultada nesta rodada) — serve
   * para ligar o jogador à conta, nunca para trocar o nick. Padrão: `true`.
   */
  renomeia?: boolean;
  /** `false`: não liga jogador de temporada arquivada pelo nome. Padrão: `true`. */
  ligaArquivo?: boolean;
  /** Quando o Riot ID foi lido (ISO): entre duas contas com o mesmo puuid, vale a mais nova. */
  lidaEm?: string | null;
}>;

export type MudancaDeNick = Readonly<{
  /** `null` = temporada atual; senão, o id da temporada arquivada. */
  temporada: string | null;
  jogadorId: string;
  de: string;
  para: string;
}>;

export type ResultadoDosNicks = {
  dataset: TournamentDataset;
  mudancas: MudancaDeNick[];
  /** Jogadores que ganharam o vínculo (puuid) nesta passada. */
  vinculados: number;
};

/** Um Riot ID completo, como o site precisa para montar o OP.GG: nome e tag. */
export function riotIdValido(riotId: string): boolean {
  const i = riotId.indexOf("#");
  return i > 0 && i < riotId.length - 1 && riotId.trim().length <= 64;
}

/** Entre duas leituras da mesma conta: a que pode renomear e, depois, a mais nova. */
function melhor(a: ContaConhecida, b: ContaConhecida): ContaConhecida {
  const ra = a.renomeia !== false;
  const rb = b.renomeia !== false;
  if (ra !== rb) return ra ? a : b;
  return (b.lidaEm ?? "") > (a.lidaEm ?? "") ? b : a;
}

export function indexarContas(contas: readonly ContaConhecida[]) {
  const porPuuid = new Map<string, ContaConhecida>();
  for (const conta of contas) {
    if (!riotIdValido(conta.riotId)) continue;
    const atual = porPuuid.get(conta.puuid);
    porPuuid.set(conta.puuid, atual ? melhor(atual, conta) : conta);
  }

  const porPuuidAntigo = new Map<string, ContaConhecida>();
  const porNome = new Map<string, Set<string>>();
  const porNomeNoArquivo = new Map<string, Set<string>>();
  const guardar = (mapa: Map<string, Set<string>>, chave: string, puuid: string) => {
    const puuids = mapa.get(chave) ?? new Set<string>();
    puuids.add(puuid);
    mapa.set(chave, puuids);
  };
  for (const conta of porPuuid.values()) {
    for (const antigo of conta.puuidsAntigos ?? []) if (!porPuuid.has(antigo)) porPuuidAntigo.set(antigo, conta);
    for (const nome of [conta.riotId, ...(conta.outrosNomes ?? [])]) {
      const chave = riotIdComparavel(nome);
      if (!chave) continue;
      guardar(porNome, chave, conta.puuid);
      if (conta.ligaArquivo !== false) guardar(porNomeNoArquivo, chave, conta.puuid);
    }
  }
  return { porPuuid, porPuuidAntigo, porNome, porNomeNoArquivo };
}

/**
 * A conta de um jogador: pelo puuid gravado (ou pelo antigo da mesma conta); sem puuid, por um
 * nome que seja de UMA conta só.
 */
export function contaDoJogador(
  jogador: Pick<Player, "nick" | "puuid">,
  indice: ReturnType<typeof indexarContas>,
  noArquivo = false,
): ContaConhecida | undefined {
  if (jogador.puuid) return indice.porPuuid.get(jogador.puuid) ?? indice.porPuuidAntigo.get(jogador.puuid);
  const puuids = (noArquivo ? indice.porNomeNoArquivo : indice.porNome).get(riotIdComparavel(jogador.nick));
  if (!puuids || puuids.size !== 1) return undefined;
  return indice.porPuuid.get([...puuids][0]!);
}

function atualizarElenco(
  players: readonly Player[],
  indice: ReturnType<typeof indexarContas>,
  temporada: string | null,
  resultado: { mudancas: MudancaDeNick[]; vinculados: number },
): Player[] {
  // Primeiro decide a conta de cada um; depois, se duas pessoas da MESMA temporada caíram na
  // mesma conta (nome repetido, cadastro duplicado), nenhuma das duas é mexida.
  const contas = players.map((p) => contaDoJogador(p, indice, temporada !== null));
  const quantos = new Map<string, number>();
  for (const conta of contas) if (conta) quantos.set(conta.puuid, (quantos.get(conta.puuid) ?? 0) + 1);

  return players.map((jogador, i) => {
    const conta = contas[i];
    if (!conta || quantos.get(conta.puuid)! > 1) return jogador;
    let novo = jogador;
    if (jogador.puuid !== conta.puuid) {
      novo = { ...novo, puuid: conta.puuid };
      resultado.vinculados += 1;
    }
    if (conta.renomeia !== false && jogador.nick !== conta.riotId) {
      novo = { ...novo, nick: conta.riotId };
      resultado.mudancas.push({ temporada, jogadorId: jogador.id, de: jogador.nick, para: conta.riotId });
    }
    return novo;
  });
}

export function atualizarNicksDoDataset(
  dataset: TournamentDataset,
  contas: readonly ContaConhecida[],
): ResultadoDosNicks {
  const indice = indexarContas(contas);
  const resultado = { mudancas: [] as MudancaDeNick[], vinculados: 0 };

  const players = atualizarElenco(dataset.players, indice, null, resultado);
  // `?? []`: dataset montado à mão (rota de teste, semente antiga) pode vir sem o campo.
  const archivedSeasons = (dataset.archivedSeasons ?? []).map((temporada) => {
    const elenco = atualizarElenco(temporada.snapshot.players, indice, temporada.seasonId, resultado);
    return elenco.every((p, i) => p === temporada.snapshot.players[i])
      ? temporada
      : { ...temporada, snapshot: { ...temporada.snapshot, players: elenco } };
  });

  if (resultado.mudancas.length === 0 && resultado.vinculados === 0) {
    return { dataset, ...resultado };
  }
  return {
    dataset: { ...dataset, players, ...(dataset.archivedSeasons ? { archivedSeasons } : {}) },
    ...resultado,
  };
}

/** O mesmo vínculo para um elenco solto (a virada do draft, antes de existir dataset). */
export function atualizarNicksDosJogadores(players: readonly Player[], contas: readonly ContaConhecida[]): Player[] {
  return atualizarElenco(players, indexarContas(contas), null, { mudancas: [], vinculados: 0 });
}
