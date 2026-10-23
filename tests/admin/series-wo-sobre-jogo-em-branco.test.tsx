// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AdminSeriesPanel, auditarSerie } from "@/components/admin/admin-series-panel";
import { createBlankGame, type MutateDraft } from "@/components/admin/shared";
import type { TournamentDataset } from "@/lib/schema";
import { applyAutoGameMvpsToDataset, getSeriesScore, jogosDeWalkoverDaSerie } from "@/lib/tournament";

import { cenario, jogo, linhasDoTime, validar } from "../torneio/_cenario-regra-6";

/**
 * W.O. no meio da série ("jogos valem, W.O. completa") aplicado sobre um jogo EM BRANCO.
 *
 * Dia de jogo: a organização abre ALFA x BETA, clica «Adicionar jogo» (jogo 1 sem vencedor
 * nem linha) e a BETA não aparece. O W.O. preservava TODOS os jogos — inclusive esse, que
 * nunca existiu: a pergunta dizia «O jogo já lançado continua valendo», os jogos de W.O.
 * viravam 2 e 3 e a série não salvava mais («Jogo 1: falta marcar o time vencedor»).
 *
 * Agora o jogo em branco (sem vencedor, sem ban e só com linhas descartáveis) sai com o W.O.,
 * e os jogos com algo lançado continuam preservados, como pede o B1.
 */

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function montar(inicial: TournamentDataset) {
  let atual = inicial;
  function Harness() {
    const [d, setD] = useState(atual);
    const mutate: MutateDraft = (recipe) => {
      const proximo = structuredClone(atual);
      recipe(proximo);
      atual = proximo;
      setD(proximo);
    };
    return <AdminSeriesPanel draft={d} mutateDraft={mutate} aplicarDoServidor={mutate} onVersaoDoServidor={() => {}} />;
  }
  render(<Harness />);
  return { atual: () => atual };
}

function abrirAlfaBetaEMarcarWo(vencedor: string) {
  fireEvent.click(
    [...document.querySelectorAll("button")].find((b) => b.textContent?.includes("ALFA") && b.textContent?.includes("BETA"))!,
  );
  fireEvent.change(screen.getByLabelText("Situação da série"), { target: { value: vencedor } });
}

const textoDaPergunta = (confirmar: ReturnType<typeof vi.fn>) =>
  String((confirmar.mock.calls as unknown as string[][])[0]?.[0] ?? "");

describe("W.O. sobre um jogo em branco", () => {
  it("só o jogo em branco: ele sai, os W.O. são os jogos 1 e 2, e a série salva", () => {
    const confirmar = vi.fn(() => true);
    vi.stubGlobal("confirm", confirmar);
    const inicial = cenario();
    inicial.seriesMatches[0].games = [createBlankGame()];
    const { atual } = montar(inicial);

    abrirAlfaBetaEMarcarWo("alfa");

    // Não há jogo lançado para "continuar valendo": nada a perguntar.
    expect(textoDaPergunta(confirmar)).not.toMatch(/continua valendo/);
    const serie = atual().seriesMatches[0];
    expect(serie.walkoverWinnerTeamId).toBe("alfa");
    expect(serie.games).toHaveLength(0);
    expect(jogosDeWalkoverDaSerie(serie, atual()).map((j) => j.gameIndex)).toEqual([1, 2]);
    expect(auditarSerie(serie, atual()).bloqueios).toEqual([]);
    expect(validar(applyAutoGameMvpsToDataset(atual())).success).toBe(true);
    expect(screen.getByText(/O jogo em branco \(sem vencedor nem K\/D\/A\) é descartado/)).toBeTruthy();
  });

  it("jogo lançado + jogo em branco: a pergunta conta só o lançado e avisa do descarte; o lançado fica", () => {
    const confirmar = vi.fn(() => true);
    vi.stubGlobal("confirm", confirmar);
    const inicial = cenario();
    const jogo1 = jogo("beta", [...linhasDoTime("alfa", [1, 2, 1]), ...linhasDoTime("beta", [3, 1, 2])]);
    inicial.seriesMatches[0].games = [jogo1, createBlankGame()];
    const { atual } = montar(inicial);

    abrirAlfaBetaEMarcarWo("alfa");

    const pergunta = textoDaPergunta(confirmar);
    expect(pergunta).toMatch(/O jogo já lançado continua valendo/);
    expect(pergunta).toMatch(/placar final ALFA 2 x 1 BETA/);
    expect(pergunta).toMatch(/O jogo em branco \(sem vencedor nem K\/D\/A\) é descartado/);
    const serie = atual().seriesMatches[0];
    expect(serie.games).toEqual([jogo1]);
    expect(jogosDeWalkoverDaSerie(serie, atual()).map((j) => j.gameIndex)).toEqual([2, 3]);
    expect(getSeriesScore(serie, atual())).toMatchObject({ teamAWins: 2, teamBWins: 1 });
    expect(auditarSerie(serie, atual()).bloqueios).toEqual([]);
  });

  it("recusar a pergunta não descarta nada", () => {
    vi.stubGlobal("confirm", vi.fn(() => false));
    const inicial = cenario();
    const jogo1 = jogo("beta", [...linhasDoTime("alfa", [1, 2, 1]), ...linhasDoTime("beta", [3, 1, 2])]);
    inicial.seriesMatches[0].games = [jogo1, createBlankGame()];
    const { atual } = montar(inicial);

    abrirAlfaBetaEMarcarWo("alfa");

    expect(atual().seriesMatches[0].walkoverWinnerTeamId).toBeUndefined();
    expect(atual().seriesMatches[0].games).toHaveLength(2);
  });

  it("jogo sem vencedor mas com K/D/A digitado não é «em branco»: fica (e a pergunta o conta)", () => {
    const confirmar = vi.fn(() => true);
    vi.stubGlobal("confirm", confirmar);
    const inicial = cenario();
    const digitado = { ...jogo("alfa", linhasDoTime("alfa", [1, 0, 0])), winnerTeamId: "" };
    inicial.seriesMatches[0].games = [digitado];
    const { atual } = montar(inicial);

    abrirAlfaBetaEMarcarWo("alfa");

    expect(textoDaPergunta(confirmar)).toMatch(/O jogo já lançado continua valendo/);
    expect(atual().seriesMatches[0].games).toHaveLength(1);
  });
});
