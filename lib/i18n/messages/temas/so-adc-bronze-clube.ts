import { definir } from "@/lib/i18n/definir";

/**
 * Os textos do tema So ADC Bronze Clube (lib/temas/so-adc-bronze-clube.ts), somados ao bloco paginasHome
 * (lib/i18n/messages/paginas-home.ts): `tema.textos` aponta para estas chaves. Um arquivo por
 * time para cada tema mudar só o seu. Chaves com o prefixo do time, para nunca colidirem.
 *
 * O estande de arco e flecha do clube: três se inscreveram de ADC e dois foram improvisar (TOP e
 * MID); a mosca do alvo é o escudo, e ninguém acerta. O lema é a plaquinha do escudo, em caixa
 * baixa (sai no script, a Yellowtail, que não aceita caixa alta). «ARQUEIRO-CHEFE» e não «mestre
 * arqueiro»: «Mestre» é elo e confundiria com o Diamante do capitão.
 */
export const textosSoAdcBronzeClube = definir({
  pt: {
    temaSoAdcLema: "3 ADCs improvisados · querendo vencer",
    temaSoAdcAljava: "A ALJAVA",
    temaSoAdcAviso: "Inscritos como ADC: 3 · jogando de ADC: 1.",
    temaSoAdcCapitao: "ARQUEIRO-CHEFE",
    temaSoAdcEstande: "NO ESTANDE {periodo}",
    temaSoAdcFundacao: "Fundado em 2024 · 3 ADCs, 1 bot lane",
    temaSoAdcMmr: "MMR: ???",
    temaSoAdcFecho: "A mosca segue intacta desde 2024.",
    temaSoAdcFlechas: "AS OUTRAS FLECHAS",
  },
  en: {
    temaSoAdcLema: "3 improvised ADCs · trying to win",
    temaSoAdcAljava: "THE QUIVER",
    temaSoAdcAviso: "Signed up as ADC: 3 · actually playing ADC: 1.",
    temaSoAdcCapitao: "HEAD ARCHER",
    temaSoAdcEstande: "AT THE RANGE {periodo}",
    temaSoAdcFundacao: "Founded in 2024 · 3 ADCs, 1 bot lane",
    temaSoAdcMmr: "MMR: ???",
    temaSoAdcFecho: "The bullseye has been untouched since 2024.",
    temaSoAdcFlechas: "THE OTHER ARROWS",
  },
});
