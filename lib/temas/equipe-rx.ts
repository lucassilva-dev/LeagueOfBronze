import type { TemaDoTime } from "@/lib/temas/tipos";

/**
 * EQUIPE RX — «A Coroa Elétrica» (26/10/2026).
 *
 * Do escudo: aro de neon azul elétrico sobre o preto, "RX" em cromo inclinado, a coroa
 * prateada, lascas azuis dos lados e "EQUIPE" em pincelada branca. A página é uma estreia de
 * cinema numa tempestade elétrica: um raio acerta a coroa gigante, o escudo bate no chão
 * espelhado e o elenco entra como créditos. Sem ouro nem bronze — só cromo e azul.
 */
export const TEMA_EQUIPE_RX: TemaDoTime = {
  slug: "equipe-rx",
  fontes: { titulo: "exo2-italico", assinatura: "permanent-marker" },
  cores: {
    breu: "#03050B",
    ceu: "#07102A",
    abismo: "#0B1F5C",
    royal: "#1B3FA6",
    primaria: "#1F6BFF",
    neon: "#4DA3FF",
    arco: "#B9E6FF",
    nucleo: "#EAF6FF",
    texto: "#F4F7FB",
    prata: "#C7D0DB",
    apoio: "#9AA7BA",
    acento: "#6FB4FF",
    tinta: "#0A0F1A",
  },
  prefixo: "EQUIPE",
  // O azul do neon do escudo (o id `carmesim` dava o vermelho #d9455f do nome do draft).
  cor: "#4DA3FF",
  cenario: "tempestade",
  fotos: { focoPadrao: "50% 32%", foco: { ironclaw: "42% 28%" } },
};
