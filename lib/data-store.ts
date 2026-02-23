import { promises as fs } from "node:fs";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";

import { tournamentDatasetSchema, type TournamentDataset } from "@/lib/schema";

export const DATASET_FILENAME = "leagueofbronze.json";
const SUPABASE_TABLE = "tournament_state";
const SUPABASE_DEFAULT_ROW_ID = "leagueofbronze";

export type DataProvider = "local" | "supabase";

type SupabaseRow = {
  id: string;
  payload: unknown;
  updated_at?: string;
};

function parseAndValidateDataset(json: unknown) {
  const parsed = tournamentDatasetSchema.safeParse(json);
  if (!parsed.success) {
    const summary = parsed.error.issues
      .slice(0, 20)
      .map((issue) => `${issue.path.join(".") || "root"}: ${issue.message}`)
      .join(" | ");
    throw new Error(`Validação falhou: ${summary}`);
  }
  return parsed.data;
}

export function normalizeDatasetForSave(dataset: TournamentDataset): TournamentDataset {
  return {
    ...dataset,
    tournament: {
      ...dataset.tournament,
      lastUpdatedISO: new Date().toISOString(),
    },
  };
}

function getSupabaseUrl() {
  return process.env.SUPABASE_URL?.trim() || process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "";
}

function getSupabaseServiceRoleKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "";
}

export function getSupabaseDatasetRowId() {
  return process.env.SUPABASE_DATASET_ROW_ID?.trim() || SUPABASE_DEFAULT_ROW_ID;
}

export function isSupabaseConfigured() {
  return Boolean(getSupabaseUrl() && getSupabaseServiceRoleKey());
}

export function getConfiguredDataProvider(): DataProvider {
  const explicit = (process.env.DATA_PROVIDER?.trim().toLowerCase() || "") as
    | DataProvider
    | "";

  if (explicit === "supabase") return "supabase";
  if (explicit === "local") return "local";
  if (isSupabaseConfigured()) return "supabase";
  return "local";
}

export function getDataProviderLabel(provider = getConfiguredDataProvider()) {
  return provider === "supabase" ? "Supabase (online)" : "Arquivo local (JSON)";
}

function getDatasetValidationErrorPrefix() {
  return "Dados do campeonato inválidos";
}

function createSupabaseAdminClient() {
  const url = getSupabaseUrl();
  const key = getSupabaseServiceRoleKey();
  if (!url || !key) {
    throw new Error(
      "Supabase não configurado. Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function getDatasetFilePath() {
  return path.join(process.cwd(), DATASET_FILENAME);
}

async function readLocalDatasetText() {
  return fs.readFile(getDatasetFilePath(), "utf8");
}

async function readLocalDataset(): Promise<TournamentDataset> {
  const raw = await readLocalDatasetText();
  let json: unknown;

  try {
    json = JSON.parse(raw);
  } catch {
    throw new Error("JSON inválido em leagueofbronze.json.");
  }

  try {
    return parseAndValidateDataset(json);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(
        `${getDatasetValidationErrorPrefix()}: ${error.message.replace(/^Validação falhou:\s*/i, "")}`,
      );
    }
    throw error;
  }
}

async function saveLocalDataset(dataset: TournamentDataset) {
  await fs.writeFile(
    getDatasetFilePath(),
    `${JSON.stringify(dataset, null, 2)}\n`,
    "utf8",
  );
}

async function readSupabaseRow(): Promise<SupabaseRow | null> {
  const client = createSupabaseAdminClient();
  const rowId = getSupabaseDatasetRowId();

  const { data, error } = await client
    .from(SUPABASE_TABLE)
    .select("id,payload,updated_at")
    .eq("id", rowId)
    .maybeSingle<SupabaseRow>();

  if (error) {
    throw new Error(
      `Falha ao ler Supabase (${SUPABASE_TABLE}). Confira se a tabela foi criada. Detalhe: ${error.message}`,
    );
  }

  return data ?? null;
}

async function readSupabaseDataset(): Promise<TournamentDataset> {
  const row = await readSupabaseRow();
  if (!row) {
    // Bootstrap automático: usa o seed local na primeira execução e cria o registro no Supabase.
    const localSeed = normalizeDatasetForSave(await readLocalDataset());
    await saveSupabaseDataset(localSeed);
    return localSeed;
  }

  try {
    return parseAndValidateDataset(row.payload);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(
        `${getDatasetValidationErrorPrefix()} no Supabase: ${error.message.replace(/^Validação falhou:\s*/i, "")}`,
      );
    }
    throw error;
  }
}

async function saveSupabaseDataset(dataset: TournamentDataset) {
  const client = createSupabaseAdminClient();
  const rowId = getSupabaseDatasetRowId();

  const { error } = await client.from(SUPABASE_TABLE).upsert(
    {
      id: rowId,
      payload: dataset,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );

  if (error) {
    throw new Error(
      `Falha ao salvar no Supabase (${SUPABASE_TABLE}). Detalhe: ${error.message}`,
    );
  }
}

export async function readDatasetText() {
  const provider = getConfiguredDataProvider();
  if (provider === "supabase") {
    const dataset = await readSupabaseDataset();
    return `${JSON.stringify(dataset, null, 2)}\n`;
  }
  return readLocalDatasetText();
}

export async function readDataset(): Promise<TournamentDataset> {
  const provider = getConfiguredDataProvider();
  if (provider === "supabase") return readSupabaseDataset();
  return readLocalDataset();
}

export async function saveDataset(input: unknown): Promise<TournamentDataset> {
  const parsed = parseAndValidateDataset(input);
  const dataset = normalizeDatasetForSave(parsed);
  const provider = getConfiguredDataProvider();

  if (provider === "supabase") {
    await saveSupabaseDataset(dataset);
  } else {
    await saveLocalDataset(dataset);
  }

  return dataset;
}

export async function importDatasetFromText(raw: string) {
  let json: unknown;

  try {
    json = JSON.parse(raw);
  } catch {
    throw new Error("Arquivo importado não contém JSON válido.");
  }

  return saveDataset(json);
}
