import { describe, expect, it, vi } from "vitest";

import {
  alertasDoInscrito,
  assinaturaDoAlerta,
  cienciaDoAlerta,
  lerAlertasCientes,
  pedidoDeCiencia,
  separarPorCiencia,
  type Alerta,
  type CodigoDoAlerta,
  type InscritoParaAlerta,
  type PagamentoParaAlerta,
} from "@/lib/inscricoes/alertas";
import type { LugarNaFila } from "@/lib/inscricoes/fila";

/**
 * A ciência vale pela ASSINATURA do alerta — o texto e os fatos que o disparam —, não só pelo
 * texto (auditoria final, FB-1/FI-1). Nos alertas de texto fixo, um problema novo e diferente
 * chegava com o mesmo código e o mesmo texto e ficava escondido pela ciência dada antes:
 *
 *  - «aprovado com requisito fora de ok/exceção»: a ciência do (A) pendente escondia o (F)
 *    recusado que veio depois;
 *  - «desistiu com pagamento»: a ciência do «só declarou» escondia o Pix que caiu depois;
 *  - «aprovado sem pagamento»: a ciência do «aguardando» combinado escondia o «pago» desfeito
 *    que voltou a «aguardando» — o caso para o qual o alerta existe;
 *  - «prazo vencido»: a ciência de um prazo escondia o prazo seguinte.
 *
 * Ciência gravada antes da assinatura (só código + texto) continua valendo onde o texto já
 * diz tudo, e perde a validade (o alerta volta) onde há fatos fora do texto.
 */

const AGORA = Date.parse("2026-11-05T15:00:00.000Z");
const CONFIG = { inicio_campeonato: null, min_ranqueadas: 5 };
const TITULAR: LugarNaFila = { tipo: "titular" };
const QUEM = { por: "ana", em: "2026-10-23T13:00:00.000Z" };

const TODOS_OK = ["a", "b", "d", "e", "f", "m"].map((item) => ({ item, estado: "ok" }));
const com = (mudancas: Record<string, string>) =>
  TODOS_OK.map((c) => (c.item in mudancas ? { ...c, estado: mudancas[c.item]! } : c));

function inscrito(over: Partial<InscritoParaAlerta> = {}): InscritoParaAlerta {
  return {
    id: "a",
    riot_id: "Fulano#BR1",
    situacao: "apto",
    organizador: false,
    elo_declarado: "Ouro",
    elo_verificado: null,
    ...over,
  };
}

function pagamento(over: Partial<PagamentoParaAlerta> = {}): PagamentoParaAlerta {
  return { estado: "pago", valor_centavos: 2000, declarado_em: null, conferido_em: null, vence_em: null, ...over };
}

function alertas(args: {
  inscrito?: InscritoParaAlerta;
  conferencias?: { item: string; estado: string }[];
  pagamento?: PagamentoParaAlerta | null;
  lugar?: LugarNaFila;
}): Alerta[] {
  return alertasDoInscrito({
    inscrito: args.inscrito ?? inscrito(),
    conferencias: args.conferencias ?? TODOS_OK,
    pagamento: args.pagamento === undefined ? pagamento() : args.pagamento,
    config: CONFIG,
    agoraMs: AGORA,
    lugar: args.lugar,
  });
}

const doCodigo = (lista: Alerta[], codigo: CodigoDoAlerta) => {
  const achado = lista.find((a) => a.codigo === codigo);
  if (!achado) throw new Error(`sem o alerta ${codigo}: ${lista.map((a) => a.codigo).join(", ")}`);
  return achado;
};

/** A ciência como o servidor grava (`darCienciaDoAlerta`): texto, e a assinatura quando vai além dele. */
function cienciaDe(alerta: Alerta) {
  const assinatura = assinaturaDoAlerta(alerta);
  return {
    [alerta.codigo]: { texto: alerta.texto, ...(assinatura !== alerta.texto && { assinatura }), ...QUEM },
  };
}

