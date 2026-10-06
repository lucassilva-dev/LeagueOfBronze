import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ClienteRiot, RespostaRiot } from "@/lib/riot/cliente";

/**
 * A rodada do robô: fila, trava, pausa, simulação. O banco é simulado no nível do store e a
 * Riot por um cliente roteirizado — o que se mede é a ORDEM e o que é gravado.
 */

const estado = vi.hoisted(() => ({
  config: {} as Record<string, unknown>,
  inscricoes: [] as Record<string, unknown>[],
  trava: true,
  aplicados: [] as { id: string; decisao: unknown }[],
  falhas: [] as { id: string; msg: string }[],
  pausas: [] as number[],
  liberacoes: [] as (Record<string, unknown> | undefined)[],
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
  adquirirTravaDoRobo: async () => estado.trava,
  liberarTravaDoRobo: async (resumo?: Record<string, unknown>) => void estado.liberacoes.push(resumo),
  aplicarSincronizacao: async (id: string, decisao: unknown) => {
    estado.aplicados.push({ id, decisao });
    return { eloGravado: true, itensGravados: 1 };
  },
  registrarFalhaDoRobo: async (id: string, msg: string) => void estado.falhas.push({ id, msg }),
  pausarRobo: async (s: number) => void estado.pausas.push(s),
}));

const { sincronizarComRiot } = await import("@/lib/riot/sincronizar");

type Roteiro = Partial<{
  contaPorRiotId: (nome: string) => RespostaRiot<{ puuid: string; gameName: string; tagLine: string }>;
  contaPorPuuid: (puuid: string) => RespostaRiot<{ puuid: string; gameName: string; tagLine: string }>;
  regiaoDaConta: () => RespostaRiot<string>;
  entradasDaLiga: () => RespostaRiot<unknown[]>;
  nivelDoInvocador: () => RespostaRiot<number>;
  idsDePartidas: () => RespostaRiot<string[]>;
}>;

function clienteFalso(roteiro: Roteiro = {}) {
  const log: string[] = [];
  const conta = (nome: string) => ({ tipo: "ok" as const, dados: { puuid: `p-${nome}`, gameName: nome, tagLine: "BR1" } });
  const c = {
    chamadas: 0,
    parado: null,
    contaPorRiotId: async (nome: string) => (log.push(`riotid:${nome}`), (roteiro.contaPorRiotId ?? conta)(nome)),
    contaPorPuuid: async (puuid: string) =>
      (log.push(`puuid:${puuid}`), (roteiro.contaPorPuuid ?? ((p: string) => conta(p.replace(/^p-/, ""))))(puuid)),
    regiaoDaConta: async () => (log.push("regiao"), (roteiro.regiaoDaConta ?? (() => ({ tipo: "ok", dados: "br1" })))()),
    entradasDaLiga: async () =>
      (log.push("liga"),
      (roteiro.entradasDaLiga ??
        (() => ({
          tipo: "ok",
          dados: [
            { queueType: "RANKED_FLEX_SR", tier: "CHALLENGER", rank: "I", leaguePoints: 900, wins: 1, losses: 0 },
            { queueType: "RANKED_SOLO_5x5", tier: "GOLD", rank: "II", leaguePoints: 45, wins: 10, losses: 9 },
          ],
        })))()),
    nivelDoInvocador: async () => (log.push("nivel"), (roteiro.nivelDoInvocador ?? (() => ({ tipo: "ok", dados: 200 })))()),
    idsDePartidas: async () => (log.push("partidas"), (roteiro.idsDePartidas ?? (() => ({ tipo: "ok", dados: [] })))()),
  };
  return { cliente: c as unknown as ClienteRiot, log };
}

function inscrito(id: string, over: Record<string, unknown> = {}) {
  return {
    id,
    criado_em: `2026-10-0${id.length}T00:00:00.000Z`,
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
    riot_regiao: null,
    riot_nivel_em: null,
    riot_partidas_janela: null,
    riot_sincronizado_em: null,
    ...over,
  };
}

beforeEach(() => {
  estado.config = { congelamento_elo: null, inicio_campeonato: null, min_ranqueadas: 5, riot_pausa_ate: null };
  estado.inscricoes = [];
  estado.trava = true;
  estado.aplicados.length = 0;
  estado.falhas.length = 0;
  estado.pausas.length = 0;
  estado.liberacoes.length = 0;
});

