// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { DadosEdicao, Inscrito } from "@/components/admin/e4/painel-edicao";
import { SecaoInscritos } from "@/components/admin/e4/secao-inscritos";
import { SecaoTimes } from "@/components/admin/e4/secao-times";
import { ModoCompacto } from "@/components/admin/responsivo";
import { eloDoJogadorDaInscricao } from "@/lib/draft/elo-da-inscricao";
import { calcularTabela, retratoDaTabela } from "@/lib/draft/precos";
import type { DraftPublico } from "@/lib/draft/store";

/**
 * O painel com a tabela de pontos automática (Times e vagas e Inscritos).
 *
 * As duas abas mostravam a coluna `pontos` do banco — a tabela FIXA da 3ª (Ouro 4, Platina
 * 5, Diamante 8…) — como se fosse o preço do draft. O draft agora usa a tabela automática,
 * por divisão e com soma exata; mostrar o número velho era deixar a organização planejar
 * (e escolher substituto) com um preço que o draft não usa. Agora as duas abas calculam a
 * PRÉVIA com a mesma função do servidor.
 *
 * Pool de um time só, com a leitura da Riot de cada um:
 *   Prata III, Ouro IV, Ouro II, Platina III, Diamante IV  (os 5 aptos)
 *   Ouro I  (aprovado na sobra)
 * Tabela automática (curvatura 0,1): 1, 3, 4, 6, 16 (soma 30). O Ouro I, fora do pool, custa 5
 * pela reta.
 * Na tabela fixa todos os Ouros valiam 4 e o Diamante 8.
 *
 * (Com a curvatura 0,075 o pool tinha um Platina I. Com 0,1 e o Platina I, o Ouro I da sobra
 * passaria a custar 4, o mesmo que o Ouro II, e o cenário do substituto sumiria; com o
 * Platina III ele volta a custar 5 — e, depois da desistência, a prévia volta a dar 3 aos dois.)
 */

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  vi.unstubAllGlobals();
});

function inscrito(id: string, elo: string, divisao: string | null, over: Partial<Inscrito> = {}): Inscrito {
  const fixos: Record<string, number> = { Prata: 3, Ouro: 4, Platina: 5, Diamante: 8 };
  return {
    id,
    criado_em: "2026-10-05T12:00:00.000Z",
    nick: id,
    tag: "BR1",
    riot_id: `${id}#BR1`,
    nome_real: null,
    email: `${id}@exemplo.com`,
    discord: id,
    whatsapp: null,
    elo_declarado: elo,
    elo_verificado: elo,
    elo_fonte: "riot",
    elo_congelado: null,
    elo_riot: divisao ? elo : null,
    riot_divisao: divisao,
    riot_pdl: divisao ? 50 : null,
    pontos: fixos[elo] ?? 4,
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

const UM_TIME: Inscrito[] = [
  inscrito("PrataIII", "Prata", "III"),
  inscrito("OuroIV", "Ouro", "IV"),
  inscrito("OuroII", "Ouro", "II"),
  inscrito("PlatinaIII", "Platina", "III"),
  inscrito("DiamanteIV", "Diamante", "IV"),
  inscrito("OuroI", "Ouro", "I", { situacao: "sobra" }),
];

function dados(lista: Inscrito[]): DadosEdicao {
  const aprovados = lista.filter((i) => i.situacao === "apto" || i.situacao === "sobra").length;
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
      // O caminho do capitão PAGO pelo orçamento (o modelo até a 3ª): a tabela destes casos
      // conta os 5 de cada time. O capitão sem preço tem os testes dele em
      // tests/admin/capitao-sem-preco-nas-abas.test.tsx.
      capitao_com_preco: true,
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
      aprovados,
      pendentes: lista.length - aprovados,
      recusados: 0,
      times: Math.floor(lista.length / 5),
      vagas: Math.floor(lista.length / 5) * 5,
      sobra: lista.length % 5,
      caixa: { recebido: 0, estornado: 0, aDevolver: 0, emCaixa: 0, arrecadado: 0, aReceber: 0, isento: 0 },
    },
    auditoria: [],
  };
}

/** A métrica fica na aba Contato da gaveta (junto do elo declarado e do elo em uso). */
function abrirContato() {
  fireEvent.click(within(screen.getByRole("dialog")).getByRole("tab", { name: /^Contato/ }));
}

const props = {
  executar: vi.fn(async () => true) as never,
  ocupado: false,
  podeConferir: true,
  podeFinanceiro: true,
  podeConfigurar: true,
};

