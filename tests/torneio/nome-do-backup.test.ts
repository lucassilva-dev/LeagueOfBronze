import type { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * O NOME DO ARQUIVO DE BACKUP SAI NO RELÓGIO DE BRASÍLIA.
 *
 * O servidor roda em UTC e o nome vinha de `toISOString()`: o backup das 22h de sexta
 * 20/11 (depois do jogo das 22h) se chamava "...-2026-11-21-01-00-00.json" — de sábado. Na
 * hora de escolher "o de antes da rodada de sábado", o nome induzia a pegar o errado.
 */
vi.mock("@/lib/data-store", () => ({ readDatasetText: async () => "{}\n" }));
vi.mock("@/lib/security/route-guard", () => ({
  mesmaOrigem: () => true,
  requireAdmin: async () => ({ ok: true, identity: { username: "lucas", isMaster: true, scopes: [] } }),
}));

const { GET } = await import("@/app/api/admin/export/route");

const pedido = { method: "GET", headers: new Headers() } as unknown as NextRequest;

async function nomeDoArquivo(instante: string) {
  vi.useFakeTimers({ now: new Date(instante), toFake: ["Date"] });
  const r = await GET(pedido);
  expect(r.status).toBe(200);
  return /filename="([^"]+)"/.exec(r.headers.get("content-disposition") ?? "")?.[1];
}

afterEach(() => {
  vi.useRealTimers();
});

describe("nome do backup", () => {
  it("sexta 20/11 às 22:00 em Brasília sai como 2026-11-20-22-00-00", async () => {
    expect(await nomeDoArquivo("2026-11-20T22:00:00-03:00")).toBe("leagueofbronze-backup-2026-11-20-22-00-00.json");
  });

  it("a virada do dia é a de Brasília, e meia-noite é 00 (não 24)", async () => {
    expect(await nomeDoArquivo("2026-11-21T02:59:59Z")).toBe("leagueofbronze-backup-2026-11-20-23-59-59.json");
    expect(await nomeDoArquivo("2026-11-21T03:05:00Z")).toBe("leagueofbronze-backup-2026-11-21-00-05-00.json");
  });
});
