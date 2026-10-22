import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ClienteRiot, RespostaRiot } from "@/lib/riot/cliente";
import type { DecisaoDoRobo } from "@/lib/riot/decidir";

/**
 * A rodada do robô da Riot quando algo dá errado no meio.
 *
 *  - RIOT-03: um erro de banco ao gravar UM inscrito não derruba a rodada: os seguintes são
 *    consultados, a rodada é registrada e ele fica marcado com erro. Várias falhas SEGUIDAS
 *    (banco fora do ar) ainda param a rodada.
 *  - RIOT-04: o prazo vale para CADA chamada à Riot, não só entre inscritos. Com a Riot
 *    lenta mas respondendo, o botão do painel passava dos 60 s da Vercel.
 *  - RIOT-05: duas inscrições que a Riot resolve para a mesma conta — a mais nova fica com o
 *    (m) em risco.
 *
 * O store é simulado (o que se testa aqui é a rodada); no RIOT-04 o cliente da Riot é o
 * REAL, com o relógio e o `fetch` trocados.
 */

const estado = vi.hoisted(() => ({
  config: {} as Record<string, unknown>,
  inscricoes: [] as Record<string, unknown>[],
  aplicados: [] as { id: string; decisao: DecisaoDoRobo }[],
  falhasDoRobo: [] as string[],
  liberacoes: [] as (Record<string, unknown> | undefined)[],
  quebrarEm: new Set<string>(),
}));

vi.mock("@/lib/inscricoes/store", async (original) => ({
  ...(await original<Record<string, unknown>>()),
  lerConfig: async () => estado.config,
  listarInscricoes: async () => estado.inscricoes,
  // Os seis itens de cada inscrito, como o gatilho do banco cria: pendentes e sem ninguém.
  listarConferencias: async () =>
    estado.inscricoes.flatMap((i) =>
      ["a", "b", "d", "e", "f", "m"].map((item) => ({
        inscricao_id: i.id,
        item,
        estado: "pendente",
        observacao: null,
        conferido_por: null,
      })),
    ),
  adquirirTravaDoRobo: async () => true,
  liberarTravaDoRobo: async (r?: Record<string, unknown>) => void estado.liberacoes.push(r),
  aplicarSincronizacao: async (id: string, decisao: DecisaoDoRobo) => {
    if (estado.quebrarEm.has(id)) throw new Error("Falha ao atualizar o elo: TypeError: fetch failed");
    estado.aplicados.push({ id, decisao });
    return { eloGravado: false, itensGravados: decisao.itens.length };
  },
  registrarFalhaDoRobo: async (id: string) => void estado.falhasDoRobo.push(id),
  pausarRobo: async () => {},
}));

const { sincronizarComRiot } = await import("@/lib/riot/sincronizar");

const base = (id: string, ordem: number, over: Record<string, unknown> = {}) => ({
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
  puuid: null,
  riot_regiao: "br1",
  riot_nivel_em: new Date().toISOString(),
  riot_partidas_janela: null,
  riot_sincronizado_em: `2026-10-1${ordem}T00:00:00.000Z`,
  ...over,
});

/** Cliente de mentira: cada inscrito resolve para a conta `p-<nick sem acento>`, a não ser que `contaDe` diga outra. */
function clienteFalso(contaDe: (nick: string) => string = (n) => `p-${n}`): ClienteRiot {
  const ok = <T>(dados: T) => Promise.resolve({ tipo: "ok", dados } as RespostaRiot<T>);
  return {
    chamadas: 0,
    parado: null,
    contaPorRiotId: (nick: string) => ok({ puuid: contaDe(nick), gameName: nick, tagLine: "BR1" }),
    contaPorPuuid: (puuid: string) => ok({ puuid, gameName: puuid.replace(/^p-/, ""), tagLine: "BR1" }),
    regiaoDaConta: () => ok("br1"),
    entradasDaLiga: () => ok([{ queueType: "RANKED_SOLO_5x5", tier: "GOLD", rank: "I", leaguePoints: 1, wins: 1, losses: 1 }]),
    nivelDoInvocador: () => ok(100),
    idsDePartidas: () => ok([]),
  } as unknown as ClienteRiot;
}

