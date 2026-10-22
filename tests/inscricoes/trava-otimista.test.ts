import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { auditorias, criarBancoSimulado } from "./_banco-simulado";

/**
 * A tela velha não passa por cima do que outro organizador gravou (P4A-03).
 *
 * Cada escrita do painel aceita o valor que a TELA viu (`estadoAnterior` no pagamento e nos
 * requisitos, `situacaoAnterior` na ficha). Presente e diferente do banco: nada é gravado e
 * a rota responde 409. Ausente: grava como sempre gravou — a tela antiga continua
 * funcionando.
 *
 * O banco é simulado em memória e aplica os filtros do update de verdade, então o que se
 * prova é que a condição vai NA MESMA instrução da gravação.
 */

const estado = vi.hoisted(() => ({
  banco: null as unknown as ReturnType<typeof import("./_banco-simulado").criarBancoSimulado>,
}));

vi.mock("@/lib/data-store", () => ({
  isSupabaseConfigured: () => true,
  createSupabaseAdminClient: () => estado.banco.cliente(),
}));

vi.mock("@/lib/security/route-guard", () => ({
  mesmaOrigem: () => true,
  requireAdmin: async () => ({ ok: true, identity: { username: "financeiroB", isMaster: true, scopes: [] } }),
}));

const store = await import("@/lib/inscricoes/store");
const { ErroDeConflito } = await import("@/lib/inscricoes/conflito");
const { fichaTemMudanca, inscritoPatchSchema } = await import("@/lib/inscricoes/schema");
const { PATCH } = await import("@/app/api/admin/edicao/route");

const ID = "3f2504e0-4f89-11d3-9a0c-0305e82c3301";

function req(corpo: unknown): NextRequest {
  const texto = JSON.stringify(corpo);
  return {
    method: "PATCH",
    headers: new Headers({ host: "x", "sec-fetch-site": "same-origin" }),
    text: async () => texto,
  } as unknown as NextRequest;
}

const pagamento = () => estado.banco.tabelas.inscricao_pagamentos![0]!;
const item = (letra: string) => estado.banco.tabelas.inscricao_conferencias!.find((c) => c.item === letra)!;
const ficha = () => estado.banco.tabelas.inscricoes![0]!;

