import { describe, expect, it } from "vitest";

import { requisitosCumpridos, situacaoSugerida } from "@/lib/inscricoes/situacao";

/**
 * Quando o sistema promove alguém a apto sozinho (decisão do Lucas, 2026-10-06): todos os
 * requisitos cumpridos E pagamento pago ou isento. Nunca rebaixa, nunca recusa.
 */

const AGORA = Date.parse("2026-10-07T12:00:00.000Z");

function itens(estados: Partial<Record<string, string>> = {}) {
  return ["a", "b", "d", "e", "f", "m"].map((item) => ({ item, estado: estados[item] ?? "ok" }));
}

function sugerida(over: Partial<Parameters<typeof situacaoSugerida>[0]> = {}) {
  return situacaoSugerida({
    situacao: "pendente",
    promocaoAutomatica: true,
    conferencias: itens(),
    pagamento: { estado: "pago" },
    inicioCampeonato: null,
    agoraMs: AGORA,
    ...over,
  });
}

describe("situação sugerida", () => {
  it("tudo cumprido e pago: apto", () => {
    expect(sugerida()).toBe("apto");
  });

  it("isento (organizador) também", () => {
    expect(sugerida({ pagamento: { estado: "isento" } })).toBe("apto");
  });

  it("«declarado» NÃO promove — é a palavra do jogador, ninguém viu o extrato", () => {
    expect(sugerida({ pagamento: { estado: "declarado" } })).toBeNull();
    expect(sugerida({ pagamento: { estado: "aguardando" } })).toBeNull();
    expect(sugerida({ pagamento: null })).toBeNull();
  });

  it("exceção conta como cumprido", () => {
    expect(sugerida({ conferencias: itens({ b: "excecao" }) })).toBe("apto");
  });

  it("provisório, risco ou pendente em a/b/d/f/m seguram", () => {
    for (const estado of ["provisorio", "risco", "pendente", "recusado", "nao_avaliavel"]) {
      expect(sugerida({ conferencias: itens({ f: estado }) })).toBeNull();
    }
  });

  it("(e) sem data de início não segura — desde que não esteja em risco", () => {
    expect(sugerida({ conferencias: itens({ e: "pendente" }) })).toBe("apto");
    expect(sugerida({ conferencias: itens({ e: "nao_avaliavel" }) })).toBe("apto");
    expect(sugerida({ conferencias: itens({ e: "risco" }) })).toBeNull();
    expect(sugerida({ conferencias: itens({ e: "recusado" }) })).toBeNull();
  });

  it("(e) depois do início precisa estar cumprido", () => {
    const passou = { inicioCampeonato: "2026-10-01T00:00:00.000Z" };
    expect(sugerida({ ...passou, conferencias: itens({ e: "pendente" }) })).toBeNull();
    expect(sugerida({ ...passou, conferencias: itens({ e: "ok" }) })).toBe("apto");
  });

  it("item faltando (linha que não existe) não é cumprido", () => {
    expect(requisitosCumpridos(itens().filter((c) => c.item !== "b"), null, AGORA)).toBe(false);
  });

  it("só promove quem está pendente — nunca mexe em recusado, desistente, sobra ou apto", () => {
    for (const situacao of ["recusado", "desistiu", "sobra", "apto"]) {
      expect(sugerida({ situacao })).toBeNull();
    }
  });

  it("segurado pela organização (promoção automática desligada): não promove", () => {
    expect(sugerida({ promocaoAutomatica: false })).toBeNull();
  });
});
