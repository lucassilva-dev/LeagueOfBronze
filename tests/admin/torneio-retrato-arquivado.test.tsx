// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AdminTournamentPanel } from "@/components/admin/admin-tournament-panel";
import type { TournamentDataset } from "@/lib/schema";

/**
 * Aba Torneio com a temporada JÁ encerrada.
 *
 * 29/11: a final é encerrada com o jogo 4 faltando e o retrato sai "sem campeão". O jogo 4 é
 * lançado depois, mas o arquivo não mudava — o cartão de encerrar sumia e o "Iniciar nova
 * temporada" nem oferecia arquivar. Ao iniciar a 5ª, o único exemplar da 4ª ficava errado
 * para sempre. O servidor sabe refazer o retrato (as duas rotas); faltava o caminho na tela.
 */

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function dataset(status: "active" | "finished"): TournamentDataset {
  return {
    tournament: {
      name: "4ª Edição",
      lastUpdatedISO: "2026-11-29T22:00:00.000Z",
      seriesPointsRule: { win: 3, loss: 0 },
      format: "BO3",
      status,
    },
    archivedSeasons: [],
    teams: [
      { id: "alfa", name: "Alfa", slug: "alfa" },
      { id: "beta", name: "Beta", slug: "beta" },
    ],
    players: [],
    seriesMatches: [],
    standingsSeed: [],
  } as unknown as TournamentDataset;
}

/** O painel confere o gravado: responde o mesmo dataset da tela. */
function servidor(d: TournamentDataset) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      if (String(url).includes("/api/admin/dataset")) {
        return { ok: true, status: 200, json: async () => ({ dataset: d, versao: 3 }) } as unknown as Response;
      }
      throw new Error(`fetch inesperado: ${url}`);
    }),
  );
}

describe("temporada já encerrada (CEN-04)", () => {
  it("oferece «Atualizar o retrato arquivado», com confirmação, pela mesma ação de encerrar", async () => {
    const d = dataset("finished");
    servidor(d);
    const encerrar = vi.fn();
    render(<AdminTournamentPanel draft={d} isBusy={false} onEndTournament={encerrar} onStartTournament={() => {}} />);

    const botao = (await screen.findByRole("button", { name: "Atualizar o retrato arquivado" })) as HTMLButtonElement;
    expect(botao.disabled, "sem a confirmação, nada").toBe(true);

    fireEvent.click(screen.getByLabelText(/trocar o retrato arquivado desta temporada/));
    expect(botao.disabled).toBe(false);
    fireEvent.click(botao);
    expect(encerrar).toHaveBeenCalledOnce();
  });
});

describe("iniciar a próxima com a temporada já encerrada (TOR-02)", () => {
  it("mostra a opção de atualizar o arquivo antes de limpar, desmarcada, e a manda como archiveCurrent", async () => {
    const d = dataset("finished");
    servidor(d);
    const iniciar = vi.fn();
    render(<AdminTournamentPanel draft={d} isBusy={false} onEndTournament={() => {}} onStartTournament={iniciar} />);

    const opcao = (await screen.findByLabelText(
      /Atualizar o arquivo da temporada encerrada com o estado atual antes de limpar/,
    )) as HTMLInputElement;
    expect(opcao.checked, "nunca marcada de forma automática").toBe(false);
    fireEvent.click(opcao);

    fireEvent.change(screen.getByPlaceholderText("Ex.: 4ª Edição"), { target: { value: "5ª Edição" } });
    fireEvent.click(screen.getByLabelText(/Já exportei\/fiz o backup/));
    fireEvent.change(screen.getByPlaceholderText("INICIAR"), { target: { value: "INICIAR" } });
    fireEvent.click(screen.getByRole("button", { name: "Iniciar nova temporada" }));

    expect(iniciar).toHaveBeenCalledWith(expect.objectContaining({ name: "5ª Edição", archiveCurrent: true }));
  });
});

describe("nome da nova temporada (CEN-10)", () => {
  it("o exemplo é só a edição, e a marca no nome ganha aviso", async () => {
    const d = dataset("active");
    servidor(d);
    render(<AdminTournamentPanel draft={d} isBusy={false} onEndTournament={() => {}} onStartTournament={() => {}} />);

    const campo = await screen.findByPlaceholderText("Ex.: 4ª Edição");
    expect(screen.queryByText("O nome já ganha a marca do site")).toBeNull();
    fireEvent.change(campo, { target: { value: "4ª Edição da League of Bronze" } });
    expect(screen.getByText("O nome já ganha a marca do site")).toBeTruthy();
  });
});
