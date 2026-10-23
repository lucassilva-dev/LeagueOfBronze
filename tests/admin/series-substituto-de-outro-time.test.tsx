// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";

import { AdminSeriesPanel, auditarSerie } from "@/components/admin/admin-series-panel";
import type { MutateDraft } from "@/components/admin/shared";
import type { SeriesGame, TournamentDataset } from "@/lib/schema";
import { applyAutoGameMvpsToDataset, problemasDeLinhaSemTime } from "@/lib/tournament";

import { cenario, id, jogo, linha, linhasDoTime, validar } from "../torneio/_cenario-regra-6";

/**
 * Regra 6 no painel de SÉRIES — o substituto avulso que é TITULAR DE OUTRO TIME.
 *
 * A organização escolhe a TOP da GAMA no grupo «Outros times (substituto)» para cobrir a TOP
 * da ALFA em ALFA x BETA. Sem "Jogou por", a linha some das duas colunas da partida pública e
 * os abates vão para a GAMA. Antes o painel só AVISAVA («forasteira») e o servidor gravava;
 * agora o servidor recusa a linha NOVA (`problemasDeLinhaSemTime`), e o painel trava igual —
 * com o mesmo texto do reserva sem "Jogou por". A linha JÁ GRAVADA assim (quem trocou de time
 * depois de jogar) continua sendo só aviso.
 *
 * E o painel já preenche o "Jogou por" quando só um dos dois times está com menos de 5 linhas
 * no jogo: é a vaga que o substituto cobriu.
 */

afterEach(cleanup);

const gamaTop = id("gama", "TOP");

/** ALFA x BETA, jogo 1, a TOP da GAMA no lugar da TOP da ALFA, sem "Jogou por". */
function comSubstitutoSemTime(): TournamentDataset {
  const d = cenario();
  d.seriesMatches[0].games = [
    jogo("alfa", [
      ...linhasDoTime("alfa", [2, 1, 3], ["TOP"]),
      linha(gamaTop, 7, 0, 5, { champion: "Garen" }),
      ...linhasDoTime("beta", [1, 2, 1]),
    ]),
  ];
  return d;
}

describe("auditoria: linha nova de titular de outro time sem «Jogou por»", () => {
  it("trava com o motivo e o caminho — a mesma recusa do servidor", () => {
    const d = comSubstitutoSemTime();
    const serie = d.seriesMatches[0];
    const gravadaSemOJogo = { ...serie, games: [] };

    const auditoria = auditarSerie(serie, d, gravadaSemOJogo);
    expect(auditoria.bloqueios.join(" ")).toMatch(
      /Jogo 1, linha 5: gamaTOP#BR1 é de GAMA, que não disputa esta série — escolha em “Jogou por” o time que ele cobriu \(ALFA ou BETA\)/,
    );
    expect(auditoria.jogosComProblema).toEqual([0]);
    // O servidor recusa a mesma linha.
    expect(problemasDeLinhaSemTime(applyAutoGameMvpsToDataset(d), { seriesMatches: [gravadaSemOJogo] })).toHaveLength(1);
  });

  it("série que ainda não foi salva: também trava", () => {
    const d = comSubstitutoSemTime();
    expect(auditarSerie(d.seriesMatches[0], d).bloqueios.join(" ")).toMatch(/Jogou por/);
  });

  it("a mesma linha JÁ GRAVADA (quem trocou de time depois): só aviso, e o servidor aceita", () => {
    const d = comSubstitutoSemTime();
    const serie = d.seriesMatches[0];

    const auditoria = auditarSerie(serie, d, structuredClone(serie));
    expect(auditoria.bloqueios).toEqual([]);
    expect(auditoria.avisos.join(" ")).toMatch(/gamaTOP#BR1 hoje está em GAMA/);
    expect(problemasDeLinhaSemTime(applyAutoGameMvpsToDataset(d), { seriesMatches: [structuredClone(serie)] })).toEqual([]);
  });

  it("com «Jogou por» num dos dois times: nada trava, e o servidor aceita", () => {
    const d = comSubstitutoSemTime();
    d.seriesMatches[0].games[0].statsByPlayer.find((l) => l.playerId === gamaTop)!.teamId = "alfa";

    expect(auditarSerie(d.seriesMatches[0], d, { ...d.seriesMatches[0], games: [] }).bloqueios).toEqual([]);
    expect(validar(applyAutoGameMvpsToDataset(d)).success).toBe(true);
    expect(problemasDeLinhaSemTime(applyAutoGameMvpsToDataset(d), null)).toEqual([]);
  });
});

// ---------------------------------------------------------------- painel

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
    return (
      <AdminSeriesPanel
        draft={d}
        mutateDraft={mutate}
        aplicarDoServidor={mutate}
        onVersaoDoServidor={() => {}}
        seriesGravadas={inicial.seriesMatches.map((serie) => ({ ...serie, games: [] }))}
      />
    );
  }
  render(<Harness />);
  return { atual: () => atual };
}

