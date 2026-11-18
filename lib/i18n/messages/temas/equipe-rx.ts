import { definir } from "@/lib/i18n/definir";

/**
 * Os textos do tema Equipe RX (lib/temas/equipe-rx.ts) que moram num arquivo do time, somados ao
 * bloco paginasHome (lib/i18n/messages/paginas-home.ts). Chaves com o prefixo do time.
 *
 * A estreia de cinema na tempestade elétrica: a campanha na ficha é o rastro do raio, cena a cena.
 */
export const textosEquipeRx = definir({
  pt: {
    // A campanha na ficha do jogador (components/times/campanha.tsx).
    temaRxCampanha: "O RASTRO DO RAIO",
    temaRxCampanhaResultados: "CENA A CENA",
    temaRxCampanhaCampeoes: "ELENCO DE CAMPEÕES",
    temaRxCampanhaProximo: "PRÓXIMA ESTREIA",
  },
  en: {
    temaRxCampanha: "THE LIGHTNING TRAIL",
    temaRxCampanhaResultados: "SCENE BY SCENE",
    temaRxCampanhaCampeoes: "CHAMPION CAST",
    temaRxCampanhaProximo: "NEXT PREMIERE",
  },
});
