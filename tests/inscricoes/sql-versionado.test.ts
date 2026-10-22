import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * O SQL do repositório recria o banco que o código usa (INF-02).
 *
 * As tabelas de login da organização (admin_users, admin_sessions, admin_login_attempts)
 * foram criadas direto em produção e nunca entraram no repositório; e o
 * schema-4a-edicao.sql — uma transação só — abortava inteiro num banco novo no
 * `alter table public.admin_users`. Recriar o banco a partir daqui deixava a organização
 * sem login e sem nenhuma tabela da 4ª.
 */

const RAIZ = path.resolve(__dirname, "../..");

function arquivos(dir: string, ext: RegExp): string[] {
  return readdirSync(dir).flatMap((nome) => {
    if (nome === "node_modules" || nome.startsWith(".")) return [];
    const p = path.join(dir, nome);
    return statSync(p).isDirectory() ? arquivos(p, ext) : ext.test(nome) ? [p] : [];
  });
}

/** Arquivo ausente vira texto vazio: o teste falha dizendo o que falta, em vez de quebrar a carga. */
const ler = (relativo: string) => {
  const caminho = path.join(RAIZ, relativo);
  return existsSync(caminho) ? readFileSync(caminho, "utf8") : "";
};
const todoSql = arquivos(path.join(RAIZ, "supabase"), /\.sql$/)
  .map((p) => readFileSync(p, "utf8"))
  .join("\n");

/** As colunas de um `create table ... ( ... );`, pelo nome da tabela. */
function colunas(sql: string, tabela: string): string[] {
  const inicio = sql.search(new RegExp(`create\\s+table\\s+if\\s+not\\s+exists\\s+public\\.${tabela}\\s*\\(`, "i"));
  if (inicio < 0) return [];
  const corpo = sql.slice(sql.indexOf("(", inicio) + 1, sql.indexOf("\n);", inicio));
  return corpo
    .split("\n")
    .map((linha) => linha.trim())
    .filter((linha) => linha && !linha.startsWith("--") && !/^constraint\b/i.test(linha))
    .map((linha) => linha.split(/\s+/)[0]!.toLowerCase());
}

describe("toda tabela usada pelo código é criada por algum .sql versionado", () => {
  it("nenhuma tabela usada em app/ e lib/ fica de fora", () => {
    const criadas = new Set(
      [...todoSql.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.|%1\$I\.)?([a-z_]+)/gi)].map((m) =>
        m[1]!.toLowerCase(),
      ),
    );
    const codigo = ["app", "lib"]
      .flatMap((d) => arquivos(path.join(RAIZ, d), /\.(ts|tsx)$/))
      .map((p) => readFileSync(p, "utf8"))
      .join("\n");
    const usadas = new Set([...codigo.matchAll(/\.from\(\s*["'`]([a-z_]+)["'`]\s*\)/g)].map((m) => m[1]!));

    expect([...usadas].filter((t) => !criadas.has(t)).sort()).toEqual([]);
  });
});

describe("schema-admin.sql tem as colunas que o login da organização usa", () => {
  const sql = ler("supabase/schema-admin.sql");

  it.each([
    // lib/security/admin-store.ts, app/api/admin/users/**, app/api/admin/senha, scripts/criar-admin.mjs
    [
      "admin_users",
      [
        "id",
        "username",
        "display_name",
        "password_hash",
        "must_change_password",
        "is_master",
        "scopes",
        "disabled_at",
        "session_epoch",
        "password_updated_at",
        "created_at",
      ],
    ],
    ["admin_sessions", ["id", "user_id", "expires_at", "revoked_at", "revoked_reason", "ip_hash", "ua_hash"]],
    ["admin_login_attempts", ["id", "occurred_at", "username", "ip_hash", "success", "reason"]],
  ])("%s", (tabela, esperadas) => {
    expect(colunas(sql, tabela)).toEqual(expect.arrayContaining(esperadas));
  });

  it("usuário único e sempre em minúsculas (o login compara com igualdade)", () => {
    expect(sql).toMatch(/username\s+text not null unique/);
    expect(sql).toMatch(/admin_users_username_minusculo check \(username = lower\(username\)\)/);
  });

  it("apagar a conta apaga as sessões (a rota de remover usuário faz um delete simples)", () => {
    expect(sql).toMatch(/user_id\s+uuid not null references public\.admin_users\(id\) on delete cascade/);
  });

  it("RLS ligado e forçado, e nada para anon/authenticated, nas três", () => {
    for (const tabela of ["admin_users", "admin_sessions", "admin_login_attempts"]) {
      expect(sql).toMatch(new RegExp(`alter table public\\.${tabela}\\s+enable row level security`));
      expect(sql).toMatch(new RegExp(`alter table public\\.${tabela}\\s+force\\s+row level security`));
      expect(sql).toMatch(new RegExp(`revoke all on public\\.${tabela}\\s+from anon, authenticated`));
    }
  });

  it("não apaga nem recria nada num banco que já tem as tabelas (produção)", () => {
    expect(sql).not.toMatch(/\bdrop\s+table\b/i);
    expect([...sql.matchAll(/create\s+table\s+(?!if\s+not\s+exists)/gi)]).toEqual([]);
    expect([...sql.matchAll(/create\s+(unique\s+)?index\s+(?!if\s+not\s+exists)/gi)]).toEqual([]);
  });
});

describe("schema-4a-edicao.sql não aborta num banco novo", () => {
  const sql = ler("supabase/schema-4a-edicao.sql");

  it("todo `alter table public.admin_users` está dentro da guarda de existência", () => {
    const linhas = sql.split("\n");
    const alteracoes = linhas.map((l, i) => [l, i] as const).filter(([l]) => /alter table public\.admin_users\b/.test(l));
    expect(alteracoes.length).toBeGreaterThan(0);
    for (const [, i] of alteracoes) {
      const antes = linhas.slice(0, i).join("\n");
      const guarda = antes.lastIndexOf("if to_regclass('public.admin_users') is not null then");
      expect(guarda).toBeGreaterThan(-1);
      // Nenhum `end if` entre a guarda e a alteração.
      expect(antes.slice(guarda)).not.toMatch(/end if/);
    }
  });

  it("a ordem de execução está documentada nos três arquivos", () => {
    expect(sql).toMatch(/DEPOIS de schema\.sql e de schema-admin\.sql/);
    expect(ler("supabase/schema-admin.sql")).toMatch(/schema\.sql[\s\S]*schema-admin\.sql[\s\S]*schema-4a-edicao\.sql/);
    expect(ler("supabase/schema.sql")).toMatch(/schema-admin\.sql/);
  });
});
