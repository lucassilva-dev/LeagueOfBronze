import { cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import type { SeriesGame, TournamentDataset } from "@/lib/schema";
import {
  applyAutoGameMvpsToDataset,
  buildLeaderboards,
  calculateChampionAggregates,
  calculatePlayerAggregates,
  calculateTeamAggregates,
  createIndexes,
  getGameTeamKills,
  getPlayerGameHistory,
  getSeriesGamesWithTeamRows,
  getSeriesMvp,
  getSeriesTeamKillTotals,
  mvpDoJogo,
} from "@/lib/tournament";

import { cenario, copia, id, jogo, linha, linhasDoTime, mensagens, validar } from "./_cenario-regra-6";

/**
 * SUBSTITUTO QUE NÃO PONTUA — decisão de 14/11/2026: "substitutos não pontuam no site, só para
 * registrar"; e, ao ver a partida com o placar de abates furado, "Sim, mostra".
 *
 * Dois casos reais: o convidado (3Perna, Zarakai, BlackWolf — não cadastrados) e o cadastrado
 * que entrou como substituto sem pontuar (IronClaw, ex-RX). A linha aparece na partida, marcada,
 * e soma para o TIME (abates do jogo e da série, números do time, campeões); fica fora de tudo
 * que é do jogador: estatísticas, rankings, MVP e ficha. Antes, sem linha para eles, o jogo 1
 * da 4a-jogo-04 aparecia 21 × 17 na partida — no print foi 33 × 21.
 *
 * Aqui: na ALFA, um convidado ("Fulano", 12/1/12) cobre a MID; na BETA, a MID do GAMA entra
 * como substituto que não pontua (9/0/9). Os dois têm o maior KDA do jogo.
 */

const cenarioDaPagina = vi.hoisted(() => ({ dataset: null as unknown }));

vi.mock("@/lib/i18n/server", async () => {
  const { MESSAGES } = await import("@/lib/i18n/messages");
  return { getLocale: async () => "pt", getMessages: async () => MESSAGES.pt };
});

vi.mock("@/lib/server-data", async () => {
  const { createIndexes: indices } = await import("@/lib/tournament");
  return {
    getServerDataset: async () => {
      const dataset = cenarioDaPagina.dataset as TournamentDataset;
      return { dataset, indexes: indices(dataset) };
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

const SUB_DO_GAMA = id("gama", "MID");

function jogoComSubstitutos(): SeriesGame {
  return jogo("alfa", [
    ...linhasDoTime("alfa", [2, 1, 3], ["MID"]), // 4 linhas: 8 abates
    linha("convidado-1", 12, 1, 12, { convidado: "Fulano", teamId: "alfa", champion: "Morgana" }),
    ...linhasDoTime("beta", [1, 3, 1], ["MID"]), // 4 linhas: 4 abates
    linha(SUB_DO_GAMA, 9, 0, 9, { teamId: "beta", naoPontua: true, champion: "Ryze" }),
  ]);
}

function comSubstitutos(): TournamentDataset {
  const d = cenario();
  d.seriesMatches[0]!.games = [jogoComSubstitutos()];
  return d;
}

const s1 = (d: TournamentDataset) => d.seriesMatches[0]!;
const jogo1 = (d: TournamentDataset) => s1(d).games[0]!;

// ---------------------------------------------------------------- schema

describe("o schema aceita o convidado e a marca de quem não pontua", () => {
  it("o cenário passa, e a leitura não descarta os campos novos", () => {
    const r = validar(copia(comSubstitutos()));
    expect(r.success).toBe(true);
    const linhas = r.success ? r.data.seriesMatches[0]!.games[0]!.statsByPlayer : [];
    expect(linhas.find((l) => l.playerId === "convidado-1")).toMatchObject({ convidado: "Fulano", teamId: "alfa" });
    expect(linhas.find((l) => l.playerId === SUB_DO_GAMA)).toMatchObject({ naoPontua: true });
  });

  it("convidado sem “Jogou por” é recusado: não há jogador para dizer o lado", () => {
    const d = comSubstitutos();
    delete jogo1(d).statsByPlayer.find((l) => l.playerId === "convidado-1")!.teamId;
    expect(mensagens(d).join(" ")).toMatch(/o convidado Fulano não está cadastrado, então a linha dele precisa dizer por qual time jogou/);
  });

  it("convidado não pode usar o id de um jogador cadastrado", () => {
    const d = comSubstitutos();
    jogo1(d).statsByPlayer.find((l) => l.playerId === "convidado-1")!.playerId = id("alfa", "MID");
    expect(mensagens(d).join(" ")).toMatch(/a linha do convidado Fulano usa o id de um jogador cadastrado \(alfa-mid\)/);
  });

  it("o convidado não pode ser o MVP gravado (não é jogador)", () => {
    const d = comSubstitutos();
    jogo1(d).mvpPlayerId = "convidado-1";
    expect(mensagens(d).join(" ")).toMatch(/possui MVP inválido/);
  });
});

// ---------------------------------------------------------------- conta para o time

describe("a linha que não pontua soma para o TIME", () => {
  it("abates do jogo e da série incluem o convidado e o substituto", () => {
    const d = comSubstitutos();
    expect(getGameTeamKills(jogo1(d), s1(d), d)).toEqual({ teamAKills: 20, teamBKills: 13 });
    expect(getSeriesTeamKillTotals(s1(d), d)).toEqual({ alfa: 20, beta: 13 });
  });

  it("os números do time também", () => {
    const times = new Map(calculateTeamAggregates(comSubstitutos()).map((t) => [t.teamId, t]));
    expect(times.get("alfa")).toMatchObject({ kills: 20, assists: 24 });
    expect(times.get("beta")).toMatchObject({ kills: 13, assists: 13 });
  });

  it("e os campeões: o pick aconteceu, com vitória ou derrota do lado em que jogou", () => {
    const campeoes = new Map(calculateChampionAggregates(comSubstitutos()).map((c) => [c.championName, c]));
    expect(campeoes.get("Morgana")).toMatchObject({ picks: 1, wins: 1 });
    expect(campeoes.get("Ryze")).toMatchObject({ picks: 1, wins: 0 });
  });

  it("a partida mostra as duas linhas, marcadas, cada uma na coluna do time que cobriu", () => {
    const d = comSubstitutos();
    const [jogoDaSerie] = getSeriesGamesWithTeamRows(s1(d), d);
    expect(jogoDaSerie!.teamARows.find((r) => r.playerId === "convidado-1")).toMatchObject({
      playerNick: "Fulano",
      naoPontua: true,
      substituto: true,
      kills: 12,
    });
    expect(jogoDaSerie!.teamBRows.find((r) => r.playerId === SUB_DO_GAMA)).toMatchObject({ naoPontua: true, substituto: true });
    // Quem pontua continua igual.
    expect(jogoDaSerie!.teamARows.find((r) => r.playerId === id("alfa", "TOP"))).toMatchObject({ naoPontua: false, substituto: false });
  });
});

// ---------------------------------------------------------------- não pontua para o jogador

describe("e NÃO pontua para o jogador", () => {
  it("fora das estatísticas e dos rankings", () => {
    const d = comSubstitutos();
    const jogadores = new Map(calculatePlayerAggregates(d).map((p) => [p.playerId, p]));
    expect(jogadores.get(SUB_DO_GAMA)).toMatchObject({ gamesPlayed: 0, kills: 0, gameMvps: 0 });
    expect(jogadores.has("convidado-1")).toBe(false);
    expect(jogadores.get(id("alfa", "TOP"))).toMatchObject({ gamesPlayed: 1, kills: 2 });
    const noRanking = Object.values(buildLeaderboards(d)).flat().map((linhaDoRanking) => linhaDoRanking.player.playerId);
    expect(noRanking).not.toContain(SUB_DO_GAMA);
    expect(noRanking).not.toContain("convidado-1");
  });

  it("fora da ficha: o jogo não entra no histórico dele", () => {
    expect(getPlayerGameHistory(comSubstitutos(), SUB_DO_GAMA)).toEqual([]);
  });

  it("não é MVP, nem com o maior KDA do jogo — nem na gravação", () => {
    const d = comSubstitutos();
    // Os dois substitutos têm KDA 24 e 18; entre quem pontua, empate de 5,0 — vale o id.
    expect(mvpDoJogo(jogo1(d), s1(d), createIndexes(d).playersById)).toBe(id("alfa", "ADC"));
    expect(jogo1(applyAutoGameMvpsToDataset(d)).mvpPlayerId).toBe(id("alfa", "ADC"));
    expect(getSeriesMvp(s1(d), d)?.playerId).toBe(id("alfa", "ADC"));
  });

  it("nem escolhido pela organização: a escolha de quem não pontua não vale", () => {
    const d = comSubstitutos();
    jogo1(d).mvpPlayerId = SUB_DO_GAMA;
    jogo1(d).mvpEscolhido = true;
    expect(mvpDoJogo(jogo1(d), s1(d), createIndexes(d).playersById)).toBe(id("alfa", "ADC"));
    expect(jogo1(applyAutoGameMvpsToDataset(d))).toMatchObject({ mvpPlayerId: id("alfa", "ADC") });
    expect("mvpEscolhido" in jogo1(applyAutoGameMvpsToDataset(d))).toBe(false);
  });
});

// ---------------------------------------------------------------- página

describe("página da partida", () => {
  it("mostra o convidado e o substituto com SUB, sem link de ficha, e os abates do jogo completos", async () => {
    cenarioDaPagina.dataset = comSubstitutos();
    const markup = renderToStaticMarkup(<>{await resolver(await PartidaPage({ params: Promise.resolve({ id: "s1" }) }))}</>);

    expect(markup).toContain('aria-label="ALFA 20 × 13 BETA"');
    expect(markup).toContain(">Fulano<");
    expect(markup).not.toContain("/jogadores/convidado-1");
    expect(markup).not.toContain(`/jogadores/${SUB_DO_GAMA}`);
    expect(markup).toContain(`/jogadores/${id("alfa", "TOP")}`);
    expect(markup.match(/title="Substituto: jogou por este time, mas não pontua nas estatísticas do site"/g)).toHaveLength(2);
  });
});
