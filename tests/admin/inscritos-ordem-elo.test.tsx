// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { DadosEdicao, Inscrito } from "@/components/admin/e4/painel-edicao";
import { SecaoInscritos } from "@/components/admin/e4/secao-inscritos";
import { ModoCompacto } from "@/components/admin/responsivo";

/**
 * "Filtrar por elo do maior ao menor" na aba Inscritos.
 *
 * A ordem usa a MESMA régua dos capitães (lib/draft/capitaes.ts): elo, depois divisão,
 * depois PDL — e a divisão da Riot só conta quando ela leu o mesmo degrau do elo que vale.
 * O topo desta lista tem de ser quem o draft sortearia como capitão.
 */

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

function inscrito(id: string, nick: string, over: Partial<Inscrito>): Inscrito {
  return {
    id,
    criado_em: "2026-10-05T12:00:00.000Z",
    nick,
    tag: "BR1",
    riot_id: `${nick}#BR1`,
    nome_real: nick,
    email: `${id}@exemplo.com`,
    discord: id,
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
    situacao: "pendente",
    organizador: false,
    observacao: null,
    ...over,
  };
}

// Em ordem de inscrição de propósito embaralhada em relação ao elo.
const LISTA: Inscrito[] = [
  inscrito("1", "EsmeraldaIV", { elo_verificado: "Esmeralda", elo_fonte: "riot", elo_riot: "Esmeralda", riot_divisao: "IV", riot_pdl: 90 }),
  inscrito("2", "Ferro", { elo_declarado: "Ferro" }),
  inscrito("3", "Mestre", { elo_verificado: "Mestre", elo_fonte: "riot", elo_riot: "Mestre", riot_pdl: 15 }),
  inscrito("4", "EsmeraldaI", { elo_verificado: "Esmeralda", elo_fonte: "riot", elo_riot: "Esmeralda", riot_divisao: "I", riot_pdl: 2 }),
  // Travado em Ouro pela organização; a Riot lê Diamante I — a divisão do Diamante não conta.
  inscrito("5", "OuroTravado", { elo_verificado: "Ouro", elo_fonte: "organizacao", elo_riot: "Diamante", riot_divisao: "I", riot_pdl: 99 }),
  inscrito("6", "OuroII", { elo_verificado: "Ouro", elo_fonte: "riot", elo_riot: "Ouro", riot_divisao: "II", riot_pdl: 10 }),
];

function dados(lista: Inscrito[]): DadosEdicao {
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
    inscritos: lista,
    conferencias: [],
    pagamentos: [],
    panorama: {
      inscritos: lista.length,
      elegiveis: lista.length,
      aprovados: 0,
      pendentes: lista.length,
      recusados: 0,
      times: 1,
      vagas: 5,
      sobra: 1,
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

/** Os nicks na ordem em que a tela mostra (os botões que abrem a gaveta). */
function ordemNaTela(): string[] {
  return [...document.querySelectorAll<HTMLElement>('[id^="inscrito-"]')].map((el) => el.textContent!.replace("#BR1", ""));
}

describe("ordem por elo na aba Inscritos", () => {
  it("do maior para o menor: elo, depois divisão, depois PDL — e só a leitura do mesmo degrau conta", () => {
    render(<SecaoInscritos {...props} dados={dados(LISTA)} />);
    fireEvent.change(screen.getByRole("combobox", { name: "Ordenar inscritos" }), { target: { value: "elo_desc" } });
    expect(ordemNaTela()).toEqual(["Mestre", "EsmeraldaI", "EsmeraldaIV", "OuroII", "OuroTravado", "Ferro"]);
  });

  it("do menor para o maior é o inverso, e a escolha fica lembrada", () => {
    render(<SecaoInscritos {...props} dados={dados(LISTA)} />);
    fireEvent.change(screen.getByRole("combobox", { name: "Ordenar inscritos" }), { target: { value: "elo_asc" } });
    expect(ordemNaTela()).toEqual(["Ferro", "OuroTravado", "OuroII", "EsmeraldaIV", "EsmeraldaI", "Mestre"]);
    expect(window.localStorage.getItem("lob:inscritos:ordem")).toBe("elo_asc");
  });

  it("o filtro por emblema mostra só os elos marcados", () => {
    render(<SecaoInscritos {...props} dados={dados(LISTA)} />);
    fireEvent.click(screen.getByRole("button", { name: "Esmeralda: 2" }));
    expect(ordemNaTela().sort()).toEqual(["EsmeraldaI", "EsmeraldaIV"]);
  });

  it("no celular a mesma ordem vale para os cartões", () => {
    window.localStorage.setItem("lob:inscritos:ordem", "elo_desc");
    render(
      <ModoCompacto ativo>
        <SecaoInscritos {...props} dados={dados(LISTA)} />
      </ModoCompacto>,
    );
    expect(document.querySelector("table")).toBeNull();
    expect(ordemNaTela()).toEqual(["Mestre", "EsmeraldaI", "EsmeraldaIV", "OuroII", "OuroTravado", "Ferro"]);
  });
});
