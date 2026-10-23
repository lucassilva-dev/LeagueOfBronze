import { describe, expect, it } from "vitest";

import {
  lugarNaFila,
  montarFila,
  motivoParaManterAVaga,
  perdeuOPrazo,
  prazoDoChamado,
  previsaoParaNovaInscricao,
  reservaADevolverSeNaoJogar,
  vagasDaEdicao,
} from "@/lib/inscricoes/fila";

/**
 * A fila de reserva da 4ª Edição (decisões D1, D3, D4 e D5 do Lucas, 2026-10-22), na função
 * pura que o formulário, a Minha inscrição, o painel e o draft usam.
 */

const CONFIG = { max_times: 6, jogadores_por_time: 5 };
const PRAZO = "2026-11-01T02:59:59Z"; // fim de 31/10 em Brasília

/** `n` inscritos, um por minuto a partir de 05/10, na ordem do índice. */
function inscritos(n: number, extra: (i: number) => Record<string, unknown> = () => ({})) {
  return Array.from({ length: n }, (_, i) => ({
    id: `i${String(i + 1).padStart(2, "0")}`,
    criado_em: new Date(Date.UTC(2026, 9, 5, 12, i)).toISOString(),
    situacao: "pendente",
    organizador: false,
    ...extra(i + 1),
  }));
}

describe("titulares e fila (D1)", () => {
  it("36 ativos e 30 vagas: os 30 primeiros por ordem de inscrição são titulares, os 6 seguintes a fila 1..6", () => {
    // Embaralhados de propósito: a ordem é a de inscrição, não a da lista.
    const lista = inscritos(36).reverse();
    const fila = montarFila(lista, CONFIG);
    expect(fila.vagas).toBe(30);
    expect(fila.titulares).toEqual(inscritos(30).map((i) => i.id));
    expect(fila.reservas).toEqual(["i31", "i32", "i33", "i34", "i35", "i36"]);
    expect(lugarNaFila(fila, "i31")).toEqual({ tipo: "reserva", posicao: 1, manual: false });
    expect(lugarNaFila(fila, "i36")).toEqual({ tipo: "reserva", posicao: 6, manual: false });
    expect(lugarNaFila(fila, "i30")).toEqual({ tipo: "titular" });
  });

  it("os organizadores entram TODOS, mesmo inscritos por último — e empurram os últimos para a fila", () => {
    // 36 inscritos, 4 organizadores entre os ÚLTIMOS: 4 + 26 primeiros = 30 titulares.
    const lista = inscritos(36, (n) => ({ organizador: n > 32 }));
    const fila = montarFila(lista, CONFIG);
    for (const org of ["i33", "i34", "i35", "i36"]) expect(lugarNaFila(fila, org)).toEqual({ tipo: "titular" });
    expect(fila.titulares).toHaveLength(30);
    expect(lugarNaFila(fila, "i26")).toEqual({ tipo: "titular" });
    expect(lugarNaFila(fila, "i27")).toEqual({ tipo: "reserva", posicao: 1, manual: false });
    expect(fila.reservas).toEqual(["i27", "i28", "i29", "i30", "i31", "i32"]);
  });

  it("recusado e desistente saem da conta — e o 1º da fila sobe", () => {
    const lista = inscritos(32, (n) => (n === 3 ? { situacao: "recusado" } : n === 7 ? { situacao: "desistiu" } : {}));
    const fila = montarFila(lista, CONFIG);
    expect(lugarNaFila(fila, "i03")).toEqual({ tipo: "fora" });
    expect(lugarNaFila(fila, "i07")).toEqual({ tipo: "fora" });
    expect(lugarNaFila(fila, "i31")).toEqual({ tipo: "titular" });
    expect(lugarNaFila(fila, "i32")).toEqual({ tipo: "titular" });
    expect(fila.reservas).toEqual([]);
  });

  it("«sobra» manual fica fora dos titulares e entra na fila DEPOIS de quem pode ser chamado", () => {
    const lista = inscritos(33, (n) => (n === 2 ? { situacao: "sobra" } : {}));
    const fila = montarFila(lista, CONFIG);
    // Sem o i02, os 30 titulares vão até o i31.
    expect(lugarNaFila(fila, "i31")).toEqual({ tipo: "titular" });
    expect(lugarNaFila(fila, "i32")).toEqual({ tipo: "reserva", posicao: 1, manual: false });
    expect(lugarNaFila(fila, "i33")).toEqual({ tipo: "reserva", posicao: 2, manual: false });
    expect(lugarNaFila(fila, "i02")).toEqual({ tipo: "reserva", posicao: 3, manual: true });
  });

  it("pendente conta (não precisa estar apto para ser titular)", () => {
    const fila = montarFila(inscritos(31, (n) => ({ situacao: n % 2 ? "apto" : "pendente" })), CONFIG);
    expect(fila.titulares).toHaveLength(30);
    expect(fila.reservas).toEqual(["i31"]);
  });

  it("sem teto de times, ninguém vai para a fila", () => {
    expect(vagasDaEdicao({ max_times: null, jogadores_por_time: 5 })).toBeNull();
    const fila = montarFila(inscritos(40), { max_times: null, jogadores_por_time: 5 });
    expect(fila.titulares).toHaveLength(40);
    expect(fila.reservas).toEqual([]);
  });

  it("empate no milissegundo: decide o texto (microssegundos do Postgres) e depois o id", () => {
    const fila = montarFila(
      [
        { id: "b", criado_em: "2026-10-05T12:00:00.000200+00:00", situacao: "pendente", organizador: false },
        { id: "a", criado_em: "2026-10-05T12:00:00.000100+00:00", situacao: "pendente", organizador: false },
        { id: "c", criado_em: "2026-10-05T12:00:00.000100+00:00", situacao: "pendente", organizador: false },
      ],
      { max_times: 1, jogadores_por_time: 2 },
    );
    expect(fila.titulares).toEqual(["a", "c"]);
    expect(fila.reservas).toEqual(["b"]);
  });
});

