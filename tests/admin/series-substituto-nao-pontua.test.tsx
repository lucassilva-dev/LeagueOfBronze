// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AdminSeriesPanel, auditarSerie } from "@/components/admin/admin-series-panel";
import { ModoCompacto } from "@/components/admin/responsivo";
import type { MutateDraft } from "@/components/admin/shared";
import type { SeriesGame, TournamentDataset } from "@/lib/schema";
import { applyAutoGameMvpsToDataset, calculatePlayerAggregates, getGameTeamKills } from "@/lib/tournament";

import { cenario, id, jogo, linhasDoTime, validar } from "../torneio/_cenario-regra-6";

/**
 * O painel de séries com o substituto que NÃO pontua (14/11/2026).
 *
 * - "Convidado (não cadastrado, não pontua)…" no select de jogador da linha: a linha ganha um id
 *   próprio, o nome de quem jogou e o "Jogou por" obrigatório — sem nome ou sem lado, trava
 *   (o servidor recusa).
 * - "Não pontua" na linha de quem entra como substituto: o avulso e quem já tinha saído do time
 *   quando a série aconteceu (o IronClaw, ex-RX, na 4a-jogo-04).
 */

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const servidorAceita = (d: TournamentDataset) => validar(applyAutoGameMvpsToDataset(d)).success;

function comJogos(jogos: SeriesGame[], ajuste?: (d: TournamentDataset) => void) {
  const d = cenario();
  d.seriesMatches[0]!.games = jogos;
  ajuste?.(d);
  return d;
}

function montar(inicial: TournamentDataset, { compacto = false } = {}) {
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
        <AdminSeriesPanel draft={d} mutateDraft={mutate} aplicarDoServidor={mutate} onVersaoDoServidor={() => {}} />
      </ModoCompacto>
    );
  }
  render(<Harness />);
  return { atual: () => atual };
}

function abrirAlfaBeta() {
  const alvo = [...document.querySelectorAll("button")].find(
    (b) => b.textContent?.includes("ALFA") && b.textContent?.includes("BETA"),
  );
  fireEvent.click(alvo!);
}

function botao(texto: RegExp): HTMLButtonElement {
  const achado = [...document.querySelectorAll("button")].find(
    (b) => texto.test(b.textContent ?? "") || texto.test(b.getAttribute("aria-label") ?? ""),
  );
  if (!achado) throw new Error(`Botão não encontrado: ${String(texto)}`);
  return achado;
}

/** Jogo 1 da s1 com as 10 linhas: a MID da ALFA é a linha 3. */
const jogoCompleto = () => jogo("alfa", [...linhasDoTime("alfa", [2, 1, 3]), ...linhasDoTime("beta", [1, 3, 1])]);
const linhaDaMid = (d: TournamentDataset) => d.seriesMatches[0]!.games[0]!.statsByPlayer[2]!;

