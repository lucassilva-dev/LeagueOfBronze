import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { criarBancoSimulado } from "./_banco-simulado";

/**
 * DIFF-BE-02 — fechar e depois reabrir as inscrições apagava a data de fechamento planejada.
 *
 * A primeira correção do CEN-02 carimbava «agora» no fechamento ao FECHAR (por cima da data
 * planejada) e, ao REABRIR com esse carimbo já vencido, gravava nulo. Ciclo real: vagas
 * cheias em 25/10, alguém desiste em 27/10 — e a janela ficava aberta para sempre, cobrando
 * o Pix de quem chegasse no dia do jogo.
 *
 * Agora abrir/fechar não toca no fechamento. O «encerrada» depois de fechar (CEN-02) vem da
 * LEITURA: chave desligada com a abertura no passado. E o caso «nunca abriu» continua
 * «em breve».
 */

const estado = vi.hoisted(() => ({
  banco: null as unknown as ReturnType<typeof import("./_banco-simulado").criarBancoSimulado>,
}));

vi.mock("@/lib/data-store", () => ({
  isSupabaseConfigured: () => true,
  createSupabaseAdminClient: () => estado.banco.cliente(),
}));

const store = await import("@/lib/inscricoes/store");
const { estadoDaJanela } = await import("@/lib/inscricoes/schema");

const FECHAMENTO_PLANEJADO = "2026-11-15T23:59:00.000Z";

function iniciar(linha: Record<string, unknown>) {
  estado.banco = criarBancoSimulado();
  estado.banco.tabelas = {
    edicao_config: [
      {
        id: 1,
        inscricoes_abertas: true,
        abertura_inscricoes: "2026-10-05T12:00:00.000Z",
        fechamento_inscricoes: FECHAMENTO_PLANEJADO,
        inicio_campeonato: "2026-11-20T23:00:00.000Z",
        taxa_centavos: 2000,
        chave_pix: null,
        ...linha,
      },
    ],
    inscricoes: [],
  };
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  iniciar({});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.useRealTimers();
});

describe("fechar → reabrir → a data planejada chega → fecha sozinha", () => {
  it("25/10 fecha, 27/10 reabre: a data de 15/11 sobrevive e fecha a janela sozinha", async () => {
    vi.setSystemTime(Date.parse("2026-10-25T15:00:00.000Z"));
    const fechada = await store.salvarConfig({ inscricoes_abertas: false }, "lucas");
    expect(fechada.fechamento_inscricoes).toBe(FECHAMENTO_PLANEJADO);
    // Fechada pela chave, com a abertura no passado: «encerrada», não «em breve» (CEN-02).
    expect(estadoDaJanela(fechada as never, Date.parse("2026-10-26T12:00:00.000Z"))).toBe("encerrada");

    vi.setSystemTime(Date.parse("2026-10-27T15:00:00.000Z"));
    const reaberta = await store.salvarConfig({ inscricoes_abertas: true }, "lucas");
    expect(reaberta.fechamento_inscricoes).toBe(FECHAMENTO_PLANEJADO);
    expect(estadoDaJanela(reaberta as never, Date.parse("2026-10-28T12:00:00.000Z"))).toBe("aberta");

    // A data planejada chega: fecha sozinha, sem ninguém acordado.
    expect(estadoDaJanela(reaberta as never, Date.parse(FECHAMENTO_PLANEJADO) - 1)).toBe("aberta");
    expect(estadoDaJanela(reaberta as never, Date.parse(FECHAMENTO_PLANEJADO))).toBe("encerrada");
    // Dia de jogo: nada de formulário aberto cobrando Pix.
    expect(estadoDaJanela(reaberta as never, Date.parse("2026-11-21T15:00:00.000Z"))).toBe("encerrada");
  });

  it("sem data planejada: fechar e reabrir não inventam data, e a janela volta a abrir", async () => {
    iniciar({ fechamento_inscricoes: null });
    vi.setSystemTime(Date.parse("2026-10-25T15:00:00.000Z"));
    const fechada = await store.salvarConfig({ inscricoes_abertas: false }, "lucas");
    expect(fechada.fechamento_inscricoes).toBeNull();
    expect(estadoDaJanela(fechada as never, Date.parse("2026-10-26T12:00:00.000Z"))).toBe("encerrada");

    vi.setSystemTime(Date.parse("2026-10-27T15:00:00.000Z"));
    const reaberta = await store.salvarConfig({ inscricoes_abertas: true }, "lucas");
    expect(reaberta.fechamento_inscricoes).toBeNull();
    expect(estadoDaJanela(reaberta as never, Date.parse("2026-10-28T12:00:00.000Z"))).toBe("aberta");
  });
});

