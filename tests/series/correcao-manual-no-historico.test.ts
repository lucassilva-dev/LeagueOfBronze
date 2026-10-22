import { beforeEach, describe, expect, it, vi } from "vitest";

import type { SeriesMatch, TournamentDataset } from "@/lib/schema";

/**
 * CORREÇÃO MANUAL DE LADO OU CARTA PELO EDITOR ENTRA NO HISTÓRICO.
 *
 * O painel deixa trocar a cartinha (ou o lado azul) num select e salvar pelo PUT do
 * dataset, e esse caminho não deixava rastro: a página da partida continuava mostrando,
 * embaixo da carta nova, as letras, a semente e o autor do sorteio ANTERIOR — como se a
 * semente tivesse produzido a carta exibida. As rotas de correção (`/series/cards` e
 * `/series/sides`) já registravam; faltava o caminho que o painel de fato usa.
 */
vi.mock("@supabase/supabase-js", async () => {
  const m = await import("./_tournament-state-em-memoria");
  return { createClient: () => m.clienteFalso };
});

vi.mock("@/lib/security/route-guard", async () => {
  const { sessao } = await import("./_tournament-state-em-memoria");
  return {
    mesmaOrigem: () => true,
    requireAdmin: async () => ({ ok: true, identity: sessao.identity }),
  };
});

import {
  datasetDoDia,
  gravado,
  ligarSupabaseFalso,
  MASTER,
  req,
  sessao,
  zerarBanco,
} from "./_tournament-state-em-memoria";

ligarSupabaseFalso();

const { PUT } = await import("@/app/api/admin/dataset/route");

type Sorteio = NonNullable<SeriesMatch["sorteios"]>[number];

const SORTEIO_DA_CARTA: Sorteio = {
  tipo: "carta",
  semente: "a".repeat(32),
  emISO: "2026-11-21T18:00:00.000Z",
  autor: "nakay",
  teamId: "c",
  resultado: "ABCDRAFT",
  detalhe: { letras: ["A", "C"] },
};

const SORTEIO_DO_LADO: Sorteio = {
  tipo: "lados",
  semente: "b".repeat(32),
  emISO: "2026-11-21T17:55:00.000Z",
  autor: "nakay",
  resultado: "c",
};

/** A série 5 já sorteada (lado C, carta ABCDRAFT para C) — e o painel VIU o sorteio. */
function sorteado(): TournamentDataset {
  const d = datasetDoDia();
  const s = d.seriesMatches.find((x) => x.id === "4a-jogo-05")!;
  s.blueSideTeamId = "c";
  s.cardsUsed = [{ teamId: "c", cardId: "ABCDRAFT" }];
  s.sorteios = [SORTEIO_DO_LADO, SORTEIO_DA_CARTA];
  return d;
}

beforeEach(() => {
  ligarSupabaseFalso();
  zerarBanco(sorteado(), 7);
  sessao.identity = { ...MASTER, username: "lucas" };
});

describe("o editor troca a carta ou o lado à mão", () => {
  it("trocar ABCDRAFT por TUDO_LIBERADO grava um registro carta_manual com o que foi sobrescrito", async () => {
    const rascunho = sorteado();
    rascunho.seriesMatches.find((x) => x.id === "4a-jogo-05")!.cardsUsed = [{ teamId: "c", cardId: "TUDO_LIBERADO" }];

    const r = await PUT(req({ dataset: rascunho, versao: 7 }));
    expect(r.status).toBe(200);

    const s5 = gravado().seriesMatches.find((x) => x.id === "4a-jogo-05")!;
    expect(s5.cardsUsed).toEqual([{ teamId: "c", cardId: "TUDO_LIBERADO" }]);
    // Antes: o histórico continuava só com o sorteio de ABCDRAFT (e as letras A · C).
    expect(s5.sorteios).toHaveLength(3);
    expect(s5.sorteios![2]).toMatchObject({
      tipo: "carta_manual",
      semente: "",
      autor: "lucas",
      teamId: "c",
      resultado: "TUDO_LIBERADO",
      detalhe: { sobrescreveu: "ABCDRAFT" },
    });
    // O que a página mostra como "último sorteio de carta" deixa de ser o ABCDRAFT.
    const ultimaCarta = [...s5.sorteios!].reverse().find((x) => x.tipo === "carta" || x.tipo === "carta_manual");
    expect(ultimaCarta?.resultado).toBe("TUDO_LIBERADO");
    expect(ultimaCarta?.detalhe?.letras).toBeUndefined();
  });

  it("trocar o lado azul grava lados_manual; apagar grava o valor «removido»", async () => {
    const trocado = sorteado();
    trocado.seriesMatches.find((x) => x.id === "4a-jogo-05")!.blueSideTeamId = "d";
    expect((await PUT(req({ dataset: trocado, versao: 7 }))).status).toBe(200);

    let s5 = gravado().seriesMatches.find((x) => x.id === "4a-jogo-05")!;
    expect(s5.sorteios!.at(-1)).toMatchObject({ tipo: "lados_manual", resultado: "d", detalhe: { sobrescreveu: "c" } });

    // O painel adota o que o servidor devolveu (com o registro novo) e apaga o lado.
    const apagado = gravado();
    delete apagado.seriesMatches.find((x) => x.id === "4a-jogo-05")!.blueSideTeamId;
    expect((await PUT(req({ dataset: apagado, versao: 8 }))).status).toBe(200);

    s5 = gravado().seriesMatches.find((x) => x.id === "4a-jogo-05")!;
    expect(s5.blueSideTeamId).toBeUndefined();
    expect(s5.sorteios!.at(-1)).toMatchObject({ tipo: "lados_manual", resultado: "removido", detalhe: { sobrescreveu: "d" } });
  });

  it("salvar sem mexer em lado nem carta não inventa registro", async () => {
    const rascunho = sorteado();
    rascunho.teams[0]!.name = "A (editado)";
    expect((await PUT(req({ dataset: rascunho, versao: 7 }))).status).toBe(200);
    expect(gravado().seriesMatches.find((x) => x.id === "4a-jogo-05")!.sorteios).toHaveLength(2);
  });

  it("no teto do histórico recusa a correção em vez de descartar registro antigo", async () => {
    const cheio = sorteado();
    const s = cheio.seriesMatches.find((x) => x.id === "4a-jogo-05")!;
    s.sorteios = Array.from({ length: 50 }, (_, i) => ({ ...SORTEIO_DO_LADO, emISO: `2026-11-21T17:${String(i).padStart(2, "0")}:00.000Z` }));
    zerarBanco(cheio, 7);

    const rascunho = structuredClone(cheio);
    rascunho.seriesMatches.find((x) => x.id === "4a-jogo-05")!.cardsUsed = [{ teamId: "c", cardId: "TUDO_LIBERADO" }];
    const r = await PUT(req({ dataset: rascunho, versao: 7 }));
    expect(r.status).toBe(400);
    expect(((await r.json()) as { error: string }).error).toContain("4a-jogo-05");
    expect(gravado().seriesMatches.find((x) => x.id === "4a-jogo-05")!.sorteios).toHaveLength(50);
  });
});