describe("convidado no painel (monitor)", () => {
  it("vira convidado pelo select, trava sem nome e sem lado, e salva sem pontuar", () => {
    const { atual } = montar(comJogos([jogoCompleto()]));
    abrirAlfaBeta();

    fireEvent.change(screen.getByLabelText("Jogador da linha 3"), { target: { value: "__convidado__" } });
    expect(linhaDaMid(atual())).toMatchObject({ playerId: "convidado-1", convidado: "", kills: 2 });
    // A ALFA ficou com 4 linhas: o lado que falta já vem escolhido.
    expect(linhaDaMid(atual()).teamId).toBe("alfa");
    expect(auditarSerie(atual().seriesMatches[0]!, atual()).bloqueios.join(" ")).toMatch(/Convidado: falta o nome de quem jogou/);
    expect(servidorAceita(atual())).toBe(false);

    fireEvent.change(screen.getByLabelText("Nome do convidado da linha 3"), { target: { value: "3Perna" } });
    expect(auditarSerie(atual().seriesMatches[0]!, atual()).bloqueios).toEqual([]);
    expect(servidorAceita(atual())).toBe(true);
    expect(screen.getAllByText("SUB · NÃO PONTUA").length).toBeGreaterThan(0);

    // Soma para o time, e não aparece para jogador nenhum.
    const d = atual();
    expect(getGameTeamKills(d.seriesMatches[0]!.games[0]!, d.seriesMatches[0]!, d)).toEqual({ teamAKills: 10, teamBKills: 5 });
    expect(calculatePlayerAggregates(d).some((p) => p.playerId === "convidado-1")).toBe(false);
    expect(calculatePlayerAggregates(d).find((p) => p.playerId === id("alfa", "MID"))?.gamesPlayed).toBe(0);
  });

  it("convidado sem lado trava, dizendo o que fazer", () => {
    const d = comJogos([jogoCompleto()], (x) => {
      Object.assign(linhaDaMid(x), { playerId: "convidado-1", convidado: "3Perna" });
    });
    expect(auditarSerie(d.seriesMatches[0]!, d).bloqueios.join(" ")).toMatch(
      /Convidado: escolha em “Jogou por” o time que ele cobriu neste jogo/,
    );
    expect(servidorAceita(d)).toBe(false);
  });

  it("voltar a um jogador cadastrado tira o convidado da linha", () => {
    const { atual } = montar(
      comJogos([jogoCompleto()], (x) => {
        Object.assign(linhaDaMid(x), { playerId: "convidado-1", convidado: "3Perna", teamId: "alfa" });
      }),
    );
    abrirAlfaBeta();
    fireEvent.change(screen.getByLabelText("Jogador da linha 3"), { target: { value: id("alfa", "MID") } });
    const linhaNova = linhaDaMid(atual());
    expect(linhaNova.playerId).toBe(id("alfa", "MID"));
    expect("convidado" in linhaNova).toBe(false);
    expect("teamId" in linhaNova).toBe(false);
  });
});

describe("“Não pontua” na linha do substituto cadastrado", () => {
  /** A MID da ALFA saiu do time em 10/11 e voltou para cobrir a vaga na série de 20/11. */
  const saiuAntes = (x: TournamentDataset) => {
    x.players.find((p) => p.id === id("alfa", "MID"))!.saiuEm = "2026-11-10T00:00:00.000Z";
  };

  it("aparece para quem já tinha saído do time e grava a marca na linha", () => {
    const { atual } = montar(comJogos([jogoCompleto()], saiuAntes));
    abrirAlfaBeta();
    const caixa = screen.getByLabelText("Não pontua") as HTMLInputElement;
    expect(caixa.checked).toBe(false);

    fireEvent.click(caixa);
    expect(linhaDaMid(atual()).naoPontua).toBe(true);
    expect(servidorAceita(atual())).toBe(true);
    expect(calculatePlayerAggregates(atual()).find((p) => p.playerId === id("alfa", "MID"))?.gamesPlayed).toBe(0);

    fireEvent.click(screen.getByLabelText("Não pontua"));
    expect("naoPontua" in linhaDaMid(atual())).toBe(false);
  });

  it("não aparece na linha do titular comum", () => {
    montar(comJogos([jogoCompleto()]));
    abrirAlfaBeta();
    expect(screen.queryByLabelText("Não pontua")).toBeNull();
  });

  it("trocar o jogador da linha não leva a marca escondida para o novo", () => {
    const { atual } = montar(
      comJogos([jogoCompleto()], (x) => {
        saiuAntes(x);
        linhaDaMid(x).naoPontua = true;
      }),
    );
    abrirAlfaBeta();
    fireEvent.change(screen.getByLabelText("Jogador da linha 3"), { target: { value: id("gama", "MID") } });
    expect("naoPontua" in linhaDaMid(atual())).toBe(false);
  });
});

describe("no celular", () => {
  it("a folha da série tem a opção de convidado e o campo do nome", () => {
    const { atual } = montar(comJogos([jogoCompleto()]), { compacto: true });
    fireEvent.click(botao(/Abrir a série ALFA x BETA/));
    const folha = document.querySelector<HTMLElement>('[role="dialog"]')!;

    fireEvent.change(within(folha).getByLabelText("Jogador da linha 3"), { target: { value: "__convidado__" } });
    fireEvent.change(within(folha).getByLabelText("Nome do convidado da linha 3"), { target: { value: "Zarakai" } });
    expect(linhaDaMid(atual())).toMatchObject({ convidado: "Zarakai", teamId: "alfa" });
    expect(servidorAceita(atual())).toBe(true);
  });
});
