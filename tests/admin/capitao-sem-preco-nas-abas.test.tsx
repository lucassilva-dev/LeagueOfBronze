// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { DadosEdicao, Inscrito } from "@/components/admin/e4/painel-edicao";
import { SecaoInscritos } from "@/components/admin/e4/secao-inscritos";
import { SecaoTimes } from "@/components/admin/e4/secao-times";
import { CAPITAES_23_10, POOL_4A_40_23_10, type JogadorDoPool } from "../draft/_pool-4a";

/**
 * Times e vagas e Inscritos com os capitães DEFINIDOS e o capitão SEM PREÇO (decisão de
 * 23/10/2026), sobre a lista real de 23/10 (40 titulares, os 8 capitães marcados):
 *  - a prévia usa os capitães definidos, e a tabela é só dos 32 que vão ser escolhidos;
 *  - o capitão aparece com a tag no lugar dos pontos (coluna Pts, gaveta, substituto);
 *  - capitão não substitui nem é substituído pela tabela (regra 6).
 */

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  vi.unstubAllGlobals();
});

const nick = (posicao: number) => `Jogador${posicao}`;

function inscrito(j: JogadorDoPool, over: Partial<Inscrito> = {}): Inscrito {
  return {
    id: `insc-${j.posicao}`,
    criado_em: `2026-10-06T12:${String(j.posicao).padStart(2, "0")}:00.000Z`,
    nick: nick(j.posicao),
    tag: "BR1",
    riot_id: `${nick(j.posicao)}#BR1`,
    nome_real: null,
    email: `j${j.posicao}@exemplo.com`,
    discord: `j${j.posicao}`,
    whatsapp: null,
    elo_declarado: j.elo,
    elo_verificado: j.elo,
    elo_fonte: "riot",
    elo_congelado: null,
    elo_riot: j.eloRiot ?? null,
    riot_divisao: j.divisao ?? null,
    riot_pdl: j.pdl ?? null,
    pontos: 4,
    rota_primaria: j.rota1,
    rota_secundaria: j.rota2,
    disponibilidade: ["noite"],
    quer_capitao: false,
    entrou_no_grupo: null,
    situacao: "apto",
    organizador: j.organizador,
    observacao: null,
    capitao: CAPITAES_23_10.includes(j.posicao),
    ...over,
  };
}

const LISTA = POOL_4A_40_23_10.map((j) => inscrito(j));

function dados(lista: Inscrito[], capitaoComPreco?: boolean): DadosEdicao {
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
      max_times: 8,
      orcamento_por_time: 30,
      ...(capitaoComPreco === undefined ? {} : { capitao_com_preco: capitaoComPreco }),
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
    conferencias: [],
    pagamentos: [],
    panorama: {
      inscritos: lista.length,
      elegiveis: lista.length,
      aprovados: lista.length,
      pendentes: 0,
      recusados: 0,
      times: 8,
      vagas: 40,
      sobra: 0,
      caixa: { recebido: 0, estornado: 0, aDevolver: 0, emCaixa: 0, arrecadado: 0, aReceber: 0, isento: 0 },
    },
    auditoria: [],
  };
}

const props = {
  executar: vi.fn(async () => true) as never,
  ocupado: false,
  podeConferir: true,
  podeFinanceiro: true,
  podeConfigurar: true,
};

/** Sem rede: a aba Times não acha draft sorteado e fica com a prévia. */
function semDraft() {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ draft: null }), { status: 200 })));
}

describe("Times e vagas com os capitães definidos", () => {
  it("a tabela é dos 32 que vão ser escolhidos, e diz que os capitães ficam fora dela", () => {
    semDraft();
    render(<SecaoTimes {...props} dados={dados(LISTA)} />);
    const texto = document.body.textContent ?? "";
    expect(texto).toContain("Os 32 que vão ser escolhidos somam exatamente 240 pontos (8 × 30)");
    expect(texto).toContain("os 8 capitães entram sem preço");
    expect(texto).toContain("Os 8 capitães não entram nesta tabela");
    expect(texto).toContain("Capitães: os 8 definidos pela organização");
    expect(texto).toContain("(30 ÷ 4)");
  });

  it("no substituto, o capitão aparece como «capitão» e não é substituído pela tabela", () => {
    semDraft();
    render(<SecaoTimes {...props} dados={dados(LISTA)} />);
    const seletor = screen.getByLabelText("Jogador a substituir") as HTMLSelectElement;
    const opcao = [...seletor.options].find((o) => o.value === "insc-5")!;
    expect(opcao.textContent).toContain("· capitão");
    fireEvent.change(seletor, { target: { value: "insc-5" } });
    expect(screen.getByText("Capitão não é substituído pela tabela")).toBeTruthy();
  });

  it("nem substitui: substituindo o Mestre (18 pontos), nenhum capitão entra na lista", () => {
    semDraft();
    render(<SecaoTimes {...props} dados={dados(LISTA)} />);
    fireEvent.change(screen.getByLabelText("Jogador a substituir"), { target: { value: "insc-4" } });
    const lista = screen.getByText(/aprovados podem entrar no lugar de/).parentElement!;
    const nomes = [...lista.querySelectorAll("tbody tr")].map((tr) => tr.querySelector("td")?.textContent ?? "");
    // Os 31 outros que vão ser escolhidos custam até 18: todos servem; capitão nenhum.
    expect(nomes).toHaveLength(31);
    for (const p of CAPITAES_23_10) expect(nomes).not.toContain(`${nick(p)}#BR1`);
  });

  it("com o capitão pago (`capitao_com_preco`), o caminho antigo: tabela dos 40, sem a tag", () => {
    semDraft();
    render(<SecaoTimes {...props} dados={dados(LISTA, true)} />);
    const texto = document.body.textContent ?? "";
    expect(texto).toContain("Os 40 que entram somam exatamente 240 pontos");
    expect(texto).not.toContain("não entram nesta tabela");
    const opcao = [...(screen.getByLabelText("Jogador a substituir") as HTMLSelectElement).options].find((o) => o.value === "insc-5")!;
    expect(opcao.textContent).toMatch(/· \d+ pt$/);
  });
});

describe("Inscritos com os capitães definidos", () => {
  /** A linha da lista pelo id da inscrição (o `id` do botão é `inscrito-<id>`). */
  const linha = (posicao: number) => document.getElementById(`inscrito-insc-${posicao}`)!.closest("tr")!;

  it("a coluna Pts mostra «capitão» no capitão e o preço da tabela dos 32 em quem vai ser escolhido", () => {
    render(<SecaoInscritos {...props} dados={dados(LISTA)} />);
    expect(within(linha(5)).getByText("capitão")).toBeTruthy();
    expect(within(linha(1)).getByText("capitão")).toBeTruthy();
    // O Mestre 21 PDL (posição 4) custa 18 na tabela dos 32; o Ferro sem leitura, 1.
    expect(within(linha(4)).getByText("18")).toBeTruthy();
    expect(within(linha(4)).queryByText("capitão")).toBeNull();
  });

  it("a gaveta do capitão diz que ele não tem preço", () => {
    render(<SecaoInscritos {...props} dados={dados(LISTA)} />);
    fireEvent.click(document.getElementById("inscrito-insc-5")!);
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("tab", { name: /^Contato/ }));
    const cartao = screen.getByText("Pontos no draft").parentElement!;
    expect(cartao.textContent).toContain("Capitão");
    expect(cartao.textContent).toContain("capitão não tem preço");
  });
});
