import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import PainelCapitao from "@/components/draft/painel-capitao";
import Transmissao from "@/components/draft/transmissao";
import { MESSAGES } from "@/lib/i18n/messages";

/**
 * Fumaça das duas telas do draft.
 *
 * Elas buscam os próprios dados, então o que se exercita aqui é o PRIMEIRO render —
 * antes de qualquer resposta da API. É justamente o estado em que mais se erra:
 * `draft` ainda é null e qualquer `draft.times.map` estoura. Numa transmissão ao vivo,
 * essa é a tela que todo mundo abre ao mesmo tempo.
 */
describe("primeiro render, sem nenhum dado ainda", () => {
  for (const idioma of ["pt", "en"] as const) {
    it(`transmissão não quebra com draft nulo (${idioma})`, () => {
      const html = renderToStaticMarkup(<Transmissao t={MESSAGES[idioma].draft} />);
      expect(typeof html).toBe("string");
    });

    it(`painel do capitão não quebra com draft nulo (${idioma})`, () => {
      const html = renderToStaticMarkup(<PainelCapitao t={MESSAGES[idioma].draft} />);
      expect(typeof html).toBe("string");
    });
  }

  it("nenhuma das duas escreve texto em português na versão inglesa", () => {
    // O agente que escreveu a transmissão apontou que faltava chave para o título do
    // pool e, por isso, deixou o bloco sem texto em vez de cravar uma palavra. Este
    // teste é o que impede alguém de "resolver" isso escrevendo em português.
    const suspeitas = /\b(Rodada|Escolha|Aguarde|Buscar|Vagas|Orçamento|capitão)\b/;

    for (const Componente of [Transmissao, PainelCapitao]) {
      const html = renderToStaticMarkup(<Componente t={MESSAGES.en.draft} />);
      expect(html).not.toMatch(suspeitas);
    }
  });
});
