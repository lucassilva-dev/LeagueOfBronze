// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * O cartão "4 · Calendário" da mesa do draft QUANDO A GRADE EXISTE — aqui a de 8 times de
 * teste (tests/_calendarios.ts), no formato da que vai chegar. Os números do cartão (times,
 * séries, período) saem da grade, e não de um texto escrito à mão para 6 times.
 *
 * O cartão travado, com as datas a divulgar, está em tests/draft/oito-times.test.tsx.
 */

vi.mock("@/lib/calendario-4a-grade", async () => ({
  CALENDARIO_OFICIAL_4A: (await import("@/tests/_calendarios")).calendarioDe8TimesDeTeste(),
}));

const { SecaoDraft } = await import("@/components/admin/e4/secao-draft");

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const previa = {
  config: { jogadoresPorTime: 5, maxTimes: 8, orcamentoPorTime: 30, segundosPorEscolha: 60 },
  times: 8,
  vagas: 40,
  aprovados: 40,
  aptos: 40,
  sobra: 0,
  pendentes: 0,
  impedimentos: [],
  totalDePontos: 240,
  jogadores: [],
  capitaesPelaRegra: [],
  empateNoCorte: null,
  faltamCapitaes: 0,
  semEloCongelado: [],
  inscricoesAbertas: false,
};

describe("cartão do calendário com a grade de 8 times", () => {
  it("diz 8 times, 28 séries e o período da fase de pontos; o botão manda a ação e avisa 28 séries", async () => {
    const pedidos: { url: string; corpo: unknown }[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        const corpo = init?.body ? (JSON.parse(String(init.body)) as unknown) : null;
        pedidos.push({ url: String(url), corpo });
        if (init?.method === "POST") return new Response(JSON.stringify({ ok: true, posicoes: [], series: 28 }), { status: 200 });
        return new Response(JSON.stringify({ draft: null, sorteio: null, semSaida: null, previa }), { status: 200 });
      }),
    );
    const onAlert = vi.fn();
    render(<SecaoDraft onAlert={onAlert} podeConduzir onDatasetMudou={vi.fn()} />);

    await screen.findByText("Sortear as posições e criar as 28 séries");
    expect(
      screen.getByText(
        /Sorteia qual time é o Time 1 … Time 8 do calendário publicado e cria as 28 séries da fase de pontos com data e hora \(20\/11 a 06\/12\)\./,
      ),
    ).toBeTruthy();
    expect(screen.queryByText("datas a divulgar")).toBeNull();

    const botao = screen.getByRole("button", { name: "Sortear e criar as séries" }) as HTMLButtonElement;
    expect(botao.disabled).toBe(true); // falta a confirmação
    fireEvent.click(screen.getByText("Os times do draft já estão no site. Pode sortear as posições."));
    await waitFor(() => expect(botao.disabled).toBe(false));
    fireEvent.click(botao);
    await waitFor(() => expect(pedidos.some((p) => (p.corpo as { acao?: string } | null)?.acao === "calendario")).toBe(true));
    await waitFor(() => expect(onAlert).toHaveBeenCalledWith("ok", "Posições sorteadas e 28 séries criadas."));
  });
});
