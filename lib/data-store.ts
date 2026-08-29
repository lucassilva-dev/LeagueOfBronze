// Trava de build: se este módulo for importado por um componente "use client",
// a compilação FALHA. Protege a chave de serviço do Supabase de ser arrastada para
// o navegador num refactor futuro.
import "server-only";

import { promises as fs } from "node:fs";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";

import {
  tournamentDatasetSchema,
  type ArchivedSeason,
  type SeriesFormat,
  type TournamentDataset,
} from "@/lib/schema";
import { ErroDeRegra } from "@/lib/security/erros";
import {
  applyAutoGameMvpsToDataset,
  buildArchivedSeason,
  buildNextSeasonDataset,
  summarizeArchivedSeason,
  type ArchivedSeasonSummary,
} from "@/lib/tournament";

export const DATASET_FILENAME = "leagueofbronze.json";
const SUPABASE_TABLE = "tournament_state";
const SUPABASE_DEFAULT_ROW_ID = "leagueofbronze";

export type DataProvider = "local" | "supabase";

/** A linha do dataset não existe no banco. Semeadura é ação explícita de admin. */
export class DatasetMissingError extends Error {
  readonly code = "DATASET_MISSING";
}

/** O payload gravado no banco não passa na validação (possível adulteração). */
export class DatasetInvalidError extends Error {
  readonly code = "DATASET_INVALID";
}

/**
 * Última cópia válida lida nesta instância. Serve para as páginas públicas
 * continuarem no ar caso o payload do banco seja adulterado — sem isso, uma única
 * escrita maliciosa direta no banco derrubava o site inteiro.
 */
let lastGoodDataset: TournamentDataset | null = null;

export function getLastGoodDataset(): TournamentDataset | null {
  return lastGoodDataset;
}

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
    throw new ErroDeRegra(`Validação falhou: ${summary}`);
  }
  return parsed.data;
}

export function normalizeDatasetForSave(dataset: TournamentDataset): TournamentDataset {
  const withAutoMvps = applyAutoGameMvpsToDataset(dataset);
  const now = new Date().toISOString();

  return {
    ...withAutoMvps,
    tournament: {
      ...withAutoMvps.tournament,
      // Auto-cura campos de ciclo de vida ausentes (migração da linha viva).
      status: withAutoMvps.tournament.status ?? "active",
      seasonId: withAutoMvps.tournament.seasonId ?? `season-${now.slice(0, 10)}`,
      startedAtISO: withAutoMvps.tournament.startedAtISO ?? now,
      lastUpdatedISO: now,
    },
  };
}

function getSupabaseUrl() {
  return process.env.SUPABASE_URL?.trim() || process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "";
}

function getSupabaseServiceRoleKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "";
}

/**
 * O schema do Postgres onde este ambiente vive.
 *
 * Produção não define a variável e continua em `public`. O site de teste define
 * `SUPABASE_DB_SCHEMA=lob_teste` e passa a falar com um conjunto de tabelas com os MESMOS
 * nomes, no MESMO banco, que produção não enxerga.
 *
 * Isolar aqui, e não em cada consulta, foi deliberado: são 58 chamadas `.from(...)` em 7
 * arquivos, e bastaria esquecer UMA para uma inscrição de teste cair na tabela de inscrição
 * de verdade. O cliente é o único lugar por onde todas passam.
 *
 * (O plano gratuito do Supabase permite 2 projetos e os dois já estão em uso — daí schema
 * separado em vez de banco separado. A separação de dados é a mesma.)
 */
export function getSupabaseSchema() {
  return process.env.SUPABASE_DB_SCHEMA?.trim() || "public";
}

/** Verdadeiro quando este ambiente NÃO é o de produção. */
export function ehAmbienteDeTeste() {
  return getSupabaseSchema() !== "public";
}

/**
 * A TRAVA CONTRA O ERRO DE CONFIGURAÇÃO QUE NÃO DÁ ERRO.
 *
 * O jeito de o ambiente de teste virar um desastre não é um bug: é criar o projeto de
 * teste na Vercel e esquecer (ou errar) a variável `SUPABASE_DB_SCHEMA`. Sem ela o padrão
 * é `public`, e o site de teste passa a ser um SEGUNDO site de produção — o pessoal
 * fazendo inscrição de brincadeira direto na tabela que decide quem joga, sem um único
 * erro na tela.
 *
 * A Vercel já injeta `VERCEL_PROJECT_PRODUCTION_URL` sozinha, sem ninguém configurar
 * nada. Então dá para conferir a coisa contra ela mesma: um projeto chamado
 * `teste-...` que está lendo `public` está errado, e um projeto de produção lendo
 * qualquer outro schema também.
 *
 * Retorna a descrição do problema, ou `null` quando está tudo coerente. Na dúvida —
 * ambiente que não é Vercel, variável ausente, desenvolvimento local — devolve `null`:
 * uma trava que dispara sozinha é pior do que trava nenhuma.
 */
