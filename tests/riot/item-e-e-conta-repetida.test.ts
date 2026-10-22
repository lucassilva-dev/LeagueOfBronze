import { beforeEach, describe, expect, it, vi } from "vitest";

import { criarBancoSimulado } from "../inscricoes/_banco-simulado";

/**
 * O robô e o item (e) — partidas nos 10 dias antes do início (regra 4) — e a mesma conta da
 * Riot em duas inscrições.
 *
 *  - P4A-01 / RIOT-01: o atalho «Pendentes → Cumpre» da gaveta gravava o (e) intocado como
 *    «não avaliável» com o nome do organizador, e o robô nunca mais contava as partidas
 *    daquela pessoa. «Não avaliável» SEM observação é falta de base, não veredicto: volta
 *    ao robô. Com observação, foi alguém decidindo de propósito — continua do humano.
 *  - RIOT-02: a contagem parcial (2 de 5 na véspera) não congela em «risco» só porque as
 *    rodadas seguintes falharam: quem está abaixo do mínimo é recontado.
 *  - RIOT-05: a conta que já está em outra inscrição ativa (mesmo PUUID, outra grafia) fica
 *    com o (m) em risco, em vez de «Conta confirmada na Riot».
 */

const estado = vi.hoisted(() => ({
  banco: null as unknown as ReturnType<typeof import("../inscricoes/_banco-simulado").criarBancoSimulado>,
}));

vi.mock("@/lib/data-store", () => ({
  isSupabaseConfigured: () => true,
  createSupabaseAdminClient: () => estado.banco.cliente(),
}));

const { AUTOR_RIOT, decidirSincronizacao, itemEhDoRobo, precisaContarPartidas } = await import("@/lib/riot/decidir");
const { aplicarSincronizacao } = await import("@/lib/inscricoes/store");

type Conferencia = Parameters<typeof itemEhDoRobo>[0] & object;

const INICIO = "2026-11-20T23:00:00.000Z";
const INICIO_MS = Date.parse(INICIO);
const DIA = 24 * 60 * 60 * 1000;
/** Janela do (e) aberta (começa 10 dias antes do início). */
const JANELA_ABERTA = INICIO_MS - 5 * DIA;

const inscrito = {
  nick: "Fulano",
  tag: "BR1",
  situacao: "pendente",
  elo_declarado: "Ouro",
  elo_verificado: null,
  elo_congelado: null,
  elo_fonte: null,
  pontos: 4,
  riot_regiao: "br1",
  riot_partidas_janela: null,
};

function conferencias(e: Partial<Conferencia> = {}): Conferencia[] {
  return ["a", "b", "d", "e", "f", "m"].map((item) => ({
    item,
    estado: "pendente",
    observacao: null,
    conferido_por: null,
    ...(item === "e" && e),
  }));
}

const riot = (partidasNaJanela?: number, puuid = "p-1") => ({
  conta: { tipo: "ok" as const, puuid, gameName: "Fulano", tagLine: "BR1" },
  solo: { tier: "GOLD", divisao: "I", pdl: 10, vitorias: 10, derrotas: 10 },
  ...(partidasNaJanela !== undefined && { partidasNaJanela }),
});

const config = { congelamento_elo: null, inicio_campeonato: INICIO, min_ranqueadas: 5 };

const decisaoDoE = (c: Conferencia[], partidas: number, agoraMs = JANELA_ABERTA) =>
  decidirSincronizacao({ inscrito, conferencias: c, riot: riot(partidas), config, agoraMs }).itens.find(
    (i) => i.item === "e",
  );

// ---------------------------------------------------------------- de quem é o (e)

describe("o (e) «não avaliável» do atalho volta ao robô (P4A-01 / RIOT-01)", () => {
  it("«não avaliável» gravado por um organizador, sem observação, é do robô", () => {
    expect(itemEhDoRobo({ item: "e", estado: "nao_avaliavel", observacao: null, conferido_por: "lucas" })).toBe(true);
  });

  it("com observação escrita, continua do humano", () => {
    expect(
      itemEhDoRobo({ item: "e", estado: "nao_avaliavel", observacao: "conta nova, combinado no grupo", conferido_por: "lucas" }),
    ).toBe(false);
  });

  it("veredicto de verdade no (e), e «não avaliável» em outro item, continuam do humano", () => {
    expect(itemEhDoRobo({ item: "e", estado: "ok", observacao: null, conferido_por: "lucas" })).toBe(false);
    expect(itemEhDoRobo({ item: "e", estado: "risco", observacao: null, conferido_por: "lucas" })).toBe(false);
    expect(itemEhDoRobo({ item: "d", estado: "nao_avaliavel", observacao: null, conferido_por: "lucas" })).toBe(false);
  });

  it("janela aberta, Riot conta 2 de 5: o (e) do atalho vira «pendente» com o número, como o de ninguém", () => {
    const doAtalho = decisaoDoE(conferencias({ estado: "nao_avaliavel", conferido_por: "lucas" }), 2);
    const deNinguem = decisaoDoE(conferencias(), 2);
    expect(doAtalho).toMatchObject({ estado: "pendente", observacao: expect.stringMatching(/2 de 5/) });
    expect(doAtalho).toEqual(deNinguem);
  });

  it("depois do início, 0 partidas: o (e) do atalho vira «risco» (não fica «não avaliável» para sempre)", () => {
    const decisao = decisaoDoE(conferencias({ estado: "nao_avaliavel", conferido_por: "lucas" }), 0, INICIO_MS + DIA);
    expect(decisao?.estado).toBe("risco");
  });

  it("com observação do organizador, o robô não escreve no (e)", () => {
    const decisao = decisaoDoE(conferencias({ estado: "nao_avaliavel", conferido_por: "lucas", observacao: "combinado" }), 2);
    expect(decisao).toBeUndefined();
  });
});

