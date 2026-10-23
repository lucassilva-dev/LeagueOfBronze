// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  PainelEdicao,
  mensagemDoSucesso,
  type Conferencia,
  type DadosEdicao,
  type EdicaoConfig,
  type Inscrito,
  type Pagamento,
  type PropsSecao,
} from "@/components/admin/e4/painel-edicao";
import { SecaoConfiguracao } from "@/components/admin/e4/secao-configuracao";
import { SecaoInscritos } from "@/components/admin/e4/secao-inscritos";
import { SecaoPagamentos } from "@/components/admin/e4/secao-pagamentos";
import { SecaoTimes } from "@/components/admin/e4/secao-times";
import { ModoCompacto } from "@/components/admin/responsivo";
import { ITENS_CONFERENCIA } from "@/lib/inscricoes/schema";

/**
 * As decisões do Lucas de 2026-10-22 no PAINEL da 4ª (D1/D2, D3, D5, F e G).
 *
 * - D1/D2: Inscritos e Times e vagas mostram titular × fila de reserva (com a posição);
 *   Pagamentos não cobra reserva e lista «a devolver se não jogar», fora do prêmio.
 * - D3: o prazo único dos titulares na Configuração, como DIA de Brasília (fim do dia).
 * - D4/D5: quem perdeu o prazo ganha «Passar a vaga ao 1º da fila», com confirmação; a gaveta
 *   diz antes de salvar quem é chamado; a resposta («chamados», «avisoFila») chega à tela.
 * - F: «Liberar login» na gaveta, com as falhas recentes à vista antes.
 * - G: «Nota interna» × «Recado para o jogador», cada um dizendo quem o lê.
 *
 * O cenário: 1 time de 2 (2 vagas). O organizador entra sempre; o Titular é o 1º por ordem de
 * inscrição; Reserva1 e Reserva2 esperam na fila (1 e 2); o «Sobrado» foi marcado como sobra
 * e vai para o FIM da fila; o «Fora» desistiu.
 */

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const VENCIDO = "2020-01-01T02:59:59.000Z";

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

const ORGANIZADOR = inscrito({ id: "org", nick: "Organizador", organizador: true, criado_em: "2026-10-05T10:00:00.000Z" });
const TITULAR = inscrito({ id: "t1", nick: "Titular", criado_em: "2026-10-05T11:00:00.000Z" });
const RESERVA1 = inscrito({ id: "r1", nick: "Reserva1", situacao: "pendente", criado_em: "2026-10-05T12:00:00.000Z" });
const RESERVA2 = inscrito({ id: "r2", nick: "Reserva2", criado_em: "2026-10-05T13:00:00.000Z" });
// Inscrito ANTES de todos, mas marcado como sobra: vai para o fim da fila.
const SOBRADO = inscrito({ id: "sb", nick: "Sobrado", situacao: "sobra", criado_em: "2026-10-05T09:00:00.000Z" });
const FORA = inscrito({ id: "fo", nick: "Fora", situacao: "desistiu", criado_em: "2026-10-05T08:00:00.000Z" });

const TODOS = [ORGANIZADOR, TITULAR, RESERVA1, RESERVA2, SOBRADO, FORA];

const PAGAMENTOS: Pagamento[] = [
  pagamento({ inscricao_id: "org", estado: "isento" }),
  // Titular que não pagou até o prazo (D5).
  pagamento({ inscricao_id: "t1", estado: "aguardando", vence_em: VENCIDO }),
  // Reserva que já pagou: fora do prêmio, devolver se não jogar (D2).
  pagamento({ inscricao_id: "r1", estado: "pago", conferido_por: "lucas", conferido_em: "2026-10-06T10:00:00.000Z" }),
  // Reserva sem cobrança: só paga se for chamado.
  pagamento({ inscricao_id: "r2", estado: "aguardando", vence_em: null }),
  // Reserva que disse ter pago.
  pagamento({ inscricao_id: "sb", estado: "declarado", declarado_em: "2026-10-06T11:00:00.000Z" }),
  pagamento({ inscricao_id: "fo", estado: "aguardando", vence_em: VENCIDO }),
];

function config(over: Partial<EdicaoConfig> = {}): EdicaoConfig {
  return {
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
    ...over,
  };
}

