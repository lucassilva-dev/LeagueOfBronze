import { definir } from "@/lib/i18n/definir";

/**
 * Textos públicos da regra 6 (substituto avulso, reserva, saída de vez) e do W.O. no meio
 * da série — decisões de 22/10/2026.
 *
 * Ficam aqui, ao lado dos componentes que os usam, e não em lib/i18n/messages, só para
 * esta leva não disputar os arquivos de mensagens com quem escreve o regulamento ao mesmo
 * tempo. A forma é a mesma (`definir`: esquecer a tradução é erro de compilação), então
 * mudar o bloco de lugar depois é recortar e colar.
 */
export const textosElenco = definir({
  pt: {
    /** No lugar do time, para o reserva oficial (sem time). */
    reserva: "Reserva",
    /** Na ficha de quem saiu de vez, ao lado do time em que jogou. */
    saiuDoTime: "Saiu do time",
    /** Marca curta da linha de quem jogou como substituto avulso. */
    substitutoCurto: "SUB",
    substitutoTitulo: "Jogou como substituto",
    /** Volta da ficha de quem não tem time no elenco (reserva). */
    voltarJogadores: "← VOLTAR AOS JOGADORES",
    /** Cartão de um jogo de W.O. na página da partida. */
    jogoDeWalkoverTexto: "Jogo não disputado: conta para o placar, sem K/D/A e sem MVP.",
  },
  en: {
    reserva: "Substitute",
    saiuDoTime: "Left the team",
    substitutoCurto: "SUB",
    substitutoTitulo: "Played as a substitute",
    voltarJogadores: "← BACK TO PLAYERS",
    jogoDeWalkoverTexto: "Game not played: it counts for the score, with no K/D/A and no MVP.",
  },
});

export type TextosElenco = (typeof textosElenco)["pt"];
