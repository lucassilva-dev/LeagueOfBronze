import { describe, expect, it } from "vitest";

import { alertasDoInscrito } from "@/lib/inscricoes/alertas";

/**
 * Os alertas do painel com a fila de reserva (D2 e D5, 2026-10-22): o painel aponta quem
 * perdeu o prazo (com o botão de passar a vaga) e o reserva que pagou (a devolver se não
 * jogar). Reserva aprovado sem pagamento é o normal — não é alerta.
 */

const OK = ["a", "b", "d", "e", "f", "m"].map((item) => ({ item, estado: "ok" }));
const CONFIG = { inicio_campeonato: null, min_ranqueadas: 5 };
const DEPOIS = Date.parse("2026-11-01T12:00:00Z");
const PRAZO = "2026-11-01T02:59:59Z";

function codigos(args: {
  situacao?: string;
  organizador?: boolean;
  pagamento: { estado: string; vence_em?: string | null } | null;
  lugar?: Parameters<typeof alertasDoInscrito>[0]["lugar"];
  agoraMs?: number;
}) {
  return alertasDoInscrito({
    inscrito: {
      riot_id: "Fulano#BR1",
      situacao: args.situacao ?? "pendente",
      organizador: args.organizador ?? false,
      elo_declarado: "Ouro",
      elo_verificado: null,
    },
    conferencias: OK,
    pagamento: args.pagamento,
    config: CONFIG,
    agoraMs: args.agoraMs ?? DEPOIS,
    lugar: args.lugar,
  }).map((a) => a.codigo);
}

const TITULAR = { tipo: "titular" } as const;
const RESERVA = { tipo: "reserva", posicao: 2, manual: false } as const;

describe("prazo_vencido (D5)", () => {
  it("titular «aguardando» depois do prazo: alerta, com o botão de passar a vaga", () => {
    const alertas = alertasDoInscrito({
      inscrito: { riot_id: "F#1", situacao: "pendente", organizador: false, elo_declarado: "Ouro", elo_verificado: null },
      conferencias: OK,
      pagamento: { estado: "aguardando", vence_em: PRAZO },
      config: CONFIG,
      agoraMs: DEPOIS,
      lugar: TITULAR,
    });
    expect(alertas.find((a) => a.codigo === "prazo_vencido")?.acaoFila).toBe("passar_vaga");
  });

  it.each([
    ["antes do prazo", { agoraMs: Date.parse("2026-10-31T20:00:00Z") }],
    ["organizador", { organizador: true }],
    ["declarado", { pagamento: { estado: "declarado", vence_em: PRAZO } }],
    ["reserva", { lugar: RESERVA }],
    ["sem o lugar (tela antiga)", { lugar: undefined }],
    ["sem o vence_em (tela antiga)", { pagamento: { estado: "aguardando" } }],
  ])("%s: sem alerta", (_rotulo, troca) => {
    expect(
      codigos({ pagamento: { estado: "aguardando", vence_em: PRAZO }, lugar: TITULAR, ...troca }),
    ).not.toContain("prazo_vencido");
  });
});

describe("reserva_com_pagamento (D2)", () => {
  it.each(["pago", "declarado"])("reserva com «%s»: alerta (a devolver se não jogar)", (estado) => {
    expect(codigos({ pagamento: { estado }, lugar: RESERVA })).toContain("reserva_com_pagamento");
  });

  it("reserva «aguardando»: nada (ele só paga se for chamado)", () => {
    expect(codigos({ pagamento: { estado: "aguardando", vence_em: null }, lugar: RESERVA })).toEqual([]);
  });
});

describe("apto_sem_pagamento não acusa reserva", () => {
  it("reserva aprovado sem pagamento: normal", () => {
    expect(codigos({ situacao: "apto", pagamento: { estado: "aguardando" }, lugar: RESERVA })).not.toContain(
      "apto_sem_pagamento",
    );
  });

  it("controle: titular aprovado sem pagamento continua alertando", () => {
    expect(codigos({ situacao: "apto", pagamento: { estado: "aguardando" }, lugar: TITULAR })).toContain(
      "apto_sem_pagamento",
    );
  });
});
