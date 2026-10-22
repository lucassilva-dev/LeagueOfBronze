import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * AS MENSAGENS DE CONFLITO (409) DIZEM O QUE FAZER, EM PORTUGUÊS CORRETO.
 *
 * O 409 do dataset mandava "salve novamente para sobrescrever" — mas o Salvar normal
 * reenvia a MESMA versão e leva o mesmo 409; quem sobrescreve é só o botão do aviso. E
 * encerrar/iniciar em conflito diziam "enquanto você encerrar a temporada".
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
  gravarPorFora,
  ligarSupabaseFalso,
  MASTER,
  req,
  sessao,
  zerarBanco,
} from "../series/_tournament-state-em-memoria";

ligarSupabaseFalso();

const { PUT } = await import("@/app/api/admin/dataset/route");
const { POST: ENCERRAR } = await import("@/app/api/admin/tournament/end/route");
const { POST: INICIAR } = await import("@/app/api/admin/tournament/start/route");

beforeEach(() => {
  ligarSupabaseFalso();
  zerarBanco(datasetDoDia(), 7);
  sessao.identity = { ...MASTER };
});

/** Outra pessoa grava logo antes da 1ª tentativa de gravação desta requisição. */
function alguemGravaNoMeio() {
  banco.antesDeGravar.set(1, () => gravarPorFora((d) => void (d.teams[3]!.name = "D (de outra pessoa)")));
}

describe("409 do Salvar", () => {
  it("aponta para o aviso do painel, e não para «salve novamente»", async () => {
    const rascunho = datasetDoDia();
    rascunho.teams[0]!.name = "A (editado)";
    const r = await PUT(req({ dataset: rascunho, versao: 6 }));
    expect(r.status).toBe(409);
    const { error } = (await r.json()) as { error: string };
    expect(error).not.toMatch(/salve novamente/i);
    expect(error).toContain("Outra pessoa salvou alterações enquanto você editava.");
    expect(error).toContain("salve por cima");
  });
});

describe("409 do ciclo de vida", () => {
  it("encerrar: «enquanto você encerrava a temporada»", async () => {
    alguemGravaNoMeio();
    const r = await ENCERRAR(req({}, "POST"));
    expect(r.status).toBe(409);
    expect(((await r.json()) as { error: string }).error).toBe(
      "Alguém salvou o campeonato enquanto você encerrava a temporada. Recarregue e tente de novo.",
    );
  });

  it("iniciar: «enquanto você iniciava a nova temporada»", async () => {
    const semSeries = datasetDoDia();
    semSeries.seriesMatches = [];
    zerarBanco(semSeries, 7);
    alguemGravaNoMeio();

    const r = await INICIAR(req({ name: "5ª Edição", format: "BO3", archiveCurrent: false, confirm: true }, "POST"));
    expect(r.status).toBe(409);
    expect(((await r.json()) as { error: string }).error).toBe(
      "Alguém salvou o campeonato enquanto você iniciava a nova temporada. Recarregue e tente de novo.",
    );
  });
});
