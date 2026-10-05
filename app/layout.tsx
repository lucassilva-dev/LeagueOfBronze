import type { Metadata } from "next";
import { Anton, Chakra_Petch } from "next/font/google";

import { SiteFrame } from "@/components/site-frame";
import { htmlLang } from "@/lib/i18n/config";
import { getLocale } from "@/lib/i18n/server";

import "./globals.css";

const display = Anton({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
});

const body = Chakra_Petch({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
});

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();

  return locale === "en"
    ? {
        title: "League of Bronze · 4th Edition",
        description:
          "League of Bronze — amateur League of Legends tournament. Sign-ups for the 4th Edition, rules and the archive of past seasons.",
      }
    : {
        title: "League of Bronze · 4ª Edição",
        description:
          "League of Bronze — campeonato amador de League of Legends. Inscrição para a 4ª Edição, regulamento e o arquivo das temporadas anteriores.",
      };
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // O idioma do documento tem de acompanhar o conteúdo: leitores de tela usam isso para
  // escolher a pronúncia e os buscadores para saber a quem servir a página.
  const locale = await getLocale();

  return (
    <html lang={htmlLang(locale)} suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${display.variable} ${body.variable}`}
      >
        <SiteFrame>{children}</SiteFrame>
      </body>
    </html>
  );
}
