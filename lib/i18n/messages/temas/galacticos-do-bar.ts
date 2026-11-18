import { definir } from "@/lib/i18n/definir";

/**
 * Os textos do tema Galácticos do Bar (lib/temas/galacticos-do-bar.ts) que moram num arquivo do
 * time, somados ao bloco paginasHome (lib/i18n/messages/paginas-home.ts). Os textos antigos do
 * tema (temaGalacticosLema…) continuam em paginas-home.ts; os novos vêm para cá.
 *
 * A noite de jogo no boteco: a campanha na ficha é a comanda da mesa, rodada por rodada.
 */
export const textosGalacticosDoBar = definir({
  pt: {
    // A campanha na ficha do jogador (components/times/campanha.tsx).
    temaGalacticosCampanha: "A COMANDA DA RESENHA",
    temaGalacticosCampanhaResultados: "RODADA POR RODADA",
    temaGalacticosCampanhaCampeoes: "O CARDÁPIO",
    temaGalacticosCampanhaProximo: "PRÓXIMA RODADA",
  },
  en: {
    temaGalacticosCampanha: "THE BAR TAB",
    temaGalacticosCampanhaResultados: "ROUND BY ROUND",
    temaGalacticosCampanhaCampeoes: "THE MENU",
    temaGalacticosCampanhaProximo: "NEXT ROUND",
  },
});
