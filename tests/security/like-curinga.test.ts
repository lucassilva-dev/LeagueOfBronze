import { describe, expect, it } from "vitest";

import { normalizarUsuario } from "@/lib/security/admin-store";

/**
 * Regressão de uma classe de defeito que passou por duas correções erradas.
 *
 * A busca do nome de usuário no login precisa ser insensível a maiúsculas. A primeira
 * tentativa usou `ilike`, mas em LIKE o `%` casa com qualquer sequência e o `_` com um
 * caractere: quem se chamasse "ana_b" também encontrava "anaXb". A segunda escapava
 * `\`, `%` e `_` — e ainda errava, porque o PostgREST troca `*` por `%` no servidor,
 * depois do escape, e nenhum escape sobrevive a essa troca.
 *
 * A correção definitiva foi trocar padrão por igualdade, normalizando os dois lados.
 * O que estes testes travam é a propriedade que isso garante: nenhum caractere tem
 * significado especial.
 */
describe("normalizarUsuario", () => {
  it("iguala apenas diferença de caixa e de espaço nas pontas", () => {
    expect(normalizarUsuario("Razeral")).toBe("razeral");
    expect(normalizarUsuario("  RAZERAL  ")).toBe("razeral");
    expect(normalizarUsuario("razeral")).toBe("razeral");
  });

  it("não dá significado a nenhum caractere — é comparação literal", () => {
    // Antes, cada um destes virava padrão: `_` casava com qualquer caractere, `%` e
    // `*` com qualquer sequência. Agora saem exatamente como entraram.
    for (const bruto of ["ana_b", "%", "%@x", "a*b", "a\\b", "100%_certo"]) {
      expect(normalizarUsuario(bruto)).toBe(bruto.toLowerCase());
    }
  });

  it("nomes distintos continuam distintos depois de normalizar", () => {
    // O caso que o `ilike` sem escape confundia.
    expect(normalizarUsuario("ana_b")).not.toBe(normalizarUsuario("anaXb"));
    expect(normalizarUsuario("%")).not.toBe(normalizarUsuario("razeral"));
  });

  it("é idempotente — normalizar duas vezes dá o mesmo", () => {
    for (const bruto of [" Ana_B ", "RAZERAL", "a*b"]) {
      expect(normalizarUsuario(normalizarUsuario(bruto))).toBe(normalizarUsuario(bruto));
    }
  });
});
