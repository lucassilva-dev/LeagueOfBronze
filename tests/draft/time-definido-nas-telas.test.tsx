// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import PainelCapitao from "@/components/draft/painel-capitao";
import { MESSAGES } from "@/lib/i18n/messages";

/**
 * O TIME DEFINIDO pela organização nas telas públicas do draft (/draft e /capitao), decisão de
 * 24/10/2026: os organizadores jogam num time que já entra pronto, não escolhe e ninguém escolhe.
 *
 * Na transmissão ele é uma das colunas, com a etiqueta no lugar do orçamento e os membros sem
 * pontos, e fica fora de tudo o que é ORDEM (número da vez, serpentina, rodadas). No painel do
 * capitão, o capitão dele lê o recado em vez da lista de escolha — sem botão de escolher.
 *
 * O definido vai sorteado no MEIO (2º de 3) de propósito: no fim da lista, contar pela lista
 * inteira daria a mesma serpentina e o teste não pegaria nada.
 */

const { default: Transmissao, timesDoTrilho } = await import("@/components/draft/transmissao");

const pt = MESSAGES.pt.draft;
const MEMBROS = [
  { riotId: "Org1#BR1", rota1: "TOP", capitao: true },
  { riotId: "Org2#BR1", rota1: "JUNG", capitao: false },
  { riotId: "Org3#BR1", rota1: "MID", capitao: false },
  { riotId: "Org4#BR1", rota1: "ADC", capitao: false },
  { riotId: "Org5#BR1", rota1: "SUP", capitao: false },
];

type Ajustes = Partial<{ escolhaAtual: number; ordem: string[]; timeDaVezId: string | null; totalEscolhas: number }>;

