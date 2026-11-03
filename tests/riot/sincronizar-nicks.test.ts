import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ClienteRiot, RespostaRiot } from "@/lib/riot/cliente";
import type { Player, TournamentDataset } from "@/lib/schema";

/**
 * A etapa do robô que leva o nick novo ao site. Banco simulado no nível do store e do
 * data-store; a Riot por um cliente roteirizado.
 */

const estado = vi.hoisted(() => ({
  inscricoes: [] as Record<string, unknown>[],
  dataset: null as unknown,
  versao: 7,
  gravados: [] as { dataset: unknown; versaoEsperada?: number }[],
  conflitosAntesDeGravar: 0,
  provedor: "supabase" as "supabase" | "local",
}));

vi.mock("@/lib/inscricoes/store", async (original) => ({
  ...(await original<Record<string, unknown>>()),
  listarInscricoes: async () => estado.inscricoes,
}));

vi.mock("@/lib/data-store", async (original) => {
  const real = await original<typeof import("@/lib/data-store")>();
  return {
    ...real,
    getConfiguredDataProvider: () => estado.provedor,
    readDatasetComVersao: async () => ({ dataset: structuredClone(estado.dataset), versao: estado.versao }),
    saveDataset: async (dataset: unknown, opts?: { versaoEsperada?: number }) => {
      if (estado.conflitosAntesDeGravar > 0) {
        estado.conflitosAntesDeGravar -= 1;
        estado.versao += 1;
        throw new real.ConflitoDeVersaoError(estado.versao);
      }
      estado.gravados.push({ dataset, versaoEsperada: opts?.versaoEsperada });
      return dataset;
    },
  };
});

const { sincronizarNicksDoSite, contasDasInscricoes, contasDaVirada } = await import("@/lib/riot/sincronizar-nicks");
const { atualizarNicksDosJogadores } = await import("@/lib/riot/nicks-do-site");

type Conta = { puuid: string; gameName: string; tagLine: string };

function clienteFalso(roteiro: {
  contaPorPuuid?: (puuid: string) => RespostaRiot<Conta>;
  contaPorRiotId?: (nome: string, tag: string) => RespostaRiot<Conta>;
} = {}) {
  const log: string[] = [];
  const cliente = {
    chamadas: 0,
    contaPorPuuid: async (puuid: string) => (log.push(`puuid:${puuid}`), (roteiro.contaPorPuuid ?? (() => ({ tipo: "nao_encontrado" })))(puuid)),
    contaPorRiotId: async (nome: string, tag: string) =>
      (log.push(`riotid:${nome}#${tag}`), (roteiro.contaPorRiotId ?? (() => ({ tipo: "nao_encontrado" })))(nome, tag)),
  };
  return { cliente: cliente as unknown as ClienteRiot, log };
}

function jogador(over: Partial<Player> & Pick<Player, "id" | "nick">): Player {
  return { slug: over.id, teamId: "t1", role1: "MID", elo: "Ouro", ...over };
}

function dataset(players: Player[], arquivados: Player[] = []): TournamentDataset {
  return {
    players,
    archivedSeasons: arquivados.length
      ? [{ seasonId: "s3", name: "3ª", archivedAtISO: "2026-01-01", snapshot: { players: arquivados } }]
      : [],
  } as unknown as TournamentDataset;
}

const inscricao = (over: Record<string, unknown>) => ({
  situacao: "apto",
  puuid: "P-NAK",
  riot_id: "Nak4y#BR1",
  riot_id_atual: "Nak4y#BR1",
  ...over,
});

const opcoes = (cliente: ClienteRiot, over: Partial<Parameters<typeof sincronizarNicksDoSite>[0]> = {}) => ({
  cliente,
  simular: false,
  consultarRiot: true,
  prazoMs: Date.now() + 60_000,
  ...over,
});

const gravado = () => estado.gravados.at(-1)!.dataset as TournamentDataset;

beforeEach(() => {
  estado.inscricoes = [];
  estado.dataset = dataset([]);
  estado.versao = 7;
  estado.gravados = [];
  estado.conflitosAntesDeGravar = 0;
  estado.provedor = "supabase";
});

