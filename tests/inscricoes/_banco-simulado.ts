/**
 * Banco simulado EM MEMÓRIA para os testes do store da 4ª Edição e do robô da Riot.
 *
 * O código real de `lib/inscricoes/store.ts` roda inteiro; só o cliente do Supabase é
 * trocado. E os filtros valem DE VERDADE: um `update` só muda as linhas que casam com todos
 * os `.eq`, `.is`, `.or(...)` — é isso que deixa um teste provar que uma gravação é
 * condicional (a trava otimista, o item que ainda é do robô), e não só que "o update foi
 * chamado".
 *
 * `latenciaMs` faz cada operação esperar antes de responder, como uma ida ao Postgres: com
 * ela, chamadas simultâneas se intercalam como em produção.
 */

type Linha = Record<string, unknown>;
type Filtro = (l: Linha) => boolean;

export type Operacao = { tabela: string; op: "select" | "insert" | "update"; filtros: string[]; valor?: unknown };

export type BancoSimulado = {
  tabelas: Record<string, Linha[]>;
  latenciaMs: number;
  /** Tudo o que foi pedido ao banco, na ordem. */
  operacoes: Operacao[];
  /**
   * Injeção de falha: devolve a mensagem de erro (código XX000), ou `{ message, code }` para
   * um erro com código do Postgres (23505 = índice único), ou null para seguir.
   */
  falha:
    | ((tabela: string, op: Operacao["op"], filtros: string[]) => string | { message: string; code: string } | null)
    | null;
  cliente: () => { from: (tabela: string) => unknown };
};

let sequencia = 0;

export function criarBancoSimulado(latenciaMs = 0): BancoSimulado {
  const banco: BancoSimulado = {
    tabelas: {},
    latenciaMs,
    operacoes: [],
    falha: null,
    cliente: () => ({ from: (tabela: string) => construtor(banco, tabela) }),
  };
  return banco;
}

/** Linhas de auditoria gravadas (o `insert` em inscricao_auditoria). */
export function auditorias(banco: BancoSimulado): Linha[] {
  return banco.tabelas.inscricao_auditoria ?? [];
}

// ---------------------------------------------------------------- filtro `or` do PostgREST

/** Divide no separador de nível zero (fora de parênteses e aspas). */
function partesDoNivel(expr: string): string[] {
  const partes: string[] = [];
  let atual = "";
  let profundidade = 0;
  let aspas = false;
  for (const ch of expr) {
    if (ch === '"') aspas = !aspas;
    if (!aspas && ch === "(") profundidade += 1;
    if (!aspas && ch === ")") profundidade -= 1;
    if (!aspas && profundidade === 0 && ch === ",") {
      partes.push(atual);
      atual = "";
      continue;
    }
    atual += ch;
  }
  partes.push(atual);
  return partes;
}

function semAspas(v: string): string {
  return v.startsWith('"') && v.endsWith('"') ? v.slice(1, -1) : v;
}

function condicao(expr: string): Filtro {
  const e = expr.trim();
  if (e.startsWith("and(") && e.endsWith(")")) {
    const filhos = partesDoNivel(e.slice(4, -1)).map(condicao);
    return (l) => filhos.every((f) => f(l));
  }
  if (e.startsWith("or(") && e.endsWith(")")) {
    const filhos = partesDoNivel(e.slice(3, -1)).map(condicao);
    return (l) => filhos.some((f) => f(l));
  }
  const [coluna, operador, ...resto] = e.split(".");
  const valor = semAspas(resto.join("."));
  switch (operador) {
    case "eq":
      return (l) => l[coluna!] !== null && l[coluna!] !== undefined && String(l[coluna!]) === valor;
    case "is":
      if (valor !== "null") throw new Error(`is.${valor} não suportado`);
      return (l) => (l[coluna!] ?? null) === null;
    case "lt":
      return (l) => l[coluna!] !== null && l[coluna!] !== undefined && String(l[coluna!]) < valor;
    default:
      throw new Error(`Operador não suportado no or(): ${e}`);
  }
}

// ---------------------------------------------------------------- construtor de consulta

