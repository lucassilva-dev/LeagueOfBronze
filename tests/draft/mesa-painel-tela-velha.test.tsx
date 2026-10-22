// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SecaoDraft } from "@/components/admin/e4/secao-draft";
import type { DraftPublico, PreviaDoDraft } from "@/lib/draft/store";

/**
 * A mesa do draft no painel, do lado da tela (DRF-02 e DRF-04).
 *
 * DRF-02: o painel só se relia com o draft rodando/pausado. Parado em "sem draft" ou em
 * "sorteado", continuava oferecendo «Sortear» e «Iniciar» depois que o colega já tinha
 * sorteado ou iniciado. Agora relê em todos os estados e manda no pedido o sorteio que viu.
 *
 * DRF-04: reaplicar a virada pede uma segunda confirmação, dita na tela.
 */

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function previa(): PreviaDoDraft {
  return {
    config: { jogadoresPorTime: 2, maxTimes: 6, orcamentoPorTime: 10, segundosPorEscolha: 60 },
    times: 1,
    vagas: 2,
    aprovados: 2,
    aptos: 2,
    sobra: 0,
    pendentes: 0,
    impedimentos: [],
    totalDePontos: 8,
    orcamentoSugerido: 10,
    jogadores: [
      { id: "a", riotId: "Luiz#BR1", elo: "Diamante", forca: "Diamante I · 14 PDL", pontos: 5, rota1: "TOP", rota2: "MID", organizador: false, temConta: true },
      { id: "b", riotId: "Outro#BR1", elo: "Prata", forca: "Prata II · 3 PDL", pontos: 3, rota1: "SUP", rota2: "ADC", organizador: false, temConta: true },
    ],
    capitaesPelaRegra: ["a"],
    empateNoCorte: null,
    faltamCapitaes: 0,
    semEloCongelado: [],
    inscricoesAbertas: false,
  };
}

function draft(over: Partial<DraftPublico> = {}): DraftPublico {
  return {
    revisao: 3,
    fase: "preparando",
    times: [{ id: "time-1", nome: "CHAMA", cor: "#ef7d34", capitaoRiotId: "Luiz#BR1", gasto: 5, vagas: 1 }],
    elencos: { "time-1": [{ riotId: "Luiz#BR1", pontos: 5, rota1: "TOP", rota2: "MID", elo: "Diamante", capitao: true }] },
    disponiveis: [{ id: "b", riotId: "Outro#BR1", pontos: 3, rota1: "SUP", rota2: "ADC", elo: "Prata" }],
    escolhaAtual: 0,
    totalEscolhas: 1,
    timeDaVezId: null,
    escolhiveis: [],
    prazoISO: null,
    motivoDaPausa: null,
    sorteioId: "S1",
    orcamentoPorTime: 10,
    jogadoresPorTime: 2,
    historico: [],
    ...over,
  };
}

function painel(d: DraftPublico | null) {
  return { draft: d, sorteio: d ? { semente: d.sorteioId, capitaes: ["a"], emISO: new Date().toISOString() } : null, semSaida: null, previa: previa() };
}

type Pedido = { url: string; metodo: string; corpo: Record<string, unknown> | null };

/**
 * Servidor falso: `leituras` são as respostas do GET do painel, em sequência (a última
 * se repete); `aoPost` responde cada POST.
 */
function servidor(leituras: unknown[], aoPost: (corpo: Record<string, unknown>) => { status: number; corpo: unknown } = () => ({ status: 200, corpo: { ok: true } })) {
  const pedidos: Pedido[] = [];
  const fila = [...leituras];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      const metodo = init?.method ?? "GET";
      const corpo = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : null;
      pedidos.push({ url: String(url), metodo, corpo });
      if (metodo === "POST") {
        const r = aoPost(corpo ?? {});
        return new Response(JSON.stringify(r.corpo), { status: r.status });
      }
      const resposta = fila.length > 1 ? fila.shift() : fila[0];
      if (String(url).includes("/api/draft/estado")) {
        return new Response(JSON.stringify({ draft: (resposta as { draft: unknown }).draft, agoraServidorISO: new Date().toISOString() }), { status: 200 });
      }
      return new Response(JSON.stringify(resposta), { status: 200 });
    }),
  );
  return pedidos;
}

function renderizar() {
  const onAlert = vi.fn();
  render(<SecaoDraft onAlert={onAlert} podeConduzir onDatasetMudou={vi.fn()} />);
  return onAlert;
}