describe("contasDasInscricoes", () => {
  it("só as inscrições que o robô consulta todo dia, e só com conta conhecida", () => {
    const contas = contasDasInscricoes([
      inscricao({ riot_id_atual: "Nak4y Novo#BR1" }),
      inscricao({ situacao: "desistiu", puuid: "P-X", riot_id: "X#1" }),
      inscricao({ puuid: null, riot_id: "Y#1" }),
      inscricao({ situacao: "pendente", puuid: "P-Z", riot_id: "Z#1", riot_id_atual: null }),
    ] as never);
    expect(contas).toEqual([
      { puuid: "P-NAK", riotId: "Nak4y Novo#BR1", outrosNomes: ["Nak4y#BR1"], renomeia: true, ligaArquivo: true, lidaEm: null },
      { puuid: "P-Z", riotId: "Z#1", outrosNomes: ["Z#1"], renomeia: true, ligaArquivo: false, lidaEm: null },
    ]);
  });

  it("com o início da rodada: só o Riot ID lido NELA troca nick (o resto pode ser de ontem)", () => {
    const contas = contasDasInscricoes(
      [
        inscricao({ puuid: "P-HOJE", riot_sincronizado_em: "2026-11-03T09:00:05.000Z", riot_status: "ok" }),
        inscricao({ puuid: "P-ONTEM", riot_sincronizado_em: "2026-11-02T09:00:05.000Z", riot_status: "ok" }),
        inscricao({ puuid: "P-ERRO", riot_sincronizado_em: "2026-11-03T09:00:06.000Z", riot_status: "erro" }),
      ] as never,
      { lidasDesde: "2026-11-03T09:00:00.000Z" },
    );
    expect(contas.map((c) => [c.puuid, c.renomeia])).toEqual([
      ["P-HOJE", true],
      ["P-ONTEM", false],
      ["P-ERRO", false],
    ]);
  });
});