function conferenciasDe(id: string): Conferencia[] {
  return ITENS_CONFERENCIA.map((item) => ({
    inscricao_id: id,
    item,
    estado: "pendente",
    observacao: null,
    conferido_por: null,
    conferido_em: null,
  }));
}

function dados(over: Partial<DadosEdicao> = {}): DadosEdicao {
  const inscritos = over.inscritos ?? TODOS;
  return {
    config: config(),
    inscritos,
    conferencias: inscritos.flatMap((i) => conferenciasDe(i.id)),
    pagamentos: PAGAMENTOS,
    panorama: {
      inscritos: inscritos.length,
      elegiveis: 5,
      aprovados: 4,
      pendentes: 1,
      recusados: 0,
      times: 1,
      vagas: 2,
      sobra: 3,
      titulares: 2,
      reservas: 3,
      caixa: {
        recebido: 2000,
        estornado: 0,
        aDevolver: 0,
        aDevolverSeNaoJogar: 2000,
        emCaixa: 2000,
        arrecadado: 0,
        aReceber: 2000,
        isento: 2000,
      },
    },
    auditoria: [],
    falhasDeLogin: {},
    ...over,
  };
}

function props(executar: PropsSecao["executar"] = executarFalso(), extra: Partial<PropsSecao> = {}) {
  return {
    executar,
    ocupado: false,
    podeConferir: true,
    podeFinanceiro: true,
    podeConfigurar: true,
    ...extra,
  };
}

/** O `executar` do painel, falso, com o tipo dele: as chamadas ficam em `mock.calls`. */
const executarFalso = () => vi.fn<PropsSecao["executar"]>(async () => true);

const gaveta = () => screen.getByRole("dialog");
const abrir = (nick: string) => fireEvent.click(screen.getAllByRole("button", { name: new RegExp(nick) })[0]!);
const aba = (nome: string) => fireEvent.click(within(gaveta()).getByRole("tab", { name: new RegExp(`^${nome}`) }));
const marcar = (grupo: string, rotulo: string) =>
  fireEvent.click(
    within(screen.getByRole("radiogroup", { name: grupo })).getByRole("radio", { name: new RegExp(`^(✓ )?${rotulo}$`) }),
  );

/** A linha da tabela de Inscritos de quem tem o nick. */
const linhaDe = (nick: string) => document.getElementById(`inscrito-${TODOS.find((i) => i.nick === nick)!.id}`)!.closest("tr")!;

// ---------------------------------------------------------------- D1/D2 — Inscritos

describe("Inscritos mostram titular e posição na fila (D1)", () => {
  it("coluna «Vaga»: organizador e 1º inscrito titulares, os outros na fila pela ordem, a sobra no fim", () => {
    render(<SecaoInscritos {...props()} dados={dados()} />);
    expect(screen.getByRole("columnheader", { name: "Vaga" })).toBeTruthy();
    expect(within(linhaDe("Organizador")).getByText("titular")).toBeTruthy();
    expect(within(linhaDe("Titular")).getByText("titular")).toBeTruthy();
    expect(within(linhaDe("Reserva1")).getByText("fila nº 1")).toBeTruthy();
    expect(within(linhaDe("Reserva2")).getByText("fila nº 2")).toBeTruthy();
    expect(within(linhaDe("Sobrado")).getByText("fila · sobra")).toBeTruthy();
  });

  it("os números de titulares e fila, e o filtro «Só a fila de reserva»", () => {
    render(<SecaoInscritos {...props()} dados={dados()} />);
    expect(document.body.textContent).toContain("de 2 vagas (organizadores sempre entram)");
    fireEvent.click(screen.getByText("Só a fila de reserva (3)"));
    expect(screen.getByText(/Mostrando 3 de/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^Titular/ })).toBeNull();
  });

  it("no celular, o lugar na fila vai no cartão", () => {
    render(
      <ModoCompacto ativo>
        <SecaoInscritos {...props()} dados={dados()} />
      </ModoCompacto>,
    );
    expect(document.querySelector("table")).toBeNull();
    expect(screen.getByText("fila nº 1")).toBeTruthy();
    expect(screen.getByText("fila nº 2")).toBeTruthy();
  });

  it("sem teto de vagas não há fila: nem coluna nem chip", () => {
    render(<SecaoInscritos {...props()} dados={dados({ config: config({ max_times: null }) })} />);
    expect(screen.queryByRole("columnheader", { name: "Vaga" })).toBeNull();
    expect(screen.queryByText(/fila nº/)).toBeNull();
  });

  it("reserva aprovado sem pagar NÃO acende «aprovado sem pagamento» — só o titular", () => {
    render(<SecaoInscritos {...props()} dados={dados()} />);
    abrir("Reserva2");
    expect(within(gaveta()).queryByText(/Aprovado sem pagamento confirmado/)).toBeNull();
  });
});

