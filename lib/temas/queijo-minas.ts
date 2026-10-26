import type { TemaDoTime } from "@/lib/temas/tipos";

/**
 * QUEIJO MINAS — «O Expresso da Lua de Queijo» (26/10/2026).
 *
 * Do escudo: o queijo dourado redondo como lua, a maria-fumaça dourada e marinho com o farol
 * ciano, os raios ciano das rodas, a fumaça ciano da chaminé e a faixa marinho com QUEIJO
 * grande e MINAS menor. A página é a chegada do trem numa estação da serra à noite; o elenco
 * é a composição, com o capitão (o maquinista) na locomotiva, na frente.
 */
export const TEMA_QUEIJO_MINAS: TemaDoTime = {
  slug: "queijo-minas",
  fontes: { titulo: "bungee", assinatura: "special-elite" },
  cores: {
    breu: "#0B0907",
    ceu: "#17121C",
    abismo: "#0A1A2E",
    royal: "#4A3410",
    primaria: "#E8A92A",
    neon: "#3EE6F2",
    arco: "#A8F6FF",
    nucleo: "#F2FEFF",
    texto: "#FFF6E2",
    prata: "#E9DBBB",
    apoio: "#B8A47E",
    acento: "#FFC94A",
    tinta: "#0A1A2E",
    icone: "#FFD772",
  },
  // Ouro com bisel: a mesma estrutura do cromo da RX.
  metal: {
    luz: "#FFF6CF",
    alto: "#FFD866",
    meio: "#F2B632",
    sombra: "#8A5410",
    fundo: "#C98A1C",
    volta: "#FFD25C",
    base: "#B07414",
    placa: "#E2A126",
  },
  sufixo: "MINAS",
  letraPorLetra: true,
  // O ciano do farol: distinto de todos os times na tabela (um amarelo colava na ÁUREA).
  cor: "#3EE6F2",
  cenario: "estacao",
  textos: {
    lema: "temaQueijoLema",
    estrelando: "temaQueijoBordo",
    aviso: "temaQueijoAviso",
    capitao: "temaQueijoCapitao",
    emCartaz: "temaQueijoViagem",
    destino: "temaQueijoDestino",
    carimbo: "temaQueijoCarimbo",
    fecho: "temaQueijoFecho",
    companheiros: "temaQueijoCompanheiros",
  },
  fotos: {
    focoPadrao: "50% 30%",
    foco: {
      midas: "90% 30%", // deitada 3:2: rosto e joinha na janela 4:5
      "aura-mais-ego-67": "50% 26%", // o chapéu inteiro e o rosto
      "lelei-de-ozorio": "50% 0%", // os olhos com o filtro, no alto da foto
      "lucrecia-pontius": "12% 50%", // quadrada, rosto à esquerda
      cachasa: "55% 40%", // o rosto no meio de uma foto muito alta
    },
    proporcao: { midas: "3 / 2" }, // a ficha mostra o meme inteiro
  },
};
