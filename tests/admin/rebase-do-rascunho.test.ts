import { describe, expect, it } from "vitest";

import {
  descreverCaminho,
  mudancaEstrutural,
  rebasearRascunho,
  resumirMudancasDoServidor,
} from "@/components/admin/rebase-do-rascunho";
import type { TournamentDataset } from "@/lib/schema";

/**
 * O rebase do rascunho no 409: reaplicar SÓ o que o rascunho mudou por cima da versão nova.
 *
 * Cada caso CONSTRÓI a base (o que o painel carregou), o rascunho (o que a pessoa digitou) e
 * o servidor (o que outra pessoa gravou no meio).
 */

type Serie = TournamentDataset["seriesMatches"][number];

function base(): TournamentDataset {
  const jog = (t: string) =>
    ["top", "mid"].map((r) => ({ id: `${t}-${r}`, nick: `${t}-${r}`, slug: `${t}-${r}`, teamId: t, role1: "MID", elo: "PRATA" }));
  return {
    tournament: {
      name: "4ª Edição",
      lastUpdatedISO: "2026-11-21T20:00:00.000Z",
      seriesPointsRule: { win: 3, loss: 0 },
      format: "BO3",
      status: "active",
    },
    archivedSeasons: [],
    teams: [
      { id: "alfa", name: "Alfa", slug: "alfa" },
      { id: "beta", name: "Beta", slug: "beta" },
      { id: "gama", name: "Gama", slug: "gama" },
    ],
    players: [...jog("alfa"), ...jog("beta"), ...jog("gama")],
    seriesMatches: [
      {
        id: "s4",
        date: "2026-11-21T21:00:00-03:00",
        teamAId: "alfa",
        teamBId: "beta",
        games: [
          {
            winnerTeamId: "alfa",
            durationMin: 30,
            mvpPlayerId: "alfa-mid",
            statsByPlayer: [{ playerId: "alfa-mid", champion: "Ahri", kills: 5, deaths: 1, assists: 2 }],
          },
        ],
      },
      { id: "s5", date: "2026-11-21T22:00:00-03:00", teamAId: "beta", teamBId: "gama", games: [] },
    ],
    standingsSeed: [],
  } as unknown as TournamentDataset;
}

const serie = (dataset: TournamentDataset, id: string) => dataset.seriesMatches.find((s) => s.id === id)! as Serie;

function sortearCarta(dataset: TournamentDataset) {
  const s5 = serie(dataset, "s5");
  s5.cardsUsed = [{ teamId: "beta", cardId: "ABCDRAFT" }];
  s5.sorteios = [
    { tipo: "carta", semente: "x".repeat(32), emISO: "2026-11-21T21:50:00.000Z", autor: "nakay", teamId: "beta", resultado: "ABCDRAFT" },
  ] as NonNullable<Serie["sorteios"]>;
}

