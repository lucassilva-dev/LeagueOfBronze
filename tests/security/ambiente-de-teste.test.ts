import { afterEach, describe, expect, it } from "vitest";

import { ehAmbienteDeTeste, getSupabaseSchema } from "@/lib/data-store";

/**
 * A LINHA QUE SEPARA O AMBIENTE DE TESTE DO DE VERDADE.
 *
 * O site de teste (dados falsos, para o pessoal experimentar inscrição e sorteio) roda o
 * MESMO código e fala com o MESMO banco. O que muda é o schema: `lob_teste` em vez de
 * `public`, escolhido por uma variável de ambiente que só o projeto de teste define.
 *
 * O risco que estes testes cobrem é bem concreto: se `getSupabaseSchema()` devolvesse algo
 * diferente de "public" por engano em produção, o site oficial passaria a ler um campeonato
 * inventado. E se devolvesse "public" no ambiente de teste, uma inscrição de brincadeira
 * cairia na tabela de inscrições de verdade — que é a que decide quem joga.
 *
 * Por isso o padrão é "public", e ele vale para toda entrada que não seja um nome de schema
 * explícito e não vazio.
 */

const original = process.env.SUPABASE_DB_SCHEMA;

afterEach(() => {
  if (original === undefined) delete process.env.SUPABASE_DB_SCHEMA;
  else process.env.SUPABASE_DB_SCHEMA = original;
});

describe("sem a variável, é produção", () => {
  it("a ausência vale `public`", () => {
    delete process.env.SUPABASE_DB_SCHEMA;
    expect(getSupabaseSchema()).toBe("public");
    expect(ehAmbienteDeTeste()).toBe(false);
  });

  it("vazio e espaço em branco também valem `public`", () => {
    // Variável de ambiente definida como string vazia é um acidente comum de painel de
    // deploy. Ela NÃO pode virar um nome de schema — o cliente falharia em toda consulta,
    // e o site inteiro cairia por causa de um campo em branco.
    for (const valor of ["", "   ", "\t", "\n"]) {
      process.env.SUPABASE_DB_SCHEMA = valor;
      expect(getSupabaseSchema(), `valor ${JSON.stringify(valor)}`).toBe("public");
      expect(ehAmbienteDeTeste()).toBe(false);
    }
  });

  it("dizer 'public' explicitamente não liga o modo de teste", () => {
    process.env.SUPABASE_DB_SCHEMA = "public";
    expect(ehAmbienteDeTeste()).toBe(false);
  });
});

describe("com a variável, é teste", () => {
  it("o schema é o que a variável disser, sem espaços em volta", () => {
    process.env.SUPABASE_DB_SCHEMA = "  lob_teste  ";
    expect(getSupabaseSchema()).toBe("lob_teste");
    expect(ehAmbienteDeTeste()).toBe(true);
  });

  it("qualquer schema que não seja `public` é ambiente de teste", () => {
    // `ehAmbienteDeTeste` é o que acende a faixa de aviso na tela e o que tira o site dos
    // buscadores. Ela precisa acender para QUALQUER desvio de produção, não só para o nome
    // que usamos hoje.
    for (const schema of ["lob_teste", "staging", "sandbox", "lob_teste_2"]) {
      process.env.SUPABASE_DB_SCHEMA = schema;
      expect(ehAmbienteDeTeste(), schema).toBe(true);
    }
  });
});
