import { describe, expect, it } from "vitest";

import { fecharCaixa, panorama, type Inscricao, type Pagamento } from "@/lib/inscricoes/store";
import type { EstadoPagamento } from "@/lib/inscricoes/schema";

const TAXA = 2000; // R$ 20,00 em centavos

function pagamento(estado: EstadoPagamento, valor = TAXA): Pagamento {
  return {
    inscricao_id: `p-${estado}-${valor}-${Math.random()}`,
    estado,
    valor_centavos: valor,
    declarado_em: null,
    conferido_por: null,
    conferido_em: null,
    vence_em: null,
  };
}

function inscrito(situacao: Inscricao["situacao"], pontos = 3): Inscricao {
  return {
    id: `i-${situacao}-${Math.random()}`,
    criado_em: "2026-08-01T00:00:00.000Z",
    nick: "Fulano",
    tag: "BR1",
    riot_id: "Fulano#BR1",
    nome_real: null,
    email: "fulano@exemplo.com",
    discord: "fulano",
    whatsapp: null,
    elo_declarado: "Ouro",
    elo_verificado: null,
    elo_congelado: null,
    pontos,
    rota_primaria: "MID",
    rota_secundaria: "TOP",
    quer_capitao: false,
    entrou_no_grupo: null,
    situacao,
    organizador: false,
    observacao: null,
  };
}

describe("caixa da edição", () => {
  it("NÃO desconta o estorno duas vezes — o estado é exclusivo", () => {
    // 10 pagaram; 1 foi recusado e devolvido. Quem foi estornado deixou de ser
    // "pago", então subtrair o estorno de um total que já não o continha tirava
    // R$ 20 a mais da premiação.
    const pagamentos = [...Array(9).fill(null).map(() => pagamento("pago")), pagamento("estornado")];

    const caixa = fecharCaixa(pagamentos);

    expect(caixa.recebido).toBe(10 * TAXA); // os 10 que um dia entraram
    expect(caixa.estornado).toBe(TAXA);
    expect(caixa.arrecadado).toBe(9 * TAXA); // R$ 180,00, e não R$ 160,00
    expect(caixa.emCaixa).toBe(9 * TAXA);
  });

  it("o estorno ainda não pago continua na conta, mas fora da premiação", () => {
    const caixa = fecharCaixa([pagamento("pago"), pagamento("pago"), pagamento("estorno_devido")]);

    expect(caixa.emCaixa).toBe(3 * TAXA); // o dinheiro está fisicamente lá
    expect(caixa.aDevolver).toBe(TAXA);
    expect(caixa.arrecadado).toBe(2 * TAXA); // mas só R$ 40,00 é da organização
  });

  it("isento não entra em lugar nenhum do dinheiro", () => {
    const caixa = fecharCaixa([pagamento("pago"), pagamento("isento")]);

    expect(caixa.isento).toBe(TAXA);
    expect(caixa.recebido).toBe(TAXA);
    expect(caixa.arrecadado).toBe(TAXA);
  });

  it("a identidade fecha: recebido − estornado − a devolver = arrecadado", () => {
    const caixa = fecharCaixa([
      pagamento("pago"),
      pagamento("pago"),
      pagamento("estornado"),
      pagamento("estorno_devido"),
      pagamento("aguardando"),
      pagamento("declarado"),
      pagamento("isento"),
      pagamento("cancelado"),
    ]);

    expect(caixa.recebido - caixa.estornado - caixa.aDevolver).toBe(caixa.arrecadado);
    expect(caixa.aReceber).toBe(2 * TAXA);
  });
});

describe("panorama", () => {
  const config = { jogadores_por_time: 5 };

  it("marcar quem sobrou não muda a conta — sobra continua sendo aprovado", () => {
    // 47 aprovados dão 9 times e 2 sobrando. Se "sobra" saísse da contagem de
    // aprovados, carimbar os 2 devolveria 45 → 9 times e 0 sobrando, e o painel
    // passaria a dizer que ninguém ficou de fora.
    const antes = panorama(Array.from({ length: 47 }, () => inscrito("apto")), [], config);
    expect(antes).toMatchObject({ aprovados: 47, times: 9, vagas: 45, sobra: 2 });

    const depois = panorama(
      [...Array.from({ length: 45 }, () => inscrito("apto")), inscrito("sobra"), inscrito("sobra")],
      [],
      config,
    );
    expect(depois).toMatchObject({ aprovados: 47, times: 9, vagas: 45, sobra: 2 });
  });

  it("recusado e desistente ficam de fora da divisão", () => {
    const p = panorama(
      [
        ...Array.from({ length: 10 }, () => inscrito("apto")),
        inscrito("recusado"),
        inscrito("desistiu"),
        inscrito("pendente"),
      ],
      [],
      config,
    );

    expect(p).toMatchObject({ inscritos: 13, aprovados: 10, pendentes: 1, recusados: 1, times: 2 });
  });
});
