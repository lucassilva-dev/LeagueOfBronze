import { definir } from "@/lib/i18n/definir";
import type { CardId } from "@/lib/schema";

/** Nome, frase de sabor e regra de uma cartinha, no idioma da página. */
export type TextoCarta = { nome: string; flavor: string; descricao: string };

/** Rótulo, cabeçalho da coluna e legenda de uma métrica dos rankings. */
export type TextoMetrica = { label: string; head: string; desc: string };

type ChaveEloRotulo =
  | "ferro"
  | "bronze"
  | "prata"
  | "ouro"
  | "platina"
  | "esmeralda"
  | "diamante"
  | "mestre"
  | "grao-mestre"
  | "desafiante";

type ChaveRota = "TOP" | "SEL" | "MID" | "ADC" | "SUP";
type ChaveMetricaJogador = "abates" | "kda" | "mvps" | "assist" | "mortes";
type ChaveMetricaCampeao = "jogados" | "banidos" | "presenca" | "winrate" | "kda";

export type TextosStats = {
  // ---------- /stats — cabeçalho e cartões do pool ----------
  statsEyebrow: string;
  statsTitulo: string;
  statsPillJogadores: string;
  statsPillPool: string;
  statsPillMedia: string;
  statsPillMono: string;
  statsDistribuicaoElo: string;
  statsForcaTimes: string;
  statsTopJogadores: string;
  /** Rótulo de cada elo (o `key` vem de lib/design, os dados do campeonato não mudam). */
  elos: Record<ChaveEloRotulo, string>;
  /** Rótulo de cada rota, pela sigla usada no design system. */
  rotas: Record<ChaveRota, string>;

  // ---------- /stats — rankings (jogadores e campeões) ----------
  rankJogadoresTitulo: string;
  rankAoVivo: string;
  rankJogadoresDescricao: string;
  rankColJogador: string;
  rankColTime: string;
  rankColCampeao: string;
  rankCampeoesTitulo: string;
  rankCampeoesDescricao: string;
  rankVazioJogadores: string;
  rankVazioCampeoes: string;
  rankVazioTexto: string;
  rankOrdemDesc: string;
  rankOrdemAsc: string;
  metricasJogador: Record<ChaveMetricaJogador, TextoMetrica>;
  metricasCampeao: Record<ChaveMetricaCampeao, TextoMetrica>;
  /** Siglas usadas nas linhas dos campeões: 3V · 2D, 40% dos jogos, 2P · 1B, 5V/8J. */
  siglaVitoria: string;
  siglaDerrota: string;
  siglaJogo: string;
  siglaPick: string;
  siglaBan: string;
  siglaDosJogos: string;

  // ---------- /stats — melhor por rota ----------
  rotaTitulo: string;
  rotaDescricao: string;
  rotaMelhor: string;
  rotaJogos: string;

  // ---------- /stats — duração das partidas ----------
  duracaoTitulo: string;
  /** Usa o marcador {n} para a quantidade de jogos com tempo registrado. */
  duracaoDescricao: string;
  duracaoMaisLongas: string;
  duracaoMaisLongasDesc: string;
  duracaoMaisCurtas: string;
  duracaoMaisCurtasDesc: string;
  duracaoJogo: string;
  duracaoVitoria: string;

  // ---------- /cartas ----------
  cartasEyebrow: string;
  cartasTitulo: string;
  cartasIntro: string;
  cartasMaisSorteadas: string;
  cartasSorteios: string;
  cartasChipDupla: string;
  cartasChipSurpresa: string;
  cartasRodapeDupla: string;
  cartasRodapeIndividual: string;
  cartasCreditosTitulo: string;
  cartasCreditosA: string;
  cartasCreditosB: string;
  cartasCreditosFonte: string;
  cartasCreditosC: string;
  /** Nome/sabor/regra de cada carta. As chaves (ids) NÃO mudam — o dataset depende delas. */
  cartas: Record<CardId, TextoCarta>;
};

/**
 * Textos das páginas /stats e /cartas.
 *
 * O tipo é passado explicitamente para `definir` porque o que precisa bater entre os dois
 * idiomas é o formato (as chaves), não o conteúdo.
 */
