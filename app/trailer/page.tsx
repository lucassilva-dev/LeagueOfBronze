import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";

import { Eyebrow, GoldTitle } from "@/components/lob/ui";
import { Trailer4a } from "@/components/trailer-4a";
import { getMessages } from "@/lib/i18n/server";
import { estadoDaJanela } from "@/lib/inscricoes/schema";
import { lerConfigOuNulo } from "@/lib/inscricoes/store";
import { SITE_URL } from "@/lib/site-url";

/**
 * Renderização por requisição — OBRIGATÓRIO enquanto a CSP usar nonce (ver proxy.ts).
 * Página estática é pré-renderizada no build, sai sem nonce nos <script>, a CSP bloqueia
 * o JavaScript e o conteúdo preso no bloco de Suspense nunca aparece: página em branco.
 */
export const dynamic = "force-dynamic";

/**
 * A prévia do link é o motivo desta página existir: quem cola /trailer no WhatsApp vê o
 * card com a imagem do trailer, e não o card genérico do site. Por isso a imagem é
 * absoluta (`metadataBase`) e tem o tamanho que os apps de mensagem esperam (1200×630).
 *
 * Sem `og:video` de propósito: o Next não passa as URLs de vídeo pelo `metadataBase` (a
 * tag sairia relativa, que o protocolo não aceita), e o player embutido do Discord/Facebook
 * puxaria o MP4 inteiro da Vercel a cada prévia. O card com a imagem é o que se quer.
 *
 * A base das URLs absolutas é o endereço que a pessoa abriu (`enderecoDaVisita`), e não
 * um fixo: o domínio próprio entrou no ar depois do trailer, e uma prévia montada com um
 * domínio que ainda não resolve fica sem imagem PARA SEMPRE no cache do WhatsApp.
 * A descrição também não diz "inscrições abertas": o WhatsApp guarda a prévia em cache, e
 * ela continuaria dizendo isso depois que fecharem.
 */
export async function generateMetadata(): Promise<Metadata> {
  const [{ preTemporada: t }, base] = await Promise.all([getMessages(), enderecoDaVisita()]);
  return {
    metadataBase: base,
    title: t.trailerMetaTitulo,
    description: t.trailerMetaDescricao,
    alternates: { canonical: "/trailer" },
    openGraph: {
      type: "website",
      url: "/trailer",
      siteName: "League of Bronze",
      title: t.trailerMetaTitulo,
      description: t.trailerMetaDescricao,
      images: [{ url: "/trailer/og.jpg", width: 1200, height: 630, alt: t.trailerAria }],
    },
    twitter: {
      card: "summary_large_image",
      title: t.trailerMetaTitulo,
      description: t.trailerMetaDescricao,
      images: ["/trailer/og.jpg"],
    },
  };
}

/**
 * O endereço pelo qual esta visita chegou (`https://` + host), ou o oficial se não der pra
 * saber. Só monta URLs da própria página — trocar o Host na mão só muda a prévia de quem
 * trocou.
 */
async function enderecoDaVisita(): Promise<URL> {
  const h = await headers();
  const host = (h.get("x-forwarded-host") ?? h.get("host") ?? "").split(",")[0]?.trim();
  if (host && /^[a-z0-9.-]+(:\d+)?$/i.test(host)) {
    const local = /^(localhost|127\.0\.0\.1)(:|$)/.test(host);
    return new URL(`${local ? "http" : "https"}://${host}`);
  }
  return new URL(SITE_URL);
}

/**
 * /trailer — o trailer sozinho, pra compartilhar. O vídeo termina na tela de inscrição,
 * então a página termina no mesmo botão.
 */
export default async function TrailerPage() {
  const [{ preTemporada: t }, config] = await Promise.all([getMessages(), lerConfigOuNulo()]);
  const aberta = estadoDaJanela(config) === "aberta";
  return (
    <div style={{ position: "relative", maxWidth: 1180, margin: "0 auto", padding: "0 clamp(16px,4vw,24px) 96px" }}>
      <section className="lob-fade" style={{ padding: "clamp(36px,6vw,64px) 0 20px" }}>
        <Eyebrow>{t.trailerPaginaSobretitulo}</Eyebrow>
        <GoldTitle style={{ fontSize: "clamp(44px,9vw,110px)", lineHeight: 1.08, margin: "12px 0 calc(14px - 0.42em)" }}>
          {t.trailerPaginaTitulo}
        </GoldTitle>
        <p style={{ maxWidth: 620, fontSize: "clamp(14px,2vw,16px)", lineHeight: 1.55, color: "#a99e8b", margin: "0 0 22px" }}>
          {t.trailerTexto}
        </p>
        <Trailer4a aria={t.trailerAria} semSuporte={t.trailerSemSuporte} />
        <div style={{ display: "flex", flexWrap: "wrap", gap: 11, marginTop: 26 }}>
          <Link href="/inscricao" className="lob-btn-gold" style={{ padding: "16px 28px", fontSize: 14 }}>
            {aberta ? t.botaoInscrever : t.botaoVerInscricao}
          </Link>
          <Link href="/regras" className="lob-btn-ghost" style={{ padding: "16px 24px", fontSize: 13 }}>
            {t.botaoRegras}
          </Link>
        </div>
      </section>
    </div>
  );
}
