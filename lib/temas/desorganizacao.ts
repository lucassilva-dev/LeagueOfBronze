import type { TemaDoTime } from "@/lib/temas/tipos";

/**
 * DESORGANIZAÇÃO — «O Circo da Desorganização» (28/10/2026).
 *
 * É o time DA ORGANIZAÇÃO do campeonato (o Lucas, dono do site, e o nak4y; montado por ela, fora
 * do draft): o nome é autoironia de quem organiza. Do escudo: a cabeça de leão preta, branca e
 * cinza de olhos de ouro, a coroa, o debrum de ouro em zigue-zague e DESORGANIZAÇÃO em pincel
 * branco rasgado, sobre uma bandeira preta. A página admite: isto aqui é um circo — e o circo é
 * nosso. O leão é a estrela que salta para o pedestal sob o canhão de luz; o nome se organiza
 * letra por letra, menos o DES (os palhaços, tortos para sempre); as fotos em "skin" viram os
 * cartazes das atrações e o capitão (nak4y, de venda nos olhos) é o mestre de picadeiro de
 * cartola. Ouro de folha, não de chope nem de queijo; o vinho é veludo de circo.
 */
export const TEMA_DESORGANIZACAO: TemaDoTime = {
  slug: "desorganizacao",
  fontes: { titulo: "smokum", assinatura: "playfair-italico" },
  cores: {
    breu: "#0B0706",
    ceu: "#170A0C",
    abismo: "#2A0710",
    royal: "#7E1830",
    primaria: "#E0B04A",
    neon: "#F2CF7A",
    arco: "#FFE3A3",
    nucleo: "#FFF7E3",
    texto: "#FFF4E0",
    prata: "#EADBC2",
    apoio: "#BFAE92",
    acento: "#F4C65A",
    tinta: "#1B0C08",
    icone: "#FFE3A3",
  },
  // Folha de ouro com bisel (a estrutura do cromo da RX, no tom do debrum do escudo).
  metal: {
    luz: "#FFF6D2",
    alto: "#F9DC8A",
    meio: "#DDA43A",
    sombra: "#6A420E",
    fundo: "#A8741F",
    volta: "#F5D47E",
    base: "#B07A22",
    placa: "#E8B957",
  },
  // Sem prefixo nem sufixo: o nome é UMA palavra. O "DES" à parte é desenho (as três primeiras
  // `.letra` no CSS do cenário), não divisão do nome.
  letraPorLetra: true,
  // O OURO do leão coroado (a família da página: frisos, folha de ouro do título). O rosa do
  // algodão-doce ficava a ΔE 5,2 do rosa dos Fãs de Rosca; este fica a ≥ 31,4 dos outros sete
  // (o mais perto: o verde dos Os 5 Sem Ping) e dá 15,1:1 no fundo do site.
  cor: "#FFE14D",
  cenario: "picadeiro",
  textos: {
    lema: "temaDesorgLema",
    estrelando: "temaDesorgAtracoes",
    aviso: "temaDesorgAviso",
    capitao: "temaDesorgCapitao",
    emCartaz: "temaDesorgSobALona",
    destino: "temaDesorgIngresso",
    carimbo: "temaDesorgTarja",
    fecho: "temaDesorgFecho",
    companheiros: "temaDesorgTrupe",
  },
  fotos: {
    focoPadrao: "50% 30%",
    foco: {
      onigami: "64% 54%", // o rosto à direita, no meio da foto (a academia fica atrás)
      nak4y: "48% 15%", // corpo inteiro: rosto, venda e punhos no terço de cima (e o banheiro aparece)
      "r-a-z-e-r-a-l": "55% 15%", // o rosto alto e o rabo de cavalo
      gaylord: "40% 46%", // o rosto baixo e à esquerda; os óculos na testa
      thalao: "52% 16%", // o rosto no alto, o lampião embaixo
    },
  },
};
