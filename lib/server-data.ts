import {
  getLastGoodDataset,
  listArchivedSeasons,
  readArchivedSeason,
  readDataset,
} from "@/lib/data-store";
import type { TournamentDataset } from "@/lib/schema";
import { createIndexes, getDatasetOverview, snapshotToDataset } from "@/lib/tournament";

/**
 * Leitura para as PÁGINAS PÚBLICAS: tolera falha do banco servindo a última cópia
 * válida conhecida, para que um payload adulterado (ou a linha apagada) não derrube
 * o site inteiro. As rotas de admin continuam usando `readDataset()` direto — lá a
 * leitura precisa falhar alto, senão o admin editaria uma cópia velha e a salvaria
 * por cima do dado bom.
 */
async function readDatasetForPublicPages(): Promise<TournamentDataset> {
  try {
    return await readDataset();
  } catch (error) {
    const fallback = getLastGoodDataset();
    if (!fallback) throw error;
    console.error(
      "[server-data] leitura do dataset falhou; servindo a última cópia válida em modo degradado.",
      error,
    );
    return fallback;
  }
}

export async function getServerDataset() {
  const dataset = await readDatasetForPublicPages();
  const indexes = createIndexes(dataset);
  return { dataset, indexes };
}

export async function getServerOverview() {
  const dataset = await readDatasetForPublicPages();
  const indexes = createIndexes(dataset);
  const overview = getDatasetOverview(dataset);
  return { dataset, indexes, overview };
}

/*
 * As temporadas arquivadas seguem a MESMA política das páginas públicas acima: falha
 * de leitura degrada, não derruba. Sem isto, /temporadas e /temporadas/[seasonId]
 * eram as únicas rotas públicas que estouravam em 500 quando o banco oscilava —
 * enquanto /tabela, /times e o resto do site continuavam servindo a última cópia boa.
 *
 * Não há "última cópia válida" de temporada arquivada, então o modo degradado aqui é
 * a lista vazia (a página já sabe dizer que não há temporada) e o `null` (que a página
 * já trata como 404). O erro vai para o log com destaque, como no wrapper acima: o
 * site continua de pé, mas a falha não fica invisível.
 */
export async function getServerArchivedSeasons() {
  try {
    return await listArchivedSeasons();
  } catch (error) {
    console.error(
      "[server-data] leitura das temporadas arquivadas falhou; servindo lista vazia em modo degradado.",
      error,
    );
    return [];
  }
}

export async function getServerArchivedSeason(seasonId: string) {
  let archived: Awaited<ReturnType<typeof readArchivedSeason>>;
  try {
    archived = await readArchivedSeason(seasonId);
  } catch (error) {
    console.error(
      `[server-data] leitura da temporada arquivada "${seasonId}" falhou; tratando como inexistente.`,
      error,
    );
    return null;
  }
  if (!archived) return null;

  const dataset = snapshotToDataset(archived.snapshot);
  const indexes = createIndexes(dataset);
  const overview = getDatasetOverview(dataset);
  return { archived, dataset, indexes, overview };
}