export function problemaDeAmbiente(): string | null {
  const dominio = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim().toLowerCase();
  if (!dominio) return null; // fora da Vercel (local, teste automatizado): não opina.

  // "teste-league-of-bronze.vercel.app" → primeiro rótulo "teste".
  const pareceTeste = dominio.split(".")[0]?.split("-")[0] === "teste";
  const schema = getSupabaseSchema();

  if (pareceTeste && schema === "public") {
    return (
      `Este deploy se chama "${dominio}" mas está apontando para os dados de PRODUÇÃO ` +
      `(schema "public"). Defina SUPABASE_DB_SCHEMA=lob_teste nas variáveis deste projeto ` +
      `na Vercel e faça um novo deploy. Nada foi lido nem escrito.`
    );
  }

  if (!pareceTeste && schema !== "public") {
    // O inverso também mata: produção servindo o campeonato de mentira.
    return (
      `Este deploy se chama "${dominio}" (produção) mas está apontando para o schema ` +
      `"${schema}", que é de teste. Remova SUPABASE_DB_SCHEMA das variáveis deste projeto ` +
      `na Vercel e faça um novo deploy. Nada foi lido nem escrito.`
    );
  }

  return null;
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

/**
 * Cliente Supabase com a chave de serviço. SOMENTE servidor — nunca importar
 * a partir de um componente com "use client".
 */
export function createSupabaseAdminClient() {
  // Antes de tudo: se o deploy e o schema se contradizem, ninguém fala com o banco.
  const problema = problemaDeAmbiente();
  if (problema) throw new Error(problema);

  const url = getSupabaseUrl();
  const key = getSupabaseServiceRoleKey();
  if (!url || !key) {
    // Erro comum, NÃO de regra: a mensagem de ErroDeRegra vai inteira para a resposta
    // HTTP, e rotas públicas (a inscrição, por exemplo) chegam aqui. O nome das
    // variáveis de ambiente é recado para quem opera o site, não para um visitante
    // anônimo — vai para o log, com o código de referência de `respostaDeErro`.
    throw new Error("Supabase não configurado: defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.");
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    // Uma linha, e é ela que separa o ambiente de teste do de verdade.
    db: { schema: getSupabaseSchema() },
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
    throw new ErroDeRegra("JSON inválido em leagueofbronze.json.");
  }

  try {
    return parseAndValidateDataset(json);
  } catch (error) {
    if (error instanceof Error) {
      throw new ErroDeRegra(
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
    // SEGURANÇA: ler NUNCA pode gravar. Antes, um visitante anônimo em qualquer página
    // recriava a linha a partir do seed do repositório — o que permitia a um atacante
    // alternar "apagar linha" + "abrir o site" para sobrescrever o dado vivo pelo seed antigo.
    // A semeadura passou a ser ação explícita de admin (POST /api/admin/dataset/seed).
    throw new DatasetMissingError(
      `Registro "${getSupabaseDatasetRowId()}" não existe em ${SUPABASE_TABLE}. Use a semeadura no painel admin.`,
    );
  }

  try {
    const dataset = parseAndValidateDataset(row.payload);
    // A cópia de emergência guarda um CLONE, e não a mesma instância que sai daqui.
    // Rotas que editam um pedaço do dataset (cartas, lados) fazem
    // `const d = await readDataset(); serie.x = ...` — mutando o objeto devolvido.
    // Sendo a mesma instância, isso reescrevia a última cópia boa por tabela; se a
    // gravação seguinte falhasse, o fallback passava a servir um estado que nunca
    // existiu no banco, e ninguém teria como perceber.
    lastGoodDataset = structuredClone(dataset);
    return dataset;
  } catch (error) {
    const detail = error instanceof Error ? error.message.replace(/^Validação falhou:\s*/i, "") : String(error);
    throw new DatasetInvalidError(`${getDatasetValidationErrorPrefix()} no Supabase: ${detail}`);
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

  // Mesmo motivo da leitura: quem recebe o dataset salvo pode mexer nele em seguida.
  lastGoodDataset = structuredClone(dataset);
  return dataset;
}

/**
 * Semeadura explícita da linha no Supabase a partir do seed do repositório.
 * Substitui o antigo "bootstrap na leitura": recusa se a linha já existir,
 * para nunca sobrescrever dado vivo.
 */
export async function seedDatasetFromLocalSeed(): Promise<TournamentDataset> {
  if (getConfiguredDataProvider() !== "supabase") {
    throw new ErroDeRegra("Semeadura só se aplica ao provedor Supabase.");
  }

  const existing = await readSupabaseRow();
  if (existing) {
    throw new ErroDeRegra(
      "A linha já existe no Supabase — semeadura recusada para não sobrescrever os dados atuais.",
    );
  }

  const seed = normalizeDatasetForSave(await readLocalDataset());
  await saveSupabaseDataset(seed);
  lastGoodDataset = seed;
  return seed;
}

export async function importDatasetFromText(raw: string) {
  let json: unknown;

  try {
    json = JSON.parse(raw);
  } catch {
    throw new ErroDeRegra("Arquivo importado não contém JSON válido.");
  }

  return saveDataset(json);
}

// ============================================================
// Ciclo de vida do torneio (orquestram read → helper puro → save)
// ============================================================

export async function endCurrentTournament(): Promise<TournamentDataset> {
  const current = await readDataset();

  /*
   * ENCERRAR É IDEMPOTENTE: encerrar de novo REFAZ o retrato arquivado.
   *
   * Encerrar não tranca a edição — o dataset continua gravável pelo painel depois. Então
   * o caminho normal "encerrei, e só aí percebi um placar errado" deixava o arquivo
   * eternamente desatualizado: a correção entrava no dataset vivo, mas o retrato de
   * `archivedSeasons` continuava com o número errado, e reencerrar para atualizá-lo
   * estourava "a temporada já está encerrada". Como depois da virada esse retrato é o
   * ÚNICO exemplar da temporada, o erro ficava congelado para sempre na página pública
   * da temporada arquivada.
   *
   * O `filter` mais abaixo já substitui a entrada de mesmo `seasonId`, então refazer é
   * só deixar passar. `endedAtISO` é PRESERVADO: a data em que a temporada acabou não
   * muda porque alguém corrigiu um placar depois.
   */
  const jaEncerrada = current.tournament.status === "finished";

  const now = new Date().toISOString();
  const seasonId = current.tournament.seasonId ?? `season-${now.replace(/[:.]/g, "-")}`;

  const currentWithId: TournamentDataset = {
    ...current,
    tournament: { ...current.tournament, seasonId },
  };

  const archived = buildArchivedSeason(currentWithId, now);

  const updated: TournamentDataset = {
    ...currentWithId,
    tournament: {
      ...currentWithId.tournament,
      status: "finished",
      // Reencerrar não reescreve a data do fim — só o retrato.
      endedAtISO: jaEncerrada ? (currentWithId.tournament.endedAtISO ?? now) : now,
    },
    archivedSeasons: [
      ...current.archivedSeasons.filter((season) => season.seasonId !== seasonId),
      archived,
    ],
  };

  return saveDataset(updated);
}

export async function startNewTournament(options: {
  name: string;
  format: SeriesFormat;
  keepTeams?: boolean;
  keepPlayers?: boolean;
  archiveCurrent?: boolean;
}): Promise<TournamentDataset> {
  let current = await readDataset();

  const activeWithData =
    current.tournament.status !== "finished" && current.seriesMatches.length > 0;

  if (activeWithData && !options.archiveCurrent) {
    throw new ErroDeRegra(
      "A temporada atual tem séries e ainda está ativa. Encerre-a antes de iniciar uma nova (ou marque para arquivar).",
    );
  }

  if (options.archiveCurrent && current.tournament.status !== "finished") {
    current = await endCurrentTournament();
  }

  const now = new Date().toISOString();

  const next = buildNextSeasonDataset(current, {
    name: options.name,
    format: options.format,
    keepTeams: options.keepTeams ?? true,
    keepPlayers: options.keepPlayers ?? true,
    seasonId: `season-${now.replace(/[:.]/g, "-")}`,
    now,
  });

  return saveDataset(next);
}

export async function listArchivedSeasons(): Promise<ArchivedSeasonSummary[]> {
  const dataset = await readDataset();
  return dataset.archivedSeasons
    .map((season) => summarizeArchivedSeason(season))
    .sort((a, b) =>
      (b.endedAtISO ?? b.archivedAtISO).localeCompare(a.endedAtISO ?? a.archivedAtISO),
    );
}

export async function readArchivedSeason(
  seasonId: string,
): Promise<ArchivedSeason | null> {
  const dataset = await readDataset();
  return dataset.archivedSeasons.find((season) => season.seasonId === seasonId) ?? null;
}
