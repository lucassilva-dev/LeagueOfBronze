import type { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { mesmaOrigem } from "@/lib/security/route-guard";

/**
 * Monta o mínimo de NextRequest que a checagem de origem usa: método e cabeçalhos.
 */
function req(
  method: string,
  headers: Record<string, string>,
): NextRequest {
  const mapa = new Headers({ host: "osbronzes.example", ...headers });
  return { method, headers: mapa } as unknown as NextRequest;
}

describe("barreira de CSRF", () => {
  it("libera leitura sem exigir origem", () => {
    expect(mesmaOrigem(req("GET", {}))).toBe(true);
    expect(mesmaOrigem(req("HEAD", {}))).toBe(true);
  });

  it("aceita escrita vinda do próprio painel", () => {
    expect(mesmaOrigem(req("POST", { "sec-fetch-site": "same-origin" }))).toBe(true);
    expect(mesmaOrigem(req("PUT", { origin: "https://osbronzes.example" }))).toBe(true);
    expect(mesmaOrigem(req("POST", { referer: "https://osbronzes.example/admin" }))).toBe(true);
  });

  it("recusa escrita vinda de outro site (o ataque que isso existe para impedir)", () => {
    expect(mesmaOrigem(req("POST", { origin: "https://site-malicioso.com" }))).toBe(false);
    expect(mesmaOrigem(req("POST", { "sec-fetch-site": "cross-site" }))).toBe(false);
    expect(mesmaOrigem(req("POST", { referer: "https://site-malicioso.com/isca" }))).toBe(false);
  });

  it("recusa escrita sem nenhuma prova de origem", () => {
    expect(mesmaOrigem(req("POST", {}))).toBe(false);
    expect(mesmaOrigem(req("DELETE", {}))).toBe(false);
  });

  it("recusa quando o cabeçalho de origem está deformado", () => {
    expect(mesmaOrigem(req("POST", { origin: "não-é-url" }))).toBe(false);
    expect(mesmaOrigem(req("POST", { referer: "://quebrado" }))).toBe(false);
  });

  it("não confunde subdomínio de atacante com a origem certa", () => {
    expect(mesmaOrigem(req("POST", { origin: "https://osbronzes.example.malicioso.com" }))).toBe(false);
    expect(mesmaOrigem(req("POST", { origin: "https://malicioso.com/osbronzes.example" }))).toBe(false);
  });

  it("o Origin vale mais que o Referer quando os dois vêm juntos", () => {
    // Um atacante controla o Referer da página dele; o Origin é posto pelo navegador.
    expect(
      mesmaOrigem(
        req("POST", { origin: "https://site-malicioso.com", referer: "https://osbronzes.example/admin" }),
      ),
    ).toBe(false);
  });
});
