import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * «Salvar capitães» (decisão de 23/10/2026): a mesa do draft grava os capitães DEFINIDOS pela
 * organização em `inscricoes.capitao` — marca os pedidos e desmarca os outros. O banco é uma
 * tabela em memória que entende só o que a função usa: `select(...).returns()` e
 * `update(...).in("id", ids)`.
 */

type Linha = { id: string; riot_id: string; situacao: string; capitao: boolean; atualizado_em?: string };

const banco = vi.hoisted(() => ({
  linhas: [] as Linha[],
  gravacoes: [] as { valores: Record<string, unknown>; ids: string[] }[],
  erroNaLeitura: null as string | null,
}));

vi.mock("@/lib/data-store", () => ({
  createSupabaseAdminClient: () => ({
    from: (tabela: string) => {
      if (tabela !== "inscricoes") throw new Error(`tabela inesperada: ${tabela}`);
      return {
        select: (colunas: string) => {
          expect(colunas).toBe("id,riot_id,situacao,capitao");
          return {
            returns: async () =>
              banco.erroNaLeitura
                ? { data: null, error: { message: banco.erroNaLeitura } }
                : { data: structuredClone(banco.linhas), error: null },
          };
        },
        update: (valores: Record<string, unknown>) => ({
          in: async (coluna: string, ids: string[]) => {
            expect(coluna).toBe("id");
            banco.gravacoes.push({ valores, ids: [...ids] });
            for (const l of banco.linhas) if (ids.includes(l.id)) Object.assign(l, valores);
            return { error: null };
          },
        }),
      };
    },
  }),
}));
vi.mock("@/lib/inscricoes/store", () => ({
  lerConfig: async () => {
    throw new Error("não usado");
  },
  listarInscricoes: async () => {
    throw new Error("não usado");
  },
}));

const { salvarCapitaesDefinidos } = await import("@/lib/draft/store");

beforeEach(() => {
  banco.erroNaLeitura = null;
  banco.gravacoes = [];
  banco.linhas = [
    { id: "a", riot_id: "A#BR1", situacao: "apto", capitao: true },
    { id: "b", riot_id: "B#BR1", situacao: "apto", capitao: true },
    { id: "c", riot_id: "C#BR1", situacao: "apto", capitao: false },
    { id: "d", riot_id: "D#BR1", situacao: "pendente", capitao: false },
    { id: "x", riot_id: "X#BR1", situacao: "desistiu", capitao: false },
  ];
});

const marcados = () => banco.linhas.filter((l) => l.capitao).map((l) => l.id).sort();

describe("salvar os capitães definidos", () => {
  it("marca os pedidos e desmarca quem saiu da lista — marcando ANTES de desmarcar", async () => {
    const r = await salvarCapitaesDefinidos(["b", "c", "d"]);
    expect(marcados()).toEqual(["b", "c", "d"]);
    expect(r).toEqual({ antes: ["A#BR1", "B#BR1"], depois: ["B#BR1", "C#BR1", "D#BR1"] });
    expect(banco.gravacoes.map((g) => [g.valores.capitao, g.ids])).toEqual([
      [true, ["c", "d"]],
      [false, ["a"]],
    ]);
    // A trava das gravações da linha (a ciência dos alertas confere `atualizado_em`) anda junto.
    expect(banco.gravacoes.every((g) => typeof g.valores.atualizado_em === "string")).toBe(true);
  });

  it("lista vazia desmarca todo mundo; a mesma lista não grava nada", async () => {
    await salvarCapitaesDefinidos(["a", "b", "a"]);
    expect(banco.gravacoes).toEqual([]);
    await salvarCapitaesDefinidos([]);
    expect(marcados()).toEqual([]);
  });

  it("recusa quem está fora do campeonato e id que não existe, sem gravar nada", async () => {
    await expect(salvarCapitaesDefinidos(["a", "x"])).rejects.toThrow(/X#BR1 está fora do campeonato \(desistiu\)/);
    await expect(salvarCapitaesDefinidos(["a", "zzz"])).rejects.toThrow(/não está entre os inscritos/);
    expect(banco.gravacoes).toEqual([]);
    expect(marcados()).toEqual(["a", "b"]);
  });

  it("sem a coluna no banco, o recado diz qual migração rodar", async () => {
    banco.erroNaLeitura = "column inscricoes.capitao does not exist";
    await expect(salvarCapitaesDefinidos(["a"])).rejects.toThrow(/migracao-capitaes-definidos\.sql/);
  });
});
