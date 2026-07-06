import type { Metadata } from "next";
import { Anton, Space_Grotesk, Sora } from "next/font/google";

import { SiteFrame } from "@/components/site-frame";

import "./globals.css";

const display = Anton({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
});

const heading = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-heading",
});

const body = Sora({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "League of Bronze",
  description: "Acompanhamento de campeonato amador de League of Legends com séries MD3 e MD5",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${display.variable} ${heading.variable} ${body.variable}`}
      >
        <SiteFrame>{children}</SiteFrame>
      </body>
    </html>
  );
}
