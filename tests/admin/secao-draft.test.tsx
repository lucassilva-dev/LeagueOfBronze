// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SecaoDraft } from "@/components/admin/e4/secao-draft";
import { calcularTabela, retratoDaTabela } from "@/lib/draft/precos";
import type { DraftPublico, PreviaDoDraft } from "@/lib/draft/store";
import { POOL_4A_40 } from "../draft/_pool-4a";

/**
 * A mesa do draft no painel. Antes dela a rota /api/admin/draft existia, mas nenhuma tela
 * a chamava — sortear, iniciar e aplicar o draft exigiam montar a requisição à mão.
 */

/** O formato da 4ª: 40 pessoas, 8 times de 5, orçamento 30. */
const FORMATO_40 = { times: 8, jogadoresPorTime: 5, orcamentoPorTime: 30 } as const;

/** A conferência como o servidor a manda com o pool real: 40 aptos para 8 times. */
const CONFERENCIA_40: Partial<PreviaDoDraft> = {
  config: { jogadoresPorTime: 5, maxTimes: 8, orcamentoPorTime: 30, segundosPorEscolha: 60 },
  times: 8,
  vagas: 40,
  aprovados: 40,
  aptos: 40,
  totalDePontos: 240,
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function previa(over: Partial<PreviaDoDraft> = {}): PreviaDoDraft {
  return {
    config: { jogadoresPorTime: 5, maxTimes: 6, orcamentoPorTime: 30, segundosPorEscolha: 60 },
    times: 6,
    vagas: 30,
    aprovados: 30,
    aptos: 30,
    sobra: 0,
    pendentes: 0,
    impedimentos: [],
    totalDePontos: 170,
    orcamentoSugerido: 33,
    jogadores: [
      { id: "a", riotId: "Luiz#BR1", elo: "Diamante", forca: "Diamante I · 14 PDL", pontos: 8, rota1: "TOP", rota2: "MID", organizador: false, temConta: true },
      { id: "n", riotId: "nak4y#JPN", elo: "Mestre", forca: "Mestre · 210 PDL", pontos: 10, rota1: "MID", rota2: "TOP", organizador: true, temConta: true },
    ],
    capitaesPelaRegra: ["a"],
    empateNoCorte: null,
    faltamCapitaes: 0,
    semEloCongelado: [],
    inscricoesAbertas: false,
    ...over,
  };
}

function responder(corpo: unknown) {
  const fetchFalso = vi.fn<typeof fetch>(async () => new Response(JSON.stringify(corpo), { status: 200 }));
  vi.stubGlobal("fetch", fetchFalso);
  return fetchFalso;
}

function renderizar() {
  const onAlert = vi.fn();
  render(<SecaoDraft onAlert={onAlert} podeConduzir onDatasetMudou={vi.fn()} />);
  return onAlert;
}

describe("a mesa do draft", () => {
  it("antes do sorteio: mostra a conferência, os capitães pela regra e o organizador fora", async () => {
    responder({ draft: null, sorteio: null, semSaida: null, previa: previa() });
    renderizar();
    await screen.findByText("Sortear capitães e ordem de escolha");
    expect(screen.getAllByText(/Luiz#BR1/).length).toBeGreaterThan(0);
    expect(screen.getByText("organização · não capitaneia")).toBeTruthy();
  });

  it("servidor anterior à tabela automática: nada de «média + 15%», e a tela avisa que falta a tabela", async () => {
    // A resposta velha ainda manda `orcamentoSugerido` (33) e não manda `tabela`. A regra
    // mudou para orçamento fixo: a tela não pode mandar subir o orçamento para 33.
    responder({ draft: null, sorteio: null, semSaida: null, previa: previa() });
    renderizar();
    await screen.findByText("Tabela de pontos desta edição");
    expect(document.body.textContent).not.toMatch(/não é o da regra|média \+ 15%/);
    expect(screen.getByText(/não veio nesta resposta/)).toBeTruthy();
  });

  it("com a tabela do servidor: as linhas, o total exato com ✓, o erro e como foi calculada", async () => {
    // A tabela do pool real: 40 pessoas, 8 times, curvatura 0,1.
    const tabela = retratoDaTabela(calcularTabela({ pool: POOL_4A_40, ...FORMATO_40 }));
    responder({ draft: null, sorteio: null, semSaida: null, previa: previa({ ...CONFERENCIA_40, tabela, fechaComOsCapitaesDaRegra: true }) });
    renderizar();
    await screen.findByText("Tabela de pontos desta edição");
    const texto = document.body.textContent ?? "";
    expect(texto).toContain("240 de 240 (8 × 30) ✓");
    expect(texto).toContain("200–299 PDL");
    expect(texto).toContain("Como foi calculada");
    expect(texto).toContain(`${tabela.erroMaximoEmDegraus.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} divisão`);
    expect(texto).toContain("1,73 divisão");
    expect(texto).toContain("exato: 8 × 30 = 240");
    expect(texto).toContain("os degraus de cima valem um pouco mais");
    expect(texto).toContain("arredondados para a soma dar exatamente 8 × 30 = 240");
    expect(texto).not.toMatch(/média \+ 15%/);
    // 21 linhas de preço, uma por classe (do Ferro ao Mestre 200–299 PDL).
    const linhas = [...document.querySelectorAll("table")].find((t) => t.textContent?.includes("Pela reta"));
    expect(linhas?.querySelectorAll("tbody tr")).toHaveLength(21);
  });

  it("aptos ≠ vagas (pool incompleto): a tabela aparece, mas sem ✓ e sem «exato», e a tela explica", async () => {
    const tabela = {
      ...retratoDaTabela(calcularTabela({ pool: POOL_4A_40, ...FORMATO_40 })),
      poolIncompleto: true,
    };
    responder({
      draft: null,
      sorteio: null,
      semSaida: null,
      previa: previa({
        ...CONFERENCIA_40,
        tabela,
        aptos: 42,
        aprovados: 42,
        impedimentos: ["Há 42 aprovados para 40 vagas."],
        fechaComOsCapitaesDaRegra: null,
      }),
    });
    renderizar();
    await screen.findByText("Tabela de pontos desta edição");
    const texto = document.body.textContent ?? "";
    expect(texto).toContain("240 de 240 (8 × 30) · pool incompleto");
    expect(texto).not.toContain("✓");
    expect(texto).not.toContain("exato:");
    expect(texto).not.toContain("soma dar exatamente");
    expect(texto).toContain("Pool incompleto: os aptos não batem com as vagas");
  });

  it("a conta desceu a curvatura: o motivo aparece, e não há aviso de que os elencos não fecham", async () => {
    // O Mestre #1 com 550 PDL: com 0,1 ele custaria 20 (o teto de uma escolha é 19), e a conta
    // desce para 0,075 (lib/draft/tabela-que-fecha.ts).
    const pool = POOL_4A_40.map((j) => (j.posicao === 1 ? { ...j, pdl: 550 } : j));
    const tabela = {
      ...retratoDaTabela(calcularTabela({ pool, ...FORMATO_40, curvatura: 0.075 })),
      queda: {
        curvaturaPedida: 0.1,
        motivo:
          "A curvatura caiu de 0,1 para 0,075: com 0,1, o Mestre · 500–599 PDL custaria 20 e nenhum time conseguiria pagá-lo (cabem no máximo 19 numa escolha).",
      },
    };
    responder({ draft: null, sorteio: null, semSaida: null, previa: previa({ ...CONFERENCIA_40, tabela, fechaComOsCapitaesDaRegra: true }) });
    renderizar();
    await screen.findByText("Tabela de pontos desta edição");
    expect(screen.getByText(/A curvatura caiu de 0,1 para 0,075/)).toBeTruthy();
    expect(screen.queryByText("Com os capitães da regra, os elencos não fecham")).toBeNull();
  });

  it("como foi calculada: sem curvatura não fala em degraus que valem mais; com folga não fala em soma exata", async () => {
    const tabela = retratoDaTabela(calcularTabela({ pool: POOL_4A_40, ...FORMATO_40, curvatura: 0, somaMaxima: 238 }));
    expect(tabela).toMatchObject({ curvatura: 0, soma: 238, folga: 2 });
    responder({
      draft: null,
      sorteio: null,
      semSaida: null,
      previa: previa({ ...CONFERENCIA_40, totalDePontos: 238, tabela, fechaComOsCapitaesDaRegra: true }),
    });
    renderizar();
    await screen.findByText("Tabela de pontos desta edição");
    const texto = document.body.textContent ?? "";
    expect(texto).toContain("Como foi calculada");
    expect(texto).not.toContain("degraus de cima valem");
    expect(texto).toContain("todo degrau vale o mesmo");
    expect(texto).not.toContain("soma dar exatamente");
    expect(texto).not.toContain("exato:");
    expect(texto).toContain("arredondados para a soma ficar em 238, 2 abaixo de 8 × 30 = 240");
  });

  it("sem time fechado ainda, a tabela não existe — e a tela diz isso", async () => {
    responder({ draft: null, sorteio: null, semSaida: null, previa: previa({ tabela: null }) });
    renderizar();
    expect(await screen.findByText("A tabela ainda não existe")).toBeTruthy();
  });

  it("capitães da regra que não fecham os elencos: aviso, e «Sortear» pela regra apagado", async () => {
    const tabela = retratoDaTabela(calcularTabela({ pool: POOL_4A_40, ...FORMATO_40 }));
    responder({
      draft: null,
      sorteio: null,
      semSaida: null,
      previa: previa({ tabela, fechaComOsCapitaesDaRegra: false, times: 1, vagas: 5, aptos: 5, aprovados: 5 }),
    });
    renderizar();
    await screen.findByText("Com os capitães da regra, os elencos não fecham");
    const botao = screen.getByRole("button", { name: "Sortear" }) as HTMLButtonElement;
    expect(botao.disabled).toBe(true);
  });

  it("empate no corte bloqueia o automático e explica", async () => {
    responder({
      draft: null,
      sorteio: null,
      semSaida: null,
      previa: previa({ capitaesPelaRegra: [], empateNoCorte: ["AURA#DUDU", "Parrudao#6969"] }),
    });
    renderizar();
    await screen.findByText("Empate de elo no corte dos capitães");
    const botao = screen.getByRole("button", { name: "Sortear" }) as HTMLButtonElement;
    expect(botao.disabled).toBe(true);
  });

  it("avisa inscrições abertas e elos não congelados", async () => {
    responder({
      draft: null,
      sorteio: null,
      semSaida: null,
      previa: previa({ inscricoesAbertas: true, semEloCongelado: ["Luiz#BR1"] }),
    });
    renderizar();
    await screen.findByText("As inscrições ainda estão abertas");
    expect(screen.getByText("1 apto(s) com o elo ainda solto")).toBeTruthy();
  });

  it("sortear manda o método da regra para a rota", async () => {
    const fetchFalso = responder({ draft: null, sorteio: null, semSaida: null, previa: previa({ orcamentoSugerido: 30, times: 1, vagas: 5, aptos: 5, aprovados: 5 }) });
    renderizar();
    const botao = await screen.findByRole("button", { name: "Sortear" });
    fireEvent.click(botao);
    await waitFor(() => {
      const post = fetchFalso.mock.calls.find((c) => c[1]?.method === "POST");
      expect(post).toBeTruthy();
      expect(JSON.parse(String(post![1]!.body))).toMatchObject({ acao: "montar", metodo: "maior_elo" });
    });
  });

  it("com o draft rodando: mostra a vez, e escolher pelo time só oferece quem o motor aceita", async () => {
    const draft: DraftPublico = {
      revisao: 3,
      fase: "rodando",
      times: [{ id: "time-1", nome: "CHAMA", cor: "#ef7d34", capitaoRiotId: "Luiz#BR1", gasto: 8, vagas: 4 }],
      elencos: { "time-1": [{ riotId: "Luiz#BR1", pontos: 8, rota1: "TOP", rota2: "MID", elo: "Diamante", capitao: true }] },
      disponiveis: [
        { id: "p1", riotId: "Barato#BR1", pontos: 3, rota1: "SUP", rota2: "ADC", elo: "Prata" },
        { id: "p2", riotId: "Caro#BR1", pontos: 10, rota1: "MID", rota2: "TOP", elo: "Mestre" },
      ],
      escolhaAtual: 0,
      totalEscolhas: 4,
      timeDaVezId: "time-1",
      escolhiveis: ["p1"],
      prazoISO: new Date(Date.now() + 60_000).toISOString(),
      motivoDaPausa: null,
      sorteioId: "abc",
      orcamentoPorTime: 30,
      jogadoresPorTime: 5,
      historico: [],
    };
    responder({ draft, sorteio: { semente: "abc", capitaes: ["a"], emISO: new Date().toISOString() }, semSaida: null, previa: previa() });
    renderizar();
    await screen.findByText("Escolher pelo CHAMA");
    const opcoes = [...document.querySelectorAll("option")].map((o) => o.textContent ?? "");
    expect(opcoes.some((o) => o.includes("Barato#BR1"))).toBe(true);
    expect(opcoes.some((o) => o.includes("Caro#BR1"))).toBe(false);
  });
});

/*
 * DRF-03 — recusa ou desistência DEPOIS do sorteio. O draft não tira ninguém sozinho (e não
 * deve: o que fazer é decisão da organização), mas a mesa precisa SABER. A prévia traz
 * `foraDoDraft`; a mesa mostra em vermelho e «Aplicar no site» pede a confirmação da lista.
 */
describe("DRF-03 · jogador do draft que não é mais apto", () => {
  function encerrado(): DraftPublico {
    return {
      revisao: 9,
      fase: "encerrado",
      times: [{ id: "time-1", nome: "CHAMA", cor: "#ef7d34", capitaoRiotId: "Luiz#BR1", gasto: 11, vagas: 0 }],
      elencos: {
        "time-1": [
          { riotId: "Luiz#BR1", pontos: 8, rota1: "TOP", rota2: "MID", elo: "Diamante", capitao: true },
          { riotId: "Saiu#BR1", pontos: 3, rota1: "SUP", rota2: "ADC", elo: "Prata", capitao: false },
        ],
      },
      disponiveis: [],
      escolhaAtual: 2,
      totalEscolhas: 2,
      timeDaVezId: null,
      escolhiveis: [],
      prazoISO: null,
      motivoDaPausa: null,
      sorteioId: "abc",
      orcamentoPorTime: 30,
      jogadoresPorTime: 2,
      historico: [],
    };
  }

  const sorteio = { semente: "abc", capitaes: ["a"], emISO: "2026-11-15T20:00:00.000Z" };

  it("aviso de perigo com o nome e a situação, e a virada só com a confirmação da lista", async () => {
    const fetchFalso = responder({
      draft: encerrado(),
      sorteio,
      semSaida: null,
      previa: previa({ foraDoDraft: [{ riotId: "Saiu#BR1", situacao: "desistiu" }] }),
    });
    renderizar();
    await screen.findByText("1 jogador(es) do draft não estão mais aptos");
    expect(screen.getAllByText(/Saiu#BR1 \(desistiu\)/).length).toBeGreaterThanOrEqual(2);

    const aplicar = screen.getByRole("button", { name: "Aplicar no site" }) as HTMLButtonElement;
    fireEvent.click(screen.getByLabelText(/Conferi os elencos/));
    // Conferir os elencos não basta: falta confirmar quem não é mais apto.
    expect(aplicar.disabled).toBe(true);

    fireEvent.click(screen.getByLabelText(/Sei que esse jogador não está mais apto/));
    expect(aplicar.disabled).toBe(false);
    fireEvent.click(aplicar);
    await waitFor(() => {
      const post = fetchFalso.mock.calls.find((c) => c[1]?.method === "POST");
      expect(post).toBeTruthy();
      expect(JSON.parse(String(post![1]!.body))).toMatchObject({ acao: "virar", confirmoForaDoDraft: true });
    });
  });

  it("sem ninguém fora (ou servidor sem o campo): nada de aviso nem confirmação a mais", async () => {
    const fetchFalso = responder({ draft: encerrado(), sorteio, semSaida: null, previa: previa() });
    renderizar();
    const aplicar = (await screen.findByRole("button", { name: "Aplicar no site" })) as HTMLButtonElement;
    expect(screen.queryByText(/não estão mais aptos/)).toBeNull();
    fireEvent.click(screen.getByLabelText(/Conferi os elencos/));
    expect(aplicar.disabled).toBe(false);
    fireEvent.click(aplicar);
    await waitFor(() => {
      const post = fetchFalso.mock.calls.find((c) => c[1]?.method === "POST");
      expect(post).toBeTruthy();
      expect(JSON.parse(String(post![1]!.body)).confirmoForaDoDraft).toBeUndefined();
    });
  });
});
