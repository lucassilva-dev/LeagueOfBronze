import { readFileSync } from "node:fs";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  createSupabaseAdminClient,
  getConfiguredDataProvider,
  problemaDeAmbiente,
} from "@/lib/data-store";

/**
 * PRODUÇÃO NA VERCEL LENDO O ARQUIVO DO REPOSITÓRIO EM VEZ DO SUPABASE.
 *
 * Sem as chaves (apagadas, renomeadas, no escopo de ambiente errado) ou com
 * `DATA_PROVIDER=local` copiado do `.env.example`, o provedor caía para "local" calado: o
 * público via a 3ª Edição do `leagueofbronze.json` como se estivesse no ar, sem a faixa
 * vermelha de configuração errada. Agora a faixa aparece — e o banco não é trancado por
 * isso (a inscrição continua falando com o schema certo).
 */

const NOMES = [
  "VERCEL_PROJECT_PRODUCTION_URL",
  "VERCEL_ENV",
  "DATA_PROVIDER",
  "SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_DB_SCHEMA",
] as const;
let guardado: Record<string, string | undefined> = {};

function ambiente(valores: Partial<Record<(typeof NOMES)[number], string>>) {
  for (const nome of NOMES) {
    const valor = valores[nome];
    if (valor === undefined) delete process.env[nome];
    else process.env[nome] = valor;
  }
}

const PRODUCAO = { VERCEL_PROJECT_PRODUCTION_URL: "www.leagueofbronze.xyz", VERCEL_ENV: "production" };
const CHAVES = { SUPABASE_URL: "https://falso.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "chave-falsa" };

beforeEach(() => {
  guardado = Object.fromEntries(NOMES.map((nome) => [nome, process.env[nome]]));
});

afterEach(() => {
  for (const nome of NOMES) {
    if (guardado[nome] === undefined) delete process.env[nome];
    else process.env[nome] = guardado[nome];
  }
});

describe("a faixa vermelha aparece", () => {
  it("produção sem as chaves do Supabase", () => {
    ambiente({ ...PRODUCAO });
    expect(getConfiguredDataProvider()).toBe("local");
    const problema = problemaDeAmbiente();
    expect(problema).toContain("www.leagueofbronze.xyz");
    expect(problema).toContain("SUPABASE_URL");
    expect(problema).toContain("DATA_PROVIDER");
  });

  it("produção com DATA_PROVIDER=local, mesmo com as chaves presentes", () => {
    ambiente({ ...PRODUCAO, ...CHAVES, DATA_PROVIDER: "local" });
    expect(problemaDeAmbiente()).toContain("arquivo do repositório");
    // ...e o banco NÃO é trancado por isso: a inscrição continua no schema certo.
    expect(() => createSupabaseAdminClient()).not.toThrow();
  });
});

describe("e fica quieta onde não é engano", () => {
  it("produção como ela é hoje (com as chaves)", () => {
    ambiente({ ...PRODUCAO, ...CHAVES });
    expect(problemaDeAmbiente()).toBeNull();
  });

  it("prévia de branch sem chaves é escolha, não engano", () => {
    ambiente({ VERCEL_PROJECT_PRODUCTION_URL: "www.leagueofbronze.xyz", VERCEL_ENV: "preview" });
    expect(problemaDeAmbiente()).toBeNull();
  });

  it("fora da Vercel (desenvolvimento local, testes)", () => {
    ambiente({ DATA_PROVIDER: "local" });
    expect(problemaDeAmbiente()).toBeNull();
  });

  it("o projeto de teste bem configurado", () => {
    ambiente({
      VERCEL_PROJECT_PRODUCTION_URL: "teste-league-of-bronze.vercel.app",
      VERCEL_ENV: "production",
      SUPABASE_DB_SCHEMA: "lob_teste",
      ...CHAVES,
    });
    expect(problemaDeAmbiente()).toBeNull();
  });
});

describe(".env.example", () => {
  const exemplo = readFileSync(".env.example", "utf8");

  it("não induz a DATA_PROVIDER=local", () => {
    expect(exemplo).not.toMatch(/^DATA_PROVIDER=local$/m);
    expect(exemplo).toMatch(/^DATA_PROVIDER=$/m);
  });

  it("lista as variáveis que o código lê", () => {
    for (const nome of [
      "ADMIN_SESSION_SECRET",
      "ADMIN_PASSWORD_PEPPER",
      "LOGIN_IP_PEPPER",
      "CRON_SECRET",
      "SUPABASE_DB_SCHEMA",
      "SUPABASE_URL",
      "SUPABASE_SERVICE_ROLE_KEY",
    ]) {
      expect(exemplo, nome).toContain(nome);
    }
  });
});
