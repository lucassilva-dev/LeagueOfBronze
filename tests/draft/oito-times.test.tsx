// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import path from "node:path";

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CORES_DOS_TIMES } from "@/lib/draft/design";
import { alcancarORelogio, iniciarDraft, montarDraft, ordemSerpentina, type JogadorDoDraft } from "@/lib/draft/motor";
import { identidadeDoTime } from "@/lib/draft/times";
import { MESSAGES } from "@/lib/i18n/messages";

/**
 * O DRAFT COM 8 TIMES — o formato da 4ª desde 2026-10-22 (40 jogadores).
 *
 * A transmissão e o painel do capitão foram desenhados num handoff de 6 times. Aqui eles
 * são renderizados com 8: colunas, cores (as 6 do handoff + MARÉ e SEIVA, de
 * lib/draft/times.ts), a ordem serpentina 1→8 / 8→1 nas 32 escolhas, a coluna estreita do
 * projetor e a tela final. O jsdom não faz layout: como em grade-da-transmissao.test.tsx,
 * as larguras saem da conta do PRÓPRIO CSS (app/globals.css) e do estilo do componente.
 *
 * A grade do calendário fica fixada em "a divulgar" (como em
 * tests/publico/calendario-a-divulgar.test.tsx): o cartão travado continua testado depois
 * que a grade oficial for preenchida. O cartão com a grade está em
 * tests/admin/secao-draft-calendario.test.tsx.
 */

vi.mock("@/lib/calendario-4a-grade", () => ({ CALENDARIO_OFICIAL_4A: { divulgado: false, times: 8 } }));

const { default: Transmissao, colunasDaTelaFinal } = await import("@/components/draft/transmissao");
const { default: PainelCapitao } = await import("@/components/draft/painel-capitao");
const { SecaoDraft } = await import("@/components/admin/e4/secao-draft");

const css = readFileSync(path.join(process.cwd(), "app", "globals.css"), "utf8");

/** Os 8 times como o draft os monta: nome e cor de lib/draft/times.ts, na ordem. */
function oitoTimes() {
  return Array.from({ length: 8 }, (_, i) => ({
    id: `t${i + 1}`,
    ...identidadeDoTime(i),
    capitaoRiotId: `Cap${i + 1}#BR1`,
    gasto: 5,
    vagas: 4,
  }));
}

function estado(fase: string, over: Record<string, unknown> = {}) {
  const times = oitoTimes();
  return {
    draft: {
      revisao: 10,
      fase,
      times,
      elencos: Object.fromEntries(
        times.map((t, i) => [t.id, [{ riotId: `Cap${i + 1}#BR1`, pontos: 5, rota1: "MID", rota2: "TOP", elo: "PRATA", capitao: true }]]),
      ),
      disponiveis: [{ id: "p1", riotId: "Livre#BR1", pontos: 3, rota1: "ADC", rota2: "SUP", elo: "PRATA" }],
      escolhiveis: ["p1"],
      escolhaAtual: 0,
      totalEscolhas: 32,
      timeDaVezId: fase === "rodando" ? "t1" : null,
      prazoISO: fase === "rodando" ? new Date(Date.now() + 60_000).toISOString() : null,
      motivoDaPausa: null,
      sorteioId: "S1",
      orcamentoPorTime: 30,
      jogadoresPorTime: 5,
      historico: [],
      ...over,
    },
    souCapitaoDe: null,
    agoraServidorISO: new Date().toISOString(),
  };
}

let resposta: unknown = null;

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(resposta), { status: 200 })));
  vi.stubGlobal("AbortSignal", { ...AbortSignal, timeout: () => undefined });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

/** "#ef7d34" → "rgb(239, 125, 52)", como o jsdom devolve no estilo. */
function rgb(hex: string): string {
  const [r, g, b] = [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16));
  return `rgb(${r}, ${g}, ${b})`;
}

/** Diferença de cor CIE76 (ΔE) entre dois hexadecimais — acima de ~20 se distingue de longe. */
function deltaE(a: string, b: string): number {
  const lab = (hex: string) => {
    const [r, g, bl] = [1, 3, 5]
      .map((i) => Number.parseInt(hex.slice(i, i + 2), 16) / 255)
      .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
    const x = f((r! * 0.4124 + g! * 0.3576 + bl! * 0.1805) / 0.95047);
    const y = f(r! * 0.2126 + g! * 0.7152 + bl! * 0.0722);
    const z = f((r! * 0.0193 + g! * 0.1192 + bl! * 0.9505) / 1.08883);
    return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
  };
  const [p, q] = [lab(a), lab(b)];
  return Math.hypot(p[0]! - q[0]!, p[1]! - q[1]!, p[2]! - q[2]!);
}

