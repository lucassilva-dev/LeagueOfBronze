// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  PainelEdicao,
  type DadosEdicao,
  type EdicaoConfig,
  type Inscrito,
  type Pagamento,
} from "@/components/admin/e4/painel-edicao";
import { SecaoConfiguracao } from "@/components/admin/e4/secao-configuracao";
import { SecaoPagamentos } from "@/components/admin/e4/secao-pagamentos";
import { SecaoTimes } from "@/components/admin/e4/secao-times";
import { ModoCompacto } from "@/components/admin/responsivo";

/**
 * A aba Pagamentos (e o que a Configuração e Times dizem sobre o mesmo dinheiro e as mesmas
 * datas) — os defeitos da auditoria do painel da 4ª:
 *
 * - o prazo vencido há menos de 24 h saía «vence hoje»;
 * - a lista para o grupo cobrava a taxa da configuração, e não o que cada um deve;
 * - as datas saíam no fuso do computador;
 * - o banner «O caixa não fecha» era uma identidade que nunca falha;
 * - «A receber» dizia excluir só recusados e desistentes;
 * - nenhum alerta para Apto sem pagamento;
 * - a troca de estado gravava sem dizer o estado que a tela viu (fila velha desfazia um «pago»);
 * - no Windows, a seta ↓ no <select> focado virava «Pago» sem confirmação;
 * - o erro de uma troca feita na folha do celular ficava escondido atrás dela.
 */

const TZ_ORIGINAL = process.env.TZ;

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  process.env.TZ = TZ_ORIGINAL;
});

const ID = "3f2504e0-4f89-11d3-9a0c-0305e82c3301";
const HORA = 3_600_000;
const DIA = 24 * HORA;

function inscrito(over: Partial<Inscrito> = {}): Inscrito {
  return {
    id: ID,
    criado_em: "2026-10-05T12:00:00.000Z",
    nick: "Fulano",
    tag: "BR1",
    riot_id: "Fulano#BR1",
    nome_real: "Fulano de Tal",
    email: "fulano@exemplo.com",
    discord: "fulano",
    whatsapp: "(11) 98765-4321",
    elo_declarado: "Ouro",
    elo_verificado: null,
    elo_congelado: null,
    pontos: 4,
    rota_primaria: "MID",
    rota_secundaria: "TOP",
    disponibilidade: ["noite"],
    quer_capitao: false,
    entrou_no_grupo: null,
    situacao: "pendente",
    organizador: false,
    observacao: null,
    ...over,
  };
}

function pagamento(over: Partial<Pagamento> = {}): Pagamento {
  return {
    inscricao_id: ID,
    estado: "aguardando",
    valor_centavos: 2000,
    declarado_em: null,
    conferido_por: null,
    conferido_em: null,
    vence_em: new Date(Date.now() + 5 * DIA).toISOString(),
    observacao: null,
    ...over,
  };
}

function dados(args: { inscritos?: Inscrito[]; pagamentos?: Pagamento[]; config?: Partial<EdicaoConfig> } = {}): DadosEdicao {
  const lista = args.inscritos ?? [inscrito()];
  return {
    config: {
      nome: "4ª Edição",
      abertura_inscricoes: null,
      fechamento_inscricoes: null,
      prazo_vinculo_riot: null,
      congelamento_elo: null,
      data_draft: null,
      inicio_campeonato: null,
      inscricoes_abertas: true,
      jogadores_por_time: 5,
      max_times: 6,
      orcamento_por_time: 30,
      min_ranqueadas: 5,
      dias_no_grupo: 60,
      prazo_pagamento_dias: 14,
      segundos_por_escolha: 60,
      taxa_centavos: 2000,
      pct_campeao: 70,
      chave_pix: null,
      responsavel_financeiro: null,
      ...args.config,
    },
    inscritos: lista,
    conferencias: [],
    pagamentos: args.pagamentos ?? [pagamento()],
    panorama: {
      inscritos: lista.length,
      elegiveis: lista.length,
      aprovados: 0,
      pendentes: lista.length,
      recusados: 0,
      times: 0,
      vagas: 0,
      sobra: lista.length,
      caixa: { recebido: 0, estornado: 0, aDevolver: 0, emCaixa: 0, arrecadado: 0, aReceber: 0, isento: 0 },
    },
    auditoria: [],
  };
}

const props = (executar = vi.fn(async () => true)) => ({
  executar: executar as never,
  ocupado: false,
  podeConferir: true,
  podeFinanceiro: true,
  podeConfigurar: true,
});

const montar = (d: DadosEdicao, executar = vi.fn(async () => true)) => {
  render(<SecaoPagamentos {...props(executar)} dados={d} />);
  return executar;
};

const prazosProntos = () => waitFor(() => expect(screen.queryByText(/Calculando os prazos/)).toBeNull());

// ---------------------------------------------------------------- P4A-08

