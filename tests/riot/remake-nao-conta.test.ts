import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ClienteRiot, DetalheDaPartida, RespostaRiot } from "@/lib/riot/cliente";

/**
 * Remake não conta (regra 4, decisão de 22/10/2026).
 *
 * O robô conta as partidas da solo/duo nos 10 dias antes do início. Quando a contagem fica
 * entre o mínimo e o mínimo + 2 — a faixa em que um remake pode mudar o veredicto —, ele
 * busca o detalhe de cada partida (match-v5) e desconta as que terminaram em remake
 * (`gameEndedInEarlySurrender`). Fora da faixa, nenhuma chamada a mais. E a busca respeita
 * o que as outras chamadas respeitam: o 429 (pausa pelo Retry-After), a cota própria e o
 * prazo da rodada — parar no meio nunca grava uma contagem sem o desconto.
 */

const estado = vi.hoisted(() => ({
  config: {} as Record<string, unknown>,
  inscricoes: [] as Record<string, unknown>[],
  aplicados: [] as { id: string; decisao: unknown }[],
  falhas: [] as { id: string; msg: string }[],
  pausas: [] as number[],
}));

vi.mock("@/lib/inscricoes/store", async (original) => ({
  ...(await original<Record<string, unknown>>()),
  lerConfig: async () => estado.config,
  listarInscricoes: async () => estado.inscricoes,
  listarConferencias: async () =>
    estado.inscricoes.flatMap((i) =>
      ["a", "b", "d", "e", "f", "m"].map((item) => ({
        inscricao_id: i.id,
        item,
        estado: "pendente",
        observacao: null,
        conferido_por: null,
        conferido_em: null,
      })),
    ),
  adquirirTravaDoRobo: async () => true,
  liberarTravaDoRobo: async () => {},
  aplicarSincronizacao: async (id: string, decisao: unknown) => {
    estado.aplicados.push({ id, decisao });
    return { eloGravado: true, itensGravados: 1 };
  },
  registrarFalhaDoRobo: async (id: string, msg: string) => void estado.falhas.push({ id, msg }),
  pausarRobo: async (s: number) => void estado.pausas.push(s),
}));

const { criarClienteRiot } = await import("@/lib/riot/cliente");
const { FOLGA_PARA_CONFERIR_REMAKE, precisaConferirRemakes } = await import("@/lib/riot/decidir");
const { sincronizarComRiot } = await import("@/lib/riot/sincronizar");

const DIA = 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------- o cliente

function resposta(status: number, corpo: unknown, cabecalhos: Record<string, string> = {}) {
  return new Response(JSON.stringify(corpo), { status, headers: { "content-type": "application/json", ...cabecalhos } });
}

/** O detalhe como a Riot manda: a marca do remake vem em cada participante. */
function partida(remake: boolean | undefined) {
  return {
    metadata: { matchId: "BR1_1" },
    info: {
      queueId: 420,
      gameDuration: remake ? 190 : 1840,
      participants: Array.from({ length: 10 }, (_, i) => ({
        puuid: `p-${i}`,
        ...(remake !== undefined && { gameEndedInEarlySurrender: remake }),
      })),
    },
  };
}

function cliente(respostas: Response[], extra: Parameters<typeof criarClienteRiot>[0] = {}) {
  const fila = [...respostas];
  const fetch = vi.fn<(url: string) => Promise<Response>>(async () => fila.shift()!);
  const c = criarClienteRiot({
    chave: "RGAPI-teste",
    fetch: fetch as unknown as typeof globalThis.fetch,
    dormir: async () => {},
    intervaloMs: 0,
    ...extra,
  });
  return { c, fetch };
}

