import { readFileSync } from "node:fs";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { jogoDepoisDaDecisao, tournamentDatasetSchema, type SeriesMatch } from "@/lib/schema";
import { calculateStandings, getSeriesScore } from "@/lib/tournament";

/**
 * JOGO LANÇADO DEPOIS DE A SÉRIE ESTAR DECIDIDA (3x0 NUMA MD3).
 *
 * Na MD3 com sequência real t1, t2, t1, o organizador marca o jogo 2 errado (t1), vê 2x0,
 * e o «Adicionar jogo 3» continua lá. O servidor gravava: o site mostrava 3x0 numa MD3 e a
 * tabela dava +3 de saldo e 3 mapas ganhos — o 2º e o 3º critérios do desempate.
 *
 * A recusa vale na GRAVAÇÃO (PUT), e não no schema: o schema roda em toda leitura, e o
 * dado real da 3ª já tem uma série assim. Com a regra no schema o site público cairia.
 */
vi.mock("@supabase/supabase-js", async () => {
  const m = await import("../series/_tournament-state-em-memoria");
  return { createClient: () => m.clienteFalso };
});

vi.mock("@/lib/security/route-guard", async () => {
  const { sessao } = await import("../series/_tournament-state-em-memoria");
  return {
    mesmaOrigem: () => true,
    requireAdmin: async () => ({ ok: true, identity: sessao.identity }),
  };
});

import {
  datasetDoDia,
  gravado,
  jogoAB,
  ligarSupabaseFalso,
  MASTER,
  req,
  sessao,
  zerarBanco,
} from "../series/_tournament-state-em-memoria";

ligarSupabaseFalso();

const { PUT } = await import("@/app/api/admin/dataset/route");

beforeEach(() => {
  ligarSupabaseFalso();
  zerarBanco(datasetDoDia(), 7);
  sessao.identity = { ...MASTER };
});

function serieAB(vencedores: ("a" | "b")[], formato?: "BO3" | "BO5"): SeriesMatch {
  return {
    id: "4a-jogo-04",
    date: "2026-11-21T13:30:00-03:00",
    teamAId: "a",
    teamBId: "b",
    ...(formato ? { format: formato } : {}),
    games: vencedores.map(jogoAB),
  };
}

describe("a regra", () => {
  it("acha o 3º jogo de uma MD3 que já estava 2x0, e o 4º de uma MD5 em 3x0", () => {
    expect(jogoDepoisDaDecisao(serieAB(["a", "a", "a"]), "BO3")).toEqual({ jogo: 3, quantidade: 1, placarA: 2, placarB: 0 });
    expect(jogoDepoisDaDecisao(serieAB(["a", "a", "a", "b"], "BO5"), "BO3")).toEqual({
      jogo: 4,
      quantidade: 1,
      placarA: 3,
      placarB: 0,
    });
  });

  it("não acusa série legítima: 2x1 numa MD3, 2x0 numa MD5 em andamento, W.O.", () => {
    expect(jogoDepoisDaDecisao(serieAB(["a", "b", "a"]), "BO3")).toBeNull();
    expect(jogoDepoisDaDecisao(serieAB(["a", "a", "a"], "BO5"), "BO3")).toBeNull();
    expect(jogoDepoisDaDecisao(serieAB(["a", "a"]), "BO5")).toBeNull();
    expect(jogoDepoisDaDecisao({ ...serieAB([]), walkoverWinnerTeamId: "a" }, "BO3")).toBeNull();
  });

  it("o schema continua aceitando o dado antigo: a LEITURA não pode derrubar o site", () => {
    const d = datasetDoDia();
    d.seriesMatches[0] = serieAB(["a", "a", "a"]);
    expect(tournamentDatasetSchema.safeParse(d).success).toBe(true);
    // E o seed do repositório (a 3ª, com a serie-14 assim) continua legível.
    const seed = JSON.parse(readFileSync("leagueofbronze.json", "utf8")) as unknown;
    expect(tournamentDatasetSchema.safeParse(seed).success).toBe(true);
  });
});

describe("o PUT do dataset", () => {
  it("recusa o 3º jogo numa MD3 já 2x0, dizendo a série, o confronto e o jogo", async () => {
    const rascunho = datasetDoDia();
    rascunho.seriesMatches[0] = serieAB(["a", "a", "a"]);
    // O estrago que a recusa evita: 3x0 e +3 de saldo.
    expect(getSeriesScore(rascunho.seriesMatches[0]!, rascunho)).toEqual({ teamAWins: 3, teamBWins: 0 });
    expect(calculateStandings(rascunho).rows.find((r) => r.teamId === "a")?.gameDiff).toBe(3);

    const r = await PUT(req({ dataset: rascunho, versao: 7 }));
    expect(r.status).toBe(400);
    const { error } = (await r.json()) as { error: string };
    expect(error).toContain("4a-jogo-04");
    expect(error).toContain("A x B");
    expect(error).toContain("jogo 3 não pode ser registrado");
    expect(gravado().seriesMatches[0]!.games).toHaveLength(0);
  });

  it("aceita o 3º jogo quando a série estava 1x1", async () => {
    const rascunho = datasetDoDia();
    rascunho.seriesMatches[0] = serieAB(["a", "b", "a"]);
    expect((await PUT(req({ dataset: rascunho, versao: 7 }))).status).toBe(200);
  });

  it("série que JÁ estava gravada assim (dado antigo) continua editável", async () => {
    // MD5 gravada em 3x0 com um 4º jogo (cabe no limite de 5 jogos do schema).
    const legado = datasetDoDia();
    legado.seriesMatches[0] = serieAB(["a", "a", "a", "b"], "BO5");
    zerarBanco(legado, 7);

    // Corrigir o K/D/A dela não pode ser bloqueado pela regra nova.
    const rascunho = structuredClone(legado);
    rascunho.seriesMatches[0]!.games[0]!.statsByPlayer[0]!.kills = 9;
    expect((await PUT(req({ dataset: rascunho, versao: 7 }))).status).toBe(200);

    // ...mas piorar (um 5º jogo), sim.
    const pior = gravado();
    pior.seriesMatches[0]!.games.push(jogoAB("b"));
    expect((await PUT(req({ dataset: pior, versao: 8 }))).status).toBe(400);
  });
});
