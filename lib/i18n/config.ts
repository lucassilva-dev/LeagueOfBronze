/**
 * Suporte a dois idiomas: português do Brasil e inglês.
 *
 * Decisão de projeto: as URLs NÃO mudam por idioma (nada de /en/regras). Dois motivos:
 *  1. A Product URL já foi registrada na aplicação da Riot (App ID 807844) apontando para
 *     a raiz; trocar a estrutura de rotas quebraria o link que o revisor vai abrir.
 *  2. O site é pequeno e todas as páginas já são dinâmicas (exigência da CSP por nonce),
 *     então resolver o idioma por requisição sai de graça.
 *
 * O idioma é decidido nesta ordem:
 *  1. cookie `lob_locale` — escolha explícita da pessoa, tem prioridade máxima;
 *  2. cabeçalho Accept-Language do navegador;
 *  3. português (o público principal é brasileiro).
 */

export const LOCALES = ["pt", "en"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "pt";
export const LOCALE_COOKIE = "lob_locale";
/** Cabeçalho interno: o proxy resolve o idioma e repassa para os Server Components. */
export const LOCALE_HEADER = "x-lob-locale";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/**
 * Lê o Accept-Language respeitando o fator de qualidade (q=).
 *
 * "pt-BR,pt;q=0.9,en-US;q=0.8" → pt. "en-US,en;q=0.9" → en.
 * Só considera os idiomas que o site fala; o resto é ignorado em vez de virar fallback
 * silencioso — quem pede francês recebe português (padrão), não inglês por acidente.
 */
export function parseAcceptLanguage(header: string | null | undefined): Locale | null {
  if (!header) return null;

  const candidatos = header
    .split(",")
    .map((parte) => {
      const [tagCru, ...params] = parte.trim().split(";");
      const tag = tagCru.trim().toLowerCase();
      const q = params
        .map((p) => p.trim())
        .find((p) => p.startsWith("q="));
      // q ilegível (ex.: "q=abc") não pode descartar o idioma — vale como q=1.
      const bruto = q ? Number.parseFloat(q.slice(2)) : 1;
      const peso = Number.isFinite(bruto) ? bruto : 1;
      return { tag, peso };
    })
    .filter((c) => c.tag.length > 0 && c.peso > 0)
    .sort((a, b) => b.peso - a.peso);

  for (const { tag } of candidatos) {
    // "pt-br" e "pt" caem em pt; "en-us", "en-gb" e "en" caem em en.
    const base = tag.split("-")[0];
    if (base === "pt") return "pt";
    if (base === "en") return "en";
  }

  return null;
}

/** Resolve o idioma a partir do cookie e do cabeçalho, nessa ordem de prioridade. */
export function resolveLocale(
  cookieValue: string | null | undefined,
  acceptLanguage: string | null | undefined,
): Locale {
  if (isLocale(cookieValue)) return cookieValue;
  return parseAcceptLanguage(acceptLanguage) ?? DEFAULT_LOCALE;
}

/** Valor de `<html lang>` — precisa ser a tag BCP 47 completa, não o código curto. */
export function htmlLang(locale: Locale): string {
  return locale === "pt" ? "pt-BR" : "en";
}