describe("cliente: detalhe da partida", () => {
  it("busca no match-v5 da rota americas e lê o remake dos participantes", async () => {
    const { c, fetch } = cliente([resposta(200, partida(true)), resposta(200, partida(false))]);
    expect(await c.detalheDaPartida("BR1_3012345678")).toEqual({ tipo: "ok", dados: { remake: true } });
    expect(await c.detalheDaPartida("BR1_3012345679")).toEqual({ tipo: "ok", dados: { remake: false } });
    expect(fetch.mock.calls[0]![0]).toBe("https://americas.api.riotgames.com/lol/match/v5/matches/BR1_3012345678");
  });

  it("aceita a marca no `info`; sem marca nenhuma, a partida conta (não é remake)", async () => {
    const { c } = cliente([
      resposta(200, { info: { gameEndedInEarlySurrender: true } }),
      resposta(200, partida(undefined)),
    ]);
    expect(await c.detalheDaPartida("BR1_1")).toEqual({ tipo: "ok", dados: { remake: true } });
    expect(await c.detalheDaPartida("BR1_2")).toEqual({ tipo: "ok", dados: { remake: false } });
  });

  it("429 no detalhe: para pelo Retry-After e nada mais sai para a rede", async () => {
    const { c, fetch } = cliente([resposta(429, {}, { "retry-after": "9" }), resposta(200, partida(false))]);
    expect(await c.detalheDaPartida("BR1_1")).toEqual({ tipo: "limite", esperarSegundos: 9, proprio: false });
    expect(await c.detalheDaPartida("BR1_2")).toMatchObject({ tipo: "limite" });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("prazo da rodada vencido: nem sai para a rede (paramos nós)", async () => {
    const { c, fetch } = cliente([resposta(200, partida(false))], { prazoMs: 1_000, agora: () => 2_000 });
    expect(await c.detalheDaPartida("BR1_1")).toEqual({ tipo: "limite", esperarSegundos: 60, proprio: true });
    expect(fetch).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------- a faixa

describe("só confere remake entre o mínimo e o mínimo + 2", () => {
  it("abaixo do mínimo, descontar não muda nada; acima da folga, não compensa a cota", () => {
    expect(FOLGA_PARA_CONFERIR_REMAKE).toBe(2);
    expect(precisaConferirRemakes(4, 5)).toBe(false);
    expect(precisaConferirRemakes(5, 5)).toBe(true);
    expect(precisaConferirRemakes(6, 5)).toBe(true);
    expect(precisaConferirRemakes(7, 5)).toBe(true);
    expect(precisaConferirRemakes(8, 5)).toBe(false);
  });

  it("mínimo zero: não há o que cumprir, nenhuma chamada", () => {
    expect(precisaConferirRemakes(0, 0)).toBe(false);
    expect(precisaConferirRemakes(2, 0)).toBe(false);
  });
});

// ---------------------------------------------------------------- a rodada

type Detalhe = (id: string) => RespostaRiot<DetalheDaPartida>;

/** A Riot roteirizada: conta conhecida, BR, Ouro, e as partidas da janela do (e). */
function clienteFalso(ids: string[] | ((nome: string) => string[]), detalhe: Detalhe) {
  const log: string[] = [];
  const c = {
    chamadas: 0,
    parado: null,
    contaPorPuuid: async (puuid: string) => (
      log.push(`puuid:${puuid}`),
      { tipo: "ok", dados: { puuid, gameName: puuid.replace(/^p-/, ""), tagLine: "BR1" } }
    ),
    contaPorRiotId: async (nome: string) => (
      log.push(`riotid:${nome}`),
      { tipo: "ok", dados: { puuid: `p-${nome}`, gameName: nome, tagLine: "BR1" } }
    ),
    regiaoDaConta: async () => (log.push("regiao"), { tipo: "ok", dados: "br1" }),
    entradasDaLiga: async () => (
      log.push("liga"),
      {
        tipo: "ok",
        dados: [{ queueType: "RANKED_SOLO_5x5", tier: "GOLD", rank: "II", leaguePoints: 45, wins: 10, losses: 9 }],
      }
    ),
    nivelDoInvocador: async () => (log.push("nivel"), { tipo: "ok", dados: 200 }),
    idsDePartidas: async (puuid: string) => (
      log.push(`partidas:${puuid}`),
      { tipo: "ok", dados: typeof ids === "function" ? ids(puuid.replace(/^p-/, "")) : ids }
    ),
    detalheDaPartida: async (id: string) => (log.push(`detalhe:${id}`), detalhe(id)),
  };
  return { cliente: c as unknown as ClienteRiot, log };
}

/** Inscrito com conta, servidor e nível já conhecidos: a rodada só faz conta, liga e partidas. */
function inscrito(id: string, ordem = 1) {
  return {
    id,
    criado_em: `2026-10-0${ordem}T00:00:00.000Z`,
    nick: id,
    tag: "BR1",
    riot_id: `${id}#BR1`,
    situacao: "pendente",
    elo_declarado: "Ouro",
    elo_verificado: null,
    elo_congelado: null,
    elo_fonte: null,
    pontos: 4,
    puuid: `p-${id}`,
    riot_regiao: "br1",
    riot_nivel_em: new Date(Date.now() - DIA).toISOString(),
    riot_partidas_janela: null,
    riot_sincronizado_em: null,
  };
}

const br = (n: number, de = 1) => Array.from({ length: n }, (_, i) => `BR1_${de + i}`);
const remakeEm =
  (...remakes: string[]): Detalhe =>
  (id) => ({ tipo: "ok", dados: { remake: remakes.includes(id) } });

type Decisao = {
  colunasRiot: Record<string, unknown>;
  itens: { item: string; estado: string; observacao: string; retrato: Record<string, unknown> }[];
};
const decisaoDe = (id: string) => estado.aplicados.find((a) => a.id === id)?.decisao as Decisao | undefined;
const itemE = (id: string) => decisaoDe(id)?.itens.find((i) => i.item === "e");

beforeEach(() => {
  // Janela do (e) aberta: o início é daqui a 5 dias (a janela abriu há 5).
  estado.config = {
    congelamento_elo: null,
    inicio_campeonato: new Date(Date.now() + 5 * DIA).toISOString(),
    min_ranqueadas: 5,
    riot_pausa_ate: null,
  };
  estado.inscricoes = [];
  estado.aplicados.length = 0;
  estado.falhas.length = 0;
  estado.pausas.length = 0;
});

describe("rodada: remake descontado da contagem do (e)", () => {
  it("6 partidas, 1 remake: grava 5 e o (e) cumpre — o retrato guarda o remake descontado", async () => {
    estado.inscricoes = [inscrito("a")];
    const { cliente, log } = clienteFalso(br(6), remakeEm("BR1_4"));
    await sincronizarComRiot({ orcamentoMs: 60_000, cliente });

    expect(log.filter((l) => l.startsWith("detalhe:"))).toHaveLength(6);
    expect(decisaoDe("a")?.colunasRiot.riot_partidas_janela).toBe(5);
    expect(itemE("a")).toMatchObject({ estado: "ok", retrato: { partidasNaJanela: 5, remakesNaJanela: 1 } });
  });

  it("5 partidas, 1 remake: grava 4 e o (e) fica pendente, dizendo ao jogador que remake não conta", async () => {
    estado.inscricoes = [inscrito("a")];
    const { cliente } = clienteFalso(br(5), remakeEm("BR1_2"));
    await sincronizarComRiot({ orcamentoMs: 60_000, cliente });

    expect(decisaoDe("a")?.colunasRiot.riot_partidas_janela).toBe(4);
    expect(itemE("a")).toMatchObject({ estado: "pendente" });
    expect(itemE("a")!.observacao).toMatch(/4 de 5/);
    expect(itemE("a")!.observacao).toMatch(/remake não conta/);
  });

  it("7 partidas (mínimo + 2) com 3 remakes: grava 4", async () => {
    estado.inscricoes = [inscrito("a")];
    const { cliente } = clienteFalso(br(7), remakeEm("BR1_1", "BR1_3", "BR1_7"));
    await sincronizarComRiot({ orcamentoMs: 60_000, cliente });
    expect(decisaoDe("a")?.colunasRiot.riot_partidas_janela).toBe(4);
  });

  it("fora da faixa (4 ou 8 partidas): nenhuma chamada de detalhe, a contagem vai inteira", async () => {
    estado.inscricoes = [inscrito("a", 1), inscrito("bb", 2)];
    const { cliente, log } = clienteFalso((nome) => (nome === "a" ? br(4) : br(8)), remakeEm("BR1_1"));
    await sincronizarComRiot({ orcamentoMs: 60_000, cliente });

    expect(log.some((l) => l.startsWith("detalhe:"))).toBe(false);
    expect(decisaoDe("a")?.colunasRiot.riot_partidas_janela).toBe(4);
    expect(decisaoDe("bb")?.colunasRiot.riot_partidas_janela).toBe(8);
    expect(itemE("bb")?.retrato).not.toHaveProperty("remakesNaJanela");
  });

  it("a faixa olha só as partidas do BR: 5 do BR + 3 de outro servidor = confere as 5", async () => {
    estado.inscricoes = [inscrito("a")];
    const { cliente, log } = clienteFalso([...br(5), "NA1_1", "NA1_2", "NA1_3"], remakeEm("BR1_5"));
    await sincronizarComRiot({ orcamentoMs: 60_000, cliente });

    expect(log.filter((l) => l.startsWith("detalhe:"))).toEqual(br(5).map((id) => `detalhe:${id}`));
    expect(decisaoDe("a")?.colunasRiot.riot_partidas_janela).toBe(4);
  });

  it("partida que a Riot não acha (404) conta, como contava antes", async () => {
    estado.inscricoes = [inscrito("a")];
    const { cliente } = clienteFalso(br(5), (id) => (id === "BR1_3" ? { tipo: "nao_encontrado" } : { tipo: "ok", dados: { remake: false } }));
    await sincronizarComRiot({ orcamentoMs: 60_000, cliente });
    expect(decisaoDe("a")?.colunasRiot.riot_partidas_janela).toBe(5);
  });
});

describe("rodada: a busca do detalhe respeita a Riot e o prazo", () => {
  it("429 no meio dos detalhes: para a rodada, pausa pelo Retry-After e não grava contagem sem desconto", async () => {
    estado.inscricoes = [inscrito("a", 1), inscrito("bb", 2)];
    const { cliente, log } = clienteFalso(br(6), (id) =>
      id === "BR1_2" ? { tipo: "limite", esperarSegundos: 37, proprio: false } : { tipo: "ok", dados: { remake: true } },
    );
    const r = await sincronizarComRiot({ orcamentoMs: 60_000, cliente });

    expect(r.parouPor).toBe("limite");
    expect(estado.pausas).toEqual([37]);
    expect(estado.aplicados).toEqual([]);
    expect(log.filter((l) => l.startsWith("detalhe:"))).toEqual(["detalhe:BR1_1", "detalhe:BR1_2"]);
    // O segundo inscrito nem é consultado: a pausa vale para a chave inteira.
    expect(log).not.toContain("puuid:p-bb");
  });

  it("prazo da rodada (ou cota própria) no meio dos detalhes: para sem pausar ninguém e sem gravar", async () => {
    estado.inscricoes = [inscrito("a")];
    const { cliente } = clienteFalso(br(5), (id) =>
      id === "BR1_4" ? { tipo: "limite", esperarSegundos: 60, proprio: true } : { tipo: "ok", dados: { remake: false } },
    );
    const r = await sincronizarComRiot({ orcamentoMs: 60_000, cliente });

    expect(r.parouPor).toBe("cota");
    expect(estado.pausas).toEqual([]);
    expect(estado.aplicados).toEqual([]);
  });

  it("erro da Riot num detalhe: registra no inscrito, não grava a contagem dele e segue para o próximo", async () => {
    estado.inscricoes = [inscrito("a", 1), inscrito("bb", 2)];
    const { cliente } = clienteFalso((nome) => (nome === "a" ? br(5) : br(3)), () => ({
      tipo: "erro",
      status: 503,
      mensagem: "Riot respondeu 503",
    }));
    const r = await sincronizarComRiot({ orcamentoMs: 60_000, cliente });

    expect(estado.falhas).toEqual([{ id: "a", msg: "Riot respondeu 503" }]);
    expect(decisaoDe("a")).toBeUndefined();
    expect(decisaoDe("bb")?.colunasRiot.riot_partidas_janela).toBe(3);
    expect(r.erros).toBe(1);
  });
});
