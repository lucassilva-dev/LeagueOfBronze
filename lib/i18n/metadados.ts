import type { Metadata } from "next";

import type { Messages } from "@/lib/i18n/messages";
import { getMessages } from "@/lib/i18n/server";

/**
 * Título e descrição de cada página no idioma da visita (textos em
 * lib/i18n/messages/metadados.ts).
 *
 * O canônico é um caminho RELATIVO: o Next o resolve contra o `metadataBase` do layout,
 * que é o endereço oficial (lib/site-url.ts). Assim a mesma página aberta pelo
 * league-of-bronze.vercel.app aponta para www.leagueofbronze.xyz, e os buscadores não a
 * contam duas vezes. O /trailer NÃO passa por aqui: lá o endereço é o da visita, de
 * propósito (ver app/trailer/page.tsx).
 */

type PaginaFixa = keyof Messages["metadados"];

/** Troca cada `{chave}` do modelo pelo valor; chave sem valor fica como está. */
export function preencher(modelo: string, valores: Readonly<Record<string, string>>): string {
  return modelo.replace(/\{(\w+)\}/g, (inteiro, chave: string) => valores[chave] ?? inteiro);
}

/** Metadados de uma entrada do dicionário, com os `{campos}` já preenchidos. */
export function montarMetadados(
  textos: { titulo: string; descricao: string },
  opcoes: Readonly<{ valores?: Record<string, string>; caminho?: string }> = {},
): Metadata {
  const valores = opcoes.valores ?? {};
  return {
    title: preencher(textos.titulo, valores),
    description: preencher(textos.descricao, valores),
    ...(opcoes.caminho ? { alternates: { canonical: opcoes.caminho } } : {}),
  };
}

/** Para as páginas de conteúdo fixo: só o idioma muda. */
export async function metadadosDaPagina(pagina: PaginaFixa, caminho?: string): Promise<Metadata> {
  const { metadados } = await getMessages();
  return montarMetadados(metadados[pagina], { caminho });
}
