import { definir } from "@/lib/i18n/definir";

/**
 * Os textos do tema Fãs de Rosca Esporte Clube (lib/temas/fas-de-rosca-esporte-clube.ts), somados ao bloco paginasHome
 * (lib/i18n/messages/paginas-home.ts): `tema.textos` aponta para estas chaves. Um arquivo por
 * time para cada tema mudar só o seu. Chaves com o prefixo do time, para nunca colidirem.
 *
 * «Dia de Braço»: a academia do time às 6h. As piadas: «ninguém pula dia de braço» e «tá pago»
 * (os memes de academia), o capitão «vidotti AGIOTA» virou o personal que cobra juros, as 5
 * roscas são os 5 jogadores e os ramos de trigo do escudo viraram o «contém glúten».
 */
export const textosFasDeRosca = definir({
  pt: {
    temaRoscaLema: "Ninguém aqui pula dia de braço.",
    temaRoscaSocios: "SÓCIOS EM DIA",
    temaRoscaAviso: "Mensalidade atrasada? Acerta com o personal (ele cobra juros).",
    temaRoscaCapitao: "PERSONAL",
    temaRoscaQuentinho: "QUENTINHO {periodo}",
    temaRoscaPedido: "Pós-treino: 5 roscas pra viagem.",
    temaRoscaTaPago: "TÁ PAGO",
    temaRoscaFecho: "Contém glúten. E braço demais.",
    temaRoscaParceiros: "PARCEIROS DE TREINO",
  },
  en: {
    temaRoscaLema: "Nobody here skips arm day.",
    temaRoscaSocios: "PAID-UP MEMBERS",
    temaRoscaAviso: "Behind on your dues? Settle up with the coach (he charges interest).",
    temaRoscaCapitao: "COACH",
    temaRoscaQuentinho: "FRESH OUT OF THE OVEN {periodo}",
    temaRoscaPedido: "Post-workout: 5 donuts to go.",
    // Fica em português, como o «FIADO SÓ AMANHÃ» dos Galácticos: a página marca lang="pt-BR" no adesivo.
    temaRoscaTaPago: "TÁ PAGO",
    temaRoscaFecho: "Contains gluten. And way too much arm.",
    temaRoscaParceiros: "GYM BUDDIES",
  },
});
