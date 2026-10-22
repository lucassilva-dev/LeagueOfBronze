import type { TournamentDataset } from "@/lib/schema";
import { diffDatasetForScopes, type DatasetChange } from "@/lib/security/dataset-diff";
import { applyAutoGameMvpsToDataset } from "@/lib/tournament";

/**
 * O "rebase" do rascunho do painel quando o Salvar cai em 409.
 *
 * O dia de jogo tem duas pessoas gravando ao mesmo tempo: uma lança o K/D/A da série que
 * acabou, outra sorteia lado e carta da próxima (pela página da partida ou por outro
 * painel). O sorteio grava sozinho, a versão do campeonato avança, e o Salvar de quem
 * digitou o K/D/A recebe 409. Antes sobravam duas saídas ruins: "trazer a versão nova"
 * jogava fora as linhas digitadas, e "salvar por cima" mandava o rascunho inteiro de volta
 * — desfazendo o que a outra pessoa gravou em campos que quem salvou nunca tocou.
 *
 * Aqui o painel faz o que um humano faria: olha O QUE o rascunho mudou desde que foi
 * carregado (a mesma diferença, item por item e campo por campo, que o servidor usa para
 * autorizar o PUT) e reaplica SÓ isso por cima da versão nova. Se a outra pessoa mexeu num
 * campo diferente — o caso do sorteio —, os dois trabalhos se somam sem pergunta nenhuma.
 * Só quando os dois mexeram no MESMO campo, com valores diferentes, a decisão volta para
 * quem está salvando.
 */

type NomeDaLista = "teams" | "players" | "seriesMatches" | "standingsSeed";

const CHAVE_DA_LISTA: Record<NomeDaLista, string> = {
  teams: "id",
  players: "id",
  seriesMatches: "id",
  standingsSeed: "teamId",
};

type Caminho =
  | { tipo: "tournament" }
  | { tipo: "archivedSeasons" }
  | { tipo: "item"; lista: NomeDaLista; id: string }
  | { tipo: "campo"; lista: NomeDaLista; id: string; campo: string };

type Item = Record<string, unknown>;

/** `seriesMatches[4a-jogo-04].games` -> partes. O id pode ter qualquer caractere, o campo não. */
const CAMINHO_DE_LISTA = /^(teams|players|seriesMatches|standingsSeed)\[(.*)\](?:\.([A-Za-z0-9_]+))?$/;

function lerCaminho(path: string): Caminho | null {
  if (path === "tournament") return { tipo: "tournament" };
  if (path === "archivedSeasons") return { tipo: "archivedSeasons" };
  const partes = CAMINHO_DE_LISTA.exec(path);
  if (!partes) return null;
  const lista = partes[1] as NomeDaLista;
  const id = partes[2] ?? "";
  return partes[3] ? { tipo: "campo", lista, id, campo: partes[3] } : { tipo: "item", lista, id };
}

/**
 * Campos que NUNCA vêm do rascunho, nem num rebase: o histórico de sorteios e os retratos
 * das temporadas são do servidor (o PUT os reancora de qualquer jeito). Reaplicar o
 * histórico do rascunho por cima do servidor esconderia do PUT os sorteios novos — e a
 * contagem desse histórico é justamente o sinal de "eu vi esse sorteio".
 */
function ehDoServidor(caminho: Caminho) {
  return caminho.tipo === "archivedSeasons" || (caminho.tipo === "campo" && caminho.campo === "sorteios");
}

/** Mesma forma que o diff de autorização compara: MVP automático aplicado e sem carimbo de hora. */
function canonico(dataset: TournamentDataset): TournamentDataset {
  const comMvps = applyAutoGameMvpsToDataset(dataset);
  return { ...comMvps, tournament: { ...comMvps.tournament, lastUpdatedISO: "" } };
}

function ordenar(valor: unknown): unknown {
  if (Array.isArray(valor)) return valor.map(ordenar);
  if (valor && typeof valor === "object") {
    return Object.fromEntries(
      Object.entries(valor as Record<string, unknown>)
        .filter(([, v]) => v !== undefined)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => [k, ordenar(v)]),
    );
  }
  return valor;
}

/** JSON com chaves ordenadas: igualdade estável, como a do diff. */
function estavel(valor: unknown) {
  return JSON.stringify(ordenar(valor)) ?? "undefined";
}