function draft(fase = "rodando", extra: Ajustes = {}) {
  return {
    revisao: 20,
    fase,
    times: [
      { id: "t1", nome: "CHAMA", cor: "#ef7d34", capitaoRiotId: "Cap1#BR1", gasto: 0, vagas: 4 },
      { id: "tD", nome: "VANGUARDA", cor: "#e0b13c", capitaoRiotId: "Org1#BR1", gasto: 0, vagas: 0, definido: true as const },
      { id: "t3", nome: "BRASA", cor: "#d4574a", capitaoRiotId: "Cap3#BR1", gasto: 0, vagas: 4 },
    ],
    elencos: {
      t1: [{ riotId: "Cap1#BR1", pontos: 0, rota1: "MID", rota2: "TOP", elo: "Mestre", capitao: true }],
      tD: MEMBROS.map((m) => ({ ...m, pontos: 0, rota2: "", elo: "Ouro", classe: "Ouro II" })),
      t3: [{ riotId: "Cap3#BR1", pontos: 0, rota1: "TOP", rota2: "MID", elo: "Diamante", capitao: true }],
    },
    disponiveis: [
      { id: "p1", riotId: "Livre1#BR1", pontos: 9, rota1: "ADC", rota2: "SUP", elo: "Ouro", classe: "Ouro II" },
      { id: "p2", riotId: "Livre2#BR1", pontos: 7, rota1: "SUP", rota2: "ADC", elo: "Prata", classe: "Prata I" },
    ],
    escolhiveis: ["p1", "p2"],
    escolhaAtual: 0,
    // 2 times escolhendo × 4 escolhas: o definido não tem nenhuma.
    totalEscolhas: 8,
    timeDaVezId: fase === "rodando" ? "t1" : null,
    prazoISO: fase === "rodando" ? new Date(Date.now() + 60_000).toISOString() : null,
    motivoDaPausa: null,
    sorteioId: "S1",
    orcamentoPorTime: 30,
    jogadoresPorTime: 5,
    historico: [],
    capitaoGratis: true,
    ...extra,
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

/** A coluna da grade (ou o cartão da tela final) deste time. */
function colunaDe(nome: string): HTMLElement {
  const coluna = [...document.querySelectorAll<HTMLElement>(".lobd-coluna-time")].find((c) => c.textContent?.includes(nome));
  expect(coluna, `coluna de ${nome}`).toBeTruthy();
  return coluna!;
}

describe("a transmissão com o time definido pela organização", () => {
  it("a coluna dele leva a etiqueta TIME DEFINIDO no lugar do orçamento, sem número na ordem", async () => {
    servir({ draft: draft(), souCapitaoDe: null });
    render(<Transmissao t={pt} />);
    await screen.findAllByText("Livre1#BR1");

    const definido = colunaDe("VANGUARDA");
    const etiqueta = definido.querySelector("[data-time-definido]");
    expect(etiqueta?.textContent).toContain(pt.timeDefinido);
    expect(etiqueta?.textContent).toContain(pt.timeDefinidoNota);
    expect(definido.textContent).not.toContain(pt.pontosLivres);
    expect(definido.querySelector(".lobd-coluna-ordinal")).toBeNull();

    // Os outros seguem com o orçamento — e o número é a posição na ORDEM: BRASA, 3ª coluna,
    // escolhe em 2º.
    expect(colunaDe("CHAMA").textContent).toContain(`30${pt.pontosLivres} 30`);
    expect(colunaDe("CHAMA").querySelector(".lobd-coluna-ordinal")?.textContent).toBe("#1");
    expect(colunaDe("BRASA").querySelector(".lobd-coluna-ordinal")?.textContent).toBe("#2");
    expect(colunaDe("BRASA").querySelector("[data-time-definido]")).toBeNull();
  });

  it("os 5 membros aparecem sem pontos: capitão com a tag de capitão, os outros com a do time", async () => {
    servir({ draft: draft(), souCapitaoDe: null });
    render(<Transmissao t={pt} />);
    await screen.findAllByText("Livre1#BR1");

    const slots = [...colunaDe("VANGUARDA").querySelectorAll<HTMLElement>(".lobd-slot")];
    expect(slots).toHaveLength(5);
    for (const membro of MEMBROS) {
      const slot = slots.find((s) => s.textContent?.includes(membro.riotId));
      expect(slot, membro.riotId).toBeTruthy();
      expect(slot!.lastElementChild?.textContent).toBe(membro.capitao ? pt.capitao : pt.timeDefinidoTag);
      // Rota e elo continuam lá; o «0» não.
      expect(slot!.textContent).toContain("Ouro II");
      expect(slot!.textContent).not.toMatch(/\b0$/);
    }
  });

  it("nunca é o time da vez: sem time da vez (pausa), a barra mostra o primeiro que escolhe", async () => {
    // Aqui o definido foi sorteado em 1º: a reserva antiga (o 1º da lista) caía nele.
    const d = draft("pausado", { timeDaVezId: null });
    d.times = [d.times[1]!, d.times[0]!, d.times[2]!];
    servir({ draft: d, souCapitaoDe: null });
    render(<Transmissao t={pt} />);
    await screen.findAllByText("Livre1#BR1");
    const barra = screen.getByText(`${pt.capitaoAbrev} Cap1#BR1`);
    expect(barra).toBeTruthy();
    expect(document.body.textContent).not.toContain(`${pt.capitaoAbrev} Org1#BR1`);
  });

  it("servidor sem `ordem`: a serpentina é refeita só com quem escolhe, e as rodadas também", async () => {
    servir({ draft: draft("rodando", { escolhaAtual: 2, ordem: undefined }), souCapitaoDe: null });
    render(<Transmissao t={pt} />);
    await screen.findAllByText("Livre1#BR1");

    const chips = [...document.querySelectorAll<HTMLElement>("[data-time]")].map((c) => c.dataset.time);
    expect(chips).toEqual(["t1", "t3", "t3", "t1", "t1", "t3", "t3", "t1"]);
    // 2 escolhas por rodada: a 3ª escolha já é a rodada 2, de 4.
    expect(document.body.textContent).toContain(`${pt.rodada} 2 ${pt.de} 4`);
  });

  it("com `ordem` do servidor, o trilho segue a ordem", () => {
    const d = draft("rodando", { ordem: ["t3", "t1", "t1", "t3"], totalEscolhas: 4 });
    expect(timesDoTrilho(d)).toEqual([2, 0, 0, 2]);
    // Sem ela, os índices são os da lista inteira (é por eles que sai a cor), sem o 1 do definido.
    expect(timesDoTrilho({ ...d, ordem: undefined })).toEqual([0, 2, 2, 0]);
  });

  it("sem time definido, nada muda: a serpentina refeita usa todos", () => {
    const d = draft();
    const semDefinido = { ...d, times: d.times.map((time) => ({ ...time, definido: undefined })), totalEscolhas: 6 };
    expect(timesDoTrilho(semDefinido)).toEqual([0, 1, 2, 2, 1, 0]);
  });

  it("no sorteio ele tira nome e cor, mas fica fora da ordem: etiqueta no lugar do ordinal", { timeout: 15_000 }, async () => {
    servir({ draft: draft("preparando"), souCapitaoDe: null });
    render(<Transmissao t={pt} />);
    await screen.findAllByText("VANGUARDA");

    expect(screen.getByText(pt.timeDefinido)).toBeTruthy();
    expect(screen.getByText("1º")).toBeTruthy();
    expect(screen.getByText("2º")).toBeTruthy();
    expect(screen.queryByText("3º")).toBeNull();
    // A frase da serpentina conta os 2 que escolhem, não os 3.
    await waitFor(() => expect(document.body.textContent).toContain(`${pt.ordemSerpentina} 1-2 · 2-1`), {
      timeout: 6_000,
      interval: 100,
    });
    expect(document.body.textContent).not.toContain("1-2-3");
  });

  it("na tela final, a etiqueta no lugar de «0 de 30 pontos usados»", async () => {
    servir({ draft: draft("encerrado"), souCapitaoDe: null });
    render(<Transmissao t={pt} />);
    await screen.findAllByText("VANGUARDA");

    const etiquetas = document.querySelectorAll("[data-time-definido]");
    expect(etiquetas).toHaveLength(1);
    expect(etiquetas[0]!.textContent).toContain(pt.timeDefinido);
    const usados = document.body.textContent!.split(pt.pontosUsados).length - 1;
    expect(usados).toBe(2);
  });
});

describe("o painel do capitão com o time definido pela organização", () => {
  /** A linha do meu elenco com este Riot ID. */
  const linhaDoElenco = (riotId: string) =>
    [...document.querySelectorAll<HTMLElement>(".lob-card-2")].find((el) => el.querySelector("strong")?.textContent === riotId);

  it("o capitão do time definido lê o recado, sem lista e sem botão de escolher", async () => {
    servir({ draft: draft(), souCapitaoDe: "tD", logado: true });
    render(<PainelCapitao t={pt} />);
    await screen.findByText(pt.timeDefinidoTexto);

    expect(screen.getByText("VANGUARDA")).toBeTruthy();
    expect(screen.queryByText("Livre1#BR1")).toBeNull();
    expect([...document.querySelectorAll("button")].filter((b) => b.textContent === pt.escolher)).toHaveLength(0);
    expect(document.body.textContent).not.toContain(pt.podeGastar);
    expect(document.querySelector('a[href="/draft"]')).toBeTruthy();
  });

  it("no elenco dele, a tag no lugar dos pontos de cada membro", async () => {
    servir({ draft: draft(), souCapitaoDe: "tD", logado: true });
    render(<PainelCapitao t={pt} />);
    await screen.findByText(pt.timeDefinidoTexto);

    for (const membro of MEMBROS) {
      const linha = linhaDoElenco(membro.riotId);
      expect(linha, membro.riotId).toBeTruthy();
      expect(linha!.textContent).toContain(membro.capitao ? pt.capitao : pt.timeDefinido);
      expect(linha!.textContent).not.toMatch(/\d+\s*pts/);
    }
  });

  it("em inglês, o recado traduzido", async () => {
    servir({ draft: draft(), souCapitaoDe: "tD", logado: true });
    render(<PainelCapitao t={MESSAGES.en.draft} />);
    await screen.findByText(MESSAGES.en.draft.timeDefinidoTexto);
    expect(MESSAGES.en.draft.timeDefinidoTexto).not.toBe(pt.timeDefinidoTexto);
  });

  it("para os outros capitães, o definido sai do quadro dos rivais e não conta na rodada", async () => {
    servir({ draft: draft("rodando", { escolhaAtual: 2, timeDaVezId: "t3" }), souCapitaoDe: "t1", logado: true });
    render(<PainelCapitao t={pt} />);
    await screen.findByText("Livre1#BR1");

    expect(document.body.textContent).not.toContain("VANGUARDA");
    expect(document.body.textContent).toContain("BRASA");
    expect(document.body.textContent).toContain(`${pt.rodada} 2 ${pt.de} 4`);
    expect(document.body.textContent).not.toContain(pt.timeDefinidoTexto);
  });
});
