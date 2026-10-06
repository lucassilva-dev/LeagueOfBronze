// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { DadosEdicao, Inscrito } from "@/components/admin/e4/painel-edicao";
import { SecaoInscritos } from "@/components/admin/e4/secao-inscritos";
import { ITENS_CONFERENCIA } from "@/lib/inscricoes/schema";

/**
 * DOIS ORGANIZADORES NA MESMA INSCRIÇÃO — e a gaveta com um "Salvar tudo" só.
 *
 * O defeito que estes testes travam: a ficha guardava cada campo num `useState` semeado
 * na montagem, e ela não remonta quando o painel recarrega (a chave é o id do inscrito).
 * Quem estava com a ficha aberta continuava vendo a foto velha; e, comparando a foto velha
 * com os dados novos, a tela achava que ELE tinha mudado os campos que o OUTRO organizador
 * mudou. O próximo "Salvar" devolvia ao banco os valores antigos — a situação voltava a
 * "pendente" e o turno registrado sumia, com a auditoria culpando quem nem tocou neles.
 *
 * Juntar os sete botões de salvar num só não pode reabrir isso: o corpo do "Salvar tudo"
 * leva SÓ o que esta tela mudou, requisito por requisito e campo por campo.
 *
 * O recarregamento é reproduzido com um `rerender` de dados novos, que é o que o
 * `carregar()` do painel faz depois de qualquer ação.
 */

afterEach(cleanup);

function inscrito(over: Partial<Inscrito> = {}): Inscrito {
  return {
    id: "x1",
    criado_em: "2026-10-05T12:00:00.000Z",
    nick: "Fulano",
    tag: "BR1",
    riot_id: "Fulano#BR1",
    nome_real: "Fulano",
    email: "fulano@exemplo.com",
    discord: "fulano",
    whatsapp: null,
    elo_declarado: "Ouro",
    elo_verificado: null,
    elo_congelado: null,
    pontos: 4,
    rota_primaria: "MID",
    rota_secundaria: "TOP",
    disponibilidade: [],
    quer_capitao: false,
    entrou_no_grupo: "2025-06-19",
    situacao: "pendente",
    organizador: false,
    observacao: null,
    ...over,
  };
}

type Estados = Partial<Record<(typeof ITENS_CONFERENCIA)[number], string>>;