export const paginasStats = definir<TextosStats>({
  pt: {
    statsEyebrow: "Raio-x do pool · pré-torneio",
    statsTitulo: "ESTATÍSTICAS",
    statsPillJogadores: "JOGADORES",
    statsPillPool: "PTS NO POOL",
    statsPillMedia: "PTS · MÉDIA POR TIME",
    statsPillMono: "MONO CHAMPIONS",
    statsDistribuicaoElo: "DISTRIBUIÇÃO POR ELO",
    statsForcaTimes: "FORÇA DOS TIMES",
    statsTopJogadores: "TOP JOGADORES · POR VALOR",
    elos: {
      ferro: "Ferro",
      bronze: "Bronze",
      prata: "Prata",
      ouro: "Ouro",
      platina: "Platina",
      esmeralda: "Esmeralda",
      diamante: "Diamante",
      mestre: "Mestre",
      "grao-mestre": "Grão-Mestre",
      desafiante: "Desafiante",
    },
    rotas: {
      TOP: "Topo",
      SEL: "Selva",
      MID: "Meio",
      ADC: "Atirador",
      SUP: "Suporte",
    },

    rankJogadoresTitulo: "RANKING DE JOGADORES",
    rankAoVivo: "AO VIVO · ATUALIZA A CADA JOGO",
    rankJogadoresDescricao:
      "Abates, KDA, MVPs, assistências e mortes — só de quem já entrou em jogo.",
    rankColJogador: "JOGADOR",
    rankColTime: "TIME",
    rankColCampeao: "CAMPEÃO",
    rankCampeoesTitulo: "CAMPEÕES",
    rankCampeoesDescricao: "Mais jogados, mais banidos, taxa de ban, presença e winrate.",
    rankVazioJogadores: "Sem partidas registradas ainda",
    rankVazioCampeoes: "Nenhum campeão registrado ainda",
    rankVazioTexto: "Assim que os jogos forem registrados, o ranking aparece aqui automaticamente.",
    rankOrdemDesc: "Ordenado do maior para o menor · clique para inverter",
    rankOrdemAsc: "Ordenado do menor para o maior · clique para inverter",
    metricasJogador: {
      abates: { label: "Abates", head: "ABATES", desc: "Quem mais elimina adversários ao longo do campeonato." },
      kda: { label: "KDA", head: "KDA", desc: "Média de (abates + assistências) dividida pelas mortes." },
      mvps: { label: "MVPs", head: "MVPs", desc: "Jogadores eleitos MVP do jogo mais vezes." },
      assist: { label: "Assistências", head: "ASSIST", desc: "Quem mais participa das jogadas do time." },
      mortes: { label: "Mortes", head: "MORTES", desc: "Quem menos cai em combate lidera aqui — menos é melhor." },
    },
    metricasCampeao: {
      jogados: { label: "Mais jogados", head: "PICKS", desc: "Os campeões mais escolhidos no draft das partidas." },
      banidos: { label: "Mais banidos", head: "BANS", desc: "Os campeões que o pessoal não quer ver na Rift." },
      presenca: { label: "Presença", head: "PRES%", desc: "Partidas em que foi escolhido ou banido (pick + ban)." },
      winrate: { label: "Winrate", head: "WIN%", desc: "Taxa de vitória de cada campeão no campeonato." },
      kda: { label: "KDA", head: "KDA", desc: "Melhor média de KDA registrada por campeão." },
    },
    siglaVitoria: "V",
    siglaDerrota: "D",
    siglaJogo: "J",
    siglaPick: "P",
    siglaBan: "B",
    siglaDosJogos: "dos jogos",

    rotaTitulo: "MELHOR POR ROTA",
    rotaDescricao: "O destaque de cada posição, pelo melhor KDA entre quem entrou em jogo.",
    rotaMelhor: "MELHOR",
    rotaJogos: "jogos",

    duracaoTitulo: "DURAÇÃO DAS PARTIDAS",
    duracaoDescricao:
      "Os jogos mais demorados e os mais rápidos do campeonato ({n} jogos com tempo registrado).",
    duracaoMaisLongas: "MAIS LONGAS",
    duracaoMaisLongasDesc: "Do jogo mais demorado para o mais rápido.",
    duracaoMaisCurtas: "MAIS CURTAS",
    duracaoMaisCurtasDesc: "Os jogos mais rápidos do campeonato.",
    duracaoJogo: "Jogo",
    duracaoVitoria: "vitória",

    cartasEyebrow: "Mecânica duvidosa · entretenimento imaculado",
    cartasTitulo: "CARTAS",
    cartasIntro:
      "Em cada série (MD3), cada capitão pode — se quiser — sortear uma cartinha surpresa. O sorteio é opcional, idêntico para os dois capitães, está previsto no regulamento divulgado antes do início da temporada e acontece publicamente, ao vivo, na página da série: antes do pick & ban e valendo só para aquela partida. São 6 cartas individuais (afetam o time adversário) e 2 cartas duplas, que só entram em jogo quando os dois capitães sorteiam na mesma partida.",
    cartasMaisSorteadas: "CARTAS MAIS SORTEADAS",
    cartasSorteios: "sorteio(s)",
    cartasChipDupla: "DUPLA",
    cartasChipSurpresa: "SURPRESA",
    cartasRodapeDupla: "SÓ COM 2 CARTAS · AFETA OS 2 TIMES",
    cartasRodapeIndividual: "1× POR SÉRIE · AFETA O ADVERSÁRIO",
    cartasCreditosTitulo: "CRÉDITOS DAS ARTES",
    cartasCreditosA:
      "Artes feitas a partir de memes brasileiros, para uso humorístico neste campeonato amador. A arte de ",
    cartasCreditosB:
      " deriva da foto de Jojo Todynho por Renato Cipriano (Cipriano1976), sob ",
    cartasCreditosFonte: "fonte",
    cartasCreditosC:
      " — alterada com recorte, cor, sobreposição, setas e texto; a arte derivada permanece sob CC BY-SA 4.0. Créditos completos em ",
    cartas: {
      ABCDRAFT: {
        nome: "ABCDRAFT",
        flavor: "Sorteou L e M? Torce pra Lillia não estar banida — ela levou 11 bans nesta edição.",
        descricao:
          "Duas letras são sorteadas. O capitão adversário monta a composição só com campeões cujos nomes iniciam com essas letras. Não há banimentos nesta carta.",
      },
      DRAFT_SABOTADO: {
        nome: "DRAFT SABOTADO",
        flavor: "O adversário monta metade do seu time. Respeitando a rota — pelo menos foi o combinado.",
        descricao:
          "Quem usou a carta escolhe o campeão de dois jogadores adversários, respeitando a role de cada um (ex.: nada de Yuumi na jungle). Banimentos normais.",
      },
      INTER_CLASSE: {
        nome: "INTER CLASSE",
        flavor: "Saiu tanque? Boa sorte fazendo dano. Saiu assassino? Boa sorte segurando torre.",
        descricao:
          "Uma classe de campeões é sorteada. O time adversário só pode escolher campeões daquela classe no draft. Banimentos normais.",
      },
      INVASAO_YUUMI: {
        nome: "INVASÃO DA YUUMI",
        flavor: "O suporte adversário não escolhe nada: cola na Yuumi e reza. THALAO e Onigami sabem como é.",
        descricao:
          "O suporte do time adversário é obrigado a jogar de Yuumi na partida. Banimentos normais.",
      },
      INVERSAO_ROTAS: {
        nome: "INVERSÃO DE ROTAS",
        flavor: "Seu ADC vai pro topo, seu top vai pro bot. A rota que você treinou a vida toda? Hoje não.",
        descricao:
          "Quem usou a carta escolhe dois jogadores adversários para trocarem de lane entre si. Banimentos normais.",
      },
      TUDO_LIBERADO: {
        nome: "TUDO LIBERADO",
        flavor: "O adversário perde os bans. O Mordekaiser, banido 12 vezes no campeonato, finalmente respira.",
        descricao:
          "O time adversário fica proibido de banir qualquer campeão durante a fase de banimentos.",
      },
      AMIGOS_NATUREZA: {
        nome: "AMIGOS DA NATUREZA",
        flavor: "Sem jungler e sem Smite pros DOIS times. O vidotti agiota, 100 abates na selva, não aprovou.",
        descricao:
          "Nenhum dos dois times pode escolher Jungler nem levar o feitiço de invocador Smite na partida. Banimentos normais.",
      },
      DRAFT_INVERTIDO: {
        nome: "DRAFT INVERTIDO",
        flavor: "Você não escolhe seu campeão: o inimigo escolhe. E ele viu seu histórico.",
        descricao:
          "Cada time escolhe o draft do outro — os campeões precisam ser da rota de cada jogador, sem trocar campeões entre rotas diferentes. Banimentos normais.",
      },
    },
  },

  en: {
    statsEyebrow: "Pool breakdown · pre-tournament",
    statsTitulo: "STATS",
    statsPillJogadores: "PLAYERS",
    statsPillPool: "PTS IN THE POOL",
    statsPillMedia: "PTS · TEAM AVERAGE",
    statsPillMono: "MONO CHAMPIONS",
    statsDistribuicaoElo: "RANK DISTRIBUTION",
    statsForcaTimes: "TEAM STRENGTH",
    statsTopJogadores: "TOP PLAYERS · BY VALUE",
    elos: {
      ferro: "Iron",
      bronze: "Bronze",
      prata: "Silver",
      ouro: "Gold",
      platina: "Platinum",
      esmeralda: "Emerald",
      diamante: "Diamond",
      mestre: "Master",
      "grao-mestre": "Grandmaster",
      desafiante: "Challenger",
    },
    rotas: {
      TOP: "Top",
      SEL: "Jungle",
      MID: "Mid",
      ADC: "Bot",
      SUP: "Support",
    },

    rankJogadoresTitulo: "PLAYER RANKINGS",
    rankAoVivo: "LIVE · UPDATED EVERY GAME",
    rankJogadoresDescricao:
      "Kills, KDA, MVPs, assists and deaths — only for players who have played.",
    rankColJogador: "PLAYER",
    rankColTime: "TEAM",
    rankColCampeao: "CHAMPION",
    rankCampeoesTitulo: "CHAMPIONS",
    rankCampeoesDescricao: "Most picked, most banned, ban rate, presence and win rate.",
    rankVazioJogadores: "No matches recorded yet",
    rankVazioCampeoes: "No champions recorded yet",
    rankVazioTexto: "As soon as the games are recorded, the ranking shows up here automatically.",
    rankOrdemDesc: "Sorted from highest to lowest · click to reverse",
    rankOrdemAsc: "Sorted from lowest to highest · click to reverse",
    metricasJogador: {
      abates: { label: "Kills", head: "KILLS", desc: "Who takes down the most opponents across the tournament." },
      kda: { label: "KDA", head: "KDA", desc: "Average of (kills + assists) divided by deaths." },
      mvps: { label: "MVPs", head: "MVPs", desc: "Players voted game MVP the most times." },
      assist: { label: "Assists", head: "ASSISTS", desc: "Who takes part in the most team plays." },
      mortes: { label: "Deaths", head: "DEATHS", desc: "Whoever dies the least leads here — fewer is better." },
    },
    metricasCampeao: {
      jogados: { label: "Most picked", head: "PICKS", desc: "The champions picked the most in the draft." },
      banidos: { label: "Most banned", head: "BANS", desc: "The champions nobody wants to see on the Rift." },
      presenca: { label: "Presence", head: "PRES%", desc: "Games where the champion was picked or banned (pick + ban)." },
      winrate: { label: "Win rate", head: "WIN%", desc: "Each champion's win rate in the tournament." },
      kda: { label: "KDA", head: "KDA", desc: "Best average KDA recorded per champion." },
    },
    siglaVitoria: "W",
    siglaDerrota: "L",
    siglaJogo: "G",
    siglaPick: "P",
    siglaBan: "B",
    siglaDosJogos: "of the games",

    rotaTitulo: "BEST BY ROLE",
    rotaDescricao: "The standout in each position, by best KDA among the players who have played.",
    rotaMelhor: "BEST",
    rotaJogos: "games",

    duracaoTitulo: "GAME LENGTH",
    duracaoDescricao:
      "The longest and the fastest games of the tournament ({n} games with a recorded time).",
    duracaoMaisLongas: "LONGEST",
    duracaoMaisLongasDesc: "From the longest game to the fastest one.",
    duracaoMaisCurtas: "SHORTEST",
    duracaoMaisCurtasDesc: "The fastest games of the tournament.",
    duracaoJogo: "Game",
    duracaoVitoria: "won by",

    cartasEyebrow: "Questionable mechanics · immaculate entertainment",
    cartasTitulo: "CARDS",
    cartasIntro:
      "In every series (Bo3), each captain may — if they want to — draw a surprise wildcard. The draw is optional, identical for both captains, written into the rulebook published before the season starts, and it happens publicly and live on the series page: before pick & ban and valid for that game only. There are 6 individual cards (they affect the opposing team) and 2 double cards, which only come into play when both captains draw in the same game.",
    cartasMaisSorteadas: "MOST DRAWN CARDS",
    cartasSorteios: "draw(s)",
    cartasChipDupla: "DOUBLE",
    cartasChipSurpresa: "SURPRISE",
    cartasRodapeDupla: "ONLY WITH 2 CARDS · AFFECTS BOTH TEAMS",
    cartasRodapeIndividual: "1× PER SERIES · AFFECTS THE OPPONENT",
    cartasCreditosTitulo: "ARTWORK CREDITS",
    cartasCreditosA:
      "Artwork made from Brazilian memes, for humorous use in this amateur tournament. The ",
    cartasCreditosB:
      " artwork is derived from the photo of Jojo Todynho by Renato Cipriano (Cipriano1976), under ",
    cartasCreditosFonte: "source",
    cartasCreditosC:
      " — altered with cropping, colour, overlay, arrows and text; the derivative artwork remains under CC BY-SA 4.0. Full credits at ",
    cartas: {
      ABCDRAFT: {
        nome: "ABCDRAFT",
        flavor: "Drew L and M? Hope Lillia isn't banned — she took 11 bans this edition.",
        descricao:
          "Two letters are drawn. The opposing captain has to build the whole composition with champions whose names start with those letters. There are no bans with this card.",
      },
      DRAFT_SABOTADO: {
        nome: "SABOTAGED DRAFT",
        flavor: "The opponent builds half of your team. Respecting the role — that was the deal, at least.",
        descricao:
          "Whoever played the card picks the champion for two opposing players, respecting each one's role (no Yuumi in the jungle, please). Bans as usual.",
      },
      INTER_CLASSE: {
        nome: "INTERCLASS",
        flavor: "Tanks came up? Good luck dealing damage. Assassins? Good luck holding a tower.",
        descricao:
          "A champion class is drawn. The opposing team can only pick champions of that class in the draft. Bans as usual.",
      },
      INVASAO_YUUMI: {
        nome: "YUUMI INVASION",
        flavor: "The enemy support picks nothing: attach to Yuumi and pray. THALAO and Onigami know the feeling.",
        descricao:
          "The opposing team's support has to play Yuumi in that game. Bans as usual.",
      },
      INVERSAO_ROTAS: {
        nome: "ROLE SWAP",
        flavor: "Your ADC goes top, your top goes bot. The lane you trained your whole life? Not today.",
        descricao:
          "Whoever played the card picks two opposing players to swap lanes with each other. Bans as usual.",
      },
      TUDO_LIBERADO: {
        nome: "ANYTHING GOES",
        flavor: "The opponent loses their bans. Mordekaiser, banned 12 times this tournament, can finally breathe.",
        descricao:
          "The opposing team is not allowed to ban any champion during the ban phase.",
      },
      AMIGOS_NATUREZA: {
        nome: "FRIENDS OF NATURE",
        flavor: "No jungler and no Smite for BOTH teams. vidotti the loan shark, 100 jungle kills, did not approve.",
        descricao:
          "Neither team may pick a Jungler or take the Smite summoner spell in that game. Bans as usual.",
      },
      DRAFT_INVERTIDO: {
        nome: "INVERTED DRAFT",
        flavor: "You don't pick your champion: the enemy does. And they have seen your match history.",
        descricao:
          "Each team drafts for the other one — champions must match each player's role, with no swapping champions between different roles. Bans as usual.",
      },
    },
  },
});
