import { describe, expect, it, vi } from "vitest";

import { criarClienteRiot } from "@/lib/riot/cliente";

/**
 * O prazo de quem chama vale para CADA chamada à Riot (RIOT-04).
 *
 * Antes ele só era conferido na espera da cota e entre um inscrito e outro: com a Riot lenta
 * mas respondendo, o último inscrito do botão do painel fazia várias chamadas depois do
 * prazo e a função passava dos 60 s da Vercel. Prazo vencido = paramos nós (`limite`
 * próprio), como na cota: nada de pausar o robô, nada de marcar erro no inscrito.
 */

const CONTA = { puuid: "p-1", gameName: "Fulano", tagLine: "BR1" };
const ok = () => new Response(JSON.stringify(CONTA), { status: 200 });

describe("prazo por chamada", () => {
  it("prazo já vencido: nem sai para a rede", async () => {
    const fetch = vi.fn(async () => ok());
    const relogio = { t: 10_000 };
    const c = criarClienteRiot({
      chave: "RGAPI-teste",
      fetch: fetch as unknown as typeof globalThis.fetch,
      intervaloMs: 0,
      prazoMs: 9_000,
      agora: () => relogio.t,
    });
    expect(await c.contaPorPuuid("p-1")).toEqual({ tipo: "limite", esperarSegundos: 60, proprio: true });
    expect(fetch).not.toHaveBeenCalled();
    expect(c.chamadas).toBe(0);
  });

  it("o prazo vence no meio: a primeira chamada sai, a seguinte não", async () => {
    const relogio = { t: 0 };
    const fetch = vi.fn(async () => {
      relogio.t += 7_900;
      return ok();
    });
    const c = criarClienteRiot({
      chave: "RGAPI-teste",
      fetch: fetch as unknown as typeof globalThis.fetch,
      intervaloMs: 0,
      prazoMs: 5_000,
      agora: () => relogio.t,
    });
    expect((await c.contaPorPuuid("p-1")).tipo).toBe("ok");
    expect((await c.entradasDaLiga("p-1")).tipo).toBe("limite");
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("a chamada é cortada no NOSSO prazo (mais curto que o tempo-limite): «limite» próprio, não «erro»", async () => {
    // A Riot pendurada: só responde quando o sinal de cancelamento dispara.
    const fetch = vi.fn(
      (_url: string, init?: RequestInit) =>
        new Promise<Response>((_ok, falha) => {
          init?.signal?.addEventListener("abort", () => falha(init.signal!.reason));
        }),
    );
    const c = criarClienteRiot({
      chave: "RGAPI-teste",
      fetch: fetch as unknown as typeof globalThis.fetch,
      intervaloMs: 0,
      timeoutMs: 8_000,
      prazoMs: Date.now() + 30,
    });
    const inicio = Date.now();
    expect(await c.contaPorPuuid("p-1")).toEqual({ tipo: "limite", esperarSegundos: 60, proprio: true });
    expect(Date.now() - inicio).toBeLessThan(2_000);
  });

  it("controle: sem prazo, o tempo-limite normal da Riot continua sendo «erro» (tempo esgotado)", async () => {
    const fetch = vi.fn(
      (_url: string, init?: RequestInit) =>
        new Promise<Response>((_ok, falha) => {
          init?.signal?.addEventListener("abort", () => falha(init.signal!.reason));
        }),
    );
    const c = criarClienteRiot({ chave: "RGAPI-teste", fetch: fetch as unknown as typeof globalThis.fetch, intervaloMs: 0, timeoutMs: 30 });
    expect(await c.contaPorPuuid("p-1")).toEqual({ tipo: "erro", status: 0, mensagem: "tempo esgotado" });
  });
});
