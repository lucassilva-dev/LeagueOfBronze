// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import PainelCapitao from "@/components/draft/painel-capitao";
import { MESSAGES } from "@/lib/i18n/messages";

/**
 * A classe de preço nas telas públicas do draft (/draft e /capitao).
 *
 * O preço agora é por divisão (lib/draft/precos.ts): na transmissão, dois jogadores "Ouro" a 2
 * e a 3 pontos não tinham nada que explicasse a diferença. O draft montado leva a classe
 * ("Ouro II", "Mestre · 200–299 PDL") em cada jogador, e as telas a mostram no lugar do nome
 * do elo, ao lado do preço. Estado antigo, sem a classe, continua mostrando o elo.
 */

const { default: Transmissao } = await import("@/components/draft/transmissao");

function draft(comClasse: boolean) {
  const classe = (rotulo: string) => (comClasse ? { classe: rotulo } : {});
  return {
    revisao: 12,
    fase: "rodando",
    times: [
      { id: "t1", nome: "CHAMA", cor: "#ef7d34", capitaoRiotId: "Cap1#BR1", gasto: 13, vagas: 4 },
      { id: "t2", nome: "FORJA", cor: "#e0b13c", capitaoRiotId: "Cap2#BR1", gasto: 9, vagas: 4 },
    ],
    elencos: {
      t1: [{ riotId: "Cap1#BR1", pontos: 13, rota1: "MID", rota2: "TOP", elo: "Mestre", ...classe("Mestre · 0–99 PDL"), capitao: true }],
      t2: [{ riotId: "Cap2#BR1", pontos: 9, rota1: "TOP", rota2: "MID", elo: "Diamante", ...classe("Diamante IV"), capitao: true }],
    },
    disponiveis: [
      { id: "p1", riotId: "OuroCaro#BR1", pontos: 3, rota1: "ADC", rota2: "SUP", elo: "Ouro", ...classe("Ouro II") },
      { id: "p2", riotId: "OuroBarato#BR1", pontos: 2, rota1: "SUP", rota2: "ADC", elo: "Ouro", ...classe("Ouro IV") },
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
  };
}

function servir(corpo: unknown) {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ agoraServidorISO: new Date().toISOString(), ...(corpo as object) }), { status: 200 })));
  vi.stubGlobal("AbortSignal", { ...AbortSignal, timeout: () => undefined });
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("a transmissão mostra a classe de preço", () => {
  it("no pool, no elenco e no capitão: «Ouro II», «Ouro IV», «Mestre · 0–99 PDL»", async () => {
    servir({ draft: draft(true), souCapitaoDe: null });
    render(<Transmissao t={MESSAGES.pt.draft} />);
    await screen.findAllByText("OuroCaro#BR1");
    const texto = document.body.textContent ?? "";
    expect(texto).toContain("Ouro II");
    expect(texto).toContain("Ouro IV");
    expect(texto).toContain("Mestre · 0–99 PDL");
    expect(texto).toContain("Diamante IV");
  });

  it("estado antigo, sem a classe: continua o nome do elo", async () => {
    servir({ draft: draft(false), souCapitaoDe: null });
    render(<Transmissao t={MESSAGES.pt.draft} />);
    await screen.findAllByText("OuroCaro#BR1");
    const texto = document.body.textContent ?? "";
    expect(texto).not.toContain("Ouro II");
    expect(texto).not.toContain("0–99 PDL");
    expect(texto).toContain("Ouro");
  });
});

describe("o painel do capitão mostra a classe de preço", () => {
  it("ao lado do preço de cada disponível", async () => {
    servir({ draft: draft(true), souCapitaoDe: "t1", logado: true });
    render(<PainelCapitao t={MESSAGES.pt.draft} />);
    await screen.findByText("OuroCaro#BR1");
    expect(screen.getByText("Ouro II")).toBeTruthy();
    expect(screen.getByText("Ouro IV")).toBeTruthy();
  });

  it("estado antigo, sem a classe: o nome do elo", async () => {
    servir({ draft: draft(false), souCapitaoDe: "t1", logado: true });
    render(<PainelCapitao t={MESSAGES.pt.draft} />);
    await screen.findByText("OuroCaro#BR1");
    expect(screen.queryByText("Ouro II")).toBeNull();
    expect(screen.getAllByText("Ouro").length).toBeGreaterThan(0);
  });
});
