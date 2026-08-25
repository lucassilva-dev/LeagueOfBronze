/**
 * OS TOKENS DO HANDOFF DE DESIGN DO DRAFT AO VIVO.
 *
 * Transcritos do `README.md` do pacote "design_handoff_draft_ao_vivo", que é
 * declarado **high-fidelity**: cor, tipografia, espaçamento e animação são finais.
 *
 * Ficam num módulo próprio, e não espalhados pelo componente, por dois motivos:
 *
 * 1. A transmissão NÃO usa o design system do site. Ela é uma tela de palco — fundo
 *    quase preto, painéis próprios, tipografia em caps — e foi especificada assim. Da
 *    primeira vez ela foi construída com `.lob-card` e as variáveis do site, e o
 *    resultado não tinha uma única cor do handoff. Com os tokens aqui, a distância
 *    entre o que foi especificado e o que está na tela é conferível num arquivo só.
 *
 * 2. Um teste consegue travar a paleta sem abrir o navegador.
 */

/** Cor de time por índice, fixa no handoff. A ordem importa: é a ordem dos times. */
export const CORES_DOS_TIMES = [
  "#ef7d34", // 1 CHAMA
  "#e0b13c", // 2 ÁUREA
  "#3fb27f", // 3 VERDANTE
  "#45a8d8", // 4 GÉLIDA
  "#9a6ae0", // 5 ARCANA
  "#d9455f", // 6 CARMESIM
] as const;

export const D = {
  /** Fundo do palco. */
  fundo: "#0a0705",
  textura:
    "repeating-linear-gradient(135deg, rgba(255,236,214,.016) 0 2px, transparent 2px 8px)",

  /** Painéis e superfícies, do mais claro ao mais escuro. */
  painel: "linear-gradient(150deg,#1a100b,#130c08)",
  painelColuna: "linear-gradient(160deg,#1a100b,#0f0a07)",
  superficie: "#150e0a",
  superficieVazia: "#0e0907",
  superficieEscura: "#0d0806",
  barraTopo: "linear-gradient(90deg,#150d09,#0d0806)",
  faixa: "#150d09",
  capitao: "#241608",

  /** Bordas — quanto mais interno, mais escuro. */
  borda: "#33201a",
  borda2: "#2a1a13",
  borda3: "#2c1b14",
  borda4: "#241610",
  bordaPool: "#2f1e16",
  bordaPoolFora: "#1d130e",
  bordaBotao: "#3a241a",

  /** Texto. */
  texto: "#e6dbd2",
  titulo: "#f7e7d2",
  tituloSuave: "#f3e6d9",
  secundario: "#a5948a",
  secundario2: "#8d7d72",
  mudo: "#7d6f66",
  mudo2: "#6f6157",
  vazio: "#4c433c",
  vazioPts: "#3a2f28",
  rotuloVazio: "#6b5c51",

  /** Rótulos e kickers. */
  kicker: "#87715f",
  kickerOuro: "#c99a5e",

  /** Dourado e urgência. */
  ouro: "#efa63f",
  ctaFundo: "linear-gradient(150deg,#f7bd5c,#d0731f)",
  ctaTexto: "#1c0e05",
  urgente: "#ff5b4d",
} as const;

/** A família de display do handoff. O site já carrega Chakra Petch. */
export const DISPLAY = "'Chakra Petch', sans-serif";

/**
 * Transparência por sufixo hexadecimal, como o handoff especifica
 * (borda `cor+'66'`, glow `cor+'26'`, tint de header `cor+'14'`, chip apagado `cor+'99'`).
 *
 * Só concatena quando a cor É um hexadecimal de 6 dígitos — uma cor vinda do banco pode
 * ser qualquer coisa, e `"red" + "66"` produziria uma cor inválida que o navegador
 * descarta em silêncio, deixando a borda invisível.
 */
export function alfa(cor: string, sufixo: string): string {
  return /^#[0-9a-f]{6}$/i.test(cor) ? `${cor}${sufixo}` : cor;
}

/** As 5 rotas do handoff, na ordem em que aparecem na coluna do time. */
export const ROTAS_DO_DRAFT = [
  { chave: "TOP", abrev: "TOP" },
  { chave: "JUNG", abrev: "JG" },
  { chave: "MID", abrev: "MID" },
  { chave: "ADC", abrev: "ADC" },
  { chave: "SUP", abrev: "SUP" },
] as const;

/** Emblema de elo: PNG local, servido de /public/elo. */
export function emblemaDeElo(slug: string, tamanho: number) {
  return {
    flex: "none",
    width: tamanho,
    height: tamanho,
    backgroundImage: `url(/elo/${slug}.png)`,
    backgroundSize: "contain",
    backgroundRepeat: "no-repeat",
    backgroundPosition: "center",
  } as const;
}