/** Só leitura: `standingsSeed` é opcional, e lista ausente vale como vazia. */
function itensDa(dataset: TournamentDataset, lista: NomeDaLista): readonly Item[] {
  return (dataset[lista] ?? []) as unknown as Item[];
}

/** Para ESCREVER no destino do rebase (uma cópia): cria a lista opcional se faltar. */
function listaParaEscrever(destino: TournamentDataset, lista: NomeDaLista): Item[] {
  if (!destino[lista]) (destino as Record<NomeDaLista, unknown>)[lista] = [];
  return destino[lista] as unknown as Item[];
}

function acharItem(dataset: TournamentDataset, lista: NomeDaLista, id: string): Item | undefined {
  const chave = CHAVE_DA_LISTA[lista];
  return itensDa(dataset, lista).find((item) => String(item[chave] ?? "") === id);
}

function valorNoCaminho(dataset: TournamentDataset, caminho: Caminho): unknown {
  switch (caminho.tipo) {
    case "tournament":
      return dataset.tournament;
    case "archivedSeasons":
      return dataset.archivedSeasons ?? [];
    case "item":
      return acharItem(dataset, caminho.lista, caminho.id);
    case "campo":
      return acharItem(dataset, caminho.lista, caminho.id)?.[caminho.campo];
  }
}

/** Dois caminhos mexem na mesma coisa: iguais, ou um é o item inteiro e o outro um campo dele. */
function sobrepoem(a: Caminho, b: Caminho) {
  if (a.tipo === "tournament" || b.tipo === "tournament") return a.tipo === b.tipo;
  if (a.tipo === "archivedSeasons" || b.tipo === "archivedSeasons") return a.tipo === b.tipo;
  if (a.lista !== b.lista || a.id !== b.id) return false;
  if (a.tipo === "item" || b.tipo === "item") return true;
  return a.campo === b.campo;
}

function caminhosUnicos(mudancas: readonly DatasetChange[]): string[] {
  return [...new Set(mudancas.map((mudanca) => mudanca.path))];
}

function diferenca(antes: TournamentDataset, depois: TournamentDataset): DatasetChange[] {
  try {
    return diffDatasetForScopes(antes, depois);
  } catch {
    // Rascunho pela metade (série sem time, por exemplo) — o mesmo cuidado da barra do painel.
    return [];
  }
}

/** Escreve no `destino` o valor que o caminho tem na `origem` (ou apaga, se lá não existe). */
function aplicarCaminho(destino: TournamentDataset, origem: TournamentDataset, caminho: Caminho) {
  if (caminho.tipo === "tournament") {
    // O carimbo de hora é reescrito pelo servidor a cada gravação: fica o da versão nova.
    destino.tournament = {
      ...structuredClone(origem.tournament),
      lastUpdatedISO: destino.tournament.lastUpdatedISO,
    };
    return;
  }
  if (caminho.tipo === "archivedSeasons") return;

  const chave = CHAVE_DA_LISTA[caminho.lista];
  const lista = listaParaEscrever(destino, caminho.lista);
  const indice = lista.findIndex((item) => String(item[chave] ?? "") === caminho.id);
  const daOrigem = acharItem(origem, caminho.lista, caminho.id);

  if (caminho.tipo === "item" || indice < 0) {
    if (!daOrigem) {
      if (indice >= 0) lista.splice(indice, 1);
      return;
    }
    const copia = structuredClone(daOrigem);
    // O histórico de sorteios de uma série que o servidor já tem continua sendo o dele.
    if (caminho.lista === "seriesMatches" && indice >= 0) {
      const historico = lista[indice]?.sorteios;
      if (historico === undefined) delete copia.sorteios;
      else copia.sorteios = historico;
    }
    if (indice >= 0) lista[indice] = copia;
    else lista.push(copia);
    return;
  }

  const alvo = lista[indice]!;
  const valor = daOrigem?.[caminho.campo];
  if (valor === undefined) delete alvo[caminho.campo];
  else alvo[caminho.campo] = structuredClone(valor);
}

export type ResultadoDoRebase = Readonly<{
  /** Tudo o que o rascunho mudou já está no servidor, com o mesmo valor: não há o que enviar. */
  jaSalvo: boolean;
  /** Caminhos que o rascunho E o servidor mudaram, para valores diferentes. */
  conflitos: string[];
  /**
   * A versão do servidor com as mudanças do rascunho por cima. Nos caminhos em conflito
   * vale o do rascunho — é o que "salvar por cima" grava, e SÓ nesses campos.
   */
  dataset: TournamentDataset;
}>;

