import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { caminhoNoArquivo } from "@/lib/arquivo";

import { textosElenco } from "@/components/lob/textos-elenco";
import { PaginaDaPartida } from "@/components/partida/pagina-da-partida";
import { metadadosDaPagina, montarMetadados } from "@/lib/i18n/metadados";
import { nomeDaTemporada } from "@/lib/i18n/nome-da-temporada";
import { getLocale, getMessages } from "@/lib/i18n/server";
import { getServerDataset } from "@/lib/server-data";
import { getSeriesById } from "@/lib/tournament";

export const dynamic = "force-dynamic";

type PartidaDetalhePageParams = Readonly<{
  params: Promise<{ id: string }>;
}>;

/** Os dois times na aba e na prévia do link; sem a série (ou com o banco fora), o da seção. */
export async function generateMetadata({ params }: PartidaDetalhePageParams): Promise<Metadata> {
  const { id } = await params;
  try {
    const [{ metadados, compartilhados }, { dataset, indexes }] = await Promise.all([getMessages(), getServerDataset()]);
    const series = getSeriesById(dataset, id);
    if (series) {
      return montarMetadados(metadados.serie, {
        valores: {
          timeA: indexes.teamsById.get(series.teamAId)?.name ?? series.teamAId,
          timeB: indexes.teamsById.get(series.teamBId)?.name ?? series.teamBId,
          temporada: nomeDaTemporada(dataset.tournament.name, compartilhados.localeTag),
        },
        caminho: `/partidas/${encodeURIComponent(series.id)}`,
      });
    }
  } catch {
    // Banco fora: quem decide o que mostrar é a página (e a app/error.tsx).
  }
  return metadadosDaPagina("partidas");
}

/**
 * A página da partida do campeonato no ar — pensada para a transmissão. O molde (cartaz, arena
 * do sorteio, resumo e jogos) é o de components/partida/pagina-da-partida.tsx, o mesmo das
 * partidas do arquivo (/temporadas/[seasonId]/partidas/[seriesId]).
 */
export default async function PartidaDetalhePage({ params }: PartidaDetalhePageParams) {
  const { id } = await params;
  const t = await getMessages();
  const te = textosElenco[await getLocale()];
  const { dataset, indexes } = await getServerDataset();
  const series = getSeriesById(dataset, id);

  if (!series) {
    // Link antigo de uma série que saiu do ar (ex.: a final, compartilhada no grupo): manda
    // para a cópia arquivada, em vez de 404.
    const arquivado = caminhoNoArquivo(dataset.archivedSeasons, { tipo: "serie", id });
    if (arquivado) redirect(arquivado);
    notFound();
  }

  return <PaginaDaPartida series={series} dataset={dataset} indexes={indexes} t={t} te={te} />;
}
