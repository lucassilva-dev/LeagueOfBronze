import Link from "next/link";

import { LanguageToggle } from "@/components/language-toggle";
import { MainNav, type NavLabel } from "@/components/main-nav";
import { AVISO_RIOT_OFICIAL, CONTATO_EMAIL } from "@/lib/i18n/messages/legal";
import { getLocale, getMessages } from "@/lib/i18n/server";

type SiteFrameProps = Readonly<{ children: React.ReactNode }>;

const NOISE =
  "url('data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22140%22 height=%22140%22%3E%3Cfilter id=%22n%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.85%22 numOctaves=%222%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23n)%22/%3E%3C/svg%3E')";

export async function SiteFrame({ children }: SiteFrameProps) {
  const locale = await getLocale();
  const t = await getMessages();

  const navLabels: NavLabel[] = [
    { href: "/", label: t.comum.navInicio },
    { href: "/times", label: t.comum.navTimes },
    { href: "/jogadores", label: t.comum.navJogadores },
    { href: "/calendario", label: t.comum.navCalendario },
    { href: "/tabela", label: t.comum.navTabela },
    { href: "/stats", label: t.comum.navEstatisticas },
    { href: "/cartas", label: t.comum.navCartas },
    { href: "/regras", label: t.comum.navRegras },
    { href: "/temporadas", label: t.comum.navTemporadas },
  ];

  return (
    <div style={{ position: "relative", minHeight: "100vh", color: "#b8ab97", overflowX: "hidden" }}>
      {/* Camada de glows bronze + teal + listras diagonais */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
          backgroundColor: "#100d07",
          backgroundImage:
            "radial-gradient(1100px 640px at 8% -8%,rgba(201,138,75,.20),transparent 62%),radial-gradient(920px 720px at 108% 114%,rgba(70,214,200,.07),transparent 55%),repeating-linear-gradient(135deg,rgba(201,138,75,.035) 0 2px,transparent 2px 26px)",
        }}
      />
      {/* Ruído fininho */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
          opacity: 0.05,
          mixBlendMode: "overlay",
          backgroundImage: NOISE,
        }}
      />

      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        <header
          style={{
            position: "sticky",
            top: 0,
            zIndex: 40,
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            background: "linear-gradient(180deg,rgba(16,13,7,.95),rgba(16,13,7,.80))",
            borderBottom: "1px solid rgba(201,138,75,.22)",
          }}
        >
          <div
            style={{
              maxWidth: 1280,
              margin: "0 auto",
              padding: "12px clamp(16px,4vw,24px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
            }}
          >
            <Link
              href="/"
              style={{ display: "flex", alignItems: "center", gap: 12, textDecoration: "none" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo.png"
                alt="Os Bronzes"
                width={44}
                height={44}
                style={{
                  width: 44,
                  height: 44,
                  objectFit: "contain",
                  borderRadius: 6,
                  flexShrink: 0,
                  filter: "drop-shadow(0 0 14px rgba(232,184,120,.4))",
                }}
              />
              <div style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
                <span
                  className="lob-display"
                  style={{ fontSize: 16, letterSpacing: ".05em", color: "#f3ece0" }}
                >
                  OS BRONZES
                </span>
                <span style={{ fontSize: 9, letterSpacing: ".34em", color: "#a98a5f", marginTop: 4 }}>
                  {t.comum.edicao}
                </span>
              </div>
            </Link>
            {/*
              Wrapper sem `position` para não virar o bloco de referência do menu
              hambúrguer, que se posiciona em relação ao <header>.
            */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <MainNav
                labels={navLabels}
                ariaLabel={t.comum.navAriaPrincipal}
                abrirMenu={t.comum.navAbrirMenu}
              />
              <LanguageToggle
                locale={locale}
                rotulo={t.comum.idioma}
                titulos={{
                  pt: locale === "pt" ? t.comum.idiomaPt : t.comum.trocarParaPt,
                  en: locale === "en" ? t.comum.idiomaEn : t.comum.trocarParaEn,
                }}
              />
            </div>
          </div>
          <div
            style={{
              height: 1,
              background: "linear-gradient(90deg,transparent,rgba(232,184,120,.35),transparent)",
            }}
          />
        </header>

        <div style={{ flex: 1 }}>{children}</div>

        <footer style={{ position: "relative", borderTop: "1px solid rgba(201,138,75,.16)" }}>
          <div
            style={{
              maxWidth: 1280,
              margin: "0 auto",
              padding: "22px clamp(16px,4vw,24px)",
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 16,
                flexWrap: "wrap",
                fontSize: 11,
                letterSpacing: ".10em",
                color: "#6f6656",
              }}
            >
              <span>{t.comum.rodapeAssinatura}</span>
              <span>{t.comum.rodapeLema}</span>
            </div>

            {/*
              Aviso exigido pelas políticas da Riot Games, em local prontamente visível:
              rodapé de TODAS as páginas.

              O texto obrigatório é a redação EM INGLÊS, e a exigência não depende do idioma
              de quem visita — então ele aparece sempre, em qualquer locale. Já tentamos
              mostrar só a versão traduzida para quem lê em português; isso tirou a frase
              obrigatória de 13 das 14 rotas e foi revertido.

              Em inglês não há repetição: `rodapeAviso` JÁ É a constante, então o parágrafo
              extra é suprimido. Em português aparecem os dois — o obrigatório em inglês,
              marcado com lang="en" para leitores de tela, e a tradução fiel logo abaixo.
            */}
            <div
              style={{
                borderTop: "1px solid rgba(201,138,75,.10)",
                paddingTop: 13,
                display: "flex",
                flexDirection: "column",
                gap: 6,
                fontSize: 11,
                lineHeight: 1.6,
                color: "#7d7263",
              }}
            >
              {locale === "en" ? null : (
                <p lang="en" style={{ margin: 0 }}>
                  {AVISO_RIOT_OFICIAL}
                </p>
              )}
              <p style={{ margin: 0, color: locale === "en" ? undefined : "#6f6656" }}>
                {t.comum.rodapeAviso}{" "}
                <Link href="/legal" style={{ color: "#c98a4b", textDecoration: "none" }}>
                  {t.comum.rodapeLinkLegal}
                </Link>
                {" · "}
                <a
                  href={`mailto:${CONTATO_EMAIL}`}
                  style={{ color: "#c98a4b", textDecoration: "none" }}
                >
                  {t.comum.rodapeContato}
                </a>
              </p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
