import { cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { auditarSerie } from "@/components/admin/admin-series-panel";
import type { SeriesGame, TournamentDataset } from "@/lib/schema";
import {
  applyAutoGameMvpsToDataset,
  calculatePlayerAggregates,
  calculateStandings,
  getSeriesMvp,
  getSeriesScore,
} from "@/lib/tournament";

import { cenario, copia, id, linha, linhasDoTime, mensagens, validar } from "./_cenario-regra-6";

/**
 * RESULTADO PROVISÓRIO — o jogo lançado só com o vencedor (15/11/2026).
 *
 * A série 7 da 4ª (Furiosos x Fãs de Rosca) terminou 2x1 e os prints não chegaram: "já pode dar
 * a vitória por enquanto, depois mando os resultados dos prints". Antes todo jogo exigia um MVP
 * cadastrado, e lançar o placar obrigava a inventar um MVP — que aparecia na partida e somava
 * no ranking de MVPs. Agora o jogo SEM K/D/A pode ficar sem MVP: a tabela conta o resultado, a
 * página mostra "MVP: —", ninguém soma MVP e o painel só avisa. Com K/D/A, o MVP continua
 * obrigatório.
 */

const cenarioDaPagina = vi.hoisted(() => ({ dataset: null as unknown }));

vi.mock("@/lib/i18n/server", async () => {
  const { MESSAGES } = await import("@/lib/i18n/messages");
  return { getLocale: async () => "pt", getMessages: async () => MESSAGES.pt };
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

/** Jogo só com o vencedor: sem K/D/A, sem MVP. */
const soVencedor = (winnerTeamId: string): SeriesGame => ({ winnerTeamId, mvpPlayerId: "", statsByPlayer: [] });

/** s1 (ALFA x BETA) 1x2 para a BETA, sem nenhum detalhe dos jogos. */
function provisorio(): TournamentDataset {
  const d = cenario();
  d.seriesMatches[0]!.games = [soVencedor("beta"), soVencedor("alfa"), soVencedor("beta")];
  return d;
}

describe("o jogo lançado só com o vencedor", () => {
  it("o servidor aceita — também depois do carimbo de MVP da gravação", () => {
    expect(validar(copia(provisorio())).success).toBe(true);
    expect(validar(applyAutoGameMvpsToDataset(provisorio())).success).toBe(true);
  });

  it("a tabela conta a série (3 pontos e o saldo de mapas)", () => {
    const d = provisorio();
    expect(getSeriesScore(d.seriesMatches[0]!, d)).toMatchObject({ teamAWins: 1, teamBWins: 2 });
    const tabela = new Map(calculateStandings(d).rows.map((linhaDaTabela) => [linhaDaTabela.teamId, linhaDaTabela]));
    expect(tabela.get("beta")).toMatchObject({ points: 3, seriesWon: 1, gamesWon: 2, gamesLost: 1, gameDiff: 1 });
    expect(tabela.get("alfa")).toMatchObject({ points: 0, seriesLost: 1, gamesWon: 1, gamesLost: 2, gameDiff: -1 });
  });

  it("ninguém soma MVP, nem de jogo nem de série", () => {
    const d = provisorio();
    expect(calculatePlayerAggregates(d).some((p) => p.gameMvps > 0 || p.seriesMvps > 0)).toBe(false);
    expect(getSeriesMvp(d.seriesMatches[0]!, d)).toBeNull();
  });

  it("com K/D/A o MVP continua obrigatório, e MVP que não é jogador continua recusado", () => {
    const comLinhas = cenario();
    comLinhas.seriesMatches[0]!.games = [
      { winnerTeamId: "alfa", mvpPlayerId: "", statsByPlayer: [linha(id("alfa", "MID"), 3, 1, 2)] },
    ];
    expect(mensagens(comLinhas).join(" ")).toMatch(/Jogo 1 da série s1 tem K\/D\/A e está sem MVP/);

    const inexistente = provisorio();
    inexistente.seriesMatches[0]!.games[0]!.mvpPlayerId = "ninguem";
    expect(mensagens(inexistente).join(" ")).toMatch(/possui MVP inválido/);
  });

  it("o painel avisa, sem travar o salvamento", () => {
    const d = provisorio();
    const auditoria = auditarSerie(d.seriesMatches[0]!, d);
    expect(auditoria.bloqueios).toEqual([]);
    expect(auditoria.avisos).toContain("Jogo 1: sem K/D/A e sem MVP — por enquanto só o vencedor conta.");
  });

  it("completar depois com os prints volta ao normal: MVP pelo K/D/A (ou o escolhido)", () => {
    const d = provisorio();
    d.seriesMatches[0]!.games[0] = {
      ...soVencedor("beta"),
      statsByPlayer: [...linhasDoTime("alfa", [1, 3, 1]), ...linhasDoTime("beta", [3, 1, 2])],
    };
    const gravado = applyAutoGameMvpsToDataset(d);
    expect(gravado.seriesMatches[0]!.games[0]!.mvpPlayerId).not.toBe("");
    expect(validar(gravado).success).toBe(true);
  });
});

describe("página da partida", () => {
  it("mostra o placar e o vencedor de cada jogo, com o MVP em branco (—)", async () => {
    cenarioDaPagina.dataset = provisorio();
    const pagina = texto(
      renderToStaticMarkup(<>{await resolver(await PartidaPage({ params: Promise.resolve({ id: "s1" }) }))}</>),
    );
    expect(pagina).toContain("ALFA 1–2 BETA");
    expect(pagina).toMatch(/Jogo 1 Vencedor: BETA • MVP: — /);
    expect(pagina).toMatch(/Jogo 2 Vencedor: ALFA • MVP: — /);
    expect(pagina).not.toContain("MVP da série");
  });
});