/**
 * Reaplica sobre `servidor` o que `rascunho` mudou em relação a `base`.
 *
 * `base` é a versão de onde o rascunho partiu (a baseline do painel). A diferença é sempre
 * calculada a partir dela, e não da última tentativa: assim um segundo 409 no meio do
 * caminho refaz a conta inteira sobre a versão mais nova.
 */
export function rebasearRascunho(
  base: TournamentDataset,
  rascunho: TournamentDataset,
  servidor: TournamentDataset,
): ResultadoDoRebase {
  const baseCanonica = canonico(base);
  const rascunhoCanonico = canonico(rascunho);
  const servidorCanonico = canonico(servidor);

  const minhas = caminhosUnicos(diferenca(baseCanonica, rascunhoCanonico))
    .map((path) => ({ path, caminho: lerCaminho(path) }))
    .filter((item): item is { path: string; caminho: Caminho } => item.caminho !== null)
    .filter(({ caminho }) => !ehDoServidor(caminho));
  const delas = caminhosUnicos(diferenca(baseCanonica, servidorCanonico))
    .map(lerCaminho)
    .filter((caminho): caminho is Caminho => caminho !== null);

  const conflitos: string[] = [];
  let jaSalvo = true;
  const dataset = structuredClone(servidor);

  for (const { path, caminho } of minhas) {
    const igualAoServidor =
      estavel(valorNoCaminho(rascunhoCanonico, caminho)) === estavel(valorNoCaminho(servidorCanonico, caminho));
    if (igualAoServidor) continue;
    jaSalvo = false;
    if (delas.some((outro) => sobrepoem(caminho, outro))) conflitos.push(path);
    aplicarCaminho(dataset, rascunho, caminho);
  }

  return { jaSalvo, conflitos, dataset };
}

// ---------------------------------------------------------------- textos do aviso

function plural(quantidade: number, singular: string, pluralDaPalavra: string) {
  return `${quantidade} ${quantidade === 1 ? singular : pluralDaPalavra}`;
}

/** Campos que um sorteio (de lado ou de carta) mexe numa série. */
const CAMPOS_DO_SORTEIO = new Set(["sorteios", "cardsUsed", "blueSideTeamId"]);

/**
 * O que a OUTRA pessoa mudou, em poucas palavras: "+6 times, +30 jogadores, +15 séries".
 *
 * Substitui a frase fixa "pode ter sido um sorteio de carta ou de lado": depois da virada do
 * draft, aquela frase convidava a salvar por cima de 6 times, 30 jogadores e 15 séries.
 */
