import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * «Salvar capitães» (decisão de 23/10/2026): a mesa do draft grava os capitães DEFINIDOS pela
 * organização em `inscricoes.capitao` — marca os pedidos e desmarca os outros. O banco é uma
 * tabela em memória que entende só o que a função usa: `select("*").returns()` e
 * `update(...).in("id", ids)`.
 *
 * A leitura é `select *` desde o time definido pela organização (24/10/2026): a função lê
 * `time_definido` para não desmarcar o capitão do time definido, e um banco sem essa coluna
 * continua funcionando.
 */

type Linha = {
  id: string;
  riot_id: string;
  situacao: string;
  capitao?: boolean;
  time_definido?: string | null;
  atualizado_em?: string;
};

const banco = vi.hoisted(() => ({
  linhas: [] as Linha[],
  gravacoes: [] as { valores: Record<string, unknown>; ids: string[] }[],
  erroNaLeitura: null as string | null,
  erroNaGravacao: null as string | null,
}));

vi.mock("@/lib/data-store", () => ({
  createSupabaseAdminClient: () => ({
    from: (tabela: string) => {
      if (tabela !== "inscricoes") throw new Error(`tabela inesperada: ${tabela}`);
      return {
        select: (colunas: string) => {
          expect(colunas).toBe("*");
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
            if (banco.erroNaGravacao) return { error: { message: banco.erroNaGravacao } };
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
  banco.erroNaGravacao = null;
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

  it("erro de leitura que fala da coluna `capitao`: o recado diz qual migração rodar", async () => {
    banco.erroNaLeitura = "column inscricoes.capitao does not exist";
    await expect(salvarCapitaesDefinidos(["a"])).rejects.toThrow(/migracao-capitaes-definidos\.sql/);
  });

  it("outro erro de leitura: o recado é o do banco, sem gravar nada", async () => {
    banco.erroNaLeitura = "fora do ar";
    await expect(salvarCapitaesDefinidos(["a"])).rejects.toThrow("Falha ao ler as inscrições: fora do ar");
    expect(banco.gravacoes).toEqual([]);
  });

  /*
   * Com a leitura `select *`, um banco SEM a coluna `capitao` não dá mais erro na leitura — as
   * linhas só vêm sem ela. O erro aparece na gravação, e é lá que o recado que manda rodar
   * supabase/migracao-capitaes-definidos.sql precisa sair (achado da revisão de 24/10).
   */
  it("banco sem a coluna `capitao` (a leitura não falha mais): o recado ainda diz qual migração rodar", async () => {
    for (const linha of banco.linhas) delete linha.capitao;
    banco.erroNaGravacao = "Could not find the 'capitao' column of 'inscricoes' in the schema cache";
    await expect(salvarCapitaesDefinidos(["a"])).rejects.toThrow(/migracao-capitaes-definidos\.sql/);
  });
});

describe("salvar os capitães com o time definido pela organização (24/10/2026)", () => {
  beforeEach(() => {
    // O capitão do time definido (n) e um membro sem a marca (m): «Definir capitães» lista só
    // quem vai ao draft, então a lista enviada não traz nenhum dos dois.
    banco.linhas.push(
      { id: "n", riot_id: "N#BR1", situacao: "apto", capitao: true, time_definido: "JUNG" },
      { id: "m", riot_id: "M#BR1", situacao: "apto", capitao: false, time_definido: "MID" },
    );
  });

  it("o capitão do time definido continua marcado quando a lista do draft não o traz", async () => {
    const r = await salvarCapitaesDefinidos(["b", "c"]);
    expect(marcados()).toEqual(["b", "c", "n"]);
    expect(banco.gravacoes.map((g) => [g.valores.capitao, g.ids])).toEqual([
      [true, ["c"]],
      [false, ["a"]],
    ]);
    expect(r).toEqual({ antes: ["A#BR1", "B#BR1", "N#BR1"], depois: ["B#BR1", "C#BR1", "N#BR1"] });
  });

  it("lista vazia desmarca os do draft, mas não o capitão do time definido", async () => {
    await salvarCapitaesDefinidos([]);
    expect(marcados()).toEqual(["n"]);
  });

  it("a lista com ele (tela velha, que lista todo mundo) não grava em dobro", async () => {
    await salvarCapitaesDefinidos(["a", "b", "n"]);
    expect(banco.gravacoes).toEqual([]);
    expect(marcados()).toEqual(["a", "b", "n"]);
  });

  it("membro do time definido sem a marca não ganha a marca sozinho", async () => {
    await salvarCapitaesDefinidos(["a"]);
    expect(banco.linhas.find((l) => l.id === "m")!.capitao).toBe(false);
  });

  it("capitão do time definido que saiu do campeonato não é preservado (a prévia pede outro)", async () => {
    banco.linhas.find((l) => l.id === "n")!.situacao = "desistiu";
    await salvarCapitaesDefinidos(["a", "b"]);
    expect(marcados()).toEqual(["a", "b"]);
  });

  /*
   * A revisão de 24/10 achou o beco: com o time ainda inválido a mesa mostra os membros, a
   * organização marca um segundo por engano e, preservando sempre, nunca mais conseguia
   * desmarcar pela tela. Agora o pedido que traz um membro manda.
   */
  it("o pedido que traz um membro do time definido manda: troca o capitão do time", async () => {
    await salvarCapitaesDefinidos(["a", "b", "m"]);
    expect(marcados()).toEqual(["a", "b", "m"]);
  });

  it("dois membros marcados por engano saem com um pedido que traz só o certo", async () => {
    banco.linhas.find((l) => l.id === "m")!.capitao = true;
    await salvarCapitaesDefinidos(["a", "b", "n"]);
    expect(marcados()).toEqual(["a", "b", "n"]);
  });

  it("com dois membros marcados, a lista só do draft não preserva nenhum (a mesa mostra o time sem capitão)", async () => {
    banco.linhas.find((l) => l.id === "m")!.capitao = true;
    await salvarCapitaesDefinidos(["a", "b"]);
    expect(marcados()).toEqual(["a", "b"]);
  });
});
