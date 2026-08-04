import { definir } from "@/lib/i18n/definir";

/**
 * Avisos de conformidade exibidos nas páginas públicas.
 *
 * Existem para responder, na própria página onde a dúvida nasce, três pontos que as
 * políticas da Riot Games avaliam:
 *
 *  - integridade de jogo: as cartinhas restringem escolhas do adversário, então a página
 *    precisa deixar claro, logo no topo, que é regra de formato acordada antes, opcional,
 *    simétrica e sorteada em público — nada aplicado via API ou pelo cliente do jogo;
 *  - sistema alternativo de ranqueamento: a pontuação por elo é moeda de draft derivada do
 *    ranque OFICIAL declarado pelo jogador, e não uma nota de habilidade criada pelo site;
 *  - de-anonimização: foto e Riot ID aparecem juntos, então a página diz que é com
 *    autorização do participante e como pedir remoção.
 *
 * Ficam num arquivo próprio porque são citados por /cartas, /regras, /stats e /jogadores.
 */
export const conformidade = definir({
  pt: {
    cartasTituloAviso: "Como esta regra funciona",
    cartasAviso:
      "As cartinhas são uma regra de formato do nosso campeonato, publicada no regulamento antes do início da temporada e aceita por todos os participantes. O uso é opcional e simétrico: cada capitão decide se quer sortear, os dois têm exatamente o mesmo conjunto de cartas e o mesmo limite de uma por série. O sorteio é público e ao vivo, com os dois times assistindo, antes da fase de escolhas e banimentos, e vale apenas para aquela partida.",
    cartasAvisoTecnico:
      "Nada disso é aplicado por software: não há integração com o cliente do jogo nem com a API da Riot. É um acordo entre os participantes, cumprido manualmente na sala personalizada. As condições de vitória não mudam — a partida continua sendo decidida pela destruição do Nexus.",

    eloAviso:
      "Os pontos por elo são apenas moeda de draft deste campeonato, calculada a partir do ranque oficial que o próprio jogador declara. Não é uma avaliação de habilidade criada por este site, nem um sistema de ranqueamento alternativo ao da Riot Games.",

    consentimentoJogadores:
      "Foto e Riot ID são publicados com autorização do participante, conforme o regulamento. Para correção ou remoção, escreva para",
    consentimentoLink: "Saiba mais no aviso legal",

    proximaEdicaoSelo: "Em organização",
    proximaEdicaoTitulo: "League of Bronze — 4ª Edição",
    proximaEdicaoTexto:
      "A próxima edição já está sendo montada, com início previsto para o começo de novembro de 2026. A data exata ainda será confirmada — acompanhe por aqui e pelo Discord do grupo.",

    formatoVariaTitulo: "CADA EDIÇÃO TEM O SEU FORMATO",
    formatoVariaTexto:
      "Não existe um formato fixo. Antes de cada campeonato, a organização decide o regulamento junto com o grupo — quantos times, se haverá semifinal, o tipo de série, se entra alguma regra especial — e publica tudo nesta página antes da primeira partida.",
    formatoVariaExemplos:
      "Por isso muda de uma edição para a outra: a 2ª Edição teve semifinal e final; a 3ª, que está descrita abaixo, foi disputada em pontos corridos com Grande Final direta, sem semifinal; a 4ª está sendo desenhada com um formato próprio, ainda em discussão com o grupo.",
    formatoVariaGarantia:
      "O que nunca muda: o regulamento vale igualmente para todos os times, é acordado com os participantes e fica publicado por completo antes de qualquer jogo ser disputado. Nenhuma regra é criada ou alterada com o campeonato em andamento.",
  },
  en: {
    cartasTituloAviso: "How this rule works",
    cartasAviso:
      "Wildcards are a format rule of our tournament, published in the rulebook before the season starts and accepted by every participant. Using one is optional and symmetric: each captain decides whether to draw, both have exactly the same set of cards and the same limit of one per series. The draw is public and live, with both teams watching, before the pick & ban phase, and it applies to that single game only.",
    cartasAvisoTecnico:
      "None of this is enforced by software: there is no integration with the game client or with the Riot API. It is an agreement between participants, applied manually inside the custom lobby. Win conditions do not change — the match is still decided by destroying the Nexus.",

    eloAviso:
      "Rank points are only this tournament's draft currency, derived from the official rank each player declares. They are not a skill rating created by this site, nor an alternative ranking system to Riot Games'.",

    consentimentoJogadores:
      "Photos and Riot IDs are published with the participant's consent, as stated in the rules. For correction or removal, write to",
    consentimentoLink: "Read more in the legal notice",

    proximaEdicaoSelo: "Being organised",
    proximaEdicaoTitulo: "League of Bronze — 4th Edition",
    proximaEdicaoTexto:
      "The next edition is already being put together, expected to start in early November 2026. The exact date is still to be confirmed — follow it here and on the group's Discord.",

    formatoVariaTitulo: "EACH EDITION HAS ITS OWN FORMAT",
    formatoVariaTexto:
      "There is no fixed format. Before each tournament, the organisation decides the rulebook together with the group — how many teams, whether there will be a semifinal, the series length, whether any special rule applies — and publishes all of it on this page before the first match.",
    formatoVariaExemplos:
      "That is why it changes between editions: the 2nd Edition had a semifinal and a final; the 3rd, described below, was a round robin with a direct Grand Final and no semifinal; the 4th is being designed with its own format, still under discussion with the group.",
    formatoVariaGarantia:
      "What never changes: the rulebook applies equally to every team, is agreed with the participants, and is published in full before any game is played. No rule is created or changed while a tournament is running.",
  },
});
