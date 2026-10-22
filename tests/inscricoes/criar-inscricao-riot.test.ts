import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { criarBancoSimulado } from "./_banco-simulado";

/**
 * O formulário público e a Riot.
 *
 *  - INS-04: a mesma CONTA da Riot não entra duas vezes. O índice do banco compara o Riot ID
 *    escrito; a Riot acha «betyclarao#br1» e «Bety Clarão#BR1» como a mesma conta. Quem
 *    identifica a conta é o PUUID.
 *  - SEG-03: o teto de consultas à Riot por conta/origem segura também uma RAJADA. Contar e
 *    só depois gravar deixava 40 envios simultâneos contarem zero ao mesmo tempo e
 *    consultarem a Riot 40 vezes (429 e robô pausado).
 *  - INS-17 / INF-05: falha ao ler o pagamento ou os requisitos não vira «sem pagamento» e
 *    «sem requisitos» na tela do jogador.
 */

const estado = vi.hoisted(() => ({
  banco: null as unknown as ReturnType<typeof import("./_banco-simulado").criarBancoSimulado>,
  riot: { chamadas: 0, puuid: "PUUID-X" as string | null },
}));

vi.mock("@/lib/data-store", () => ({
  isSupabaseConfigured: () => true,
  createSupabaseAdminClient: () => estado.banco.cliente(),
}));

const store = await import("@/lib/inscricoes/store");
const { inscricaoPublicaSchema } = await import("@/lib/inscricoes/schema");
const { ErroDeRegra } = await import("@/lib/security/erros");

function dados(nick: string, tag = "BR1", discord = `${nick.replace(/\W/g, "")}_dc`) {
  return inscricaoPublicaSchema.parse({
    nick,
    tag,
    nomeReal: "Fulano de Tal",
    discord,
    elo: "Ouro",
    rotaPrimaria: "MID",
    rotaSecundaria: "TOP",
    disponibilidade: ["noite"],
    aceiteRegulamento: true,
    aceiteImagem: true,
    aceiteRequisitos: true,
  });
}

