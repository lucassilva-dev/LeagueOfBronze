// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { DadosEdicao, EdicaoConfig, Inscrito, Pagamento, PropsSecao } from "@/components/admin/e4/painel-edicao";
import { SecaoConfiguracao } from "@/components/admin/e4/secao-configuracao";
import { SecaoInscritos } from "@/components/admin/e4/secao-inscritos";
import { SecaoPagamentos } from "@/components/admin/e4/secao-pagamentos";
import { SecaoTimes } from "@/components/admin/e4/secao-times";
import { ModoCompacto } from "@/components/admin/responsivo";
import { montarFila } from "@/lib/inscricoes/fila";

/**
 * A fila de reserva (D1 a D5) nos avisos do painel da 4ª — o que a auditoria da retomada
 * (23/10) achou:
 *
 *  - INT-2: «Voltar para apto» em Times e vagas gravava num clique, e a «sobra» que volta ao
 *    lugar dela pela ordem de inscrição pode empurrar um titular (até um que já pagou) para a
 *    fila. Agora, quando alguém desce, a tela diz quem antes de gravar e pede a confirmação.
 *    O mesmo em escala maior na Configuração: mudar o teto de times diz, antes de salvar,
 *    quem desce para a fila (e se já pagou) e quem é chamado.
 *  - INT-5: marcar organizador num reserva fazia a gaveta dizer que ele entra «pela ordem de
 *    inscrição» — ele entra porque organizador sempre é titular.
 *  - INT-6: passar a vaga do último da lista «Perderam o prazo» apagava o bloco junto com a
 *    resposta do servidor (quem foi chamado, ou o erro).
 */

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function inscrito(over: Partial<Inscrito> & { id: string; nick: string }): Inscrito {
  return {
    criado_em: "2026-10-05T12:00:00.000Z",
    tag: "BR1",
    riot_id: `${over.nick}#BR1`,
    nome_real: "Nome Sobrenome",
    email: `${over.id}@exemplo.com`,
    discord: over.id,
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
    situacao: "apto",
    organizador: false,
    observacao: null,
    recado_jogador: null,
    promocao_automatica: true,
    ...over,
  };
}

