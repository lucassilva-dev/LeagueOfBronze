import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * `congelarElos` agora congela também a DIVISÃO e o PDL do dia.
 *
 * O preço do draft passou a ser por divisão (lib/draft/precos.ts), e o robô da Riot segue
 * atualizando `riot_divisao`/`riot_pdl` depois do congelamento. Congelando só o tier, a
 * tabela divulgada mudava sozinha na manhã seguinte. A leitura só é congelada quando é do
 * MESMO tier do elo congelado: elo travado à mão em outro tier fica no meio do elo dele.
 *
 * Banco simulado que registra cada filtro (o mesmo de store-robo.test.ts).
 */

type Op = [string, unknown[]];
type Chamada = { tabela: string; ops: Op[] };

const banco = vi.hoisted(() => ({
  chamadas: [] as { tabela: string; ops: [string, unknown[]][] }[],
  responder: (() => ({ data: null })) as (c: { tabela: string; ops: [string, unknown[]][] }) => { data?: unknown; error?: unknown },
}));

vi.mock("@/lib/data-store", () => ({
  isSupabaseConfigured: () => true,
  createSupabaseAdminClient: () => ({
    from: (tabela: string) => {
      const registro = { tabela, ops: [] as [string, unknown[]][] };
      banco.chamadas.push(registro);
      const construtor: Record<string, unknown> = new Proxy(
        {},
        {
          get(_alvo, prop: string) {
            if (prop === "then") {
              return (resolver: (v: unknown) => void) => resolver({ error: null, ...banco.responder(registro) });
            }
            return (...args: unknown[]) => {
              registro.ops.push([prop, args]);
              return construtor;
            };
          },
        },
      );
      return construtor;
    },
  }),
}));

const store = await import("@/lib/inscricoes/store");

const op = (c: Chamada, nome: string) => c.ops.filter(([n]) => n === nome).map(([, a]) => a);
const updates = () => banco.chamadas.filter((c) => c.tabela === "inscricoes" && op(c, "update").length > 0);
/** O que foi gravado em cada inscrição, por id. */
const gravado = () =>
  Object.fromEntries(
    updates().map((c) => [
      (op(c, "eq").find((a) => a[0] === "id") ?? [])[1] as string,
      op(c, "update")[0]![0] as Record<string, unknown>,
    ]),
  );

function aprovados(linhas: Record<string, unknown>[]) {
  banco.responder = (c) => {
    if (op(c, "select").length > 0 && op(c, "update").length === 0 && c.tabela === "inscricoes") return { data: linhas };
    if (op(c, "update").length > 0) return { data: [{ id: (op(c, "eq").find((a) => a[0] === "id") ?? [])[1] }] };
    return { data: null };
  };
}

beforeEach(() => {
  banco.chamadas.length = 0;
  banco.responder = () => ({ data: null });
});

describe("congelarElos com a divisão", () => {
  it("lê a leitura da Riot junto com o elo", async () => {
    aprovados([]);
    await store.congelarElos("lucas");
    const leitura = banco.chamadas.find((c) => c.tabela === "inscricoes" && op(c, "select").length > 0)!;
    const colunas = String(op(leitura, "select")[0]![0]).split(",");
    expect(colunas).toEqual(expect.arrayContaining(["elo_riot", "riot_divisao", "riot_pdl"]));
  });

  it("leitura do mesmo tier: congela a divisão e o PDL do dia", async () => {
    aprovados([
      { id: "ouro", elo_declarado: "Prata", elo_verificado: "Ouro", elo_riot: "Ouro", riot_divisao: "II", riot_pdl: 61 },
      { id: "mestre", elo_declarado: "Diamante", elo_verificado: "Mestre", elo_riot: "Mestre", riot_divisao: "I", riot_pdl: 208 },
    ]);
    expect(await store.congelarElos("lucas")).toBe(2);
    expect(gravado().ouro).toMatchObject({ elo_congelado: "Ouro", divisao_congelada: "II", pdl_congelado: 61, pontos: 4 });
    expect(gravado().mestre).toMatchObject({ elo_congelado: "Mestre", divisao_congelada: "I", pdl_congelado: 208 });
  });

  it("elo travado à mão em OUTRO tier: congela o elo sem divisão nem PDL (meio do elo)", async () => {
    aprovados([{ id: "travado", elo_declarado: "Ouro", elo_verificado: "Ouro", elo_riot: "Platina", riot_divisao: "I", riot_pdl: 80 }]);
    await store.congelarElos("lucas");
    expect(gravado().travado).toMatchObject({ elo_congelado: "Ouro", divisao_congelada: null, pdl_congelado: null });
  });

  it("sem leitura da Riot: congela o declarado, sem divisão", async () => {
    aprovados([{ id: "sem", elo_declarado: "Prata", elo_verificado: null, elo_riot: null, riot_divisao: null, riot_pdl: null }]);
    await store.congelarElos("lucas");
    expect(gravado().sem).toMatchObject({ elo_congelado: "Prata", divisao_congelada: null, pdl_congelado: null });
  });

  it("continua condicional: só grava em quem ainda não está congelado", async () => {
    aprovados([{ id: "a", elo_declarado: "Ouro", elo_verificado: null, elo_riot: "Ouro", riot_divisao: "IV", riot_pdl: 0 }]);
    await store.congelarElos("lucas");
    const [c] = updates();
    expect(op(c!, "is")).toContainEqual(["elo_congelado", null]);
    expect(gravado().a).toMatchObject({ divisao_congelada: "IV", pdl_congelado: 0 });
  });
});
