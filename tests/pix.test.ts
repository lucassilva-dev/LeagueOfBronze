import QRCode from "qrcode";
import { describe, expect, it } from "vitest";

import { crc16, pixCopiaECola, pixDaInscricao } from "@/lib/pix";

/**
 * O "Pix copia e cola" tem de ser lido por QUALQUER app de banco — um caractere fora do
 * lugar e o código vira "QR inválido" na mão de quem vai pagar. A prova de que a conta
 * está certa é bater com o exemplo oficial do manual do Banco Central.
 */

/** Exemplo do "Manual de Padrões para Iniciação do Pix" (BCB): chave aleatória, sem valor. */
const EXEMPLO_BCB =
  "00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-4266554400005204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***63041D3D";

/** Lê o código de volta campo a campo, como um leitor de QR faria. */
function campos(codigo: string): Map<string, string> {
  const mapa = new Map<string, string>();
  let i = 0;
  while (i < codigo.length) {
    const id = codigo.slice(i, i + 2);
    const tamanho = Number(codigo.slice(i + 2, i + 4));
    mapa.set(id, codigo.slice(i + 4, i + 4 + tamanho));
    i += 4 + tamanho;
  }
  return mapa;
}

describe("BR Code do Pix", () => {
  it("reproduz o exemplo oficial do Banco Central, CRC incluído", () => {
    expect(
      pixCopiaECola({
        chave: "123e4567-e12b-12d1-a456-426655440000",
        nomeRecebedor: "Fulano de Tal",
        cidade: "BRASILIA",
      }),
    ).toBe(EXEMPLO_BCB);
  });

  it("o CRC confere com o do exemplo oficial", () => {
    expect(crc16(EXEMPLO_BCB.slice(0, -4))).toBe("1D3D");
  });

  it("o Pix da inscrição leva a chave, os R$ 30,00 e fecha a conta do CRC", () => {
    const codigo = pixDaInscricao("97f2ba4a-cd26-4639-92ba-94a65a7d4eaa", 3000);
    const lido = campos(codigo);

    expect(lido.get("00")).toBe("01");
    expect(campos(lido.get("26")!).get("00")).toBe("br.gov.bcb.pix");
    expect(campos(lido.get("26")!).get("01")).toBe("97f2ba4a-cd26-4639-92ba-94a65a7d4eaa");
    expect(lido.get("53")).toBe("986");
    expect(lido.get("54")).toBe("30.00");
    expect(lido.get("58")).toBe("BR");
    expect(lido.get("63")).toBe(crc16(codigo.slice(0, -4)));
    // Os campos encaixam do começo ao fim: nenhum tamanho declarado está errado.
    expect([...lido.keys()].join(",")).toBe("00,26,52,53,54,58,59,60,62,63");
  });

  it("acentos e textos longos não desalinham os campos", () => {
    const codigo = pixCopiaECola({
      chave: "fulano@exemplo.com",
      valorCentavos: 1999,
      descricao: "Inscrição — 4ª Edição",
      nomeRecebedor: "Organização dos Bronzes com um nome comprido demais",
      cidade: "São José dos Campos do Norte",
    });
    const lido = campos(codigo);
    expect(lido.get("59")).toBe("Organizacao dos Bronzes c");
    expect(lido.get("60")).toBe("Sao Jose dos Ca");
    expect(lido.get("54")).toBe("19.99");
    expect(campos(lido.get("26")!).get("02")).toBe("Inscricao 4a Edicao");
    expect(/^[\x20-\x7E]+$/.test(codigo)).toBe(true);
    expect(lido.get("63")).toBe(crc16(codigo.slice(0, -4)));
  });

  it("recusa valor quebrado, negativo ou zero — viraria um Pix que o banco recusa", () => {
    const base = { chave: "x@y.com", nomeRecebedor: "A", cidade: "B" };
    expect(() => pixCopiaECola({ ...base, valorCentavos: 0 })).toThrow();
    expect(() => pixCopiaECola({ ...base, valorCentavos: -100 })).toThrow();
    expect(() => pixCopiaECola({ ...base, valorCentavos: 10.5 })).toThrow();
  });

  it("recusa chave vazia", () => {
    expect(() => pixCopiaECola({ chave: "  ", nomeRecebedor: "A", cidade: "B" })).toThrow();
  });

  it("cabe num QR code", () => {
    const qr = QRCode.create(pixDaInscricao("97f2ba4a-cd26-4639-92ba-94a65a7d4eaa", 3000), {
      errorCorrectionLevel: "M",
    });
    expect(qr.modules.size).toBeGreaterThan(20);
  });
});
