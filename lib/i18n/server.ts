import { headers } from "next/headers";

import { DEFAULT_LOCALE, LOCALE_HEADER, isLocale, type Locale } from "@/lib/i18n/config";
import { MESSAGES, type Messages } from "@/lib/i18n/messages";

/**
 * Idioma da requisição atual, para uso em Server Components.
 *
 * O trabalho de decidir já foi feito no proxy.ts (cookie > Accept-Language > pt); aqui só
 * lemos o resultado. Se por algum motivo o cabeçalho não vier, cai no padrão em vez de
 * quebrar a página.
 */
export async function getLocale(): Promise<Locale> {
  const h = await headers();
  const valor = h.get(LOCALE_HEADER);
  return isLocale(valor) ? valor : DEFAULT_LOCALE;
}

/**
 * Textos da página no idioma da requisição.
 *
 * Uso em Server Component:
 *   const t = await getMessages();
 *   <h1>{t.regras.titulo}</h1>
 */
export async function getMessages(): Promise<Messages> {
  return MESSAGES[await getLocale()];
}
