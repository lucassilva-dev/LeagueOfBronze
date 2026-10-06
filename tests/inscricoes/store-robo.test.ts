import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * As gravações do robô e da situação automática, contra um banco simulado que registra
 * cada filtro da consulta.
 *
 * O que se prova aqui não é "o update foi chamado" — é que ele é CONDICIONAL. O robô lê,
 * consulta a Riot por alguns segundos e só então grava; se nesse meio-tempo um organizador
 * travou o elo ou deu veredicto num requisito, o filtro tem de impedir a gravação. Sem o
 * filtro, o robô passaria por cima do humano — e nada mais na suíte perceberia.
 */

type Op = [string, unknown[]];
type Chamada = { tabela: string; ops: Op[] };
type Resposta = { data?: unknown; error?: unknown; count?: number };

const banco = vi.hoisted(() => ({
  chamadas: [] as { tabela: string; ops: [string, unknown[]][] }[],
  responder: (() => ({ data: null })) as (c: { tabela: string; ops: [string, unknown[]][] }) => {
    data?: unknown;
    error?: unknown;
    count?: number;
  },
}));

vi.mock("@/lib/data-store", () => ({
  isSupabaseConfigured: () => true,
  createSupabaseAdminClient: () => ({
    from: (tabela: string) => {
      const registro = { tabela, ops: [] as [string, unknown[]][] };
      banco.chamadas.push(registro);
      const construtor: Record<string, unknown> = new Proxy(
        {},
        {
          get(_alvo, prop: string) {
            if (prop === "then") {
              return (resolver: (v: unknown) => void) => resolver({ error: null, ...banco.responder(registro) });
            }
            return (...args: unknown[]) => {
              registro.ops.push([prop, args]);
              return construtor;
            };
          },
        },
      );
      return construtor;
    },
  }),
}));

const store = await import("@/lib/inscricoes/store");
const { AUTOR_RIOT } = await import("@/lib/riot/decidir");

const op = (c: Chamada, nome: string) => c.ops.filter(([n]) => n === nome).map(([, a]) => a);
const temOp = (c: Chamada, nome: string, ...args: unknown[]) =>
  op(c, nome).some((a) => JSON.stringify(a) === JSON.stringify(args));
const auditorias = () =>
  banco.chamadas
    .filter((c) => c.tabela === "inscricao_auditoria" && op(c, "insert").length > 0)
    .map((c) => op(c, "insert")[0]![0] as Record<string, unknown>);
const updates = (tabela: string) => banco.chamadas.filter((c) => c.tabela === tabela && op(c, "update").length > 0);

const ID = "3f2504e0-4f89-11d3-9a0c-0305e82c3301";