describe("Times e vagas: a prévia da tabela automática", () => {
  it("mostra a tabela por divisão, a soma exata e de quem ela foi calculada — nada de «cabe no orçamento»", () => {
    render(<SecaoTimes {...props} dados={dados(UM_TIME)} />);
    const texto = document.body.textContent ?? "";

    expect(screen.getByText("Tabela de pontos")).toBeTruthy();
    expect(screen.getByText("prévia")).toBeTruthy();
    expect(screen.getByText("A conta fecha")).toBeTruthy();
    expect(texto).toContain("30 de 30 (1 × 30) ✓");
    expect(texto).toContain("Calculada com os 5 titulares — quem não está na fila de reserva nem marcado como sobra");
    expect(texto).not.toContain("Cabe no orçamento");

    const tabela = [...document.querySelectorAll("table")].find((t) => t.textContent?.includes("Pela reta"))!;
    const precos = [...tabela.querySelectorAll("tbody tr")].map((tr) => {
      const celulas = tr.querySelectorAll("td");
      return [celulas[0]!.textContent, celulas[4]!.textContent];
    });
    expect(precos).toEqual([
      ["PrataIII", "1"],
      ["OuroIV", "3"],
      ["OuroII", "4"],
      ["PlatinaIII", "6"],
      ["DiamanteIV", "16"],
    ]);
  });

  it("substituto pelo preço da prévia: o Ouro I da sobra NÃO substitui o Ouro II (na tabela fixa, substituía)", () => {
    render(<SecaoTimes {...props} dados={dados(UM_TIME)} />);
    fireEvent.change(screen.getByLabelText("Jogador a substituir"), { target: { value: "OuroII" } });

    const lista = [...document.querySelectorAll("table")].find((t) => t.textContent?.includes("Situação"))!;
    const nomes = [...lista.querySelectorAll("tbody tr")].map((tr) => tr.querySelector("td")!.textContent!.replace("#BR1", ""));
    expect(nomes.sort()).toEqual(["OuroIV", "PrataIII"]);
    expect(document.body.textContent).toContain("pontos ≤ 4 na prévia");
  });

  it("no celular, a tabela de preços vira lista, sem tabela larga", () => {
    render(
      <ModoCompacto ativo>
        <SecaoTimes {...props} dados={dados(UM_TIME)} />
      </ModoCompacto>,
    );
    expect(document.querySelector("table")).toBeNull();
    expect(document.body.textContent).toContain("30 de 30 (1 × 30) ✓");
  });

  it("sem time fechado, não inventa tabela: diz que ainda não dá para calcular", () => {
    render(<SecaoTimes {...props} dados={dados(UM_TIME.slice(0, 3))} />);
    expect(screen.getByText("Ainda não dá para calcular")).toBeTruthy();
  });
});

describe("Inscritos: «Pontos no draft» é a prévia da tabela, não a tabela fixa", () => {
  it("a coluna Pts da lista mostra o preço da prévia", () => {
    render(<SecaoInscritos {...props} dados={dados(UM_TIME)} />);
    const linha = (nick: string) => document.getElementById(`inscrito-${nick}`)!.closest("tr")!;
    // O Diamante IV custa 16 na prévia (8 na tabela fixa); o Ouro I da sobra, 5 (4 na fixa).
    expect(within(linha("DiamanteIV")).queryByText("16")).toBeTruthy();
    expect(within(linha("DiamanteIV")).queryByText("8")).toBeNull();
    expect(within(linha("OuroI")).queryByText("5")).toBeTruthy();
  });

  it("a gaveta mostra o preço da prévia e diz de onde ele vem", () => {
    render(<SecaoInscritos {...props} dados={dados(UM_TIME)} />);
    fireEvent.click(document.getElementById("inscrito-DiamanteIV")!);
    abrirContato();
    const rotulo = screen.getByText("Pontos no draft");
    const cartao = rotulo.parentElement!;
    expect(cartao.textContent).toContain("16");
    expect(cartao.textContent).toContain("prévia da tabela automática");
    expect(cartao.textContent).not.toContain("derivado do elo");
  });

  it("sem time fechado, a gaveta não mostra número nenhum", () => {
    render(<SecaoInscritos {...props} dados={dados(UM_TIME.slice(0, 3))} />);
    fireEvent.click(document.getElementById("inscrito-OuroII")!);
    abrirContato();
    const cartao = screen.getByText("Pontos no draft").parentElement!;
    expect(cartao.textContent).toContain("—");
    expect(cartao.textContent).toContain("sai da tabela automática quando fechar um time");
  });

  it("congelado: a lista mostra a divisão e o PDL do congelamento, e a leitura de hoje só como «Riot hoje»", () => {
    // Congelado em Ouro II 50 PDL; dias depois o robô lê Ouro I 82 PDL. O preço é o do Ouro II,
    // e a linha não pode dizer «I · 82 PDL · congelado».
    const congelado = inscrito("OuroII", "Ouro", "II", {
      elo_congelado: "Ouro",
      divisao_congelada: "II",
      pdl_congelado: 50,
      riot_divisao: "I",
      riot_pdl: 82,
    });
    render(<SecaoInscritos {...props} dados={dados(UM_TIME.map((i) => (i.id === "OuroII" ? congelado : i)))} />);
    const linha = document.getElementById("inscrito-OuroII")!.closest("tr")!;
    expect(linha.textContent).toContain("II · 50 PDL · congelado");
    expect(linha.textContent).not.toContain("I · 82 PDL · congelado");
    expect(linha.textContent).toContain("Riot hoje:");
    expect(linha.textContent).toContain("I · 82 PDL");
    // A leitura de hoje igual à do congelamento: nada de «Riot hoje».
    cleanup();
    const igual = { ...congelado, riot_divisao: "II", riot_pdl: 50 };
    render(<SecaoInscritos {...props} dados={dados(UM_TIME.map((i) => (i.id === "OuroII" ? igual : i)))} />);
    const outra = document.getElementById("inscrito-OuroII")!.closest("tr")!;
    expect(outra.textContent).toContain("II · 50 PDL · congelado");
    expect(outra.textContent).not.toContain("Riot hoje");
  });
});

