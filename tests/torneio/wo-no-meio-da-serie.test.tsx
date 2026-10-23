import { cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { normalizeDatasetForSave } from "@/lib/data-store";
import type { TournamentDataset } from "@/lib/schema";
import {
  applyAutoGameMvpsToDataset,
  calculateChampionAggregates,
  calculatePlayerAggregates,
  calculateStandings,
  calculateTeamAggregates,
  getSeriesScore,
  getSeriesWinnerTeamId,
  jogosDeWalkoverDaSerie,
  placarComWalkover,
  walkoverPermitido,
} from "@/lib/tournament";

import { cenario, id, jogo, linhasDoTime, mensagens, validar } from "./_cenario-regra-6";

/**
 * W.O. NO MEIO DA SÉRIE (decisão de 22/10/2026): "jogos valem, W.O. completa".
 *
 * A série pode ter `walkoverWinnerTeamId` junto com jogos já disputados, desde que esses
 * jogos não a tivessem decidido. Placar oficial = vitórias nos jogos disputados + jogos de
 * W.O. para o vencedor do W.O. até completar (MD3: 2; MD5: 3). Antes, o schema recusava
 * qualquer W.O. com jogo, e a gravação APAGAVA os jogos de toda série com W.O.
 */

const cenarioDaPagina = vi.hoisted(() => ({ dataset: null as unknown }));

vi.mock("@/lib/i18n/server", async () => {
  const { MESSAGES: mensagens } = await import("@/lib/i18n/messages");
  return { getLocale: async () => "pt", getMessages: async () => mensagens.pt };
});

vi.mock("@/lib/server-data", async () => {
  const { createIndexes } = await import("@/lib/tournament");
  return {
    getServerDataset: async () => {
      const dataset = cenarioDaPagina.dataset as TournamentDataset;
      return { dataset, indexes: createIndexes(dataset) };
    },
  };
});

// O sorteio ao vivo é um componente de cliente com roteador; aqui só interessa a partida.
vi.mock("@/components/series-live-draw", () => ({ SeriesLiveDraw: () => null }));

const { default: PartidaPage } = await import("@/app/partidas/[id]/page");

async function resolver(no: ReactNode): Promise<ReactNode> {
  if (Array.isArray(no)) return Promise.all(no.map(resolver));
  if (!isValidElement(no)) return no;
  const elemento = no as ReactElement<{ children?: ReactNode }>;
  const { type, props } = elemento;
  if (typeof type === "function" && type.constructor.name === "AsyncFunction") {
    return resolver(await (type as (p: unknown) => Promise<ReactNode>)(props));
  }
  if (props && props.children !== undefined) {
    const filhos = await resolver(props.children);
    return cloneElement(elemento, undefined, ...(Array.isArray(filhos) ? filhos : [filhos]));
  }
  return elemento;
}

const texto = (markup: string) => markup.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

/** Jogo da ALFA ou da BETA na s1, com estatística e campeão. */
const jogoDe = (vencedor: "alfa" | "beta") =>
  jogo(vencedor, [
    ...linhasDoTime("alfa", vencedor === "alfa" ? [3, 1, 2] : [1, 3, 1]),
    ...linhasDoTime("beta", vencedor === "beta" ? [3, 1, 2] : [1, 3, 1]),
  ].map((linha, i) => (i === 0 ? { ...linha, champion: "Garen" } : linha)));

/** s1 (ALFA x BETA) com os jogos e o W.O. pedidos. */
function serie(jogos: Array<"alfa" | "beta">, walkover?: "alfa" | "beta", format?: "BO5") {
  const dataset = cenario();
  const s1 = dataset.seriesMatches.find((s) => s.id === "s1")!;
  s1.games = jogos.map(jogoDe);
  if (walkover) {
    s1.walkoverWinnerTeamId = walkover;
    s1.walkoverReason = "Abandonou no meio da série.";
  }
  if (format) s1.format = format;
  return { dataset, s1 };
}

describe("placar oficial com W.O. no meio da série", () => {
  it("A venceu o jogo 1 e B abandonou → 2x0 A", () => {
    const { dataset, s1 } = serie(["alfa"], "alfa");
    expect(getSeriesScore(s1, dataset)).toEqual({ teamAWins: 2, teamBWins: 0 });
    expect(placarComWalkover(s1, 2).jogosDeWalkover).toBe(1);
  });

  it("B venceu o jogo 1 e A leva o W.O. → 2x1 A", () => {
    const { dataset, s1 } = serie(["beta"], "alfa");
    expect(getSeriesScore(s1, dataset)).toEqual({ teamAWins: 2, teamBWins: 1 });
    expect(getSeriesWinnerTeamId(s1, dataset)).toBe("alfa");
    expect(jogosDeWalkoverDaSerie(s1, dataset)).toEqual([
      { gameIndex: 2, winnerTeamId: "alfa" },
      { gameIndex: 3, winnerTeamId: "alfa" },
    ]);
  });

  it("MD5: 2x1 nos jogos e W.O. para quem perdia → 2x3", () => {
    const { dataset, s1 } = serie(["alfa", "beta", "alfa"], "beta", "BO5");
    expect(getSeriesScore(s1, dataset)).toEqual({ teamAWins: 2, teamBWins: 3 });
  });

  it("W.O. sem jogo continua como sempre: 2x0 (MD5: 3x0)", () => {
    const md3 = serie([], "beta");
    expect(getSeriesScore(md3.s1, md3.dataset)).toEqual({ teamAWins: 0, teamBWins: 2 });
    const md5 = serie([], "alfa", "BO5");
    expect(getSeriesScore(md5.s1, md5.dataset)).toEqual({ teamAWins: 3, teamBWins: 0 });
    expect(jogosDeWalkoverDaSerie(md3.s1, md3.dataset)).toHaveLength(2);
  });
});

describe("schema", () => {
  it("aceita W.O. com jogos que ainda não decidiram a série", () => {
    expect(validar(serie(["beta"], "alfa").dataset).success).toBe(true);
    expect(validar(serie(["alfa", "beta"], "beta").dataset).success).toBe(true);
  });

  it("recusa W.O. numa série que os jogos já decidiram", () => {
    const { dataset } = serie(["alfa", "alfa"], "beta");
    expect(mensagens(dataset)).toContain(
      "Série s1 já estava decidida pelos jogos lançados (2x0), então não pode receber W.O.",
    );
    expect(walkoverPermitido(dataset.seriesMatches[0]!, dataset)).toBe(false);
    expect(walkoverPermitido(serie(["alfa"]).s1, dataset)).toBe(true);
  });
});

describe("os jogos disputados VALEM; os de W.O. não têm K/D/A nem MVP", () => {
  it("a gravação NÃO apaga mais os jogos da série com W.O.", () => {
    const { dataset } = serie(["beta"], "alfa");
    expect(applyAutoGameMvpsToDataset(dataset).seriesMatches[0]!.games).toHaveLength(1);
    expect(normalizeDatasetForSave(dataset).seriesMatches[0]!.games).toHaveLength(1);
  });

  it("tabela: 3 pontos para quem levou o W.O., e o saldo conta os jogos de W.O.", () => {
    const { dataset } = serie(["beta"], "alfa");
    const linhas = new Map(calculateStandings(dataset).rows.map((r) => [r.teamId, r]));
    expect(linhas.get("alfa")).toMatchObject({ points: 3, seriesWon: 1, gamesWon: 2, gamesLost: 1, gameDiff: 1 });
    expect(linhas.get("beta")).toMatchObject({ points: 0, seriesLost: 1, gamesWon: 1, gamesLost: 2, gameDiff: -1 });
    expect(calculateTeamAggregates(dataset).find((t) => t.teamId === "alfa")!.gameDiff).toBe(1);
  });

  it("jogos disputados de cada jogador: só o jogo que aconteceu", () => {
    const { dataset } = serie(["beta"], "alfa");
    const alfaTop = calculatePlayerAggregates(dataset).find((a) => a.playerId === id("alfa", "TOP"))!;
    expect(alfaTop).toMatchObject({ gamesPlayed: 1, wins: 0 });
    const betaTop = calculatePlayerAggregates(dataset).find((a) => a.playerId === id("beta", "TOP"))!;
    expect(betaTop).toMatchObject({ gamesPlayed: 1, wins: 1 });
    // Um MVP só (o do jogo disputado), e nenhum dos jogos de W.O. somou outro.
    const mvps = new Map(calculateTeamAggregates(dataset).map((t) => [t.teamId, t.gameMvps]));
    expect([mvps.get("alfa"), mvps.get("beta")]).toEqual([0, 1]);
  });

  it("campeões: o jogo disputado da série com W.O. entra", () => {
    const { dataset } = serie(["beta"], "alfa");
    expect(calculateChampionAggregates(dataset).find((c) => c.championName === "Garen")).toMatchObject({ picks: 1 });
  });
});

describe("página da partida", () => {
  it("mostra o jogo disputado e os jogos de W.O. como tal", async () => {
    const { dataset } = serie(["beta"], "alfa");
    cenarioDaPagina.dataset = dataset;
    const markup = renderToStaticMarkup(<>{await resolver(await PartidaPage({ params: Promise.resolve({ id: "s1" }) }))}</>);
    const pagina = texto(markup);

    expect(pagina).toContain("ALFA 2–1 BETA");
    expect(pagina).toMatch(/Jogo 1 Vencedor: BETA/);
    expect(pagina).toMatch(/Jogo 2 W\.O\. Vencedor por W\.O\.: ALFA/);
    expect(pagina).toMatch(/Jogo 3 W\.O\. Vencedor por W\.O\.: ALFA/);
    expect(pagina).toContain("Jogo não disputado: conta para o placar, sem K/D/A e sem MVP. Abandonou no meio da série.");
  });

  it("W.O. sem jogo segue com o cartão de sempre, sem jogos de W.O. numerados", async () => {
    const { dataset } = serie([], "alfa");
    cenarioDaPagina.dataset = dataset;
    const pagina = texto(
      renderToStaticMarkup(<>{await resolver(await PartidaPage({ params: Promise.resolve({ id: "s1" }) }))}</>),
    );
    expect(pagina).toContain("Esta série foi encerrada por W.O. Abandonou no meio da série.");
    expect(pagina).not.toMatch(/Jogo 1 W\.O\./);
  });
});
