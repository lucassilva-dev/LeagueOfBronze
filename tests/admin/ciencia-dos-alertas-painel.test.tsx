// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { DadosEdicao, Inscrito, Pagamento } from "@/components/admin/e4/painel-edicao";
import { SecaoInscritos } from "@/components/admin/e4/secao-inscritos";
import { SecaoPagamentos } from "@/components/admin/e4/secao-pagamentos";
import { ModoCompacto } from "@/components/admin/responsivo";

/**
 * «Dar ciência» nos alertas do painel da 4ª (pedido do Lucas, 2026-10-23): "hoje a gente não
 * consegue tirar essa pendência".
 *
 *  - o alerta com ciência sai do ⚠ N da lista e do filtro «Só quem tem ponto de atenção»;
 *  - na gaveta ele fica apagado (cor e texto, nunca opacidade), com «ciente — autor, data»
 *    e «Desfazer»;
 *  - mudou o texto, volta a contar;
 *  - o botão só aparece para quem tem o escopo do alerta (caixa = financeiro);
 *  - nos alertas do caixa (Pagamentos) o aceito também não conta;
 *  - banco sem a coluna: o botão espera a migração, sem quebrar nada.
 */

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const ID = "3f2504e0-4f89-11d3-9a0c-0305e82c3301";
const TEXTO = "Declarou Diamante; a Riot mostra Esmeralda.";
const CAIXA = "Aprovado sem pagamento confirmado (regra 22) — confira o caixa ou ajuste a situação.";
const CIENCIA = { texto: TEXTO, por: "ana", em: "2026-10-23T13:05:00.000Z" };

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
    whatsapp: null,
    elo_declarado: "Diamante",
    elo_verificado: null,
    elo_congelado: null,
    pontos: 8,
    rota_primaria: "MID",
    rota_secundaria: "TOP",
    disponibilidade: ["noite"],
    quer_capitao: false,
    entrou_no_grupo: null,
    situacao: "pendente",
    organizador: false,
    observacao: null,
    promocao_automatica: true,
    elo_riot: "Esmeralda",
    alertas_cientes: {},
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
    vence_em: null,
    observacao: null,
    ...over,
  };
}

function dados(i: Inscrito, pagamentos: Pagamento[] = []): DadosEdicao {
  return {
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
      max_times: 8,
      orcamento_por_time: 30,
      min_ranqueadas: 5,
      dias_no_grupo: 60,
      prazo_pagamento_dias: 14,
      segundos_por_escolha: 60,
      taxa_centavos: 2000,
      pct_campeao: 70,
      chave_pix: null,
      responsavel_financeiro: null,
    },
    inscritos: [i],
    conferencias: [],
    pagamentos,
    panorama: {
      inscritos: 1,
      elegiveis: 1,
      aprovados: 0,
      pendentes: 1,
      recusados: 0,
      times: 0,
      vagas: 0,
      sobra: 1,
      caixa: { recebido: 0, estornado: 0, aDevolver: 0, emCaixa: 0, arrecadado: 0, aReceber: 0, isento: 0 },
    },
    auditoria: [],
  };
}

type Escopos = { podeConferir?: boolean; podeFinanceiro?: boolean; compacto?: boolean };

function montar(d: DadosEdicao, escopos: Escopos = {}) {
  const executar = vi.fn(async () => true);
  const secao = (
    <SecaoInscritos
      dados={d}
      executar={executar as never}
      ocupado={false}
      podeConferir={escopos.podeConferir ?? true}
      podeFinanceiro={escopos.podeFinanceiro ?? true}
      podeConfigurar
    />
  );
  render(escopos.compacto ? <ModoCompacto ativo>{secao}</ModoCompacto> : secao);
  return executar;
}

const abrir = () => fireEvent.click(screen.getAllByRole("button", { name: /Fulano/ })[0]!);
const gaveta = () => screen.getByRole("dialog");
const contagemDoFiltro = () => screen.getByText(/Só quem tem ponto de atenção/).textContent;