beforeEach(() => {
  estado.banco = criarBancoSimulado();
  estado.banco.tabelas = {
    edicao_config: [{ id: 1, inscricoes_abertas: true, fechamento_inscricoes: null, riot_pausa_ate: null }],
    inscricoes: [],
  };
  estado.riot.chamadas = 0;
  estado.riot.puuid = "PUUID-X";
  vi.stubEnv("RIOT_API_KEY", "RGAPI-teste");
  // A Riot: conta encontrada com o PUUID combinado, ou 404 quando `puuid` é nulo.
  vi.stubGlobal("fetch", async (url: string) => {
    estado.riot.chamadas += 1;
    if (!estado.riot.puuid) return new Response(JSON.stringify({ status: { status_code: 404 } }), { status: 404 });
    const nome = decodeURIComponent(String(url).split("/by-riot-id/")[1]?.split("/")[0] ?? "x");
    return new Response(JSON.stringify({ puuid: estado.riot.puuid, gameName: nome, tagLine: "BR1" }), { status: 200 });
  });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("a mesma conta da Riot não entra duas vezes (INS-04)", () => {
  beforeEach(() => {
    estado.banco.tabelas.inscricoes = [
      { id: "antiga", jogador_id: "outra-conta", ip_hash: "h0", riot_id: "Bety Clarão#BR1", puuid: "PUUID-X", situacao: "pendente" },
    ];
  });

  it("«betyclarao#br1», de outra conta do site, resolve para o MESMO PUUID: recusada, nada gravado", async () => {
    const tentativa = store.criarInscricao(dados("betyclarao", "br1"), { ipHash: "h1", jogadorId: "eu", email: "eu@x.com" });
    await expect(tentativa).rejects.toBeInstanceOf(ErroDeRegra);
    await expect(tentativa).rejects.toThrow(/Essa conta da Riot já está inscrita/);
    expect(estado.banco.tabelas.inscricoes!.map((i) => i.id)).toEqual(["antiga"]);
  });

  it("controle: outra conta da Riot (outro PUUID) entra, com o PUUID gravado", async () => {
    estado.riot.puuid = "PUUID-Y";
    const criada = await store.criarInscricao(dados("Outra Pessoa"), { ipHash: "h1", jogadorId: "eu", email: "eu@x.com" });
    expect(criada.puuid).toBe("PUUID-Y");
    expect(estado.banco.tabelas.inscricoes).toHaveLength(2);
  });

  it("com a Riot fora (sem conferir), não há PUUID para comparar: a inscrição segue, e o robô confere depois", async () => {
    vi.stubGlobal("fetch", async () => {
      estado.riot.chamadas += 1;
      return new Response("{}", { status: 503 });
    });
    const criada = await store.criarInscricao(dados("betyclarao", "br1"), { ipHash: "h1", jogadorId: "eu", email: "eu@x.com" });
    expect(criada.puuid).toBeUndefined();
  });
});

describe("o teto de consultas à Riot segura uma rajada (SEG-03)", () => {
  beforeEach(() => {
    estado.riot.puuid = null; // Riot ID inexistente: nada é gravado e a pessoa pode tentar de novo
    estado.banco.latenciaMs = 1;
  });

  it("40 envios SIMULTÂNEOS da mesma conta: no máximo 6 consultas à Riot", async () => {
    const dono = { ipHash: "h-atacante", jogadorId: "conta-atacante", email: "a@x.com" };
    await Promise.allSettled(Array.from({ length: 40 }, (_, i) => store.criarInscricao(dados(`NaoExiste${i}`), dono)));
    expect(estado.riot.chamadas).toBeLessThanOrEqual(6);
  });

  it("controle: em sequência, exatamente as 6 primeiras consultam", async () => {
    const dono = { ipHash: "h-seq", jogadorId: "conta-seq", email: "s@x.com" };
    for (let i = 0; i < 10; i++) await store.criarInscricao(dados(`NaoExiste${i}`), dono).catch(() => {});
    expect(estado.riot.chamadas).toBe(6);
  });
});

describe("a minha inscrição não esconde falha de leitura (INS-17 / INF-05)", () => {
  beforeEach(() => {
    estado.banco.tabelas = {
      inscricoes: [
        {
          id: "minha",
          jogador_id: "eu",
          criado_em: "2026-10-10T10:00:00.000Z",
          riot_id: "Fulano#BR1",
          elo_declarado: "Ouro",
          elo_verificado: null,
          elo_congelado: null,
          rota_primaria: "MID",
          rota_secundaria: "TOP",
          disponibilidade: ["noite"],
          situacao: "pendente",
          observacao: null,
        },
      ],
      inscricao_pagamentos: [{ inscricao_id: "minha", estado: "aguardando", valor_centavos: 2000, vence_em: null }],
      inscricao_conferencias: [{ inscricao_id: "minha", item: "a", estado: "pendente", observacao: null }],
    };
  });

  it("controle: com o banco no ar, vêm o pagamento e os requisitos", async () => {
    const minha = await store.minhaInscricao("eu");
    expect(minha?.pagamento?.estado).toBe("aguardando");
    expect(minha?.conferencias).toHaveLength(1);
  });

  it("a leitura do pagamento falhou: estoura (a tela diz que não carregou), em vez de esconder o Pix", async () => {
    estado.banco.falha = (tabela) => (tabela === "inscricao_pagamentos" ? "tempo esgotado" : null);
    await expect(store.minhaInscricao("eu")).rejects.toThrow(/Falha ao ler o pagamento/);
  });

  it("a leitura dos requisitos falhou: estoura, em vez de mostrar a lista vazia", async () => {
    estado.banco.falha = (tabela) => (tabela === "inscricao_conferencias" ? "conexão derrubada" : null);
    await expect(store.minhaInscricao("eu")).rejects.toThrow(/Falha ao ler os requisitos/);
  });
});
