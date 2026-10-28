import type { TemaDoTime } from "@/lib/temas/tipos";

/**
 * OS 5 FURIOSOS — «A Figurinha Brilhante».
 *
 * BASE: esqueleto com a cor, as fontes e o cenário finais (paleta provisória). O tema de verdade
 * chega com a implementação (o spec do designer + os ajustes do juiz).
 */
export const TEMA_OS_5_FURIOSOS: TemaDoTime = {
  slug: "os-5-furiosos",
  fontes: { titulo: "lilita-one", assinatura: "baloo-2" },
  cores: {
    breu: "#0A0807",
    ceu: "#14100C",
    abismo: "#1C1610",
    royal: "#2A2118",
    primaria: "#E27CFE",
    neon: "#E27CFE",
    arco: "#F6E7CF",
    nucleo: "#FFFFFF",
    texto: "#FFF8EC",
    prata: "#E9E2D2",
    apoio: "#B8AE9C",
    acento: "#E27CFE",
    tinta: "#1A120A",
    icone: "#E27CFE",
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
  prefixo: "OS 5",
  letraPorLetra: true,
  cor: "#E27CFE",
  cenario: "album",
  fotos: { focoPadrao: "50% 30%" },
};
