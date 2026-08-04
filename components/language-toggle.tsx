"use client";

import { LOCALE_COOKIE, LOCALES, type Locale } from "@/lib/i18n/config";

/**
 * Seletor PT | EN do cabeçalho.
 *
 * Só grava o cookie `lob_locale` e recarrega: quem decide o idioma é o servidor (proxy.ts
 * lê o cookie e repassa no cabeçalho interno), então não existe estado de idioma no cliente
 * que possa divergir do que foi renderizado.
 */

const UM_ANO_EM_SEGUNDOS = 60 * 60 * 24 * 365;

type LanguageToggleProps = Readonly<{
  locale: Locale;
  /** Rótulo acessível do grupo ("Idioma" / "Language"). */
  rotulo: string;
  /** Título de cada botão, já traduzido. */
  titulos: Record<Locale, string>;
}>;

const SIGLAS: Record<Locale, string> = { pt: "PT", en: "EN" };

/**
 * Grava a escolha e recarrega. Fica fora do componente porque mexer em `document` dentro
 * do corpo de um componente é bloqueado pelo lint do React Compiler (react-hooks/immutability).
 */
function aplicarIdioma(alvo: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${alvo}; path=/; max-age=${UM_ANO_EM_SEGUNDOS}; samesite=lax`;
  window.location.reload();
}

export function LanguageToggle({ locale, rotulo, titulos }: LanguageToggleProps) {
  function escolher(alvo: Locale) {
    if (alvo === locale) return;
    aplicarIdioma(alvo);
  }

  return (
    <div
      role="group"
      aria-label={rotulo}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        border: "1px solid rgba(201,138,75,.28)",
        borderRadius: 3,
        overflow: "hidden",
        flexShrink: 0,
      }}
    >
      {LOCALES.map((alvo) => {
        const ativo = alvo === locale;
        return (
          <button
            key={alvo}
            type="button"
            lang={alvo}
            title={titulos[alvo]}
            aria-label={titulos[alvo]}
            aria-pressed={ativo}
            onClick={() => escolher(alvo)}
            style={{
              padding: "6px 9px",
              minWidth: 34,
              background: ativo ? "rgba(201,138,75,.22)" : "transparent",
              border: "none",
              color: ativo ? "#f3ece0" : "#a98a5f",
              fontFamily: "inherit",
              fontWeight: 700,
              fontSize: 10,
              letterSpacing: ".12em",
              lineHeight: 1.6,
              cursor: ativo ? "default" : "pointer",
            }}
          >
            {SIGLAS[alvo]}
          </button>
        );
      })}
    </div>
  );
}
