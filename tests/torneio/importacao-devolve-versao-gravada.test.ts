import { beforeEach, describe, expect, it, vi } from "vitest";

import type { TournamentDataset } from "@/lib/schema";

/**
 * A IMPORTAÇÃO DEVOLVE A VERSÃO EM QUE A GRAVAÇÃO CAIU — NÃO A DE UMA RELEITURA.
 *
 * A rota gravava o backup e depois relia a versão. Entre as duas coisas cabe a gravação de
 * outra pessoa (o sorteio de lados da série seguinte, na cerimônia): a resposta saía com o
 * dataset IMPORTADO (sem o lado sorteado) carimbado com a versão do SORTEIO. O painel
 * adotava o par, e o Salvar seguinte passava na trava e devolvia o lado ao valor do backup.
 *
 * Rota e `lib/data-store.ts` de verdade; só o cliente do Supabase e o `requireAdmin` são
 * trocados.
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
  banco,
  datasetDoDia,
  gravado,
  gravarPorFora,
  ligarSupabaseFalso,
  MASTER,
  req,
  sessao,
  zerarBanco,
} from "../series/_tournament-state-em-memoria";

ligarSupabaseFalso();

const { POST: IMPORTAR } = await import("@/app/api/admin/import/route");
const { PUT } = await import("@/app/api/admin/dataset/route");

beforeEach(() => {
  ligarSupabaseFalso();
  zerarBanco(datasetDoDia(), 7);
  sessao.identity = { ...MASTER };
});

describe("restaurar backup no meio de uma cerimônia", () => {
  it("a resposta traz a versão da importação, e o Salvar seguinte esbarra no sorteio (409)", async () => {
    const backup = datasetDoDia();
    backup.teams[1]!.name = "B (do backup)";

    // Logo depois da gravação da importação (a 1ª), o sorteio de lados da série 5 grava.
    banco.depoisDaGravacao.set(1, () =>
      gravarPorFora((d) => {
        const s = d.seriesMatches.find((x) => x.id === "4a-jogo-05")!;
        s.blueSideTeamId = "c";
        s.sorteios = [{ tipo: "lados", semente: "xyz", emISO: "2026-11-21T18:20:00.000Z", autor: "nakay", resultado: "c" }];
      }),
    );

    const r = await IMPORTAR(req({ text: JSON.stringify(backup) }, "POST"));
    expect(r.status).toBe(200);
    const corpo = (await r.json()) as { dataset: TournamentDataset; versao: number };
    // Antes: 9 (a do sorteio, lida depois) junto com o dataset sem o sorteio.
    expect(corpo.versao).toBe(8);
    expect(banco.linha!.version).toBe(9);

    // O painel adota o par e segue editando: a trava agora enxerga o sorteio no meio.
    corpo.dataset.teams[2]!.name = "C (editado)";
    const salvar = await PUT(req({ dataset: corpo.dataset, versao: corpo.versao }));
    expect(salvar.status).toBe(409);
    expect(gravado().seriesMatches.find((s) => s.id === "4a-jogo-05")!.blueSideTeamId).toBe("c");
  });

  it("sem ninguém no meio, o Salvar seguinte passa direto", async () => {
    const backup = datasetDoDia();
    backup.teams[1]!.name = "B (do backup)";

    const corpo = (await (await IMPORTAR(req({ text: JSON.stringify(backup) }, "POST"))).json()) as {
      dataset: TournamentDataset;
      versao: number;
    };
    expect(corpo.versao).toBe(8);
    corpo.dataset.teams[2]!.name = "C (editado)";
    expect((await PUT(req({ dataset: corpo.dataset, versao: corpo.versao }))).status).toBe(200);
  });
});
