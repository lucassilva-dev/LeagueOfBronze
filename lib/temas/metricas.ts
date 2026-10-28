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
/**
 * Sofia Sans Extra Condensed 900 itálico (Fãs de Rosca), medida no Chromium em 27/10/2026 com o
 * woff2 do Google Fonts (canvas `measureText` a 100 px, `fontKerning = "none"`): o título e o
 * nick usam `font-kerning: none`, então a soma das letras é a palavra. A tinta: o itálico passa
 * até 0,15 em à direita (Ï; 0,083 em nas maiúsculas sem acento, Y) e 0,07 em à esquerda (J),
 * mais o contorno de 0,1 em do eco e uma folga. O I e o J são estreitíssimos (0,21 em).
 * O caractere de fora da tabela conta 1,0 em (o «ㅤ» dos nicks de LoL, o mais largo medido).
 */
const SOFIA_EXTRA_CONDENSADA: MetricasDaFonte = {
  avancos: {
    A: 0.454, B: 0.433, C: 0.459, D: 0.459, E: 0.387, F: 0.38, G: 0.464, H: 0.47, I: 0.21, J: 0.211,
    K: 0.453, L: 0.353, M: 0.57, N: 0.472, O: 0.462, P: 0.412, Q: 0.462, R: 0.443, S: 0.401, T: 0.396,
    U: 0.463, V: 0.454, W: 0.632, X: 0.437, Y: 0.437, Z: 0.396,
    Á: 0.454, À: 0.454, Â: 0.454, Ã: 0.454, Ä: 0.454, É: 0.387, È: 0.387, Ê: 0.387, Ë: 0.387,
    Í: 0.21, Ì: 0.21, Î: 0.21, Ï: 0.21, Ó: 0.462, Ò: 0.462, Ô: 0.462, Õ: 0.462, Ö: 0.462,
    Ú: 0.463, Ù: 0.463, Û: 0.463, Ü: 0.463, Ç: 0.459, Ñ: 0.472,
    0: 0.43, 1: 0.376, 2: 0.392, 3: 0.402, 4: 0.445, 5: 0.409, 6: 0.429, 7: 0.4, 8: 0.433, 9: 0.428,
    " ": 0.123, ".": 0.242, ",": 0.247, "-": 0.315, _: 0.37, "'": 0.183, "!": 0.229, "?": 0.373,
    "&": 0.464, "+": 0.42, "·": 0.252, "#": 0.451, "@": 0.65, "(": 0.213, ")": 0.213, "/": 0.324,
    ":": 0.232, "%": 0.727, "©": 0.509, "®": 0.372, Æ: 0.605, Œ: 0.623, Þ: 0.412, Ø: 0.462,
  },
  padrao: 1,
  espacamento: 0.02,
  sobra: 0.36,
};
// ↑ Fãs de Rosca

// ↓ Os 5 Furiosos
/**
 * Lilita One (Os 5 Furiosos), medida no Chromium a 1000 px com `fontKerning = "none"` (27/10/2026). A
 * fonte TEM kerning: o título e os nicks do tema desligam (`font-kerning: none`) e aí a soma das letras
 * é a palavra (FURIOSOS 4,573 em pelos dois caminhos). Espaçamento de 0,06 em (o recorte creme de uma
 * letra não encosta na tinta da vizinha). Sobra: o recorte (0,16 em de traço → 0,08 de cada lado), o giro
 * de até 4° das letras do título (~0,07 em) e folga.
 */