describe("aprovado com requisito fora de ok/exceção: a ciência é dos ITENS que estavam fora", () => {
  it("ciência com o (A) pendente; o (A) é confirmado e o (F) vira recusado: o alerta volta a contar", () => {
    const antes = doCodigo(alertas({ conferencias: com({ a: "pendente" }) }), "apto_com_requisito");
    const cientes = cienciaDe(antes);
    expect(separarPorCiencia([antes], cientes).pendentes).toEqual([]);

    const depois = doCodigo(alertas({ conferencias: com({ f: "recusado" }) }), "apto_com_requisito");
    expect(depois.texto).toContain("(F) recusado");
    expect(separarPorCiencia([depois], cientes).pendentes).toEqual([depois]);
  });

  it("ciência com o (B) pendente; o (B) fica ok (o alerta some) e o (M) cai para pendente: volta", () => {
    const cientes = cienciaDe(doCodigo(alertas({ conferencias: com({ b: "pendente" }) }), "apto_com_requisito"));
    expect(alertas({}).map((a) => a.codigo)).not.toContain("apto_com_requisito");
    const depois = doCodigo(alertas({ conferencias: com({ m: "pendente" }) }), "apto_com_requisito");
    expect(cienciaDoAlerta(depois, cientes)).toBeNull();
  });

  it("os mesmos itens, nos mesmos estados: a ciência continua valendo", () => {
    const cientes = cienciaDe(doCodigo(alertas({ conferencias: com({ a: "pendente", f: "risco" }) }), "apto_com_requisito"));
    const igual = doCodigo(alertas({ conferencias: com({ a: "pendente", f: "risco" }) }), "apto_com_requisito");
    expect(igual.texto).toBe(
      "Está aprovado, mas há requisito fora de ok/exceção: (A) pendente, (F) risco. Confira e ajuste a situação.",
    );
    expect(cienciaDoAlerta(igual, cientes)).not.toBeNull();
  });

  it("item sem registro também conta como fora, com o nome dito", () => {
    const sem = alertas({ conferencias: TODOS_OK.filter((c) => c.item !== "d") });
    expect(doCodigo(sem, "apto_com_requisito").texto).toContain("(D) sem registro");
  });

  it("ciência antiga (só o texto fixo de antes) não cobre o alerta que agora diz os itens", () => {
    const depois = doCodigo(alertas({ conferencias: com({ f: "recusado" }) }), "apto_com_requisito");
    const antiga = {
      apto_com_requisito: { texto: "Está aprovado, mas há requisito fora de ok/exceção. Confira e ajuste a situação.", ...QUEM },
    };
    expect(cienciaDoAlerta(depois, antiga)).toBeNull();
  });
});

describe("desistiu com pagamento: «declarou» e «pago» são fatos diferentes", () => {
  it("ciência dada quando ele só declarou; o Pix cai depois: o alerta volta a contar", () => {
    const desistente = inscrito({ situacao: "desistiu" });
    const declarou = doCodigo(
      alertas({ inscrito: desistente, pagamento: pagamento({ estado: "declarado", declarado_em: "2026-10-20T12:00:00.000Z" }) }),
      "desistiu_com_pagamento",
    );
    const cientes = cienciaDe(declarou);
    const pagou = doCodigo(
      alertas({
        inscrito: desistente,
        pagamento: pagamento({
          estado: "pago",
          declarado_em: "2026-10-20T12:00:00.000Z",
          conferido_em: "2026-10-24T12:00:00.000Z",
        }),
      }),
      "desistiu_com_pagamento",
    );
    expect(pagou.texto).not.toBe(declarou.texto);
    expect(pagou.texto).toMatch(/^Desistiu com pagamento recebido/);
    expect(separarPorCiencia([pagou], cientes).pendentes).toEqual([pagou]);
  });
});

describe("aprovado sem pagamento: o «pago» desfeito não fica escondido pela ciência do «aguardando»", () => {
  const combinado = pagamento({ estado: "aguardando" });
  // O «pago» carimba conferido_em; voltar a «aguardando» não apaga o carimbo (atualizarPagamento).
  const desfeito = pagamento({ estado: "aguardando", conferido_em: "2026-10-25T18:00:00.123456+00:00" });

  it("o texto é o mesmo, mas a assinatura não: a ciência de antes não vale", () => {
    const antes = doCodigo(alertas({ pagamento: combinado, lugar: TITULAR }), "apto_sem_pagamento");
    const cientes = cienciaDe(antes);
    expect(alertas({ pagamento: pagamento({ estado: "pago", conferido_em: "2026-10-25T18:00:00.123456+00:00" }), lugar: TITULAR }).map((a) => a.codigo)).not.toContain(
      "apto_sem_pagamento",
    );
    const depois = doCodigo(alertas({ pagamento: desfeito, lugar: TITULAR }), "apto_sem_pagamento");
    expect(depois.texto).toBe(antes.texto);
    expect(assinaturaDoAlerta(depois)).not.toBe(assinaturaDoAlerta(antes));
    expect(separarPorCiencia([depois], cientes).pendentes).toEqual([depois]);
  });

  it("nada mudou no pagamento: a ciência continua valendo (o mesmo instante escrito com outro fuso é o mesmo)", () => {
    const cientes = cienciaDe(doCodigo(alertas({ pagamento: desfeito, lugar: TITULAR }), "apto_sem_pagamento"));
    const mesmoInstante = pagamento({ estado: "aguardando", conferido_em: "2026-10-25T15:00:00.123-03:00" });
    expect(cienciaDoAlerta(doCodigo(alertas({ pagamento: mesmoInstante, lugar: TITULAR }), "apto_sem_pagamento"), cientes)).not.toBeNull();
  });

  it("a assinatura não depende do `Date.parse` do navegador (o Safari não lê microssegundos)", () => {
    const doServidor = doCodigo(alertas({ pagamento: desfeito, lugar: TITULAR }), "apto_sem_pagamento");
    const parse = vi.spyOn(Date, "parse").mockReturnValue(NaN);
    try {
      const daTela = doCodigo(alertas({ pagamento: desfeito, lugar: TITULAR }), "apto_sem_pagamento");
      expect(assinaturaDoAlerta(daTela)).toBe(assinaturaDoAlerta(doServidor));
      expect(daTela.fatos).toContain("conferido 2026-10-25T18:00:00.123Z");
    } finally {
      parse.mockRestore();
    }
  });

  it("ciência gravada antes da assinatura (só o texto): perde a validade — lado seguro", () => {
    const alerta = doCodigo(alertas({ pagamento: combinado, lugar: TITULAR }), "apto_sem_pagamento");
    expect(cienciaDoAlerta(alerta, { apto_sem_pagamento: { texto: alerta.texto, ...QUEM } })).toBeNull();
  });
});