beforeEach(() => {
  estado.config = { congelamento_elo: null, inicio_campeonato: null, min_ranqueadas: 5, riot_pausa_ate: null };
  estado.inscricoes = [];
  estado.aplicados.length = 0;
  estado.falhasDoRobo.length = 0;
  estado.liberacoes.length = 0;
  estado.quebrarEm = new Set();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

// ---------------------------------------------------------------- RIOT-03

describe("erro de banco ao gravar um inscrito (RIOT-03)", () => {
  beforeEach(() => {
    estado.inscricoes = [base("a", 1), base("b", 2), base("c", 3), base("d", 4)];
  });

  it("os seguintes ainda são gravados, a rodada é registrada e o inscrito fica marcado com erro", async () => {
    estado.quebrarEm = new Set(["b"]);
    const resumo = await sincronizarComRiot({ orcamentoMs: 60_000, cliente: clienteFalso() });

    expect(estado.aplicados.map((a) => a.id)).toEqual(["a", "c", "d"]);
    expect(estado.falhasDoRobo).toEqual(["b"]);
    expect(resumo).toMatchObject({ processados: 4, erros: 1 });
    // A rodada completa é registrada (é ela que diz no painel se a rotina está viva).
    expect(estado.liberacoes).toEqual([expect.objectContaining({ processados: 4, erros: 1 })]);
  });

  it("três falhas seguidas são o banco fora do ar: a rodada para (e não gasta a cota à toa)", async () => {
    estado.quebrarEm = new Set(["a", "b", "c"]);
    await expect(sincronizarComRiot({ orcamentoMs: 60_000, cliente: clienteFalso() })).rejects.toThrow(/fetch failed/);
    expect(estado.aplicados).toEqual([]);
    // Não registra como rodada concluída, mas solta a trava.
    expect(estado.liberacoes).toEqual([undefined]);
  });
});

// ---------------------------------------------------------------- RIOT-05

describe("a mesma conta em duas inscrições, descoberta na rodada (RIOT-05)", () => {
  const sem = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/\s+/g, "");
  const mDe = (id: string) => estado.aplicados.find((a) => a.id === id)?.decisao.itens.find((i) => i.item === "m");

  it("a mais NOVA (com a Riot fora na inscrição, sem PUUID) fica com o (m) em risco; a mais antiga segue confirmada", async () => {
    estado.inscricoes = [
      base("antiga", 1, { nick: "SAMUEL VENÂNCIO", puuid: "p-samuelvenancio" }),
      base("nova", 2, { nick: "SAMUEL VENANCIO" }),
    ];
    await sincronizarComRiot({ orcamentoMs: 60_000, cliente: clienteFalso((n) => `p-${sem(n)}`) });

    expect(mDe("nova")).toMatchObject({ estado: "risco", observacao: expect.stringMatching(/outra inscrição/) });
    expect(mDe("antiga")?.estado).toBe("ok");
  });

  it("as duas sem PUUID, resolvidas na mesma rodada: a segunda a se inscrever é a repetida", async () => {
    estado.inscricoes = [
      base("primeira", 1, { nick: "Bety Clarão" }),
      base("segunda", 2, { nick: "betyclarao" }),
    ];
    await sincronizarComRiot({ orcamentoMs: 60_000, cliente: clienteFalso((n) => `p-${sem(n)}`) });

    expect(mDe("primeira")?.estado).toBe("ok");
    expect(mDe("segunda")?.estado).toBe("risco");
  });

  it("a outra já recusada não conta", async () => {
    estado.inscricoes = [
      base("antiga", 1, { nick: "Fulano", puuid: "p-fulano", situacao: "recusado" }),
      base("nova", 2, { nick: "fulano" }),
    ];
    await sincronizarComRiot({ orcamentoMs: 60_000, cliente: clienteFalso((n) => `p-${sem(n)}`) });
    expect(mDe("nova")?.estado).toBe("ok");
  });
});

// ---------------------------------------------------------------- RIOT-04

describe("o prazo vale para cada chamada à Riot (RIOT-04)", () => {
  it("Riot lenta mas respondendo (7,9 s por chamada): o botão (25 s) termina bem antes dos 60 s da Vercel", async () => {
    const relogio = { t: Date.parse("2026-11-15T09:00:00.000Z") };
    vi.spyOn(Date, "now").mockImplementation(() => relogio.t);
    vi.stubEnv("RIOT_API_KEY", "RGAPI-teste");

    const json = (corpo: unknown, status = 200) => new Response(JSON.stringify(corpo), { status });
    let chamadas = 0;
    vi.stubGlobal("fetch", async (url: string) => {
      chamadas += 1;
      relogio.t += 7_900;
      const u = String(url);
      // O PUUID "velho" (chave da API trocada) obriga a resolver de novo pelo Riot ID.
      if (u.includes("/by-puuid/velho") && u.includes("/accounts/")) return json({ status: { message: "Exception decrypting velho" } }, 400);
      if (u.includes("/accounts/by-riot-id/")) return json({ puuid: "p-novo", gameName: "b", tagLine: "BR1" });
      if (u.includes("/accounts/by-puuid/")) return json({ puuid: "p-a", gameName: "a", tagLine: "BR1" });
      if (u.includes("/region/")) return json({ region: "br1" });
      if (u.includes("/league/")) return json([{ queueType: "RANKED_SOLO_5x5", tier: "GOLD", rank: "I", leaguePoints: 1, wins: 1, losses: 1 }]);
      if (u.includes("/summoner/")) return json({ summonerLevel: 100 });
      return json([]);
    });

    estado.config = { congelamento_elo: null, inicio_campeonato: "2026-11-20T23:00:00.000Z", min_ranqueadas: 5, riot_pausa_ate: null };
    estado.inscricoes = [
      // 2 chamadas (conta e solo/duo): termina aos ~15,8 s.
      base("a", 1, { puuid: "p-a", riot_nivel_em: new Date(relogio.t - 3_600_000).toISOString(), riot_partidas_janela: 5 }),
      // O pior caso: 6 chamadas (PUUID velho, nível semanal vencido, janela do (e) aberta).
      base("b", 2, { puuid: "velho", riot_regiao: null, riot_nivel_em: null }),
    ];

    const inicio = relogio.t;
    const resumo = await sincronizarComRiot({ orcamentoMs: 25_000 });

    expect(relogio.t - inicio).toBeLessThan(25_000 + 8_000);
    // Parou por conta própria (não é a Riot recusando): nada de pausar o robô.
    expect(resumo.parouPor).toBe("cota");
    expect(chamadas).toBe(2);
  });
});
