import { readDataset } from "@/lib/data-store";
import { createIndexes, getDatasetOverview } from "@/lib/tournament";

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