function abrirAlfaBeta() {
  fireEvent.click(
    [...document.querySelectorAll("button")].find((b) => b.textContent?.includes("ALFA") && b.textContent?.includes("BETA"))!,
  );
}

/** O jogo com uma linha em branco no fim, para escolher o substituto. */
function jogoComLinhaEmBranco(linhas: SeriesGame["statsByPlayer"]): SeriesGame {
  return jogo("alfa", [...linhas, linha("", 0, 0, 0)]);
}

describe("painel: escolher o titular de outro time como substituto", () => {
  it("só a ALFA está com 4: o «Jogou por» já vem com a ALFA e nada trava", () => {
    const inicial = cenario();
    inicial.seriesMatches[0].games = [
      jogoComLinhaEmBranco([...linhasDoTime("alfa", [2, 1, 3], ["TOP"]), ...linhasDoTime("beta", [1, 2, 1])]),
    ];
    const { atual } = montar(inicial);
    abrirAlfaBeta();

    fireEvent.change(screen.getByLabelText("Jogador da linha 10"), { target: { value: gamaTop } });

    const nova = atual().seriesMatches[0].games[0].statsByPlayer[9];
    expect(nova).toMatchObject({ playerId: gamaTop, teamId: "alfa" });
    expect((screen.getByLabelText("Time pelo qual a linha 10 jogou") as HTMLSelectElement).value).toBe("alfa");
    expect(screen.queryByText(/que não disputa esta série — escolha em “Jogou por”/)).toBeNull();
    expect(problemasDeLinhaSemTime(applyAutoGameMvpsToDataset(atual()), null)).toEqual([]);
  });

  it("os dois times incompletos: sem palpite — a linha trava até escolher, e a opção vazia não diz «Pelo próprio time»", () => {
    const inicial = cenario();
    inicial.seriesMatches[0].games = [
      jogoComLinhaEmBranco([...linhasDoTime("alfa", [2, 1, 3], ["TOP"]), ...linhasDoTime("beta", [1, 2, 1], ["TOP"])]),
    ];
    const { atual } = montar(inicial);
    abrirAlfaBeta();

    fireEvent.change(screen.getByLabelText("Jogador da linha 9"), { target: { value: gamaTop } });

    expect("teamId" in atual().seriesMatches[0].games[0].statsByPlayer[8]).toBe(false);
    expect(screen.getAllByText(/gamaTOP#BR1 é de GAMA, que não disputa esta série — escolha em “Jogou por”/).length).toBeGreaterThan(0);
    const jogouPor = screen.getByLabelText("Time pelo qual a linha 9 jogou") as HTMLSelectElement;
    expect(jogouPor.options[0]!.text).toBe("Escolha o time…");

    fireEvent.change(jogouPor, { target: { value: "beta" } });
    expect(atual().seriesMatches[0].games[0].statsByPlayer[8]).toMatchObject({ playerId: gamaTop, teamId: "beta" });
    expect(screen.queryByText(/que não disputa esta série — escolha em “Jogou por”/)).toBeNull();
  });
});
