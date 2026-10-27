import type { TemaDoTime } from "@/lib/temas/tipos";

/**
 * GALÁCTICOS DO BAR — «O Bar da Resenha» (26/10/2026).
 *
 * Do escudo: o pato de chapéu coroado e óculos azuis com o caneco de chope, a camisa listrada
 * preta e azul, a prateleira de garrafas azuladas, a lousa «FUTEBOL + AMIGOS + CERVEJA =
 * FELICIDADE», o neon «AQUI É SÓ RESENHA», GALÁCTICOS em pincelada dourada e DO BAR em azul.
 * A página é a noite de jogo dentro do boteco do time: o escudo entra num brinde, o nome enche
 * de chope, a escalação está na lousa tática e o capitão é o dono do caneco. O ouro aqui é
 * líquido (chope), não metal; o azul é neon e camisa, nunca raio.
 */
export const TEMA_GALACTICOS_DO_BAR: TemaDoTime = {
  slug: "galacticos-do-bar",
  fontes: { titulo: "knewave", assinatura: "kalam" },
  cores: {
    breu: "#07080F",
    ceu: "#0B1024",
    abismo: "#0A1236",
    royal: "#1440C8",
    primaria: "#F5A524",
    neon: "#3D8BFF",
    arco: "#A9D4FF",
    nucleo: "#F2FAFF",
    texto: "#FFF8EC",
    prata: "#E9E2D2",
    apoio: "#A9B2CC",
    acento: "#FFD45E",
    tinta: "#0B1430",
    icone: "#9CCBFF",
  },
  // O "metal" é o chope: âmbar escuro no fundo, ouro, colarinho creme (sem a quebra de bisel).
  metal: {
    luz: "#FFF4D6",
    alto: "#FFD962",
    meio: "#F29A12",
    sombra: "#7A3A02",
    fundo: "#C46A06",
    volta: "#FFC23D",
    base: "#B35A04",
    placa: "#F0A93A",
  },
  sufixo: "DO BAR",
  letraPorLetra: true,
  // O lavanda do tubo de neon aceso: o #45a8d8 da GÉLIDA ficava a ΔE 8,9 da RX; o dourado,
  // a ΔE 12 da ÁUREA. Este fica a ≥ 16,6 de todos os outros sete (11,2:1 no fundo do site).
  cor: "#B4C2FF",
  cenario: "boteco",
  textos: {
    lema: "temaGalacticosLema",
    estrelando: "temaGalacticosEscalacao",
    aviso: "temaGalacticosAviso",
    capitao: "temaGalacticosCapitao",
    emCartaz: "temaGalacticosAoVivo",
    destino: "temaGalacticosPedido",
    carimbo: "temaGalacticosFiado",
    fecho: "temaGalacticosFecho",
    companheiros: "temaGalacticosMesa",
  },
  // Avatares redondos com fundo transparente: o círculo inteiro, sem enquadramento por jogador.
  fotos: { focoPadrao: "50% 50%", formato: "medalhao" },
};
