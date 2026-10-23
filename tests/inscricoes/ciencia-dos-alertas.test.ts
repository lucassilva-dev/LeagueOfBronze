import { describe, expect, it } from "vitest";

import {
  ALERTAS_DO_CAIXA,
  CODIGOS_DO_ALERTA,
  alertasDoInscrito,
  cienciaDoAlerta,
  escopoDaCiencia,
  lerAlertasCientes,
  separarPorCiencia,
  type InscritoParaAlerta,
} from "@/lib/inscricoes/alertas";

/**
 * «Dar ciência» dos alertas (pedido do Lucas, 2026-10-23): "hoje a gente não consegue tirar
 * essa pendência". A regra é uma função pura — código E texto iguais = ciente — e a tela, a
 * rota e o caixa chamam a mesma.
 */

const CIENCIA = { por: "lucas", em: "2026-10-23T13:00:00.000Z" };

function inscrito(over: Partial<InscritoParaAlerta> = {}): InscritoParaAlerta {
  return {
    id: "a",
    riot_id: "Fulano#BR1",
    situacao: "pendente",
    organizador: false,
    elo_declarado: "Diamante",
    elo_verificado: null,
    elo_riot: "Esmeralda",
    ...over,
  };
}

const alertasDe = (i: InscritoParaAlerta) =>
  alertasDoInscrito({
    inscrito: i,
    conferencias: [],
    pagamento: null,
    config: { inicio_campeonato: null, min_ranqueadas: 5 },
    agoraMs: Date.parse("2026-10-23T13:00:00.000Z"),
  });

describe("cienciaDoAlerta: vale enquanto o alerta disser a mesma coisa", () => {
  it("o exemplo do Lucas: «Declarou Diamante; a Riot mostra Esmeralda» aceito para de contar", () => {
    const [alerta] = alertasDe(inscrito());
    expect(alerta).toEqual({ codigo: "declarou_diferente", texto: "Declarou Diamante; a Riot mostra Esmeralda." });
    const cientes = { declarou_diferente: { texto: alerta!.texto, ...CIENCIA } };
    expect(cienciaDoAlerta(alerta!, cientes)).toEqual({ texto: alerta!.texto, ...CIENCIA });
    expect(separarPorCiencia([alerta!], cientes)).toEqual({
      pendentes: [],
      comCiencia: [{ alerta, ciencia: { texto: alerta!.texto, ...CIENCIA } }],
    });
  });

  it("a Riot passou a mostrar Platina: outro texto, o alerta volta a contar sozinho", () => {
    const [antes] = alertasDe(inscrito());
    const cientes = { declarou_diferente: { texto: antes!.texto, ...CIENCIA } };
    const depois = alertasDe(inscrito({ elo_riot: "Platina" }));
    expect(depois.map((a) => a.texto)).toEqual(["Declarou Diamante; a Riot mostra Platina."]);
    expect(cienciaDoAlerta(depois[0]!, cientes)).toBeNull();
    expect(separarPorCiencia(depois, cientes).pendentes).toEqual(depois);
  });

  it("outro nick: a ciência do «Trocou de Riot ID» antigo não cobre o novo", () => {
    const [antes] = alertasDe(inscrito({ elo_riot: null, riot_id_atual: "Fulano2#BR1" }));
    const cientes = { nick_trocado: { texto: antes!.texto, ...CIENCIA } };
    const [depois] = alertasDe(inscrito({ elo_riot: null, riot_id_atual: "Fulano3#BR1" }));
    expect(depois!.codigo).toBe("nick_trocado");
    expect(cienciaDoAlerta(antes!, cientes)).not.toBeNull();
    expect(cienciaDoAlerta(depois!, cientes)).toBeNull();
  });

  it("o mesmo texto com outro código não é ciente (a chave é o código)", () => {
    const cientes = { erro_riot: { texto: "Declarou Diamante; a Riot mostra Esmeralda.", ...CIENCIA } };
    expect(cienciaDoAlerta({ codigo: "declarou_diferente", texto: "Declarou Diamante; a Riot mostra Esmeralda." }, cientes)).toBeNull();
  });

  it("separa na ordem de `alertasDoInscrito`: só o aceito sai dos que contam", () => {
    const alertas = alertasDe(inscrito({ riot_id_atual: "Outro#BR1" }));
    expect(alertas.map((a) => a.codigo)).toEqual(["nick_trocado", "declarou_diferente"]);
    const { pendentes, comCiencia } = separarPorCiencia(alertas, {
      declarou_diferente: { texto: alertas[1]!.texto, ...CIENCIA },
    });
    expect(pendentes.map((a) => a.codigo)).toEqual(["nick_trocado"]);
    expect(comCiencia.map((c) => c.alerta.codigo)).toEqual(["declarou_diferente"]);
  });
});

describe("lerAlertasCientes: o banco sem a coluna (ou com lixo) não quebra nada", () => {
  it("ausente, nulo, lista ou texto viram {} — nenhum alerta tem ciência", () => {
    for (const valor of [undefined, null, [], "x", 3, true]) expect(lerAlertasCientes(valor)).toEqual({});
    const [alerta] = alertasDe(inscrito());
    expect(separarPorCiencia([alerta!], undefined)).toEqual({ pendentes: [alerta], comCiencia: [] });
  });

  it("entrada incompleta ou de código desconhecido é ignorada", () => {
    expect(
      lerAlertasCientes({
        declarou_diferente: { texto: "x", por: "lucas" },
        nick_trocado: { texto: "y", por: "lucas", em: "2026-10-23T13:00:00.000Z", extra: 1 },
        codigo_que_nao_existe: { texto: "z", ...CIENCIA },
      }),
    ).toEqual({ nick_trocado: { texto: "y", por: "lucas", em: "2026-10-23T13:00:00.000Z" } });
  });

  it("nada vem do protótipo: `constructor`/`toString` não viram ciência", () => {
    expect(lerAlertasCientes(Object.create({ declarou_diferente: { texto: "x", ...CIENCIA } }))).toEqual({});
  });
});

describe("escopoDaCiencia: o caixa é do financeiro, o resto da conferência", () => {
  it("os cinco do caixa pedem inscricoes:financeiro", () => {
    expect([...ALERTAS_DO_CAIXA].sort()).toEqual(
      ["apto_sem_pagamento", "desistiu_com_pagamento", "organizador_cobrado", "recusado_declarado", "recusado_pago"].sort(),
    );
    for (const codigo of ALERTAS_DO_CAIXA) expect(escopoDaCiencia(codigo)).toBe("inscricoes:financeiro");
  });

  it("todos os outros pedem inscricoes:conferir (inclusive os da fila de reserva)", () => {
    const outros = CODIGOS_DO_ALERTA.filter((c) => !ALERTAS_DO_CAIXA.has(c));
    expect(outros).toContain("declarou_diferente");
    expect(outros).toContain("prazo_vencido");
    for (const codigo of outros) expect(escopoDaCiencia(codigo)).toBe("inscricoes:conferir");
  });
});
