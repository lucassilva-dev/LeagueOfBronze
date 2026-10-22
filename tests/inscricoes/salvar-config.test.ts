import type { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { auditorias, criarBancoSimulado } from "./_banco-simulado";

/**
 * Salvar a configuração da edição — três coisas que não podem depender de a tela lembrar:
 *
 *  - CEN-02: «Fechar inscrições» manda só a chave. Com a data de fechamento nula, a janela
 *    voltava a «ainda não abriu» e o site público anunciava «INSCRIÇÕES EM BREVE» com 30
 *    pessoas inscritas e o draft marcado.
 *  - DIFF-BE-02: a primeira correção do CEN-02 carimbava «agora» no fechamento ao fechar, e
 *    reabrir zerava o carimbo: a data planejada sumia e a janela ficava aberta para sempre.
 *    Agora abrir/fechar não toca no fechamento; o «encerrada» vem da abertura registrada.
 *  - RIOT-02: mudar o início do campeonato muda a janela do item (e); a contagem de
 *    partidas da janela velha não pode valer na nova.
 *  - P4A-11: quem mudou o quê, com o valor de antes, fica na auditoria.
 */

const estado = vi.hoisted(() => ({
  banco: null as unknown as ReturnType<typeof import("./_banco-simulado").criarBancoSimulado>,
}));

vi.mock("@/lib/data-store", () => ({
  isSupabaseConfigured: () => true,
  createSupabaseAdminClient: () => estado.banco.cliente(),
}));

vi.mock("@/lib/security/route-guard", () => ({
  mesmaOrigem: () => true,
  requireAdmin: async () => ({ ok: true, identity: { username: "lucas", isMaster: true, scopes: [] } }),
}));

const store = await import("@/lib/inscricoes/store");
const { estadoDaJanela } = await import("@/lib/inscricoes/schema");
const { PATCH } = await import("@/app/api/admin/edicao/route");

const AGORA = Date.parse("2026-11-12T15:00:00.000Z");

function req(corpo: unknown): NextRequest {
  const texto = JSON.stringify(corpo);
  return {
    method: "PATCH",
    headers: new Headers({ host: "x", "sec-fetch-site": "same-origin" }),
    text: async () => texto,
  } as unknown as NextRequest;
}

const config = () => estado.banco.tabelas.edicao_config![0]!;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(AGORA);
  estado.banco = criarBancoSimulado();
  estado.banco.tabelas = {
    edicao_config: [
      {
        id: 1,
        inscricoes_abertas: true,
        abertura_inscricoes: "2026-10-05T12:00:00.000Z",
        fechamento_inscricoes: null,
        inicio_campeonato: "2026-11-20T23:00:00.000Z",
        taxa_centavos: 2000,
        chave_pix: null,
      },
    ],
    inscricoes: [
      { id: "i1", riot_partidas_janela: 7 },
      { id: "i2", riot_partidas_janela: 2 },
      { id: "i3", riot_partidas_janela: null },
    ],
  };
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.useRealTimers();
});

describe("fechar é fechar (CEN-02), sem apagar a data planejada (DIFF-BE-02)", () => {
  it("fechar com a data de fechamento vazia: a janela fica «encerrada», não «ainda não abriu» — e nenhuma data é inventada", async () => {
    const salva = await store.salvarConfig({ inscricoes_abertas: false }, "lucas");
    expect(salva.fechamento_inscricoes).toBeNull();
    expect(estadoDaJanela(salva as never, AGORA + 1000)).toBe("encerrada");
  });

  it("fechar antes de uma data de fechamento futura: «encerrada», e a data planejada continua lá", async () => {
    config().fechamento_inscricoes = "2026-11-15T00:00:00.000Z";
    const salva = await store.salvarConfig({ inscricoes_abertas: false }, "lucas");
    expect(salva.fechamento_inscricoes).toBe("2026-11-15T00:00:00.000Z");
    expect(estadoDaJanela(salva as never, AGORA + 1000)).toBe("encerrada");
  });

  it("reabrir com o fechamento já vencido NÃO apaga a data: a janela segue «encerrada» até a tela mandar outra", async () => {
    config().inscricoes_abertas = false;
    config().fechamento_inscricoes = "2026-11-10T00:00:00.000Z";
    const salva = await store.salvarConfig({ inscricoes_abertas: true }, "lucas");
    expect(salva.fechamento_inscricoes).toBe("2026-11-10T00:00:00.000Z");
    expect(estadoDaJanela(salva as never, AGORA + 1000)).toBe("encerrada");
    // Com a data nova junto, reabre de verdade.
    const reaberta = await store.salvarConfig(
      { inscricoes_abertas: true, fechamento_inscricoes: "2026-11-18T00:00:00.000Z" },
      "lucas",
    );
    expect(estadoDaJanela(reaberta as never, AGORA + 1000)).toBe("aberta");
  });

  it("a data enviada junto vale como veio", async () => {
    const salva = await store.salvarConfig(
      { inscricoes_abertas: false, fechamento_inscricoes: "2026-11-30T00:00:00.000Z" },
      "lucas",
    );
    expect(salva.fechamento_inscricoes).toBe("2026-11-30T00:00:00.000Z");
  });

  it("mexer em outra coisa não toca no fechamento", async () => {
    const salva = await store.salvarConfig({ taxa_centavos: 2500 }, "lucas");
    expect(salva.fechamento_inscricoes).toBeNull();
    expect(salva.inscricoes_abertas).toBe(true);
  });
});

