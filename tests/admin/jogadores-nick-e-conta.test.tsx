// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";

import { AdminPlayersPanel } from "@/components/admin/admin-players-panel";
import type { MutateDraft } from "@/components/admin/shared";
import type { TournamentDataset } from "@/lib/schema";

import { cenario, id } from "../torneio/_cenario-regra-6";

/**
 * O jogador ligado à conta da Riot (`puuid`): o robô grava nele o nick de hoje. Editar a ficha
 * à mão mantém o vínculo — menos quando o NICK muda: aí a conta pode ser de outra pessoa, e o
 * vínculo sai para o robô ligar de novo pelo nick digitado.
 */

afterEach(cleanup);

function montar(inicial: TournamentDataset) {
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
  render(<Harness />);
  return { atual: () => atual };
}

const salvar = () =>
  fireEvent.click([...document.querySelectorAll("button")].find((b) => b.textContent?.trim() === "Salvar no rascunho")!);
const abrir = (nick: string) => fireEvent.click([...document.querySelectorAll("button")].find((b) => b.textContent?.includes(nick))!);

function comConta(): TournamentDataset {
  const d = cenario();
  d.players.find((p) => p.id === id("gama", "TOP"))!.puuid = "conta-gama-top";
  return d;
}

describe("o vínculo com a conta no painel de Jogadores", () => {
  it("editar outra coisa (o elo) mantém a conta ligada", () => {
    const { atual } = montar(comConta());
    abrir("gamaTOP#BR1");
    const elo = screen.getByLabelText("Elo") as HTMLSelectElement;
    const ouro = [...elo.options].find((o) => o.text === "Ouro")!;
    fireEvent.change(elo, { target: { value: ouro.value } });
    salvar();
    const depois = atual().players.find((p) => p.id === id("gama", "TOP"))!;
    expect(depois.elo).toBe(ouro.value);
    expect(depois.puuid).toBe("conta-gama-top");
  });

  it("trocar o nick à mão desfaz o vínculo (o robô liga de novo pelo nick novo)", () => {
    const { atual } = montar(comConta());
    abrir("gamaTOP#BR1");
    fireEvent.change(screen.getByPlaceholderText("Nick do jogo"), { target: { value: "Outra Pessoa#BR1" } });
    salvar();
    const depois = atual().players.find((p) => p.id === id("gama", "TOP"))!;
    expect(depois.nick).toBe("Outra Pessoa#BR1");
    expect(depois.puuid).toBeUndefined();
  });
});

describe("a conta ligada com a ficha aberta", () => {
  it("o robô ligou a conta DEPOIS de a ficha abrir: salvar a ficha não apaga o vínculo", () => {
    let atual = cenario();
    let redesenhar: (d: TournamentDataset) => void = () => {};
    const mutar: MutateDraft = (recipe) => {
      const proximo = structuredClone(atual);
      recipe(proximo);
      atual = proximo;
      redesenhar(proximo);
    };
    const { rerender } = render(<AdminPlayersPanel draft={atual} mutateDraft={mutar} />);
    redesenhar = (d) => rerender(<AdminPlayersPanel draft={d} mutateDraft={mutar} />);

    abrir("gamaTOP#BR1");
    // Chega pelo rascunho (Recarregar, rebase do 409): só o puuid muda.
    act(() => mutar((d) => void (d.players.find((p) => p.id === id("gama", "TOP"))!.puuid = "ligada-depois")));
    const elo = screen.getByLabelText("Elo") as HTMLSelectElement;
    fireEvent.change(elo, { target: { value: [...elo.options].find((o) => o.text === "Ouro")!.value } });
    salvar();
    expect(atual.players.find((p) => p.id === id("gama", "TOP"))!.puuid).toBe("ligada-depois");
  });
});
