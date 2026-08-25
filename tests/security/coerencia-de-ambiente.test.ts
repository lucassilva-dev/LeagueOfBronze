import { afterEach, describe, expect, it } from "vitest";

import { problemaDeAmbiente } from "@/lib/data-store";

/**
 * A TRAVA CONTRA O ERRO DE CONFIGURAÇÃO QUE NÃO DÁ ERRO.
 *
 * O ambiente de teste e o de produção rodam o MESMO código; o que os separa é uma variável
 * (`SUPABASE_DB_SCHEMA`). O desastre não vem de um bug — vem de criar o projeto de teste na
 * Vercel e esquecer essa variável: o padrão é `public`, e o site de teste vira um segundo
 * site de produção. O pessoal se inscrevendo de brincadeira na tabela que decide quem joga,
 * sem um único erro na tela.
 *
 * A trava confere o deploy contra ele mesmo, usando `VERCEL_PROJECT_PRODUCTION_URL`, que a
 * Vercel injeta sozinha — ninguém precisa lembrar de configurar.
 *
 * Estes testes têm DOIS trabalhos, e o segundo importa tanto quanto o primeiro:
 *  1. garantir que ela dispara nos dois enganos possíveis;
 *  2. garantir que ela NUNCA dispara em produção como ela é hoje. Uma trava que derruba o
 *     site por engano seria pior do que não existir.
 */

const dominioOriginal = process.env.VERCEL_PROJECT_PRODUCTION_URL;
const schemaOriginal = process.env.SUPABASE_DB_SCHEMA;

function ambiente(dominio: string | undefined, schema: string | undefined) {
  if (dominio === undefined) delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
  else process.env.VERCEL_PROJECT_PRODUCTION_URL = dominio;

  if (schema === undefined) delete process.env.SUPABASE_DB_SCHEMA;
  else process.env.SUPABASE_DB_SCHEMA = schema;
}

afterEach(() => {
  ambiente(dominioOriginal, schemaOriginal);
});

describe("os dois enganos que ela precisa pegar", () => {
  it("projeto de TESTE apontando para os dados de PRODUÇÃO", () => {
    // Este é o engano perigoso: esquecer a variável ao criar o projeto na Vercel.
    ambiente("teste-league-of-bronze.vercel.app", undefined);

    const problema = problemaDeAmbiente();
    expect(problema).toContain("teste-league-of-bronze.vercel.app");
    expect(problema).toContain("PRODUÇÃO");
    expect(problema).toContain("SUPABASE_DB_SCHEMA=lob_teste");
  });

  it("PRODUÇÃO apontando para os dados de teste", () => {
    // O inverso mata igual: o site oficial servindo o campeonato de mentira.
    ambiente("league-of-bronze.vercel.app", "lob_teste");

    const problema = problemaDeAmbiente();
    expect(problema).toContain("league-of-bronze.vercel.app");
    expect(problema).toContain("lob_teste");
    expect(problema).toContain("Remova");
  });

  it("errar o nome do schema também é pego", () => {
    // Digitar "lob-teste" com hífen, ou "lobteste": não é `public`, então em produção a
    // trava acusa em vez de deixar o site subir falando com um schema que não existe.
    for (const errado of ["lob-teste", "lobteste", "LOB_TESTE"]) {
      ambiente("league-of-bronze.vercel.app", errado);
      expect(problemaDeAmbiente(), errado).not.toBeNull();
    }
  });
});

describe("e os casos em que ela precisa ficar quieta", () => {
  it("produção como ela é hoje: nenhum problema", () => {
    ambiente("league-of-bronze.vercel.app", undefined);
    expect(problemaDeAmbiente()).toBeNull();

    // Dizer "public" explicitamente também é produção válida.
    ambiente("league-of-bronze.vercel.app", "public");
    expect(problemaDeAmbiente()).toBeNull();
  });

  it("o nome do site de verdade não contém 'teste' por acidente", () => {
    /*
     * A trava reconhece o projeto de teste pelo PRIMEIRO rótulo do domínio. Se o site
     * oficial casasse com essa regra por acaso, a trava derrubaria produção. Vale travar
     * isso por escrito: `league-of-bronze` não começa com "teste".
     */
    ambiente("league-of-bronze.vercel.app", undefined);
    expect(problemaDeAmbiente()).toBeNull();

    // Nem os domínios de deploy e de branch que a Vercel gera para o projeto de produção.
    for (const d of [
      "league-of-bronze-git-main-lucassilva-devs-projects.vercel.app",
      "league-of-bronze-lucassilva-devs-projects.vercel.app",
      "leagueofbronze.com.br",
    ]) {
      ambiente(d, undefined);
      expect(problemaDeAmbiente(), d).toBeNull();
    }
  });

  it("o projeto de teste bem configurado: nenhum problema", () => {
    ambiente("teste-league-of-bronze.vercel.app", "lob_teste");
    expect(problemaDeAmbiente()).toBeNull();
  });

  it("fora da Vercel ela não opina", () => {
    // Desenvolvimento local e teste automatizado não têm esse domínio. Uma trava que
    // dispara sozinha onde não devia é pior do que trava nenhuma.
    ambiente(undefined, undefined);
    expect(problemaDeAmbiente()).toBeNull();

    ambiente(undefined, "lob_teste");
    expect(problemaDeAmbiente()).toBeNull();

    ambiente("", "lob_teste");
    expect(problemaDeAmbiente()).toBeNull();
  });
});