// ---------------------------------------------------------------- D4/D5 — gaveta

describe("a gaveta e a fila (D4/D5)", () => {
  it("titular com o prazo vencido: «Passar a vaga ao 1º da fila», com confirmação nomeando quem é chamado", async () => {
    const executar = executarFalso();
    render(<SecaoInscritos {...props(executar)} dados={dados()} />);
    abrir("Titular");
    expect(within(gaveta()).getByText(/Titular sem pagamento depois do prazo/)).toBeTruthy();

    fireEvent.click(within(gaveta()).getByRole("button", { name: "Passar a vaga ao 1º da fila" }));
    // Um clique só não grava: pede a confirmação, dizendo quem sai e quem entra.
    expect(executar).not.toHaveBeenCalled();
    const confirmacao = within(gaveta()).getByRole("group", { name: /Confirmar: passar a vaga de Titular#BR1/ });
    expect(confirmacao.textContent).toContain("Reserva1#BR1, 1º da fila, é chamado na mesma hora");

    await act(async () => fireEvent.click(within(confirmacao).getByRole("button", { name: "Confirmar: passar a vaga" })));
    expect(executar).toHaveBeenCalledWith("passar_vaga", { inscricaoId: "t1" });
  });

  it("com rascunho aberto o botão fica travado — a situação mudaria por baixo do que se marca", () => {
    render(<SecaoInscritos {...props()} dados={dados()} />);
    abrir("Titular");
    aba("Ficha");
    fireEvent.change(screen.getByLabelText("Nota interna"), { target: { value: "x" } });
    aba("Requisitos");
    const botao = within(gaveta()).getByRole("button", { name: "Passar a vaga ao 1º da fila" }) as HTMLButtonElement;
    expect(botao.disabled).toBe(true);
  });

  it("antes de salvar, diz quem é chamado quando a situação tira um titular das vagas", () => {
    render(<SecaoInscritos {...props()} dados={dados()} />);
    abrir("Titular");
    marcar("Situação do inscrito", "Desistiu");
    expect(gaveta().textContent).toContain("Ao salvar, Titular#BR1 sai das vagas.");
    expect(gaveta().textContent).toContain("Reserva1#BR1 é chamado da fila na mesma hora e passa a ter prazo de pagamento.");
  });

  it("e quem desce para a fila quando alguém volta para a conta", () => {
    // O «Fora» se inscreveu antes de todos: voltando, entra nas vagas e empurra o Titular.
    render(<SecaoInscritos {...props()} dados={dados()} />);
    fireEvent.change(screen.getByLabelText("Filtrar por situação"), { target: { value: "desistiu" } });
    abrir("Fora");
    marcar("Situação do inscrito", "Pendente");
    expect(gaveta().textContent).toContain("Ao salvar, Fora#BR1 entra nas vagas, pela ordem de inscrição.");
    expect(gaveta().textContent).toContain("Titular#BR1 desce para a fila de reserva");
  });

  it("a resposta do salvar (alguém chamado da fila) aparece no rodapé da gaveta", async () => {
    const executar = executarFalso();
    render(
      <SecaoInscritos
        {...props(executar, { ultimaMensagem: "Salvo. 1 inscrito foi chamado da fila de reserva — o prazo de pagamento dele já vale." })}
        dados={dados()}
      />,
    );
    abrir("Titular");
    marcar("Situação do inscrito", "Desistiu");
    await act(async () => fireEvent.click(within(gaveta()).getByRole("button", { name: "Salvar tudo" })));
    expect(gaveta().textContent).toContain("✓ Salvo. 1 inscrito foi chamado da fila de reserva");
  });
});

// ---------------------------------------------------------------- F — liberar login

describe("«Liberar login» na gaveta (F)", () => {
  it("mostra antes quantas falhas recentes a conta tem e avisa quando ela está trancada", () => {
    const executar = executarFalso();
    render(<SecaoInscritos {...props(executar)} dados={dados({ falhasDeLogin: { t1: 10 } })} />);
    abrir("Titular");
    expect(within(gaveta()).getByText("login trancado")).toBeTruthy();
    aba("Contato");
    const bloco = within(gaveta()).getByRole("region", { name: "Login da conta" });
    expect(bloco.textContent).toContain("10 falhas de login nos últimos 15 minutos: a conta está TRANCADA");
    fireEvent.click(within(bloco).getByRole("button", { name: "Liberar login" }));
    // Só o id da inscrição: o e-mail sai do banco, no servidor.
    expect(executar).toHaveBeenCalledWith("liberar_login", { inscricaoId: "t1" });
  });

  it("sem falha, diz que não há; com a leitura indisponível, diz isso — e o botão vale igual", () => {
    render(<SecaoInscritos {...props()} dados={dados({ falhasDeLogin: {} })} />);
    abrir("Titular");
    aba("Contato");
    expect(gaveta().textContent).toContain("Nenhuma falha de login nos últimos 15 minutos");
    cleanup();

    render(<SecaoInscritos {...props()} dados={dados({ falhasDeLogin: null })} />);
    abrir("Titular");
    aba("Contato");
    expect(gaveta().textContent).toContain("Não deu para ler as falhas de login agora");
    expect((within(gaveta()).getByRole("button", { name: "Liberar login" }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("a resposta do servidor aparece dentro da gaveta (o aviso do topo fica atrás dela)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init?: { method?: string }) =>
        init?.method === "PATCH"
          ? { ok: true, status: 200, json: async () => ({ ok: true, liberadas: 3, mensagem: "Login liberado: 3 falha(s) recente(s) deixaram de contar contra a conta de Titular#BR1." }) }
          : { ok: true, status: 200, json: async () => dados({ falhasDeLogin: { t1: 3 } }) },
      ),
    );
    render(
      <PainelEdicao
        secao="inscritos"
        onAlert={vi.fn()}
        podeConferir
        podeFinanceiro
        podeConfigurar
        render={(p) => <SecaoInscritos {...p} />}
      />,
    );
    fireEvent.click((await screen.findAllByRole("button", { name: /Titular/ }))[0]!);
    aba("Contato");
    await act(async () => fireEvent.click(within(gaveta()).getByRole("button", { name: "Liberar login" })));
    await waitFor(() =>
      expect(within(gaveta()).getByRole("status").textContent).toContain("Login liberado: 3 falha(s) recente(s)"),
    );
  });
});

// ---------------------------------------------------------------- G — nota interna × recado

describe("nota interna × recado para o jogador (G)", () => {
  const salvarTudo = () => fireEvent.click(within(gaveta()).getByRole("button", { name: "Salvar tudo" }));

  it("o recado vai como `recadoJogador`, sem tocar na nota interna", () => {
    const executar = executarFalso();
    render(<SecaoInscritos {...props(executar)} dados={dados()} />);
    abrir("Titular");
    aba("Ficha");
    fireEvent.change(screen.getByLabelText("Recado para o jogador"), { target: { value: "  Mande o print do perfil.  " } });
    salvarTudo();
    expect(executar).toHaveBeenCalledWith("inscrito", {
      inscricaoId: "t1",
      ficha: { recadoJogador: "Mande o print do perfil.", situacaoAnterior: "apto" },
    });
  });

  it("a nota interna vai como `observacao` — e o recado só viaja quando mudou", () => {
    const executar = executarFalso();
    render(<SecaoInscritos {...props(executar)} dados={dados()} />);
    abrir("Titular");
    aba("Ficha");
    fireEvent.change(screen.getByLabelText("Nota interna"), { target: { value: "Conta conferida no grupo." } });
    salvarTudo();
    const corpo = executar.mock.calls[0]![1] as { ficha: Record<string, unknown> };
    expect(corpo.ficha).toEqual({ observacao: "Conta conferida no grupo.", situacaoAnterior: "apto" });
    expect(corpo.ficha).not.toHaveProperty("recadoJogador");
  });

  it("apagar o recado manda nulo", () => {
    const executar = executarFalso();
    const comRecado = TODOS.map((i) => (i.id === "t1" ? { ...i, recado_jogador: "Recado antigo." } : i));
    render(<SecaoInscritos {...props(executar)} dados={dados({ inscritos: comRecado })} />);
    abrir("Titular");
    aba("Ficha");
    expect((screen.getByLabelText("Recado para o jogador") as HTMLTextAreaElement).value).toBe("Recado antigo.");
    fireEvent.change(screen.getByLabelText("Recado para o jogador"), { target: { value: "" } });
    salvarTudo();
    expect(executar).toHaveBeenCalledWith("inscrito", {
      inscricaoId: "t1",
      ficha: { recadoJogador: null, situacaoAnterior: "apto" },
    });
  });

  it("banco sem a coluna (deploy antes da migração): o recado fica travado, com o porquê", () => {
    // Sem a chave, como o `select *` devolve antes da migração.
    const semColuna = TODOS.map((i) => {
      const copia: Partial<Inscrito> = { ...i };
      delete copia.recado_jogador;
      return copia as Inscrito;
    });
    render(<SecaoInscritos {...props()} dados={dados({ inscritos: semColuna })} />);
    abrir("Titular");
    aba("Ficha");
    const recado = screen.getByLabelText("Recado para o jogador") as HTMLTextAreaElement;
    expect(recado.disabled).toBe(true);
    expect(recado.closest("label")!.textContent).toMatch(/falta a migração do banco/);
    // A nota interna continua editável: o resto da ficha salva normalmente.
    expect((screen.getByLabelText("Nota interna") as HTMLTextAreaElement).disabled).toBe(false);
  });
});

// ---------------------------------------------------------------- D2/D5 — Pagamentos

describe("Pagamentos e a fila (D2/D5)", () => {
  const prazosProntos = () => waitFor(() => expect(screen.queryByText(/Calculando os prazos/)).toBeNull());

  it("reserva não é cobrado: fora da lista de quem falta pagar e dos alertas de aprovado sem pagamento", async () => {
    render(<SecaoPagamentos {...props()} dados={dados()} />);
    await prazosProntos();
    // Só o Titular deve: Reserva2 (aguardando) está na fila, e o Fora desistiu.
    expect(screen.getByRole("button", { name: "Copiar lista de quem falta pagar (1)" })).toBeTruthy();
    // «Aprovado sem pagamento» só para o Titular — nem Reserva2 nem o Sobrado.
    expect(screen.getAllByText(/Aprovado sem pagamento confirmado/)).toHaveLength(1);
  });

  it("«A devolver se não jogar»: o pago da fila, fora do prêmio, com a posição de cada um", async () => {
    render(<SecaoPagamentos {...props()} dados={dados()} />);
    await prazosProntos();
    const titulo = screen.getByRole("heading", { name: "A devolver se não jogar" });
    const bloco = titulo.parentElement!.nextElementSibling!.nextElementSibling!;
    expect(bloco.textContent).toContain("Reserva1#BR1");
    expect(bloco.textContent).toContain("fila nº 1");
    expect(bloco.textContent).toContain("Sobrado#BR1");
    expect(bloco.textContent).not.toContain("Reserva2#BR1");
    // A métrica do caixa, separada do arrecadado.
    expect(document.body.textContent).toMatch(/A devolver se não jogar\s*R\$\s20,00/);
  });

  it("«Perderam o prazo»: passar a vaga ao 1º da fila, com confirmação", async () => {
    const executar = executarFalso();
    render(<SecaoPagamentos {...props(executar)} dados={dados()} />);
    await screen.findByRole("heading", { name: "Perderam o prazo" });
    fireEvent.click(screen.getByRole("button", { name: "Passar a vaga ao 1º da fila" }));
    const confirmacao = screen.getByRole("group", { name: /Confirmar: passar a vaga de Titular#BR1/ });
    expect(confirmacao.textContent).toContain("Reserva1#BR1, 1º da fila");
    await act(async () => fireEvent.click(within(confirmacao).getByRole("button", { name: "Confirmar: passar a vaga" })));
    expect(executar).toHaveBeenCalledWith("passar_vaga", { inscricaoId: "t1" });
  });

  it("declarado não perde a vaga, organizador nunca perde, e sem o escopo da conferência o botão fica travado", async () => {
    const pagamentos = PAGAMENTOS.map((p) =>
      p.inscricao_id === "t1"
        ? { ...p, estado: "declarado" as const, declarado_em: "2026-10-30T10:00:00.000Z" }
        : p.inscricao_id === "org"
          ? { ...p, estado: "aguardando" as const, vence_em: VENCIDO }
          : p,
    );
    render(<SecaoPagamentos {...props()} dados={dados({ pagamentos })} />);
    await prazosProntos();
    expect(screen.queryByRole("heading", { name: "Perderam o prazo" })).toBeNull();
    cleanup();

    render(<SecaoPagamentos {...props(undefined, { podeConferir: false })} dados={dados()} />);
    await screen.findByRole("heading", { name: "Perderam o prazo" });
    expect((screen.getByRole("button", { name: "Passar a vaga ao 1º da fila" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("o prazo único aparece no lugar dos dias", async () => {
    render(<SecaoPagamentos {...props()} dados={dados()} />);
    await prazosProntos();
    expect(screen.getByText("titulares pagam até 31/10/2026")).toBeTruthy();
    expect(document.body.textContent).toContain("Quem está na fila de reserva não aparece aqui: só paga se for chamado.");
  });
});

// ---------------------------------------------------------------- D1 — Times e vagas

describe("Times e vagas mostram a fila na ordem em que é chamada (D1)", () => {
  it("titulares, fila numerada e a sobra no fim; quem pagou na fila aparece marcado", () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 404, json: async () => ({}) })));
    render(<SecaoTimes {...props()} dados={dados()} />);
    expect(screen.getByRole("heading", { name: "Titulares e fila de reserva" })).toBeTruthy();
    const tabela = [...document.querySelectorAll("table")].find((t) => t.textContent?.includes("Na ficha"))!;
    const linhas = [...tabela.querySelectorAll("tbody tr")].map((tr) => tr.textContent ?? "");
    expect(linhas).toHaveLength(3);
    expect(linhas[0]).toMatch(/^fila nº 1Reserva1/);
    expect(linhas[1]).toMatch(/^fila nº 2Reserva2/);
    expect(linhas[2]).toMatch(/^fila · sobraSobrado/);
    expect(linhas[0]).toContain("pagou — fora do prêmio");
    expect(linhas[1]).not.toContain("pagou");
    // Só quem está em «sobra» tem o botão de voltar.
    expect(within(tabela).getAllByRole("button", { name: "Voltar para apto" })).toHaveLength(1);
    expect(document.body.textContent).not.toContain("Isto NÃO é fila com ordem");
  });
});

// ---------------------------------------------------------------- D3 — Configuração

describe("prazo único de pagamento na Configuração (D3)", () => {
  const TZ_ORIGINAL = process.env.TZ;
  afterEach(() => {
    process.env.TZ = TZ_ORIGINAL;
  });

  const campo = () => screen.getByLabelText("Prazo único de pagamento dos titulares") as HTMLInputElement;
  const salvar = () => fireEvent.click(screen.getAllByRole("button", { name: /Salvar alterações/ })[0]!);

  it("mostra o DIA de Brasília, qualquer que seja o fuso do computador", () => {
    process.env.TZ = "Asia/Tokyo";
    render(<SecaoConfiguracao {...props()} dados={dados()} />);
    expect(campo().value).toBe("2026-10-31");
  });

  it("um dia escolhido vira o fim desse dia em Brasília (23:59:59 = 02:59:59Z do dia seguinte)", async () => {
    process.env.TZ = "America/Manaus";
    const executar = executarFalso();
    render(<SecaoConfiguracao {...props(executar)} dados={dados()} />);
    fireEvent.change(campo(), { target: { value: "2026-11-05" } });
    await act(async () => salvar());
    expect(executar).toHaveBeenCalledWith("config", { prazo_pagamento_ate: "2026-11-06T02:59:59.000Z" });
  });

  it("limpar volta para o prazo em dias (nulo)", async () => {
    const executar = executarFalso();
    render(<SecaoConfiguracao {...props(executar)} dados={dados()} />);
    const bloco = campo().closest("label")!.parentElement!;
    fireEvent.click(within(bloco).getByRole("button", { name: "limpar" }));
    await act(async () => salvar());
    expect(executar).toHaveBeenCalledWith("config", { prazo_pagamento_ate: null });
  });

  it("sem mexer no campo, nada vai no corpo", async () => {
    const executar = executarFalso();
    render(<SecaoConfiguracao {...props(executar)} dados={dados()} />);
    fireEvent.change(screen.getByLabelText("Responsável financeiro"), { target: { value: "Lucas" } });
    await act(async () => salvar());
    expect(executar).toHaveBeenCalledWith("config", { responsavel_financeiro: "Lucas" });
  });

  it("banco sem a coluna: o campo fica travado, com o porquê", () => {
    const semColuna: Partial<EdicaoConfig> = config();
    delete semColuna.prazo_pagamento_ate;
    render(<SecaoConfiguracao {...props()} dados={dados({ config: semColuna as EdicaoConfig })} />);
    expect(campo().disabled).toBe(true);
    expect(campo().closest("label")!.textContent).toMatch(/falta a migração do banco/);
  });
});

// ---------------------------------------------------------------- (g) a resposta chega à tela

describe("o que a rota devolve chega à tela (chamados e avisoFila)", () => {
  it("mensagemDoSucesso: «Salvo.», quem foi chamado e o aviso da fila", () => {
    expect(mensagemDoSucesso({})).toBe("Salvo.");
    expect(mensagemDoSucesso({ chamados: 0 })).toBe("Salvo.");
    expect(mensagemDoSucesso({ chamados: 1 })).toBe(
      "Salvo. 1 inscrito foi chamado da fila de reserva — o prazo de pagamento dele já vale.",
    );
    expect(mensagemDoSucesso({ chamados: 2, mensagem: "Salvo. Virou Apto: requisitos cumpridos e pagamento confirmado." })).toBe(
      "Salvo. Virou Apto: requisitos cumpridos e pagamento confirmado. 2 inscritos foram chamados da fila de reserva — o prazo de pagamento deles já vale.",
    );
    expect(mensagemDoSucesso({ avisoFila: "Salvo, mas o prazo de pagamento da fila não foi atualizado." })).toBe(
      "Salvo, mas o prazo de pagamento da fila não foi atualizado.",
    );
    // O «passar a vaga» manda `chamados` em lista e a frase pronta: não é recontado.
    expect(mensagemDoSucesso({ chamados: [{ inscricaoId: "r1" }], mensagem: "Vaga liberada." })).toBe("Vaga liberada.");
  });

  it("no painel: o aviso da fila sai no tom de erro, mas a ação conta como gravada", async () => {
    const onAlert = vi.fn();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init?: { method?: string }) =>
        init?.method === "PATCH"
          ? {
              ok: true,
              status: 200,
              json: async () => ({
                ok: true,
                promovido: false,
                chamados: 0,
                avisoFila: "Salvo, mas o prazo de pagamento da fila não foi atualizado. Salve de novo em instantes.",
              }),
            }
          : { ok: true, status: 200, json: async () => dados() },
      ),
    );
    let executar: PropsSecao["executar"] | null = null;
    render(
      <PainelEdicao
        secao="inscritos"
        onAlert={onAlert}
        podeConferir
        podeFinanceiro
        podeConfigurar
        render={(p) => {
          executar = p.executar;
          return <SecaoInscritos {...p} />;
        }}
      />,
    );
    await screen.findAllByRole("button", { name: /Titular/ });
    let ok: boolean | null = null;
    await act(async () => {
      ok = await executar!("ficha", { inscricaoId: "t1", situacao: "desistiu" });
    });
    expect(ok).toBe(true);
    expect(onAlert).toHaveBeenLastCalledWith(
      "erro",
      "Salvo, mas o prazo de pagamento da fila não foi atualizado. Salve de novo em instantes.",
    );
  });
});
