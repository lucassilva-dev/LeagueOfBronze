import type { TemaDoTime } from "@/lib/temas/tipos";

/**
 * OS 5 FURIOSOS — «A Figurinha Brilhante» (28/10/2026).
 *
 * O "escudo" deles é um PÔSTER: a foto oficial do time, os cinco de camisa azul com o «5F» no peito
 * num palco de campeonato, e a plaquinha «Tem um gosto meio roxo!» da Lulu do capitão. As cinco fotos
 * são artes de skin. A página é a página do time no álbum de figurinhas do campeonato: o pôster é a
 * figurinha BRILHANTE (aro holográfico), cada jogador é uma figurinha «5F n», o nome é colado no tapa
 * (bafo) e o capitão é a brilhante. Fecha no pacotinho «nas bancas». O roxo é o da plaquinha; o lima,
 * o do adesivo. Nada de futebol na tela: só a cultura do álbum.
 */
export const TEMA_OS_5_FURIOSOS: TemaDoTime = {
  slug: "os-5-furiosos",
  fontes: { titulo: "lilita-one", assinatura: "baloo-2" },
  cores: {
    breu: "#12081F",
    ceu: "#1E0D3A",
    abismo: "#2A1260",
    royal: "#5B2BD6",
    primaria: "#9B5CFF",
    neon: "#C77DFF",
    arco: "#E2C6FF",
    nucleo: "#FFFFFF",
    texto: "#FFF8EE",
    prata: "#E9DEFF",
    apoio: "#BBA9E0",
    acento: "#C8F54A",
    tinta: "#1B0B3A",
    icone: "#D7B8FF",
  },
  // O "metal" é o vinil roxo do adesivo. O rosto das letras nunca começa mais claro que o `meio`.
  metal: {
    luz: "#F7EEFF",
    alto: "#DDBDFF",
    meio: "#A56BFF",
    sombra: "#4A1A9E",
    fundo: "#7A3AEA",
    volta: "#C79CFF",
    base: "#5B22C2",
    placa: "#E6D2FF",
  },
  prefixo: "OS 5",
  letraPorLetra: true,
  // O roxo-orquídea da plaquinha acesa, puxado para o magenta (o ajuste do juiz): ΔE2000 ≥ 18,7 de todos
  // os outros sete (o mais perto é o rosa da Fãs de Rosca; o lavanda dos Galácticos fica a 23,0) e 8,0:1
  // no fundo do site. O #D98BFF do projeto ficava a 7,8 do lilás da rota SUP (este fica a 10,3). Sem o
  // tema, o time sai com o #9a6ae0 da ARCANA. Só vale no resto do site: os roxos da página são os de cima.
  cor: "#E27CFE",
  cenario: "album",
  textos: {
    lema: "temaFuriososLema",
    estrelando: "temaFuriososFigurinhas",
    aviso: "temaFuriososAviso",
    capitao: "temaFuriososCapitao",
    emCartaz: "temaFuriososBancas",
    destino: "temaFuriososPacotinho",
    carimbo: "temaFuriososSabor",
    fecho: "temaFuriososFecho",
    companheiros: "temaFuriososCompleteOTime",
  },
  // Retratos (artes de skin), não avatares: o foco acerta o rosto na carta 5:7, na ficha 4:5 e no
  // quadrado do companheiro.
  fotos: {
    focoPadrao: "50% 25%",
    foco: {
      "bety-clarao": "55% 30%",
      "samuel-venancio": "50% 20%", // a cartola inteira
      satoshi: "50% 30%", // o Yasuo atrás e o rosto
      "gabriel-bontempo": "50% 8%", // «Eu não sou intrigante» no alto
      "peidei-caldinho": "50% 22%", // a plaquinha «Tem um gosto meio roxo!» inteira
    },
  },
};
