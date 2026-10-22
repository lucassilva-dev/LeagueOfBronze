import { beforeEach, describe, expect, it, vi } from "vitest";

import { descreverProblemasDoDataset, tournamentDatasetSchema } from "@/lib/schema";

/**
 * RECUSA DO SERVIDOR EM PORTUGUÊS, PELO NOME DA SÉRIE, DO JOGO E DO CAMPO.
 *
 * O PUT recusava o rascunho inteiro com "Validação falhou: seriesMatches.1.games.0.bans.0
 * .championName: Too small: expected string to have >=1 characters" — em inglês, e com o
 * índice do ARRAY, que não bate com a lista do painel (ordenada por data). Ninguém achava
 * a série, e todas as alterações do painel ficavam presas.
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
  ligarSupabaseFalso,
  MASTER,
  req,
  sessao,
  zerarBanco,
} from "../series/_tournament-state-em-memoria";

ligarSupabaseFalso();

const { PUT } = await import("@/app/api/admin/dataset/route");
const { importDatasetFromText } = await import("@/lib/data-store");

beforeEach(() => {
  ligarSupabaseFalso();
  zerarBanco(datasetDoDia(), 7);
  sessao.identity = { ...MASTER };
});

/** Um jogo da série C x D (a 2ª do array, a que o índice chamaria de "seriesMatches.1"). */
function jogoCD() {
  return {
    winnerTeamId: "c",
    mvpPlayerId: "c1",
    statsByPlayer: [
      { playerId: "c1", kills: 4, deaths: 2, assists: 3 },
      { playerId: "d1", kills: 2, deaths: 4, assists: 1 },
    ],
  };
}

async function erroDoPut(mexer: (serie: Record<string, unknown>, jogo: Record<string, unknown>) => void) {
  const rascunho = datasetDoDia() as unknown as { seriesMatches: Record<string, unknown>[] };
  const jogo: Record<string, unknown> = jogoCD();
  const serie = rascunho.seriesMatches[1]!;
  serie.games = [jogo];
  mexer(serie, jogo);
  const r = await PUT(req({ dataset: rascunho, versao: 7 }));
  expect(r.status).toBe(400);
  return ((await r.json()) as { error: string }).error;
}

describe("o PUT do dataset", () => {
  it("ban sem campeão (o '+ Ban' recém-criado): diz a série, o jogo e o ban", async () => {
    const erro = await erroDoPut((_s, jogo) => {
      jogo.bans = [{ teamId: "c", championName: "" }];
    });
    expect(erro).toContain("Série 4a-jogo-05 (C x D) › jogo 1 › ban 1 › campeão: não pode ficar vazio");
    // Antes: o caminho pelo índice e a mensagem do Zod em inglês.
    expect(erro).not.toContain("seriesMatches.1");
    expect(erro).not.toMatch(/too small|expected/i);
  });

  it("duração 0", async () => {
    const erro = await erroDoPut((_s, jogo) => {
      jogo.durationMin = 0;
    });
    expect(erro).toContain("Série 4a-jogo-05 (C x D) › jogo 1 › duração (min): precisa ser maior que 0");
  });

  it("cartinha sem time (a opção 'Time' vazia do select)", async () => {
    const erro = await erroDoPut((serie) => {
      serie.cardsUsed = [{ teamId: "", cardId: "TUDO_LIBERADO" }];
    });
    expect(erro).toContain("Série 4a-jogo-05 (C x D) › cartinha 1 › time: não pode ficar vazio");
  });

  it("as regras de integridade, que já nascem em português, passam como estão", async () => {
    const erro = await erroDoPut((_s, jogo) => {
      jogo.winnerTeamId = "a";
    });
    expect(erro).toContain("Jogo 1 da série 4a-jogo-05 tem um vencedor que não é nenhum dos dois times.");
  });
});

describe("a importação de backup", () => {
  it("recusa com a mesma linguagem", async () => {
    const backup = datasetDoDia() as unknown as { teams: Record<string, unknown>[] };
    backup.teams[2]!.name = "";
    await expect(importDatasetFromText(JSON.stringify(backup))).rejects.toThrow(
      "Validação falhou: Time c › nome: não pode ficar vazio",
    );
  });
});

describe("descreverProblemasDoDataset", () => {
  it("dentro de uma temporada arquivada, usa os times do retrato", () => {
    const d = datasetDoDia() as unknown as Record<string, unknown>;
    const retrato = datasetDoDia() as unknown as { seriesMatches: Record<string, unknown>[]; teams: Record<string, unknown>[] };
    retrato.teams = retrato.teams.map((t) => ({ ...t, name: `${String(t.name)} (3ª)` }));
    retrato.seriesMatches[0]!.games = [{ ...jogoCD(), winnerTeamId: "a", mvpPlayerId: "a1", durationMin: -1 }];
    d.archivedSeasons = [
      {
        seasonId: "season-3",
        name: "3ª Edição",
        archivedAtISO: "2026-08-03T00:00:00.000Z",
        endedAtISO: "2026-08-02T17:00:00.000Z",
        snapshot: { ...retrato, archivedSeasons: undefined },
      },
    ];
    const parsed = tournamentDatasetSchema.safeParse(d);
    expect(parsed.success).toBe(false);
    const texto = descreverProblemasDoDataset(parsed.error!.issues, d);
    expect(texto).toContain("Temporada arquivada 3ª Edição › Série 4a-jogo-04 (A (3ª) x B (3ª)) › jogo 1 › duração (min)");
  });
});