beforeEach(() => {
  estado.banco = criarBancoSimulado();
  estado.banco.tabelas = {
    edicao_config: [{ id: 1, inicio_campeonato: null, min_ranqueadas: 5 }],
    inscricoes: [
      {
        id: ID,
        riot_id: "Fulano#BR1",
        situacao: "pendente",
        promocao_automatica: true,
        elo_declarado: "Ouro",
        elo_congelado: null,
        elo_riot: null,
        observacao: null,
      },
    ],
    inscricao_pagamentos: [{ inscricao_id: ID, estado: "declarado" }],
    inscricao_conferencias: [
      { inscricao_id: ID, item: "a", estado: "pendente", observacao: null, conferido_por: null },
      { inscricao_id: ID, item: "b", estado: "pendente", observacao: null, conferido_por: null },
    ],
  };
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("pagamento", () => {
  it("o financeiro C confirma «pago»; B, com a fila das 9h50 (vê «declarado»), clica «Não encontrei»: nada muda", async () => {
    await store.atualizarPagamento({ inscricaoId: ID, estado: "pago", estadoAnterior: "declarado", autor: "financeiroC" });
    await expect(
      store.atualizarPagamento({ inscricaoId: ID, estado: "aguardando", estadoAnterior: "declarado", autor: "financeiroB" }),
    ).rejects.toBeInstanceOf(ErroDeConflito);

    expect(pagamento().estado).toBe("pago");
    expect(pagamento().conferido_por).toBe("financeiroC");
    // Só a gravação que aconteceu deixa rastro.
    expect(auditorias(estado.banco).map((a) => a.autor)).toEqual(["financeiroC"]);
  });

  it("sem o valor anterior grava como sempre gravou (tela antiga)", async () => {
    await store.atualizarPagamento({ inscricaoId: ID, estado: "pago", autor: "financeiroC" });
    await store.atualizarPagamento({ inscricaoId: ID, estado: "aguardando", autor: "financeiroB" });
    expect(pagamento().estado).toBe("aguardando");
  });

  it("pela rota: 409 com a mensagem e `conflito: true`, e nada é reavaliado", async () => {
    pagamento().estado = "pago";
    const r = await PATCH(req({ acao: "pagamento", dados: { inscricaoId: ID, estado: "aguardando", estadoAnterior: "declarado" } }));
    expect(r.status).toBe(409);
    const corpo = await r.json();
    expect(corpo.conflito).toBe(true);
    expect(corpo.error).toMatch(/O pagamento mudou desde que você abriu a tela/);
    expect(pagamento().estado).toBe("pago");
  });

  it("pela rota, com o valor certo: 200 e gravado", async () => {
    const r = await PATCH(req({ acao: "pagamento", dados: { inscricaoId: ID, estado: "pago", estadoAnterior: "declarado" } }));
    expect(r.status).toBe(200);
    expect(pagamento().estado).toBe("pago");
  });
});

describe("requisito (conferência)", () => {
  it("B recusa o (A); A, com a gaveta aberta antes, salva «Cumpre» pelo atalho: o (A) continua recusado", async () => {
    await store.atualizarConferencia({
      inscricaoId: ID,
      item: "a",
      estado: "recusado",
      observacao: "não está no grupo",
      estadoAnterior: "pendente",
      autor: "B",
    });
    await expect(
      store.atualizarConferencia({ inscricaoId: ID, item: "a", estado: "ok", estadoAnterior: "pendente", autor: "A" }),
    ).rejects.toBeInstanceOf(ErroDeConflito);

    expect(item("a")).toMatchObject({ estado: "recusado", observacao: "não está no grupo", conferido_por: "B" });
  });

  it("«Salvar tudo» da gaveta: o item que mudou dá 409; o outro item (B) não é conflito", async () => {
    item("a").estado = "recusado";
    const r = await PATCH(
      req({
        acao: "inscrito",
        dados: {
          inscricaoId: ID,
          conferencias: [
            { item: "a", estado: "ok", estadoAnterior: "pendente" },
            { item: "b", estado: "ok", estadoAnterior: "pendente" },
          ],
          ficha: { situacao: "apto", situacaoAnterior: "pendente" },
        },
      }),
    );
    expect(r.status).toBe(409);
    expect((await r.json()).error).toMatch(/requisito \(A\) mudou/);
    expect(item("a").estado).toBe("recusado");
    // Item diferente não é conflito: dois organizadores conferindo itens diferentes é normal.
    expect(item("b").estado).toBe("ok");
    // A ficha (com a situação) só é gravada se TODOS os requisitos gravaram.
    expect(ficha().situacao).toBe("pendente");
  });
});

describe("ficha (situação)", () => {
  it("a promoção automática virou a pessoa Apto; a ficha velha (vê «pendente») não a recusa por cima", async () => {
    ficha().situacao = "apto";
    await expect(
      store.atualizarInscricao(ID, { situacao: "recusado", situacaoAnterior: "pendente" }, "conferente"),
    ).rejects.toBeInstanceOf(ErroDeConflito);
    expect(ficha().situacao).toBe("apto");
    expect(auditorias(estado.banco)).toEqual([]);
  });

  it("com a situação certa grava, e a trava não entra no registro do que mudou", async () => {
    await store.atualizarInscricao(ID, { situacao: "recusado", situacaoAnterior: "pendente" }, "conferente");
    expect(ficha().situacao).toBe("recusado");
    expect(auditorias(estado.banco)[0]!.detalhe).toEqual({ situacao: "recusado" });
  });

  it("a trava sozinha não é mudança: o «Salvar tudo» só com ela é recusado como vazio", () => {
    expect(fichaTemMudanca({ situacaoAnterior: "apto" })).toBe(false);
    expect(fichaTemMudanca({ situacaoAnterior: "apto", observacao: "x" })).toBe(true);
    expect(inscritoPatchSchema.safeParse({ inscricaoId: ID, ficha: { situacaoAnterior: "apto" } }).success).toBe(false);
  });
});