describe("prazo vencido há menos de 24 h", () => {
  it("20 h depois do vencimento já é «vencido», em vermelho — não «vence hoje»", async () => {
    montar(dados({ pagamentos: [pagamento({ vence_em: new Date(Date.now() - 20 * HORA).toISOString() })] }));
    await prazosProntos();
    expect(screen.queryAllByText("vence hoje")).toHaveLength(0);
    expect(screen.getAllByText("vencido há 1 dia").length).toBeGreaterThan(0);
  });

  it("faltando 3 horas continua «vence em 1 dia» (o arredondamento a favor do prazo não mudou)", async () => {
    montar(dados({ pagamentos: [pagamento({ vence_em: new Date(Date.now() + 3 * HORA).toISOString() })] }));
    await prazosProntos();
    expect(screen.getAllByText("vence em 1 dia").length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------- P4A-07

describe("«Copiar lista de quem falta pagar»", () => {
  const copiar = async () => {
    let copiado = "";
    vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText: async (t: string) => void (copiado = t) } });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: /Copiar lista/ })));
    return copiado;
  };

  it("cita o que cada um deve (gravado na inscrição), não a taxa nova da configuração", async () => {
    montar(dados({ pagamentos: [pagamento({ valor_centavos: 2000 })], config: { taxa_centavos: 2500 } }));
    const texto = await copiar();
    // O `toLocaleString` de moeda separa «R$» do número com espaço que não quebra.
    expect(texto).toMatch(/R\$\s20,00/);
    expect(texto).not.toContain("25,00");
  });

  it("valores diferentes (a taxa mudou no meio): uma lista por valor, cada nome no seu", async () => {
    const outro = inscrito({ id: "x2", nick: "Beltrano", riot_id: "Beltrano#BR1" });
    montar(
      dados({
        inscritos: [inscrito(), outro],
        pagamentos: [pagamento({ valor_centavos: 2000 }), pagamento({ inscricao_id: "x2", valor_centavos: 2500 })],
        config: { taxa_centavos: 2500 },
      }),
    );
    const texto = await copiar();
    const [vinte, vinteCinco] = texto.split(/\n\n(?=Inscrição)/);
    expect(vinte).toMatch(/R\$\s20,00/);
    expect(vinte).toContain("Fulano#BR1");
    expect(vinte).not.toContain("Beltrano");
    expect(vinteCinco).toMatch(/R\$\s25,00/);
    expect(vinteCinco).toContain("Beltrano#BR1");
  });
});

// ---------------------------------------------------------------- P4A-14

describe("datas no fuso de Brasília, qualquer que seja o do computador", () => {
  it("Pagamentos: vencimento 21/10 00:30 de Brasília sai «21 de out.» também em Manaus", async () => {
    process.env.TZ = "America/Manaus";
    montar(dados({ pagamentos: [pagamento({ vence_em: "2026-10-21T00:30:00-03:00", conferido_em: "2026-10-21T00:30:00-03:00" })] }));
    await prazosProntos();
    const texto = document.body.textContent ?? "";
    expect(texto).toMatch(/21 de out/);
    expect(texto).not.toMatch(/20 de out/);
  });

  it("Times: o congelamento 10/11 00:30 de Brasília sai «10 de novembro» também em Manaus", () => {
    process.env.TZ = "America/Manaus";
    render(<SecaoTimes {...props()} dados={dados({ config: { congelamento_elo: "2026-11-10T00:30:00-03:00" } })} />);
    const texto = document.body.textContent ?? "";
    expect(texto).toMatch(/10 de novembro de 2026/);
    expect(texto).not.toMatch(/09 de novembro de 2026/);
  });
});

// ---------------------------------------------------------------- P4A-09 / P4A-12 / P4A-04

describe("os números do caixa", () => {
  it("a «conta que precisa fechar» (identidade que nunca falha) saiu da tela", () => {
    montar(dados());
    expect(screen.queryByText(/A conta que precisa fechar/)).toBeNull();
    expect(screen.queryByText(/O caixa não fecha/)).toBeNull();
  });

  it("«A receber» diz o que soma: sem organizadores, recusados, desistentes e fila de reserva", () => {
    montar(dados());
    // Com teto de vagas há fila, e reserva só paga se for chamado (D2): também fica de fora.
    expect(
      screen.getByText("aguardando + declarado (sem organizadores, recusados, desistentes e fila de reserva)"),
    ).toBeTruthy();
  });

  it("Apto sem pagamento confirmado aparece nas pendências do caixa", () => {
    montar(dados({ inscritos: [inscrito({ situacao: "apto" })], pagamentos: [pagamento({ estado: "aguardando" })] }));
    expect(screen.getByText(/Aprovado sem pagamento confirmado \(regra 22\)/)).toBeTruthy();
  });
});

// ---------------------------------------------------------------- P4A-03

