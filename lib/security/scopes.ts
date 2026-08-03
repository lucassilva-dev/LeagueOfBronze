import type { AdminIdentity } from "@/lib/admin-auth";

/**
 * Catálogo de permissões do painel.
 *
 * Regras:
 * - O usuário MASTER tem tudo, sempre (não depende da lista de escopos).
 * - Escopos marcados como `masterOnly` só existem para o master; atribuí-los a
 *   outra pessoa não tem efeito.
 * - A verificação real acontece SEMPRE no servidor. Esconder abas no painel é
 *   apenas conforto visual.
 */

export const SCOPES = [
  { key: "series:cards", label: "Sortear cartinhas", group: "Ao vivo", masterOnly: false },
  { key: "series:sides", label: "Sortear lados (azul/vermelho)", group: "Ao vivo", masterOnly: false },
  { key: "results:write", label: "Lançar e editar resultados dos jogos", group: "Séries", masterOnly: false },
  { key: "series:manage", label: "Criar, editar e remover séries", group: "Séries", masterOnly: false },
  { key: "teams:write", label: "Criar e editar times", group: "Cadastro", masterOnly: false },
  { key: "players:write", label: "Criar e editar jogadores", group: "Cadastro", masterOnly: false },
  { key: "riot:import", label: "Importar partida pela Riot", group: "Séries", masterOnly: false },
  { key: "dataset:export", label: "Exportar backup", group: "Backup", masterOnly: false },
  { key: "tournament:lifecycle", label: "Iniciar e encerrar temporada", group: "Perigoso", masterOnly: true },
  { key: "dataset:import", label: "Importar/semear dataset", group: "Perigoso", masterOnly: true },
  { key: "users:manage", label: "Gerenciar usuários e permissões", group: "Perigoso", masterOnly: true },
] as const;

export type Scope = (typeof SCOPES)[number]["key"];

export const SCOPE_KEYS = SCOPES.map((s) => s.key) as readonly Scope[];

/** Escopos que podem ser atribuídos a um usuário comum. */
export const ASSIGNABLE_SCOPES = SCOPES.filter((s) => !s.masterOnly).map((s) => s.key) as readonly Scope[];

/** Escopos que só o master pode exercer — nunca valem para um não-master. */
const MASTER_ONLY_SCOPES = new Set<Scope>(
  SCOPES.filter((s) => s.masterOnly).map((s) => s.key),
);

export function isValidScope(value: string): value is Scope {
  return (SCOPE_KEYS as readonly string[]).includes(value);
}

/** Mantém só escopos válidos e atribuíveis, sem repetição. */
export function sanitizeScopes(values: unknown): Scope[] {
  if (!Array.isArray(values)) return [];
  const unicos = new Set<Scope>();
  for (const v of values) {
    if (typeof v === "string" && isValidScope(v) && (ASSIGNABLE_SCOPES as readonly string[]).includes(v)) {
      unicos.add(v);
    }
  }
  return [...unicos];
}

export function hasScope(identity: AdminIdentity | null, scope: Scope): boolean {
  if (!identity) return false;
  if (identity.isMaster) return true;
  // Defesa em profundidade: um escopo masterOnly nunca vale para não-master, mesmo que
  // tenha entrado na lista dele por seed, migração ou edição direta no banco.
  if (MASTER_ONLY_SCOPES.has(scope)) return false;
  return identity.scopes.includes(scope);
}

export function hasAllScopes(identity: AdminIdentity | null, scopes: Iterable<Scope>): boolean {
  for (const scope of scopes) {
    if (!hasScope(identity, scope)) return false;
  }
  return true;
}

/** Escopos exigidos que o usuário NÃO possui (para mensagem de erro e auditoria). */
export function missingScopes(identity: AdminIdentity | null, scopes: Iterable<Scope>): Scope[] {
  const faltando: Scope[] = [];
  for (const scope of scopes) {
    if (!hasScope(identity, scope)) faltando.push(scope);
  }
  return faltando;
}

export function scopeLabel(scope: string): string {
  return SCOPES.find((s) => s.key === scope)?.label ?? scope;
}
