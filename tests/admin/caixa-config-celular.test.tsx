// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { DadosEdicao, Inscrito, Pagamento, PropsSecao } from "@/components/admin/e4/painel-edicao";
import { SecaoConfiguracao } from "@/components/admin/e4/secao-configuracao";
import { SecaoPagamentos } from "@/components/admin/e4/secao-pagamentos";
import { ModoCompacto } from "@/components/admin/responsivo";

/**
 * Pagamentos e Configuração no CELULAR (`ModoCompacto`).
 *
 * O que se prova aqui é o que o celular tem de diferente do monitor: nenhuma tabela larga
 * (elas obrigavam a rolar de lado), o pagamento abrindo numa folha com a mesma troca de
 * estado da linha da tabela, e o «Salvar» da configuração ao alcance enquanto há rascunho.
 * O arranjo de mesa continua coberto por secoes-edicao e robo-no-painel, que renderizam
 * fora do provedor.
 */

afterEach(cleanup);

function inscrito(over: Partial<Inscrito> & { id: string }): Inscrito {
  return {
    criado_em: "2026-10-05T12:00:00.000Z",
    nick: `Jogador${over.id}`,
    tag: "BR1",
    riot_id: `Jogador${over.id}#BR1`,
    nome_real: null,
    email: `${over.id}@exemplo.com`,
    discord: `disc_${over.id}`,
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

function pagamento(over: Partial<Pagamento> & { inscricao_id: string }): Pagamento {
  return {
    estado: "aguardando",
    valor_centavos: 3000,
    declarado_em: null,
    conferido_por: null,
    conferido_em: null,
    // Vence em dois dias: entra no bloco de prazos.
    vence_em: new Date(Date.now() + 2 * 86_400_000).toISOString(),
    observacao: null,
    ...over,
  };
}

function dados(): DadosEdicao {
  const inscritos = [inscrito({ id: "a1" }), inscrito({ id: "d1", situacao: "apto" })];
  return {
    config: {
      nome: "4ª Edição",
      abertura_inscricoes: null,
      fechamento_inscricoes: null,
      prazo_vinculo_riot: null,
      congelamento_elo: null,
      data_draft: null,
      inicio_campeonato: null,
      inscricoes_abertas: false,
      jogadores_por_time: 5,
      orcamento_por_time: 30,
      min_ranqueadas: 5,
      dias_no_grupo: 60,
      prazo_pagamento_dias: 14,
      segundos_por_escolha: 60,
      taxa_centavos: 3000,
      pct_campeao: 70,
      chave_pix: "123e4567-e89b-12d3-a456-426614174000",
      responsavel_financeiro: null,
    },
    inscritos,
    conferencias: [],
    pagamentos: [
      pagamento({ inscricao_id: "a1" }),
      pagamento({ inscricao_id: "d1", estado: "declarado", declarado_em: "2026-10-10T10:00:00.000Z" }),
    ],
    panorama: {
      inscritos: 2,
      elegiveis: 2,
      aprovados: 1,
      pendentes: 1,
      recusados: 0,
      times: 0,
      vagas: 0,
      sobra: 2,
      caixa: { recebido: 0, estornado: 0, aDevolver: 0, emCaixa: 0, arrecadado: 0, aReceber: 6000, isento: 0 },
    },
    auditoria: [],
  };
}

function props(executar: PropsSecao["executar"]): PropsSecao {
  return {
    dados: dados(),
    executar,
    ocupado: false,
    podeConferir: true,
    podeFinanceiro: true,
    podeConfigurar: true,
  };
}

describe("Pagamentos no celular", () => {
  it("nenhuma tabela: prazos e a lista de todos viram cartões", async () => {
    const { container } = render(
      <ModoCompacto ativo>
        <SecaoPagamentos {...props(vi.fn(async () => true))} />
      </ModoCompacto>,
    );
    // O «Cobrar» só aparece depois que o efeito lê a origem do site.
    await waitFor(() => screen.getByRole("link", { name: /Cobrar no WhatsApp/ }));
    expect(container.querySelector("table")).toBeNull();
    expect(screen.getByRole("button", { name: "Abrir o pagamento de Jogadora1#BR1" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Abrir o pagamento de Jogadord1#BR1" })).toBeTruthy();
  });

  it("o cartão abre a folha, e a troca de estado nela grava como a linha da tabela", async () => {
    const executar = vi.fn(async () => true);
    render(
      <ModoCompacto ativo>
        <SecaoPagamentos {...props(executar)} />
      </ModoCompacto>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Abrir o pagamento de Jogadora1#BR1" }));
    const folha = await waitFor(() => screen.getByRole("dialog"));
    expect(within(folha).getByText("Jogadora1#BR1")).toBeTruthy();

    fireEvent.change(within(folha).getByRole("textbox", { name: "Observação do pagamento de Jogadora1#BR1" }), {
      target: { value: "PIX conferido no extrato" },
    });
    // «Pago» mexe no caixa: a troca pelo <select> pede confirmação (P4A-10).
    const confirmar = vi.spyOn(window, "confirm").mockReturnValue(true);
    try {
      fireEvent.change(within(folha).getByRole("combobox", { name: "Estado do pagamento de Jogadora1#BR1" }), {
        target: { value: "pago" },
      });
    } finally {
      confirmar.mockRestore();
    }
    expect(executar).toHaveBeenCalledWith("pagamento", {
      inscricaoId: "a1",
      estado: "pago",
      observacao: "PIX conferido no extrato",
      estadoAnterior: "aguardando",
    });
  });

  it("fila de declarados: os dois botões continuam no cartão, cada um com o seu estado", () => {
    const executar = vi.fn(async () => true);
    render(
      <ModoCompacto ativo>
        <SecaoPagamentos {...props(executar)} />
      </ModoCompacto>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Confirmar recebido" }));
    expect(executar).toHaveBeenCalledWith("pagamento", {
      inscricaoId: "d1",
      estado: "pago",
      observacao: undefined,
      estadoAnterior: "declarado",
    });
  });
});

describe("Configuração no celular", () => {
  const barra = () => screen.queryByRole("group", { name: "Alterações da configuração" });

  it("com rascunho, o salvar fica preso acima da doca e manda o mesmo diff", () => {
    const executar = vi.fn(async () => true);
    render(
      <ModoCompacto ativo>
        <SecaoConfiguracao {...props(executar)} />
      </ModoCompacto>,
    );
    expect(barra()).toBeNull(); // sem rascunho, sem barra

    fireEvent.change(screen.getByRole("textbox", { name: "Jogadores por time" }), { target: { value: "4" } });
    const presa = barra();
    expect(presa).toBeTruthy();
    expect(presa!.textContent).toMatch(/1 campo\(s\) alterado/);

    fireEvent.click(within(presa!).getByRole("button", { name: /Salvar/ }));
    expect(executar).toHaveBeenCalledWith("config", { jogadores_por_time: 4 });
  });

  it("campo fora da faixa: a barra aponta o que corrigir e não deixa salvar", () => {
    render(
      <ModoCompacto ativo>
        <SecaoConfiguracao {...props(vi.fn(async () => true))} />
      </ModoCompacto>,
    );
    fireEvent.change(screen.getByRole("textbox", { name: "Jogadores por time" }), { target: { value: "99" } });
    const presa = barra()!;
    expect(within(presa).getByRole("button", { name: /Corrija 1 campo/ })).toBeTruthy();
    expect((within(presa).getByRole("button", { name: /Salvar/ }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("no monitor a barra não existe — o salvar mora só no fim, como sempre", () => {
    render(<SecaoConfiguracao {...props(vi.fn(async () => true))} />);
    fireEvent.change(screen.getByRole("textbox", { name: "Jogadores por time" }), { target: { value: "4" } });
    expect(barra()).toBeNull();
  });
});