describe("início novo, contagem nova (RIOT-02)", () => {
  it("adiar o início zera a contagem de partidas de todo mundo, ANTES de gravar a configuração", async () => {
    await store.salvarConfig({ inicio_campeonato: "2026-11-22T23:00:00.000Z" }, "lucas");
    expect(estado.banco.tabelas.inscricoes!.map((i) => i.riot_partidas_janela)).toEqual([null, null, null]);

    const ordem = estado.banco.operacoes.filter((o) => o.op === "update").map((o) => o.tabela);
    expect(ordem).toEqual(["inscricoes", "edicao_config"]);
  });

  it("o mesmo instante escrito com outro fuso não é mudança", async () => {
    await store.salvarConfig({ inicio_campeonato: "2026-11-20T20:00:00.000-03:00" }, "lucas");
    expect(estado.banco.tabelas.inscricoes!.map((i) => i.riot_partidas_janela)).toEqual([7, 2, null]);
  });

  it("se zerar falhar, a configuração não é gravada (salvar de novo zera)", async () => {
    estado.banco.falha = (tabela, op) => (tabela === "inscricoes" && op === "update" ? "rede caiu" : null);
    await expect(store.salvarConfig({ inicio_campeonato: "2026-11-22T23:00:00.000Z" }, "lucas")).rejects.toThrow(
      /zerar a contagem/,
    );
    expect(config().inicio_campeonato).toBe("2026-11-20T23:00:00.000Z");
  });
});

describe("auditoria da configuração (P4A-11)", () => {
  it("registra quem mudou, o valor de antes e o de depois — só dos campos enviados", async () => {
    await store.salvarConfig({ taxa_centavos: 2500, inscricoes_abertas: false }, "lucas");
    const registros = auditorias(estado.banco);
    expect(registros).toHaveLength(1);
    expect(registros[0]).toMatchObject({
      autor: "lucas",
      acao: "config",
      inscricao_id: null,
      detalhe: {
        antes: { taxa_centavos: 2000, inscricoes_abertas: true },
        depois: { taxa_centavos: 2500, inscricoes_abertas: false },
      },
    });
    // Fechar não mexe mais na data de fechamento (DIFF-BE-02): ela nem entra no registro.
    expect((registros[0]!.detalhe as { depois: object }).depois).not.toHaveProperty("fechamento_inscricoes");
  });

  it("pela rota, o autor é quem está logado", async () => {
    const r = await PATCH(req({ acao: "config", dados: { taxa_centavos: 3000 } }));
    expect(r.status).toBe(200);
    expect(auditorias(estado.banco)[0]).toMatchObject({ autor: "lucas", acao: "config" });
  });
});

describe("chave Pix pela rota (INS-06)", () => {
  it("recusada: 400 com o motivo em português, e nada é gravado", async () => {
    const r = await PATCH(req({ acao: "config", dados: { chave_pix: "(11) 98765-4321" } }));
    expect(r.status).toBe(400);
    expect((await r.json()).error).toMatch(/comece com \+55/);
    expect(config().chave_pix).toBeNull();
  });

  it("aceita: gravada no formato do DICT", async () => {
    const r = await PATCH(req({ acao: "config", dados: { chave_pix: "+55 (11) 98765-4321" } }));
    expect(r.status).toBe(200);
    expect(config().chave_pix).toBe("+5511987654321");
  });

  it("outro campo inválido continua com a mensagem genérica", async () => {
    const r = await PATCH(req({ acao: "config", dados: { taxa_centavos: -1 } }));
    expect(r.status).toBe(400);
    expect((await r.json()).error).toBe("Configuração inválida.");
  });
});
