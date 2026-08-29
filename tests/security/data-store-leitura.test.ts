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
  insert: vi.fn(),
}));

/*
 * A ESCRITA acontece por dois caminhos, e o mock precisa dos dois:
 *  - `insert`, quando a linha ainda não existe (a semeadura). Falhar aqui, se alguém
 *    criou a linha primeiro, é a proteção: o `insert` recusa em vez de sobrescrever;
 *  - `update ... .eq("version", …)`, a gravação condicionada da trava de concorrência.
 * O `upsert` sobrou só onde não há versão a preservar.
 */
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: supabase.select }),
      }),
      upsert: supabase.upsert,
      insert: supabase.insert,
      update: () => ({
        eq: () => ({
          eq: () => ({ select: async () => ({ data: [{ version: 1 }], error: null }) }),
        }),
      }),
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
    expect(supabase.insert).not.toHaveBeenCalled();
  });

  it("grava só quando a linha realmente não existe", async () => {
    supabase.select.mockResolvedValue({ data: null, error: null });
    supabase.insert.mockResolvedValue({ error: null });
    const store = await import("@/lib/data-store");

    await store.seedDatasetFromLocalSeed();

    // `insert`, e não `upsert`: se outra pessoa criar a linha entre a conferência e a
    // gravação, o insert falha em vez de sobrescrever o dado vivo dela.
    expect(supabase.insert).toHaveBeenCalledTimes(1);
    expect(supabase.upsert).not.toHaveBeenCalled();
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

describe("o backup exportado tem de voltar pela importação", () => {
  it("ida e volta: exportar e reimportar sem quebrar", async () => {
    /*
     * `readSupabaseDataset` passou a devolver `{dataset, versao}`, e um chamador esquecido
     * fez o export serializar o PAR: o arquivo baixado virava
     * `{"dataset":{...},"versao":7}`. O download parecia perfeito, e só no dia da
     * restauração é que a importação recusava — que é o pior momento possível para
     * descobrir.
     *
     * Por isso o teste é a IDA E VOLTA, e não "tem a chave tournament": a volta é a única
     * coisa que prova que o arquivo serve para o que ele existe.
     */
    supabase.select.mockResolvedValue({
      data: { id: "x", payload: datasetReal, version: 7 },
      error: null,
    });
    const store = await import("@/lib/data-store");

    const texto = await store.readDatasetText();

    expect(Object.keys(JSON.parse(texto))).not.toContain("versao");
    await expect(store.importDatasetFromText(texto)).resolves.toBeTruthy();
  });
});
