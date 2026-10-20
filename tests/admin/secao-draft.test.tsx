// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SecaoDraft } from "@/components/admin/e4/secao-draft";
import type { DraftPublico, PreviaDoDraft } from "@/lib/draft/store";

/**
 * A mesa do draft no painel. Antes dela a rota /api/admin/draft existia, mas nenhuma tela
 * a chamava — sortear, iniciar e aplicar o draft exigiam montar a requisição à mão.
 */

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
    // Orçamento fora da regra (30 x 33) vira aviso antes de sortear.
    expect(screen.getByText(/não é o da regra \(33\)/)).toBeTruthy();
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
