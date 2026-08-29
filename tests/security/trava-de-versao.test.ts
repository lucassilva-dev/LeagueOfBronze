import { readFileSync } from "node:fs";
import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { tournamentDatasetSchema, type TournamentDataset } from "@/lib/schema";

/**
 * A TRAVA DE CONCORRÊNCIA DO PUT DO DATASET.
 *
 * O painel carrega o campeonato inteiro, edita em rascunho e devolve tudo. Sem trava, duas
 * pessoas editando ao mesmo tempo faziam a última gravação apagar a primeira em silêncio —
 * e o sorteio ao vivo, que grava por conta própria, entrava na mesma corrida.
 *
 * São DUAS proteções e elas cobrem coisas diferentes:
 *
 *  1. a versão que o CLIENTE afirma ter — protege contra rascunho velho (aberto há meia
 *     hora numa aba esquecida);
 *  2. a gravação CONDICIONADA no banco (`update ... where version = ?`) — protege contra a
 *     corrida entre a leitura e a escrita do próprio servidor, que é milissegundos.
 *
 * A segunda sozinha não basta, e é por isso que a primeira é OBRIGATÓRIA: sem exigir o
 * token, o servidor lia a versão atual, gravava condicionado a ela e o rascunho velho
 * passava sem 409 nenhum — omitir o campo equivalia a `force`.
 */

const store = vi.hoisted(() => ({
  save: vi.fn(),
  versao: { atual: 5 },
}));

class ConflitoDeVersaoErrorFake extends Error {
  readonly code = "VERSAO_CONFLITO";
  constructor(readonly versaoAtual: number) {
    super("conflito");
    this.name = "ConflitoDeVersaoError";
  }
}

const base: TournamentDataset = tournamentDatasetSchema.parse(
  JSON.parse(readFileSync("leagueofbronze.json", "utf8")),
);

vi.mock("@/lib/data-store", () => ({
  readDatasetComVersao: async () => ({
    dataset: JSON.parse(JSON.stringify(base)) as TournamentDataset,
    versao: store.versao.atual,
  }),
  // A rota usa `saveDatasetComVersao`, que devolve { dataset, versao }.
  saveDatasetComVersao: async (input: unknown, opts?: { versaoEsperada?: number }) => {
    const dataset = await store.save(input, opts);
    return { dataset, versao: store.versao.atual };
  },
  saveDataset: store.save,
  ConflitoDeVersaoError: ConflitoDeVersaoErrorFake,
  DatasetMissingError: class extends Error {},
}));

vi.mock("@/lib/security/route-guard", () => ({
  mesmaOrigem: () => true,
  requireAdmin: async () => ({
    ok: true,
    identity: { username: "lucas", isMaster: true, scopes: [], displayName: "L", id: "u" },
  }),
}));

const { PUT } = await import("@/app/api/admin/dataset/route");

/**
 * Uma cópia do dataset COM UMA ALTERAÇÃO.
 *
 * Enviar o dataset idêntico faz a rota retornar cedo em "Nada mudou" sem gravar — o que
 * mediria a coisa errada: os testes abaixo precisam exercitar o caminho da gravação.
 */
function datasetAlterado(): TournamentDataset {
  const copia = JSON.parse(JSON.stringify(base)) as TournamentDataset;
  copia.teams[0]!.name = `${copia.teams[0]!.name} (editado)`;
  return copia;
}

function req(corpo: unknown): NextRequest {
  const texto = JSON.stringify(corpo);
  return {
    method: "PUT",
    headers: new Headers({ "content-length": String(texto.length) }),
    json: async () => JSON.parse(texto),
  } as unknown as NextRequest;
}

beforeEach(() => {
  store.save.mockReset();
  store.save.mockImplementation(async (d: unknown) => d);
  store.versao.atual = 5;
});

describe("trava de versão do PUT do dataset", () => {
  it("grava CONDICIONADA à versão que o cliente afirmou ter", async () => {
    const r = await PUT(req({ dataset: datasetAlterado(), versao: 5 }));

    expect(r.status).toBe(200);
    expect(store.save).toHaveBeenCalledTimes(1);
    expect(store.save.mock.calls[0]![1]).toEqual({ versaoEsperada: 5 });
  });

  it("RECUSA quando o corpo não traz a versão — omitir não pode valer como `force`", async () => {
    // Este é o caso que a gravação condicionada sozinha NÃO pega: o servidor leria a versão
    // atual e gravaria condicionado a ela, e o rascunho velho passaria limpo.
    const r = await PUT(req({ dataset: datasetAlterado() }));
    const corpo = (await r.json()) as { conflict?: boolean };

    expect(r.status).toBe(409);
    expect(corpo.conflict).toBe(true);
    expect(store.save).not.toHaveBeenCalled();
  });

  it("recusa quando a versão do cliente está atrasada", async () => {
    store.versao.atual = 9;

    const r = await PUT(req({ dataset: datasetAlterado(), versao: 5 }));

    expect(r.status).toBe(409);
    expect(store.save).not.toHaveBeenCalled();
  });

  it("com `force`, grava sem condição — é a decisão consciente de sobrescrever", async () => {
    store.versao.atual = 9;

    const r = await PUT(req({ dataset: datasetAlterado(), versao: 5, force: true }));

    expect(r.status).toBe(200);
    expect(store.save.mock.calls[0]![1]).toEqual({ versaoEsperada: undefined });
  });

  it("devolve a versão REAL depois de salvar, e não uma previsão", async () => {
    /*
     * Este mock imita o provedor LOCAL (desenvolvimento), em que a leitura devolve sempre
     * 0 — a gravação não incrementa nada, porque é um arquivo num processo só.
     *
     * Prevendo `versaoAtual + 1`, a rota responderia 1; o painel guardaria 1, mandaria 1 no
     * salvamento seguinte, o servidor leria 0 e recusaria. A partir do SEGUNDO "Salvar"
     * tudo caía em 409, para sempre. Por isso a versão devolvida vem de uma releitura.
     */
    const r = await PUT(req({ dataset: datasetAlterado(), versao: 5 }));
    const corpo = (await r.json()) as { versao?: number };

    expect(r.status).toBe(200);
    expect(corpo.versao).toBe(5); // a releitura; a previsão teria dado 6
  });

  it("o segundo Salvar seguido funciona (não trava em 409)", async () => {
    // O caminho que o defeito acima quebrava por inteiro em desenvolvimento.
    const primeira = await PUT(req({ dataset: datasetAlterado(), versao: 5 }));
    const corpo1 = (await primeira.json()) as { versao?: number };
    expect(primeira.status).toBe(200);

    const segunda = await PUT(req({ dataset: datasetAlterado(), versao: corpo1.versao }));
    expect(segunda.status).toBe(200);
  });

  it("devolve 409 quando o BANCO recusa a gravação por versão", async () => {
    // A corrida de milissegundos: a versão do cliente batia na conferência, mas outra
    // gravação entrou entre a leitura e a escrita. Quem perde não escreve nada.
    store.save.mockRejectedValueOnce(new ConflitoDeVersaoErrorFake(11));

    const r = await PUT(req({ dataset: datasetAlterado(), versao: 5 }));
    const corpo = (await r.json()) as { conflict?: boolean; serverVersion?: number };

    expect(r.status).toBe(409);
    expect(corpo.conflict).toBe(true);
    expect(corpo.serverVersion).toBe(11);
  });
});
