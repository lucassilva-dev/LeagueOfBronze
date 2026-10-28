import type { TemaDoTime } from "@/lib/temas/tipos";

/**
 * OS 5 SEM PING — «A Call que Nunca Cai» (28/10/2026).
 *
 * Do escudo: o poro de óculos escuros e língua de fora, o Wi-Fi de três arcos em cima, o contorno
 * azul-elétrico. Do nome: "sem ping" é zero de lag — e o avesso, 999 ms, "caiu a net". Das fotos:
 * cinco fotos de celular da vida real, que viram as câmeras ligadas de uma call. A página é a call
 * de madrugada do time: a entrada TRAVA de propósito (999 ms, rodinha, o escudo pulando), conecta
 * em 0 ms e o poro bota os óculos pixelados. O verde é o do sinal bom; o azul fica só no escudo.
 * O título é a Unbounded 800 (a geométrica larga de interface) em adesivo de gel; a interface da
 * call inteira fala Sora.
 */
export const TEMA_OS_5_SEM_PING: TemaDoTime = {
  slug: "os-5-sem-ping",
  fontes: { titulo: "unbounded", assinatura: "sora" },
  cores: {
    breu: "#040907",
    ceu: "#08130E",
    abismo: "#0C1C15",
    royal: "#0F6A3C",
    primaria: "#3DFF8F",
    neon: "#7DFFB5",
    arco: "#B9FFDA",
    nucleo: "#F0FFF7",
    texto: "#F3FFF8",
    prata: "#D2E6DA",
    apoio: "#93B3A3",
    acento: "#FF8DB4",
    tinta: "#03140B",
    icone: "#8FF5C0",
  },
  // O "metal" é o gel de ícone de app: menta no alto, o verde do sinal, verde fundo; sem bisel.
  metal: {
    luz: "#F4FFF9",
    alto: "#C2FFDF",
    meio: "#49F59B",
    sombra: "#0D7A40",
    fundo: "#16A957",
    volta: "#7BF7B4",
    base: "#0A5E30",
    placa: "#9BF8C8",
  },
  // "OS 5" vira a linha de status da sala (as 5 barras de sinal + o texto), acima de SEM PING.
  prefixo: "OS 5",
  letraPorLetra: true,
  // O verde do sinal bom: ≥ 18,5 de ΔE para as outras sete cores de time (14,8:1 no fundo do site).
  cor: "#3DFF8F",
  cenario: "chamada",
  textos: {
    lema: "temaSemPingLema",
    estrelando: "temaSemPingCameras",
    aviso: "temaSemPingAviso",
    capitao: "temaSemPingCapitao",
    emCartaz: "temaSemPingConectados",
    destino: "temaSemPingEncerrada",
    carimbo: "temaSemPingNuncaNemVi",
    fecho: "temaSemPingFecho",
    companheiros: "temaSemPingMesmaCall",
  },
  fotos: {
    // Fotos de celular (selfies e fotos de rolê) que preenchem a moldura: o foco só enquadra o rosto.
    focoPadrao: "50% 30%",
    foco: {
      "goom-gum": "50% 50%",
      nikiti: "50% 52%",
      "n4firida-agiota": "50% 47%",
      miva: "50% 50%",
      giripoca: "50% 25%",
    },
    // A foto do GOOM GUM é quadrada (1600×1593): na ficha sai inteira, com a piscina toda.
    proporcao: { "goom-gum": "1 / 1" },
  },
};
