// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AdminSeriesPanel } from "@/components/admin/admin-series-panel";
import { ModoCompacto } from "@/components/admin/responsivo";
import type { MutateDraft } from "@/components/admin/shared";
import type { SeriesMatch, TournamentDataset } from "@/lib/schema";

/**
 * Séries no CELULAR — é ali que o resultado é lançado entre uma rodada e outra.
 *
 * No monitor a tela é lista + editor ao lado, com a grade de K/D/A de 620px. No celular
 * essa grade obrigava a rolar de lado para achar a coluna de mortes; agora a lista é de
 * cartões, o editor abre numa folha de tela cheia e cada jogador é um cartão com abates,
 * mortes e assistências lado a lado. Os testes renderizam com `ModoCompacto` porque o jsdom
 * não tem `matchMedia` — fora dele o painel cai no arranjo de monitor.
 */

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

// ---------------------------------------------------------------- fixtures

function dataset(series: SeriesMatch[]): TournamentDataset {
  return {
    tournament: {
      name: "4ª Edição",
      lastUpdatedISO: "2026-10-20T00:00:00.000Z",
      seriesPointsRule: { win: 3, loss: 0 },
      format: "BO3",
      status: "active",
    },
    archivedSeasons: [],
    teams: [
      { id: "alfa", name: "Alfa", slug: "alfa" },
      { id: "beta", name: "Beta", slug: "beta" },
    ],
    players: [
      { id: "a-top", nick: "Rocha", slug: "rocha", teamId: "alfa", role1: "TOP", elo: "Bronze" },
      { id: "a-mid", nick: "Faisca", slug: "faisca", teamId: "alfa", role1: "MID", elo: "Prata" },
      { id: "b-top", nick: "Muralha", slug: "muralha", teamId: "beta", role1: "TOP", elo: "Ferro" },
      { id: "b-mid", nick: "Brisa", slug: "brisa", teamId: "beta", role1: "MID", elo: "Ouro" },
    ],
    seriesMatches: series,
    standingsSeed: [],
  };
}

/** Série com um jogo já lançado (Alfa venceu), para a lista ter placar. */
function serieComJogo(id: string): SeriesMatch {
  return {
    id,
    date: "2026-11-21T08:30:00-03:00",
    teamAId: "alfa",
    teamBId: "beta",
    stage: "REGULAR_SEASON",
    format: "BO3",
    games: [
      {
        winnerTeamId: "alfa",
        mvpPlayerId: "",
        durationMin: 31,
        statsByPlayer: [
          { playerId: "a-top", champion: "Garen", kills: 3, deaths: 1, assists: 4 },
          { playerId: "b-top", champion: "Darius", kills: 1, deaths: 3, assists: 2 },
        ],
        bans: [{ teamId: "beta", championName: "Yasuo" }],
      },
    ],
    cardsUsed: [{ teamId: "alfa", cardId: "ABCDRAFT" }],
  };
}

function montar(inicial: TournamentDataset, compacto = true) {
  let ultimo = inicial;
  function Harness() {
    const [draft, setDraft] = useState(inicial);
    const mutate: MutateDraft = (recipe) => {
      const proximo = structuredClone(ultimo);
      recipe(proximo);
      ultimo = proximo;
      setDraft(proximo);
    };
    return (
      <AdminSeriesPanel
        draft={draft}
        mutateDraft={mutate}
        aplicarDoServidor={mutate}
        onVersaoDoServidor={() => {}}
      />
    );
  }
  render(
    <ModoCompacto ativo={compacto}>
      <Harness />
    </ModoCompacto>,
  );
  return { atual: () => ultimo };
}

/**
 * As grades do monitor têm largura mínima: 620px a de K/D/A, 360px as de bans e cartinhas.
 * No celular (360px de tela) nenhuma delas pode existir — rolariam de lado.
 */
function temGradeLarga() {
  return /min-width: (620|360)px/.test(document.body.innerHTML);
}

// ---------------------------------------------------------------- testes

