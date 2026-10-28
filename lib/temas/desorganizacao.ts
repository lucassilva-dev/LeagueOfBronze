import type { TemaDoTime } from "@/lib/temas/tipos";

/**
 * DESORGANIZAÇÃO — «O Circo da Desorganização».
 *
 * BASE: esqueleto com a cor, as fontes e o cenário finais (paleta provisória). O tema de verdade
 * chega com a implementação (o spec do designer + os ajustes do juiz).
 */
export const TEMA_DESORGANIZACAO: TemaDoTime = {
  slug: "desorganizacao",
  fontes: { titulo: "smokum", assinatura: "playfair-italico" },
  cores: {
    breu: "#0A0807",
    ceu: "#14100C",
    abismo: "#1C1610",
    royal: "#2A2118",
    primaria: "#FFE14D",
    neon: "#FFE14D",
    arco: "#F6E7CF",
    nucleo: "#FFFFFF",
    texto: "#FFF8EC",
    prata: "#E9E2D2",
    apoio: "#B8AE9C",
    acento: "#FFE14D",
    tinta: "#1A120A",
    icone: "#FFE14D",
  },
  metal: {
    luz: "#FFF6E0",
    alto: "#F6D79A",
    meio: "#D9A54E",
    sombra: "#6B4515",
    fundo: "#A8742C",
    volta: "#F0C878",
    base: "#8C5E22",
    placa: "#E8B878",
  },
  letraPorLetra: true,
  cor: "#FFE14D",
  cenario: "picadeiro",
  fotos: { focoPadrao: "50% 30%" },
};
