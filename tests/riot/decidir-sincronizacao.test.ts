import { describe, expect, it } from "vitest";

import {
  AUTOR_RIOT,
  decidirSincronizacao,
  precisaContarPartidas,
  type ConferenciaParaRobo,
  type ConfigParaRobo,
  type DadosRiot,
  type InscritoParaRobo,
} from "@/lib/riot/decidir";

/**
 * As regras do robô da Riot, caso a caso. Cada caso é CONSTRUÍDO aqui — nada depende de
 * achar um exemplo num fixture.
 */

const AGORA = Date.parse("2026-10-07T09:00:00.000Z");
const CONFIG: ConfigParaRobo = { congelamento_elo: null, inicio_campeonato: null, min_ranqueadas: 5 };

function inscrito(over: Partial<InscritoParaRobo> = {}): InscritoParaRobo {
  return {
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
    ...over,
  };
}

/** Os seis itens como o gatilho do banco cria: pendentes e sem ninguém. */
function conferencias(over: Partial<Record<string, Partial<ConferenciaParaRobo>>> = {}): ConferenciaParaRobo[] {
  return ["a", "b", "d", "e", "f", "m"].map((item) => ({
    item,
    estado: "pendente",
    observacao: null,
    conferido_por: null,
    ...over[item],
  }));
}

function riot(over: Partial<DadosRiot> = {}): DadosRiot {
  return {
    conta: { tipo: "ok", puuid: "p-1", gameName: "Fulano", tagLine: "BR1" },
    solo: { tier: "DIAMOND", divisao: "II", pdl: 45, vitorias: 120, derrotas: 98 },
    ...over,
  };
}

function decidir(args: {
  i?: Partial<InscritoParaRobo>;
  c?: ConferenciaParaRobo[];
  r?: Partial<DadosRiot>;
  config?: Partial<ConfigParaRobo>;
  agora?: number;
}) {
  return decidirSincronizacao({
    inscrito: inscrito(args.i),
    conferencias: args.c ?? conferencias(),
    riot: riot(args.r),
    config: { ...CONFIG, ...args.config },
    agoraMs: args.agora ?? AGORA,
  });
}

const itemDe = (d: ReturnType<typeof decidir>, item: string) => d.itens.find((i) => i.item === item);

describe("elo", () => {
  it("segue a Riot e recalcula o preço: declarou Ouro, a Riot mostra Diamante", () => {
    const d = decidir({});
    expect(d.elo).toEqual({ para: "Diamante", pontos: 8, de: "Ouro", pontosDe: 4, mudouValor: true });
    expect(d.colunasRiot).toMatchObject({ elo_riot: "Diamante", riot_divisao: "II", riot_pdl: 45 });
  });

  it("os elos gravados à mão ANTES do robô (fonte nula) passam a seguir a Riot", () => {
    const d = decidir({ i: { elo_verificado: "Ouro", pontos: 4, elo_fonte: null } });
    expect(d.elo?.para).toBe("Diamante");
  });

  it("mesmo valor de antes, mas sem fonte: grava a fonte sem contar como mudança", () => {
    const d = decidir({ i: { elo_verificado: "Diamante", pontos: 8, elo_fonte: null } });
    expect(d.elo).toMatchObject({ para: "Diamante", mudouValor: false });
  });

  it("travado pela organização: não mexe no elo — mas registra o que a Riot diz", () => {
    const d = decidir({ i: { elo_verificado: "Ouro", elo_fonte: "organizacao" } });
    expect(d.elo).toBeNull();
    expect(d.colunasRiot.elo_riot).toBe("Diamante");
  });

  it("congelado: não mexe no elo", () => {
    expect(decidir({ i: { elo_congelado: "Ouro" } }).elo).toBeNull();
  });

  it("depois da data de congelamento: não mexe, mesmo sem o congelamento ter rodado", () => {
    const d = decidir({ config: { congelamento_elo: "2026-10-06T00:00:00.000Z" } });
    expect(d.elo).toBeNull();
    // Antes da data, mexe.
    expect(decidir({ config: { congelamento_elo: "2026-10-08T00:00:00.000Z" } }).elo?.para).toBe("Diamante");
  });

  it("algum inscrito já congelado (botão «Congelar»): não mexe mais em elo de ninguém", () => {
    expect(decidir({ config: { elos_ja_congelados: true } }).elo).toBeNull();
  });

  it("só tem ranque na FLEX: não toca no elo (a flex não conta nesta edição)", () => {
    // `solo: null` é o que o orquestrador manda quando a única entrada é RANKED_FLEX_SR.
    const d = decidir({ r: { solo: null } });
    expect(d.elo).toBeNull();
    expect(d.colunasRiot.riot_status).toBe("sem_ranque_solo");
  });

  it("tier desconhecido: não grava elo e marca erro", () => {
    const d = decidir({ r: { solo: { tier: "MYTHIC", divisao: null, pdl: null, vitorias: null, derrotas: null } } });
    expect(d.elo).toBeNull();
    expect(d.colunasRiot.riot_status).toBe("erro");
  });

  it("igual ao gravado e com fonte riot: nada a fazer (rodar duas vezes dá vazio)", () => {
    const d = decidir({
      i: { elo_verificado: "Diamante", pontos: 8, elo_fonte: "riot" },
      c: conferencias({
        m: { estado: "ok", observacao: "Conta confirmada na Riot.", conferido_por: AUTOR_RIOT },
        d: { estado: "ok", observacao: "MD5 da solo/duo confirmada na Riot.", conferido_por: AUTOR_RIOT },
      }),
    });
    expect(d.elo).toBeNull();
    expect(d.itens).toEqual([]);
  });
});

