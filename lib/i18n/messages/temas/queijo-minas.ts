import { definir } from "@/lib/i18n/definir";

/**
 * Os textos do tema Queijo Minas (lib/temas/queijo-minas.ts) que moram num arquivo do time,
 * somados ao bloco paginasHome (lib/i18n/messages/paginas-home.ts). Os textos antigos do tema
 * (temaQueijoLema…) continuam em paginas-home.ts; os novos vêm para cá, para cada tema mudar só o seu.
 *
 * A viagem de trem na serra: a campanha na ficha é o diário de bordo, estação por estação.
 */
export const textosQueijoMinas = definir({
  pt: {
    // A campanha na ficha do jogador (components/times/campanha.tsx).
    temaQueijoCampanha: "DIÁRIO DE BORDO",
    temaQueijoCampanhaResultados: "ESTAÇÃO POR ESTAÇÃO",
    temaQueijoCampanhaCampeoes: "NA BAGAGEM",
    temaQueijoCampanhaProximo: "PRÓXIMA PARADA",
  },
  en: {
    temaQueijoCampanha: "TRAVEL LOG",
    temaQueijoCampanhaResultados: "STATION BY STATION",
    temaQueijoCampanhaCampeoes: "IN THE LUGGAGE",
    temaQueijoCampanhaProximo: "NEXT STOP",
  },
});
