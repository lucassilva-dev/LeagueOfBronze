import { describe, expect, it } from "vitest";

import { htmlLang, parseAcceptLanguage, resolveLocale } from "@/lib/i18n/config";

describe("detecção de idioma pelo navegador", () => {
  it("entende pt-BR e variantes de português", () => {
    expect(parseAcceptLanguage("pt-BR,pt;q=0.9,en-US;q=0.8")).toBe("pt");
    expect(parseAcceptLanguage("pt")).toBe("pt");
    expect(parseAcceptLanguage("pt-PT")).toBe("pt");
  });

  it("entende inglês e suas variantes", () => {
    expect(parseAcceptLanguage("en-US,en;q=0.9")).toBe("en");
    expect(parseAcceptLanguage("en-GB")).toBe("en");
  });

  it("respeita o fator de qualidade, não a ordem do texto", () => {
    // inglês vem primeiro na string, mas o português tem peso maior
    expect(parseAcceptLanguage("en;q=0.5,pt-BR;q=0.9")).toBe("pt");
    expect(parseAcceptLanguage("pt;q=0.3,en;q=0.9")).toBe("en");
  });

  it("ignora idiomas que o site não fala em vez de escolher errado", () => {
    expect(parseAcceptLanguage("fr-FR,fr;q=0.9")).toBeNull();
    expect(parseAcceptLanguage("es-ES")).toBeNull();
    // com um idioma conhecido no meio, escolhe o conhecido
    expect(parseAcceptLanguage("fr-FR,fr;q=0.9,en;q=0.5")).toBe("en");
  });

  it("aguenta cabeçalho ausente, vazio ou malformado", () => {
    expect(parseAcceptLanguage(null)).toBeNull();
    expect(parseAcceptLanguage("")).toBeNull();
    expect(parseAcceptLanguage(";;;")).toBeNull();
    expect(parseAcceptLanguage("pt;q=abc")).toBe("pt"); // q inválido não derruba
    expect(parseAcceptLanguage("pt;q=0")).toBeNull(); // q=0 significa "não quero"
  });
});

describe("prioridade entre escolha explícita e navegador", () => {
  it("o cookie vence o Accept-Language", () => {
    expect(resolveLocale("en", "pt-BR,pt;q=0.9")).toBe("en");
    expect(resolveLocale("pt", "en-US,en;q=0.9")).toBe("pt");
  });

  it("sem cookie, usa o navegador", () => {
    expect(resolveLocale(null, "en-US,en;q=0.9")).toBe("en");
    expect(resolveLocale(undefined, "pt-BR")).toBe("pt");
  });

  it("cookie inválido é ignorado, não quebra", () => {
    expect(resolveLocale("klingon", "en-US")).toBe("en");
    expect(resolveLocale("", "en-US")).toBe("en");
  });

  it("sem nada, cai em português (público principal é brasileiro)", () => {
    expect(resolveLocale(null, null)).toBe("pt");
    expect(resolveLocale(null, "fr-FR")).toBe("pt");
  });
});

describe("atributo lang do html", () => {
  it("usa a tag BCP 47 completa", () => {
    expect(htmlLang("pt")).toBe("pt-BR");
    expect(htmlLang("en")).toBe("en");
  });
});
