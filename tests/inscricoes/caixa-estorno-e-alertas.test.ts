import { beforeEach, describe, expect, it, vi } from "vitest";

import { auditorias, criarBancoSimulado } from "./_banco-simulado";

/**
 * O caixa só conta dinheiro que existe, e o painel aponta quem está Apto sem ter pago.
 *
 *  - P4A-09: «estorno devido» / «estornado» só de pagamento que foi RECEBIDO. Antes,
 *    «aguardando → estorno devido» por engano inventava R$ 20 em «Recebido» e «Em caixa» e
 *    punha na lista «a devolver» quem nunca pagou.
 *  - P4A-12: «A receber» é cobrança viva — sem organizador (não paga) e sem recusado ou
 *    desistente (nem quem declarou: o alerta pede conferir o extrato antes).
 *  - P4A-04: o sistema só PROMOVE; se o pagamento volta atrás depois da promoção, ou alguém
 *    marca Apto à mão sem pagamento, o alerta «apto_sem_pagamento» aparece.
 */

const estado = vi.hoisted(() => ({
  banco: null as unknown as ReturnType<typeof import("./_banco-simulado").criarBancoSimulado>,
}));

vi.mock("@/lib/data-store", () => ({
  isSupabaseConfigured: () => true,
  createSupabaseAdminClient: () => estado.banco.cliente(),
}));

const store = await import("@/lib/inscricoes/store");
const { alertasDoInscrito } = await import("@/lib/inscricoes/alertas");
const { ErroDeRegra } = await import("@/lib/security/erros");

const ID = "3f2504e0-4f89-11d3-9a0c-0305e82c3301";

beforeEach(() => {
  estado.banco = criarBancoSimulado();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

// ---------------------------------------------------------------- P4A-09

describe("estorno só de dinheiro que entrou", () => {
  const comPagamento = (estadoAtual: string) => {
    estado.banco.tabelas.inscricao_pagamentos = [{ inscricao_id: ID, estado: estadoAtual, valor_centavos: 2000 }];
  };
  const atual = () => estado.banco.tabelas.inscricao_pagamentos![0]!.estado;

  it.each(["aguardando", "declarado", "cancelado", "isento"])(
    "de «%s» para «estorno devido» é recusado com o motivo, e nada é gravado",
    async (origem) => {
      comPagamento(origem);
      const tentativa = store.atualizarPagamento({ inscricaoId: ID, estado: "estorno_devido", autor: "fin" });
      await expect(tentativa).rejects.toBeInstanceOf(ErroDeRegra);
      await expect(tentativa).rejects.toThrow(/Só dá para estornar um pagamento que foi recebido/);
      expect(atual()).toBe(origem);
      expect(auditorias(estado.banco)).toEqual([]);
    },
  );

  it("de «aguardando» direto para «estornado» também é recusado", async () => {
    comPagamento("aguardando");
    await expect(store.atualizarPagamento({ inscricaoId: ID, estado: "estornado", autor: "fin" })).rejects.toThrow(
      /Só dá para estornar/,
    );
    expect(atual()).toBe("aguardando");
  });

  it.each([
    ["pago", "estorno_devido"],
    ["pago", "estornado"],
    ["estorno_devido", "estornado"],
  ] as const)("de «%s» para «%s» continua permitido", async (origem, destino) => {
    comPagamento(origem);
    await store.atualizarPagamento({ inscricaoId: ID, estado: destino, autor: "fin" });
    expect(atual()).toBe(destino);
  });

  it("o caixa não sobe com um estorno recusado", async () => {
    comPagamento("aguardando");
    await store.atualizarPagamento({ inscricaoId: ID, estado: "estorno_devido", autor: "fin" }).catch(() => {});
    const caixa = store.fecharCaixa(estado.banco.tabelas.inscricao_pagamentos as never);
    expect(caixa.emCaixa).toBe(0);
    expect(caixa.recebido).toBe(0);
  });
});

// ---------------------------------------------------------------- P4A-12

describe("«A receber» é só cobrança viva", () => {
  type Ins = Parameters<typeof store.panorama>[0][number];
  type Pag = Parameters<typeof store.panorama>[1][number];
  const ins = (id: string, situacao: string, organizador = false) => ({ id, situacao, organizador }) as unknown as Ins;
  const pg = (inscricao_id: string, estadoPg: string, valor_centavos = 2000) =>
    ({ inscricao_id, estado: estadoPg, valor_centavos }) as unknown as Pag;
  const config = { jogadores_por_time: 5, max_times: 6 };

  it("não soma organizador em «aguardando» nem recusado/desistente que declarou", () => {
    const p = store.panorama(
      [ins("1", "pendente"), ins("2", "apto", true), ins("3", "recusado"), ins("4", "recusado"), ins("5", "desistiu"), ins("6", "apto")],
      [pg("1", "aguardando"), pg("2", "aguardando"), pg("3", "declarado"), pg("4", "aguardando"), pg("5", "declarado"), pg("6", "declarado")],
      config,
    );
    // Só o "1" (aguardando) e o "6" (declarado) são cobrança real.
    expect(p.caixa.aReceber).toBe(4000);
  });

  it("o resto do caixa não muda: o organizador isento continua na linha «isento»", () => {
    const p = store.panorama(
      [ins("1", "apto", true), ins("2", "apto")],
      [pg("1", "isento"), pg("2", "pago")],
      config,
    );
    expect(p.caixa).toMatchObject({ isento: 2000, arrecadado: 2000, recebido: 2000, aReceber: 0 });
  });
});

// ---------------------------------------------------------------- P4A-04

describe("alerta «apto_sem_pagamento»", () => {
  const inscrito = (over: Record<string, unknown> = {}) => ({
    riot_id: "Fulano#BR1",
    situacao: "apto",
    organizador: false,
    elo_declarado: "Ouro",
    elo_verificado: null,
    ...over,
  });
  const ok = ["a", "b", "d", "e", "f", "m"].map((item) => ({ item, estado: "ok" }));
  const codigos = (over: Record<string, unknown>, pagamento: { estado: string } | null) =>
    alertasDoInscrito({
      inscrito: inscrito(over) as never,
      conferencias: ok,
      pagamento,
      config: { inicio_campeonato: null, min_ranqueadas: 5 },
      agoraMs: Date.parse("2026-10-21T12:00:00Z"),
    }).map((a) => a.codigo);

  it.each(["aguardando", "declarado", "cancelado", "estorno_devido", "estornado"])(
    "Apto com pagamento «%s» acende o alerta",
    (estadoPg) => {
      expect(codigos({}, { estado: estadoPg })).toContain("apto_sem_pagamento");
    },
  );

  it("Apto sem linha de pagamento também", () => {
    expect(codigos({}, null)).toContain("apto_sem_pagamento");
  });

  it("«sobra» também é aprovado", () => {
    expect(codigos({ situacao: "sobra" }, { estado: "aguardando" })).toContain("apto_sem_pagamento");
  });

  it.each(["pago", "isento"])("Apto com «%s» não acende", (estadoPg) => {
    expect(codigos({}, { estado: estadoPg })).not.toContain("apto_sem_pagamento");
  });

  it("organizador não paga: o caso dele é outro alerta", () => {
    expect(codigos({ organizador: true }, { estado: "aguardando" })).not.toContain("apto_sem_pagamento");
  });

  it("pendente sem pagamento não é alerta (é o normal)", () => {
    expect(codigos({ situacao: "pendente" }, { estado: "aguardando" })).not.toContain("apto_sem_pagamento");
  });
});