describe("a gravação do robô no (e) usa a mesma condição, na mesma instrução", () => {
  const ID = "i-1";
  const linhaE = () => estado.banco.tabelas.inscricao_conferencias!.find((c) => c.item === "e")!;
  const linhaD = () => estado.banco.tabelas.inscricao_conferencias!.find((c) => c.item === "d")!;
  const decisao = {
    colunasRiot: { riot_partidas_janela: 2 },
    elo: null,
    itens: [
      { item: "e" as const, estado: "pendente" as const, observacao: "2 de 5 partidas na solo/duo até agora (regra 4).", retrato: {} },
      { item: "d" as const, estado: "ok" as const, observacao: "MD5 da solo/duo confirmada na Riot.", retrato: {} },
    ],
  };

  beforeEach(() => {
    estado.banco = criarBancoSimulado();
    estado.banco.tabelas = {
      inscricoes: [{ id: ID }],
      inscricao_conferencias: [
        { inscricao_id: ID, item: "e", estado: "nao_avaliavel", observacao: null, conferido_por: "lucas" },
        { inscricao_id: ID, item: "d", estado: "nao_avaliavel", observacao: null, conferido_por: "lucas" },
      ],
    };
  });

  it("(e) «não avaliável» do atalho é regravado pelo robô; o (d) do organizador não", async () => {
    const r = await aplicarSincronizacao(ID, decisao);
    expect(r.itensGravados).toBe(1);
    expect(linhaE()).toMatchObject({ estado: "pendente", conferido_por: AUTOR_RIOT });
    expect(linhaD()).toMatchObject({ estado: "nao_avaliavel", conferido_por: "lucas" });
  });

  it("se o organizador escreveu uma observação no meio da rodada, o WHERE não casa e nada muda", async () => {
    linhaE().observacao = "combinado no grupo";
    const r = await aplicarSincronizacao(ID, decisao);
    expect(r.itensGravados).toBe(0);
    expect(linhaE()).toMatchObject({ estado: "nao_avaliavel", conferido_por: "lucas" });
  });

  it("se o organizador deu veredicto no meio da rodada, o WHERE não casa e nada muda", async () => {
    linhaE().estado = "ok";
    await aplicarSincronizacao(ID, decisao);
    expect(linhaE()).toMatchObject({ estado: "ok", conferido_por: "lucas" });
  });
});

// ---------------------------------------------------------------- RIOT-02

describe("contagem parcial não vira definitiva (RIOT-02)", () => {
  const janela = (partidasGravadas: number | null, agoraMs: number) =>
    precisaContarPartidas({ inicioCampeonato: INICIO, partidasGravadas, minimo: 5, agoraMs });

  it("3 dias depois do início, com 2 de 5 gravadas (as rodadas de depois falharam): reconta a janela inteira", () => {
    expect(janela(2, INICIO_MS + 3 * DIA)).toEqual({ inicioS: (INICIO_MS - 10 * DIA) / 1000, fimS: INICIO_MS / 1000 });
  });

  it("quem já bateu o mínimo não gasta cota", () => {
    expect(janela(5, INICIO_MS + 3 * DIA)).toBeNull();
    expect(janela(7, JANELA_ABERTA)).toBeNull();
  });

  it("com a contagem zerada (início mudou), conta de novo", () => {
    expect(janela(null, INICIO_MS + 3 * DIA)).not.toBeNull();
  });
});

// ---------------------------------------------------------------- RIOT-05

describe("a mesma conta em outra inscrição ativa (RIOT-05)", () => {
  it("o (m) fica em risco, com o motivo para o jogador, em vez de «Conta confirmada»", () => {
    const decisao = decidirSincronizacao({
      inscrito,
      conferencias: conferencias(),
      riot: riot(),
      config,
      agoraMs: JANELA_ABERTA,
      contaEmOutraInscricao: true,
    });
    expect(decisao.itens.find((i) => i.item === "m")).toMatchObject({
      estado: "risco",
      observacao: expect.stringMatching(/já aparece em outra inscrição/),
    });
  });

  it("controle: sem a outra inscrição, a conta é confirmada", () => {
    const decisao = decidirSincronizacao({ inscrito, conferencias: conferencias(), riot: riot(), config, agoraMs: JANELA_ABERTA });
    expect(decisao.itens.find((i) => i.item === "m")?.estado).toBe("ok");
  });
});
