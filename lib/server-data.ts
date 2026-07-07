import {
  listArchivedSeasons,
  readArchivedSeason,
  readDataset,
} from "@/lib/data-store";
import { createIndexes, getDatasetOverview, snapshotToDataset } from "@/lib/tournament";

export async function getServerDataset() {
  const dataset = await readDataset();
  const indexes = createIndexes(dataset);
  return { dataset, indexes };
}

export async function getServerOverview() {
  const dataset = await readDataset();
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
