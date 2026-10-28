import type { TemaDoTime } from "@/lib/temas/tipos";

/**
 * SO ADC BRONZE CLUBE — «A Mosca Intacta» (28/10/2026).
 *
 * Do escudo: o brasão redondo marinho e bronze com a faixa «So ADC Bronze Clube» (sem acento, como
 * eles escreveram), o arco com a flecha para cima e as duas flechas cruzadas, a estrela no hexágono,
 * os louros, «EST. 2024», «MMR: ???» e a plaquinha «3 ADCs IMPROVISADOS • QUERENDO VENCER». A piada
 * do time: três se inscreveram como ADC (atirador) e dois tiveram de improvisar (bobbie goods no TOP,
 * PRESUNTO no MID). A página é o fim de tarde no estande de arco e flecha do clube: o escudo é a mosca
 * do alvo, as flechas acertam tudo menos ela — e a única mosca acertada é a do alvo da raia do lado.
 * O ouro aqui é BRONZE de clube (placa, louros) e o vermelho é o do alvo e das penas.
 */
export const TEMA_SO_ADC_BRONZE_CLUBE: TemaDoTime = {
  slug: "so-adc-bronze-clube",
  fontes: { titulo: "alfa-slab-one", assinatura: "yellowtail" },
  cores: {
    breu: "#070B14",
    ceu: "#122039",
    abismo: "#0E1626",
    royal: "#2B4C7E",
    primaria: "#E2734A",
    // O coral DA CENA (penas, anel vermelho, «So», fita): tom de cenário, não a cor do time.
    neon: "#FF6B7A",
    arco: "#FFD3A8",
    nucleo: "#FFF4E0",
    texto: "#F7EEDC",
    prata: "#E3D6BE",
    apoio: "#B8C2D4",
    acento: "#FFB37A",
    tinta: "#10131A",
    icone: "#FFC9A0",
  },
  // O "metal" é o bronze do escudo e da placa (sem a quebra de bisel: aqui ninguém é cromo).
  metal: {
    luz: "#FFE9C9",
    alto: "#F2C38B",
    meio: "#C98642",
    sombra: "#5A2E12",
    fundo: "#8E5426",
    volta: "#E0A866",
    base: "#9C5F2C",
    placa: "#E9B57A",
  },
  sufixo: "BRONZE CLUBE",
  letraPorLetra: true,
  // A cor do time no resto do site (tabela, calendário, listas): o coral-vermelho do alvo, a ΔE 11,1
  // do vermelho da rota ADC (#E85C6A) e a 24,5 do Fãs de Rosca, o vizinho mais perto; 7,0:1 no fundo
  // do site. O coral da cena (`neon`) fica #FF6B7A: este cairia a ΔE 7,7 do cobre do contraluz.
  cor: "#FF6A55",
  cenario: "estande",
  textos: {
    lema: "temaSoAdcLema",
    estrelando: "temaSoAdcAljava",
    aviso: "temaSoAdcAviso",
    capitao: "temaSoAdcCapitao",
    emCartaz: "temaSoAdcEstande",
    destino: "temaSoAdcFundacao",
    carimbo: "temaSoAdcMmr",
    fecho: "temaSoAdcFecho",
    companheiros: "temaSoAdcFlechas",
  },
  fotos: {
    focoPadrao: "50% 30%",
    foco: {
      // Deitada (4:3): as duas pessoas da foto na janela 4:5 da carta, sem cortar ninguém.
      "bobbie-goods": "52% 50%",
      presunto: "50% 45%", // o cachorrinho e o sorriso
      weslay: "35% 15%", // o rosto e o terno vermelho
      cacu: "50% 18%", // a touca de cetim, os óculos e o biquinho
      "famoso-parrudao": "50% 62%", // a touca de natação e a barba, sob o guarda-sol
    },
    // A ficha mostra a foto deitada inteira.
    proporcao: { "bobbie-goods": "4 / 3" },
  },
};
