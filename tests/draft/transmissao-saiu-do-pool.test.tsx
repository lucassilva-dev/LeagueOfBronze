// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MESSAGES } from "@/lib/i18n/messages";

/**
 * C1 (decisão de 2026-10-22): a transmissão mostra quem saiu do pool depois do sorteio — no
 * fim do pool, riscado, com «SAIU DO DRAFT» (em inglês, «LEFT THE DRAFT») e sem o porquê. E
 * o trilho da ordem segue a ordem do servidor: quando falta jogador, a escolha cortada pode
 * não ser a última da serpentina.
 */

const { default: Transmissao } = await import("@/components/draft/transmissao");

function resposta(over: Record<string, unknown> = {}) {
  const times = [
    { id: "t1", nome: "CHAMA", cor: "#ef7d34", capitaoRiotId: "Cap1#BR1", gasto: 5, vagas: 2 },
    { id: "t2", nome: "ÁUREA", cor: "#e0b13c", capitaoRiotId: "Cap2#BR1", gasto: 5, vagas: 2 },
  ];
  return {
    draft: {
      revisao: 10,
      fase: "rodando",
      times,
      elencos: {
        t1: [{ riotId: "Cap1#BR1", pontos: 5, rota1: "MID", rota2: "TOP", elo: "Prata", capitao: true }],
        t2: [{ riotId: "Cap2#BR1", pontos: 5, rota1: "MID", rota2: "TOP", elo: "Prata", capitao: true }],
      },
      disponiveis: [{ id: "p1", riotId: "Fica#BR1", pontos: 3, rota1: "SUP", rota2: "ADC", elo: "Prata" }],
      saiuDoPool: [{ riotId: "Saiu#BR1", pontos: 2, rota1: "ADC", rota2: "SUP", elo: "Prata" }],
      escolhiveis: ["p1"],
      escolhaAtual: 0,
      totalEscolhas: 3,
      // A serpentina de 2 times seria t1, t2, t2, t1; a escolha cortada foi a 2ª de t2.
      ordem: ["t1", "t2", "t1"],
      timeDaVezId: "t1",
      prazoISO: new Date(Date.now() + 60_000).toISOString(),
      motivoDaPausa: null,
      sorteioId: "S1",
      orcamentoPorTime: 10,
      jogadoresPorTime: 3,
      historico: [],
      ...over,
    },
    souCapitaoDe: null,
    agoraServidorISO: new Date().toISOString(),
  };
}

let corpo: unknown = null;

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => corpo }) as unknown as Response));
  vi.stubGlobal("AbortSignal", { ...AbortSignal, timeout: () => undefined });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("a transmissão e quem saiu do pool", () => {
  it("o cartão de quem saiu aparece no fim do pool, riscado e com a etiqueta (pt)", async () => {
    corpo = resposta();
    render(<Transmissao t={MESSAGES.pt.draft} />);
    const etiqueta = await screen.findByText(MESSAGES.pt.draft.saiuDoDraft);
    const cartao = etiqueta.closest("[data-saiu-do-draft]") as HTMLElement;
    expect(cartao).toBeTruthy();
    expect(cartao.textContent).toContain("Saiu#BR1");
    expect(cartao.getAttribute("title")).toBe(MESSAGES.pt.draft.saiuDoDraftNota);
    const nome = [...cartao.querySelectorAll("span")].find((s) => s.textContent === "Saiu#BR1")!;
    expect(nome.style.textDecoration).toBe("line-through");
    // Sem animar opacidade nem filtro (a armadilha que já apagou o site).
    expect(cartao.style.opacity).toBe("");
    expect(cartao.style.filter).toBe("");
    expect(cartao.style.animation).toBe("");
    // Nada do porquê na tela pública.
    expect(document.body.textContent).not.toMatch(/desist|recusad|exclu/i);
  });

  it("em inglês, «LEFT THE DRAFT»", async () => {
    corpo = resposta();
    render(<Transmissao t={MESSAGES.en.draft} />);
    expect(await screen.findByText("LEFT THE DRAFT")).toBeTruthy();
  });

  it("servidor antigo (sem o campo): nada de cartão a mais", async () => {
    corpo = resposta({ saiuDoPool: undefined });
    render(<Transmissao t={MESSAGES.pt.draft} />);
    await screen.findAllByText("CHAMA");
    expect(document.querySelector("[data-saiu-do-draft]")).toBeNull();
  });

  it("o trilho segue a ordem do servidor: a 3ª escolha é de CHAMA, não de ÁUREA", async () => {
    corpo = resposta();
    render(<Transmissao t={MESSAGES.pt.draft} />);
    await screen.findAllByText("CHAMA");
    const trilho = document.querySelector<HTMLElement>(".lob-scroll")!;
    const chips = [...trilho.querySelectorAll<HTMLElement>(":scope > span")];
    expect(chips.map((c) => c.textContent)).toEqual(["1", "2", "3"]);
    // Chip futuro: a cor do texto é a do time (CHAMA = #ef7d34; ÁUREA = #e0b13c).
    expect(chips[2]!.style.color).toBe("rgb(239, 125, 52)");
    expect(chips[1]!.style.color).toBe("rgb(224, 177, 60)");
  });
});
