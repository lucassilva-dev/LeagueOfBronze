import { describe, expect, it } from "vitest";

import { destinoDeVolta } from "@/lib/destino-de-volta";

describe("para onde o /entrar devolve depois do login", () => {
  it("devolve o capitão ao painel dele", () => {
    expect(destinoDeVolta("/capitao")).toBe("/capitao");
    expect(destinoDeVolta("/draft")).toBe("/draft");
  });

  it("nunca vira trampolim para fora do site", () => {
    for (const pedido of ["//evil.example", "https://evil.example/capitao", "/capitao?x=1", "/admin", "", undefined, ["/capitao"]]) {
      expect(destinoDeVolta(pedido)).toBeNull();
    }
  });
});
