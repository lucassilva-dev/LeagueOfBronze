import { Bungee, Exo_2, Permanent_Marker, Special_Elite } from "next/font/google";

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

export const FONTES_DOS_TEMAS: Readonly<Record<ChaveDeFonte, { variable: string }>> = {
  "exo2-italico": exo2Italico,
  "permanent-marker": permanentMarker,
  bungee,
  "special-elite": specialElite,
};
