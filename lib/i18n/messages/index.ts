import type { Locale } from "@/lib/i18n/config";
import { comum } from "@/lib/i18n/messages/comum";
import { compartilhados } from "@/lib/i18n/messages/compartilhados";
import { conformidade } from "@/lib/i18n/messages/conformidade";
import { legal } from "@/lib/i18n/messages/legal";
import { paginasStats } from "@/lib/i18n/messages/paginas-stats";
import { paginasCompeticao } from "@/lib/i18n/messages/paginas-competicao";
import { paginasHome } from "@/lib/i18n/messages/paginas-home";
import { paginasRegras } from "@/lib/i18n/messages/paginas-regras";

/**
 * Junta os blocos de texto de cada área do site nos dois idiomas.
 *
 * Cada área tem o seu arquivo em messages/ para evitar que edições simultâneas colidam
 * num arquivo gigante. Para adicionar uma área: crie messages/<area>.ts usando `definir`,
 * importe aqui e acrescente nas duas listas abaixo.
 */
export const MESSAGES = {
  pt: {
    comum: comum.pt,
    compartilhados: compartilhados.pt,
    conformidade: conformidade.pt,
    legal: legal.pt,
    paginasCompeticao: paginasCompeticao.pt,
    paginasHome: paginasHome.pt,
    paginasRegras: paginasRegras.pt,
    paginasStats: paginasStats.pt,
  },
  en: {
    comum: comum.en,
    compartilhados: compartilhados.en,
    conformidade: conformidade.en,
    legal: legal.en,
    paginasCompeticao: paginasCompeticao.en,
    paginasHome: paginasHome.en,
    paginasRegras: paginasRegras.en,
    paginasStats: paginasStats.en,
  },
} satisfies Record<Locale, unknown>;

/** Formato dos textos — derivado do português, que é a fonte da verdade. */
export type Messages = (typeof MESSAGES)["pt"];
