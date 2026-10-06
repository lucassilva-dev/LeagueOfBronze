import { describe, expect, it } from "vitest";

import { inscricaoEsperaPagamento } from "@/lib/inscricoes/pagamento";

/**
 * Quem vê o Pix (QR, copia e cola) e o botão "JÁ PAGUEI".
 *
 * O caso que motivou: recusar ou registrar desistência mexe só na ficha, e o pagamento
 * fica "aguardando". Sem olhar a situação, quem foi recusado recebia o QR com o valor
 * preenchido — e pagava uma inscrição que a organização teria de estornar.
 */

const ficha = (situacao: string, estado: string | null) => ({
  situacao,
  pagamento: estado === null ? null : { estado },
});

describe("inscricaoEsperaPagamento", () => {
  it("pendente ou aprovado, com o pagamento em aberto: espera", () => {
    expect(inscricaoEsperaPagamento(ficha("pendente", "aguardando"))).toBe(true);
    expect(inscricaoEsperaPagamento(ficha("apto", "aguardando"))).toBe(true);
    expect(inscricaoEsperaPagamento(ficha("sobra", "aguardando"))).toBe(true);
  });

  it("recusado ou desistente não recebe convite para pagar, mesmo com a cobrança em aberto", () => {
    expect(inscricaoEsperaPagamento(ficha("recusado", "aguardando"))).toBe(false);
    expect(inscricaoEsperaPagamento(ficha("desistiu", "aguardando"))).toBe(false);
  });

  it("pagamento já avisado, pago, isento ou cancelado: nada a pagar", () => {
    for (const estado of ["declarado", "pago", "isento", "cancelado", "estorno_devido", "estornado"]) {
      expect(inscricaoEsperaPagamento(ficha("pendente", estado))).toBe(false);
    }
  });

  it("sem registro de pagamento: nada a pagar", () => {
    expect(inscricaoEsperaPagamento(ficha("pendente", null))).toBe(false);
  });
});