const LILITA_ONE: MetricasDaFonte = {
  avancos: {
    A: 0.655, B: 0.594, C: 0.561, D: 0.616, E: 0.493, F: 0.472, G: 0.621, H: 0.644, I: 0.429,
    J: 0.462, K: 0.62, L: 0.435, M: 0.907, N: 0.648, O: 0.696, P: 0.57, Q: 0.706, R: 0.59,
    S: 0.531, T: 0.502, U: 0.628, V: 0.661, W: 0.953, X: 0.683, Y: 0.615, Z: 0.563,
    Á: 0.655, À: 0.655, Â: 0.655, Ã: 0.655, Ä: 0.655, É: 0.488, È: 0.488, Ê: 0.488, Ë: 0.488,
    Í: 0.432, Ì: 0.432, Î: 0.432, Ï: 0.432, Ó: 0.696, Ò: 0.696, Ô: 0.696, Õ: 0.696, Ö: 0.696,
    Ú: 0.628, Ù: 0.628, Û: 0.628, Ü: 0.628, Ç: 0.546, Ñ: 0.657,
    0: 0.639, 1: 0.406, 2: 0.525, 3: 0.528, 4: 0.598, 5: 0.524, 6: 0.575, 7: 0.5, 8: 0.57, 9: 0.565,
    " ": 0.188, ".": 0.229, ",": 0.305, "-": 0.525, _: 0.636, "'": 0.301, "!": 0.287, "?": 0.584,
    "&": 0.667, "+": 0.602, "·": 0.309, "#": 0.833, "@": 0.867, "(": 0.43, ")": 0.422, "/": 0.573,
    ":": 0.277, "%": 0.798, "©": 0.693, "®": 0.701, Æ: 0.917, Œ: 0.877, Þ: 0.595, Ø: 0.696,
  },
  padrao: 1, // o mais largo medido é o W (0,953); CJK e o ㅤ dos nicks caem em outra fonte, ~1 em
  espacamento: 0.06,
  sobra: 0.3,
};
// ↑ Os 5 Furiosos

// ↓ So ADC Bronze Clube
/**
 * Alfa Slab One (So ADC Bronze Clube), medida em 27/10/2026 do mesmo jeito que a Knewave. ATENÇÃO: a
 * Alfa TEM kerning (PARRUDAO: 6,133 em com kerning, 6,327 sem). O tema desliga (`font-kerning: none`
 * no título, no nick da ficha, nos nicks das cartas e no nome da placa) e a soma das letras volta a
 * ser a largura da palavra (ADC = 0,806 + 0,804 + 0,722 = 2,332 em).
 */
const ALFA_SLAB_ONE: MetricasDaFonte = {
  avancos: {
    A: 0.806, B: 0.775, C: 0.722, D: 0.804, E: 0.713, F: 0.632, G: 0.782, H: 0.84, I: 0.42,
    J: 0.666, K: 0.835, L: 0.653, M: 1.143, N: 0.942, O: 0.792, P: 0.738, Q: 0.81, R: 0.8,
    S: 0.674, T: 0.78, U: 0.781, V: 0.786, W: 1.207, X: 0.8, Y: 0.776, Z: 0.689,
    Á: 0.806, À: 0.806, Â: 0.806, Ã: 0.806, Ä: 0.806, É: 0.713, È: 0.713, Ê: 0.713, Ë: 0.713,
    Í: 0.42, Ì: 0.42, Î: 0.42, Ï: 0.42, Ó: 0.792, Ò: 0.792, Ô: 0.792, Õ: 0.792, Ö: 0.792,
    Ú: 0.781, Ù: 0.781, Û: 0.781, Ü: 0.781, Ç: 0.722, Ñ: 0.942,
    "0": 0.732, "1": 0.522, "2": 0.649, "3": 0.623, "4": 0.694, "5": 0.651, "6": 0.693, "7": 0.648, "8": 0.7, "9": 0.693,
    " ": 0.3, ".": 0.244, ",": 0.245, "-": 0.389, "_": 0.6, "'": 0.193, "!": 0.339, "?": 0.63, "&": 0.828, "+": 0.576, "·": 0.204, "#": 0.732,
    "@": 1.148, "(": 0.374, ")": 0.374, "/": 0.423, ":": 0.244, "%": 0.885, "©": 0.726, "®": 0.726, Æ: 1.138, Œ: 1.107, Þ: 0.762, Ø: 0.792,
  },
  /** O W, o mais largo medido (o ㅤ e o CJK dos nicks contam como ele). */
  padrao: 1.207,
  espacamento: 0.01,
  /** A extrusão de cobre (0,088 em para a direita), o contorno (0,035 de cada lado) e a folga. */
  sobra: 0.22,
};
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
