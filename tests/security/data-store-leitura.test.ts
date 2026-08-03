import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * A propriedade de segurança mais importante do data-store: LER NUNCA GRAVA.
 *
 * O comportamento antigo recriava a linha do banco a partir do seed do repositório
 * sempre que alguém abria o site e a linha não existia. Isso dava a um atacante com
 * acesso de escrita ao banco um jeito de reverter o campeonato inteiro para um estado
 * velho sem precisar de nenhuma credencial de admin: apagava a linha e abria a home.
 *
 * Estes testes existem para essa regressão não voltar em silêncio.
 */

const supabase = vi.hoisted(() => ({
  select: vi.fn(),
  upsert: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: supabase.select }),
      }),
      upsert: supabase.upsert,
    }),
  }),
}));

const datasetReal = JSON.parse(readFileSync("leagueofbronze.json", "utf8"));

beforeEach(() => {
  vi.resetModules();
  supabase.select.mockReset();
  supabase.upsert.mockReset().mockResolvedValue({ error: null });

  process.env.DATA_PROVIDER = "supabase";
  process.env.SUPABASE_URL = "https://projeto-de-teste.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "chave-de-teste";
});

afterEach(() => {
  delete process.env.DATA_PROVIDER;
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
});

describe("ler nunca grava", () => {
  it("linha ausente vira erro — não recria o dataset sozinho", async () => {
    supabase.select.mockResolvedValue({ data: null, error: null });
    const store = await import("@/lib/data-store");

    await expect(store.readDataset()).rejects.toBeInstanceOf(store.DatasetMissingError);
    expect(supabase.upsert).not.toHaveBeenCalled();
  });

  it("payload adulterado vira erro — não sobrescreve com o seed", async () => {
    supabase.select.mockResolvedValue({ data: { id: "x", payload: { lixo: true } }, error: null });
    const store = await import("@/lib/data-store");

    await expect(store.readDataset()).rejects.toBeInstanceOf(store.DatasetInvalidError);
    expect(supabase.upsert).not.toHaveBeenCalled();
  });

  it("leitura bem-sucedida também não grava nada", async () => {
    supabase.select.mockResolvedValue({ data: { id: "x", payload: datasetReal }, error: null });
    const store = await import("@/lib/data-store");

    const dataset = await store.readDataset();
    expect(dataset.teams.length).toBeGreaterThan(0);
    expect(supabase.upsert).not.toHaveBeenCalled();
  });
});

describe("semeadura é ação explícita e não destrói dado vivo", () => {
  it("recusa quando a linha já existe", async () => {
    supabase.select.mockResolvedValue({ data: { id: "x", payload: datasetReal }, error: null });
    const store = await import("@/lib/data-store");

    await expect(store.seedDatasetFromLocalSeed()).rejects.toThrow(/já existe/i);
    expect(supabase.upsert).not.toHaveBeenCalled();
  });

  it("grava só quando a linha realmente não existe", async () => {
    supabase.select.mockResolvedValue({ data: null, error: null });
    const store = await import("@/lib/data-store");

    await store.seedDatasetFromLocalSeed();
    expect(supabase.upsert).toHaveBeenCalledTimes(1);
  });
});

describe("cópia de segurança em memória", () => {
  it("guarda a última leitura válida para as páginas públicas não caírem com payload adulterado", async () => {
    supabase.select.mockResolvedValue({ data: { id: "x", payload: datasetReal }, error: null });
    const store = await import("@/lib/data-store");

    await store.readDataset();
    expect(store.getLastGoodDataset()).not.toBeNull();

    supabase.select.mockResolvedValue({ data: { id: "x", payload: { lixo: true } }, error: null });
    await expect(store.readDataset()).rejects.toBeInstanceOf(store.DatasetInvalidError);

    // a cópia boa continua de pé mesmo depois da leitura ruim
    expect(store.getLastGoodDataset()?.teams.length).toBeGreaterThan(0);
  });
});