describe("sincronizarNicksDoSite", () => {
  it("a inscrição ativa trocou de nick: o site (e a temporada arquivada) ganham o novo, sem chamar a Riot", async () => {
    estado.inscricoes = [inscricao({ riot_id_atual: "Nak4y Novo#BR1" })];
    estado.dataset = dataset([jogador({ id: "nak4y", nick: "Nak4y#BR1" })], [jogador({ id: "nak-3", nick: "NAK4Y #BR1" })]);
    const { cliente, log } = clienteFalso();

    const r = await sincronizarNicksDoSite(opcoes(cliente));

    expect(log).toEqual([]);
    expect(r).toMatchObject({ atualizados: 2, vinculados: 2, consultas: 0 });
    expect(estado.gravados).toHaveLength(1);
    expect(estado.gravados[0]!.versaoEsperada).toBe(7);
    expect(gravado().players[0]).toMatchObject({ id: "nak4y", slug: "nak4y", nick: "Nak4y Novo#BR1", puuid: "P-NAK" });
    expect(gravado().archivedSeasons[0]!.snapshot.players[0]).toMatchObject({ nick: "Nak4y Novo#BR1", puuid: "P-NAK" });
  });

  it("jogador sem inscrição ativa e com puuid: consulta a conta pelo puuid", async () => {
    estado.dataset = dataset([jogador({ id: "satoshi", nick: "Satoshi#BR1", puuid: "P-SAT" })]);
    const { cliente, log } = clienteFalso({
      contaPorPuuid: () => ({ tipo: "ok", dados: { puuid: "P-SAT", gameName: "Satoshi Nakamoto", tagLine: "BTC" } }),
    });

    const r = await sincronizarNicksDoSite(opcoes(cliente));

    expect(log).toEqual(["puuid:P-SAT"]);
    expect(r).toMatchObject({ atualizados: 1, consultas: 1 });
    expect(gravado().players[0]!.nick).toBe("Satoshi Nakamoto#BTC");
  });

  it("jogador sem puuid nem inscrição: liga pela conta do próprio Riot ID do site", async () => {
    estado.dataset = dataset([jogador({ id: "satoshi", nick: "Satoshi#BR1" })]);
    const { cliente, log } = clienteFalso({
      contaPorRiotId: () => ({ tipo: "ok", dados: { puuid: "P-SAT", gameName: "Satoshi", tagLine: "BR1" } }),
    });

    const r = await sincronizarNicksDoSite(opcoes(cliente));

    expect(log).toEqual(["riotid:Satoshi#BR1"]);
    expect(r).toMatchObject({ atualizados: 0, vinculados: 1 });
    expect(gravado().players[0]).toMatchObject({ nick: "Satoshi#BR1", puuid: "P-SAT" });
  });

  it("a chave da API mudou (puuid que a Riot não decifra): reencontra pelo nick e regrava o puuid", async () => {
    estado.dataset = dataset([jogador({ id: "satoshi", nick: "Satoshi#BR1", puuid: "P-VELHO" })]);
    const { cliente, log } = clienteFalso({
      contaPorPuuid: () => ({ tipo: "puuid_invalido" }),
      contaPorRiotId: () => ({ tipo: "ok", dados: { puuid: "P-NOVO", gameName: "Satoshi", tagLine: "BR1" } }),
    });

    await sincronizarNicksDoSite(opcoes(cliente));

    expect(log).toEqual(["puuid:P-VELHO", "riotid:Satoshi#BR1"]);
    expect(gravado().players[0]!.puuid).toBe("P-NOVO");
  });

  it("simulação: devolve o que mudaria e não grava nada", async () => {
    estado.inscricoes = [inscricao({ riot_id_atual: "Nak4y Novo#BR1" })];
    estado.dataset = dataset([jogador({ id: "nak4y", nick: "Nak4y#BR1" })]);

    const r = await sincronizarNicksDoSite(opcoes(clienteFalso().cliente, { simular: true }));

    expect(estado.gravados).toEqual([]);
    expect(r.mudancas).toEqual([{ temporada: null, jogadorId: "nak4y", de: "Nak4y#BR1", para: "Nak4y Novo#BR1" }]);
  });

  it("sem consultas à Riot (o «atualizar» de um inscrito): só o que as inscrições já sabem", async () => {
    estado.inscricoes = [inscricao({ riot_id_atual: "Nak4y Novo#BR1" })];
    estado.dataset = dataset([jogador({ id: "nak4y", nick: "Nak4y#BR1" }), jogador({ id: "satoshi", nick: "Satoshi#BR1" })]);
    const { cliente, log } = clienteFalso();

    await sincronizarNicksDoSite(opcoes(cliente, { consultarRiot: false }));

    expect(log).toEqual([]);
    expect(gravado().players.map((p) => p.nick)).toEqual(["Nak4y Novo#BR1", "Satoshi#BR1"]);
  });

  it("o painel gravou no meio (conflito de versão): relê e grava por cima da versão nova", async () => {
    estado.inscricoes = [inscricao({ riot_id_atual: "Nak4y Novo#BR1" })];
    estado.dataset = dataset([jogador({ id: "nak4y", nick: "Nak4y#BR1" })]);
    estado.conflitosAntesDeGravar = 1;

    await sincronizarNicksDoSite(opcoes(clienteFalso().cliente));

    expect(estado.gravados).toHaveLength(1);
    expect(estado.gravados[0]!.versaoEsperada).toBe(8);
  });

  it("a cota acabou: para as consultas, mas ainda grava o que as inscrições já sabem", async () => {
    estado.inscricoes = [inscricao({ riot_id_atual: "Nak4y Novo#BR1" })];
    estado.dataset = dataset([
      jogador({ id: "nak4y", nick: "Nak4y#BR1" }),
      jogador({ id: "a", nick: "A#1", puuid: "P-A" }),
      jogador({ id: "b", nick: "B#1", puuid: "P-B" }),
    ]);
    const { cliente, log } = clienteFalso({ contaPorPuuid: () => ({ tipo: "limite", esperarSegundos: 30, proprio: true }) });

    const r = await sincronizarNicksDoSite(opcoes(cliente));

    expect(log).toEqual(["puuid:P-A"]);
    expect(r.parouPor).toBe("cota");
    expect(gravado().players[0]!.nick).toBe("Nak4y Novo#BR1");
  });

  it("nada mudou: não grava (nem gera versão nova do dataset)", async () => {
    estado.inscricoes = [inscricao({})];
    estado.dataset = dataset([jogador({ id: "nak4y", nick: "Nak4y#BR1", puuid: "P-NAK" })]);

    const r = await sincronizarNicksDoSite(opcoes(clienteFalso().cliente));

    expect(estado.gravados).toEqual([]);
    expect(r).toMatchObject({ atualizados: 0, vinculados: 0 });
  });

  it("com o arquivo local (desenvolvimento, testes): não lê nem grava nada — a semente do repositório não muda", async () => {
    estado.provedor = "local";
    estado.inscricoes = [inscricao({ riot_id_atual: "Nak4y Novo#BR1" })];
    estado.dataset = dataset([jogador({ id: "nak4y", nick: "Nak4y#BR1" })]);
    const { cliente, log } = clienteFalso();

    const r = await sincronizarNicksDoSite(opcoes(cliente));

    expect(estado.gravados).toEqual([]);
    expect(log).toEqual([]);
    expect(r).toMatchObject({ atualizados: 0, vinculados: 0, consultas: 0 });
  });

  it("rodada parcial: a inscrição não consultada nesta rodada NÃO devolve o nick velho (a importação já gravou o novo)", async () => {
    estado.inscricoes = [inscricao({ puuid: "P1", riot_id: "Velho#BR1", riot_id_atual: "Velho#BR1", riot_sincronizado_em: "2026-11-02T09:00:00.000Z" })];
    estado.dataset = dataset([jogador({ id: "velho", nick: "Novo#BR1", puuid: "P1" })], [jogador({ id: "velho-3", nick: "Novo#BR1", puuid: "P1" })]);

    await sincronizarNicksDoSite(opcoes(clienteFalso().cliente, { consultarRiot: false, inicioDaRodadaMs: Date.parse("2026-11-03T09:00:00.000Z") }));

    expect(estado.gravados).toEqual([]);
  });

  it("erro passageiro da Riot (5xx) na conta: não busca pelo nick (que pode ser de outra pessoa) nem mexe em nada", async () => {
    estado.dataset = dataset([jogador({ id: "a", nick: "Lobo#BR1", puuid: "PA" })]);
    const { cliente, log } = clienteFalso({
      contaPorPuuid: () => ({ tipo: "erro", status: 503, mensagem: "503" }),
      contaPorRiotId: () => ({ tipo: "ok", dados: { puuid: "PB", gameName: "Lobo", tagLine: "BR1" } }),
    });

    await sincronizarNicksDoSite(opcoes(cliente));

    expect(log).toEqual(["puuid:PA"]);
    expect(estado.gravados).toEqual([]);
  });

  it("limite da Riot: devolve o Retry-After para a rodada pausar pelo tempo certo", async () => {
    estado.dataset = dataset([jogador({ id: "a", nick: "A#1", puuid: "P-A" })]);
    const { cliente } = clienteFalso({ contaPorPuuid: () => ({ tipo: "limite", esperarSegundos: 117, proprio: false }) });

    const r = await sincronizarNicksDoSite(opcoes(cliente));

    expect(r).toMatchObject({ parouPor: "limite", esperarSegundos: 117 });
  });

  it("o arquivado com conta própria (sem inscrição ativa) não é tomado por quem pegou o nome antigo dele", async () => {
    estado.inscricoes = [inscricao({ puuid: "PB", riot_id: "Lobo#BR1", riot_id_atual: "Lobo Mau#BR1" })];
    estado.dataset = dataset([], [jogador({ id: "a", nick: "Lobo#BR1", puuid: "PA" })]);

    await sincronizarNicksDoSite(opcoes(clienteFalso().cliente));

    expect(estado.gravados).toEqual([]);
  });

  it("o arquivado SEM conta só se liga pelo nome a inscrição APTA (a pendente é de graça e sem conferência)", async () => {
    estado.inscricoes = [inscricao({ situacao: "pendente", puuid: "PB", riot_id: "Lobo#BR1", riot_id_atual: "Lobo Mau#BR1" })];
    estado.dataset = dataset([], [jogador({ id: "a", nick: "Lobo#BR1" })]);

    await sincronizarNicksDoSite(opcoes(clienteFalso().cliente));

    expect(estado.gravados).toEqual([]);
  });

  it("conta lida pelo robô para quem não tem inscrição ativa vale para a temporada atual, não liga o arquivo pelo nome", async () => {
    estado.dataset = dataset([jogador({ id: "sat", nick: "Satoshi#BR1" })], [jogador({ id: "sat-3", nick: "Satoshi#BR1" })]);
    const { cliente } = clienteFalso({
      contaPorRiotId: () => ({ tipo: "ok", dados: { puuid: "P-SAT", gameName: "Satoshi", tagLine: "BR1" } }),
    });

    await sincronizarNicksDoSite(opcoes(cliente));

    expect(gravado().players[0]!.puuid).toBe("P-SAT");
    expect(gravado().archivedSeasons[0]!.snapshot.players[0]!.puuid).toBeUndefined();
  });
});

describe("a virada do draft", () => {
  it("liga cada jogador do elenco à conta da inscrição dele — inclusive quem desistiu e ficou no elenco — com o nick de hoje", () => {
    const contas = contasDaVirada([
      inscricao({ situacao: "desistiu", puuid: "P-DES", riot_id: "Desistente#BR1", riot_id_atual: "Desistente Novo#BR1" }),
      inscricao({ puuid: null, riot_id: "SemConta#BR1" }),
    ] as never);
    expect(contas.every((c) => c.ligaArquivo === false)).toBe(true);

    const elenco = atualizarNicksDosJogadores(
      [jogador({ id: "desistente", nick: "Desistente#BR1" }), jogador({ id: "semconta", nick: "SemConta#BR1" })],
      contas,
    );
    expect(elenco[0]).toMatchObject({ id: "desistente", slug: "desistente", nick: "Desistente Novo#BR1", puuid: "P-DES" });
    expect(elenco[1]).toEqual(jogador({ id: "semconta", nick: "SemConta#BR1" }));
  });
});

