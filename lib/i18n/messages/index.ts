import type { Locale } from "@/lib/i18n/config";
import { calendario4a } from "@/lib/i18n/messages/calendario-4a";
import { comum } from "@/lib/i18n/messages/comum";
import { compartilhados } from "@/lib/i18n/messages/compartilhados";
import { conformidade } from "@/lib/i18n/messages/conformidade";
import { draft } from "@/lib/i18n/messages/draft";
import { erro } from "@/lib/i18n/messages/erro";
import { inscricao } from "@/lib/i18n/messages/inscricao";
import { legal } from "@/lib/i18n/messages/legal";
import { metadados } from "@/lib/i18n/messages/metadados";
import { paginasStats } from "@/lib/i18n/messages/paginas-stats";
import { paginasCompeticao } from "@/lib/i18n/messages/paginas-competicao";
import { paginasHome } from "@/lib/i18n/messages/paginas-home";
import { paginasRegras } from "@/lib/i18n/messages/paginas-regras";
import { preTemporada } from "@/lib/i18n/messages/pre-temporada";

/**
 * Junta os blocos de texto de cada área do site nos dois idiomas.
 *
 * Cada área tem o seu arquivo em messages/ para evitar que edições simultâneas colidam
 * num arquivo gigante. Para adicionar uma área: crie messages/<area>.ts usando `definir`,
 * importe aqui e acrescente nas duas listas abaixo.
 */
export const MESSAGES = {
  pt: {
    calendario4a: calendario4a.pt,
    comum: comum.pt,
    compartilhados: compartilhados.pt,
    conformidade: conformidade.pt,
    draft: draft.pt,
    erro: erro.pt,
    inscricao: inscricao.pt,
    legal: legal.pt,
    metadados: metadados.pt,
    paginasCompeticao: paginasCompeticao.pt,
    paginasHome: paginasHome.pt,
    paginasRegras: paginasRegras.pt,
    paginasStats: paginasStats.pt,
    preTemporada: preTemporada.pt,
  },
  en: {
    calendario4a: calendario4a.en,
    comum: comum.en,
    compartilhados: compartilhados.en,
    conformidade: conformidade.en,
    draft: draft.en,
    erro: erro.en,
    inscricao: inscricao.en,
    legal: legal.en,
    metadados: metadados.en,
    paginasCompeticao: paginasCompeticao.en,
    paginasHome: paginasHome.en,
    paginasRegras: paginasRegras.en,
    paginasStats: paginasStats.en,
    preTemporada: preTemporada.en,
  },
} satisfies Record<Locale, unknown>;

/** Formato dos textos — derivado do português, que é a fonte da verdade. */
export type Messages = (typeof MESSAGES)["pt"];
