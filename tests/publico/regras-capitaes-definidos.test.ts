// @vitest-environment jsdom
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { MESSAGES } from "@/lib/i18n/messages";

/**
 * O regulamento publicado (/regras) com a decisão de 23/10/2026 sobre os capitães e o draft,
 * em português E em inglês:
 *
 *  - os 8 capitães são DEFINIDOS pela organização (não mais "os de maior elo");
 *  - o capitão não tem preço: cada time tem 30 pontos para as 4 escolhas;
 *  - a tabela de pontos é calculada pelo site a partir de quem vai ser escolhido, para a soma
 *    dar exatamente 8 × 30;
 *  - saem "média + 15%", "capitães são os maiores elos", "organizadores não são capitães" e
 *    "o valor do capitão sai do orçamento". A serpentina e o resto continuam.
 */

vi.mock("@/lib/i18n/server", async () => {
  const { MESSAGES: mensagens } = await import("@/lib/i18n/messages");
  return { getLocale: async () => "pt", getMessages: async () => mensagens.pt };
});
vi.mock("@/lib/inscricoes/store", () => ({
  lerConfigOuNulo: async () => ({ taxa_centavos: 2000, pct_campeao: 70 }),
}));

const { default: RegrasPage } = await import("@/app/regras/page");

const pt = MESSAGES.pt.paginasRegras;
const en = MESSAGES.en.paginasRegras;

/** Os textos da formação dos times e da premiação, juntos. */
const secao = (m: typeof pt) =>
  [
    m.formacaoIntro,
    m.capitaes1,
    m.capitaes2,
    m.capitaes3,
    m.capitaes4,
    m.capitaes5,
    m.draft1,
    m.draft2,
    m.draft3,
    m.draft4,
    m.draft5,
    m.draft6,
    m.tabelaValoresTexto,
    m.premiacaoOrganizadores,
  ].join(" \n");

describe("regulamento de 23/10/2026: capitães definidos e sem preço", () => {
  it("os capitães são definidos pela organização", () => {
    expect(pt.capitaes1).toBe("Os 8 capitães são definidos pela organização, um por time.");
    expect(pt.formacaoIntro).toContain("Os capitães são definidos pela organização");
    expect(en.capitaes1).toBe("The 8 captains are chosen by the organisers, one per team.");
    expect(en.formacaoIntro).toContain("The captains are chosen by the organisers");
  });

  it("o capitão não tem preço, e cada time tem 30 pontos para as 4 escolhas", () => {
    expect(pt.capitaes2).toContain("O capitão não tem preço");
    expect(pt.capitaes2).toContain("cada time tem 30 pontos para as 4 escolhas");
    expect(pt.draft2).toContain("Cada time tem 30 pontos para as 4 escolhas");
    expect(en.capitaes2).toContain("The captain has no price");
    expect(en.draft2).toContain("Each team has 30 points for its 4 picks");
  });

  it("a tabela é calculada pelo site a partir de quem vai ser escolhido, com a soma exata 8 × 30", () => {
    expect(pt.draft1).toContain("calculada pelo site a partir de quem vai ser escolhido");
    expect(pt.draft1).toContain("exatamente 8 × 30 = 240 pontos");
    expect(en.draft1).toContain("calculated by the site from the players up for picking");
    expect(en.draft1).toContain("exactly 8 × 30 = 240 points");
  });

  it("saem a regra antiga do orçamento, o maior elo, o organizador que não capitaneia e o capitão pago", () => {
    for (const texto of [secao(pt), secao(en)]) {
      expect(texto).not.toMatch(/15\s*%/);
      expect(texto).not.toMatch(/média de pontos|average points/i);
      expect(texto).not.toMatch(/maior elo|highest.*rank/i);
      expect(texto).not.toMatch(/organizadores[^.]*não são capitães|organisers[^.]*not captains/i);
      expect(texto).not.toMatch(/valor dele em pontos sai do orçamento|point value comes out of the team's budget/);
    }
  });

  it("a serpentina e o resto do draft continuam", () => {
    expect(pt.draft4).toContain("serpentina (ex.: com 8 times, 1-2-3-4-5-6-7-8-8-7-6-5-4-3-2-1)");
    expect(en.draft4).toContain("snake (e.g. with 8 teams, 1-2-3-4-5-6-7-8-8-7-6-5-4-3-2-1)");
    expect(pt.capitaes3).toBe("O número de capitães é igual ao número de times: 8 nesta edição.");
    expect(pt.capitaes4).toContain("Um sorteio ao vivo define qual time cada capitão vai capitanear");
    expect(pt.capitaes5).toContain("O capitão também é jogador");
    expect(pt.premiacaoOrganizadores).toBe("Os organizadores desta edição jogam e não pagam inscrição.");
  });

  it("a página publicada mostra o texto novo e não o antigo", async () => {
    const raiz = document.createElement("div");
    raiz.innerHTML = renderToStaticMarkup(await RegrasPage());
    const texto = raiz.textContent ?? "";
    expect(texto).toContain("Os 8 capitães são definidos pela organização, um por time.");
    expect(texto).toContain("O capitão não tem preço");
    expect(texto).not.toContain("média de pontos por time + 15%");
    expect(texto).not.toContain("os inscritos de maior elo");
  });
});
