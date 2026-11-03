// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * A ARENA NO ARQUIVO só mostra. A rota de sorteio trabalha no campeonato no ar: se a partida de
 * uma temporada arquivada oferecesse "Sortear lados" a quem é da organização, o clique sortearia
 * na série de MESMO ID da temporada atual (os ids "serie-01"… se repetem entre edições).
 */

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh() {} }) }));

const { SeriesLiveDraw } = await import("@/components/series-live-draw");

const times = { a: { id: "time-a", name: "Vanguarda de Ferro" }, b: { id: "time-b", name: "LGTV Wins" } };

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify({ authorized: true, user: { isMaster: true, scopes: [] } }))),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function arena(somenteLeitura: boolean) {
  return render(
    <SeriesLiveDraw
      seriesId="serie-01"
      teamA={times.a}
      teamB={times.b}
      initialCards={[{ teamId: "time-a", cardId: "ABCDRAFT" }]}
      initialBlueSideTeamId="time-b"
      somenteLeitura={somenteLeitura}
    />,
  );
}

describe("arena somente leitura (partida do arquivo)", () => {
  it("nem pergunta a sessão: nenhum botão de sorteio, ensaio ou painel, mesmo para o master", async () => {
    arena(true);
    await new Promise((r) => setTimeout(r, 60));
    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(screen.queryAllByRole("button")).toHaveLength(0);
    // O que foi sorteado continua à vista.
    expect(screen.getByText("ABCDRAFT")).toBeTruthy();
    expect(screen.getAllByText("LGTV Wins").length).toBeGreaterThan(0);
  });

  it("controle: no campeonato no ar, o master recebe os botões", async () => {
    arena(false);
    await waitFor(() => expect(screen.getAllByRole("button", { name: /sortear/i }).length).toBeGreaterThan(0));
  });

  it("módulo sem registro some no arquivo (nada de 'a sortear')", async () => {
    render(
      <SeriesLiveDraw seriesId="serie-02" teamA={times.a} teamB={times.b} initialCards={[{ teamId: "time-a", cardId: "ABCDRAFT" }]} somenteLeitura />,
    );
    expect(screen.queryByText(/a sortear/i)).toBeNull();
    expect(screen.queryByText(/Lados · jogo 1/i)).toBeNull();
    expect(screen.getByText("ABCDRAFT")).toBeTruthy();
  });
});
