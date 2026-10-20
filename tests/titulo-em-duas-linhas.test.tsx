import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { GoldTitleEmDuasLinhas, folgaEntreLinhas } from "@/components/lob/ui";

/**
 * "4ª EDIÇÃO" em cima de "LEAGUE OF BRONZE" com altura de linha 1,08: o cedilha da Anton
 * desce 0,31 e as maiúsculas sobem 0,87 — o Ç ficava cravado no U de LEAGUE.
 */
describe("espaço entre as duas linhas do título", () => {
  it("com cedilha em cima, abre espaço para o rabinho não encostar na linha de baixo", () => {
    // 0,31 + 0,87 + 0,08 de respiro − 1,08 = 0,18
    expect(folgaEntreLinhas("4ª EDIÇÃO", "LEAGUE OF BRONZE", 1.08)).toBe(0.18);
  });

  it("sem letra que desce, o título mantém o ritmo de sempre", () => {
    expect(folgaEntreLinhas("LEAGUE OF BRONZE", "4TH EDITION", 1.08)).toBe(0);
    expect(folgaEntreLinhas("4TH EDITION", "LEAGUE OF BRONZE", 1.08)).toBe(0);
  });

  it("acento na linha de baixo também conta (Ã e É sobem mais que a maiúscula comum)", () => {
    expect(folgaEntreLinhas("LEAGUE OF BRONZE", "4ª EDIÇÃO", 1.08)).toBe(0.12);
  });

  it("o componente põe o espaço só embaixo da linha que precisa", () => {
    const html = renderToStaticMarkup(<GoldTitleEmDuasLinhas linhas={["4ª EDIÇÃO", "LEAGUE OF BRONZE"]} />);
    expect(html).toContain("margin-bottom:0.18em");
    expect(html).toContain("4ª EDIÇÃO");
    expect(html).not.toContain("<br");
    const semCedilha = renderToStaticMarkup(<GoldTitleEmDuasLinhas linhas={["4TH EDITION", "LEAGUE OF BRONZE"]} />);
    expect(semCedilha).not.toContain("margin-bottom");
  });
});
