// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";

import { AdminPlayersPanel } from "@/components/admin/admin-players-panel";
import { ModoCompacto } from "@/components/admin/responsivo";
import type { MutateDraft } from "@/components/admin/shared";
import type { TournamentDataset } from "@/lib/schema";
import { elencoAtivo, estaNoElenco, reservasDoDataset, substituirDeVez } from "@/lib/tournament";

import { cenario, id, validar } from "../torneio/_cenario-regra-6";

/**
 * Painel de JOGADORES, regra 6 — dois caminhos que faltavam:
 *
 * 1. Quem SAIU de vez e muda de Time (volta à reserva ou vai para outro elenco) deixa de ter
 *    saído. Antes o `saiuEm` antigo ficava: devolvida à reserva, a pessoa aparecia como
 *    herdeira em «Substituir de vez» e, ao herdar uma vaga, recebia o time e continuava FORA
 *    do elenco — o time com 4 no site, sem aviso.
 *
 * 2. A vaga aberta do draft (C1, um time que termina com 4 de 5): dar o time a um reserva SEM
 *    titular a substituir. É o próprio campo Time da ficha do reserva — com confirmação,
 *    porque mexe no elenco público (contagem de 5, PTS, Multi OP.GG).
 */

afterEach(cleanup);

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

const jogador = (d: TournamentDataset, playerId: string) => d.players.find((p) => p.id === playerId)!;

const alfaTop = id("alfa", "TOP");
const betaTop = id("beta", "TOP");

describe("quem saiu de vez e muda de Time deixa de ter saído", () => {
  it("de volta à reserva: sem o `saiuEm`, e ao herdar a vaga da BETA entra no elenco", () => {
    // A TOP da ALFA sai de vez (sem ter jogado) e o reserva r1 herda a vaga.
    const inicial = substituirDeVez(cenario(), alfaTop, "r1", "2026-11-01T12:00:00.000Z");
    const { atual } = montar(inicial);

    abrirNoMonitor("alfaTOP#BR1");
    expect(screen.getByText(/^Saiu do time em /)).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Time"), { target: { value: "__reserva__" } });
    expect(screen.queryByText(/^Saiu do time em /)).toBeNull();
    fireEvent.click(botao("Salvar no rascunho"));

    const depois = jogador(atual(), alfaTop);
    expect(depois.reserva).toBe(true);
    expect("saiuEm" in depois).toBe(false);
    expect(validar(atual()).success).toBe(true);
    expect(reservasDoDataset(atual()).map((p) => p.id)).toContain(alfaTop);

    const herdou = substituirDeVez(atual(), betaTop, alfaTop, "2026-11-02T12:00:00.000Z");
    expect(estaNoElenco(jogador(herdou, alfaTop))).toBe(true);
    expect(elencoAtivo(herdou, "beta")).toHaveLength(5);
  });

  it("para outro elenco: entra no time novo de verdade", () => {
    const inicial = substituirDeVez(cenario(), alfaTop, "r1", "2026-11-01T12:00:00.000Z");
    const { atual } = montar(inicial);

    abrirNoMonitor("alfaTOP#BR1");
    fireEvent.change(screen.getByLabelText("Time"), { target: { value: "gama" } });
    fireEvent.click(botao("Salvar no rascunho"));

    const depois = jogador(atual(), alfaTop);
    expect(depois.teamId).toBe("gama");
    expect("saiuEm" in depois).toBe(false);
    expect(estaNoElenco(depois)).toBe(true);
    expect(validar(atual()).success).toBe(true);
  });

  it("mexer em outro campo de quem saiu NÃO apaga a saída", () => {
    const inicial = substituirDeVez(cenario(), alfaTop, "r1", "2026-11-01T12:00:00.000Z");
    const { atual } = montar(inicial);

    abrirNoMonitor("alfaTOP#BR1");
    fireEvent.change(screen.getByPlaceholderText("Nick do jogo"), { target: { value: "alfaTOP2#BR1" } });
    fireEvent.click(botao("Salvar no rascunho"));

    expect(jogador(atual(), alfaTop)).toMatchObject({ nick: "alfaTOP2#BR1", saiuEm: "2026-11-01T12:00:00.000Z" });
  });
});

/** O time ALFA com 4: a TOP saiu do pool do draft (nunca jogou e não está no cadastro). */
function alfaComVagaAberta(): TournamentDataset {
  const d = cenario();
  d.players = d.players.filter((p) => p.id !== alfaTop);
  return d;
}