function pagamento(over: Partial<Pagamento> & { inscricao_id: string }): Pagamento {
  return {
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

/** 1 time de 2 (2 vagas). */
const CONFIG: EdicaoConfig = {
  nome: "4ª Edição",
  abertura_inscricoes: "2026-10-05T12:13:35.000Z",
  fechamento_inscricoes: null,
  prazo_vinculo_riot: null,
  congelamento_elo: null,
  data_draft: null,
  inicio_campeonato: null,
  inscricoes_abertas: true,
  jogadores_por_time: 2,
  max_times: 1,
  orcamento_por_time: 30,
  min_ranqueadas: 5,
  dias_no_grupo: 60,
  prazo_pagamento_dias: 14,
  prazo_pagamento_ate: "2026-11-01T02:59:59.000Z",
  segundos_por_escolha: 60,
  taxa_centavos: 2000,
  pct_campeao: 70,
  chave_pix: null,
  responsavel_financeiro: null,
};

function dados(inscritos: Inscrito[], pagamentos: Pagamento[]): DadosEdicao {
  return {
    config: CONFIG,
    inscritos,
    conferencias: [],
    pagamentos,
    panorama: {
      inscritos: inscritos.length,
      elegiveis: inscritos.length,
      aprovados: inscritos.length,
      pendentes: 0,
      recusados: 0,
      times: 1,
      vagas: 2,
      sobra: 0,
      titulares: 2,
      reservas: Math.max(0, inscritos.length - 2),
      caixa: { recebido: 0, estornado: 0, aDevolver: 0, emCaixa: 0, arrecadado: 0, aReceber: 0, isento: 0 },
    },
    auditoria: [],
    falhasDeLogin: {},
  };
}

const ORG = inscrito({ id: "org", nick: "Organizador", organizador: true, criado_em: "2026-10-05T10:00:00.000Z" });
const TITULAR = inscrito({ id: "t1", nick: "Titular", criado_em: "2026-10-05T11:00:00.000Z" });

// ---------------------------------------------------------------- INT-2

describe("«Voltar para apto» em Times e vagas (INT-2)", () => {
  // Inscrito antes do Titular, mas marcado como sobra pela organização.
  const SOBRADO = inscrito({ id: "sb", nick: "Sobrado", situacao: "sobra", criado_em: "2026-10-05T09:00:00.000Z" });
  const PAGAMENTOS = [
    pagamento({ inscricao_id: "org", estado: "isento" }),
    pagamento({ inscricao_id: "t1", estado: "pago", conferido_por: "lucas", conferido_em: "2026-10-06T10:00:00.000Z" }),
    pagamento({ inscricao_id: "sb", estado: "aguardando" }),
  ];
  const DADOS = dados([ORG, TITULAR, SOBRADO], PAGAMENTOS);

  const montar = (executar: PropsSecao["executar"], compacto = false) => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 404, json: async () => ({}) })));
    const secao = <SecaoTimes executar={executar} ocupado={false} podeConferir podeFinanceiro podeConfigurar dados={DADOS} />;
    return render(compacto ? <ModoCompacto ativo>{secao}</ModoCompacto> : secao);
  };
  const tabelaDaFila = () => [...document.querySelectorAll("table")].find((t) => t.textContent?.includes("Na ficha"))!;

  it("a função pura: com o Sobrado de volta a apto, o Titular (que já pagou) desce para a fila", () => {
    expect(montarFila(DADOS.inscritos, CONFIG).lugar.t1).toEqual({ tipo: "titular" });
    const depois = montarFila(
      DADOS.inscritos.map((i) => (i.id === "sb" ? { ...i, situacao: "apto" as const } : i)),
      CONFIG,
    );
    expect(depois.lugar.t1).toEqual({ tipo: "reserva", posicao: 1, manual: false });
  });

  it("o 1º clique não grava: diz quem desce e que ele já pagou; o 2º (confirmar) grava", async () => {
    const executar = vi.fn<PropsSecao["executar"]>(async () => true);
    montar(executar);
    fireEvent.click(within(tabelaDaFila()).getByRole("button", { name: "Voltar para apto" }));

    expect(executar).not.toHaveBeenCalled();
    const grupo = screen.getByRole("group", { name: "Confirmar: voltar Sobrado#BR1 para apto" });
    expect(grupo.textContent).toContain("Ao voltar para apto, Sobrado#BR1 entra nas vagas, pela ordem de inscrição.");
    expect(grupo.textContent).toContain("Titular#BR1 desce para a fila de reserva");
    expect(grupo.textContent).toContain("Titular#BR1 já pagou");

    await act(async () => fireEvent.click(within(grupo).getByRole("button", { name: "Confirmar: voltar para apto" })));
    expect(executar).toHaveBeenCalledTimes(1);
    expect(executar).toHaveBeenCalledWith("ficha", { inscricaoId: "sb", situacao: "apto", situacaoAnterior: "sobra" });
  });

  it("Cancelar fecha a confirmação sem gravar", () => {
    const executar = vi.fn<PropsSecao["executar"]>(async () => true);
    montar(executar);
    fireEvent.click(within(tabelaDaFila()).getByRole("button", { name: "Voltar para apto" }));
    fireEvent.click(within(screen.getByRole("group", { name: /Confirmar: voltar Sobrado#BR1/ })).getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByRole("group", { name: /Confirmar: voltar Sobrado#BR1/ })).toBeNull();
    expect(executar).not.toHaveBeenCalled();
  });

  it("no celular, a mesma confirmação dentro do cartão", async () => {
    const executar = vi.fn<PropsSecao["executar"]>(async () => true);
    montar(executar, true);
    fireEvent.click(screen.getByRole("button", { name: "Voltar para apto" }));
    expect(executar).not.toHaveBeenCalled();
    const grupo = screen.getByRole("group", { name: "Confirmar: voltar Sobrado#BR1 para apto" });
    expect(grupo.textContent).toContain("Titular#BR1 desce para a fila de reserva");
    await act(async () => fireEvent.click(within(grupo).getByRole("button", { name: "Confirmar: voltar para apto" })));
    expect(executar).toHaveBeenCalledWith("ficha", { inscricaoId: "sb", situacao: "apto", situacaoAnterior: "sobra" });
  });

  it("quando a volta não tira ninguém das vagas, grava no clique, como antes", () => {
    // Sobrado inscrito DEPOIS do Titular: volta para a fila (posição 1), e ninguém desce.
    const tardio = inscrito({ id: "sb", nick: "Sobrado", situacao: "sobra", criado_em: "2026-10-05T12:00:00.000Z" });
    const executar = vi.fn<PropsSecao["executar"]>(async () => true);
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 404, json: async () => ({}) })));
    render(
      <SecaoTimes
        executar={executar}
        ocupado={false}
        podeConferir
        podeFinanceiro
        podeConfigurar
        dados={dados([ORG, TITULAR, tardio], PAGAMENTOS)}
      />,
    );
    fireEvent.click(within(tabelaDaFila()).getByRole("button", { name: "Voltar para apto" }));
    expect(executar).toHaveBeenCalledWith("ficha", { inscricaoId: "sb", situacao: "apto", situacaoAnterior: "sobra" });
    expect(screen.queryByRole("group", { name: /Confirmar: voltar/ })).toBeNull();
  });
});

