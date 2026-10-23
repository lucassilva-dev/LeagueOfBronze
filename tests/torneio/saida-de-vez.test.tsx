import { cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { buildDesignPlayersDoElenco, buildDesignTeams } from "@/lib/roster";
import type { TournamentDataset } from "@/lib/schema";
import {
  calculatePlayerAggregates,
  calculateTeamAggregates,
  elencoAtivo,
  estaNoElenco,
  getPlayerGameHistory,
  jogadorTemHistorico,
  reservasDoDataset,
  substituirDeVez,
} from "@/lib/tournament";

import { cenario, id, jogo, linha, linhasDoTime, validar } from "./_cenario-regra-6";

/**
 * Regra 6 (decisão de 22/10/2026): SAÍDA DE VEZ — o reserva herda a vaga.
 *
 * O titular que saiu some do elenco público (times, PTS do elenco, Multi OP.GG, a contagem
 * de 5), mas o K/D/A dele continua nas partidas e na ficha. O reserva recebe o `teamId` e
 * perde `reserva`; as linhas avulsas dele continuam no time em que jogou cada jogo.
 *
 * Sem o recorte do elenco, o time ficava com 6 no /times, o PTS somava quem saiu e o Multi
 * OP.GG (que exige exatamente 5) sumia da página do time.
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

vi.mock("@/lib/fase-do-site", async (original) => ({
  ...(await original<typeof import("@/lib/fase-do-site")>()),
  emPreTemporada: () => false,
}));

// O sorteio ao vivo é um componente de cliente com roteador; aqui só interessa a partida.
vi.mock("@/components/series-live-draw", () => ({ SeriesLiveDraw: () => null }));

const { default: TimePage } = await import("@/app/times/[slug]/page");
const { default: PartidaPage } = await import("@/app/partidas/[id]/page");
const { default: JogadoresPage } = await import("@/app/jogadores/page");
const { default: FichaPage } = await import("@/app/jogadores/[slug]/page");

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

async function html(pagina: ReactNode | Promise<ReactNode>): Promise<string> {
  return renderToStaticMarkup(<>{await resolver(await pagina)}</>);
}

const ALFA_MID = id("alfa", "MID");

/**
 * A ALFA jogou a s1 com a MID titular; a s3, com o reserva no lugar dela (avulso). Depois a
 * MID saiu de vez e o reserva herdou a vaga.
 */
function depoisDaSaida() {
  const antes = cenario();
  antes.seriesMatches.find((s) => s.id === "s1")!.games = [
    jogo("alfa", [...linhasDoTime("alfa", [3, 1, 2]), ...linhasDoTime("beta", [1, 3, 1])]),
  ];
  antes.seriesMatches.find((s) => s.id === "s3")!.games = [
    jogo("gama", [
      ...linhasDoTime("alfa", [1, 2, 1], ["MID"]),
      linha("r1", 4, 1, 1, { teamId: "alfa" }),
      ...linhasDoTime("gama", [2, 1, 2]),
    ]),
  ];
  const depois = substituirDeVez(antes, ALFA_MID, "r1", "2026-11-23T12:00:00.000Z");
  return { antes, depois };
}

describe("substituirDeVez", () => {
  it("titular ganha saiuEm e fica com o time; reserva recebe o time e perde a marca", () => {
    const { depois } = depoisDaSaida();
    const mid = depois.players.find((p) => p.id === ALFA_MID)!;
    const r1 = depois.players.find((p) => p.id === "r1")!;

    expect(mid).toMatchObject({ teamId: "alfa", saiuEm: "2026-11-23T12:00:00.000Z" });
    expect(r1.teamId).toBe("alfa");
    expect("reserva" in r1).toBe(false);
    expect(validar(depois).success).toBe(true);
    expect(reservasDoDataset(depois)).toEqual([]);
  });

  it("recusa trocar quem não é titular, ou por quem não é reserva", () => {
    const { depois } = depoisDaSaida();
    expect(() => substituirDeVez(depois, ALFA_MID, "r1", "x")).toThrow("não está no elenco de nenhum time");
    expect(() => substituirDeVez(cenario(), id("alfa", "TOP"), id("beta", "TOP"), "x")).toThrow("não é reserva");
  });

  it("o elenco público é o de hoje: 5, com o reserva, sem quem saiu", () => {
    const { depois } = depoisDaSaida();
    expect(estaNoElenco(depois.players.find((p) => p.id === ALFA_MID)!)).toBe(false);
    expect(elencoAtivo(depois, "alfa").map((p) => p.id)).toEqual([
      id("alfa", "TOP"),
      id("alfa", "JUNGLE"),
      id("alfa", "ADC"),
      id("alfa", "SUP"),
      "r1",
    ]);

    const alfa = buildDesignTeams(depois).find((t) => t.id === "alfa")!;
    expect(alfa.roster.map((p) => p.id)).not.toContain(ALFA_MID);
    expect(alfa.roster).toHaveLength(5);
    expect(alfa.total).toBe(5 * 3);
    expect(buildDesignPlayersDoElenco(depois)).toHaveLength(15);
  });

  it("a marca de capitã de quem saiu deixa de valer — e não esconde a capitã nova", () => {
    const { depois } = depoisDaSaida();
    expect(buildDesignTeams(depois).find((t) => t.id === "alfa")!.captain).toBeNull();

    depois.players.find((p) => p.id === id("alfa", "TOP"))!.captain = true;
    expect(buildDesignTeams(depois).find((t) => t.id === "alfa")!.captain?.id).toBe(id("alfa", "TOP"));
  });

  it("o K/D/A de quem saiu continua; o do reserva fica no jogo em que ele foi avulso", () => {
    const { antes, depois } = depoisDaSaida();

    expect(calculatePlayerAggregates(depois).find((a) => a.playerId === ALFA_MID)).toMatchObject({
      gamesPlayed: 1,
      kills: 3,
      wins: 1,
    });
    expect(getPlayerGameHistory(depois, ALFA_MID).map((h) => h.seriesId)).toEqual(["s1"]);
    expect(getPlayerGameHistory(depois, "r1")).toEqual([
      expect.objectContaining({ seriesId: "s3", teamId: "alfa", opponentTeamId: "gama" }),
    ]);
    // Herdar a vaga não muda o passado: a estatística dos times é a mesma de antes.
    expect(calculateTeamAggregates(depois)).toEqual(calculateTeamAggregates(antes));
    expect(jogadorTemHistorico(depois, ALFA_MID)).toBe(true);
    expect(jogadorTemHistorico(cenario(), ALFA_MID)).toBe(false);
  });
});

describe("páginas públicas depois da saída de vez", () => {
  it("/times/alfa: 5 cartas, PTS do elenco de 5 e o Multi OP.GG de volta", async () => {
    cenarioDaPagina.dataset = depoisDaSaida().depois;
    const markup = await html(TimePage({ params: Promise.resolve({ slug: "alfa" }) }));

    expect(markup).not.toContain(`/jogadores/${ALFA_MID}"`);
    expect(markup).toContain('/jogadores/reserva"');
    expect(markup).toContain("MULTI OP.GG (5)");
    expect(markup).toMatch(/>15<\/span><span[^>]*>PTS DE ELENCO/);
  });

  it("/jogadores: conta e mostra só o elenco (sem quem saiu)", async () => {
    cenarioDaPagina.dataset = depoisDaSaida().depois;
    const markup = await html(JogadoresPage());
    expect(markup).toContain("15 INSCRITOS");
    expect(markup).not.toContain("alfaMID");
  });

  it("a ficha de quem saiu continua no ar, com o jogo dele e a marca de saída", async () => {
    cenarioDaPagina.dataset = depoisDaSaida().depois;
    const markup = await html(FichaPage({ params: Promise.resolve({ slug: ALFA_MID }) }));
    expect(markup).toContain("Saiu do time");
    expect(markup).toContain('href="/times/alfa"');
  });

  it("a partida mostra o substituto na coluna do time que cobriu, marcado SUB", async () => {
    cenarioDaPagina.dataset = depoisDaSaida().antes;
    const markup = await html(PartidaPage({ params: Promise.resolve({ id: "s3" }) }));
    // Os dois blocos do jogo 1 (o título de cada um é o nome do time): ALFA, depois GAMA.
    const [, blocoAlfa, blocoGama] = markup.split(/<p class="mb-2 [^"]*">(?:ALFA|GAMA)<\/p>/);
    expect(blocoAlfa).toContain('/jogadores/reserva"');
    expect(blocoAlfa).toMatch(/title="Jogou como substituto"[^>]*>SUB</);
    expect(blocoGama).not.toContain('/jogadores/reserva"');
  });

  it("a ficha do reserva (sem time) volta para /jogadores e diz Reserva", async () => {
    const dataset = cenario();
    cenarioDaPagina.dataset = dataset;
    const markup = await html(FichaPage({ params: Promise.resolve({ slug: "reserva" }) }));
    expect(markup).toContain('href="/jogadores"');
    expect(markup).not.toContain('href="/times/"');
    expect(markup).toContain(">Reserva<");
  });
});
