import {
  Alfa_Slab_One,
  Baloo_2,
  Bungee,
  Exo_2,
  Kalam,
  Kaushan_Script,
  Knewave,
  Lilita_One,
  Permanent_Marker,
  Playfair_Display,
  Smokum,
  Sofia_Sans_Extra_Condensed,
  Sora,
  Special_Elite,
  Unbounded,
  Yellowtail,
} from "next/font/google";

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

// ---------- os temas da 4ª Edição (28/10/2026) ----------
// As reservas (`fallback`) são @font-face locais MAIS ESTREITAS que a fonte, declaradas no módulo CSS
// do cenário de cada time (como o «Knewave Caixa Alta» em cenarios/boteco.module.css): o título nunca
// sai cortado enquanto a fonte chega.

// Fãs de Rosca (cenarios/academia): a condensada preta itálica do panfleto de academia e o pincel do
// "esporte clube". Duas reservas: Impact encolhida onde houver e Arial encolhida no resto.
const sofiaExtraCondensada = Sofia_Sans_Extra_Condensed({
  subsets: ["latin"],
  weight: "900",
  style: "italic",
  variable: "--tm-fonte-titulo",
  display: "swap",
  preload: false,
  adjustFontFallback: false,
  fallback: ["Rosca Reserva Impact", "Rosca Reserva"],
});

const kaushan = Kaushan_Script({
  subsets: ["latin"],
  weight: "400",
  variable: "--tm-fonte-assinatura",
  display: "swap",
  preload: false,
});

// Os 5 Furiosos (cenarios/album): o vinil recortado das figurinhas e o impresso do álbum (Baloo 2
// variável, um arquivo só para 500, 700 e 800).
const lilitaOne = Lilita_One({
  subsets: ["latin"],
  weight: "400",
  variable: "--tm-fonte-titulo",
  display: "swap",
  preload: false,
  adjustFontFallback: false,
  fallback: ["Lilita One Caixa Alta"],
});

const baloo2 = Baloo_2({
  subsets: ["latin"],
  variable: "--tm-fonte-assinatura",
  display: "swap",
  preload: false,
});

// So ADC Bronze Clube (cenarios/estande): o letreiro de clube (slab pesada) e o script do «So».
const alfaSlabOne = Alfa_Slab_One({
  subsets: ["latin"],
  weight: "400",
  variable: "--tm-fonte-titulo",
  display: "swap",
  preload: false,
  adjustFontFallback: false,
  fallback: ["Alfa Slab Caixa Alta"],
});

const yellowtail = Yellowtail({
  subsets: ["latin"],
  weight: "400",
  variable: "--tm-fonte-assinatura",
  display: "swap",
  preload: false,
});

// Os 5 Sem Ping (cenarios/chamada): a geométrica larga de interface no SEM PING e a Sora da chamada
// (as duas variáveis, um arquivo cada).
const unbounded = Unbounded({
  subsets: ["latin"],
  variable: "--tm-fonte-titulo",
  display: "swap",
  preload: false,
  adjustFontFallback: false,
  fallback: ["Sem Ping Reserva"],
});

const sora = Sora({
  subsets: ["latin"],
  variable: "--tm-fonte-assinatura",
  display: "swap",
  preload: false,
});

// Desorganização (cenarios/picadeiro): a letra de cartaz de madeira do circo e o itálico do mestre de
// picadeiro.
const smokum = Smokum({
  subsets: ["latin"],
  weight: "400",
  variable: "--tm-fonte-titulo",
  display: "swap",
  preload: false,
  adjustFontFallback: false,
  fallback: ["Smokum Reserva Estreita", "Smokum Reserva"],
});

const playfairItalico = Playfair_Display({
  subsets: ["latin"],
  style: ["italic"],
  weight: ["500", "700"],
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
  "sofia-extra-condensada": sofiaExtraCondensada,
  kaushan,
  "lilita-one": lilitaOne,
  "baloo-2": baloo2,
  "alfa-slab-one": alfaSlabOne,
  yellowtail,
  unbounded,
  sora,
  smokum,
  "playfair-italico": playfairItalico,
};