// ---------------------------------------------------------------- INT-5

describe("gaveta: o motivo de quem entra nas vagas (INT-5)", () => {
  const RESERVA1 = inscrito({ id: "r1", nick: "Reserva1", situacao: "pendente", criado_em: "2026-10-05T12:00:00.000Z" });
  const RESERVA2 = inscrito({ id: "r2", nick: "Reserva2", criado_em: "2026-10-05T13:00:00.000Z" });
  const DADOS = dados(
    [ORG, TITULAR, RESERVA1, RESERVA2],
    ["org", "t1", "r1", "r2"].map((id) => pagamento({ inscricao_id: id, estado: id === "org" ? "isento" : "aguardando" })),
  );

  const abrirFicha = (nick: string) => {
    render(<SecaoInscritos executar={vi.fn(async () => true)} ocupado={false} podeConferir podeFinanceiro podeConfigurar dados={DADOS} />);
    fireEvent.click(screen.getAllByRole("button", { name: new RegExp(nick) })[0]!);
    const gaveta = screen.getByRole("dialog");
    fireEvent.click(within(gaveta).getByRole("tab", { name: /^Ficha/ }));
    return gaveta;
  };

  it("marcar organizador num reserva: entra porque organizador sempre é titular, não pela ordem", () => {
    const gaveta = abrirFicha("Reserva2");
    const rotulo = [...gaveta.querySelectorAll("label")].find((l) => l.textContent?.includes("É da organização desta edição"))!;
    fireEvent.click(rotulo.querySelector("input")!);

    expect(gaveta.textContent).toContain("Ao salvar, Reserva2#BR1 entra nas vagas: organizador sempre é titular.");
    expect(gaveta.textContent).toContain("Titular#BR1 desce para a fila de reserva");
    expect(gaveta.textContent).not.toContain("entra nas vagas, pela ordem de inscrição");
  });
});

// ---------------------------------------------------------------- INT-6