describe("8 times de 5 = 40 vagas, e «excluído» fora da fila (atualização de 23/10)", () => {
  const OITO_TIMES = { max_times: 8, jogadores_por_time: 5 };

  it("42 ativos: os 40 primeiros são titulares, os 2 seguintes a fila 1 e 2", () => {
    const fila = montarFila(inscritos(42), OITO_TIMES);
    expect(fila.vagas).toBe(40);
    expect(fila.titulares).toHaveLength(40);
    expect(fila.reservas).toEqual(["i41", "i42"]);
  });

  it("excluído sai da conta como recusado e desistente: o 1º da fila sobe e o excluído fica «fora»", () => {
    const fila = montarFila(inscritos(42, (n) => (n === 5 ? { situacao: "excluido" } : {})), OITO_TIMES);
    expect(lugarNaFila(fila, "i05")).toEqual({ tipo: "fora" });
    expect(fila.titulares).not.toContain("i05");
    expect(fila.titulares).toHaveLength(40);
    expect(lugarNaFila(fila, "i41")).toEqual({ tipo: "titular" });
    expect(lugarNaFila(fila, "i42")).toEqual({ tipo: "reserva", posicao: 1, manual: false });
  });

  it("organizador excluído também sai (não ocupa vaga de organizador)", () => {
    const fila = montarFila(
      inscritos(41, (n) => (n === 41 ? { organizador: true, situacao: "excluido" } : {})),
      OITO_TIMES,
    );
    expect(lugarNaFila(fila, "i41")).toEqual({ tipo: "fora" });
    expect(fila.titulares).toEqual(inscritos(40).map((i) => i.id));
    expect(fila.reservas).toEqual([]);
  });

  it("excluído não perde a vaga por falta de pagamento: já está fora", () => {
    const motivo = motivoParaManterAVaga(
      {
        lugar: { tipo: "titular" },
        organizador: false,
        situacao: "excluido",
        pagamento: { estado: "aguardando", vence_em: PRAZO },
      },
      Date.parse("2026-11-02T12:00:00Z"),
    );
    expect(motivo).toMatch(/fora/);
  });
});