describe("Séries no celular", () => {
  it("a lista é de cartões de placar e nada usa a grade larga", () => {
    montar(dataset([serieComJogo("cel-lista")]));

    const cartao = screen.getByRole("button", { name: /Abrir a série Alfa x Beta, 1 a 0, Em andamento/ });
    expect(cartao.getAttribute("aria-haspopup")).toBe("dialog");
    expect(screen.getByRole("button", { name: /Em andamento/, pressed: false })).toBeTruthy();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(temGradeLarga()).toBe(false);
  });

  it("tocar no cartão abre a folha da série com um cartão por jogador e K/D/A numéricos", () => {
    const { atual } = montar(dataset([serieComJogo("cel-kda")]));
    fireEvent.click(screen.getByRole("button", { name: /Abrir a série Alfa x Beta/ }));

    const folha = screen.getByRole("dialog", { name: "Alfa x Beta" });
    const abates = within(folha).getByLabelText("Abates da linha 1") as HTMLInputElement;
    const mortes = within(folha).getByLabelText("Mortes da linha 1") as HTMLInputElement;
    const assist = within(folha).getByLabelText("Assistências da linha 1") as HTMLInputElement;
    for (const campo of [abates, mortes, assist]) expect(campo.inputMode).toBe("numeric");
    expect(abates.value).toBe("3");

    // Os três ficam no MESMO cartão do jogador (lado a lado), não em colunas de uma tabela.
    const cartaoDoJogador = abates.closest("label")?.parentElement;
    expect(cartaoDoJogador?.contains(mortes)).toBe(true);
    expect(cartaoDoJogador?.contains(assist)).toBe(true);

    fireEvent.change(abates, { target: { value: "7" } });
    expect(atual().seriesMatches[0].games[0].statsByPlayer[0].kills).toBe(7);
    expect(temGradeLarga()).toBe(false);
  });

  it("o vencedor do jogo é tocado no escudo do time; tocar de novo não desmarca", () => {
    const { atual } = montar(dataset([serieComJogo("cel-vencedor")]));
    fireEvent.click(screen.getByRole("button", { name: /Abrir a série Alfa x Beta/ }));

    const grupo = within(screen.getByRole("dialog")).getByRole("group", { name: "Quem venceu" });
    const beta = within(grupo).getByRole("button", { name: /Beta/ });
    expect(within(grupo).getByRole("button", { name: /Alfa/ }).getAttribute("aria-pressed")).toBe("true");

    fireEvent.click(beta);
    expect(atual().seriesMatches[0].games[0].winnerTeamId).toBe("beta");
    expect(beta.getAttribute("aria-pressed")).toBe("true");

    // Toque duplo acidental não pode apagar o resultado.
    fireEvent.click(beta);
    expect(atual().seriesMatches[0].games[0].winnerTeamId).toBe("beta");

    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Desmarcar" }));
    expect(atual().seriesMatches[0].games[0].winnerTeamId).toBe("");
  });

  it("Concluir fecha a folha e descarta a linha em branco, como trocar de série no monitor", () => {
    const { atual } = montar(dataset([serieComJogo("cel-concluir")]));
    fireEvent.click(screen.getByRole("button", { name: /Abrir a série Alfa x Beta/ }));

    const folha = screen.getByRole("dialog");
    fireEvent.click(within(folha).getByRole("button", { name: "Linha" }));
    expect(atual().seriesMatches[0].games[0].statsByPlayer).toHaveLength(3);

    fireEvent.click(within(folha).getByRole("button", { name: "Concluir" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(atual().seriesMatches[0].games[0].statsByPlayer).toHaveLength(2);
    expect(screen.getByText(/1 linha\(s\) em branco descartada\(s\)/)).toBeTruthy();
  });

  it("excluir pelo rodapé da folha pede confirmação e, confirmado, fecha a folha", () => {
    const confirmar = vi.fn(() => true);
    vi.stubGlobal("confirm", confirmar);
    const { atual } = montar(dataset([serieComJogo("cel-excluir")]));
    fireEvent.click(screen.getByRole("button", { name: /Abrir a série Alfa x Beta/ }));

    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: /Excluir série/ }));
    expect(confirmar).toHaveBeenCalledOnce();
    expect(atual().seriesMatches).toHaveLength(0);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("no monitor continua a lista + editor ao lado, sem folha", () => {
    montar(dataset([serieComJogo("mesa-continua")]), false);
    const alvo = screen
      .getAllByRole("button")
      .find((botao) => botao.textContent?.includes("Alfa") && botao.textContent?.includes("Beta"));
    if (!alvo) throw new Error("série não está na lista");
    fireEvent.click(alvo);

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByLabelText("Abates da linha 1")).toBeTruthy();
    expect(temGradeLarga()).toBe(true);
  });
});