async function transmissaoRodando() {
  resposta = estado("rodando");
  render(<Transmissao t={MESSAGES.pt.draft} />);
  await screen.findAllByText("CHAMA");
  const grade = document.querySelector<HTMLElement>(".lobd-grade-times")!;
  expect(grade, "a grade dos times").toBeTruthy();
  return grade;
}

describe("transmissão com 8 times", () => {
  it("8 colunas lado a lado, uma por time, sem time a mais nem a menos", async () => {
    const grade = await transmissaoRodando();
    expect(grade.style.getPropertyValue("--times")).toBe("8");
    const colunas = [...grade.querySelectorAll<HTMLElement>(":scope > .lobd-coluna-time")];
    expect(colunas).toHaveLength(8);
    expect(colunas.map((c) => c.textContent?.match(/#(\d)/)?.[1])).toEqual(["1", "2", "3", "4", "5", "6", "7", "8"]);
    // Cada coluna não estica além da trilha (minWidth 0) e corta o que sobra: nada vaza
    // para a vizinha.
    for (const c of colunas) {
      expect(c.style.minWidth).toBe("0px");
      expect(c.style.overflow).toBe("hidden");
    }
  });

  it("cores: as 6 do handoff e, no 7º e 8º, MARÉ e SEIVA — todas diferentes entre si", async () => {
    const grade = await transmissaoRodando();
    const nomes = [...grade.querySelectorAll<HTMLElement>(":scope > .lobd-coluna-time")].map(
      (c) => c.querySelector<HTMLElement>("span")!,
    );
    expect(nomes.map((n) => n.textContent)).toEqual(["CHAMA", "ÁUREA", "VERDANTE", "GÉLIDA", "ARCANA", "CARMESIM", "MARÉ", "SEIVA"]);
    const esperadas = [...CORES_DOS_TIMES, identidadeDoTime(6).cor, identidadeDoTime(7).cor];
    expect(nomes.map((n) => n.style.color)).toEqual(esperadas.map(rgb));
    expect(new Set(esperadas).size).toBe(8);
    // Distintas de verdade, não só no código: o par mais próximo (VERDANTE x MARÉ) fica
    // acima de 20 de ΔE.
    let menor = Infinity;
    for (let i = 0; i < 8; i++) for (let j = i + 1; j < 8; j++) menor = Math.min(menor, deltaE(esperadas[i]!, esperadas[j]!));
    expect(menor).toBeGreaterThan(20);
  });

  it("o trilho tem as 32 escolhas na ordem serpentina 1→8, 8→1, 1→8, 8→1", async () => {
    const grade = await transmissaoRodando();
    const trilho = grade.previousElementSibling as HTMLElement;
    const chips = [...trilho.children] as HTMLElement[];
    expect(chips.map((c) => c.textContent)).toEqual(Array.from({ length: 32 }, (_, i) => String(i + 1)));
    const cores = [...CORES_DOS_TIMES, identidadeDoTime(6).cor, identidadeDoTime(7).cor].map(rgb);
    const indiceDaCor = (c: HTMLElement) => cores.indexOf(c.style.color) + 1;
    // A 1ª é a da vez (fundo na cor do time); as outras ainda não foram feitas (texto na cor).
    expect(chips[0]!.style.background).toContain(cores[0]!);
    const ida = [1, 2, 3, 4, 5, 6, 7, 8];
    const volta = [...ida].reverse();
    expect(chips.slice(1).map(indiceDaCor)).toEqual([...ida, ...volta, ...ida, ...volta].slice(1));
  });

  it("na largura do projetor (1024px) cada coluna fica estreita, e o slot vira o modo de coluna estreita", async () => {
    const grade = await transmissaoRodando();
    const vao = Number.parseFloat(grade.style.gap);
    const respiro = Number.parseFloat(grade.style.padding.split(" ")[1] ?? "0");
    const coluna = (largura: number, n: number) => (largura - 2 * respiro - (n - 1) * vao) / n;

    const regra = /@container \(max-width: (\d+)px\) \{([\s\S]*?)\n\}/.exec(css);
    expect(regra, "@container da coluna estreita em app/globals.css").toBeTruthy();
    const limite = Number(regra![1]);
    expect(css).toMatch(/\.lobd-coluna-time \{\s*container-type: inline-size;\s*\}/);
    expect(regra![2]).toMatch(/\.lobd-slot-rota \{\s*display: none !important;/);
    expect(regra![2]).toMatch(/\.lobd-slot-rota-curta \{\s*display: inline;/);

    // O contêiner é a coluna sem as bordas (1px de cada lado).
    const conteudo = (largura: number, n: number) => coluna(largura, n) - 2;
    expect(conteudo(1024, 8)).toBeLessThanOrEqual(limite); // 8 no projetor: modo estreito
    expect(conteudo(1280, 8)).toBeLessThanOrEqual(limite); // 8 no notebook de 1280: também
    expect(conteudo(1920, 8)).toBeGreaterThan(limite); // 8 na TV: o slot do handoff
    expect(conteudo(1024, 6)).toBeGreaterThan(limite); // 6 no projetor: como sempre foi

    // A conta do nick a 1024px com 8 times: coluna − borda − respiro do elenco (8+8) − borda
    // do slot − respiro do slot − vão − pontos (~17px para dois dígitos).
    const respiroCurto = Number(/padding-left: (\d+)px !important/.exec(regra![2])![1]);
    const vaoCurto = Number(/gap: (\d+)px !important/.exec(regra![2])![1]);
    const nickEstreito = coluna(1024, 8) - 2 - 16 - 2 - 2 * respiroCurto - vaoCurto - 17;
    const nickDoHandoff = coluna(1024, 8) - 2 - 16 - 2 - 16 - 30 - 7 - 7 - 17;
    expect(nickDoHandoff).toBeLessThan(25); // sem o modo estreito, o nick sumia
    expect(nickEstreito).toBeGreaterThanOrEqual(55);
  });

  it("a rota continua dita no modo estreito: a etiqueta e o texto na linha do elo existem juntos", async () => {
    const grade = await transmissaoRodando();
    const primeira = grade.querySelector<HTMLElement>(".lobd-coluna-time .lobd-slot")!;
    expect(primeira.querySelector(".lobd-slot-rota")?.textContent).toBe("MID");
    expect(primeira.querySelector(".lobd-slot-rota-curta")?.textContent).toContain("MID");
  });

  it("no sorteio, a frase da ordem vai até 8 e volta", async () => {
    resposta = estado("preparando");
    render(<Transmissao t={MESSAGES.pt.draft} />);
    const frase = await screen.findByText(/Ordem serpentina:/, undefined, { timeout: 15_000 });
    expect(frase.textContent).toBe("Ordem serpentina: 1-2-3-4-5-6-7-8 · 8-7-6-5-4-3-2-1 · e repete.");
    expect(screen.getByText("8º")).toBeTruthy();
  });

  it("tela final: os 8 times, 4 por linha (e não 6 + 2)", async () => {
    resposta = estado("encerrado", { escolhaAtual: 32, timeDaVezId: null });
    render(<Transmissao t={MESSAGES.pt.draft} />);
    await screen.findByText(MESSAGES.pt.draft.timesFormados);
    for (const t of oitoTimes()) expect(screen.getAllByText(t.nome).length).toBeGreaterThan(0);
    expect(colunasDaTelaFinal(8)).toBe("repeat(auto-fit,minmax(max(196px,calc((100% - 30px) / 4)),1fr))");
    // E a tela final usa essa conta (não só a função existe). O jsdom descarta valores com
    // max()/calc() no estilo, então a prova sai do fonte, como o CSS acima sai do globals.css.
    const fonte = readFileSync(path.join(process.cwd(), "components", "draft", "transmissao.tsx"), "utf8");
    expect(fonte).toMatch(/gridTemplateColumns: colunasDaTelaFinal\(draft\.times\.length\)/);
    // Até 6, todos numa linha, como no handoff.
    expect(colunasDaTelaFinal(6)).toContain("/ 6)");
    expect(colunasDaTelaFinal(5)).toContain("/ 5)");
    expect(colunasDaTelaFinal(7)).toContain("/ 4)");
  });
});

describe("painel do capitão com 8 times", () => {
  it("rodada e escolha contam com 8 times (escolha 9 de 32 = rodada 2 de 4), e os outros 7 aparecem", async () => {
    resposta = { ...estado("rodando", { escolhaAtual: 8, timeDaVezId: "t8" }), souCapitaoDe: "t1", logado: true };
    render(<PainelCapitao t={MESSAGES.pt.draft} />);
    await screen.findByText("Rodada 2 de 4 · Escolha 9 de 32");
    for (const t of oitoTimes().slice(1)) expect(screen.getAllByText(t.nome).length).toBeGreaterThan(0);
  });
});

describe("mesa do draft (painel da organização) com 8 times", () => {
  /** A conferência como o servidor manda com 40 aptos para 8 times. */
  const previa = {
    config: { jogadoresPorTime: 5, maxTimes: 8, orcamentoPorTime: 30, segundosPorEscolha: 60 },
    times: 8,
    vagas: 40,
    aprovados: 40,
    aptos: 40,
    sobra: 0,
    pendentes: 0,
    impedimentos: [],
    totalDePontos: 240,
    jogadores: [],
    capitaesPelaRegra: [],
    empateNoCorte: null,
    faltamCapitaes: 0,
    semEloCongelado: [],
    inscricoesAbertas: false,
  };

  it("os 8 elencos em ordem, cada um com a sua cor, e a conferência com teto de 8", async () => {
    resposta = { ...estado("rodando"), sorteio: { semente: "S1", capitaes: [], emISO: new Date().toISOString() }, semSaida: null, previa };
    render(<SecaoDraft onAlert={vi.fn()} podeConduzir onDatasetMudou={vi.fn()} />);
    await screen.findByText("1º · CHAMA");
    oitoTimes().forEach((t, i) => expect(screen.getByText(`${i + 1}º · ${t.nome}`)).toBeTruthy());
    expect(screen.getByText("8º · SEIVA").style.color).toBe(rgb(identidadeDoTime(7).cor));
    expect(screen.getByText("teto de 8")).toBeTruthy();
  });

  it("o cartão do calendário diz 8 times e 28 séries, e fica travado enquanto as datas não saem", async () => {
    resposta = { ...estado("encerrado", { escolhaAtual: 32, timeDaVezId: null }), sorteio: null, semSaida: null, previa };
    render(<SecaoDraft onAlert={vi.fn()} podeConduzir onDatasetMudou={vi.fn()} />);
    await screen.findByText("Sortear as posições e criar as 28 séries");
    expect(screen.queryByText(/criar as 15 séries/)).toBeNull();
    expect(document.body.textContent).not.toMatch(/Time 1 … Time 6|20\/11 a 28\/11/);
    expect(
      screen.getByText(
        "O calendário de 8 times ainda não foi definido. Quando estiver, este botão sorteia qual time é o Time 1 … Time 8 e cria as 28 séries da fase de pontos com data e hora.",
      ),
    ).toBeTruthy();
    expect(screen.getByText("datas a divulgar")).toBeTruthy();
    const botao = screen.getByRole("button", { name: "Sortear e criar as séries" }) as HTMLButtonElement;
    expect(botao.disabled).toBe(true);
    // A trava é a do calendário, não só a da confirmação: a caixa vem desligada e marcá-la
    // não destrava o botão.
    const confirmacao = screen.getByText("Os times do draft já estão no site. Pode sortear as posições.");
    expect((confirmacao.closest("label")!.querySelector("input") as HTMLInputElement).disabled).toBe(true);
    fireEvent.click(confirmacao);
    expect(botao.disabled).toBe(true);
  });
});

describe("motor com 8 times", () => {
  it("32 escolhas em serpentina, e cada time fecha com 5", () => {
    const times = oitoTimes().map((t, i) => ({ id: t.id, nome: t.nome, cor: t.cor, capitaoId: `c${i}` }));
    const jogadores: JogadorDoDraft[] = [
      ...times.map((_, i) => ({ id: `c${i}`, riotId: `Cap${i}#BR1`, pontos: 6, rota1: "MID", rota2: "TOP", elo: "Platina", timeId: null })),
      ...Array.from({ length: 32 }, (_, i) => ({
        id: `j${i}`,
        riotId: `Jog${i}#BR1`,
        pontos: 3 + (i % 4),
        rota1: "ADC",
        rota2: "SUP",
        elo: "Prata",
        timeId: null,
      })),
    ];
    let e = montarDraft({ times, jogadores, jogadoresPorTime: 5, orcamentoPorTime: 30, segundosPorEscolha: 60 });
    expect(e.ordem).toHaveLength(32);
    expect(e.ordem).toEqual(ordemSerpentina(times.map((t) => t.id), 4));
    expect(e.ordem.slice(0, 16).map((id) => Number(id.slice(1)))).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 8, 7, 6, 5, 4, 3, 2, 1]);
    const inicio = Date.parse("2026-11-15T20:00:00Z");
    e = iniciarDraft(e, inicio);
    // Uma escolha por sondagem: atraso de mais de uma escolha inteira pausa o draft (o freio
    // do motor, decisão C3 de 2026-10-22).
    for (let k = 1; k <= 32; k++) e = alcancarORelogio(e, inicio + k * 60_000 + 1);
    expect(e.fase).toBe("encerrado");
    for (const t of times) expect(e.jogadores.filter((j) => j.timeId === t.id)).toHaveLength(5);
  });
});
