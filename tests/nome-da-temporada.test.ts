import { describe, expect, it } from "vitest";

import { nomeDaTemporada } from "@/lib/i18n/nome-da-temporada";

describe("o nome da temporada no idioma da página", () => {
  it("em português fica como foi digitado", () => {
    expect(nomeDaTemporada("4ª Edição", "pt-BR")).toBe("4ª Edição");
  });

  it("em inglês, \"Nª Edição\" vira o ordinal inglês", () => {
    expect(nomeDaTemporada("4ª Edição", "en-US")).toBe("4th Edition");
    expect(nomeDaTemporada("1ª Edição", "en")).toBe("1st Edition");
    expect(nomeDaTemporada("2ª Edição", "en")).toBe("2nd Edition");
    expect(nomeDaTemporada("3ª Edição", "en")).toBe("3rd Edition");
    expect(nomeDaTemporada("11ª Edição", "en")).toBe("11th Edition");
    expect(nomeDaTemporada("22ª edicao", "en")).toBe("22nd Edition");
  });

  it("nome próprio passa como está", () => {
    expect(nomeDaTemporada("2º Campeonato do Grupo", "en")).toBe("2º Campeonato do Grupo");
  });
});
