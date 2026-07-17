import type { Metadata } from "next";
import { Anton, Chakra_Petch } from "next/font/google";

import { SiteFrame } from "@/components/site-frame";

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

export const metadata: Metadata = {
  title: "Os Bronzes · 3ª Edição",
  description:
    "3ª Edição dos Bronzes — campeonato amador de League of Legends. Times, jogadores, calendário, tabela e estatísticas.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${display.variable} ${body.variable}`}
      >
        <SiteFrame>{children}</SiteFrame>
      </body>
    </html>
  );
}
