// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AdminSeriesPanel } from "@/components/admin/admin-series-panel";
import { ModoCompacto } from "@/components/admin/responsivo";
import type { MutateDraft } from "@/components/admin/shared";
import type { SeriesMatch, TournamentDataset } from "@/lib/schema";

/**
 * Proteções do editor de séries contra o engano do dia de jogo:
 *  - sortear ao vivo uma série que só existe no rascunho (PNL-07);
 *  - trocar o time de uma série já sorteada (PNL-09);
 *  - lançar jogo numa série já decidida (PNL-10);
 *  - a lixeira de uma linha preenchida (PNL-15);
 *  - botão da Riot para quem não tem `riot:import` (PNL-12).
 */

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

type Jogo = SeriesMatch["games"][number];

const jogo = (vencedor: string): Jogo => ({
  winnerTeamId: vencedor,
  durationMin: 30,
  mvpPlayerId: `${vencedor}-mid`,
  statsByPlayer: [{ playerId: `${vencedor}-mid`, champion: "Ahri", kills: 5, deaths: 1, assists: 2 }],
});

function dataset(series: SeriesMatch[]): TournamentDataset {
  const jog = (t: string) =>
    ["top", "mid"].map((r) => ({ id: `${t}-${r}`, nick: `${t}-${r}`, slug: `${t}-${r}`, teamId: t, role1: "MID", elo: "PRATA" }));
  return {
    tournament: { name: "4ª", lastUpdatedISO: "x", seriesPointsRule: { win: 3, loss: 0 }, format: "BO3", status: "active" },
    archivedSeasons: [],
    teams: [
      { id: "alfa", name: "Alfa", slug: "alfa" },
      { id: "beta", name: "Beta", slug: "beta" },
      { id: "gama", name: "Gama", slug: "gama" },
    ],
    players: [...jog("alfa"), ...jog("beta"), ...jog("gama")],
    seriesMatches: series,
    standingsSeed: [],
  } as unknown as TournamentDataset;
}

const serie = (over: Partial<SeriesMatch> = {}): SeriesMatch =>
  ({ id: "s1", date: "2026-11-21T21:00:00-03:00", teamAId: "alfa", teamBId: "beta", games: [], ...over }) as SeriesMatch;

/** Monta o painel com o rascunho em memória e as séries GRAVADAS separadas. */
function montar(
  inicial: TournamentDataset,
  { gravadas = inicial.seriesMatches, compacto = false, podeRiot = true } = {},
) {
  let atual = inicial;
  function Harness() {
    const [d, setD] = useState(atual);
    const mutate: MutateDraft = (recipe) => {
      const proximo = structuredClone(atual);
      recipe(proximo);
      atual = proximo;
      setD(proximo);
    };
    return (
      <ModoCompacto ativo={compacto}>
        <AdminSeriesPanel
          draft={d}
          mutateDraft={mutate}
          aplicarDoServidor={mutate}
          onVersaoDoServidor={() => {}}
          seriesGravadas={structuredClone(gravadas)}
          podeRiot={podeRiot}
        />
      </ModoCompacto>
    );
  }
  render(<Harness />);
  return { atual: () => atual };
}

function abrir(a: string, b: string) {
  fireEvent.click(
    screen.getAllByRole("button").find((botao) => botao.textContent?.includes(a) && botao.textContent?.includes(b))!,
  );
}

