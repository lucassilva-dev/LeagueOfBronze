import { Bungee, Exo_2, Kalam, Knewave, Permanent_Marker, Special_Elite } from "next/font/google";

import type { ChaveDeFonte } from "@/lib/temas/tipos";

/*
 * As fontes das páginas temáticas dos times (lib/temas). Só next/font: a CSP é font-src 'self',
 * e o next/font baixa no build e serve do próprio site.
 *
 * preload: false — todas as páginas de time são a mesma rota; sem isso, a fonte de TODO tema
 * seria pré-carregada em todo time. display: swap — o título nunca some esperando a fonte.
 * Todo tema usa as mesmas variáveis (--tm-fonte-titulo, --tm-fonte-assinatura): a classe
 * `.variable` aplicada na raiz é que decide a família.
 */
const exo2Italico = Exo_2({
  subsets: ["latin"],
  style: ["italic"],
  variable: "--tm-fonte-titulo",
  display: "swap",
  preload: false,
});

const permanentMarker = Permanent_Marker({
  subsets: ["latin"],
  weight: "400",
  variable: "--tm-fonte-assinatura",
  display: "swap",
  preload: false,
});

// Queijo Minas: letreiro de bloco (o "QUEIJO" do escudo) e máquina de escrever (o bilhete).
const bungee = Bungee({
  subsets: ["latin"],
  weight: "400",
  variable: "--tm-fonte-titulo",
  display: "swap",
  preload: false,
});

const specialElite = Special_Elite({
  subsets: ["latin"],
  weight: "400",
  variable: "--tm-fonte-assinatura",
  display: "swap",
  preload: false,
});

// Galácticos do Bar: a pincelada do GALÁCTICOS do escudo e o giz da lousa do boteco.
// A reserva é uma Arial ENCOLHIDA (@font-face em cenarios/boteco.module.css): a padrão do next/font
// é mais larga que a Knewave e cortava o título enquanto ela carregava.
const knewave = Knewave({
  subsets: ["latin"],
  weight: "400",
  variable: "--tm-fonte-titulo",
  display: "swap",
  preload: false,
  adjustFontFallback: false,
  fallback: ["Knewave Caixa Alta"],
});

const kalam = Kalam({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--tm-fonte-assinatura",
  display: "swap",
  preload: false,
});

export const FONTES_DOS_TEMAS: Readonly<Record<ChaveDeFonte, { variable: string }>> = {
  "exo2-italico": exo2Italico,
  "permanent-marker": permanentMarker,
  bungee,
  "special-elite": specialElite,
  knewave,
  kalam,
};
