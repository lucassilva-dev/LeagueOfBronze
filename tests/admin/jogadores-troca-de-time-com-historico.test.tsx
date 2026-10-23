// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";

import { AdminPlayersPanel } from "@/components/admin/admin-players-panel";
import { ModoCompacto } from "@/components/admin/responsivo";
import type { MutateDraft } from "@/components/admin/shared";
import type { TournamentDataset } from "@/lib/schema";

import { cenario, id, jogo, linha, linhasDoTime } from "../torneio/_cenario-regra-6";

/**
 * FB-3 no painel de JOGADORES: trocar no campo Time o time de quem JÁ jogou pelo próprio time
 * levaria as linhas sem «Jogou por» junto (a ALFA perde os abates, o time novo ganha). O
 * servidor recusa; a ficha avisa e trava o «Salvar» antes, no monitor e no celular. Quem nunca
 * jogou continua trocando à vontade.
 */

afterEach(cleanup);

/** ALFA x BETA, jogo 1: os 10 titulares de ALFA e BETA têm linha; GAMA e o reserva, não. */
function comHistorico(): TournamentDataset {
  const d = cenario();
  d.seriesMatches[0]!.games = [
    jogo("alfa", [linha(id("alfa", "TOP"), 9, 0, 0), ...linhasDoTime("alfa", [1, 1, 1], ["TOP"]), ...linhasDoTime("beta", [1, 1, 1])]),
  ];
  return d;
}

function montar(inicial: TournamentDataset, compacto = false) {
  let atual = inicial;
  function Harness() {
    const [d, setD] = useState(atual);
    const mutate: MutateDraft = (recipe) =>
      setD((anterior) => {
        const proximo = structuredClone(anterior);
        recipe(proximo);
        atual = proximo;
        return proximo;
      });
    return <AdminPlayersPanel draft={d} mutateDraft={mutate} />;
  }
  render(
    <ModoCompacto ativo={compacto}>
      <Harness />
    </ModoCompacto>,
  );
  return { atual: () => atual };
}

function botao(texto: string | RegExp, raiz: ParentNode = document.body): HTMLButtonElement {
  const bate = (valor: string | null | undefined) =>
    typeof texto === "string" ? (valor ?? "").trim() === texto : texto.test(valor ?? "");
  const achado = [...raiz.querySelectorAll("button")].find((b) => bate(b.textContent) || bate(b.getAttribute("aria-label")));
  if (!achado) throw new Error(`Botão não encontrado: ${String(texto)}`);
  return achado;
}

const abrirNoMonitor = (nick: string) =>
  fireEvent.click([...document.querySelectorAll("button")].find((b) => b.textContent?.includes(nick))!);

const folha = () => document.querySelector<HTMLElement>('[role="dialog"]')!;
const jogador = (d: TournamentDataset, playerId: string) => d.players.find((p) => p.id === playerId)!;

const AVISO =
  /alfaTOP#BR1 tem 1 linha\(s\) de K\/D\/A pelo ALFA sem “Jogou por” — trocar o time aqui levaria esses abates e jogos para GAMA\. Para tirá-lo do time sem mudar a história, use “Substituir de vez”; se ele só cobriu uma vaga, deixe o time como está e marque “Jogou por”/;

describe("trocar pelo campo Time o time de quem já jogou", () => {
  it("monitor: a ficha avisa e o «Salvar no rascunho» trava — o rascunho não muda", () => {
    const { atual } = montar(comHistorico());
    abrirNoMonitor("alfaTOP#BR1");
    fireEvent.change(screen.getByLabelText("Time"), { target: { value: "gama" } });

    expect(screen.getByText(AVISO)).toBeTruthy();
    expect(screen.getByText(/Ele já jogou pelo ALFA: as linhas sem “Jogou por” contam pelo time do jogador/)).toBeTruthy();
    const salvar = botao("Salvar no rascunho");
    expect(salvar.disabled).toBe(true);
    fireEvent.click(salvar);
    expect(jogador(atual(), id("alfa", "TOP")).teamId).toBe("alfa");
  });

  it("voltar para o time dele destrava", () => {
    montar(comHistorico());
    abrirNoMonitor("alfaTOP#BR1");
    fireEvent.change(screen.getByLabelText("Time"), { target: { value: "gama" } });
    fireEvent.change(screen.getByLabelText("Time"), { target: { value: "alfa" } });

    expect(screen.queryByText(AVISO)).toBeNull();
  });

  it("quem nunca jogou continua trocando de time livremente", () => {
    const { atual } = montar(comHistorico());
    abrirNoMonitor("gamaTOP#BR1");
    fireEvent.change(screen.getByLabelText("Time"), { target: { value: "alfa" } });

    const salvar = botao("Salvar no rascunho");
    expect(salvar.disabled).toBe(false);
    fireEvent.click(salvar);
    expect(jogador(atual(), id("gama", "TOP")).teamId).toBe("alfa");
  });

  it("celular: a mesma trava dentro da folha", () => {
    const { atual } = montar(comHistorico(), true);
    fireEvent.click(botao("Editar alfaTOP#BR1"));
    fireEvent.change(within(folha()).getByLabelText("Time"), { target: { value: "gama" } });

    expect(within(folha()).getByText(AVISO)).toBeTruthy();
    expect(botao("Salvar no rascunho", folha()).disabled).toBe(true);
    expect(jogador(atual(), id("alfa", "TOP")).teamId).toBe("alfa");
  });
});
