import type { AdminIdentity } from "@/lib/admin-auth";
import { missingScopes, type Scope } from "@/lib/security/scopes";
import type { TournamentDataset } from "@/lib/schema";
import { applyAutoGameMvpsToDataset } from "@/lib/tournament";

/**
 * Permissão granular sobre um PUT que substitui o dataset INTEIRO.
 *
 * O painel envia todo o campeonato de uma vez (times, jogadores, séries, resultados),
 * então uma checagem ingênua só conseguiria "pode tudo ou não pode nada". Aqui
 * comparamos o dado atual com o enviado e derivamos QUAIS seções mudaram — cada uma
 * exige o seu escopo. Assim alguém com apenas `series:cards` consegue sortear carta,
 * mas recebe 403 ao tentar alterar um resultado.
 *
 * Vantagem de fazer por diferença: qualquer campo novo no schema passa por aqui e
 * precisa ser mapeado — o padrão é negar, não escapar da checagem.
 */

export type DatasetChange = {
  scope: Scope;
  path: string;
  kind: "add" | "remove" | "update";
};

/** Campos de uma série que têm dono próprio; o resto cai em `series:manage`. */
const SERIES_FIELD_SCOPE: Record<string, Scope> = {
  games: "results:write",
  walkoverWinnerTeamId: "results:write",
  walkoverReason: "results:write",
  cardsUsed: "series:cards",
  blueSideTeamId: "series:sides",
};
const SERIES_DEFAULT_SCOPE: Scope = "series:manage";

/** JSON com chaves ordenadas: comparação estável independente da ordem dos campos. */
function stable(value: unknown): string {
  return JSON.stringify(ordenar(value));
}

function ordenar(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(ordenar);
  if (value && typeof value === "object") {
    const entradas = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => a.localeCompare(b));
    return Object.fromEntries(entradas.map(([k, v]) => [k, ordenar(v)]));
  }
  return value;
}

/**
 * Põe os dois lados na MESMA forma antes de comparar.
 *
 * Sem isto haveria falso positivo: o servidor aplica MVP automático e reescreve
 * `lastUpdatedISO` ao salvar, então um usuário com apenas `series:cards` seria
 * acusado de ter mexido em resultados só porque o MVP foi recalculado.
 */
function canonical(dataset: TournamentDataset): TournamentDataset {
  const comMvps = applyAutoGameMvpsToDataset(dataset);
  return {
    ...comMvps,
    tournament: { ...comMvps.tournament, lastUpdatedISO: "" },
  };
}

type ComChave = Record<string, unknown> & { [k: string]: unknown };

function indexar<T extends ComChave>(itens: readonly T[], chave: string): Map<string, T> {
  const mapa = new Map<string, T>();
  for (const item of itens) {
    const id = String(item[chave] ?? "");
    if (id) mapa.set(id, item);
  }
  return mapa;
}

/** Um campo protegido só "conta" se estiver de fato preenchido. */
function campoPreenchido(valor: unknown): boolean {
  if (valor === undefined || valor === null || valor === "") return false;
  if (Array.isArray(valor)) return valor.length > 0;
  return true;
}

/**
 * Escopos exigidos para CRIAR ou REMOVER um item inteiro: o escopo-base do "invólucro"
 * MAIS o escopo de cada campo protegido que o item carrega preenchido.
 *
 * Sem isto havia escalação: criar uma série NOVA já com resultado/carta/lado forjados —
 * ou remover uma série que já tinha resultado — custava apenas `series:manage`, driblando
 * a permissão granular que a edição no lugar exige. Aqui add e remove viram simétricos ao
 * update: quem cria/apaga uma série COM resultado precisa também de `results:write`.
 * Para times/jogadores nada muda (todos os campos mapeiam para o mesmo escopo).
 */
function escoposDoItem<T extends ComChave>(
  item: T,
  escopoDoCampo: (campo: string) => Scope,
): Scope[] {
  const escopos = new Set<Scope>([escopoDoCampo("__base__")]);
  for (const [campo, valor] of Object.entries(item)) {
    if (campoPreenchido(valor)) escopos.add(escopoDoCampo(campo));
  }
  return [...escopos];
}

function diffLista<T extends ComChave>(
  antes: readonly T[],
  depois: readonly T[],
  chave: string,
  caminho: string,
  escopoDoCampo: (campo: string) => Scope,
): DatasetChange[] {
  const mudancas: DatasetChange[] = [];
  const mapaAntes = indexar(antes, chave);
  const mapaDepois = indexar(depois, chave);

  for (const [id, anterior] of mapaAntes) {
    if (!mapaDepois.has(id)) {
      for (const scope of escoposDoItem(anterior, escopoDoCampo)) {
        mudancas.push({ scope, path: `${caminho}[${id}]`, kind: "remove" });
      }
    }
  }
  for (const [id, item] of mapaDepois) {
    const anterior = mapaAntes.get(id);
    if (!anterior) {
      for (const scope of escoposDoItem(item, escopoDoCampo)) {
        mudancas.push({ scope, path: `${caminho}[${id}]`, kind: "add" });
      }
      continue;
    }
    const campos = new Set([...Object.keys(anterior), ...Object.keys(item)]);
    for (const campo of campos) {
      if (stable(anterior[campo]) !== stable(item[campo])) {
        mudancas.push({ scope: escopoDoCampo(campo), path: `${caminho}[${id}].${campo}`, kind: "update" });
      }
    }
  }
  return mudancas;
}

export function diffDatasetForScopes(
  antes: TournamentDataset,
  depois: TournamentDataset,
): DatasetChange[] {
  const a = canonical(antes);
  const b = canonical(depois);
  const mudancas: DatasetChange[] = [];

  if (stable(a.tournament) !== stable(b.tournament)) {
    mudancas.push({ scope: "tournament:lifecycle", path: "tournament", kind: "update" });
  }

  mudancas.push(
    ...diffLista(a.teams as ComChave[], b.teams as ComChave[], "id", "teams", () => "teams:write"),
  );
  mudancas.push(
    ...diffLista(a.players as ComChave[], b.players as ComChave[], "id", "players", () => "players:write"),
  );
  mudancas.push(
    ...diffLista(
      (a.standingsSeed ?? []) as ComChave[],
      (b.standingsSeed ?? []) as ComChave[],
      "teamId",
      "standingsSeed",
      () => "results:write",
    ),
  );
  mudancas.push(
    ...diffLista(
      a.seriesMatches as ComChave[],
      b.seriesMatches as ComChave[],
      "id",
      "seriesMatches",
      (campo) => SERIES_FIELD_SCOPE[campo] ?? SERIES_DEFAULT_SCOPE,
    ),
  );

  if (stable(a.archivedSeasons ?? []) !== stable(b.archivedSeasons ?? [])) {
    mudancas.push({ scope: "tournament:lifecycle", path: "archivedSeasons", kind: "update" });
  }

  return mudancas;
}

export type AuthorizeResult =
  | { ok: true; changes: DatasetChange[] }
  | { ok: false; changes: DatasetChange[]; missing: Scope[] };

export function authorizeDatasetChange(
  identity: AdminIdentity | null,
  antes: TournamentDataset,
  depois: TournamentDataset,
): AuthorizeResult {
  const changes = diffDatasetForScopes(antes, depois);
  const exigidos = new Set<Scope>(changes.map((c) => c.scope));
  const faltando = missingScopes(identity, exigidos);
  return faltando.length > 0 ? { ok: false, changes, missing: faltando } : { ok: true, changes };
}