describe("rodada do robô", () => {
  it("sem chave da Riot: nem trava, nem lê nada", async () => {
    vi.stubEnv("RIOT_API_KEY", "");
    const r = await sincronizarComRiot({ orcamentoMs: 60_000 });
    expect(r.desligado).toBe("sem_chave");
    expect(estado.liberacoes).toEqual([]);
    vi.unstubAllEnvs();
  });

  it("pausado pela Riot: não roda", async () => {
    estado.config.riot_pausa_ate = new Date(Date.now() + 60_000).toISOString();
    const r = await sincronizarComRiot({ orcamentoMs: 60_000, cliente: clienteFalso().cliente });
    expect(r.desligado).toBe("pausado");
  });

  it("outra rodada em andamento: não roda", async () => {
    estado.trava = false;
    estado.inscricoes = [inscrito("a")];
    const r = await sincronizarComRiot({ orcamentoMs: 60_000, cliente: clienteFalso().cliente });
    expect(r.desligado).toBe("travado");
    expect(estado.aplicados).toEqual([]);
  });

  it("quem está há mais tempo sem consulta vai primeiro; recusado e desistente ficam de fora", async () => {
    estado.inscricoes = [
      inscrito("novo", { riot_sincronizado_em: "2026-10-07T00:00:00.000Z" }),
      inscrito("velho", { riot_sincronizado_em: "2026-10-01T00:00:00.000Z" }),
      inscrito("nunca"),
      inscrito("fora", { situacao: "recusado" }),
      inscrito("saiu", { situacao: "desistiu" }),
    ];
    const r = await sincronizarComRiot({ orcamentoMs: 60_000, cliente: clienteFalso().cliente });
    expect(estado.aplicados.map((a) => a.id)).toEqual(["nunca", "velho", "novo"]);
    expect(r).toMatchObject({ naFila: 3, processados: 3 });
    // Resumo gravado ao soltar a trava — só contagens.
    expect(estado.liberacoes[0]).toMatchObject({ processados: 3, simular: false });
    expect(estado.liberacoes[0]).not.toHaveProperty("mudancas");
  });

  it("usa a SOLO/DUO, mesmo com a flex mais alta", async () => {
    estado.inscricoes = [inscrito("a")];
    await sincronizarComRiot({ orcamentoMs: 60_000, cliente: clienteFalso().cliente });
    const decisao = estado.aplicados[0]!.decisao as { elo: { para: string } | null };
    expect(decisao.elo?.para).toBe("Ouro");
  });

  it("429 de verdade no meio: para, pausa pelo Retry-After e solta a trava", async () => {
    estado.inscricoes = [inscrito("a"), inscrito("bb"), inscrito("ccc")];
    let n = 0;
    const { cliente } = clienteFalso({
      entradasDaLiga: () => (++n === 2 ? { tipo: "limite", esperarSegundos: 42, proprio: false } : { tipo: "ok", dados: [] }),
    });
    const r = await sincronizarComRiot({ orcamentoMs: 60_000, cliente });
    expect(r.parouPor).toBe("limite");
    expect(estado.pausas).toEqual([42]);
    expect(estado.aplicados.map((a) => a.id)).toEqual(["a"]);
    expect(estado.liberacoes).toHaveLength(1);
  });

  it("cota própria quase cheia: para sem pausar ninguém (não foi a Riot que recusou)", async () => {
    estado.inscricoes = [inscrito("a")];
    const { cliente } = clienteFalso({ entradasDaLiga: () => ({ tipo: "limite", esperarSegundos: 120, proprio: true }) });
    const r = await sincronizarComRiot({ orcamentoMs: 60_000, cliente });
    expect(r.parouPor).toBe("cota");
    expect(estado.pausas).toEqual([]);
  });

  it("erro com um inscrito: registra e segue para o próximo", async () => {
    estado.inscricoes = [inscrito("a"), inscrito("bb")];
    const { cliente } = clienteFalso({
      contaPorRiotId: (nome) =>
        nome === "a" ? { tipo: "erro", status: 503, mensagem: "Riot respondeu 503" } : { tipo: "ok", dados: { puuid: "p", gameName: nome, tagLine: "BR1" } },
    });
    const r = await sincronizarComRiot({ orcamentoMs: 60_000, cliente });
    expect(estado.falhas).toEqual([{ id: "a", msg: "Riot respondeu 503" }]);
    expect(estado.aplicados.map((a) => a.id)).toEqual(["bb"]);
    expect(r.erros).toBe(1);
  });

  it("simulação: consulta, mas não grava, não pausa e não registra rodada", async () => {
    estado.inscricoes = [inscrito("a")];
    const r = await sincronizarComRiot({ simular: true, orcamentoMs: 60_000, cliente: clienteFalso().cliente });
    expect(estado.aplicados).toEqual([]);
    expect(estado.liberacoes).toEqual([undefined]);
    // Declarou Ouro e é Ouro: o elo não aparece (só a fonte mudaria) — os requisitos, sim.
    expect(r.mudancas).toEqual([
      { riotId: "a#BR1", status: "ok", riotIdAtual: "a#BR1", itens: [{ item: "m", estado: "ok" }, { item: "d", estado: "ok" }] },
    ]);
  });

  it("simulação mostra elo e pontos quando o valor muda", async () => {
    estado.inscricoes = [inscrito("a", { elo_declarado: "Prata", pontos: 3 })];
    const r = await sincronizarComRiot({ simular: true, orcamentoMs: 60_000, cliente: clienteFalso().cliente });
    expect(r.mudancas?.[0]?.elo).toEqual({ de: "Prata", para: "Ouro", pontosDe: 3, pontosPara: 4 });
    expect(r.elosMudados).toBe(1);
  });

  it("conta em outro servidor: não consulta a liga do BR", async () => {
    estado.inscricoes = [inscrito("a")];
    const { cliente, log } = clienteFalso({ regiaoDaConta: () => ({ tipo: "ok", dados: "na1" }) });
    await sincronizarComRiot({ orcamentoMs: 60_000, cliente });
    expect(log).not.toContain("liga");
  });

  it("PUUID que a Riot não decifra mais: resolve de novo pelo Riot ID", async () => {
    estado.inscricoes = [inscrito("a", { puuid: "velho" })];
    const { cliente, log } = clienteFalso({ contaPorPuuid: () => ({ tipo: "puuid_invalido" }) });
    await sincronizarComRiot({ orcamentoMs: 60_000, cliente });
    expect(log.slice(0, 2)).toEqual(["puuid:velho", "riotid:a"]);
    expect(estado.aplicados).toHaveLength(1);
  });

  it("nível e servidor só uma vez por semana", async () => {
    estado.inscricoes = [
      inscrito("a", { puuid: "p-a", riot_regiao: "br1", riot_nivel_em: new Date(Date.now() - 86_400_000).toISOString() }),
    ];
    const { cliente, log } = clienteFalso();
    await sincronizarComRiot({ orcamentoMs: 60_000, cliente });
    expect(log).toEqual(["puuid:p-a", "liga"]);
  });

  it("só o inscrito pedido, quando a gaveta pede «atualizar» — e isso não conta como «última rodada»", async () => {
    estado.inscricoes = [inscrito("a"), inscrito("bb")];
    await sincronizarComRiot({ orcamentoMs: 60_000, inscricaoId: "bb", cliente: clienteFalso().cliente });
    expect(estado.aplicados.map((a) => a.id)).toEqual(["bb"]);
    // Sem resumo: senão o aviso de "rotina diária parada" nunca apareceria.
    expect(estado.liberacoes).toEqual([undefined]);
  });

  it("429 de verdade na SIMULAÇÃO também pausa — a pausa protege a chave", async () => {
    estado.inscricoes = [inscrito("a")];
    const { cliente } = clienteFalso({ entradasDaLiga: () => ({ tipo: "limite", esperarSegundos: 30, proprio: false }) });
    await sincronizarComRiot({ simular: true, orcamentoMs: 60_000, cliente });
    expect(estado.pausas).toEqual([30]);
  });

  it("rodada que estourou no meio: solta a trava, mas não se registra como rodada feita", async () => {
    estado.inscricoes = [inscrito("a")];
    const { cliente } = clienteFalso({
      entradasDaLiga: () => {
        throw new Error("banco caiu");
      },
    });
    await expect(sincronizarComRiot({ orcamentoMs: 60_000, cliente })).rejects.toThrow("banco caiu");
    expect(estado.liberacoes).toEqual([undefined]);
  });

  it("depois de um congelamento (mesmo manual), o robô não mexe no elo de mais ninguém", async () => {
    estado.inscricoes = [
      inscrito("a", { elo_declarado: "Prata", pontos: 3 }),
      inscrito("bb", { situacao: "apto", elo_congelado: "Ouro" }),
    ];
    await sincronizarComRiot({ orcamentoMs: 60_000, cliente: clienteFalso().cliente });
    const decisao = estado.aplicados.find((a) => a.id === "a")!.decisao as { elo: unknown; colunasRiot: Record<string, unknown> };
    expect(decisao.elo).toBeNull();
    expect(decisao.colunasRiot.elo_riot).toBe("Ouro"); // o que a Riot mostra continua registrado
  });
});
