import { cache } from "react";

import {
  getLastGoodDataset,
  listArchivedSeasons,
  readArchivedSeason,
  readDataset,
} from "@/lib/data-store";
import type { ArchivedSeason, TournamentDataset } from "@/lib/schema";
import {
  createIndexes,
  getDatasetOverview,
  snapshotToDataset,
  summarizeArchivedSeason,
  type ArchivedSeasonSummary,
} from "@/lib/tournament";

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

/*
 * UMA leitura por requisição. As páginas de detalhe leem o dataset duas vezes — no
 * `generateMetadata` (para o título com o nome do time, do jogador, da temporada) e na
 * própria página. O `cache` do React junta as duas na mesma ida ao banco, e só dentro da
 * mesma requisição: a seguinte lê de novo. Fora do servidor (nos testes) ele não guarda
 * nada e cada chamada lê.
 */
export const getServerDataset = cache(async () => {
  const dataset = await readDatasetForPublicPages();
  const indexes = createIndexes(dataset);
  return { dataset, indexes };
});

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
 * E a "última cópia válida" serve aqui também: ela é o dataset INTEIRO, com o arquivo
 * dentro. Antes o modo degradado era direto a lista vazia e o `null`, e com o banco
 * oscilando /temporadas dizia "nenhuma temporada arquivada" e a 2ª e a 3ª davam 404 —
 * enquanto /tabela, na mesma instância, seguia servindo a cópia. Lista vazia e `null` só
 * quando a instância nunca leu o banco (não há cópia nenhuma). O erro vai para o log com
 * destaque, como no wrapper acima: o site continua de pé, mas a falha não fica invisível.
 */
function resumirArquivo(arquivadas: readonly ArchivedSeason[]): ArchivedSeasonSummary[] {
  // A mesma ordem de `listArchivedSeasons` (lib/data-store.ts): a mais recente primeiro.
  return arquivadas
    .map((season) => summarizeArchivedSeason(season))
    .sort((a, b) =>
      (b.endedAtISO ?? b.archivedAtISO).localeCompare(a.endedAtISO ?? a.archivedAtISO),
    );
}

export const getServerArchivedSeasons = cache(async (): Promise<ArchivedSeasonSummary[]> => {
  try {
    return await listArchivedSeasons();
  } catch (error) {
    const copia = getLastGoodDataset();
    console.error(
      copia
        ? "[server-data] leitura das temporadas arquivadas falhou; servindo o arquivo da última cópia válida."
        : "[server-data] leitura das temporadas arquivadas falhou; servindo lista vazia em modo degradado.",
      error,
    );
    return copia ? resumirArquivo(copia.archivedSeasons) : [];
  }
});

export const getServerArchivedSeason = cache(async (seasonId: string) => {
  let archived: Awaited<ReturnType<typeof readArchivedSeason>>;
  try {
    archived = await readArchivedSeason(seasonId);
  } catch (error) {
    const copia = getLastGoodDataset();
    console.error(
      copia
        ? `[server-data] leitura da temporada arquivada "${seasonId}" falhou; procurando na última cópia válida.`
        : `[server-data] leitura da temporada arquivada "${seasonId}" falhou; tratando como inexistente.`,
      error,
    );
    archived = copia?.archivedSeasons.find((season) => season.seasonId === seasonId) ?? null;
  }
  if (!archived) return null;

  const dataset = snapshotToDataset(archived.snapshot);
  const indexes = createIndexes(dataset);
  const overview = getDatasetOverview(dataset);
  return { archived, dataset, indexes, overview };
});
