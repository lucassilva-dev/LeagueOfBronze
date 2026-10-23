// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type {
  AcaoEdicao,
  Conferencia,
  DadosEdicao,
  EdicaoConfig,
  Inscrito,
  Pagamento,
} from "@/components/admin/e4/painel-edicao";
import { SecaoInscritos } from "@/components/admin/e4/secao-inscritos";
import { SecaoPagamentos } from "@/components/admin/e4/secao-pagamentos";
import { ModoCompacto } from "@/components/admin/responsivo";

/**
 * Auditoria final do painel da 4ª — o que esta frente corrigiu na tela:
 *
 *  - FI-1: a ciência vale pela assinatura do alerta (texto + fatos). O «pago» desfeito que
 *    volta a «aguardando» reaparece nas Pendências do caixa; o «(M) pendente» que chega depois
 *    da ciência do «(B) pendente» volta ao ⚠ e ao filtro de Inscritos.
 *  - FI-3: «Vence», «venceu» e a tabela de prazos mostram a hora quando o prazo não é o fim do
 *    dia (as 48 h do reserva chamado); o de 31/10 segue só com a data.
 *  - FI-4: «Dar ciência» (e «Desfazer») nas Pendências do caixa, para o financeiro — antes só
 *    existia na gaveta de Inscritos, que para ele abre em modo de leitura.
 *  - FI-5: a resposta do «Passar a vaga» não fica presa nem mostra a resposta de outra ação.
 */

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const CONFIG: EdicaoConfig = {
  nome: "4ª Edição",
  abertura_inscricoes: "2026-10-05T12:13:35.000Z",
  fechamento_inscricoes: null,
  prazo_vinculo_riot: null,
  congelamento_elo: null,
  data_draft: null,
  inicio_campeonato: null,
  inscricoes_abertas: true,
  // 1 time de 2: Organizador e Titular dentro; Reserva1 na fila.
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
    elo_riot: null,
    alertas_cientes: {},
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

function dados(inscritos: Inscrito[], pagamentos: Pagamento[], conferencias: Conferencia[] = []): DadosEdicao {
  return {
    config: CONFIG,
    inscritos,
    conferencias,
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
const RESERVA1 = inscrito({ id: "r1", nick: "Reserva1", situacao: "pendente", criado_em: "2026-10-05T12:00:00.000Z" });

type Resposta = { ok: boolean; mensagem?: string; erro?: string; dados?: DadosEdicao };

/**
 * O painel de verdade em miniatura (`executar` de painel-edicao.tsx): zera a última resposta
 * ao começar, grava a nova ao terminar, e a tela recarrega com os dados que o servidor
 * devolveria.
 */
function montarPainel(inicial: DadosEdicao, responder: (acao: AcaoEdicao, corpo: unknown) => Resposta, compacto = false) {
  const chamadas: [AcaoEdicao, unknown][] = [];
  function Painel() {
    const [d, setD] = useState(inicial);
    const [ocupado, setOcupado] = useState(false);
    const [ultimoErro, setUltimoErro] = useState<string | null>(null);
    const [ultimaMensagem, setUltimaMensagem] = useState<string | null>(null);
    const executar = async (acao: AcaoEdicao, corpo?: unknown) => {
      chamadas.push([acao, corpo]);
      setOcupado(true);
      setUltimoErro(null);
      setUltimaMensagem(null);
      await Promise.resolve();
      const r = responder(acao, corpo);
      if (r.dados) setD(r.dados);
      setOcupado(false);
      if (r.ok) {
        setUltimaMensagem(r.mensagem ?? "Salvo.");
        return true;
      }
      setUltimoErro(r.erro ?? "Não foi possível salvar.");
      return false;
    };
    const secao = (
      <SecaoPagamentos
        dados={d}
        executar={executar}
        ocupado={ocupado}
        podeConferir
        podeFinanceiro
        podeConfigurar
        ultimoErro={ultimoErro}
        ultimaMensagem={ultimaMensagem}
      />
    );
    return compacto ? <ModoCompacto ativo>{secao}</ModoCompacto> : secao;
  }
  render(<Painel />);
  return chamadas;
}

const statusVisiveis = () => screen.queryAllByRole("status").map((s) => s.textContent);

// ---------------------------------------------------------------- FI-4

describe("Pendências do caixa: «Dar ciência» para o financeiro (FI-4)", () => {
  const DESISTENTE = inscrito({ id: "t1", nick: "Desistente", situacao: "desistiu" });
  const PAGOU = pagamento({ inscricao_id: "t1", estado: "pago", conferido_em: "2026-10-20T15:00:00.000Z" });
  const TEXTO = "Desistiu com pagamento recebido — o regulamento não define reembolso; decidam e registrem.";
  const ASSINATURA = `${TEXTO}\n[pagamento pago · valor 2000 · declarado — · conferido 2026-10-20T15:00:00.000Z]`;

  const montarSimples = (podeFinanceiro: boolean, compacto = false) => {
    const executar = vi.fn(async () => true);
    const secao = (
      <SecaoPagamentos
        dados={dados([ORG, DESISTENTE], [pagamento({ inscricao_id: "org", estado: "isento" }), PAGOU])}
        executar={executar as never}
        ocupado={false}
        podeConferir={false}
        podeFinanceiro={podeFinanceiro}
        podeConfigurar={false}
      />
    );
    render(compacto ? <ModoCompacto ativo>{secao}</ModoCompacto> : secao);
    return executar;
  };

  it("a pendência «Desistiu com pagamento» tem «Dar ciência», que manda código, texto e assinatura", () => {
    const executar = montarSimples(true);
    expect(screen.getByText("Pendências do caixa")).toBeTruthy();
    const botao = screen.getByRole("button", { name: "Dar ciência" }) as HTMLButtonElement;
    expect(botao.disabled).toBe(false);
    fireEvent.click(botao);
    expect(executar).toHaveBeenCalledWith("alerta_ciencia", {
      inscricaoId: "t1",
      codigo: "desistiu_com_pagamento",
      texto: TEXTO,
      assinatura: ASSINATURA,
    });
  });

  it("sem o financeiro o botão aparece desligado, dizendo o porquê (como os outros do caixa)", () => {
    const executar = montarSimples(false);
    const botao = screen.getByRole("button", { name: "Dar ciência" }) as HTMLButtonElement;
    expect(botao.disabled).toBe(true);
    expect(botao.title).toMatch(/inscricoes:financeiro/);
    fireEvent.click(botao);
    expect(executar).not.toHaveBeenCalled();
  });

  it("no celular o botão vai na largura do cartão", () => {
    montarSimples(true, true);
    const botao = screen.getByRole("button", { name: "Dar ciência" }) as HTMLButtonElement;
    expect(botao.style.width).toBe("100%");
  });

  it("dar ciência da ÚLTIMA pendência: ela vai para os aceitos, a resposta fica à vista e «Desfazer» devolve", async () => {
    const inicial = dados([ORG, DESISTENTE], [pagamento({ inscricao_id: "org", estado: "isento" }), PAGOU]);
    const comCiencia = dados(
      [ORG, { ...DESISTENTE, alertas_cientes: { desistiu_com_pagamento: { texto: TEXTO, assinatura: ASSINATURA, por: "fin", em: "2026-10-23T13:05:00.000Z" } } }],
      inicial.pagamentos,
    );
    const chamadas = montarPainel(inicial, (acao, corpo) =>
      acao === "alerta_ciencia" && !(corpo as { desfazer?: boolean }).desfazer
        ? { ok: true, mensagem: "Ciência registrada: o alerta para de contar.", dados: comCiencia }
        : { ok: true, mensagem: "Ciência desfeita: o alerta volta a contar.", dados: inicial },
    );
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Dar ciência" })));

    expect(screen.getByText("Nenhuma pendência em aberto.")).toBeTruthy();
    expect(statusVisiveis()).toContain("Ciência registrada: o alerta para de contar.");
    const aceitos = screen.getByRole("group", { name: "Alertas do caixa com ciência da organização" });
    expect(within(aceitos).getByText(/ciente — fin, 23 de out\.?, 10:05/)).toBeTruthy();
    // Apagado por cor, nunca por opacidade (o `opacity: 1` fixo do botão do kit não conta).
    expect(aceitos.getAttribute("style")).not.toMatch(/opacity/);
    expect(aceitos.querySelector("li")!.getAttribute("style")).not.toMatch(/opacity/);

    await act(async () => fireEvent.click(within(aceitos).getByRole("button", { name: "Desfazer" })));
    expect(chamadas.at(-1)).toEqual(["alerta_ciencia", { inscricaoId: "t1", codigo: "desistiu_com_pagamento", desfazer: true }]);
    expect(screen.getByRole("button", { name: "Dar ciência" })).toBeTruthy();
  });
});

// ---------------------------------------------------------------- FI-1

describe("a ciência vale pela assinatura, não só pelo texto (FI-1)", () => {
  const CAIXA = "Aprovado sem pagamento confirmado (regra 22) — confira o caixa ou ajuste a situação.";
  const CIENCIA_DO_COMBINADO = {
    apto_sem_pagamento: {
      texto: CAIXA,
      assinatura: `${CAIXA}\n[pagamento aguardando · valor 2000 · declarado — · conferido —]`,
      por: "fin",
      em: "2026-10-23T13:05:00.000Z",
    },
  };
  const caixa = (conferidoEm: string | null) =>
    render(
      <SecaoPagamentos
        dados={dados(
          [ORG, { ...TITULAR, alertas_cientes: CIENCIA_DO_COMBINADO }],
          [
            pagamento({ inscricao_id: "org", estado: "isento" }),
            pagamento({ inscricao_id: "t1", estado: "aguardando", conferido_em: conferidoEm, conferido_por: conferidoEm ? "fin" : null }),
          ],
        )}
        executar={vi.fn(async () => true) as never}
        ocupado={false}
        podeConferir
        podeFinanceiro
        podeConfigurar
      />,
    );

  it("controle: o mesmo «aguardando» combinado continua com a ciência (nenhuma pendência)", () => {
    caixa(null);
    expect(screen.getByText("Nenhuma pendência em aberto.")).toBeTruthy();
  });

  it("o «pago» desfeito (voltou a «aguardando» com o carimbo do pago): volta às Pendências do caixa", () => {
    caixa("2026-10-25T18:00:00.000Z");
    expect(screen.queryByText("Nenhuma pendência em aberto.")).toBeNull();
    expect(screen.getByText(CAIXA)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Dar ciência" })).toBeTruthy();
  });

  const conferencias = (estados: Record<string, string>): Conferencia[] =>
    ["a", "b", "d", "e", "f", "m"].map((item) => ({
      inscricao_id: "t1",
      item: item as Conferencia["item"],
      estado: estados[item] ?? "ok",
      observacao: null,
      conferido_por: "ana",
      conferido_em: "2026-10-20T12:00:00.000Z",
    }));
  const COM_O_B = "Está aprovado, mas há requisito fora de ok/exceção: (B) pendente. Confira e ajuste a situação.";
  const inscritos = (estados: Record<string, string>) =>
    render(
      <SecaoInscritos
        dados={dados(
          [{ ...TITULAR, alertas_cientes: { apto_com_requisito: { texto: COM_O_B, por: "ana", em: "2026-10-23T13:05:00.000Z" } } }],
          [pagamento({ inscricao_id: "t1", estado: "pago", conferido_em: "2026-10-20T12:00:00.000Z" })],
          conferencias(estados),
        )}
        executar={vi.fn(async () => true) as never}
        ocupado={false}
        podeConferir
        podeFinanceiro
        podeConfigurar
      />,
    );
  const filtro = () => screen.getByText(/Só quem tem ponto de atenção/).textContent;

  it("controle: a ciência do «(B) pendente» com o (B) ainda pendente — sem ⚠", () => {
    inscritos({ b: "pendente" });
    expect(screen.queryByText(/⚠ \d/)).toBeNull();
    expect(filtro()).toMatch(/\(0\)/);
  });

  it("a gaveta de Inscritos também manda a assinatura no «Dar ciência» do alerta de dinheiro", () => {
    const executar = vi.fn(async () => true);
    render(
      <SecaoInscritos
        dados={dados([TITULAR], [pagamento({ inscricao_id: "t1", estado: "aguardando" })], conferencias({}))}
        executar={executar as never}
        ocupado={false}
        podeConferir
        podeFinanceiro
        podeConfigurar
      />,
    );
    fireEvent.click(screen.getAllByRole("button", { name: /Titular/ })[0]!);
    const aviso = within(screen.getByRole("dialog")).getByText(CAIXA).closest("li") as HTMLElement;
    fireEvent.click(within(aviso).getByRole("button", { name: "Dar ciência" }));
    expect(executar).toHaveBeenCalledWith("alerta_ciencia", {
      inscricaoId: "t1",
      codigo: "apto_sem_pagamento",
      texto: CAIXA,
      assinatura: `${CAIXA}\n[pagamento aguardando · valor 2000 · declarado — · conferido —]`,
    });
  });

  it("o (B) ficou ok e o (M) caiu para pendente: outro fato, o ⚠ e o filtro voltam", () => {
    inscritos({ m: "pendente" });
    expect(screen.getByText("⚠ 1").getAttribute("title")).toBe(
      "Está aprovado, mas há requisito fora de ok/exceção: (M) pendente. Confira e ajuste a situação.",
    );
    expect(filtro()).toMatch(/\(1\)/);
  });
});

// ---------------------------------------------------------------- FI-3

describe("prazos no caixa com a hora quando não é o fim do dia (FI-3)", () => {
  // No passado, para estarem vencidos com o relógio de verdade.
  const QUARENTA_E_OITO = "2025-11-04T18:37:00.000Z"; // 04/11 às 15:37 em Brasília
  const FIM_DO_DIA = "2025-11-01T02:59:59.000Z"; // 31/10 às 23:59:59

  const montar = (venceEm: string, compacto = false) => {
    const secao = (
      <SecaoPagamentos
        dados={dados(
          [ORG, TITULAR, RESERVA1],
          [
            pagamento({ inscricao_id: "org", estado: "isento" }),
            pagamento({ inscricao_id: "t1", estado: "aguardando", vence_em: venceEm }),
            pagamento({ inscricao_id: "r1", estado: "aguardando" }),
          ],
        )}
        executar={vi.fn(async () => true) as never}
        ocupado={false}
        podeConferir
        podeFinanceiro
        podeConfigurar
      />
    );
    render(compacto ? <ModoCompacto ativo>{secao}</ModoCompacto> : secao);
  };

  it("as 48 h do chamado: «venceu 04 de nov. de 2025 às 15:37» em Perderam o prazo e na tabela de prazos", async () => {
    montar(QUARENTA_E_OITO);
    await screen.findByRole("heading", { name: "Perderam o prazo" }, { timeout: 10_000 });
    expect(document.body.textContent).toMatch(/venceu 04 de nov\.? de 2025 às 15:37/);
    expect(screen.getAllByText(/^04 de nov\.? de 2025 às 15:37$/).length).toBeGreaterThan(0);
  });

  it("no celular também", async () => {
    montar(QUARENTA_E_OITO, true);
    await screen.findByRole("heading", { name: "Perderam o prazo" }, { timeout: 10_000 });
    expect(document.body.textContent).toMatch(/venceu 04 de nov\.? de 2025 às 15:37/);
  });

  it("o prazo único (fim do dia): só a data", async () => {
    montar(FIM_DO_DIA);
    await screen.findByRole("heading", { name: "Perderam o prazo" }, { timeout: 10_000 });
    expect(document.body.textContent).toMatch(/venceu 31 de out\.? de 2025 ·/);
    expect(document.body.textContent).not.toMatch(/31 de out\.? de 2025 às/);
  });
});

// ---------------------------------------------------------------- FI-5

describe("a resposta do «Passar a vaga» não fica presa nem vira a de outra ação (FI-5)", () => {
  const VENCIDO = "2020-01-01T02:59:59.000Z";
  const PAGAMENTOS = [
    pagamento({ inscricao_id: "org", estado: "isento" }),
    pagamento({ inscricao_id: "t1", estado: "aguardando", vence_em: VENCIDO }),
    pagamento({ inscricao_id: "r1", estado: "aguardando" }),
  ];
  const DEPOIS = dados([ORG, { ...TITULAR, situacao: "desistiu" }, RESERVA1], PAGAMENTOS);
  const MENSAGEM = "Vaga liberada. Chamado(s) da fila: Reserva1#BR1 (paga até 03/11 às 09:00) — o prazo de pagamento já vale.";

  const passarAVaga = async (responderPagamento: Resposta) => {
    const chamadas = montarPainel(dados([ORG, TITULAR, RESERVA1], PAGAMENTOS), (acao) =>
      acao === "passar_vaga" ? { ok: true, mensagem: MENSAGEM, dados: DEPOIS } : responderPagamento,
    );
    await screen.findByRole("heading", { name: "Perderam o prazo" }, { timeout: 10_000 });
    fireEvent.click(screen.getByRole("button", { name: "Passar a vaga ao 1º da fila" }));
    const confirmacao = screen.getByRole("group", { name: /Confirmar: passar a vaga de Titular#BR1/ });
    await act(async () => fireEvent.click(within(confirmacao).getByRole("button", { name: "Confirmar: passar a vaga" })));
    // Controle: a resposta do servidor aparece no bloco (o INT-6 continua corrigido).
    expect(statusVisiveis()).toContain(MENSAGEM);
    return chamadas;
  };

  const trocarPagamentoDaReserva = async () =>
    act(async () =>
      fireEvent.change(screen.getByRole("combobox", { name: "Estado do pagamento de Reserva1#BR1" }), {
        target: { value: "declarado" },
      }),
    );

  it("depois, uma troca de pagamento que FALHA: o bloco não diz «Vaga liberada.» e some", async () => {
    const chamadas = await passarAVaga({ ok: false, erro: "O pagamento mudou desde que você abriu a tela." });
    await trocarPagamentoDaReserva();
    expect(chamadas.at(-1)?.[0]).toBe("pagamento");
    expect(screen.queryByText("Vaga liberada.")).toBeNull();
    expect(statusVisiveis()).not.toContain(MENSAGEM);
    expect(screen.queryByRole("heading", { name: "Perderam o prazo" })).toBeNull();
  });

  it("depois, uma troca que DÁ CERTO: o «Salvo.» dela não aparece como resposta da vaga", async () => {
    await passarAVaga({ ok: true, mensagem: "Salvo." });
    await trocarPagamentoDaReserva();
    expect(statusVisiveis()).not.toContain("Salvo.");
    expect(screen.queryByRole("heading", { name: "Perderam o prazo" })).toBeNull();
  });

  it("«Dispensar» tira a resposta (e o bloco vazio) da tela", async () => {
    await passarAVaga({ ok: true });
    fireEvent.click(screen.getByRole("button", { name: "Dispensar" }));
    expect(statusVisiveis()).not.toContain(MENSAGEM);
    expect(screen.queryByRole("heading", { name: "Perderam o prazo" })).toBeNull();
  });
});
