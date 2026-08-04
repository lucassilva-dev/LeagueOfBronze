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
        title: "League of Bronze · 3rd Edition",
        description:
          "League of Bronze 3rd Edition — amateur League of Legends tournament. Teams, players, schedule, standings and statistics.",
      }
    : {
        title: "League of Bronze · 3ª Edição",
        description:
          "League of Bronze, 3ª Edição — campeonato amador de League of Legends. Times, jogadores, calendário, tabela e estatísticas.",
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