describe("a abertura fica registrada, para a leitura saber que a janela já abriu", () => {
  it("abrir sem abertura registrada grava agora; fechar depois dá «encerrada»", async () => {
    iniciar({ inscricoes_abertas: false, abertura_inscricoes: null, fechamento_inscricoes: null });
    vi.setSystemTime(Date.parse("2026-10-05T12:13:35.000Z"));
    const aberta = await store.salvarConfig({ inscricoes_abertas: true }, "lucas");
    expect(aberta.abertura_inscricoes).toBe("2026-10-05T12:13:35.000Z");

    vi.setSystemTime(Date.parse("2026-10-25T15:00:00.000Z"));
    const fechada = await store.salvarConfig({ inscricoes_abertas: false }, "lucas");
    expect(estadoDaJanela(fechada as never, Date.parse("2026-10-26T12:00:00.000Z"))).toBe("encerrada");
  });

  it("janela aberta de antes, sem abertura registrada: fechar registra a abertura e dá «encerrada»", async () => {
    iniciar({ abertura_inscricoes: null, fechamento_inscricoes: null });
    vi.setSystemTime(Date.parse("2026-10-25T15:00:00.000Z"));
    const fechada = await store.salvarConfig({ inscricoes_abertas: false }, "lucas");
    expect(fechada.abertura_inscricoes).toBe("2026-10-25T15:00:00.000Z");
    expect(estadoDaJanela(fechada as never, Date.parse("2026-10-26T12:00:00.000Z"))).toBe("encerrada");
  });

  it("abertura já registrada no passado não é reescrita", async () => {
    vi.setSystemTime(Date.parse("2026-10-25T15:00:00.000Z"));
    const fechada = await store.salvarConfig({ inscricoes_abertas: false }, "lucas");
    expect(fechada.abertura_inscricoes).toBe("2026-10-05T12:00:00.000Z");
  });

  it("abertura enviada junto vale como veio", async () => {
    iniciar({ inscricoes_abertas: false, abertura_inscricoes: null, fechamento_inscricoes: null });
    vi.setSystemTime(Date.parse("2026-10-05T12:13:35.000Z"));
    const aberta = await store.salvarConfig(
      { inscricoes_abertas: true, abertura_inscricoes: "2026-10-05T12:00:00.000Z" },
      "lucas",
    );
    expect(aberta.abertura_inscricoes).toBe("2026-10-05T12:00:00.000Z");
  });
});

describe("«nunca abriu» continua «em breve»", () => {
  const AGORA = Date.parse("2026-10-01T12:00:00.000Z");

  it("chave desligada, sem abertura nem fechamento", () => {
    expect(
      estadoDaJanela({ inscricoes_abertas: false, abertura_inscricoes: null, fechamento_inscricoes: null }, AGORA),
    ).toBe("ainda_nao_abriu");
  });

  it("chave desligada com abertura e fechamento planejados no futuro", () => {
    expect(
      estadoDaJanela(
        {
          inscricoes_abertas: false,
          abertura_inscricoes: "2026-10-05T12:00:00.000Z",
          fechamento_inscricoes: FECHAMENTO_PLANEJADO,
        },
        AGORA,
      ),
    ).toBe("ainda_nao_abriu");
  });

  it("data lixo na abertura não inventa veredicto", () => {
    expect(
      estadoDaJanela({ inscricoes_abertas: false, abertura_inscricoes: "nao-e-data", fechamento_inscricoes: null }, AGORA),
    ).toBe("ainda_nao_abriu");
  });

  it("chave desligada com a abertura no passado: «encerrada»", () => {
    expect(
      estadoDaJanela(
        { inscricoes_abertas: false, abertura_inscricoes: "2026-09-20T12:00:00.000Z", fechamento_inscricoes: null },
        AGORA,
      ),
    ).toBe("encerrada");
  });
});
