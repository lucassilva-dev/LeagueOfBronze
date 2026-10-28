import type { TemaDoTime } from "@/lib/temas/tipos";

/**
 * SO ADC BRONZE CLUBE — «A Mosca Intacta».
 *
 * BASE: esqueleto com a cor, as fontes e o cenário finais (paleta provisória). O tema de verdade
 * chega com a implementação (o spec do designer + os ajustes do juiz).
 */
export const TEMA_SO_ADC_BRONZE_CLUBE: TemaDoTime = {
  slug: "so-adc-bronze-clube",
  fontes: { titulo: "alfa-slab-one", assinatura: "yellowtail" },
  cores: {
    breu: "#0A0807",
    ceu: "#14100C",
    abismo: "#1C1610",
    royal: "#2A2118",
    primaria: "#FF6A55",
    neon: "#FF6A55",
    arco: "#F6E7CF",
    nucleo: "#FFFFFF",
    texto: "#FFF8EC",
    prata: "#E9E2D2",
    apoio: "#B8AE9C",
    acento: "#FF6A55",
    tinta: "#1A120A",
    icone: "#FF6A55",
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
  sufixo: "BRONZE CLUBE",
  letraPorLetra: true,
  cor: "#FF6A55",
  cenario: "estande",
  fotos: { focoPadrao: "50% 30%" },
};