/*
 * Regra 6 depois do sorteio: a tabela do SORTEIO, não a prévia recalculada.
 *
 * Draft sorteado com os 5 de UM_TIME (Prata III 1, Ouro IV 3, Ouro II 4, Platina III 6,
 * Diamante IV 16; o Ouro I da sobra custa 5 pela reta). Depois a Prata III desiste: a prévia
 * passa a usar os 5 de elo mais baixo, e nela o Ouro II e o Ouro I custam 3 — o Ouro I passaria
 * a poder substituir o Ouro II. Pela tabela do sorteio, não pode (5 > 4).
 */
describe("Times e vagas: a regra 6 depois do sorteio usa a tabela do sorteio", () => {
  function draftSorteado(): DraftPublico {
    const titulares = UM_TIME.filter((i) => i.situacao === "apto");
    const tabela = calcularTabela({ pool: titulares.map(eloDoJogadorDaInscricao), times: 1, jogadoresPorTime: 5, orcamentoPorTime: 30 });
    const preco = { PrataIII: 1, OuroIV: 3, OuroII: 4, PlatinaIII: 6, DiamanteIV: 16 } as Record<string, number>;
    return {
      revisao: 7,
      fase: "encerrado",
      times: [{ id: "time-1", nome: "CHAMA", cor: "#ef7d34", capitaoRiotId: "DiamanteIV#BR1", gasto: 30, vagas: 0 }],
      elencos: {
        "time-1": titulares.map((i) => ({
          riotId: i.riot_id,
          pontos: preco[i.id]!,
          rota1: "MID",
          rota2: "TOP",
          elo: i.elo_verificado!,
          capitao: i.id === "DiamanteIV",
        })),
      },
      disponiveis: [],
      escolhaAtual: 4,
      totalEscolhas: 4,
      timeDaVezId: null,
      escolhiveis: [],
      prazoISO: null,
      motivoDaPausa: null,
      sorteioId: "abc",
      orcamentoPorTime: 30,
      jogadoresPorTime: 5,
      historico: [],
      tabelaDePontos: retratoDaTabela(tabela),
    };
  }

  const DEPOIS_DA_DESISTENCIA: Inscrito[] = UM_TIME.map((i) => (i.id === "PrataIII" ? { ...i, situacao: "desistiu" as const } : i));

  function escolherOuroII() {
    fireEvent.change(screen.getByLabelText("Jogador a substituir"), { target: { value: "OuroII" } });
    const lista = [...document.querySelectorAll("table")].find((t) => t.textContent?.includes("Situação"))!;
    return [...lista.querySelectorAll("tbody tr")].map((tr) => tr.querySelector("td")!.textContent!.replace("#BR1", "")).sort();
  }

  it("com o draft sorteado: rotula «tabela do sorteio» e compara com os preços que o draft usou", async () => {
    const fetchFalso = vi.fn<typeof fetch>(async () => new Response(JSON.stringify({ draft: draftSorteado() }), { status: 200 }));
    vi.stubGlobal("fetch", fetchFalso);
    render(<SecaoTimes {...props} dados={dados(DEPOIS_DA_DESISTENCIA)} />);
    await screen.findByText("tabela do sorteio");
    expect(String(fetchFalso.mock.calls[0]![0])).toContain("/api/draft/estado");
    expect(escolherOuroII()).toEqual(["OuroIV"]);
    expect(document.body.textContent).toContain("pontos ≤ 4 na tabela do sorteio");
    // O Ouro I (fora do draft) aparece no seletor com o preço da reta do sorteio.
    const opcoes = [...document.querySelectorAll("option")].map((o) => o.textContent ?? "");
    expect(opcoes).toContain("OuroI#BR1 — Ouro · 5 pt");
    expect(opcoes).toContain("OuroII#BR1 — Ouro · 4 pt");
  });

  it("sem draft (ou draft antigo sem a tabela): continua a prévia — e nela o Ouro I passaria", async () => {
    const fetchFalso = vi.fn<typeof fetch>(async () => new Response(JSON.stringify({ draft: null }), { status: 200 }));
    vi.stubGlobal("fetch", fetchFalso);
    render(<SecaoTimes {...props} dados={dados(DEPOIS_DA_DESISTENCIA)} />);
    await waitFor(() => expect(fetchFalso).toHaveBeenCalled());
    expect(escolherOuroII()).toEqual(["OuroI", "OuroIV"]);
    expect(document.body.textContent).toContain("pontos ≤ 3 na prévia");
    expect(screen.queryByText("tabela do sorteio")).toBeNull();
  });
});