describe("vaga aberta (C1): dar o time a um reserva, sem titular a substituir", () => {
  it("pede confirmação antes; confirmado, o reserva entra no elenco e o time fica com 5", () => {
    const { atual } = montar(alfaComVagaAberta());
    abrirNoMonitor("Reserva#BR1");
    fireEvent.change(screen.getByLabelText("Time"), { target: { value: "alfa" } });
    fireEvent.click(botao("Salvar no rascunho"));

    // Ainda nada mudou no rascunho: só a pergunta.
    expect(jogador(atual(), "r1").reserva).toBe(true);
    expect(screen.getByText("Dar a vaga de ALFA a Reserva#BR1?")).toBeTruthy();
    expect(screen.getByText(/hoje com 4 de 5, fica com 5/)).toBeTruthy();

    fireEvent.click(botao("Dar a vaga"));

    const r1 = jogador(atual(), "r1");
    expect(r1.teamId).toBe("alfa");
    expect("reserva" in r1).toBe(false);
    expect(validar(atual()).success).toBe(true);
    expect(elencoAtivo(atual(), "alfa")).toHaveLength(5);
    expect(screen.queryByText("Dar a vaga de ALFA a Reserva#BR1?")).toBeNull();
  });

  it("cancelar não muda nada", () => {
    const { atual } = montar(alfaComVagaAberta());
    abrirNoMonitor("Reserva#BR1");
    fireEvent.change(screen.getByLabelText("Time"), { target: { value: "alfa" } });
    fireEvent.click(botao("Salvar no rascunho"));
    fireEvent.click(botao("Cancelar"));

    expect(jogador(atual(), "r1").reserva).toBe(true);
    expect(screen.queryByText("Dar a vaga de ALFA a Reserva#BR1?")).toBeNull();
  });

  it("time já completo: a confirmação aponta o «Substituir de vez»", () => {
    montar(cenario());
    abrirNoMonitor("Reserva#BR1");
    fireEvent.change(screen.getByLabelText("Time"), { target: { value: "beta" } });
    fireEvent.click(botao("Salvar no rascunho"));

    expect(screen.getByText(/hoje com 5 de 5, fica com 6/)).toBeTruthy();
    expect(screen.getByText(/BETA já está completo: se ele entra no lugar de alguém, use “Substituir de\s+vez”/)).toBeTruthy();
  });

  it("no celular, o «Salvar» do rodapé da folha também pergunta antes", () => {
    const { atual } = montar(alfaComVagaAberta(), true);
    fireEvent.click(botao("Editar Reserva#BR1"));
    const folha = document.querySelector<HTMLElement>('[role="dialog"]')!;
    fireEvent.change(within(folha).getByLabelText("Time"), { target: { value: "alfa" } });
    fireEvent.click(botao("Salvar no rascunho", folha));

    expect(jogador(atual(), "r1").reserva).toBe(true);
    expect(within(folha).getByText("Dar a vaga de ALFA a Reserva#BR1?")).toBeTruthy();
    fireEvent.click(botao("Dar a vaga", folha));
    expect(jogador(atual(), "r1").teamId).toBe("alfa");
  });

  it("criar um jogador novo já com time não pede a confirmação (só o reserva que recebe o time)", () => {
    const { atual } = montar(alfaComVagaAberta());
    fireEvent.click(botao("Novo jogador"));
    fireEvent.change(screen.getByPlaceholderText("Nick do jogo"), { target: { value: "Novo#BR1" } });
    fireEvent.change(screen.getByPlaceholderText("nick-do-jogador"), { target: { value: "novo" } });
    fireEvent.change(screen.getByLabelText("Time"), { target: { value: "alfa" } });
    const selects = [...document.querySelectorAll("select")];
    fireEvent.change(selects.find((s) => [...s.options].some((o) => o.value === "TOP") && s.value === "")!, {
      target: { value: "TOP" },
    });
    fireEvent.change(selects.find((s) => [...s.options].some((o) => o.value === "PRATA"))!, { target: { value: "PRATA" } });
    fireEvent.click(botao("Salvar no rascunho"));

    expect(screen.queryByText(/^Dar a vaga de/)).toBeNull();
    expect(atual().players.find((p) => p.nick === "Novo#BR1")).toMatchObject({ teamId: "alfa" });
  });
});