describe("a troca de estado leva o estado que a tela viu", () => {
  it("«Não encontrei» na fila de declarados manda estadoAnterior «declarado»", () => {
    const executar = montar(dados({ pagamentos: [pagamento({ estado: "declarado", declarado_em: "2026-10-20T10:00:00.000Z" })] }));
    fireEvent.click(screen.getByRole("button", { name: "Não encontrei" }));
    expect(executar).toHaveBeenCalledWith("pagamento", {
      inscricaoId: ID,
      estado: "aguardando",
      observacao: undefined,
      estadoAnterior: "declarado",
    });
  });

  it("409 de conflito no pagamento: o painel recarrega (para mostrar o «pago» de quem confirmou antes)", async () => {
    let leituras = 0;
    const onAlert = vi.fn();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init?: { method?: string }) => {
        if (init?.method === "PATCH") {
          return {
            ok: false,
            status: 409,
            json: async () => ({ error: "O pagamento mudou desde que você abriu a tela.", conflito: true }),
          };
        }
        leituras += 1;
        return {
          ok: true,
          status: 200,
          json: async () => dados({ pagamentos: [pagamento({ estado: "declarado", declarado_em: "2026-10-20T10:00:00.000Z" })] }),
        };
      }),
    );
    render(
      <PainelEdicao
        secao="pagamentos"
        onAlert={onAlert}
        podeConferir
        podeFinanceiro
        podeConfigurar
        render={(p) => <SecaoPagamentos {...p} />}
      />,
    );
    const naoEncontrei = await screen.findByRole("button", { name: "Não encontrei" });
    await act(async () => fireEvent.click(naoEncontrei));
    await waitFor(() => expect(onAlert).toHaveBeenCalledWith("erro", "O pagamento mudou desde que você abriu a tela."));
    expect(leituras).toBe(2);
  });
});

// ---------------------------------------------------------------- P4A-10

describe("o <select> de estado da tabela", () => {
  const trocar = (para: string) =>
    fireEvent.change(screen.getByRole("combobox", { name: "Estado do pagamento de Fulano#BR1" }), { target: { value: para } });

  it("ir para «Pago» pede confirmação; recusada, nada é gravado", () => {
    const confirmar = vi.spyOn(window, "confirm").mockReturnValue(false);
    const executar = montar(dados({ pagamentos: [pagamento({ estado: "declarado" })] }));
    trocar("pago");
    expect(confirmar).toHaveBeenCalledTimes(1);
    expect(confirmar.mock.calls[0]![0]).toMatch(/«Declarado.*» para «.*»/);
    expect(executar).not.toHaveBeenCalled();
  });

  it("confirmada, grava com o estado que a tela viu", () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const executar = montar(dados({ pagamentos: [pagamento({ estado: "declarado" })] }));
    trocar("pago");
    expect(executar).toHaveBeenCalledWith("pagamento", {
      inscricaoId: ID,
      estado: "pago",
      observacao: undefined,
      estadoAnterior: "declarado",
    });
  });

  it("desfazer um «Pago» também pede; uma troca que não mexe no caixa grava direto", () => {
    const confirmar = vi.spyOn(window, "confirm").mockReturnValue(false);
    const executar = montar(dados({ pagamentos: [pagamento({ estado: "pago" })] }));
    trocar("aguardando");
    expect(confirmar).toHaveBeenCalledTimes(1);
    expect(executar).not.toHaveBeenCalled();

    cleanup();
    confirmar.mockClear();
    const direto = montar(dados({ pagamentos: [pagamento({ estado: "aguardando" })] }));
    trocar("cancelado");
    expect(confirmar).not.toHaveBeenCalled();
    expect(direto).toHaveBeenCalledWith("pagamento", expect.objectContaining({ estado: "cancelado", estadoAnterior: "aguardando" }));
  });
});

// ---------------------------------------------------------------- P4A-06 (folha)

describe("a folha do pagamento no celular", () => {
  it("troca recusada pelo servidor: o motivo aparece DENTRO da folha, que cobre o aviso do topo", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const executar = vi.fn(async () => false);
    render(
      <ModoCompacto ativo>
        <SecaoPagamentos
          {...props(executar)}
          ultimoErro="Só dá para estornar um pagamento que foi recebido."
          dados={dados({ pagamentos: [pagamento({ estado: "aguardando" })] })}
        />
      </ModoCompacto>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Abrir o pagamento de Fulano#BR1" }));
    const folha = await waitFor(() => screen.getByRole("dialog"));
    await act(async () =>
      fireEvent.change(within(folha).getByRole("combobox", { name: "Estado do pagamento de Fulano#BR1" }), {
        target: { value: "estorno_devido" },
      }),
    );
    await waitFor(() =>
      expect(within(screen.getByRole("dialog")).getByRole("alert").textContent).toContain("Só dá para estornar"),
    );
  });
});

// ---------------------------------------------------------------- P4A-07 / INS-06 (Configuração)

describe("o que a Configuração diz da taxa, do prazo e da chave Pix", () => {
  it("taxa e prazo valem para inscrições novas; a chave Pix diz o formato aceito", () => {
    render(<SecaoConfiguracao {...props()} dados={dados()} />);
    const dica = (rotulo: string) => screen.getByLabelText(rotulo).closest("label")!.textContent ?? "";
    expect(dica("Taxa de inscrição em reais")).toMatch(/pagamentos já criados mantêm o valor/);
    expect(dica("Prazo de pagamento (dias)")).toMatch(/Pagamentos já criados mantêm o vencimento/);
    expect(dica("Chave Pix")).toMatch(/Telefone com \+55 \(ex\.: \+5511987654321\), CPF\/CNPJ só números/);
  });
});