describe("lista de Inscritos: o aceito não conta no ⚠", () => {
  it("sem ciência: ⚠ 1 e o filtro conta 1", () => {
    montar(dados(inscrito()));
    expect(screen.getByText("⚠ 1")).toBeTruthy();
    expect(contagemDoFiltro()).toMatch(/\(1\)/);
  });

  it("com ciência do texto de agora: sem ⚠, filtro em 0", () => {
    montar(dados(inscrito({ alertas_cientes: { declarou_diferente: CIENCIA } })));
    expect(screen.queryByText(/⚠ \d/)).toBeNull();
    expect(contagemDoFiltro()).toMatch(/\(0\)/);
  });

  it("a Riot passou a mostrar Platina: o texto mudou e o ⚠ volta sozinho", () => {
    montar(dados(inscrito({ elo_riot: "Platina", alertas_cientes: { declarou_diferente: CIENCIA } })));
    expect(screen.getByText("⚠ 1")).toBeTruthy();
    expect(screen.getByText("⚠ 1").getAttribute("title")).toBe("Declarou Diamante; a Riot mostra Platina.");
  });

  it("no celular também (cartões)", () => {
    montar(dados(inscrito({ alertas_cientes: { declarou_diferente: CIENCIA } })), { compacto: true });
    expect(screen.queryByText(/⚠ \d/)).toBeNull();
  });
});

describe("gaveta: «Dar ciência» e «Desfazer»", () => {
  it("«Dar ciência» manda o código e o TEXTO que a tela mostra", () => {
    const executar = montar(dados(inscrito()));
    abrir();
    const aviso = within(gaveta()).getByText(TEXTO).closest("li")!;
    fireEvent.click(within(aviso as HTMLElement).getByRole("button", { name: "Dar ciência" }));
    expect(executar).toHaveBeenCalledWith("alerta_ciencia", {
      inscricaoId: ID,
      codigo: "declarou_diferente",
      texto: TEXTO,
    });
  });

  it("com ciência: sai do aviso, fica apagado (sem opacidade) com «ciente — autor, data» e «Desfazer»", () => {
    const executar = montar(dados(inscrito({ alertas_cientes: { declarou_diferente: CIENCIA } })));
    abrir();
    expect(within(gaveta()).queryByText(/ponto(s)? de atenção/)).toBeNull();
    const aceitos = within(gaveta()).getByRole("group", { name: "Alertas com ciência da organização" });
    expect(within(aceitos).getByText(TEXTO)).toBeTruthy();
    // 13:05 UTC = 10:05 em Brasília.
    expect(within(aceitos).getByText(/ciente — ana, 23\/10, 10:05/)).toBeTruthy();
    expect(aceitos.outerHTML).not.toMatch(/opacity/);
    expect(within(aceitos).queryByRole("button", { name: "Dar ciência" })).toBeNull();
    fireEvent.click(within(aceitos).getByRole("button", { name: "Desfazer" }));
    expect(executar).toHaveBeenCalledWith("alerta_ciencia", {
      inscricaoId: ID,
      codigo: "declarou_diferente",
      desfazer: true,
    });
  });

  it("no celular a gaveta tem os dois botões, com alvo de dedo", () => {
    const executar = montar(dados(inscrito({ riot_id_atual: "Outro#BR1", alertas_cientes: { declarou_diferente: CIENCIA } })), {
      compacto: true,
    });
    abrir();
    fireEvent.click(within(gaveta()).getByRole("button", { name: "Dar ciência" }));
    expect(executar).toHaveBeenLastCalledWith("alerta_ciencia", expect.objectContaining({ codigo: "nick_trocado" }));
    const desfazer = within(gaveta()).getByRole("button", { name: "Desfazer" });
    expect(desfazer.style.minHeight).toBe("40px");
  });

  it("o texto mudou: a ciência antiga não vale, o alerta volta com «Dar ciência»", () => {
    montar(dados(inscrito({ elo_riot: "Platina", alertas_cientes: { declarou_diferente: CIENCIA } })));
    abrir();
    expect(within(gaveta()).getByText("1 ponto de atenção")).toBeTruthy();
    expect(within(gaveta()).getByRole("button", { name: "Dar ciência" })).toBeTruthy();
    expect(within(gaveta()).queryByRole("group", { name: "Alertas com ciência da organização" })).toBeNull();
  });
});

