import type { ChaveDeFonte } from "@/lib/temas/tipos";

/**
 * A LARGURA MEDIDA das fontes de título dos temas, para o título e o nick caberem na coluna
 * pelo texto de verdade — e não por um fator "de tabela" (o da Queijo Minas errou ~5%).
 *
 * Avanço de cada caractere em `em`, medido no Chromium com canvas `measureText` a 100 px, com o
 * mesmo woff2 que o next/font baixa (26/10/2026). A fonte não tem kerning: a soma das letras dá
 * exatamente a largura da palavra (GALÁCTICOS = 5,440 em pelos dois caminhos).
 *
 * Só fontes medidas entram aqui. Exo 2 (RX) e Bungee (QM) ficam de fora DE PROPÓSITO: sem a
 * métrica, a página não ganha `--largura-em` e o CSS delas segue igual, pixel por pixel.
 */
export type MetricasDaFonte = Readonly<{
  /** Avanço por caractere MAIÚSCULO, em em. */
  avancos: Readonly<Record<string, number>>;
  /**
   * Caractere fora da tabela conta como o mais largo MEDIDO da fonte (na Knewave, o ㅤ e o CJK
   * dos nicks de LoL: 1,0 em; % 0,976; ® 0,973): nunca estoura, no máximo sobra.
   */
  padrao: number;
  /** O `letter-spacing` do título e do nick nos temas desta fonte, em em (vale por letra). */
  espacamento: number;
  /**
   * A tinta além dos avanços: o pincel passa da caixa (até 0,13 em à direita no W e 0,06 em à
   * esquerda no A), mais o contorno de 0,1 em do eco (0,05 de cada lado) e uma folga.
   */
  sobra: number;
}>;

const KNEWAVE: MetricasDaFonte = {
  avancos: {
    A: 0.564, B: 0.585, C: 0.573, D: 0.594, E: 0.524, F: 0.424, G: 0.639, H: 0.588, I: 0.367,
    J: 0.561, K: 0.579, L: 0.467, M: 0.691, N: 0.63, O: 0.639, P: 0.606, Q: 0.724, R: 0.582,
    S: 0.552, T: 0.502, U: 0.685, V: 0.515, W: 0.773, X: 0.6, Y: 0.491, Z: 0.561,
    Á: 0.564, À: 0.564, Â: 0.564, Ã: 0.564, Ä: 0.564, É: 0.524, È: 0.524, Ê: 0.524, Ë: 0.524,
    Í: 0.339, Ì: 0.339, Î: 0.339, Ï: 0.339, Ó: 0.639, Ò: 0.639, Ô: 0.639, Õ: 0.639, Ö: 0.639,
    Ú: 0.639, Ù: 0.639, Û: 0.639, Ü: 0.639, Ç: 0.573, Ñ: 0.63,
    0: 0.6, 1: 0.4, 2: 0.545, 3: 0.597, 4: 0.588, 5: 0.603, 6: 0.582, 7: 0.548, 8: 0.658, 9: 0.603,
    " ": 0.312, ".": 0.235, ",": 0.288, "-": 0.588, _: 0.833, "'": 0.25, "!": 0.37, "?": 0.57,
    "&": 0.712, "+": 0.497, "·": 0.235, "#": 0.833, "@": 0.815, "(": 0.342, ")": 0.427, "/": 0.567,
    ":": 0.339, "%": 0.976, "©": 0.867, "®": 0.973, Æ: 0.845, Œ: 0.961, Þ: 0.833, Ø: 0.639,
  },
  padrao: 1,
  espacamento: 0.01,
  sobra: 0.32,
};

// Os temas da 4ª Edição: cada implementador troca o `undefined` do seu bloco pela métrica MEDIDA.
// ↓ Fãs de Rosca
/** Sofia Sans Extra Condensed 900 itálico (Fãs de Rosca). */
const SOFIA_EXTRA_CONDENSADA: MetricasDaFonte | undefined = undefined;
// ↑ Fãs de Rosca

