// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import PainelCapitao from "@/components/draft/painel-capitao";
import { MESSAGES } from "@/lib/i18n/messages";

/**
 * O capitão SEM PREÇO nas telas públicas do draft (/draft e /capitao), decisão de 23/10/2026:
 * o capitão entra com 0 ponto e as telas mostram a tag CAPITÃO no lugar do preço — e não um
 * «0» que pareceria jogador de graça. O gasto do time é só o das escolhas (30 livres no início).
 * Com o capitão pago (draft antigo, ou `capitao_com_preco`), o preço dele continua lá.
 */

const { default: Transmissao } = await import("@/components/draft/transmissao");

function draft(capitaoGratis: boolean) {
  const precoDoCapitao = capitaoGratis ? 0 : 13;
  return {
    revisao: 12,
    fase: "rodando",
    times: [
      { id: "t1", nome: "CHAMA", cor: "#ef7d34", capitaoRiotId: "Cap1#BR1", gasto: precoDoCapitao, vagas: 4 },
      { id: "t2", nome: "FORJA", cor: "#e0b13c", capitaoRiotId: "Cap2#BR1", gasto: capitaoGratis ? 0 : 9, vagas: 4 },
    ],
    elencos: {
      t1: [{ riotId: "Cap1#BR1", pontos: precoDoCapitao, rota1: "MID", rota2: "TOP", elo: "Mestre", classe: "Mestre · 100–199 PDL", capitao: true }],
      t2: [{ riotId: "Cap2#BR1", pontos: capitaoGratis ? 0 : 9, rota1: "TOP", rota2: "MID", elo: "Diamante", classe: "Diamante IV", capitao: true }],
    },
    disponiveis: [
      { id: "p1", riotId: "OuroCaro#BR1", pontos: 4, rota1: "ADC", rota2: "SUP", elo: "Ouro", classe: "Ouro II" },
      { id: "p2", riotId: "OuroBarato#BR1", pontos: 3, rota1: "SUP", rota2: "ADC", elo: "Ouro", classe: "Ouro IV" },
    ],
    escolhiveis: ["p1", "p2"],
    escolhaAtual: 0,
    totalEscolhas: 8,
    timeDaVezId: "t1",
    prazoISO: new Date(Date.now() + 60_000).toISOString(),
    motivoDaPausa: null,
    sorteioId: "S1",
    orcamentoPorTime: 30,
    jogadoresPorTime: 5,
    historico: [],
    capitaoGratis,
  };
}

function servir(corpo: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify({ agoraServidorISO: new Date().toISOString(), ...(corpo as object) }), { status: 200 })),
  );
  vi.stubGlobal("AbortSignal", { ...AbortSignal, timeout: () => undefined });
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

/** As linhas de elenco da transmissão em que aparece este Riot ID. */
function slotsDe(riotId: string): HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>(".lobd-slot")].filter((s) => s.textContent?.includes(riotId));
}

describe("a transmissão com o capitão sem preço", () => {
  it("a linha do capitão leva a tag CAPITÃO no lugar dos pontos, e o time começa com 30 livres", async () => {
    servir({ draft: draft(true), souCapitaoDe: null });
    render(<Transmissao t={MESSAGES.pt.draft} />);
    await screen.findAllByText("OuroCaro#BR1");
    const slots = slotsDe("Cap1#BR1");
    expect(slots.length).toBeGreaterThan(0);
    for (const slot of slots) {
      const ultimo = slot.lastElementChild;
      expect(ultimo?.textContent).toBe(MESSAGES.pt.draft.capitao);
      expect(slot.textContent).not.toMatch(/\b0$/);
    }
    expect(document.body.textContent).toContain(`30${MESSAGES.pt.draft.pontosLivres} 30`);
  });

  it("capitão pago (draft antigo): o preço dele continua no lugar de sempre", async () => {
    servir({ draft: draft(false), souCapitaoDe: null });
    render(<Transmissao t={MESSAGES.pt.draft} />);
    await screen.findAllByText("OuroCaro#BR1");
    for (const slot of slotsDe("Cap1#BR1")) expect(slot.lastElementChild?.textContent).toBe("13");
  });
});

describe("o painel do capitão com o capitão sem preço", () => {
  /** A linha do meu elenco com este Riot ID. */
  const linhaDoElenco = (riotId: string) =>
    [...document.querySelectorAll<HTMLElement>(".lob-card-2")].find((el) => el.querySelector("strong")?.textContent === riotId);

  it("no meu elenco, a tag de capitão no lugar dos pontos", async () => {
    servir({ draft: draft(true), souCapitaoDe: "t1", logado: true });
    render(<PainelCapitao t={MESSAGES.pt.draft} />);
    await screen.findByText("OuroCaro#BR1");
    const linha = linhaDoElenco("Cap1#BR1");
    expect(linha).toBeTruthy();
    expect(linha!.textContent).toContain(MESSAGES.pt.draft.capitao);
    expect(linha!.textContent).not.toMatch(/\d+\s*pts/);
  });

  it("capitão pago: os pontos dele aparecem", async () => {
    servir({ draft: draft(false), souCapitaoDe: "t1", logado: true });
    render(<PainelCapitao t={MESSAGES.pt.draft} />);
    await screen.findByText("OuroCaro#BR1");
    expect(linhaDoElenco("Cap1#BR1")!.textContent).toMatch(/13\s*pts/);
  });
});
