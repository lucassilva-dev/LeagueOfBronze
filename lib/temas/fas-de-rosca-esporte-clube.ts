import type { TemaDoTime } from "@/lib/temas/tipos";

/**
 * FÃS DE ROSCA ESPORTE CLUBE — «Dia de Braço».
 *
 * BASE: esqueleto com a cor, as fontes e o cenário finais (paleta provisória). O tema de verdade
 * chega com a implementação (o spec do designer + os ajustes do juiz).
 */
export const TEMA_FAS_DE_ROSCA: TemaDoTime = {
  slug: "fas-de-rosca-esporte-clube",
  fontes: { titulo: "sofia-extra-condensada", assinatura: "kaushan" },
  cores: {
    breu: "#0A0807",
    ceu: "#14100C",
    abismo: "#1C1610",
    royal: "#2A2118",
    primaria: "#FFA3C8",
    neon: "#FFA3C8",
    arco: "#F6E7CF",
    nucleo: "#FFFFFF",
    texto: "#FFF8EC",
    prata: "#E9E2D2",
    apoio: "#B8AE9C",
    acento: "#FFA3C8",
    tinta: "#1A120A",
    icone: "#FFA3C8",
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
  sufixo: "ESPORTE CLUBE",
  letraPorLetra: true,
  cor: "#FFA3C8",
  cenario: "academia",
  fotos: { focoPadrao: "50% 30%" },
};