// ↓ Os 5 Furiosos
/** Lilita One (Os 5 Furiosos). */
const LILITA_ONE: MetricasDaFonte | undefined = undefined;
// ↑ Os 5 Furiosos

// ↓ So ADC Bronze Clube
/** Alfa Slab One (So ADC Bronze Clube). */
const ALFA_SLAB_ONE: MetricasDaFonte | undefined = undefined;
// ↑ So ADC Bronze Clube

// ↓ Os 5 Sem Ping
/** Unbounded (Os 5 Sem Ping). */
const UNBOUNDED: MetricasDaFonte | undefined = undefined;
// ↑ Os 5 Sem Ping

// ↓ Desorganização
/** Smokum (Desorganização). */
const SMOKUM: MetricasDaFonte | undefined = undefined;
// ↑ Desorganização

/** As métricas pela fonte do título do tema (`tema.fontes.titulo`). */
export const METRICAS: Readonly<Partial<Record<ChaveDeFonte, MetricasDaFonte>>> = {
  knewave: KNEWAVE,
  "sofia-extra-condensada": SOFIA_EXTRA_CONDENSADA,
  "lilita-one": LILITA_ONE,
  "alfa-slab-one": ALFA_SLAB_ONE,
  unbounded: UNBOUNDED,
  smokum: SMOKUM,
};

/** Três casas (o erro de arredondar, < 0,0005 em, some dentro da sobra). */
const arredonda = (n: number) => Math.round(n * 1000) / 1000;

/** Como o CSS mostra: maiúsculas (text-transform), com os acentos compostos (NFC). */
function letras(texto: string): string[] {
  return [...texto.normalize("NFC").toLocaleUpperCase("pt-BR")];
}

/** A largura de UMA linha com este texto, em em, com o espaçamento e a sobra da tinta. */
export function larguraEm(texto: string, m: MetricasDaFonte): number {
  const cs = letras(texto.trim());
  if (cs.length === 0) return 0;
  const soma = cs.reduce((total, c) => total + (m.avancos[c] ?? m.padrao), 0);
  return arredonda(soma + cs.length * m.espacamento + m.sobra);
}

/** A palavra mais larga do texto, em em (o título e as cartas só quebram ENTRE palavras). */
export function maiorPalavraEm(texto: string, m: MetricasDaFonte): number {
  return Math.max(0, ...texto.split(/\s+/).filter(Boolean).map((p) => larguraEm(p, m)));
}

/** Quanto a linha de uma vez pode encolher antes de valer quebrar em duas (tamanho 1 ≥ 62% do de 2). */
const UMA_LINHA_VENCE = 0.62;

/**
 * A largura (em em) que o nick da ficha precisa para caber em ATÉ DUAS linhas, quebrando só
 * entre palavras, no maior tamanho possível. "SOU ADC NÃO DEUS" → "SOU ADC / NÃO DEUS" (4,9 em);
 * "IRANILDO GARI" e "SR HADES" ficam numa linha (a de duas só daria um nick ~1,5× maior).
 * A página faz `font-size: 100cqi / largura`: a quebra gulosa do navegador nunca passa de duas
 * linhas com essa largura (a 1ª linha leva ao menos as palavras da quebra ótima).
 */
export function larguraDoNickEm(texto: string, m: MetricasDaFonte): number {
  const palavras = texto.trim().split(/\s+/).filter(Boolean);
  const umaLinha = larguraEm(palavras.join(" "), m);
  if (palavras.length < 2) return umaLinha;
  let duasLinhas = umaLinha;
  for (let k = 1; k < palavras.length; k++) {
    const a = larguraEm(palavras.slice(0, k).join(" "), m);
    const b = larguraEm(palavras.slice(k).join(" "), m);
    duasLinhas = Math.min(duasLinhas, Math.max(a, b));
  }
  return duasLinhas / umaLinha >= UMA_LINHA_VENCE ? umaLinha : duasLinhas;
}
