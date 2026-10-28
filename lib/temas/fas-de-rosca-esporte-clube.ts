import type { TemaDoTime } from "@/lib/temas/tipos";

/**
 * FÃS DE ROSCA ESPORTE CLUBE — «Dia de Braço» (27/10/2026).
 *
 * Do escudo: o braço suado fazendo ROSCA DIRETA numa barra cujas anilhas são ROSCAS (rosquinhas
 * com granulado) — o trocadilho é o time —, «FÃS DE / ROSCA» em amarelo com contorno preto, a
 * faixa ESPORTE CLUBE, o halter do «FUNDADO 2026» e os ramos de trigo (a farinha da rosca).
 * Das fotos: a pose de bíceps no vestiário e a selfie no espelho da academia.
 * A página é a academia do time às 6h: o escudo faz a rosca direta, o nome é massa de rosquinha
 * com glacê de morango e granulado (e, no computador, fica dos dois lados do escudo, como no
 * escudo), o elenco são crachás de sócio no gancho, o capitão é o PERSONAL do halter de ouro, a
 * cartela é o saco de pão do pós-treino e a ficha é a selfie no espelho.
 * O amarelo do escudo fica na fita métrica e no halter; o rosa do glacê é a cor do time (o
 * amarelo ficava a ΔE < 15 da ÁUREA e do dourado da DESORGANIZAÇÃO).
 */
export const TEMA_FAS_DE_ROSCA: TemaDoTime = {
  slug: "fas-de-rosca-esporte-clube",
  fontes: { titulo: "sofia-extra-condensada", assinatura: "kaushan" },
  cores: {
    breu: "#120E11",
    ceu: "#1E181C",
    abismo: "#2A1420",
    royal: "#8E2E5E",
    primaria: "#FF8EC3",
    neon: "#FF5EA8",
    arco: "#FFD23F",
    nucleo: "#FFF6FA",
    texto: "#FFF4EC",
    prata: "#EADBE3",
    apoio: "#BCA9B5",
    acento: "#FF9FCB",
    tinta: "#2B1408",
    icone: "#FFB8D9",
  },
  // O "metal" é a rosquinha: glacê de morango em cima (luz, alto, meio, sombra) e massa frita
  // embaixo (fundo, volta, base). `placa` é o rosa claro das placas e chips de pontos.
  metal: {
    luz: "#FFF0F7",
    alto: "#FFB3D6",
    meio: "#F577B1",
    sombra: "#A3366C",
    fundo: "#E6A04F",
    volta: "#FFD79A",
    base: "#B2692E",
    placa: "#FFC4DF",
  },
  sufixo: "ESPORTE CLUBE",
  letraPorLetra: true,
  // O rosa do glacê: ΔE2000 ≥ 26 de todas as outras sete cores de hoje (10,5:1 no fundo do site).
  cor: "#FFA3C8",
  cenario: "academia",
  textos: {
    lema: "temaRoscaLema",
    estrelando: "temaRoscaSocios",
    aviso: "temaRoscaAviso",
    capitao: "temaRoscaCapitao",
    emCartaz: "temaRoscaQuentinho",
    destino: "temaRoscaPedido",
    carimbo: "temaRoscaTaPago",
    fecho: "temaRoscaFecho",
    companheiros: "temaRoscaParceiros",
  },
  // Selfies de celular (retrato que preenche a moldura, sem medalhão). Enquadramento conferido em
  // 4:5 (carta e ficha), 1:1 (companheiros) e 3:2 em cada foto.
  fotos: {
    focoPadrao: "50% 28%",
    foco: {
      "tapa-de-doido": "58% 22%",
      "vidotti-agiota": "48% 36%",
      d1elzera: "47% 40%",
      omegafuria: "50% 26%",
      saborenergetico: "47% 12%",
    },
  },
};