beforeEach(() => {
  banco.chamadas.length = 0;
  banco.responder = () => ({ data: null });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

// ---------------------------------------------------------------------- aplicarSincronizacao

describe("aplicarSincronizacao", () => {
  const decisao = {
    colunasRiot: { elo_riot: "Diamante", riot_status: "ok" },
    elo: { para: "Diamante", pontos: 8, de: "Ouro", pontosDe: 4, mudouValor: true },
    itens: [{ item: "d" as const, estado: "ok" as const, observacao: "MD5 confirmada.", retrato: { fonte: "riot" } }],
  };

  it("o elo só é gravado se NÃO estiver congelado nem travado pela organização", async () => {
    banco.responder = () => ({ data: [{ id: ID }] });
    await store.aplicarSincronizacao(ID, decisao);

    const eloUpdate = updates("inscricoes").find((c) => op(c, "update")[0]![0] && "elo_fonte" in (op(c, "update")[0]![0] as object))!;
    expect(eloUpdate).toBeTruthy();
    expect(temOp(eloUpdate, "is", "elo_congelado", null)).toBe(true);
    expect(temOp(eloUpdate, "or", "elo_fonte.is.null,elo_fonte.eq.riot")).toBe(true);
    expect(op(eloUpdate, "select").length).toBe(1);
  });

  it("o requisito só é gravado se ainda for do robô (ninguém gravou, ou foi ele)", async () => {
    banco.responder = () => ({ data: [{ id: ID, inscricao_id: ID }] });
    await store.aplicarSincronizacao(ID, decisao);

    const itemUpdate = updates("inscricao_conferencias")[0]!;
    expect(temOp(itemUpdate, "or", `conferido_por.is.null,conferido_por.eq."${AUTOR_RIOT}"`)).toBe(true);
    expect(temOp(itemUpdate, "eq", "item", "d")).toBe(true);
    expect(op(itemUpdate, "update")[0]![0]).toMatchObject({ conferido_por: AUTOR_RIOT, estado: "ok" });
  });

  it("gravou: audita elo e requisito, com o robô como autor", async () => {
    banco.responder = () => ({ data: [{ id: ID, inscricao_id: ID }] });
    const r = await store.aplicarSincronizacao(ID, decisao);
    expect(r).toEqual({ eloGravado: true, itensGravados: 1 });
    expect(auditorias().map((a) => [a.acao, a.autor])).toEqual([
      ["elo_atualizado_pela_riot", AUTOR_RIOT],
      ["conferencia_d", AUTOR_RIOT],
    ]);
  });

  it("o filtro não casou (um organizador gravou no meio): NADA é auditado como se tivesse mudado", async () => {
    banco.responder = (c) => (op(c, "update").length > 0 && op(c, "select").length > 0 ? { data: [] } : { data: null });
    const r = await store.aplicarSincronizacao(ID, decisao);
    expect(r).toEqual({ eloGravado: false, itensGravados: 0 });
    expect(auditorias()).toEqual([]);
  });

  it("mesmo valor de antes (só a fonte mudou): grava, mas não audita como mudança de elo", async () => {
    banco.responder = () => ({ data: [{ id: ID }] });
    await store.aplicarSincronizacao(ID, { ...decisao, elo: { ...decisao.elo, mudouValor: false }, itens: [] });
    expect(auditorias()).toEqual([]);
  });
});

// ---------------------------------------------------------------------- trava

describe("trava da rodada", () => {
  it("só pega a trava se ela está livre ou vencida — e a data vai entre aspas no filtro", async () => {
    banco.responder = () => ({ data: [{ id: 1 }] });
    const agora = Date.parse("2026-10-07T09:00:00.000Z");
    expect(await store.adquirirTravaDoRobo(6, agora)).toBe(true);
    const c = updates("edicao_config")[0]!;
    expect(temOp(c, "or", 'riot_trava_ate.is.null,riot_trava_ate.lt."2026-10-07T09:00:00.000Z"')).toBe(true);
    expect(op(c, "update")[0]![0]).toEqual({ riot_trava_ate: "2026-10-07T09:06:00.000Z" });
  });

  it("travada por outra rodada: devolve falso", async () => {
    banco.responder = () => ({ data: [] });
    expect(await store.adquirirTravaDoRobo(6)).toBe(false);
  });

  it("robô pausado até depois de agora; pausa vencida não conta", () => {
    expect(store.roboPausado({ riot_pausa_ate: "2026-10-07T10:00:00.000Z" }, Date.parse("2026-10-07T09:00:00.000Z"))).toBe(true);
    expect(store.roboPausado({ riot_pausa_ate: "2026-10-07T08:00:00.000Z" }, Date.parse("2026-10-07T09:00:00.000Z"))).toBe(false);
    expect(store.roboPausado({ riot_pausa_ate: null }, 0)).toBe(false);
  });
});

// ---------------------------------------------------------------------- congelamento

describe("congelarElos", () => {
  it("congela só quem ainda não está congelado — no UPDATE também, para o cron e o botão não se atropelarem", async () => {
    banco.responder = (c) => {
      if (op(c, "select").length > 0 && op(c, "update").length === 0) {
        return { data: [{ id: "a", elo_declarado: "Ouro", elo_verificado: "Prata" }, { id: "b", elo_declarado: "Ouro", elo_verificado: null }] };
      }
      // O segundo já tinha sido congelado por outra execução no meio do caminho.
      return { data: temOp(c, "eq", "id", "a") ? [{ id: "a" }] : [] };
    };
    expect(await store.congelarElos("automático")).toBe(1);
    for (const c of updates("inscricoes")) expect(temOp(c, "is", "elo_congelado", null)).toBe(true);
    expect(auditorias()).toEqual([expect.objectContaining({ acao: "elos_congelados", detalhe: { quantidade: 1 } })]);
  });

  it("ninguém congelado de fato: sem linha de auditoria", async () => {
    banco.responder = (c) =>
      op(c, "update").length === 0 ? { data: [{ id: "a", elo_declarado: "Ouro", elo_verificado: null }] } : { data: [] };
    expect(await store.congelarElos("automático")).toBe(0);
    expect(auditorias()).toEqual([]);
  });
});

// ---------------------------------------------------------------------- ficha

describe("atualizarInscricao: elo travado/automático e promoção", () => {
  const atual = (over: Record<string, unknown> = {}) => (c: Chamada): Resposta =>
    op(c, "maybeSingle").length > 0
      ? { data: { elo_declarado: "Ouro", elo_congelado: null, elo_riot: "Prata", situacao: "apto", ...over } }
      : { data: null };

  const linhaGravada = () => op(updates("inscricoes")[0]!, "update")[0]![0] as Record<string, unknown>;

  it("escolher um elo à mão TRAVA (fonte = organização) e reprecifica", async () => {
    banco.responder = atual();
    await store.atualizarInscricao(ID, { eloVerificado: "Mestre" }, "lucas");
    expect(linhaGravada()).toMatchObject({ elo_verificado: "Mestre", elo_fonte: "organizacao", pontos: 10 });
  });

  it("«automático» devolve o elo à Riot: vale o último que o robô leu", async () => {
    banco.responder = atual({ elo_riot: "Prata" });
    await store.atualizarInscricao(ID, { eloVerificado: null }, "lucas");
    expect(linhaGravada()).toMatchObject({ elo_verificado: "Prata", elo_fonte: "riot", pontos: 3 });
  });

  it("«automático» sem leitura da Riot volta ao declarado, sem fonte", async () => {
    banco.responder = atual({ elo_riot: null });
    await store.atualizarInscricao(ID, { eloVerificado: null }, "lucas");
    expect(linhaGravada()).toMatchObject({ elo_verificado: null, elo_fonte: null, pontos: 4 });
  });

  it("congelado: trava o registro, mas não mexe mais no preço", async () => {
    banco.responder = atual({ elo_congelado: "Ouro" });
    await store.atualizarInscricao(ID, { eloVerificado: "Mestre" }, "lucas");
    expect(linhaGravada()).not.toHaveProperty("pontos");
  });

  it("voltar de apto para pendente SEGURA a pessoa (sem promoção automática)", async () => {
    banco.responder = atual({ situacao: "apto" });
    await store.atualizarInscricao(ID, { situacao: "pendente" }, "lucas");
    expect(linhaGravada()).toMatchObject({ situacao: "pendente", promocao_automatica: false });
  });

  it("qualquer outra situação escolhida à mão devolve a promoção automática", async () => {
    banco.responder = atual({ situacao: "recusado" });
    await store.atualizarInscricao(ID, { situacao: "pendente" }, "lucas");
    expect(linhaGravada()).toMatchObject({ promocao_automatica: true });
  });
});

// ---------------------------------------------------------------------- situação automática

describe("reavaliarSituacao", () => {
  function responder(over: { situacao?: string; promocao?: boolean; pagamento?: string; afetou?: boolean } = {}) {
    return (c: Chamada): Resposta => {
      if (c.tabela === "edicao_config") return { data: { inicio_campeonato: null } };
      if (c.tabela === "inscricao_conferencias") {
        return { data: ["a", "b", "d", "e", "f", "m"].map((item) => ({ item, estado: "ok" })) };
      }
      if (c.tabela === "inscricao_pagamentos") return { data: { estado: over.pagamento ?? "pago" } };
      if (c.tabela === "inscricoes" && op(c, "update").length > 0) {
        return { data: over.afetou === false ? [] : [{ id: ID }] };
      }
      if (c.tabela === "inscricoes") {
        return { data: { situacao: over.situacao ?? "pendente", promocao_automatica: over.promocao ?? true } };
      }
      return { data: null };
    };
  }

  it("cumpre tudo e pagou: promove — com o UPDATE condicionado a ainda estar pendente e com promoção ligada", async () => {
    banco.responder = responder();
    expect(await store.reavaliarSituacao(ID, "pagamento")).toBe(true);
    const c = updates("inscricoes")[0]!;
    expect(op(c, "update")[0]![0]).toMatchObject({ situacao: "apto" });
    expect(temOp(c, "eq", "situacao", "pendente")).toBe(true);
    expect(temOp(c, "eq", "promocao_automatica", true)).toBe(true);
    expect(auditorias()).toEqual([
      expect.objectContaining({ acao: "situacao_promovida", autor: "automático", detalhe: { para: "apto", gatilho: "pagamento" } }),
    ]);
  });

  it("só declarou o pagamento: não promove, nem tenta gravar", async () => {
    banco.responder = responder({ pagamento: "declarado" });
    expect(await store.reavaliarSituacao(ID, "pagamento")).toBe(false);
    expect(updates("inscricoes")).toEqual([]);
  });

  it("alguém mudou a situação no meio (o UPDATE não casou): não audita", async () => {
    banco.responder = responder({ afetou: false });
    expect(await store.reavaliarSituacao(ID, "pagamento")).toBe(false);
    expect(auditorias()).toEqual([]);
  });

  it("segurado pela organização: não promove", async () => {
    banco.responder = responder({ promocao: false });
    expect(await store.reavaliarSituacao(ID, "pagamento")).toBe(false);
  });

  it("rotina diária: o lote diz «pago», mas a leitura fresca diz que voltou a aguardar — não promove", async () => {
    banco.responder = (c) => {
      if (c.tabela === "edicao_config") return { data: { inicio_campeonato: null } };
      if (c.tabela === "inscricoes" && op(c, "update").length > 0) return { data: [{ id: ID }] };
      if (c.tabela === "inscricoes" && op(c, "maybeSingle").length > 0) {
        return { data: { situacao: "pendente", promocao_automatica: true } };
      }
      if (c.tabela === "inscricoes") {
        return { data: [{ id: ID, riot_id: "A#1", situacao: "pendente", promocao_automatica: true }] };
      }
      if (c.tabela === "inscricao_conferencias") {
        return { data: ["a", "b", "d", "e", "f", "m"].map((item) => ({ inscricao_id: ID, item, estado: "ok" })) };
      }
      // O lote (listarPagamentos) vê "pago"; a releitura por inscrito vê "aguardando".
      if (c.tabela === "inscricao_pagamentos" && op(c, "maybeSingle").length > 0) return { data: { estado: "aguardando" } };
      if (c.tabela === "inscricao_pagamentos") return { data: [{ inscricao_id: ID, estado: "pago" }] };
      return { data: null };
    };
    expect(await store.reavaliarPendentes()).toEqual([]);
    expect(updates("inscricoes")).toEqual([]);
  });
});

// ---------------------------------------------------------------------- o jogador

describe("minhaInscricao", () => {
  it("o jogador nunca recebe o que o robô viu: nada de puuid, colunas riot_ ou retrato", async () => {
    banco.responder = (c) =>
      c.tabela === "inscricoes"
        ? {
            data: {
              id: ID,
              criado_em: "2026-10-06T00:00:00.000Z",
              riot_id: "A#B",
              elo_declarado: "Ouro",
              elo_verificado: null,
              elo_congelado: null,
              rota_primaria: "MID",
              rota_secundaria: "TOP",
              disponibilidade: [],
              situacao: "pendente",
              observacao: null,
            },
          }
        : { data: [] };
    await store.minhaInscricao("jogador-1");
    const selects = banco.chamadas.flatMap((c) => op(c, "select").map((a) => String(a[0])));
    expect(selects.length).toBeGreaterThan(0);
    for (const s of selects) {
      expect(s).not.toContain("*");
      for (const coluna of s.split(",").map((x) => x.trim())) {
        // `riot_id` é o Riot ID que o próprio jogador informou — o resto de `riot_*` é do robô.
        if (coluna === "riot_id") continue;
        expect(coluna).not.toMatch(/puuid|^riot_|retrato|elo_riot|elo_fonte|conferido_por/);
      }
    }
  });
});

// ---------------------------------------------------------------------- inscrição

describe("criarInscricao confere o Riot ID na Riot", () => {
  const DADOS = {
    nick: "Fulano",
    tag: "BR1",
    nomeReal: "Fulano de Tal",
    discord: "fulano",
    whatsapp: undefined,
    elo: "Ouro",
    rotaPrimaria: "MID",
    rotaSecundaria: "TOP",
    disponibilidade: ["noite" as const],
    querCapitao: false,
    aceiteRegulamento: true as const,
    aceiteImagem: true as const,
    aceiteRequisitos: true as const,
  };
  const DONO = { ipHash: "h", jogadorId: "j", email: "fulano@exemplo.com" };

  function responderInscricao(pausaAte: string | null = null) {
    return (c: Chamada): Resposta => {
      if (c.tabela === "edicao_config" && op(c, "update").length === 0) {
        return { data: { inscricoes_abertas: true, fechamento_inscricoes: null, riot_pausa_ate: pausaAte } };
      }
      if (c.tabela === "inscricoes" && op(c, "insert").length > 0) {
        return { data: { id: ID, riot_id: "Fulano#BR1", elo_declarado: "Ouro", pontos: 4 } };
      }
      if (c.tabela === "inscricoes") return { data: null, count: 0 };
      return { data: null };
    };
  }

  const inserido = () => op(banco.chamadas.find((c) => c.tabela === "inscricoes" && op(c, "insert").length > 0)!, "insert")[0]![0];

  function riotResponde(status: number, corpo: unknown = {}, cabecalhos: Record<string, string> = {}) {
    const fetch = vi.fn(async () => new Response(JSON.stringify(corpo), { status, headers: cabecalhos }));
    vi.stubGlobal("fetch", fetch);
    vi.stubEnv("RIOT_API_KEY", "RGAPI-teste");
    return fetch;
  }

  it("Riot ID que não existe: recusa com mensagem clara e NÃO grava", async () => {
    banco.responder = responderInscricao();
    riotResponde(404);
    await expect(store.criarInscricao(DADOS, DONO)).rejects.toThrow(/Não encontramos o Riot ID Fulano#BR1/);
    expect(banco.chamadas.some((c) => c.tabela === "inscricoes" && op(c, "insert").length > 0)).toBe(false);
  });

  it("existe: grava, já com o PUUID e o Riot ID que a conta tem hoje", async () => {
    banco.responder = responderInscricao();
    riotResponde(200, { puuid: "p-9", gameName: "Fulano", tagLine: "BR1" });
    await store.criarInscricao(DADOS, DONO);
    expect(inserido()).toMatchObject({ puuid: "p-9", riot_id_atual: "Fulano#BR1", pontos: 4 });
  });

  it("Riot fora do ar, limite ou sem chave: a inscrição passa sem conferir", async () => {
    for (const preparar of [
      () => riotResponde(503),
      () => riotResponde(429, {}, { "retry-after": "30" }),
      () => vi.stubEnv("RIOT_API_KEY", ""),
    ]) {
      banco.chamadas.length = 0;
      banco.responder = responderInscricao();
      preparar();
      await store.criarInscricao(DADOS, DONO);
      expect(inserido()).not.toHaveProperty("puuid");
      vi.unstubAllEnvs();
      vi.unstubAllGlobals();
    }
  });

  it("429 de verdade: pausa o robô para ninguém insistir", async () => {
    banco.responder = responderInscricao();
    riotResponde(429, {}, { "retry-after": "30" });
    await store.criarInscricao(DADOS, DONO);
    expect(updates("edicao_config").some((c) => "riot_pausa_ate" in (op(c, "update")[0]![0] as object))).toBe(true);
  });

  it("robô pausado: nem consulta a Riot", async () => {
    banco.responder = responderInscricao(new Date(Date.now() + 60_000).toISOString());
    const fetch = riotResponde(404);
    await store.criarInscricao(DADOS, DONO);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("quem já tem inscrição é barrado ANTES de gastar consulta na Riot", async () => {
    banco.responder = (c) =>
      c.tabela === "inscricoes" && temOp(c, "eq", "jogador_id", "j") ? { data: null, count: 1 } : responderInscricao()(c);
    const fetch = riotResponde(200, { puuid: "p", gameName: "Fulano", tagLine: "BR1" });
    await expect(store.criarInscricao(DADOS, DONO)).rejects.toThrow(/já tem uma inscrição/);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("passou do teto de consultas por conta/origem: inscreve SEM consultar a Riot", async () => {
    banco.responder = (c) =>
      c.tabela === "inscricao_consultas_riot" && op(c, "insert").length === 0 ? { data: null, count: 6 } : responderInscricao()(c);
    const fetch = riotResponde(404);
    await store.criarInscricao(DADOS, DONO);
    expect(fetch).not.toHaveBeenCalled();
    expect(inserido()).not.toHaveProperty("puuid");
  });

  it("cada consulta fica registrada, por conta e por origem", async () => {
    banco.responder = responderInscricao();
    riotResponde(200, { puuid: "p", gameName: "Fulano", tagLine: "BR1" });
    await store.criarInscricao(DADOS, DONO);
    const contagem = banco.chamadas.find((c) => c.tabela === "inscricao_consultas_riot" && op(c, "insert").length === 0)!;
    expect(temOp(contagem, "or", "jogador_id.eq.j,ip_hash.eq.h")).toBe(true);
    const registro = banco.chamadas.find((c) => c.tabela === "inscricao_consultas_riot" && op(c, "insert").length > 0)!;
    expect(op(registro, "insert")[0]![0]).toEqual({ jogador_id: "j", ip_hash: "h" });
  });

  it("o freio quebrou (tabela fora do ar): não consulta a Riot, e a inscrição segue", async () => {
    banco.responder = (c) =>
      c.tabela === "inscricao_consultas_riot" ? { data: null, error: { message: "relation does not exist" } } : responderInscricao()(c);
    const fetch = riotResponde(404);
    await store.criarInscricao(DADOS, DONO);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("a data de fechamento passou: recusa mesmo com a chave aberta", async () => {
    banco.responder = (c) =>
      c.tabela === "edicao_config"
        ? { data: { inscricoes_abertas: true, fechamento_inscricoes: "2020-01-01T00:00:00.000Z", riot_pausa_ate: null } }
        : { data: null, count: 0 };
    await expect(store.criarInscricao(DADOS, DONO)).rejects.toThrow(/encerradas/);
  });
});
