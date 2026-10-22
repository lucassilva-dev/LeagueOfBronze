"use client";

import { useSyncExternalStore } from "react";

import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, parseAcceptLanguage, type Locale } from "@/lib/i18n/config";
import { erro } from "@/lib/i18n/messages/erro";

/**
 * O que a pessoa vê quando uma página quebra (app/error.tsx) ou quando o próprio layout
 * quebra (app/global-error.tsx).
 *
 * Antes não havia nenhuma das duas: com o banco fora numa instância fria da Vercel, o
 * visitante caía na tela padrão do Next, em inglês, sem cabeçalho, sem menu e sem o visual
 * do site — o mesmo sintoma do dia em que o Supabase pausou.
 *
 * TUDO EM ESTILO INLINE. A global-error renderiza o próprio <html> e não leva o CSS do
 * layout; com inline, as duas telas saem iguais com ou sem o globals.css. E nada de
 * animação: opacidade animada já apagou este site quatro vezes, e uma tela de erro que
 * depende de animação para aparecer seria o pior lugar para repetir isso.
 */

type Textos = (typeof erro)["pt"];

const nadaParaOuvir = () => () => {};

/**
 * Idioma lido no navegador, sem quebrar a hidratação: no servidor (e no primeiro render do
 * cliente) vale o padrão; logo depois, o que `ler` encontrar. É o `useSyncExternalStore`
 * que faz essa troca sem aviso de HTML diferente entre servidor e cliente.
 */
export function useIdioma(ler: () => Locale): Locale {
  return useSyncExternalStore(nadaParaOuvir, ler, () => DEFAULT_LOCALE);
}

/** Para a app/error.tsx: o <html lang> que o layout montou já é a decisão do servidor. */
export function idiomaDoDocumento(): Locale {
  return document.documentElement.lang.toLowerCase().startsWith("en") ? "en" : "pt";
}

/**
 * Para a app/global-error.tsx, que troca o <html> inteiro e não tem o lang do layout:
 * a escolha gravada no cookie e, sem ela, os idiomas do navegador — a mesma ordem do proxy.
 */
export function idiomaDoNavegador(): Locale {
  const prefixo = `${LOCALE_COOKIE}=`;
  const doCookie = document.cookie
    .split(";")
    .map((parte) => parte.trim())
    .find((parte) => parte.startsWith(prefixo))
    ?.slice(prefixo.length);
  if (isLocale(doCookie)) return doCookie;
  const lista = navigator.languages?.length ? navigator.languages.join(",") : navigator.language;
  return parseAcceptLanguage(lista) ?? DEFAULT_LOCALE;
}

export function textosDoErro(idioma: Locale): Textos {
  return erro[idioma];
}

/**
 * O painel em si. Puro: idioma, código e ação chegam por prop — é o que deixa testar as
 * duas línguas com `renderToStaticMarkup`, sem navegador.
 */
export function PainelDeErro({
  idioma,
  codigo,
  onTentarDeNovo,
}: Readonly<{ idioma: Locale; codigo?: string; onTentarDeNovo: () => void }>) {
  const t = textosDoErro(idioma);
  return (
    <div
      lang={idioma === "en" ? "en" : "pt-BR"}
      style={{
        maxWidth: 640,
        margin: "0 auto",
        padding: "clamp(48px,9vw,96px) clamp(16px,4vw,24px) 96px",
      }}
    >
      <div
        role="alert"
        style={{
          border: "1px solid rgba(201,138,75,.28)",
          borderRadius: 4,
          background: "linear-gradient(180deg,#221b11,#120e08)",
          padding: "clamp(22px,5vw,36px)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 11,
            fontSize: 11,
            letterSpacing: ".28em",
            color: "#a98a5f",
            textTransform: "uppercase",
          }}
        >
          <span style={{ width: 28, height: 1, background: "#a98a5f", flexShrink: 0 }} />
          {t.sobretitulo}
        </div>
        <h1
          style={{
            margin: "14px 0 12px",
            fontFamily: 'var(--font-display), "Anton", Impact, sans-serif',
            fontWeight: 400,
            fontSize: "clamp(32px,7vw,52px)",
            lineHeight: 1.05,
            letterSpacing: ".01em",
            color: "#f0c88a",
          }}
        >
          {t.titulo}
        </h1>
        <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: "#b8ab97" }}>{t.texto}</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 11, marginTop: 24 }}>
          <button
            type="button"
            onClick={onTentarDeNovo}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "13px 22px",
              border: "none",
              borderRadius: 2,
              background: "linear-gradient(180deg,#f0c88a,#b97e40)",
              color: "#160f06",
              fontFamily: "inherit",
              fontWeight: 700,
              fontSize: 12.5,
              letterSpacing: ".12em",
              cursor: "pointer",
            }}
          >
            {t.tentarDeNovo}
          </button>
          {/* <a> comum, e não <Link>: com a página quebrada, uma navegação inteira é o que
              tem mais chance de chegar inteira ao início. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a
            href="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "13px 22px",
              border: "1px solid rgba(201,138,75,.4)",
              borderRadius: 2,
              background: "rgba(201,138,75,.08)",
              color: "#e6c592",
              fontWeight: 700,
              fontSize: 12.5,
              letterSpacing: ".12em",
              textDecoration: "none",
            }}
          >
            {t.voltarAoInicio}
          </a>
        </div>
        {/* O código casa com o log do servidor (Vercel) — é o que a organização precisa
            para achar a falha. Não carrega mensagem nenhuma do servidor. */}
        {codigo ? (
          <p style={{ margin: "20px 0 0", fontSize: 11, letterSpacing: ".06em", color: "#8f8472" }}>
            {t.codigo}: <span style={{ fontVariantNumeric: "tabular-nums" }}>{codigo}</span>
          </p>
        ) : null}
      </div>
    </div>
  );
}