function construtor(banco: BancoSimulado, tabela: string) {
  let op: Operacao["op"] = "select";
  let contar = false;
  let soCabeca = false;
  let devolverLinhas = false;
  let aInserir: Linha[] = [];
  let patch: Linha = {};
  const filtros: Filtro[] = [];
  const descricao: string[] = [];

  const lista = () => (banco.tabelas[tabela] ??= []);

  async function executar(modo: "lista" | "uma" | "talvez") {
    const registro: Operacao = { tabela, op, filtros: descricao, valor: op === "insert" ? aInserir : op === "update" ? patch : undefined };
    banco.operacoes.push(registro);
    if (banco.latenciaMs > 0) await new Promise((r) => setTimeout(r, banco.latenciaMs));
    else await Promise.resolve();

    const erro = banco.falha?.(tabela, op, descricao);
    if (erro) {
      return { data: null, count: null, error: typeof erro === "string" ? { message: erro, code: "XX000" } : erro };
    }

    if (op === "insert") {
      const novas = aInserir.map((l) => ({
        id: `id-${++sequencia}`,
        ...(tabela === "inscricao_consultas_riot" && { ocorrido_em: new Date().toISOString() }),
        ...(tabela === "inscricao_auditoria" && { ocorrido_em: new Date().toISOString() }),
        ...(tabela === "inscricoes" && { criado_em: new Date().toISOString() }),
        ...l,
      }));
      lista().push(...novas);
      if (!devolverLinhas) return { data: null, error: null };
      return { data: modo === "lista" ? novas.map((n) => ({ ...n })) : { ...novas[0] }, error: null };
    }

    const alvo = lista().filter((l) => filtros.every((f) => f(l)));

    if (op === "update") {
      for (const l of alvo) {
        for (const [k, v] of Object.entries(patch)) if (v !== undefined) l[k] = v;
      }
      if (!devolverLinhas) return { data: null, error: null };
      if (modo === "lista") return { data: alvo.map((l) => ({ ...l })), error: null };
      if (modo === "uma" && !alvo[0]) return { data: null, error: { message: "0 linhas", code: "PGRST116" } };
      return { data: alvo[0] ? { ...alvo[0] } : null, error: null };
    }

    if (contar && soCabeca) return { data: null, count: alvo.length, error: null };
    if (modo === "lista") return { data: alvo.map((l) => ({ ...l })), error: null };
    const primeira = alvo[0] ? { ...alvo[0] } : null;
    if (modo === "uma" && !primeira) return { data: null, error: { message: "0 linhas", code: "PGRST116" } };
    return { data: primeira, error: null };
  }

  const filtrar = (texto: string, f: Filtro) => {
    descricao.push(texto);
    filtros.push(f);
    return q;
  };

  const q: Record<string, unknown> = {
    select(_colunas?: string, opcoes?: { count?: string; head?: boolean }) {
      if (op === "select") {
        contar = Boolean(opcoes?.count);
        soCabeca = Boolean(opcoes?.head);
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
    eq: (c: string, v: unknown) => filtrar(`${c}=eq.${String(v)}`, (l) => l[c] === v),
    neq: (c: string, v: unknown) => filtrar(`${c}=neq.${String(v)}`, (l) => l[c] !== v),
    is: (c: string, v: unknown) => filtrar(`${c}=is.${String(v)}`, (l) => (l[c] ?? null) === v),
    not: (c: string, operador: string, v: unknown) => {
      if (operador !== "is" || v !== null) throw new Error(`not(${operador}) não suportado`);
      return filtrar(`${c}=not.is.null`, (l) => (l[c] ?? null) !== null);
    },
    in: (c: string, vs: unknown[]) => filtrar(`${c}=in.(${vs.join(",")})`, (l) => vs.includes(l[c])),
    notIn: (c: string, vs: unknown[]) => filtrar(`${c}=not.in.(${vs.join(",")})`, (l) => !vs.includes(l[c])),
    gte: (c: string, v: string) => filtrar(`${c}=gte.${v}`, (l) => String(l[c] ?? "") >= v),
    gt: (c: string, v: string) => filtrar(`${c}=gt.${v}`, (l) => String(l[c] ?? "") > v),
    or: (expr: string) => filtrar(`or=(${expr})`, condicao(`or(${expr})`)),
    order: () => q,
    limit: () => q,
    returns: () => q,
    maybeSingle: () => executar("talvez"),
    single: () => executar("uma"),
    then: (ok: (v: unknown) => unknown, falhou?: (e: unknown) => unknown) => executar("lista").then(ok, falhou),
  };
  return q;
}