describe("DRF-02 · o painel se atualiza fora do ao vivo", () => {
  it("parado em 'sem draft', mostra o sorteio do colega sozinho (sem clicar em Atualizar)", async () => {
    servidor([painel(null), painel(draft())]);
    renderizar();
    await screen.findByRole("button", { name: "Sortear" });
    // A releitura é de 5 em 5 s: o botão de iniciar aparece sem ninguém tocar na tela.
    // Folga larga: com a máquina ocupada (testes em paralelo), o render do painel inteiro
    // no jsdom leva segundos.
    await screen.findByRole("button", { name: /Iniciar o draft/ }, { timeout: 20_000 });
    expect(screen.getByRole("button", { name: /Sortear de novo/ })).toBeTruthy();
  }, 30_000);

  it("«Sortear» sem draft na tela diz que não via sorteio nenhum", async () => {
    const pedidos = servidor([painel(null)]);
    renderizar();
    fireEvent.click(await screen.findByRole("button", { name: "Sortear" }));
    await waitFor(() => expect(pedidos.some((p) => p.metodo === "POST")).toBe(true));
    const post = pedidos.find((p) => p.metodo === "POST")!;
    expect(post.corpo).toMatchObject({ acao: "montar" });
    expect(post.corpo).toHaveProperty("sorteioVisto", null);
  });

  it("«Iniciar» e «Sortear de novo» mandam o sorteio que a tela mostra", async () => {
    const pedidos = servidor([painel(draft({ sorteioId: "S1" }))]);
    renderizar();
    fireEvent.click(await screen.findByRole("button", { name: /Iniciar o draft/ }));
    await waitFor(() => expect(pedidos.some((p) => p.metodo === "POST")).toBe(true));
    expect(pedidos.find((p) => p.metodo === "POST")!.corpo).toEqual({ acao: "iniciar", sorteioVisto: "S1" });

    fireEvent.click(await screen.findByRole("button", { name: /Sortear de novo/ }));
    await waitFor(() => expect(pedidos.filter((p) => p.metodo === "POST")).toHaveLength(2));
    expect(pedidos.filter((p) => p.metodo === "POST")[1]!.corpo).toMatchObject({ acao: "montar", sorteioVisto: "S1" });
  });

  it("a caixa «sortear de novo APAGA o draft» desmarca quando entra outro sorteio", async () => {
    const rodando = (sorteioId: string, revisao: number) =>
      draft({ fase: "rodando", sorteioId, revisao, timeDaVezId: "time-1", prazoISO: new Date(Date.now() + 60_000).toISOString() });
    // O GET do painel mostra o S1 rodando; a sondagem pública traz o S3, sorteado pelo colega.
    servidor([painel(rodando("S1", 5)), painel(rodando("S3", 9))]);
    renderizar();
    const caixa = (await screen.findByRole("checkbox", { name: /APAGA o draft atual/ })) as HTMLInputElement;
    fireEvent.click(caixa);
    expect(caixa.checked).toBe(true);
    await waitFor(
      () => expect((screen.getByRole("checkbox", { name: /APAGA o draft atual/ }) as HTMLInputElement).checked).toBe(false),
      { timeout: 20_000, interval: 100 },
    );
  }, 30_000);
});

describe("DRF-04 · reaplicar a virada pede a segunda confirmação", () => {
  it("o 409 do servidor vira aviso na tela, e só a caixa marcada manda a confirmação", async () => {
    let posts = 0;
    const pedidos = servidor([painel(draft({ fase: "encerrado", totalEscolhas: 1, escolhaAtual: 1 }))], (corpo) => {
      posts++;
      if (corpo.acao === "virar" && corpo.confirmoReaplicar !== true) {
        return { status: 409, corpo: { error: "O draft já foi aplicado no site.", precisaConfirmar: true } };
      }
      return { status: 200, corpo: { ok: true, teams: [], players: [] } };
    });
    renderizar();

    fireEvent.click(await screen.findByRole("checkbox", { name: /Conferi os elencos/ }));
    const aplicar = screen.getByRole("button", { name: "Aplicar no site" }) as HTMLButtonElement;
    expect(aplicar.disabled).toBe(false);
    fireEvent.click(aplicar);

    await screen.findByText("Este draft já está aplicado no site");
    // Sem a segunda caixa o botão fica preso.
    expect((screen.getByRole("button", { name: "Aplicar no site" }) as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(screen.getByRole("checkbox", { name: /reaplicar apaga as fotos/ }));
    fireEvent.click(screen.getByRole("button", { name: "Aplicar no site" }));
    await waitFor(() => expect(posts).toBe(2));

    const viradas = pedidos.filter((p) => p.metodo === "POST" && p.corpo?.acao === "virar");
    expect(viradas[0]!.corpo).not.toHaveProperty("confirmoReaplicar");
    expect(viradas[1]!.corpo).toMatchObject({ confirmoReaplicar: true });
    // Aplicou: o aviso some.
    await waitFor(() => expect(screen.queryByText("Este draft já está aplicado no site")).toBeNull());
  });
});
