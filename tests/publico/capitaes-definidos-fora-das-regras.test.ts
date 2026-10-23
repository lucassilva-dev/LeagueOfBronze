import { describe, expect, it } from "vitest";

import { MESSAGES } from "@/lib/i18n/messages";

/**
 * Fora de /regras, o site também falava dos capitães: o formulário de inscrição («Quem é
 * capitão») e a home da pré-temporada («Draft ao vivo»). Depois da decisão de 23/10/2026 — os
 * capitães são DEFINIDOS pela organização, organizador incluído, e o capitão não tem preço —,
 * nenhum dos dois pode continuar dizendo "os de maior elo" nem "quem organiza não é capitão".
 */

const TEXTOS = (["pt", "en"] as const).flatMap((lingua) => [
  [`${lingua} · inscrição`, MESSAGES[lingua].inscricao.capitaesTexto],
  [`${lingua} · pré-temporada`, MESSAGES[lingua].preTemporada.passo4Texto],
]);

describe("os capitães fora do regulamento (decisão de 23/10/2026)", () => {
  it.each(TEXTOS)("%s: definidos pela organização, sem «maior elo» e sem «organizador não é capitão»", (_, texto) => {
    expect(texto).toMatch(/definidos pela organização|chosen by the organi[sz]ers/);
    expect(texto).not.toMatch(/maior elo|highest-ranked/i);
    expect(texto).not.toMatch(/não é capitão|not captains/i);
  });

  it("o formulário diz que o capitão não tem preço", () => {
    expect(MESSAGES.pt.inscricao.capitaesTexto).toContain("O capitão não tem preço");
    expect(MESSAGES.en.inscricao.capitaesTexto).toContain("The captain has no price");
  });
});
