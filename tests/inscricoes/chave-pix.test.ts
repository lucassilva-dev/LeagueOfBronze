import { describe, expect, it } from "vitest";

import { configPatchSchema } from "@/lib/inscricoes/schema";
import { normalizarChavePix, pixDaInscricao } from "@/lib/pix";

/**
 * A chave Pix vai CRUA para dentro do QR (campo 26/01 do BR Code), e o app do banco procura
 * exatamente aquele texto no DICT (INS-06). «(11) 98765-4321» ou «123.456.789-09» geravam
 * um QR que o banco recusava, e «11987654321» sem o +55 era procurado como CPF.
 *
 * Na Configuração, a chave é gravada já no formato do DICT — ou recusada com o motivo. O que
 * é ambíguo nunca é adivinhado.
 */

/** O subcampo 01 (a chave) de dentro do campo 26 do BR Code. */
function chaveNoBrCode(codigo: string): string {
  let i = 0;
  while (i < codigo.length) {
    const id = codigo.slice(i, i + 2);
    const tam = Number(codigo.slice(i + 2, i + 4));
    const valor = codigo.slice(i + 4, i + 4 + tam);
    if (id === "26") {
      let j = 0;
      while (j < valor.length) {
        const sid = valor.slice(j, j + 2);
        const stam = Number(valor.slice(j + 2, j + 4));
        if (sid === "01") return valor.slice(j + 4, j + 4 + stam);
        j += 4 + stam;
      }
    }
    i += 4 + tam;
  }
  return "";
}

const salvar = (chave_pix: string | null) => configPatchSchema.safeParse({ chave_pix });

describe("a chave é gravada no formato do DICT", () => {
  it.each([
    ["123.456.789-09", "12345678909"],
    ["12345678909", "12345678909"],
    ["11.222.333/0001-81", "11222333000181"],
    ["+55 (11) 98765-4321", "+5511987654321"],
    ["+5511987654321", "+5511987654321"],
    ["+55 11 3333-4444", "+551133334444"],
    ["  Fulano.Tal@Exemplo.com ", "fulano.tal@exemplo.com"],
    ["123E4567-E12B-12D1-A456-426655440000", "123e4567-e12b-12d1-a456-426655440000"],
  ])("«%s» vira «%s»", (entrada, gravada) => {
    const r = salvar(entrada);
    expect(r.success).toBe(true);
    expect(r.data?.chave_pix).toBe(gravada);
  });

  it("vazia apaga a chave, como nulo", () => {
    expect(salvar("").data?.chave_pix).toBeNull();
    expect(salvar(null).data?.chave_pix).toBeNull();
  });
});

describe("o que é ambíguo ou errado é recusado, com o motivo", () => {
  it("telefone sem +55 (com ou sem a pontuação comum)", () => {
    for (const chave of ["(11) 98765-4321", "11 98765-4321", "5511987654321"]) {
      const r = salvar(chave);
      expect(r.success).toBe(false);
      expect(r.error?.issues[0]?.message).toMatch(/\+55/);
    }
  });

  it("11 dígitos que não fecham como CPF: não é adivinhado (seria procurado como CPF)", () => {
    expect(normalizarChavePix("11987654321").ok).toBe(false);
    expect(salvar("11987654321").success).toBe(false);
  });

  it("CPF com dígito errado, CNPJ com dígito errado, +55 curto, texto solto", () => {
    for (const chave of ["123.456.789-00", "11.222.333/0001-82", "+55 11 9876", "minha chave", "fulano@", "+1 415 555 0100"]) {
      expect(salvar(chave).success).toBe(false);
    }
  });
});

describe("o QR do Pix", () => {
  it("chave já gravada pontuada (antes da validação) sai normalizada no QR quando dá para normalizar sem chute", () => {
    expect(chaveNoBrCode(pixDaInscricao("123.456.789-09", 2000))).toBe("12345678909");
    expect(chaveNoBrCode(pixDaInscricao("+55 (11) 98765-4321", 2000))).toBe("+5511987654321");
  });

  it("chave no formato certo sai idêntica", () => {
    for (const chave of ["12345678909", "+5511987654321", "fulano@exemplo.com", "123e4567-e12b-12d1-a456-426655440000"]) {
      expect(chaveNoBrCode(pixDaInscricao(chave, 2000))).toBe(chave);
    }
  });

  it("o que não dá para normalizar continua indo como está (nada some da tela)", () => {
    expect(chaveNoBrCode(pixDaInscricao("(11) 98765-4321", 2000))).toBe("(11) 98765-4321");
  });
});
