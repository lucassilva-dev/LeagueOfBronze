import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { textosElenco } from "@/components/lob/textos-elenco";
import { PaginaDaPartida } from "@/components/partida/pagina-da-partida";
import { metadadosDaPagina, montarMetadados } from "@/lib/i18n/metadados";
import { nomeDaTemporada } from "@/lib/i18n/nome-da-temporada";
import { getLocale, getMessages } from "@/lib/i18n/server";
import { getServerArchivedSeason } from "@/lib/server-data";
import { getSeriesById } from "@/lib/tournament";

export const dynamic = "force-dynamic";

type PageParams = Readonly<{
  params: Promise<{ seasonId: string; seriesId: string }>;
}>;

/** Os dois times e a temporada CERTA (não a do layout, "4ª Edição") na aba e na prévia. */
export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { seasonId, seriesId } = await params;
  const [{ metadados, compartilhados }, result] = await Promise.all([getMessages(), getServerArchivedSeason(seasonId)]);
  const series = result ? getSeriesById(result.dataset, seriesId) : undefined;
  if (!result || !series) return metadadosDaPagina("temporadas");
  return montarMetadados(metadados.temporadaSerie, {
    valores: {
      timeA: result.indexes.teamsById.get(series.teamAId)?.name ?? series.teamAId,
      timeB: result.indexes.teamsById.get(series.teamBId)?.name ?? series.teamBId,
      temporada: nomeDaTemporada(result.archived.name, compartilhados.localeTag),
    },
    caminho: `/temporadas/${encodeURIComponent(result.archived.seasonId)}/partidas/${encodeURIComponent(series.id)}`,
  });
}

/**
 * A partida de uma temporada ARQUIVADA, no mesmo molde da partida do campeonato no ar
 * (components/partida/pagina-da-partida.tsx): cartaz, resumo, jogos e, se houve sorteio, a arena
 * só para leitura. Os links levam às páginas da temporada arquivada.
 */
export default async function TemporadaPartidaPage({ params }: PageParams) {
  const { seasonId, seriesId } = await params;
  const result = await getServerArchivedSeason(seasonId);
  if (!result) notFound();

  const t = await getMessages();
  const te = textosElenco[await getLocale()];
  const { archived, dataset, indexes } = result;
  const series = getSeriesById(dataset, seriesId);
  if (!series) notFound();

  return (
    <PaginaDaPartida
      series={series}
      dataset={dataset}
      indexes={indexes}
      t={t}
      te={te}
      arquivo={{ seasonId: archived.seasonId, nomeDaEdicao: nomeDaTemporada(archived.name, t.compartilhados.localeTag) }}
    />
  );
}
