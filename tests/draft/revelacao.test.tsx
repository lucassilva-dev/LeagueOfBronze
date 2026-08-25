// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MESSAGES } from "@/lib/i18n/messages";

/**
 * A REVELAÇÃO DE CADA ESCOLHA.
 *
 * O handoff pede uma sobreposição de 2400ms a cada escolha: clarão radial na cor do time,
 * cartão entrando com `lobdSlam`, nick gigante, pontos em dourado e "→ TIME" embaixo.
 *
 * Ela é difícil de conferir no navegador — dura 2,4s, e numa aba em segundo plano os
 * relógios são estrangulados, então a janela passa sem aparecer. Aqui o tempo é
 * controlado, e dá para provar as três coisas que importam:
 *
 *  1. aparece quando o histórico CRESCE;
 *  2. NÃO aparece para quem chega no meio do draft (senão quem abre a transmissão levaria
 *     na cara a revelação de uma escolha de dez minutos atrás);
 *  3. sai sozinha depois de 2400ms.
 */

const { default: Transmissao } = await import("@/components/draft/transmissao");

const t = MESSAGES.pt.draft;

const TIMES = [
  { id: "time-1", nome: "CHAMA", cor: "#ef7d34", capitaoRiotId: "Cap1#BR1", gasto: 8, vagas: 4 },
  { id: "time-2", nome: "ÁUREA", cor: "#e0b13c", capitaoRiotId: "Cap2#BR1", gasto: 8, vagas: 4 },
];

const base = (historico: unknown[]) => ({
  draft: {
    revisao: 1,
    fase: "rodando",
    times: TIMES,
    elencos: {
      "time-1": [
        { riotId: "Cap1#BR1", pontos: 8, rota1: "TOP", rota2: "MID", elo: "DIAMANTE", capitao: true },
        { riotId: "Escolhido#BR1", pontos: 5, rota1: "MID", rota2: "SUP", elo: "PLATINA", capitao: false },
      ],
      "time-2": [
        { riotId: "Cap2#BR1", pontos: 8, rota1: "JUNG", rota2: "ADC", elo: "DIAMANTE", capitao: true },
      ],
    },
    disponiveis: [
      { id: "p9", riotId: "Sobrando#BR1", pontos: 3, rota1: "SUP", rota2: "TOP", elo: "PRATA" },
    ],
    escolhaAtual: historico.length,
    totalEscolhas: 8,
    timeDaVezId: "time-2",
    prazoISO: new Date(Date.now() + 60_000).toISOString(),
    orcamentoPorTime: 30,
    jogadoresPorTime: 5,
    historico,
  },
  souCapitaoDe: null,
});

const ESCOLHA = { escolha: 0, timeId: "time-1", riotId: "Escolhido#BR1", automatica: false };

let respostas: unknown[] = [];

beforeEach(() => {
  /*
   * RELÓGIO DE VERDADE, de propósito.
   *
   * Com `vi.useFakeTimers` a sobreposição nunca aparecia — e a primeira leitura foi
   * "a revelação está quebrada". Um experimento de controle com relógio real mostrou
   * `overlay? true`: quem estava quebrado era o teste. A cadeia aqui tem sondagem
   * assíncrona, `setInterval`, promessa de `fetch` e efeito do React encadeados; avançar
   * o tempo à mão não reproduz essa ordem de forma confiável.
   *
   * O preço é o teste levar ~5s. Barato perto de acusar defeito onde não há.
   */
  respostas = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      const corpo = respostas.length > 1 ? respostas.shift() : respostas[0];
      return { ok: true, json: async () => corpo } as unknown as Response;
    }),
  );
  // jsdom não implementa; o componente usa para cancelar a sondagem pendurada.
  vi.stubGlobal("AbortSignal", { ...AbortSignal, timeout: () => undefined });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("a revelação aparece, mostra o que deve e sai sozinha", () => {
  it("aparece quando o histórico cresce, e some depois de 2400ms", async () => {
    // Primeira leitura sem escolha nenhuma; a segunda traz uma.
    respostas = [base([]), base([ESCOLHA])];

    render(<Transmissao t={t} />);

    // A primeira sondagem sai na hora; a segunda, 2s depois, é a que traz a escolha.
    const overlay = await waitFor(
      () => {
        const el = document.querySelector('[role="status"][style*="fixed"]');
        if (!el) throw new Error("sem overlay");
        return el as HTMLElement;
      },
      { timeout: 6000, interval: 120 },
    );

    // O que o handoff manda mostrar.
    expect(overlay.textContent).toContain(t.escolhido);
    expect(overlay.textContent).toContain("Escolhido#BR1");
    expect(overlay.textContent).toContain("5"); // pontos
    expect(overlay.textContent).toContain("CHAMA");

    // Sobreposição de palco: cobre tudo, com desfoque.
    expect(overlay.style.zIndex).toBe("200");
    expect(overlay.style.position).toBe("fixed");
    expect(overlay.style.backdropFilter).toContain("blur(7px)");

    // ...e sai sozinha, sem ninguém fechar.
    await waitFor(() => expect(document.querySelector('[role="status"][style*="fixed"]')).toBeNull(), {
      timeout: 6000,
      interval: 120,
    });
  });

  it("quem chega no MEIO do draft não leva revelação antiga na cara", async () => {
    // A primeira leitura já vem com escolhas feitas: é alguém abrindo a transmissão
    // depois de o draft ter começado.
    respostas = [base([ESCOLHA])];

    render(<Transmissao t={t} />);
    await new Promise((r) => setTimeout(r, 3000));

    expect(document.querySelector('[role="status"][style*="fixed"]')).toBeNull();
    // Mas o quadro está lá, com o jogador já no elenco.
    expect(screen.getAllByText("Escolhido#BR1").length).toBeGreaterThan(0);
  });

  it("escolha automática usa o outro rótulo", async () => {
    respostas = [base([]), base([{ ...ESCOLHA, automatica: true }])];

    render(<Transmissao t={t} />);

    await waitFor(() => expect(screen.getByText(t.tempoEsgotado)).toBeTruthy(), {
      timeout: 6000,
      interval: 120,
    });
    expect(screen.queryByText(t.escolhido)).toBeNull();
  });
});