describe("gaveta: o botão segue o escopo do alerta", () => {
  const ambos = () =>
    dados(inscrito({ situacao: "apto", elo_riot: "Esmeralda" }), [pagamento({ estado: "aguardando" })]);

  it("só o financeiro: botão no alerta do caixa, nenhum no de elo", () => {
    montar(ambos(), { podeConferir: false, podeFinanceiro: true });
    abrir();
    const caixa = within(gaveta()).getByText(CAIXA).closest("li") as HTMLElement;
    const elo = within(gaveta()).getByText(TEXTO).closest("li") as HTMLElement;
    expect(within(caixa).getByRole("button", { name: "Dar ciência" })).toBeTruthy();
    expect(within(elo).queryByRole("button", { name: "Dar ciência" })).toBeNull();
  });

  it("só a conferência: o contrário", () => {
    montar(ambos(), { podeConferir: true, podeFinanceiro: false });
    abrir();
    const caixa = within(gaveta()).getByText(CAIXA).closest("li") as HTMLElement;
    const elo = within(gaveta()).getByText(TEXTO).closest("li") as HTMLElement;
    expect(within(caixa).queryByRole("button", { name: "Dar ciência" })).toBeNull();
    expect(within(elo).getByRole("button", { name: "Dar ciência" })).toBeTruthy();
  });

  it("sem o escopo, nem o «Desfazer» aparece", () => {
    montar(dados(inscrito({ alertas_cientes: { declarou_diferente: CIENCIA } })), { podeConferir: false });
    abrir();
    const aceitos = within(gaveta()).getByRole("group", { name: "Alertas com ciência da organização" });
    expect(within(aceitos).queryByRole("button", { name: "Desfazer" })).toBeNull();
  });
});

describe("banco ainda sem a coluna", () => {
  it("o alerta conta como sempre, e o botão espera a migração dizendo o porquê", () => {
    const sem = inscrito();
    delete sem.alertas_cientes;
    const executar = montar(dados(sem));
    expect(screen.getByText("⚠ 1")).toBeTruthy();
    abrir();
    const botao = within(gaveta()).getByRole("button", { name: "Dar ciência" }) as HTMLButtonElement;
    expect(botao.disabled).toBe(true);
    expect(within(gaveta()).getByText(/depois da migração do banco \(coluna alertas_cientes\)/)).toBeTruthy();
    fireEvent.click(botao);
    expect(executar).not.toHaveBeenCalled();
  });
});

describe("Pagamentos: o alerta do caixa com ciência sai das pendências", () => {
  const montarCaixa = (i: Inscrito) =>
    render(
      <SecaoPagamentos
        dados={dados(i, [pagamento({ estado: "aguardando" })])}
        executar={vi.fn(async () => true) as never}
        ocupado={false}
        podeConferir
        podeFinanceiro
        podeConfigurar
      />,
    );

  it("sem ciência, aparece", () => {
    montarCaixa(inscrito({ situacao: "apto", elo_riot: null }));
    expect(screen.getByText("Pendências do caixa")).toBeTruthy();
    expect(screen.getByText(CAIXA)).toBeTruthy();
  });

  it("com ciência do mesmo alerta (texto e fatos do pagamento), sai das pendências e fica entre os aceitos", () => {
    montarCaixa(
      inscrito({
        situacao: "apto",
        elo_riot: null,
        alertas_cientes: {
          apto_sem_pagamento: {
            texto: CAIXA,
            assinatura: `${CAIXA}\n[pagamento aguardando · valor 2000 · declarado — · conferido —]`,
            por: "ana",
            em: "2026-10-23T13:05:00.000Z",
          },
        },
      }),
    );
    // O bloco fica para o «Desfazer», mas sem nenhuma pendência em aberto.
    expect(screen.getByText("Nenhuma pendência em aberto.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Dar ciência" })).toBeNull();
    const aceitos = screen.getByRole("group", { name: "Alertas do caixa com ciência da organização" });
    expect(within(aceitos).getByText(new RegExp(CAIXA.replace(/[()]/g, "\\$&")))).toBeTruthy();
  });

  it("ciência gravada antes da assinatura (só o texto) não vale para alerta de dinheiro: continua pendente", () => {
    montarCaixa(
      inscrito({
        situacao: "apto",
        elo_riot: null,
        alertas_cientes: { apto_sem_pagamento: { texto: CAIXA, por: "ana", em: "2026-10-23T13:05:00.000Z" } },
      }),
    );
    expect(screen.getByRole("button", { name: "Dar ciência" })).toBeTruthy();
    expect(screen.queryByRole("group", { name: "Alertas do caixa com ciência da organização" })).toBeNull();
  });

  it("ciência de outro texto não vale: continua", () => {
    montarCaixa(
      inscrito({
        situacao: "apto",
        elo_riot: null,
        alertas_cientes: { apto_sem_pagamento: { texto: "outro texto", por: "ana", em: "2026-10-23T13:05:00.000Z" } },
      }),
    );
    expect(screen.getByText(CAIXA)).toBeTruthy();
  });
});