export function resumirMudancasDoServidor(base: TournamentDataset, servidor: TournamentDataset): string[] {
  const caminhos = caminhosUnicos(diferenca(base, servidor))
    .map(lerCaminho)
    .filter((caminho): caminho is Caminho => caminho !== null);

  const novos = new Map<NomeDaLista, Set<string>>();
  const removidos = new Map<NomeDaLista, Set<string>>();
  const camposPorItem = new Map<string, { lista: NomeDaLista; campos: Set<string> }>();
  let temporada = false;
  let arquivo = false;

  for (const caminho of caminhos) {
    if (caminho.tipo === "tournament") temporada = true;
    else if (caminho.tipo === "archivedSeasons") arquivo = true;
    else if (caminho.tipo === "item") {
      const existia = acharItem(base, caminho.lista, caminho.id) !== undefined;
      const mapa = existia ? removidos : novos;
      const ids = mapa.get(caminho.lista) ?? new Set<string>();
      ids.add(caminho.id);
      mapa.set(caminho.lista, ids);
    } else {
      const chave = `${caminho.lista}|${caminho.id}`;
      const atual = camposPorItem.get(chave) ?? { lista: caminho.lista, campos: new Set<string>() };
      atual.campos.add(caminho.campo);
      camposPorItem.set(chave, atual);
    }
  }

  const alterados = new Map<NomeDaLista, number>();
  let comSorteio = 0;
  for (const { lista, campos } of camposPorItem.values()) {
    if (lista === "seriesMatches" && [...campos].every((campo) => CAMPOS_DO_SORTEIO.has(campo))) {
      comSorteio += 1;
      continue;
    }
    alterados.set(lista, (alterados.get(lista) ?? 0) + 1);
  }

  // [singular, plural, "alterado" concordando]
  const nomes: Record<NomeDaLista, [string, string, string, string]> = {
    teams: ["time", "times", "alterado", "alterados"],
    players: ["jogador", "jogadores", "alterado", "alterados"],
    seriesMatches: ["série", "séries", "alterada", "alteradas"],
    standingsSeed: ["linha da classificação inicial", "linhas da classificação inicial", "alterada", "alteradas"],
  };
  const resumo: string[] = [];
  for (const lista of ["teams", "players", "seriesMatches", "standingsSeed"] as const) {
    const [um, varios, alteradoUm, alteradoVarios] = nomes[lista];
    const quantosNovos = novos.get(lista)?.size ?? 0;
    const quantosRemovidos = removidos.get(lista)?.size ?? 0;
    const quantosAlterados = alterados.get(lista) ?? 0;
    if (quantosNovos > 0) resumo.push(`+${plural(quantosNovos, um, varios)}`);
    if (quantosRemovidos > 0) resumo.push(`−${plural(quantosRemovidos, um, varios)}`);
    if (quantosAlterados > 0) {
      resumo.push(`${plural(quantosAlterados, um, varios)} ${quantosAlterados === 1 ? alteradoUm : alteradoVarios}`);
    }
  }
  if (comSorteio > 0) resumo.push(`sorteio de lado ou carta em ${plural(comSorteio, "série", "séries")}`);
  if (temporada) resumo.push("dados da temporada alterados");
  if (arquivo) resumo.push("arquivo de temporadas alterado");
  return resumo;
}

/**
 * O servidor criou ou apagou times, jogadores ou séries, mudou o estado da temporada ou o
 * arquivo — a virada do draft, um encerramento. "Salvar por cima" num conflito desses
 * desfaria uma mudança de estrutura inteira, então o painel não oferece.
 */
export function mudancaEstrutural(base: TournamentDataset, servidor: TournamentDataset): boolean {
  if (base.tournament.status !== servidor.tournament.status) return true;
  return diferenca(base, servidor).some(
    (mudanca) => mudanca.kind !== "update" || mudanca.path === "archivedSeasons",
  );
}

const ROTULO_DO_CAMPO: Record<string, string> = {
  games: "jogos",
  cardsUsed: "cartinhas",
  blueSideTeamId: "lado azul",
  date: "data e horário",
  walkoverWinnerTeamId: "W.O.",
  walkoverReason: "observação do W.O.",
  stage: "etapa",
  format: "formato",
  teamAId: "Time A",
  teamBId: "Time B",
  name: "nome",
  slug: "endereço",
  nick: "nick",
  teamId: "time",
  role1: "rota principal",
  role2: "rota secundária",
  elo: "elo",
};

/** "seriesMatches[s1].games" -> "Alfa x Beta › jogos", com os nomes do dataset dado. */
export function descreverCaminho(path: string, dataset: TournamentDataset): string {
  const caminho = lerCaminho(path);
  if (!caminho) return path;
  if (caminho.tipo === "tournament") return "dados da temporada";
  if (caminho.tipo === "archivedSeasons") return "arquivo de temporadas";

  const nomeDoTime = (id: unknown) =>
    dataset.teams.find((time) => time.id === id)?.name ?? (typeof id === "string" && id ? id : "?");
  const item = acharItem(dataset, caminho.lista, caminho.id);
  let nome: string;
  if (caminho.lista === "seriesMatches") {
    nome = item ? `${nomeDoTime(item.teamAId)} x ${nomeDoTime(item.teamBId)}` : `série ${caminho.id}`;
  } else if (caminho.lista === "teams") {
    nome = `time ${typeof item?.name === "string" && item.name ? item.name : caminho.id}`;
  } else if (caminho.lista === "players") {
    nome = `jogador ${typeof item?.nick === "string" && item.nick ? item.nick : caminho.id}`;
  } else {
    nome = `classificação inicial de ${nomeDoTime(caminho.id)}`;
  }

  if (caminho.tipo === "item") return item ? `${nome} (criado ou apagado)` : `${nome} (apagado)`;
  return `${nome} › ${ROTULO_DO_CAMPO[caminho.campo] ?? caminho.campo}`;
}
