// ============================================================
// app/layout.tsx — troca das fontes (remove Orbitron/Rajdhani)
// ============================================================
import { Anton, Space_Grotesk, Sora } from "next/font/google";

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

// No <body>:
//   <body className={`${display.variable} ${heading.variable} ${body.variable}`}>
//
// Uso:
//   font-display  -> Anton         (placar 3–1, número grande, "BRONZE" no hero)
//   font-heading  -> Space Grotesk (títulos de página, rótulos UPPERCASE, nomes de time)
//   font-body     -> Sora          (parágrafos, botões, texto de interface)
