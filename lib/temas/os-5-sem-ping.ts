import type { TemaDoTime } from "@/lib/temas/tipos";

/**
 * OS 5 SEM PING — «A Call que Nunca Cai».
 *
 * BASE: esqueleto com a cor, as fontes e o cenário finais (paleta provisória). O tema de verdade
 * chega com a implementação (o spec do designer + os ajustes do juiz).
 */
export const TEMA_OS_5_SEM_PING: TemaDoTime = {
  slug: "os-5-sem-ping",
  fontes: { titulo: "unbounded", assinatura: "sora" },
  cores: {
    breu: "#0A0807",
    ceu: "#14100C",
    abismo: "#1C1610",
    royal: "#2A2118",
    primaria: "#3DFF8F",
    neon: "#3DFF8F",
    arco: "#F6E7CF",
    nucleo: "#FFFFFF",
    texto: "#FFF8EC",
    prata: "#E9E2D2",
    apoio: "#B8AE9C",
    acento: "#3DFF8F",
    tinta: "#1A120A",
    icone: "#3DFF8F",
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
  cor: "#3DFF8F",
  cenario: "chamada",
  fotos: { focoPadrao: "50% 30%" },
};
