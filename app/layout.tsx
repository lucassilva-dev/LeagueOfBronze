import type { Metadata } from "next";
import { Orbitron, Rajdhani } from "next/font/google";

import { SiteFrame } from "@/components/site-frame";

import "./globals.css";

const display = Orbitron({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["600", "700", "800"],
});

const body = Rajdhani({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "League of Bronze",
  description: "Acompanhamento de campeonato amador de League of Legends (MD3)",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body suppressHydrationWarning className={`${display.variable} ${body.variable}`}>
        <SiteFrame>{children}</SiteFrame>
      </body>
    </html>
  );
}
