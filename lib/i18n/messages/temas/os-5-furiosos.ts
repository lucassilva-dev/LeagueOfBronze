import { definir } from "@/lib/i18n/definir";

/**
 * Os textos do tema Os 5 Furiosos (lib/temas/os-5-furiosos.ts), somados ao bloco paginasHome
 * (lib/i18n/messages/paginas-home.ts): `tema.textos` aponta para estas chaves. Um arquivo por
 * time para cada tema mudar só o seu. Chaves com o prefixo do time, para nunca colidirem.
 *
 * O álbum de figurinhas do campeonato: «brilhante», «repetida», «falta uma», «nas bancas». O lema é
 * a plaquinha da Lulu do capitão, que aparece no pôster e na foto dele.
 */
export const textosOs5Furiosos = definir({
  pt: {
    temaFuriososLema: "Tem um gosto meio roxo!",
    temaFuriososFigurinhas: "FIGURINHAS DO TIME",
    temaFuriososAviso: "Falta uma: a da taça.",
    temaFuriososCapitao: "BRILHANTE",
    temaFuriososBancas: "NAS BANCAS {periodo}",
    temaFuriososPacotinho: "PACOTINHO COM 5 FIGURINHAS · 1 BRILHANTE",
    temaFuriososSabor: "SABOR MEIO ROXO",
    temaFuriososFecho: "Troco repetida por vitória.",
    temaFuriososCompleteOTime: "COMPLETE O TIME",
  },
  en: {
    temaFuriososLema: "It tastes kinda purple!",
    temaFuriososFigurinhas: "TEAM STICKERS",
    temaFuriososAviso: "Still missing one: the trophy.",
    temaFuriososCapitao: "SHINY",
    temaFuriososBancas: "ON NEWSSTANDS {periodo}",
    temaFuriososPacotinho: "PACK OF 5 STICKERS · 1 SHINY",
    // O selo do pacotinho: fica em português (a página marca lang="pt-BR").
    temaFuriososSabor: "SABOR MEIO ROXO",
    temaFuriososFecho: "Will trade duplicates for wins.",
    temaFuriososCompleteOTime: "COMPLETE THE TEAM",
  },
});
