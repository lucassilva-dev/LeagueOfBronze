import { describe, expect, it } from "vitest";

import { auditarSerie } from "@/components/admin/admin-series-panel";
import { tournamentDatasetSchema, type SeriesMatch, type TournamentDataset } from "@/lib/schema";
import { applyAutoGameMvpsToDataset } from "@/lib/tournament";

/**
 * A auditoria do painel ("Esta série ainda não pode ser salva") tem de bater com o que o
 * servidor recusa: bloqueio é o que o schema recusa; o que ele aceita, mas costuma ser
 * engano, é aviso. Cada caso confere os DOIS lados — a auditoria e o schema de verdade.
 */

function dataset(series: SeriesMatch[]): TournamentDataset {
  const jog = (t: string) =>
    ["top", "mid"].map((r) => ({ id: `${t}-${r}`, nick: `${t}-${r}`, slug: `${t}-${r}`, teamId: t, role1: "MID", elo: "PRATA" }));
  return {
    tournament: { name: "4ª", lastUpdatedISO: "x", seriesPointsRule: { win: 3, loss: 0 }, format: "BO3", status: "active" },
    archivedSeasons: [],
    teams: [
      { id: "alfa", name: "Alfa", slug: "alfa" },
      { id: "beta", name: "Beta", slug: "beta" },
      { id: "gama", name: "Gama", slug: "gama" },
    ],
    players: [...jog("alfa"), ...jog("beta"), ...jog("gama")],
    seriesMatches: series,
    standingsSeed: [],
  } as unknown as TournamentDataset;
}

const jogo = (vencedor: string) => ({
  winnerTeamId: vencedor,
  durationMin: 30,
  mvpPlayerId: "",
  statsByPlayer: [
    { playerId: "alfa-mid", champion: "Ahri", kills: 5, deaths: 1, assists: 3 },
    { playerId: "beta-mid", champion: "Zed", kills: 1, deaths: 5, assists: 0 },
  ],
});

const serie = (over: Partial<SeriesMatch> = {}): SeriesMatch =>
  ({ id: "s1", date: "2026-11-21", teamAId: "alfa", teamBId: "beta", games: [jogo("alfa")], ...over }) as SeriesMatch;

const servidorAceita = (d: TournamentDataset) => tournamentDatasetSchema.safeParse(applyAutoGameMvpsToDataset(d)).success;

describe("o que o servidor recusa vira bloqueio (PNL-05)", () => {
  it("ban recém-criado, sem campeão", () => {
    const s = serie({ games: [{ ...jogo("alfa"), bans: [{ teamId: "alfa", championName: "" }] }] });
    expect(auditarSerie(s, dataset([s])).bloqueios).toContain("Jogo 1, ban 1: falta o campeão.");
    expect(servidorAceita(dataset([s]))).toBe(false);
  });

  it("ban com o time desmarcado", () => {
    const s = serie({ games: [{ ...jogo("alfa"), bans: [{ teamId: "", championName: "Zed" }] }] });
    expect(auditarSerie(s, dataset([s])).bloqueios).toContain("Jogo 1, ban 1: falta o time.");
    expect(servidorAceita(dataset([s]))).toBe(false);
  });

  it("duração 0", () => {
    const s = serie({ games: [{ ...jogo("alfa"), durationMin: 0 }] });
    expect(auditarSerie(s, dataset([s])).bloqueios.join(" ")).toMatch(/Jogo 1: a duração precisa ser maior que 0/);
    expect(servidorAceita(dataset([s]))).toBe(false);
  });

  it("cartinha sem time — inclusive em série de W.O.", () => {
    const s = serie({ cardsUsed: [{ teamId: "", cardId: "INTER_CLASSE" }] });
    expect(auditarSerie(s, dataset([s])).bloqueios).toContain("Cartinha 1: falta escolher o time.");
    expect(servidorAceita(dataset([s]))).toBe(false);

    const wo = serie({ games: [], walkoverWinnerTeamId: "alfa", cardsUsed: [{ teamId: "", cardId: "INTER_CLASSE" }] });
    expect(auditarSerie(wo, dataset([wo])).bloqueios).toContain("Cartinha 1: falta escolher o time.");
  });

  it("linha com números e sem jogador continua bloqueio", () => {
    const g = jogo("alfa");
    g.statsByPlayer.push({ playerId: "", champion: "Lux", kills: 2, deaths: 0, assists: 0 });
    const s = serie({ games: [g] });
    expect(auditarSerie(s, dataset([s])).bloqueios).toContain("Jogo 1, linha 3: falta escolher o jogador.");
    expect(servidorAceita(dataset([s]))).toBe(false);
  });
});

