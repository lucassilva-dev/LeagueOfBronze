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

export async function getServerArchivedSeasons() {
  return listArchivedSeasons();
}

export async function getServerArchivedSeason(seasonId: string) {
  const archived = await readArchivedSeason(seasonId);
  if (!archived) return null;

  const dataset = snapshotToDataset(archived.snapshot);
  const indexes = createIndexes(dataset);
  const overview = getDatasetOverview(dataset);
  return { archived, dataset, indexes, overview };
}
