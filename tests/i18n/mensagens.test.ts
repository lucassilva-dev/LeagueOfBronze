import { describe, expect, it } from "vitest";

import { LOCALES } from "@/lib/i18n/config";
import { MESSAGES } from "@/lib/i18n/messages";
import { AVISO_RIOT_OFICIAL } from "@/lib/i18n/messages/legal";

/** Caminhos "bloco.chave.subchave" de todos os textos de um locale, em ordem. */
function caminhos(valor: unknown, prefixo = ""): string[] {
  if (valor === null || typeof valor !== "object") return [prefixo];
  return Object.entries(valor as Record<string, unknown>)
    .flatMap(([chave, filho]) => caminhos(filho, prefixo ? `${prefixo}.${chave}` : chave))
    .sort((a, b) => a.localeCompare(b));
}

describe("registro dos blocos de mensagens", () => {
  it("registra os mesmos blocos nos dois idiomas", () => {
    expect(Object.keys(MESSAGES.en).sort()).toEqual(Object.keys(MESSAGES.pt).sort());
  });

  it("tem exatamente as mesmas chaves em pt e en, sem faltar nem sobrar", () => {
    // Se um agente esquecer de traduzir uma chave, ela aparece aqui em vez de sumir na tela.
    expect(caminhos(MESSAGES.en)).toEqual(caminhos(MESSAGES.pt));
  });

  it("não deixa nenhum texto totalmente vazio", () => {
    // Só string de comprimento zero conta como erro: alguns textos são separadores de uma
    // frase montada por partes e valem um espaço só (ex.: "beating {time} {placar}" em inglês).
    for (const locale of LOCALES) {
      const vazios = caminhos(MESSAGES[locale]).filter((caminho) => {
        const valor = caminho
          .split(".")
          .reduce<unknown>(
            (atual, parte) => (atual as Record<string, unknown>)?.[parte],
            MESSAGES[locale],
          );
        return valor === "";
      });
      expect(vazios, `textos vazios em ${locale}`).toEqual([]);
    }
  });
});

describe("aviso obrigatório da Riot Games", () => {
  it("está gravado palavra por palavra como a política exige", () => {
    // Este texto NÃO pode ser traduzido, abreviado nem reescrito: é copiado da política da
    // Riot. Qualquer edição aqui quebra o teste de propósito.
    // O nome do produto tem de ser o MESMO registrado na aplicação da Riot
    // (app LEAGUE-OF-BRONZE, URL league-of-bronze.vercel.app) — daí "League of Bronze".
    expect(AVISO_RIOT_OFICIAL).toBe(
      "League of Bronze isn't endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games, and all associated properties are trademarks or registered trademarks of Riot Games, Inc.",
    );
  });

  it("o rodapé em inglês É a constante, sem uma letra de diferença", () => {
    // Em inglês o rodapé mostra só esta frase — e ela precisa ser o texto exigido
    // literalmente, por isso aponta para a constante em vez de ser redigitada.
    // (Em português o rodapé mostra a constante MAIS a tradução; ver site-frame.tsx.)
    expect(MESSAGES.en.comum.rodapeAviso).toBe(AVISO_RIOT_OFICIAL);
  });

  it("o rodapé em português é tradução, não o texto em inglês", () => {
    const pt = MESSAGES.pt.comum.rodapeAviso;
    expect(pt).not.toBe(AVISO_RIOT_OFICIAL);
    expect(pt).toContain("não é endossado pela Riot Games");
    // A tradução precisa cobrir as DUAS frases da política: não-endosso e marcas registradas.
    expect(pt).toContain("marcas registradas");
  });

  it("nenhum outro texto do dicionário reescreve o aviso por conta própria", () => {
    for (const locale of LOCALES) {
      const outros = Object.entries(MESSAGES[locale].comum)
        .filter(([chave]) => chave !== "rodapeAviso")
        .map(([, valor]) => String(valor));
      for (const texto of outros) {
        expect(texto).not.toContain("isn't endorsed by Riot Games");
      }
    }
  });
});