describe("o que o servidor aceita vira aviso, não bloqueio (PNL-06)", () => {
  // "Trocou de time DEPOIS" = a linha já estava gravada assim: a série gravada é ela mesma.
  // A linha NOVA de titular de outro time sem "Jogou por" o servidor recusa (regra 6) — ver
  // tests/admin/series-substituto-de-outro-time.test.tsx.
  it("jogador que trocou de time depois da série: aviso pelo nick e time atual", () => {
    const s = serie();
    const d = dataset([s]);
    d.players = d.players.map((p) => (p.id === "alfa-mid" ? { ...p, teamId: "gama" } : p));

    const auditoria = auditarSerie(s, d, structuredClone(s));
    expect(auditoria.bloqueios).toEqual([]);
    expect(auditoria.avisos.join(" ")).toMatch(/alfa-mid hoje está em Gama/);
    expect(servidorAceita(d)).toBe(true);
  });

  it("jogo em que TODAS as linhas são de quem trocou de time: sem bloqueio de MVP", () => {
    const s = serie();
    const d = dataset([s]);
    d.players = d.players.map((p) => (p.id === "alfa-mid" || p.id === "beta-mid" ? { ...p, teamId: "gama" } : p));

    const auditoria = auditarSerie(s, d, structuredClone(s));
    expect(auditoria.bloqueios).toEqual([]);
    expect(servidorAceita(d)).toBe(true);
  });

  it("id que não existe mais no cadastro continua bloqueio — o servidor recusa", () => {
    const g = jogo("alfa");
    g.statsByPlayer.push({ playerId: "fantasma", champion: "Lux", kills: 1, deaths: 1, assists: 1 });
    const s = serie({ games: [g] });
    expect(auditarSerie(s, dataset([s])).bloqueios).toContain("Jogo 1, linha 3: o jogador fantasma não existe mais no cadastro.");
    expect(servidorAceita(dataset([s]))).toBe(false);
  });

  it("linha com jogador e K/D/A, mas sem campeão", () => {
    const g = jogo("alfa");
    g.statsByPlayer[1] = { playerId: "beta-mid", champion: "", kills: 1, deaths: 5, assists: 0 };
    const s = serie({ games: [g] });

    const auditoria = auditarSerie(s, dataset([s]));
    expect(auditoria.bloqueios).toEqual([]);
    expect(auditoria.avisos).toContain("Jogo 1, linha 2: falta o campeão.");
    expect(servidorAceita(dataset([s]))).toBe(true);
  });
});

describe("jogo depois de a série estar decidida (PNL-10 / TOR-03)", () => {
  it("3º jogo numa MD3 já 2x0 trava — é o que o servidor recusa ao gravar", () => {
    const s = serie({ games: [jogo("alfa"), jogo("alfa"), jogo("alfa")] });
    expect(auditarSerie(s, dataset([s])).bloqueios.join(" ")).toMatch(
      /Jogo 3 lançado depois de a série estar decidida \(2x0 no jogo 2\)/,
    );
  });

  it("série JÁ gravada assim (a serie-14 da 3ª) só avisa: continua editável", () => {
    const s = serie({ games: [jogo("alfa"), jogo("alfa"), jogo("beta")] });
    const auditoria = auditarSerie(s, dataset([s]), structuredClone(s));
    expect(auditoria.bloqueios).toEqual([]);
    expect(auditoria.avisos.join(" ")).toMatch(/Jogo 3 lançado depois de a série estar decidida/);
  });

  it("2x1 numa MD3 não acusa nada", () => {
    const s = serie({ games: [jogo("alfa"), jogo("beta"), jogo("alfa")] });
    const auditoria = auditarSerie(s, dataset([s]));
    expect(auditoria.bloqueios).toEqual([]);
    expect(auditoria.avisos).toEqual([]);
  });
});