function dados(lista: Inscrito[], estados: Estados = {}, inicioCampeonato: string | null = null): DadosEdicao {
  return {
    config: {
      nome: "4ª Edição",
      abertura_inscricoes: "2026-10-05T12:13:35.000Z",
      fechamento_inscricoes: null,
      prazo_vinculo_riot: null,
      congelamento_elo: null,
      data_draft: null,
      inicio_campeonato: inicioCampeonato,
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
    inscritos: lista,
    conferencias: lista.flatMap((i) =>
      ITENS_CONFERENCIA.map((item) => ({
        inscricao_id: i.id,
        item,
        estado: (i.id === "x1" ? estados[item] : undefined) ?? "pendente",
        observacao: null,
        conferido_por: null,
        conferido_em: null,
      })),
    ),
    pagamentos: [],
    panorama: {
      inscritos: lista.length,
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

const props = (executar: ReturnType<typeof vi.fn>) => ({
  executar: executar as never,
  ocupado: false,
  podeConferir: true,
  podeFinanceiro: true,
  podeConfigurar: true,
});

function montar(executar = vi.fn(async () => true), lista = [inscrito()], estados: Estados = {}) {
  const p = props(executar);
  const tela = render(<SecaoInscritos {...p} dados={dados(lista, estados)} />);
  fireEvent.click(screen.getAllByRole("button", { name: /Fulano/ })[0]!);
  return { ...tela, props: p, executar };
}

const gaveta = () => screen.getByRole("dialog");
const aba = (nome: string) => fireEvent.click(within(gaveta()).getByRole("tab", { name: new RegExp(`^${nome}`) }));
const salvarTudo = () => fireEvent.click(within(gaveta()).getByRole("button", { name: "Salvar tudo" }));

/** Clica na opção `rotulo` do grupo de botões `grupo` (requisito ou situação). */
function marcar(grupo: string, rotulo: string) {
  const radios = within(screen.getByRole("radiogroup", { name: grupo }));
  fireEvent.click(radios.getByRole("radio", { name: new RegExp(`^(✓ )?${rotulo}$`) }));
}

function marcado(grupo: string) {
  const radios = within(screen.getByRole("radiogroup", { name: grupo })).getAllByRole("radio");
  return radios.find((r) => r.getAttribute("aria-checked") === "true")?.textContent?.replace(/^✓ /, "");
}

describe("um «Salvar tudo» só", () => {
  it("requisitos e ficha vão juntos numa chamada — só o que mudou", () => {
    const { executar } = montar();

    marcar("Estado do item A", "Cumpre");
    marcar("Estado do item F", "Não cumpre");
    marcar("Situação do inscrito", "Recusado");
    aba("Ficha");
    fireEvent.change(screen.getByLabelText("Observação da ficha"), { target: { value: "Conta smurf." } });
    salvarTudo();

    expect(executar).toHaveBeenCalledTimes(1);
    expect(executar).toHaveBeenCalledWith("inscrito", {
      inscricaoId: "x1",
      conferencias: [
        { item: "a", estado: "ok" },
        { item: "f", estado: "recusado" },
      ],
      ficha: { situacao: "recusado", observacao: "Conta smurf." },
    });
  });

  it("o rascunho atravessa as abas: mudar de aba não perde o que foi marcado", () => {
    montar();
    marcar("Estado do item B", "Cumpre");
    aba("Ficha");
    aba("Contato");
    aba("Requisitos");
    expect(marcado("Estado do item B")).toBe("Cumpre");
    expect(within(gaveta()).getByText(/^1 alteração não salva/)).toBeTruthy();
  });

  it("sem nada alterado, o botão fica desligado", () => {
    montar();
    expect((within(gaveta()).getByRole("button", { name: "Salvar tudo" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("a data de entrada no grupo não aparece — estar no grupo é o item (a)", () => {
    montar();
    for (const nome of ["Requisitos", "Ficha", "Contato"]) {
      aba(nome);
      expect(within(gaveta()).queryByText(/entrou no grupo/i)).toBeNull();
      expect(within(gaveta()).queryByText("19/06/2025")).toBeNull();
    }
  });
});

describe("atalho «Pendentes → Cumpre»", () => {
  it("marca só o que está pendente; o (E) sem data de início vira «não avaliável»", () => {
    const { executar } = montar(undefined, undefined, { f: "risco" });

    fireEvent.click(within(gaveta()).getByRole("button", { name: /Pendentes → Cumpre/ }));
    expect(marcado("Estado do item F")).toBe("Em risco");
    expect(marcado("Estado do item E")).toBe("Não avaliável");
    salvarTudo();

    expect(executar).toHaveBeenCalledWith("inscrito", {
      inscricaoId: "x1",
      conferencias: [
        { item: "a", estado: "ok" },
        { item: "b", estado: "ok" },
        { item: "d", estado: "ok" },
        { item: "e", estado: "nao_avaliavel" },
        { item: "m", estado: "ok" },
      ],
    });
  });

  const DIA = 24 * 60 * 60 * 1000;
  const abrirCom = (inicio: string) => {
    render(<SecaoInscritos {...props(vi.fn(async () => true))} dados={dados([inscrito()], {}, inicio)} />);
    fireEvent.click(screen.getAllByRole("button", { name: /Fulano/ })[0]!);
    fireEvent.click(within(gaveta()).getByRole("button", { name: /Pendentes → Cumpre/ }));
  };

  it("com a janela de 10 dias já aberta, o (E) também vira «cumpre»", () => {
    abrirCom(new Date(Date.now() + 5 * DIA).toISOString());
    expect(marcado("Estado do item E")).toBe("Cumpre");
  });

  it("com o início decidido mas a janela ainda fechada, o (E) continua «não avaliável»", () => {
    // Aprovar o (E) em outubro com início em novembro é afirmar as partidas dos 10 dias
    // antes do início antes de eles existirem — e, aprovado, ninguém volta nele.
    abrirCom(new Date(Date.now() + 30 * DIA).toISOString());
    expect(marcado("Estado do item E")).toBe("Não avaliável");
    expect(marcado("Estado do item D")).toBe("Cumpre");
    expect(within(gaveta()).getByText(/essa janela só abre em/)).toBeTruthy();
  });
});

describe("a gaveta não desfaz o que outro organizador gravou", () => {
  it("salvar uma observação NÃO reenvia situação nem disponibilidade que o outro mudou", () => {
    const { rerender, props: p, executar } = montar();

    // Enquanto a gaveta está aberta, OUTRO organizador marca Apto e Noite; o painel recarrega.
    rerender(<SecaoInscritos {...p} dados={dados([inscrito({ situacao: "apto", disponibilidade: ["noite"] })])} />);

    // A tela mostra o que está no banco agora, e não acusa mudança local nenhuma.
    expect(within(gaveta()).getByText("Nada alterado.")).toBeTruthy();
    expect(marcado("Situação do inscrito")).toBe("Apto");

    aba("Ficha");
    fireEvent.change(screen.getByLabelText("Observação da ficha"), { target: { value: "Conferido no grupo." } });
    salvarTudo();

    expect(executar).toHaveBeenCalledTimes(1);
    expect(executar).toHaveBeenCalledWith("inscrito", {
      inscricaoId: "x1",
      ficha: { observacao: "Conferido no grupo." },
    });
  });

  it("o que ESTE organizador mudou vai, mesmo depois de um recarregamento", () => {
    const { rerender, props: p, executar } = montar();

    marcar("Situação do inscrito", "Recusado");
    rerender(<SecaoInscritos {...p} dados={dados([inscrito({ observacao: "nota do outro" })])} />);
    salvarTudo();

    expect(executar).toHaveBeenCalledWith("inscrito", { inscricaoId: "x1", ficha: { situacao: "recusado" } });
  });

  it("o veredicto que outro gravou aparece, e salvar só a observação não o reenvia", () => {
    const { rerender, props: p, executar } = montar();

    rerender(<SecaoInscritos {...p} dados={dados([inscrito()], { b: "ok" })} />);
    expect(marcado("Estado do item B")).toBe("Cumpre");

    const itemB = screen.getByRole("radiogroup", { name: "Estado do item B" }).closest("section")!;
    fireEvent.click(within(itemB).getByRole("button", { name: "+ observação" }));
    fireEvent.change(screen.getByLabelText("Observação do item B"), { target: { value: "print no privado" } });
    salvarTudo();

    expect(executar).toHaveBeenCalledWith("inscrito", {
      inscricaoId: "x1",
      conferencias: [{ item: "b", observacao: "print no privado" }],
    });
  });

  it("mudar só o estado NÃO apaga a observação que outro gravou sem a tela saber", () => {
    // Sem recarregamento nenhum: B escreveu a observação depois da última carga desta
    // tela. Mandar a observação vazia que a tela tem apagaria a justificativa dele.
    const { executar } = montar();
    marcar("Estado do item B", "Cumpre");
    salvarTudo();

    expect(executar).toHaveBeenCalledWith("inscrito", {
      inscricaoId: "x1",
      conferencias: [{ item: "b", estado: "ok" }],
    });
  });

  it("completa o nome de quem se inscreveu só com o apelido — e barra um nome só", () => {
    const { executar } = montar();
    aba("Ficha");
    const campo = screen.getByLabelText("Nome e sobrenome do inscrito");
    const salvar = () => within(gaveta()).getByRole("button", { name: "Salvar tudo" }) as HTMLButtonElement;

    fireEvent.change(campo, { target: { value: "Fulaninho" } });
    expect(salvar().disabled).toBe(true);

    fireEvent.change(campo, { target: { value: "Fulano de Tal" } });
    expect(salvar().disabled).toBe(false);
    fireEvent.click(salvar());
    expect(executar).toHaveBeenCalledWith("inscrito", { inscricaoId: "x1", ficha: { nomeReal: "Fulano de Tal" } });
  });

  it("registra os turnos de quem se inscreveu antes da pergunta", () => {
    const { executar } = montar();
    aba("Ficha");
    fireEvent.click(screen.getByLabelText("Noite"));
    fireEvent.click(screen.getByLabelText("Manhã"));
    salvarTudo();
    // Na ordem do dia, não na ordem dos cliques.
    expect(executar).toHaveBeenCalledWith("inscrito", {
      inscricaoId: "x1",
      ficha: { disponibilidade: ["manha", "noite"] },
    });
  });
});

describe("mexer e desfazer é o mesmo que não mexer", () => {
  it("situação trocada e destrocada volta a acompanhar o servidor", () => {
    const { rerender, props: p, executar } = montar();

    marcar("Situação do inscrito", "Apto");
    marcar("Situação do inscrito", "Pendente");

    // Outro organizador marca Apto; o painel recarrega.
    rerender(<SecaoInscritos {...p} dados={dados([inscrito({ situacao: "apto" })])} />);
    expect(marcado("Situação do inscrito")).toBe("Apto");

    aba("Ficha");
    fireEvent.change(screen.getByLabelText("Observação da ficha"), { target: { value: "ok" } });
    salvarTudo();
    expect(executar).toHaveBeenCalledWith("inscrito", { inscricaoId: "x1", ficha: { observacao: "ok" } });
  });

  it("estado de requisito trocado e destrocado também", () => {
    const { rerender, props: p, executar } = montar();

    marcar("Estado do item D", "Não cumpre");
    marcar("Estado do item D", "Pendente");
    rerender(<SecaoInscritos {...p} dados={dados([inscrito()], { d: "ok" })} />);
    expect(marcado("Estado do item D")).toBe("Cumpre");

    marcar("Estado do item A", "Cumpre");
    salvarTudo();
    expect(executar).toHaveBeenCalledWith("inscrito", {
      inscricaoId: "x1",
      conferencias: [{ item: "a", estado: "ok" }],
    });
  });
});

describe("quando o salvamento grava mas a tela não recarrega", () => {
  it("o rascunho fica na tela — e o motivo aparece dentro da gaveta", async () => {
    const executar = vi.fn(async () => false);
    const p = props(executar);
    render(
      <SecaoInscritos {...p} ultimoErro="Não foi possível falar com o servidor." dados={dados([inscrito()])} />,
    );
    fireEvent.click(screen.getAllByRole("button", { name: /Fulano/ })[0]!);
    marcar("Estado do item A", "Cumpre");
    await act(async () => salvarTudo());

    expect(marcado("Estado do item A")).toBe("Cumpre");
    expect(within(gaveta()).getByRole("alert").textContent).toContain("Não foi possível falar com o servidor.");
  });
});

describe("navegar pela lista sem perder trabalho", () => {
  const dois = () => [inscrito(), inscrito({ id: "x2", nick: "Beltrano", riot_id: "Beltrano#BR1" })];

  it("«Salvar e próximo» grava e abre o seguinte da lista", async () => {
    const { executar } = montar(undefined, dois());
    marcar("Estado do item A", "Cumpre");
    await act(async () => fireEvent.click(within(gaveta()).getByRole("button", { name: "Salvar e próximo ›" })));

    expect(executar).toHaveBeenCalledWith("inscrito", {
      inscricaoId: "x1",
      conferencias: [{ item: "a", estado: "ok" }],
    });
    expect(within(gaveta()).getByRole("heading", { level: 2 }).textContent).toContain("Beltrano");
  });

  it("se o salvamento falha, NÃO avança — o rascunho fica com quem ele pertence", async () => {
    const executar = vi.fn(async () => false);
    montar(executar, dois());
    marcar("Estado do item A", "Cumpre");
    await act(async () => fireEvent.click(within(gaveta()).getByRole("button", { name: "Salvar e próximo ›" })));

    expect(within(gaveta()).getByRole("heading", { level: 2 }).textContent).toContain("Fulano");
    expect(marcado("Estado do item A")).toBe("Cumpre");
  });

  it("sair com alteração pendente pergunta antes; descartar não grava nada", () => {
    const { executar } = montar(undefined, dois());
    marcar("Estado do item A", "Cumpre");

    fireEvent.click(within(gaveta()).getByRole("button", { name: "Próximo ›" }));
    // Ainda no mesmo inscrito, com a pergunta na frente.
    expect(within(gaveta()).getByRole("heading", { level: 2 }).textContent).toContain("Fulano");
    expect(within(gaveta()).getByRole("button", { name: "Salvar e abrir Beltrano" })).toBeTruthy();
    fireEvent.click(within(gaveta()).getByRole("button", { name: "Descartar" }));

    expect(within(gaveta()).getByRole("heading", { level: 2 }).textContent).toContain("Beltrano");
    expect(marcado("Estado do item A")).toBe("Pendente");
    expect(executar).not.toHaveBeenCalled();
  });

  it("o rascunho de uma pessoa não vai para a próxima", () => {
    const { executar } = montar(undefined, dois());
    marcar("Estado do item A", "Cumpre");
    fireEvent.keyDown(gaveta(), { key: "Escape" });
    fireEvent.click(within(gaveta()).getByRole("button", { name: "Descartar" }));
    expect(screen.queryByRole("dialog")).toBeNull();

    fireEvent.click(screen.getAllByRole("button", { name: /Beltrano/ })[0]!);
    expect(marcado("Estado do item A")).toBe("Pendente");
    expect(within(gaveta()).getByText("Nada alterado.")).toBeTruthy();
    expect(executar).not.toHaveBeenCalled();
  });

  it("Esc sem alteração fecha direto", () => {
    montar();
    fireEvent.keyDown(gaveta(), { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("somente leitura", () => {
  it("quem não tem o escopo enxerga tudo mas não marca nada", () => {
    const executar = vi.fn(async () => true);
    render(<SecaoInscritos {...props(executar)} podeConferir={false} dados={dados([inscrito()])} />);
    fireEvent.click(screen.getAllByRole("button", { name: /Fulano/ })[0]!);

    const radios = within(screen.getByRole("radiogroup", { name: "Estado do item A" })).getAllByRole("radio");
    expect(radios.every((r) => (r as HTMLButtonElement).disabled)).toBe(true);
    expect((within(gaveta()).getByRole("button", { name: /Pendentes → Cumpre/ }) as HTMLButtonElement).disabled).toBe(
      true,
    );
  });
});

describe("falha no meio do «Salvar tudo»", () => {
  it("o que entrou sai do rascunho — e não volta por cima do que outro gravou depois", async () => {
    const executar = vi.fn(async () => false);
    const p = props(executar);
    const { rerender } = render(<SecaoInscritos {...p} dados={dados([inscrito()])} />);
    fireEvent.click(screen.getAllByRole("button", { name: /Fulano/ })[0]!);

    marcar("Estado do item A", "Cumpre");
    marcar("Estado do item B", "Cumpre");
    await act(async () => salvarTudo());

    // O painel recarrega mesmo na falha: o (A) chegou a ser gravado, o (B) não.
    rerender(<SecaoInscritos {...p} dados={dados([inscrito()], { a: "ok" })} />);
    // Depois, OUTRO organizador reprova o (A); o painel recarrega de novo.
    rerender(<SecaoInscritos {...p} dados={dados([inscrito()], { a: "recusado" })} />);
    expect(marcado("Estado do item A")).toBe("Não cumpre");

    executar.mockResolvedValue(true);
    await act(async () => salvarTudo());
    expect(executar).toHaveBeenLastCalledWith("inscrito", {
      inscricaoId: "x1",
      conferencias: [{ item: "b", estado: "ok" }],
    });
  });
});

describe("durante o salvamento", () => {
  it("Esc e ✕ não fecham — fechar ali não cancelaria a gravação", () => {
    const executar = vi.fn(async () => true);
    const p = props(executar);
    const { rerender } = render(<SecaoInscritos {...p} dados={dados([inscrito()])} />);
    fireEvent.click(screen.getAllByRole("button", { name: /Fulano/ })[0]!);
    marcar("Estado do item A", "Cumpre");

    rerender(<SecaoInscritos {...p} ocupado dados={dados([inscrito()])} />);
    fireEvent.keyDown(document.body, { key: "Escape" });
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(within(gaveta()).queryByRole("button", { name: "Descartar" })).toBeNull();
    expect((within(gaveta()).getByRole("button", { name: /Fechar/ }) as HTMLButtonElement).disabled).toBe(true);
  });
});

describe("teclado", () => {
  it("o Esc funciona mesmo com o foco perdido no <body>", () => {
    // Acontece quando o botão clicado fica desabilitado (o atalho, o "Salvar"): o
    // navegador joga o foco no body, e um ouvinte só no painel deixava de ouvir.
    montar();
    (document.activeElement as HTMLElement | null)?.blur();
    fireEvent.keyDown(document.body, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("a situação fica no rodapé, à vista em qualquer aba", () => {
    montar();
    aba("Ficha");
    expect(screen.getByRole("radiogroup", { name: "Situação do inscrito" })).toBeTruthy();
    aba("Contato");
    marcar("Situação do inscrito", "Apto");
    expect(marcado("Situação do inscrito")).toBe("Apto");
  });

  it("«Salvar e fechar» na confirmação grava e fecha", async () => {
    const { executar } = montar();
    marcar("Situação do inscrito", "Apto");
    fireEvent.keyDown(gaveta(), { key: "Escape" });
    await act(async () => fireEvent.click(within(gaveta()).getByRole("button", { name: "Salvar e fechar" })));

    expect(executar).toHaveBeenCalledWith("inscrito", { inscricaoId: "x1", ficha: { situacao: "apto" } });
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