describe("sortear ao vivo só sobre a série gravada (PNL-07)", () => {
  it("série criada no rascunho e não salva: botão desligado, com o motivo escrito", () => {
    const nova = serie({ id: "semi-1", stage: "SEMIFINAL" });
    montar(dataset([nova]), { gravadas: [] });
    abrir("Alfa", "Beta");

    const botao = screen.getByRole("button", { name: "Sortear ao vivo" }) as HTMLButtonElement;
    expect(botao.disabled).toBe(true);
    expect(screen.getByText(/Salve a série antes de sortear/)).toBeTruthy();
  });

  it("time trocado no rascunho e não salvo: desligado; confronto igual ao gravado: ligado", () => {
    const gravada = serie({ teamAId: "gama" });
    montar(dataset([serie()]), { gravadas: [gravada] });
    abrir("Alfa", "Beta");
    expect((screen.getByRole("button", { name: "Sortear ao vivo" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(/Salve a troca de time antes de sortear/)).toBeTruthy();
    cleanup();

    montar(dataset([serie()]));
    abrir("Alfa", "Beta");
    expect((screen.getByRole("button", { name: "Sortear ao vivo" }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("no celular também", () => {
    montar(dataset([serie({ id: "semi-1" })]), { gravadas: [], compacto: true });
    abrir("Alfa", "Beta");
    expect((screen.getByRole("button", { name: /Sortear ao vivo/ }) as HTMLButtonElement).disabled).toBe(true);
  });
});

describe("trocar o time de uma série já sorteada (PNL-09)", () => {
  const sorteada = () =>
    serie({ blueSideTeamId: "alfa", cardsUsed: [{ teamId: "alfa", cardId: "INTER_CLASSE" }] });

  it("pede confirmação citando o lado azul e a cartinha; recusar não muda nada", () => {
    const confirmar = vi.fn(() => false);
    vi.stubGlobal("confirm", confirmar);
    const { atual } = montar(dataset([sorteada()]));
    abrir("Alfa", "Beta");

    fireEvent.change(screen.getByLabelText("Time A"), { target: { value: "gama" } });
    expect(confirmar).toHaveBeenCalledOnce();
    expect(String((confirmar.mock.calls[0] as unknown[])[0])).toMatch(/lado azul sorteado \(Alfa\) e 1 cartinha/);
    expect(atual().seriesMatches[0]).toMatchObject({ teamAId: "alfa", blueSideTeamId: "alfa" });
    expect(atual().seriesMatches[0]!.cardsUsed).toHaveLength(1);
  });

  it("desfazer a troca antes de salvar devolve o sorteio gravado", () => {
    vi.stubGlobal("confirm", vi.fn(() => true));
    const { atual } = montar(dataset([sorteada()]));
    abrir("Alfa", "Beta");

    fireEvent.change(screen.getByLabelText("Time A"), { target: { value: "gama" } });
    expect(atual().seriesMatches[0]!.blueSideTeamId).toBeUndefined();
    fireEvent.change(screen.getByLabelText("Time A"), { target: { value: "alfa" } });

    expect(atual().seriesMatches[0]!.blueSideTeamId).toBe("alfa");
    expect(atual().seriesMatches[0]!.cardsUsed).toEqual([{ teamId: "alfa", cardId: "INTER_CLASSE" }]);
  });
});

describe("série decidida não aceita jogo novo (PNL-10)", () => {
  it("monitor: com 2x0 o botão vira «Série decidida», desligado", () => {
    montar(dataset([serie({ games: [jogo("alfa"), jogo("alfa")] })]));
    abrir("Alfa", "Beta");
    const botao = screen.getByRole("button", { name: /Série decidida/ }) as HTMLButtonElement;
    expect(botao.disabled).toBe(true);
    expect(screen.queryByRole("button", { name: /Adicionar jogo/ })).toBeNull();
  });

  it("celular: o mesmo, com o placar no rótulo; com 1x1 continua liberado", () => {
    montar(dataset([serie({ games: [jogo("alfa"), jogo("alfa")] })]), { compacto: true });
    abrir("Alfa", "Beta");
    expect((screen.getByRole("button", { name: /Série decidida \(2x0\)/ }) as HTMLButtonElement).disabled).toBe(true);
    cleanup();

    montar(dataset([serie({ games: [jogo("alfa"), jogo("beta")] })]), { compacto: true });
    abrir("Alfa", "Beta");
    expect((screen.getByRole("button", { name: /Adicionar jogo 3/ }) as HTMLButtonElement).disabled).toBe(false);
  });
});

describe("lixeira de linha preenchida (PNL-15)", () => {
  it("linha com campeão e K/D/A pede confirmação; recusar mantém a linha", () => {
    const confirmar = vi.fn(() => false);
    vi.stubGlobal("confirm", confirmar);
    const { atual } = montar(dataset([serie({ games: [jogo("alfa")] })]));
    abrir("Alfa", "Beta");

    fireEvent.click(screen.getByRole("button", { name: "Remover a linha 1" }));
    expect(confirmar).toHaveBeenCalledOnce();
    expect(String((confirmar.mock.calls[0] as unknown[])[0])).toMatch(/alfa-mid \(Ahri, 5\/1\/2\)/);
    expect(atual().seriesMatches[0]!.games[0]!.statsByPlayer).toHaveLength(1);
  });

  it("linha em branco sai sem pergunta", () => {
    const confirmar = vi.fn(() => false);
    vi.stubGlobal("confirm", confirmar);
    const g = jogo("alfa");
    g.statsByPlayer.push({ playerId: "", champion: "", kills: 0, deaths: 0, assists: 0 });
    const { atual } = montar(dataset([serie({ games: [g] })]));
    abrir("Alfa", "Beta");

    fireEvent.click(screen.getByRole("button", { name: "Remover a linha 2" }));
    expect(confirmar).not.toHaveBeenCalled();
    expect(atual().seriesMatches[0]!.games[0]!.statsByPlayer).toHaveLength(1);
  });

  it("cartinha pede confirmação", () => {
    const confirmar = vi.fn(() => false);
    vi.stubGlobal("confirm", confirmar);
    const { atual } = montar(dataset([serie({ cardsUsed: [{ teamId: "alfa", cardId: "ABCDRAFT" }] })]));
    abrir("Alfa", "Beta");

    fireEvent.click(screen.getByRole("button", { name: "Remover a cartinha 1" }));
    expect(confirmar).toHaveBeenCalledOnce();
    expect(atual().seriesMatches[0]!.cardsUsed).toHaveLength(1);
  });
});

describe("Importar da Riot sem a permissão (PNL-12)", () => {
  it("o botão vem desligado e diz por quê", () => {
    montar(dataset([serie({ games: [jogo("alfa")] })]), { podeRiot: false });
    abrir("Alfa", "Beta");
    fireEvent.change(screen.getByPlaceholderText(/3210692404/), { target: { value: "BR1_123" } });
    const botao = screen.getByRole("button", { name: /Importar da Riot \(sem permissão\)/ }) as HTMLButtonElement;
    expect(botao.disabled).toBe(true);
    expect(botao.title).toMatch(/Importar partida pela Riot/);
  });
});