describe("requisitos", () => {
  it("conta encontrada e com ranque: (m) e (d) cumprem, com retrato", () => {
    const d = decidir({});
    expect(itemDe(d, "m")).toMatchObject({ estado: "ok" });
    expect(itemDe(d, "d")).toMatchObject({ estado: "ok" });
    expect(itemDe(d, "d")!.retrato).toMatchObject({ fonte: "riot", solo: { tier: "DIAMOND" } });
  });

  it("NUNCA mexe em item que alguém da organização gravou — nem num pendente com observação", () => {
    const d = decidir({
      r: { conta: { tipo: "nao_encontrado" } },
      c: conferencias({
        m: { estado: "ok", conferido_por: "lucas" },
        d: { estado: "pendente", observacao: "pedi o print", conferido_por: "nakay" },
      }),
    });
    expect(d.itens).toEqual([]);
  });

  it("Riot ID que não existe: (m) em risco, e nada mais é decidido", () => {
    const d = decidir({ r: { conta: { tipo: "nao_encontrado" } } });
    expect(d.itens).toHaveLength(1);
    expect(itemDe(d, "m")).toMatchObject({ estado: "risco" });
    expect(d.colunasRiot.riot_status).toBe("riot_id_inexistente");
    expect(d.elo).toBeNull();
  });

  it("caixa e espaço diferentes não são troca de nick", () => {
    const d = decidir({
      i: { nick: "R A Z E R A L", tag: "DEV" },
      r: { conta: { tipo: "ok", puuid: "p", gameName: "r a z e r a l", tagLine: "dev" } },
    });
    expect(itemDe(d, "m")).toMatchObject({ estado: "ok" });
  });

  it("trocou de nick (regra 12): (m) vai a risco e cita o Riot ID novo", () => {
    const d = decidir({ r: { conta: { tipo: "ok", puuid: "p", gameName: "OutroNome", tagLine: "BR1" } } });
    expect(itemDe(d, "m")).toMatchObject({ estado: "risco" });
    expect(itemDe(d, "m")!.observacao).toContain("OutroNome#BR1");
    expect(d.colunasRiot.riot_id_atual).toBe("OutroNome#BR1");
  });

  it("sem ranque na solo/duo: (d) fica PENDENTE com explicação — ainda não é risco", () => {
    const d = decidir({ r: { solo: null } });
    expect(itemDe(d, "d")).toMatchObject({ estado: "pendente" });
    expect(itemDe(d, "d")!.observacao).toMatch(/regra 3/);
  });

  it("conta em outro servidor: (d) em risco e o elo não muda", () => {
    const d = decidir({ r: { regiao: "na1" } });
    expect(itemDe(d, "d")).toMatchObject({ estado: "risco" });
    expect(d.colunasRiot.riot_status).toBe("outro_servidor");
    expect(d.elo).toBeNull();
  });

  it("o robô nunca decide o (f) — nem com nível baixo", () => {
    const d = decidir({ r: { nivel: 31 } });
    expect(itemDe(d, "f")).toBeUndefined();
    expect(d.colunasRiot.riot_nivel).toBe(31);
  });

  it("o que o jogador lê não carrega nível, vitórias, derrotas nem suspeita", () => {
    const casos = [
      decidir({ r: { nivel: 31 } }),
      decidir({ r: { solo: null, nivel: 31 } }),
      decidir({ r: { regiao: "na1" } }),
      decidir({ r: { conta: { tipo: "nao_encontrado" } } }),
      decidir({ r: { conta: { tipo: "ok", puuid: "p", gameName: "X", tagLine: "Y" } } }),
    ];
    for (const d of casos) {
      for (const item of d.itens) {
        expect(item.observacao).not.toMatch(/smurf|nível|nivel|vitória|derrota|\d+V|\d+D/i);
      }
    }
  });
});

