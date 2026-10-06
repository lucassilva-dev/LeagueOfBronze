// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import type { DadosEdicao, Inscrito } from "@/components/admin/e4/painel-edicao";
import { SecaoTimes } from "@/components/admin/e4/secao-times";

/**
 * Substituto é decisão DEFINITIVA: só aprovado serve, mesmo depois de a conta de times
 * passar a contar pendentes.
 *
 * O teste de fumaça (renderToStaticMarkup) não escolhe ninguém no select, então a lista
 * de substitutos nunca aparece lá — trocar a origem dela para os elegíveis passava verde.
 */

afterEach(cleanup);

function inscrito(over: Partial<Inscrito> & { id: string }): Inscrito {
  return {
    criado_em: "2026-10-05T12:00:00.000Z",
    nick: `N${over.id}`,
    tag: "BR1",
    riot_id: `N${over.id}#BR1`,
    nome_real: null,
    email: `${over.id}@exemplo.com`,
    discord: over.id,
    whatsapp: null,
    elo_declarado: "Prata",
    elo_verificado: null,
    elo_congelado: null,
    pontos: 3,
    rota_primaria: "MID",
    rota_secundaria: "TOP",
    disponibilidade: ["noite"],
    quer_capitao: false,
    entrou_no_grupo: null,
    situacao: "apto",
    organizador: false,
    observacao: null,
    ...over,
  };
}

function dados(inscritos: Inscrito[]): DadosEdicao {
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
    inscritos,
    conferencias: [],
    pagamentos: [],
    panorama: {
      inscritos: inscritos.length,
      elegiveis: inscritos.length,
      aprovados: 2,
      pendentes: 1,
      recusados: 0,
      times: 0,
      vagas: 0,
      sobra: 3,
      caixa: { recebido: 0, estornado: 0, aDevolver: 0, emCaixa: 0, arrecadado: 0, aReceber: 0, isento: 0 },
    },
    auditoria: [],
  };
}

const montar = (lista: Inscrito[]) =>
  render(
    <SecaoTimes
      dados={dados(lista)}
      executar={async () => true}
      ocupado={false}
      podeConferir
      podeFinanceiro
      podeConfigurar
    />,
  );

describe("quem pode substituir", () => {
  it("aprovado mais barato aparece; pendente mais barato não", () => {
    montar([
      inscrito({ id: "alvo", elo_declarado: "Prata", pontos: 3 }),
      inscrito({ id: "bronze", elo_declarado: "Bronze", pontos: 2 }),
      inscrito({ id: "ferro", elo_declarado: "Ferro", pontos: 1, situacao: "pendente" }),
    ]);
    fireEvent.change(screen.getByLabelText("Jogador a substituir"), { target: { value: "alvo" } });

    expect(screen.getAllByText("Nbronze").length).toBeGreaterThan(0);
    expect(screen.queryByText("Nferro")).toBeNull();
  });

  it("sem aprovado que sirva, diz «aprovado mais barato» — não «o mais barato do pool»", () => {
    // O pool da conta agora tem o pendente Ferro, mais barato que o alvo: dizer que o
    // alvo é o mais barato "do pool" seria falso na mesma tela.
    montar([
      inscrito({ id: "alvo", elo_declarado: "Bronze", pontos: 2 }),
      inscrito({ id: "caro", elo_declarado: "Ouro", pontos: 4 }),
      inscrito({ id: "ferro", elo_declarado: "Ferro", pontos: 1, situacao: "pendente" }),
    ]);
    fireEvent.change(screen.getByLabelText("Jogador a substituir"), { target: { value: "alvo" } });

    expect(screen.getByText("Nenhum aprovado serve")).toBeTruthy();
    expect(document.body.textContent).toContain("é o aprovado mais barato");
    expect(document.body.textContent).not.toContain("mais barato do pool");
  });
});
