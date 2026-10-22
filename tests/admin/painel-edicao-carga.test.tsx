// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PainelEdicao, type DadosEdicao, type SecaoEdicao } from "@/components/admin/e4/painel-edicao";

/**
 * O contêiner das abas da 4ª Edição: QUANDO ele busca os dados e o que diz quando não
 * consegue.
 *
 * - O painel devolve <PainelEdicao> na mesma posição para as quatro abas, sem `key`; o React
 *   reaproveita a instância. A busca só na montagem deixava Inscritos, Pagamentos e Times com
 *   a foto de quando a primeira foi aberta.
 * - A tela de falha mandava «rodar o SQL da 4ª» para qualquer erro — inclusive 403 (sem
 *   escopo) e 500 (Supabase pausado).
 */

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function dados(): DadosEdicao {
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
      taxa_centavos: 2000,
      pct_campeao: 70,
      chave_pix: null,
      responsavel_financeiro: null,
    },
    inscritos: [],
    conferencias: [],
    pagamentos: [],
    panorama: {
      inscritos: 0,
      elegiveis: 0,
      aprovados: 0,
      pendentes: 0,
      recusados: 0,
      times: 0,
      vagas: 0,
      sobra: 0,
      caixa: { recebido: 0, estornado: 0, aDevolver: 0, emCaixa: 0, arrecadado: 0, aReceber: 0, isento: 0 },
    },
    auditoria: [],
  };
}

describe("troca de aba da 4ª Edição", () => {
  /** Igual ao painel: a MESMA instância, sem `key`, trocando só a seção. */
  function Pai() {
    const [secao, setSecao] = useState<SecaoEdicao>("inscritos");
    return (
      <>
        {(["pagamentos", "times"] as const).map((destino) => (
          <button key={destino} type="button" onClick={() => setSecao(destino)}>
            ir para {destino}
          </button>
        ))}
        <PainelEdicao
          secao={secao}
          onAlert={() => {}}
          podeConferir
          podeFinanceiro
          podeConfigurar
          render={() => <p>seção {secao}</p>}
        />
      </>
    );
  }
  const trocar = (destino: SecaoEdicao) => fireEvent.click(screen.getByRole("button", { name: `ir para ${destino}` }));

  it("Inscritos → Pagamentos → Times: uma busca nova a cada troca", async () => {
    let leituras = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        leituras += 1;
        return { ok: true, status: 200, json: async () => dados() };
      }),
    );
    render(<Pai />);
    await screen.findByText("seção inscritos");
    expect(leituras).toBe(1);

    act(() => trocar("pagamentos"));
    await screen.findByText("seção pagamentos");
    await waitFor(() => expect(leituras).toBe(2));

    act(() => trocar("times"));
    await screen.findByText("seção times");
    await waitFor(() => expect(leituras).toBe(3));
  });
});

describe("tela de falha da carga", () => {
  const montar = (resposta: () => Promise<unknown>) => {
    vi.stubGlobal("fetch", vi.fn(resposta));
    render(
      <PainelEdicao
        secao="inscritos"
        onAlert={() => {}}
        podeConferir={false}
        podeFinanceiro={false}
        podeConfigurar={false}
        render={() => <p>conteúdo</p>}
      />,
    );
  };
  const falha = (status: number, corpo: unknown) => async () => ({ ok: false, status, json: async () => corpo });

  it("403: fala de permissão, e não manda rodar o SQL", async () => {
    montar(falha(403, { error: "Você não tem permissão para ver as inscrições da 4ª Edição." }));
    await screen.findByText("Não foi possível carregar");
    expect(screen.getByText(/precisa do escopo de conferência ou do financeiro/)).toBeTruthy();
    expect(screen.queryByText(/schema-4a-edicao\.sql/)).toBeNull();
  });

  it("500 (Supabase pausado): fala de servidor indisponível, e o «ref» do log aparece", async () => {
    montar(falha(500, { error: "Não foi possível carregar a edição.", ref: "a1b2c3d4" }));
    await screen.findByText("Não foi possível carregar");
    expect(screen.getByText(/Servidor ou banco indisponível/)).toBeTruthy();
    expect(screen.getByText(/ref a1b2c3d4/)).toBeTruthy();
    expect(screen.queryByText(/Rode supabase/)).toBeNull();
  });

  it("sem rede: diz que não chegou ao servidor", async () => {
    montar(async () => {
      throw new TypeError("Failed to fetch");
    });
    await screen.findByText("Não foi possível carregar");
    expect(screen.getByText(/Não deu para falar com o servidor/)).toBeTruthy();
  });
});
