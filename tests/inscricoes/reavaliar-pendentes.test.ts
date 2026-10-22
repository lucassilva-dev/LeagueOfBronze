import { beforeEach, describe, expect, it, vi } from "vitest";

import { criarBancoSimulado } from "./_banco-simulado";

/**
 * A rotina diária que promove os pendentes (rede de segurança das promoções que falharam)
 * não para no primeiro inscrito que der erro (RIOT-03): ela só roda uma vez por dia, e uma
 * falha num inscrito não pode deixar os seguintes sem promoção.
 */

const estado = vi.hoisted(() => ({
  banco: null as unknown as ReturnType<typeof import("./_banco-simulado").criarBancoSimulado>,
}));

vi.mock("@/lib/data-store", () => ({
  isSupabaseConfigured: () => true,
  createSupabaseAdminClient: () => estado.banco.cliente(),
}));

const { reavaliarPendentes } = await import("@/lib/inscricoes/store");

const ITENS = ["a", "b", "d", "e", "f", "m"];

beforeEach(() => {
  estado.banco = criarBancoSimulado();
  const pessoas = ["p1", "p2", "p3"];
  estado.banco.tabelas = {
    edicao_config: [{ id: 1, inicio_campeonato: null }],
    inscricoes: pessoas.map((id, i) => ({
      id,
      riot_id: `${id}#BR1`,
      criado_em: `2026-10-0${i + 1}T00:00:00.000Z`,
      situacao: "pendente",
      promocao_automatica: true,
    })),
    inscricao_conferencias: pessoas.flatMap((id) => ITENS.map((item) => ({ inscricao_id: id, item, estado: "ok" }))),
    inscricao_pagamentos: pessoas.map((id) => ({ inscricao_id: id, estado: "pago" })),
  };
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("reavaliarPendentes", () => {
  it("controle: todos que cumprem tudo e pagaram viram Apto", async () => {
    expect(await reavaliarPendentes()).toEqual(["p1#BR1", "p2#BR1", "p3#BR1"]);
  });

  it("a leitura de UM inscrito falhou (a rede piscou): os outros são promovidos mesmo assim", async () => {
    estado.banco.falha = (tabela, op, filtros) =>
      tabela === "inscricoes" && op === "select" && filtros.includes("id=eq.p1") ? "fetch failed" : null;

    expect(await reavaliarPendentes()).toEqual(["p2#BR1", "p3#BR1"]);
    const situacoes = estado.banco.tabelas.inscricoes!.map((i) => [i.id, i.situacao]);
    expect(situacoes).toEqual([
      ["p1", "pendente"],
      ["p2", "apto"],
      ["p3", "apto"],
    ]);
  });

  it("a simulação só diz quem seria promovido, sem gravar", async () => {
    expect(await reavaliarPendentes({ simular: true })).toEqual(["p1#BR1", "p2#BR1", "p3#BR1"]);
    expect(estado.banco.tabelas.inscricoes!.every((i) => i.situacao === "pendente")).toBe(true);
  });
});
