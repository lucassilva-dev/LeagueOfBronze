import { afterEach, describe, expect, it, vi } from "vitest";

import { ErroDeRegra } from "@/lib/security/erros";
import { respostaDeErro } from "@/lib/security/resposta-erro";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("resposta de erro das rotas de admin", () => {
  it("mostra a regra de negócio para o usuário", async () => {
    const r = respostaDeErro("teste", new ErroDeRegra("A temporada atual já está encerrada."), "genérica");
    expect(r.status).toBe(400);
    await expect(r.json()).resolves.toEqual({ error: "A temporada atual já está encerrada." });
  });

  it("NÃO devolve detalhe de banco ao cliente", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    const vazamento = new Error(
      'Falha ao salvar no Supabase (tournament_state). Detalhe: new row violates row-level security policy for table "tournament_state"',
    );
    const r = respostaDeErro("admin/dataset PUT", vazamento, "Falha ao salvar os dados do campeonato.");
    const corpo = (await r.json()) as { error: string; ref: string };

    expect(r.status).toBe(500);
    expect(corpo.error).toBe("Falha ao salvar os dados do campeonato.");
    expect(JSON.stringify(corpo)).not.toContain("tournament_state");
    expect(JSON.stringify(corpo)).not.toContain("row-level security");
    expect(corpo.ref).toMatch(/^[0-9a-f]{8}$/);
  });

  it("o detalhe real vai para o log do servidor, com o mesmo código de referência", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});

    const r = respostaDeErro("admin/import", new Error("segredo interno"), "Falha ao importar JSON.");
    const { ref } = (await r.json()) as { ref: string };

    expect(log).toHaveBeenCalledTimes(1);
    const [prefixo, erroLogado] = log.mock.calls[0];
    expect(String(prefixo)).toContain(`ref=${ref}`);
    expect((erroLogado as Error).message).toBe("segredo interno");
  });

  it("cada falha ganha um código de referência diferente", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const a = (await respostaDeErro("x", new Error("a"), "g").json()) as { ref: string };
    const b = (await respostaDeErro("x", new Error("b"), "g").json()) as { ref: string };
    expect(a.ref).not.toBe(b.ref);
  });

  it("lida com throw de coisa que não é Error", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const r = respostaDeErro("x", "string solta", "Falha genérica.");
    expect(r.status).toBe(500);
    await expect(r.json()).resolves.toMatchObject({ error: "Falha genérica." });
  });
});
