// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { DadosEdicao, Inscrito } from "@/components/admin/e4/painel-edicao";
import { SecaoInscritos } from "@/components/admin/e4/secao-inscritos";
import { ITENS_CONFERENCIA } from "@/lib/inscricoes/schema";

/**
 * DOIS ORGANIZADORES NA MESMA FICHA.
 *
 * O defeito: a ficha guardava cada campo num `useState` semeado na montagem, e ela não
 * remonta quando o painel recarrega (a chave é o id do inscrito). Quem estava com a ficha
 * aberta continuava vendo a foto velha; e, comparando a foto velha com os dados novos,
 * a tela achava que ELE tinha mudado os campos que o OUTRO organizador mudou. O próximo
 * "Salvar" devolvia ao banco os valores antigos — a situação voltava a "pendente" e o
 * turno registrado sumia, com a auditoria culpando quem nem tocou neles.
 *
 * O teste reproduz o recarregamento com um `rerender` de dados novos, que é o que o
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
    entrou_no_grupo: null,
    situacao: "pendente",
    organizador: false,
    observacao: null,
    ...over,
  };
}

function dados(i: Inscrito, estadoDoItemB = "pendente"): DadosEdicao {
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
    inscritos: [i],
    conferencias: ITENS_CONFERENCIA.map((item) => ({
      inscricao_id: i.id,
      item,
      estado: item === "b" ? estadoDoItemB : "pendente",
      observacao: null,
      conferido_por: null,
      conferido_em: null,
    })),
    pagamentos: [],
    panorama: {
      inscritos: 1,
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

function montar(executar = vi.fn(async () => true)) {
  const props = { executar, ocupado: false, podeConferir: true, podeFinanceiro: true, podeConfigurar: true };
  const tela = render(<SecaoInscritos {...props} dados={dados(inscrito())} />);
  fireEvent.click(screen.getAllByRole("button", { name: /Fulano/ })[0]!);
  return { ...tela, props, executar };
}

describe("a ficha não desfaz o que outro organizador gravou", () => {
  it("salvar uma observação NÃO reenvia situação nem disponibilidade que o outro mudou", async () => {
    const { rerender, props, executar } = montar();

    // Enquanto a ficha está aberta, OUTRO organizador marca Apto e Noite; o painel recarrega.
    rerender(
      <SecaoInscritos {...props} dados={dados(inscrito({ situacao: "apto", disponibilidade: ["noite"] }))} />,
    );

    // A tela mostra o que está no banco agora, e não acusa mudança local nenhuma.
    expect(screen.getByText("Nada mudou desde o último salvamento.")).toBeTruthy();
    expect((screen.getByLabelText("Situação do inscrito") as HTMLSelectElement).value).toBe("apto");

    // Este organizador só escreve uma observação e salva.
    fireEvent.change(screen.getByLabelText("Observação da ficha"), { target: { value: "Conferido no grupo." } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar ficha" }));

    expect(executar).toHaveBeenCalledTimes(1);
    expect(executar).toHaveBeenCalledWith("ficha", { inscricaoId: "x1", observacao: "Conferido no grupo." });
  });

  it("o que ESTE organizador mudou vai, mesmo depois de um recarregamento", () => {
    const { rerender, props, executar } = montar();

    fireEvent.change(screen.getByLabelText("Situação do inscrito"), { target: { value: "recusado" } });
    rerender(<SecaoInscritos {...props} dados={dados(inscrito({ observacao: "nota do outro" }))} />);
    fireEvent.click(screen.getByRole("button", { name: "Salvar ficha" }));

    expect(executar).toHaveBeenCalledWith("ficha", { inscricaoId: "x1", situacao: "recusado" });
  });

  it("completa o nome de quem se inscreveu só com o apelido — e barra um nome só", () => {
    const { executar } = montar();
    const campo = screen.getByLabelText("Nome e sobrenome do inscrito");
    const salvar = () => screen.getByRole("button", { name: "Salvar ficha" }) as HTMLButtonElement;

    fireEvent.change(campo, { target: { value: "Fulaninho" } });
    expect(salvar().disabled).toBe(true);

    fireEvent.change(campo, { target: { value: "Fulano de Tal" } });
    expect(salvar().disabled).toBe(false);
    fireEvent.click(salvar());
    expect(executar).toHaveBeenCalledWith("ficha", { inscricaoId: "x1", nomeReal: "Fulano de Tal" });
  });

  it("registra os turnos de quem se inscreveu antes da pergunta", () => {
    const { executar } = montar();
    fireEvent.click(screen.getByLabelText("Noite"));
    fireEvent.click(screen.getByLabelText("Manhã"));
    fireEvent.click(screen.getByRole("button", { name: "Salvar ficha" }));
    // Na ordem do dia, não na ordem dos cliques.
    expect(executar).toHaveBeenCalledWith("ficha", { inscricaoId: "x1", disponibilidade: ["manha", "noite"] });
  });
});

describe("o bloco de conferência também não desfaz", () => {
  it("o veredicto que outro organizador gravou aparece, e não volta ao antigo", () => {
    const { rerender, props, executar } = montar();

    rerender(<SecaoInscritos {...props} dados={dados(inscrito(), "ok")} />);
    expect((screen.getByLabelText("Estado do item B") as HTMLSelectElement).value).toBe("ok");

    fireEvent.change(screen.getByLabelText("Observação do item B"), { target: { value: "print no privado" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar item B" }));

    // Só a observação: o estado ficou intocado, e reenviá-lo seria apostar que a tela
    // está em dia com o banco.
    expect(executar).toHaveBeenCalledWith("conferencia", {
      inscricaoId: "x1",
      item: "b",
      observacao: "print no privado",
    });
  });

  it("mudar só o estado NÃO apaga a observação que outro gravou sem a tela saber", () => {
    // Sem recarregamento nenhum: B escreveu a observação depois da última carga desta
    // tela. Mandar a observação vazia que a tela tem apagaria a justificativa dele.
    const { executar } = montar();
    fireEvent.change(screen.getByLabelText("Estado do item B"), { target: { value: "ok" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar item B" }));

    expect(executar).toHaveBeenCalledWith("conferencia", { inscricaoId: "x1", item: "b", estado: "ok" });
  });
});

describe("mexer e desfazer é o mesmo que não mexer", () => {
  it("situação trocada e destrocada volta a acompanhar o servidor", () => {
    const { rerender, props, executar } = montar();

    const situacao = screen.getByLabelText("Situação do inscrito");
    fireEvent.change(situacao, { target: { value: "apto" } });
    fireEvent.change(situacao, { target: { value: "pendente" } });

    // Outro organizador marca Apto; o painel recarrega.
    rerender(<SecaoInscritos {...props} dados={dados(inscrito({ situacao: "apto" }))} />);
    expect((screen.getByLabelText("Situação do inscrito") as HTMLSelectElement).value).toBe("apto");

    fireEvent.change(screen.getByLabelText("Observação da ficha"), { target: { value: "ok" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar ficha" }));
    expect(executar).toHaveBeenCalledWith("ficha", { inscricaoId: "x1", observacao: "ok" });
  });
});

describe("quando o salvamento grava mas a tela não recarrega", () => {
  it("o rascunho fica na tela — a pessoa não vê a foto de antes como se nada tivesse salvo", async () => {
    const executar = vi.fn(async () => false);
    montar(executar);
    fireEvent.change(screen.getByLabelText("Observação da ficha"), { target: { value: "conferido" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar ficha" }));
    await Promise.resolve();
    expect((screen.getByLabelText("Observação da ficha") as HTMLTextAreaElement).value).toBe("conferido");
  });
});
