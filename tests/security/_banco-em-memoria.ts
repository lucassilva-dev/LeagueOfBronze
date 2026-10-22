/**
 * Supabase (PostgREST) falso, em memória, para os testes de autenticação.
 *
 * Roda o código REAL dos stores (`lib/jogadores/store.ts`, `lib/security/admin-store.ts`):
 * só o banco é simulado, então os testes cobrem as consultas de verdade — filtros, ordem
 * das chamadas, o que é gravado e quando.
 *
 * Cada operação espera `latenciaMs` antes de responder, como uma ida ao Postgres. É o que
 * deixa uma rajada de pedidos simultâneos se intercalar como em produção.
 *
 * Cobre só o que o código exercitado usa: select (com count/head), insert, update,
 * eq/is/notIn/gte/or/order/limit, select depois de insert/update, maybeSingle/single e o
 * `await` direto.
 */

type Linha = Record<string, unknown>;
type Filtro = (l: Linha) => boolean;
type Op = "select" | "insert" | "update";

export type BancoEmMemoria = {
  tabelas: Record<string, Linha[]>;
  latenciaMs: number;
  /**
   * Injeta erro: devolve a mensagem (ou mensagem e código do Postgres, como o 23505 de
   * e-mail repetido) para a operação falhar, ou null para seguir.
   */
  falha?: (tabela: string, op: Op, patch?: Linha) => string | { message: string; code: string } | null;
  /** Chamado antes de cada operação executar — para mexer no banco "no meio" de algo. */
  antes?: (tabela: string, op: Op, patch?: Linha) => void;
  cliente: () => { from: (t: string) => unknown };
};

let seq = 0;

export function criarBancoEmMemoria(latenciaMs = 5): BancoEmMemoria {
  const banco: BancoEmMemoria = {
    tabelas: {},
    latenciaMs,
    cliente: () => ({ from: (t: string) => construtor(banco, t) }),
  };
  return banco;
}

function carimbar(tabela: string, linha: Linha): Linha {
  const nova: Linha = { id: ++seq, ...linha };
  if (tabela.endsWith("login_attempts") && !nova.occurred_at) nova.occurred_at = new Date().toISOString();
  return nova;
}

function construtor(banco: BancoEmMemoria, tabela: string) {
  let op: Op = "select";
  let contar = false;
  let soCabeca = false;
  let devolverLinhas = false;
  let aInserir: Linha[] = [];
  let patch: Linha = {};
  const filtros: Filtro[] = [];
  let ordem: { coluna: string; crescente: boolean } | null = null;
  let limite: number | null = null;

  const lista = () => (banco.tabelas[tabela] ??= []);

  async function executar(modo: "lista" | "uma" | "talvez") {
    await new Promise((r) => setTimeout(r, banco.latenciaMs));
    banco.antes?.(tabela, op, op === "update" ? patch : undefined);
    const erro = banco.falha?.(tabela, op, op === "update" ? patch : undefined);
    if (erro) {
      const { message, code } = typeof erro === "string" ? { message: erro, code: "XX000" } : erro;
      return { data: null, count: null, error: { message, code } };
    }

    if (op === "insert") {
      const novas = aInserir.map((l) => carimbar(tabela, l));
      lista().push(...novas);
      if (!devolverLinhas) return { data: null, error: null };
      if (modo === "lista") return { data: novas.map((l) => ({ ...l })), error: null };
      return { data: novas[0] ? { ...novas[0] } : null, error: null };
    }

    let alvo = lista().filter((l) => filtros.every((f) => f(l)));
    if (op === "select" && ordem) {
      const { coluna, crescente } = ordem;
      alvo = [...alvo].sort((a, b) => {
        const va = String(a[coluna] ?? "");
        const vb = String(b[coluna] ?? "");
        return (va < vb ? -1 : va > vb ? 1 : 0) * (crescente ? 1 : -1);
      });
    }
    if (op === "select" && limite !== null) alvo = alvo.slice(0, limite);

    if (op === "update") {
      for (const l of alvo) Object.assign(l, patch);
      return { data: devolverLinhas ? alvo.map((l) => ({ ...l })) : null, error: null };
    }

    if (contar && soCabeca) return { data: null, count: alvo.length, error: null };
    if (modo === "lista") return { data: alvo.map((l) => ({ ...l })), count: contar ? alvo.length : null, error: null };
    const primeira = alvo[0] ? { ...alvo[0] } : null;
    if (modo === "uma" && !primeira) return { data: null, error: { message: "0 linhas", code: "PGRST116" } };
    return { data: primeira, error: null };
  }

  const q: Record<string, unknown> = {
    select(_cols?: string, opts?: { count?: string; head?: boolean }) {
      if (op === "select") {
        contar = Boolean(opts?.count);
        soCabeca = Boolean(opts?.head);
      } else {
        devolverLinhas = true;
      }
      return q;
    },
    insert(l: Linha | Linha[]) {
      op = "insert";
      aInserir = Array.isArray(l) ? l : [l];
      return q;
    },
    update(p: Linha) {
      op = "update";
      patch = p;
      return q;
    },
    eq(c: string, v: unknown) {
      filtros.push((l) => l[c] === v);
      return q;
    },
    is(c: string, v: unknown) {
      filtros.push((l) => (l[c] ?? null) === v);
      return q;
    },
    notIn(c: string, vs: unknown[]) {
      filtros.push((l) => !vs.includes(l[c]));
      return q;
    },
    gte(c: string, v: string) {
      filtros.push((l) => String(l[c] ?? "") >= v);
      return q;
    },
    /**
     * `.or("col.eq.valor,col.neq.valor")` do PostgREST — só o que os stores usam: termos
     * `eq`/`neq` separados por vírgula, sem aninhamento; `true`/`false`/`null` viram os
     * valores de verdade.
     */
    or(expr: string) {
      const termos = expr.split(",").map((t) => {
        const [col, operador, ...resto] = t.trim().split(".");
        const cru = resto.join(".");
        // Valor entre aspas (`valorDoFiltroOu`) é sempre texto: tira as aspas e o escape.
        const entreAspas = cru.length >= 2 && cru.startsWith('"') && cru.endsWith('"');
        const bruto = entreAspas ? cru.slice(1, -1).replace(/\\(.)/g, "$1") : cru;
        const valor = entreAspas
          ? bruto
          : bruto === "true"
            ? true
            : bruto === "false"
              ? false
              : bruto === "null"
                ? null
                : bruto;
        if (operador !== "eq" && operador !== "neq") throw new Error(`or(): operador não suportado: ${t}`);
        return (l: Linha) => ((l[col!] ?? null) === valor) === (operador === "eq");
      });
      filtros.push((l) => termos.some((f) => f(l)));
      return q;
    },
    order(coluna: string, opts?: { ascending?: boolean }) {
      ordem = { coluna, crescente: opts?.ascending !== false };
      return q;
    },
    limit(n: number) {
      limite = n;
      return q;
    },
    maybeSingle: () => executar("talvez"),
    single: () => executar("uma"),
    then(ok: (v: unknown) => unknown, erro?: (e: unknown) => unknown) {
      return executar("lista").then(ok, erro);
    },
  };
  return q;
}