describe("rebasearRascunho", () => {
  it("sorteio em outro aparelho + K/D/A digitado aqui: soma os dois, sem conflito", () => {
    const b = base();
    const rascunho = structuredClone(b);
    serie(rascunho, "s4").games[0]!.durationMin = 38;
    const servidor = structuredClone(b);
    sortearCarta(servidor);

    const r = rebasearRascunho(b, rascunho, servidor);

    expect(r.conflitos).toEqual([]);
    expect(r.jaSalvo).toBe(false);
    expect(serie(r.dataset, "s4").games[0]!.durationMin).toBe(38);
    expect(serie(r.dataset, "s5").cardsUsed).toEqual([{ teamId: "beta", cardId: "ABCDRAFT" }]);
    // O histórico continua o do servidor: é a contagem dele que diz "eu vi esse sorteio".
    expect(serie(r.dataset, "s5").sorteios).toHaveLength(1);
  });

  it("os dois mudaram o MESMO campo para valores diferentes: conflito, e o resto se soma", () => {
    const b = base();
    const rascunho = structuredClone(b);
    serie(rascunho, "s4").games[0]!.durationMin = 38;
    const servidor = structuredClone(b);
    serie(servidor, "s4").games[0]!.durationMin = 40;
    sortearCarta(servidor);

    const r = rebasearRascunho(b, rascunho, servidor);

    expect(r.conflitos).toEqual(["seriesMatches[s4].games"]);
    // O dataset devolvido é o "salvar por cima": o meu valor SÓ no campo em conflito.
    expect(serie(r.dataset, "s4").games[0]!.durationMin).toBe(38);
    expect(serie(r.dataset, "s5").cardsUsed).toEqual([{ teamId: "beta", cardId: "ABCDRAFT" }]);
  });

  it("mesmo campo, MESMO valor (a resposta do Salvar anterior se perdeu): já está salvo", () => {
    const b = base();
    const rascunho = structuredClone(b);
    serie(rascunho, "s4").games[0]!.durationMin = 38;
    const servidor = structuredClone(rascunho);

    const r = rebasearRascunho(b, rascunho, servidor);
    expect(r.jaSalvo).toBe(true);
    expect(r.conflitos).toEqual([]);
  });

  it("apagar a série que acabou de ser sorteada é conflito, não remoção silenciosa", () => {
    const b = base();
    const rascunho = structuredClone(b);
    rascunho.seriesMatches = rascunho.seriesMatches.filter((s) => s.id !== "s5");
    const servidor = structuredClone(b);
    sortearCarta(servidor);

    const r = rebasearRascunho(b, rascunho, servidor);
    expect(r.conflitos).toEqual(["seriesMatches[s5]"]);
  });

  it("o histórico de sorteios do rascunho nunca passa por cima do do servidor", () => {
    const b = base();
    sortearCarta(b);
    const rascunho = structuredClone(b);
    serie(rascunho, "s5").sorteios = [];
    serie(rascunho, "s4").games[0]!.durationMin = 38;
    const servidor = structuredClone(b);

    const r = rebasearRascunho(b, rascunho, servidor);
    expect(serie(r.dataset, "s5").sorteios).toHaveLength(1);
    expect(serie(r.dataset, "s4").games[0]!.durationMin).toBe(38);
  });

  it("série nova criada no rascunho entra; a criada por outra pessoa também fica", () => {
    const b = base();
    const rascunho = structuredClone(b);
    rascunho.seriesMatches.push({ id: "semi-1", date: "2026-11-29", teamAId: "alfa", teamBId: "gama", stage: "SEMIFINAL", games: [] } as Serie);
    const servidor = structuredClone(b);
    servidor.seriesMatches.push({ id: "semi-2", date: "2026-11-29", teamAId: "beta", teamBId: "gama", stage: "SEMIFINAL", games: [] } as Serie);

    const r = rebasearRascunho(b, rascunho, servidor);
    expect(r.conflitos).toEqual([]);
    expect(r.dataset.seriesMatches.map((s) => s.id).sort()).toEqual(["s4", "s5", "semi-1", "semi-2"]);
  });
});

describe("resumo e estrutura do que o servidor mudou", () => {
  it("a virada do draft: +times, +jogadores, −séries, e é mudança estrutural", () => {
    const b = base();
    const servidor = structuredClone(b);
    servidor.teams.push({ id: "carmesim", name: "Carmesim", slug: "carmesim" } as TournamentDataset["teams"][number]);
    servidor.players.push({ id: "c-top", nick: "c-top", slug: "c-top", teamId: "carmesim", role1: "TOP", elo: "OURO" } as TournamentDataset["players"][number]);
    servidor.seriesMatches = [];

    expect(resumirMudancasDoServidor(b, servidor)).toEqual(["+1 time", "+1 jogador", "−2 séries"]);
    expect(mudancaEstrutural(b, servidor)).toBe(true);
  });

  it("só um sorteio: resumo diz que foi sorteio, e não é estrutural", () => {
    const b = base();
    const servidor = structuredClone(b);
    sortearCarta(servidor);
    expect(resumirMudancasDoServidor(b, servidor)).toEqual(["sorteio de lado ou carta em 1 série"]);
    expect(mudancaEstrutural(b, servidor)).toBe(false);
  });

  it("temporada encerrada no meio é estrutural", () => {
    const b = base();
    const servidor = structuredClone(b);
    servidor.tournament.status = "finished";
    expect(mudancaEstrutural(b, servidor)).toBe(true);
  });

  it("descreve o campo pelos nomes dos times", () => {
    expect(descreverCaminho("seriesMatches[s4].games", base())).toBe("Alfa x Beta › jogos");
    expect(descreverCaminho("teams[alfa].name", base())).toBe("time Alfa › nome");
  });
});