describe("resposta do «Passar a vaga» quando era o último da lista (INT-6)", () => {
  const VENCIDO = "2020-01-01T02:59:59.000Z";
  const RESERVA1 = inscrito({ id: "r1", nick: "Reserva1", situacao: "pendente", criado_em: "2026-10-05T12:00:00.000Z" });
  const PAGAMENTOS = [
    pagamento({ inscricao_id: "org", estado: "isento" }),
    pagamento({ inscricao_id: "t1", estado: "aguardando", vence_em: VENCIDO }),
    pagamento({ inscricao_id: "r1", estado: "aguardando" }),
  ];
  const MENSAGEM = "Vaga liberada: Titular#BR1 virou «Desistiu». Reserva1#BR1 foi chamado da fila, com prazo até 31/10/2026.";

  const passarAVagaDoUnico = async (ok: boolean) => {
    const executar = vi.fn<PropsSecao["executar"]>(async () => ok);
    const base = { executar, ocupado: false, podeConferir: true, podeFinanceiro: true, podeConfigurar: true };
    const tela = render(<SecaoPagamentos {...base} dados={dados([ORG, TITULAR, RESERVA1], PAGAMENTOS)} />);
    // Folga: o «agora» do bloco chega num efeito, e com a máquina ocupada passa de 1 s.
    await screen.findByRole("heading", { name: "Perderam o prazo" }, { timeout: 10_000 });
    fireEvent.click(screen.getByRole("button", { name: "Passar a vaga ao 1º da fila" }));
    const confirmacao = screen.getByRole("group", { name: /Confirmar: passar a vaga de Titular#BR1/ });
    await act(async () => fireEvent.click(within(confirmacao).getByRole("button", { name: "Confirmar: passar a vaga" })));
    expect(executar).toHaveBeenCalledWith("passar_vaga", { inscricaoId: "t1" });
    return { ...tela, base };
  };

  it("deu certo e a lista esvaziou: a mensagem do servidor continua à vista", async () => {
    const { rerender, base } = await passarAVagaDoUnico(true);
    const recarregado = dados(
      [ORG, { ...TITULAR, situacao: "desistiu" }, RESERVA1],
      PAGAMENTOS,
    );
    rerender(<SecaoPagamentos {...base} ultimaMensagem={MENSAGEM} dados={recarregado} />);

    expect(screen.getByRole("status").textContent).toBe(MENSAGEM);
    expect(screen.getByRole("heading", { name: "Perderam o prazo" })).toBeTruthy();
    expect(document.body.textContent).toContain("Ninguém mais com o prazo vencido.");
    expect(screen.queryByRole("button", { name: "Passar a vaga ao 1º da fila" })).toBeNull();
  });

  it("deu errado: a linha fica e o erro aparece no bloco", async () => {
    const { rerender, base } = await passarAVagaDoUnico(false);
    rerender(<SecaoPagamentos {...base} ultimoErro="O prazo de pagamento ainda não venceu." dados={dados([ORG, TITULAR, RESERVA1], PAGAMENTOS)} />);
    expect(screen.getAllByRole("alert").map((a) => a.textContent)).toContain("O prazo de pagamento ainda não venceu.");
    expect(screen.getByRole("heading", { name: "Perderam o prazo" })).toBeTruthy();
  });

  it("controle: sem ninguém vencido e sem resposta, o bloco não aparece", async () => {
    const base = { executar: vi.fn(async () => true), ocupado: false, podeConferir: true, podeFinanceiro: true, podeConfigurar: true };
    render(
      <SecaoPagamentos
        {...base}
        dados={dados([ORG, TITULAR, RESERVA1], PAGAMENTOS.map((p) => (p.inscricao_id === "t1" ? { ...p, vence_em: null } : p)))}
      />,
    );
    // Depois do efeito que acerta o «agora» (sem ele a lista de vencidos é sempre vazia).
    await act(async () => {});
    expect(screen.queryByRole("heading", { name: "Perderam o prazo" })).toBeNull();
  });
});

// ---------------------------------------------------------------- INT-2, na Configuração

describe("mudar o teto de times na Configuração diz quem desce e quem é chamado (INT-2)", () => {
  // 2 times de 2 = 4 vagas: Organizador, Titular, T2 e T3 dentro; R1 na fila.
  const T2 = inscrito({ id: "t2", nick: "T2", criado_em: "2026-10-05T11:10:00.000Z" });
  const T3 = inscrito({ id: "t3", nick: "T3", criado_em: "2026-10-05T11:20:00.000Z" });
  const R1 = inscrito({ id: "r1", nick: "R1", criado_em: "2026-10-05T11:30:00.000Z" });
  const R2 = inscrito({ id: "r2", nick: "R2", criado_em: "2026-10-05T11:40:00.000Z" });
  const PAGAMENTOS = [
    pagamento({ inscricao_id: "org", estado: "isento" }),
    pagamento({ inscricao_id: "t1", estado: "aguardando" }),
    pagamento({ inscricao_id: "t2", estado: "aguardando" }),
    pagamento({ inscricao_id: "t3", estado: "pago" }),
    pagamento({ inscricao_id: "r1", estado: "aguardando" }),
    pagamento({ inscricao_id: "r2", estado: "aguardando" }),
  ];
  const base = { ocupado: false, podeConferir: true, podeFinanceiro: true, podeConfigurar: true };

  const montar = (maxTimes: number, inscritos: Inscrito[]) => {
    const d = { ...dados(inscritos, PAGAMENTOS), config: { ...CONFIG, max_times: maxTimes } };
    render(<SecaoConfiguracao {...base} executar={vi.fn(async () => true)} dados={d} />);
    return screen.getByRole("textbox", { name: "Máximo de times" });
  };

  it("baixar de 2 para 1 time: T2 e T3 descem, e T3 já pagou", () => {
    const campo = montar(2, [ORG, TITULAR, T2, T3, R1]);
    expect(document.body.textContent).not.toContain("A fila de reserva muda ao salvar");
    fireEvent.change(campo, { target: { value: "1" } });
    expect(document.body.textContent).toContain("A fila de reserva muda ao salvar");
    expect(document.body.textContent).toContain("Ao salvar, T2#BR1 e T3#BR1 descem para a fila de reserva");
    expect(document.body.textContent).toContain("T3#BR1 já pagou");
  });

  it("subir de 1 para 2 times: os dois primeiros da fila são chamados", () => {
    const campo = montar(1, [ORG, TITULAR, R1, R2]);
    fireEvent.change(campo, { target: { value: "2" } });
    expect(document.body.textContent).toContain("Ao salvar, R1#BR1 e R2#BR1 são chamados da fila e passam a ter prazo de pagamento.");
  });
});
