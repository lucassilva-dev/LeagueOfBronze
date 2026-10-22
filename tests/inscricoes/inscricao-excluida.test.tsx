// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { DadosEdicao, Inscrito } from "@/components/admin/e4/painel-edicao";
import { SecaoInscritos } from "@/components/admin/e4/secao-inscritos";
import { alertasDoInscrito } from "@/lib/inscricoes/alertas";
import { foraDaCobranca, inscricaoEsperaPagamento } from "@/lib/inscricoes/pagamento";
import { contaParaTimes, fichaPatchSchema } from "@/lib/inscricoes/schema";
import { panorama, type Pagamento } from "@/lib/inscricoes/store";

/**
 * "Excluir" um inscrito (pedido do Lucas, 22/10): apagar sem apagar. A linha continua no
 * banco, mas some da lista de Inscritos — só o filtro «Excluído» a mostra — e sai de toda
 * conta: times, caixa e robô da Riot.
 */

afterEach(cleanup);

// `disponibilidade` obrigatória: o mesmo objeto serve à tela (Inscrito) e ao servidor (Inscricao).
function inscrito(id: string, nick: string, situacao: Inscrito["situacao"]): Inscrito & { disponibilidade: string[] } {
  return {
    id,
    criado_em: "2026-10-05T12:00:00.000Z",
    nick,
    tag: "BR1",
    riot_id: `${nick}#BR1`,
    nome_real: `${nick} da Silva`,
    email: `${id}@exemplo.com`,
    discord: id,
    whatsapp: null,
    elo_declarado: "Ouro",
    elo_verificado: null,
    elo_congelado: null,
    pontos: 4,
    rota_primaria: "MID",
    rota_secundaria: "TOP",
    disponibilidade: ["noite"],
    quer_capitao: false,
    entrou_no_grupo: null,
    situacao,
    organizador: false,
    observacao: null,
  };
}

function pagamento(inscricaoId: string, estado: Pagamento["estado"]): Pagamento {
  return {
    inscricao_id: inscricaoId,
    estado,
    valor_centavos: 3000,
    declarado_em: null,
    conferido_por: null,
    conferido_em: null,
    vence_em: null,
    observacao: null,
  };
}

describe("regras do excluído", () => {
  it("a ficha aceita a situação «excluido»", () => {
    const r = fichaPatchSchema.safeParse({ inscricaoId: "6628023c-c2cf-45df-9ed3-08ae23a55e4a", situacao: "excluido" });
    expect(r.success).toBe(true);
  });

  it("não conta para times nem é cobrado", () => {
    expect(contaParaTimes("excluido")).toBe(false);
    expect(foraDaCobranca("excluido", "aguardando")).toBe(true);
    expect(inscricaoEsperaPagamento({ situacao: "excluido", pagamento: { estado: "aguardando" } })).toBe(false);
  });

  it("sai do total de inscritos, dos elegíveis e do «a receber» — e ganha o próprio número", () => {
    const lista = [inscrito("1", "Fica", "pendente"), inscrito("2", "Sai", "excluido"), inscrito("3", "Nao", "recusado")];
    const p = panorama(
      lista,
      [pagamento("1", "aguardando"), pagamento("2", "aguardando"), pagamento("3", "aguardando")],
      { jogadores_por_time: 5, max_times: null },
    );
    expect(p.inscritos).toBe(1);
    expect(p.elegiveis).toBe(1);
    expect(p.excluidos).toBe(1);
    expect(p.recusados).toBe(1);
    expect(p.caixa.aReceber).toBe(3000);
  });

  it("excluído com pagamento recebido pede a devolução, como o recusado", () => {
    const alertas = alertasDoInscrito({
      inscrito: inscrito("2", "Sai", "excluido"),
      conferencias: [],
      pagamento: { estado: "pago" },
      config: { inicio_campeonato: null, min_ranqueadas: 5 },
      agoraMs: Date.parse("2026-10-22T12:00:00Z"),
    });
    expect(alertas).toContainEqual(
      expect.objectContaining({ codigo: "recusado_pago", acaoPagamento: "estorno_devido" }),
    );
    expect(alertas.find((a) => a.codigo === "recusado_pago")?.texto).toMatch(/^Excluído/);
  });
});

describe("lista de Inscritos", () => {
  const LISTA = [inscrito("1", "Fica", "pendente"), inscrito("2", "Harkasxy", "excluido"), inscrito("3", "Barrado", "recusado")];

  const dados: DadosEdicao = {
    config: {
      nome: "4ª Edição",
      abertura_inscricoes: "2026-10-05T12:13:35.000Z",
      fechamento_inscricoes: null,
      prazo_vinculo_riot: null,
      congelamento_elo: null,
      data_draft: null,
      inicio_campeonato: null,
      inscricoes_abertas: true,
      jogadores_por_time: 5,
      orcamento_por_time: 30,
      min_ranqueadas: 5,
      dias_no_grupo: 60,
      prazo_pagamento_dias: 14,
      segundos_por_escolha: 60,
      taxa_centavos: 3000,
      pct_campeao: 70,
      chave_pix: null,
      responsavel_financeiro: null,
    },
    inscritos: LISTA,
    conferencias: [],
    pagamentos: [],
    panorama: {
      inscritos: 1,
      elegiveis: 1,
      aprovados: 0,
      pendentes: 1,
      recusados: 1,
      excluidos: 1,
      times: 0,
      vagas: 0,
      sobra: 1,
      caixa: { recebido: 0, estornado: 0, aDevolver: 0, emCaixa: 0, arrecadado: 0, aReceber: 0, isento: 0 },
    },
    auditoria: [],
  };

  const props = {
    executar: vi.fn(async () => true) as never,
    ocupado: false,
    podeConferir: true,
    podeFinanceiro: true,
    podeConfigurar: true,
  };

  const naTela = () =>
    [...document.querySelectorAll<HTMLElement>('[id^="inscrito-"]')].map((el) => el.textContent!.replace("#BR1", ""));

  it("em «Todas» o excluído some — o recusado continua", () => {
    render(<SecaoInscritos {...props} dados={dados} />);
    expect(naTela()).toEqual(["Fica", "Barrado"]);
    // O total também não conta o excluído — senão a tela denuncia quem foi apagado.
    expect(screen.getByText(/Mostrando 2 de 2\./)).toBeTruthy();
  });

  it("o filtro «Excluído» mostra só ele, com a contagem na opção", () => {
    render(<SecaoInscritos {...props} dados={dados} />);
    const filtro = screen.getByRole("combobox", { name: "Filtrar por situação" });
    expect(screen.getByRole("option", { name: "Excluído (1)" })).toBeTruthy();
    fireEvent.change(filtro, { target: { value: "excluido" } });
    expect(naTela()).toEqual(["Harkasxy"]);
  });

  it("na gaveta, escolher «Excluído» e salvar grava a situação com a trava da que a tela viu", async () => {
    const executar = vi.fn(async () => true);
    render(<SecaoInscritos {...props} executar={executar as never} dados={dados} />);
    fireEvent.click(document.getElementById("inscrito-3")!);
    fireEvent.click(screen.getByRole("radio", { name: "Excluído" }));
    expect(screen.getByRole("alert").textContent).toMatch(/some da lista de inscritos/);
    fireEvent.click(screen.getByRole("button", { name: "Salvar tudo" }));
    await vi.waitFor(() => expect(executar).toHaveBeenCalled());
    expect(executar).toHaveBeenCalledWith("inscrito", {
      inscricaoId: "3",
      ficha: { situacao: "excluido", situacaoAnterior: "recusado" },
    });
  });
});
