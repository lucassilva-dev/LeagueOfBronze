import { describe, expect, it, vi } from "vitest";

import { criarClienteRiot, janelaQuaseCheia } from "@/lib/riot/cliente";

/**
 * O cliente da API da Riot, com a rede simulada. O que importa aqui é o que ele faz quando
 * a Riot NÃO responde 200 — é aí que um erro vira chave bloqueada ou inscrição derrubada.
 */

function resposta(status: number, corpo: unknown, cabecalhos: Record<string, string> = {}) {
  return new Response(JSON.stringify(corpo), { status, headers: { "content-type": "application/json", ...cabecalhos } });
}

const CONTA = { puuid: "p-1", gameName: "Fulano", tagLine: "BR1" };

function cliente(respostas: Response[] | ((url: string) => Response), extra: Parameters<typeof criarClienteRiot>[0] = {}) {
  const fila = Array.isArray(respostas) ? [...respostas] : null;
  const fetch = vi.fn(async (url: string) => (fila ? fila.shift()! : (respostas as (u: string) => Response)(url)));
  const dormir = vi.fn(async () => {});
  const c = criarClienteRiot({ chave: "RGAPI-teste", fetch: fetch as unknown as typeof globalThis.fetch, dormir, intervaloMs: 0, ...extra });
  return { c, fetch, dormir };
}

describe("cliente da Riot", () => {
  it("manda a chave no cabeçalho e usa americas para conta e br1 para a liga", async () => {
    const { c, fetch } = cliente([resposta(200, CONTA), resposta(200, [])]);
    await c.contaPorRiotId("Fulano", "BR1");
    await c.entradasDaLiga("p-1");

    const [url1, init1] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url1).toBe("https://americas.api.riotgames.com/riot/account/v1/accounts/by-riot-id/Fulano/BR1");
    expect((init1.headers as Record<string, string>)["X-Riot-Token"]).toBe("RGAPI-teste");
    expect(fetch.mock.calls[1]![0]).toBe("https://br1.api.riotgames.com/lol/league/v4/entries/by-puuid/p-1");
  });

  it("nome com espaço e acento vai codificado na URL", async () => {
    const { c, fetch } = cliente([resposta(200, CONTA)]);
    await c.contaPorRiotId("SAMUEL VENÂNCIO", "MC97");
    expect(fetch.mock.calls[0]![0]).toContain("/by-riot-id/SAMUEL%20VEN%C3%82NCIO/MC97");
  });

  it("429: para, respeita o Retry-After e NÃO faz mais nenhuma chamada", async () => {
    const { c, fetch } = cliente([resposta(429, {}, { "retry-after": "7" }), resposta(200, CONTA)]);
    expect(await c.contaPorRiotId("A", "B")).toEqual({ tipo: "limite", esperarSegundos: 7, proprio: false });
    expect(await c.contaPorRiotId("C", "D")).toEqual({ tipo: "limite", esperarSegundos: 7, proprio: false });
    expect(await c.entradasDaLiga("p")).toMatchObject({ tipo: "limite" });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(c.chamadas).toBe(1);
  });

  it("chave recusada (401/403): para tudo", async () => {
    const { c, fetch } = cliente([resposta(403, {}), resposta(200, CONTA)]);
    expect(await c.contaPorRiotId("A", "B")).toEqual({ tipo: "chave_recusada" });
    expect(await c.contaPorRiotId("A", "B")).toEqual({ tipo: "chave_recusada" });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("404 é «não encontrado», não erro — e o cliente continua de pé", async () => {
    const { c, fetch } = cliente([resposta(404, {}), resposta(200, CONTA)]);
    expect(await c.contaPorRiotId("Nao", "Existe")).toEqual({ tipo: "nao_encontrado" });
    expect(await c.contaPorRiotId("Fulano", "BR1")).toMatchObject({ tipo: "ok", dados: CONTA });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("400 de PUUID que a Riot não decifra (a chave mudou) vira «puuid_invalido»", async () => {
    const { c } = cliente([resposta(400, { status: { message: "Bad Request - Exception decrypting p-1", status_code: 400 } })]);
    expect(await c.contaPorPuuid("p-1")).toEqual({ tipo: "puuid_invalido" });
  });

  it("sem chave nenhuma chamada sai", async () => {
    const fetch = vi.fn();
    const c = criarClienteRiot({ chave: "", fetch: fetch as unknown as typeof globalThis.fetch });
    expect(await c.contaPorRiotId("A", "B")).toEqual({ tipo: "sem_chave" });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("falha de rede ou tempo esgotado vira erro, sem lançar", async () => {
    const fetch = vi.fn(async () => {
      throw Object.assign(new Error("x"), { name: "TimeoutError" });
    });
    const c = criarClienteRiot({ chave: "k", fetch: fetch as unknown as typeof globalThis.fetch });
    expect(await c.contaPorRiotId("A", "B")).toEqual({ tipo: "erro", status: 0, mensagem: "tempo esgotado" });
  });

  it("resposta em formato inesperado vira erro, sem lançar", async () => {
    const { c } = cliente([resposta(200, { semPuuid: true })]);
    expect(await c.contaPorRiotId("A", "B")).toMatchObject({ tipo: "erro" });
  });

  it("cota quase cheia: sem prazo para esperar, para ANTES de estourar", async () => {
    const quase = { "x-app-rate-limit": "20:1,100:120", "x-app-rate-limit-count": "1:1,90:120" };
    const { c, fetch } = cliente([resposta(200, CONTA, quase), resposta(200, CONTA)]);
    await c.contaPorRiotId("A", "B");
    expect(await c.contaPorRiotId("C", "D")).toEqual({ tipo: "limite", esperarSegundos: 120, proprio: true });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("cota quase cheia: com prazo sobrando, espera a janela virar e segue", async () => {
    const quase = { "x-app-rate-limit": "20:1,100:120", "x-app-rate-limit-count": "1:1,90:120" };
    const { c, fetch, dormir } = cliente([resposta(200, CONTA, quase), resposta(200, CONTA)], {
      prazoMs: Date.now() + 10 * 60_000,
    });
    await c.contaPorRiotId("A", "B");
    expect(await c.contaPorRiotId("C", "D")).toMatchObject({ tipo: "ok" });
    expect(dormir).toHaveBeenCalledWith(120_000);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("a cota de uma região não trava a outra", async () => {
    const quase = { "x-app-rate-limit": "20:1,100:120", "x-app-rate-limit-count": "1:1,95:120" };
    const { c } = cliente([resposta(200, CONTA, quase), resposta(200, [])]);
    await c.contaPorRiotId("A", "B"); // americas quase cheia
    expect(await c.entradasDaLiga("p")).toMatchObject({ tipo: "ok" }); // br1 livre
  });
});

describe("leitura da cota", () => {
  it("só a janela longa conta, e só a partir de 90% do teto", () => {
    expect(janelaQuaseCheia("20:1,100:120", "19:1,10:120")).toBeNull();
    expect(janelaQuaseCheia("20:1,100:120", "1:1,89:120")).toBeNull();
    expect(janelaQuaseCheia("20:1,100:120", "1:1,90:120")).toBe(120);
    expect(janelaQuaseCheia(null, "1:1")).toBeNull();
  });
});