describe("prazo vencido: a ciência é DAQUELE prazo", () => {
  it("ciência do prazo de 31/10; chamado de novo, perde o prazo de 48 h: volta, com a hora no texto", () => {
    const primeiro = doCodigo(
      alertas({ inscrito: inscrito({ situacao: "pendente" }), pagamento: pagamento({ estado: "aguardando", vence_em: "2026-11-01T02:59:59.000Z" }), lugar: TITULAR }),
      "prazo_vencido",
    );
    expect(primeiro.texto).toContain("(venceu 31/10)");
    const cientes = cienciaDe(primeiro);
    const segundo = doCodigo(
      alertas({ inscrito: inscrito({ situacao: "pendente" }), pagamento: pagamento({ estado: "aguardando", vence_em: "2026-11-04T18:37:00.000Z" }), lugar: TITULAR }),
      "prazo_vencido",
    );
    expect(segundo.texto).toContain("(venceu 04/11 às 15:37)");
    expect(cienciaDoAlerta(segundo, cientes)).toBeNull();
  });
});

describe("ciência gravada antes da assinatura, onde o texto já diz tudo: continua valendo", () => {
  it("«Declarou Ouro; a Riot mostra Diamante»: a assinatura é o próprio texto", () => {
    const alerta = doCodigo(
      alertas({ inscrito: inscrito({ situacao: "pendente", elo_riot: "Diamante" }), pagamento: null }),
      "declarou_diferente",
    );
    expect(alerta.fatos).toBeUndefined();
    expect(assinaturaDoAlerta(alerta)).toBe(alerta.texto);
    expect(cienciaDoAlerta(alerta, { declarou_diferente: { texto: alerta.texto, ...QUEM } })).not.toBeNull();
  });

  it("os alertas de dinheiro e de prazo têm fatos; os de Riot e de elo, não", () => {
    const comFatos = new Set<CodigoDoAlerta>();
    const lista = [
      ...alertas({ inscrito: inscrito({ situacao: "desistiu" }), pagamento: pagamento({ estado: "pago" }) }),
      ...alertas({ inscrito: inscrito({ situacao: "recusado" }), pagamento: pagamento({ estado: "declarado" }) }),
      ...alertas({ inscrito: inscrito({ organizador: true, situacao: "pendente" }), pagamento: pagamento({ estado: "aguardando" }) }),
      ...alertas({ pagamento: pagamento({ estado: "aguardando" }) }),
      ...alertas({
        inscrito: inscrito({ situacao: "pendente", riot_status: "riot_id_inexistente", riot_id_atual: "Outro#BR1" }),
        pagamento: pagamento({ estado: "pago" }),
        lugar: { tipo: "reserva", posicao: 1, manual: false },
      }),
    ];
    for (const a of lista) if (a.fatos) comFatos.add(a.codigo);
    expect([...comFatos].sort()).toEqual(
      ["apto_sem_pagamento", "desistiu_com_pagamento", "organizador_cobrado", "recusado_declarado", "reserva_com_pagamento"].sort(),
    );
    expect(lista.find((a) => a.codigo === "riot_id_inexistente")?.fatos).toBeUndefined();
    expect(lista.find((a) => a.codigo === "nick_trocado")?.fatos).toBeUndefined();
  });
});

describe("a coluna e o pedido da tela", () => {
  it("lerAlertasCientes guarda a assinatura (e só se for texto)", () => {
    expect(
      lerAlertasCientes({
        apto_sem_pagamento: { texto: "t", assinatura: "t\n[x]", ...QUEM },
        recusado_pago: { texto: "r", assinatura: 3, ...QUEM },
      }),
    ).toEqual({
      apto_sem_pagamento: { texto: "t", assinatura: "t\n[x]", ...QUEM },
      recusado_pago: { texto: "r", ...QUEM },
    });
  });

  it("pedidoDeCiencia manda a assinatura só quando ela vai além do texto", () => {
    const declarou = doCodigo(
      alertas({ inscrito: inscrito({ situacao: "pendente", elo_riot: "Diamante" }), pagamento: null }),
      "declarou_diferente",
    );
    expect(pedidoDeCiencia("id", declarou)).toEqual({ inscricaoId: "id", codigo: "declarou_diferente", texto: declarou.texto });
    const caixa = doCodigo(alertas({ pagamento: pagamento({ estado: "aguardando" }) }), "apto_sem_pagamento");
    expect(pedidoDeCiencia("id", caixa)).toEqual({
      inscricaoId: "id",
      codigo: "apto_sem_pagamento",
      texto: caixa.texto,
      assinatura: assinaturaDoAlerta(caixa),
    });
  });
});