describe("item (e): partidas nos 10 dias antes do início", () => {
  const INICIO = "2026-11-01T00:00:00.000Z";

  it("sem data de início: o robô não decide o (e)", () => {
    expect(itemDe(decidir({ r: { partidasNaJanela: 9 } }), "e")).toBeUndefined();
  });

  it("antes de a janela abrir: não decide", () => {
    const d = decidir({ r: { partidasNaJanela: 9 }, config: { inicio_campeonato: INICIO }, agora: Date.parse("2026-10-20T00:00:00Z") });
    expect(itemDe(d, "e")).toBeUndefined();
  });

  it("janela aberta, abaixo do mínimo: pendente com a contagem", () => {
    const d = decidir({ r: { partidasNaJanela: 2 }, config: { inicio_campeonato: INICIO }, agora: Date.parse("2026-10-25T00:00:00Z") });
    expect(itemDe(d, "e")).toMatchObject({ estado: "pendente" });
    expect(itemDe(d, "e")!.observacao).toMatch(/2 de 5/);
  });

  it("bateu o mínimo: cumpre", () => {
    const d = decidir({ r: { partidasNaJanela: 5 }, config: { inicio_campeonato: INICIO }, agora: Date.parse("2026-10-25T00:00:00Z") });
    expect(itemDe(d, "e")).toMatchObject({ estado: "ok" });
  });

  it("janela fechada abaixo do mínimo: risco (nunca recusado)", () => {
    const d = decidir({ r: { partidasNaJanela: 3 }, config: { inicio_campeonato: INICIO }, agora: Date.parse("2026-11-02T00:00:00Z") });
    expect(itemDe(d, "e")).toMatchObject({ estado: "risco" });
  });

  it("consulta as partidas só com a janela aberta e enquanto ainda não bateu o mínimo", () => {
    const base = { inicioCampeonato: INICIO, minimo: 5 };
    expect(precisaContarPartidas({ ...base, partidasGravadas: null, agoraMs: Date.parse("2026-10-20T00:00:00Z") })).toBeNull();
    expect(precisaContarPartidas({ ...base, partidasGravadas: 5, agoraMs: Date.parse("2026-10-25T00:00:00Z") })).toBeNull();
    const janela = precisaContarPartidas({ ...base, partidasGravadas: 2, agoraMs: Date.parse("2026-10-25T00:00:00Z") });
    expect(janela).toEqual({
      inicioS: Date.parse("2026-10-22T00:00:00Z") / 1000,
      fimS: Date.parse("2026-10-25T00:00:00Z") / 1000,
    });
    expect(precisaContarPartidas({ ...base, inicioCampeonato: null, partidasGravadas: null, agoraMs: AGORA })).toBeNull();
  });
});