describe("previsão para quem se inscreve agora (D2)", () => {
  it("vagas cheias: reserva, na posição depois dos que podem ser chamados (sobra não conta)", () => {
    const fila = montarFila(inscritos(33, (n) => (n === 1 ? { situacao: "sobra" } : {})), CONFIG);
    // 32 chamáveis: 30 titulares + 2 na fila (e o i01 em sobra, manual).
    expect(previsaoParaNovaInscricao(fila)).toEqual({ tipo: "reserva", posicao: 3 });
  });

  it("ainda há vaga: titular", () => {
    expect(previsaoParaNovaInscricao(montarFila(inscritos(29), CONFIG))).toEqual({ tipo: "titular" });
  });
});

describe("prazo de quem é chamado (D3 e D4)", () => {
  it("antes de 31/10: o prazo da edição", () => {
    const agora = Date.parse("2026-10-25T15:00:00Z");
    expect(prazoDoChamado({ prazo_pagamento_ate: PRAZO, prazo_pagamento_dias: 14 }, agora)).toBe(
      "2026-11-01T02:59:59.000Z",
    );
  });

  it("depois do prazo: agora + 48 horas", () => {
    const agora = Date.parse("2026-11-03T10:00:00Z");
    expect(prazoDoChamado({ prazo_pagamento_ate: PRAZO, prazo_pagamento_dias: 14 }, agora)).toBe(
      "2026-11-05T10:00:00.000Z",
    );
  });

  it("sem prazo da edição: o comportamento antigo, em dias", () => {
    const agora = Date.parse("2026-10-22T00:00:00Z");
    expect(prazoDoChamado({ prazo_pagamento_ate: null, prazo_pagamento_dias: 14 }, agora)).toBe(
      "2026-11-05T00:00:00.000Z",
    );
  });
});

describe("quem pode perder a vaga por falta de pagamento (D5)", () => {
  const depois = Date.parse("2026-11-01T12:00:00Z");
  const titular = { tipo: "titular" } as const;
  const base = {
    lugar: titular,
    organizador: false,
    situacao: "pendente",
    pagamento: { estado: "aguardando", vence_em: PRAZO },
  };

  it("titular «aguardando» com o prazo vencido: pode", () => {
    expect(motivoParaManterAVaga(base, depois)).toBeNull();
    expect(perdeuOPrazo(base, depois)).toBe(true);
  });

  it.each([
    ["organizador (isento)", { organizador: true }, /Organizador/],
    ["declarado (confira o extrato)", { pagamento: { estado: "declarado", vence_em: PRAZO } }, /declarou/],
    ["pago", { pagamento: { estado: "pago", vence_em: PRAZO } }, /não está em aberto/],
    ["reserva", { lugar: { tipo: "reserva", posicao: 1, manual: false } }, /Só titular/],
    ["já desistente", { situacao: "desistiu" }, /fora/],
  ] as const)("%s: não pode", (_rotulo, troca, motivo) => {
    expect(motivoParaManterAVaga({ ...base, ...troca } as typeof base, depois)).toMatch(motivo);
  });

  it("antes de vencer: não pode", () => {
    expect(motivoParaManterAVaga(base, Date.parse("2026-10-31T20:00:00Z"))).toMatch(/ainda não venceu/);
  });
});

describe("reserva com dinheiro (D2)", () => {
  it("pago ou declarado: a devolver se não jogar; aguardando, não", () => {
    const reserva = { tipo: "reserva", posicao: 1, manual: false } as const;
    expect(reservaADevolverSeNaoJogar(reserva, "pago")).toBe(true);
    expect(reservaADevolverSeNaoJogar(reserva, "declarado")).toBe(true);
    expect(reservaADevolverSeNaoJogar(reserva, "aguardando")).toBe(false);
    expect(reservaADevolverSeNaoJogar({ tipo: "titular" }, "pago")).toBe(false);
  });
});
