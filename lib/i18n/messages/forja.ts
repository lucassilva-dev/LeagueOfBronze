import { definir } from "@/lib/i18n/definir";

/**
 * Textos novos da /stats cinemática («A Forja»). Os rótulos que já existiam — métricas do
 * ranking, abas dos campeões, nomes de elo e de rota — continuam em paginas-stats.ts.
 *
 * Marcadores entre chaves ({n}, {total}, {edicao}…) são trocados pela tela (`preencher`).
 * Humor da casa («mecânica duvidosa · entretenimento imaculado»): a piada é sempre com o
 * NÚMERO, nunca com uma pessoa.
 */

/** O cartão de um ato: o número, o nome da cena e o que ela mostra. */
type Ato = { numero: string; nome: string; sub: string };

export type TextosDaForja = {
  // ---------- geral
  sobretitulo: string;
  lema: string;
  lema2: string;
  rolar: string;
  atos: {
    fornalha: Ato;
    liga: Ato;
    moldes: Ato;
    pecas: Ato;
    canais: Ato;
    bigorna: Ato;
    arsenal: Ato;
    tempera: Ato;
    fecho: Ato;
  };

  // ---------- ato I
  resumoJogadoresNota: string;
  resumoPoolNota: string;
  resumoMediaNota: string;
  resumoMonoNotaZero: string;
  resumoMonoNota: string;
  resumoFaixa: string;

  // ---------- ato II
  ligaBronzeZero: string;
  ligaBronzeUm: string;
  ligaBronzeVarios: string;
  ligaBronzeMuitos: string;
  ligaJogador: string;
  ligaJogadores: string;
  ligaDica: string;

  // ---------- ato III
  moldesPts: string;
  moldesSemJogo: string;
  moldesNota: string;
  moldesLugar: string;
  moldesVerTime: string;
  moldesSeries: string;

  // ---------- ato IV e a carta
  pecasNota: string;
  pecasSelo: string;
  pecasAviso: string;
  cartaVirar: string;
  cartaDesvirar: string;
  cartaPts: string;
  cartaValor: string;
  cartaFicha: string;
  cartaHolofote: string;
  cartaCapitao: string;
  cartaJogos: string;
  cartaVitorias: string;
  cartaAbates: string;
  cartaMortes: string;
  cartaAssist: string;
  cartaAssinatura: string;
  cartaSemJogo: string;
  cartaAbrir: string;

  // ---------- ato V
  canaisNota: string;

  // ---------- ato VI
  bigornaJogaram: string;
  bigornaBanco: string;
  bigornaTodosJogaram: string;
  bigornaVerTodos: string;
  bigornaVerMenos: string;
  bigornaInverter: string;
  bigornaCriterio: string;

  // ---------- ato VII
  arsenalNota: string;
  arsenalLider: string;
  arsenalVerTodos: string;
  arsenalVerMenos: string;
  arsenalAbas: string;

  // ---------- ato VIII
  temperaAtropelo: string;
  temperaEpico: string;
  temperaMedia: string;
  temperaNota: string;
  temperaMin: string;
  temperaVerPartida: string;

  // ---------- fecho
  fechoTitulo: string;
  fechoTexto: string;
  fechoJogadores: string;
  fechoJogadoresSub: string;
  fechoTimes: string;
  fechoTimesSub: string;
  fechoPartidas: string;
  fechoPartidasSub: string;
  fechoTabela: string;

  // ---------- porta (tela de entrada)
  portaSobre: string;
  portaTitulo: string;
  portaTexto: string;
  portaComSom: string;
  portaSemSom: string;
  portaDica: string;

  // ---------- painel de bordo
  hudAtos: string;
  hudSomLigar: string;
  hudSomDesligar: string;
  hudSomAviso: string;
  hudVolume: string;
  hudVs: string;
  hudTabela: string;
  hudAtalhos: string;
  hudAnterior: string;
  hudProximo: string;

  // ---------- holofote
  holofoteFechar: string;
  holofoteVs: string;
  holofoteRanking: string;
  holofoteCampeoes: string;
  holofoteAnterior: string;
  holofoteProximo: string;
  holofotePosicao: string;
  holofoteTitulo: string;

  // ---------- modo VS
  vsTitulo: string;
  vsEscolha: string;
  vsJogadores: string;
  vsTimes: string;
  vsLadoA: string;
  vsLadoB: string;
  vsVazio: string;
  vsBuscar: string;
  vsProximas: string;
  vsLutar: string;
  vsTrocar: string;
  vsNovo: string;
  vsCopiar: string;
  vsCopiado: string;
  vsVantagem: string;
  vsEmpate: string;
  vsConfronto: string;
  vsSemConfronto: string;
  vsProximo: string;
  vsRotaARota: string;
  vsMenosMelhor: string;
  vsSeries: string;
  vsMapas: string;
  vsDuracao: string;
  vsPosicao: string;
  vsFechar: string;

  // ---------- visão em tabela
  tabelaTitulo: string;
  tabelaIntro: string;
  tabelaVoltar: string;
  tabelaResumo: string;
  colJogador: string;
  colTime: string;
  colRota: string;
  colElo: string;
  colValor: string;
  colJogos: string;
  colVitorias: string;
  colAbates: string;
  colMortes: string;
  colAssist: string;
  colKda: string;
  colMvps: string;
  colCampeao: string;
  colPicks: string;
  colBans: string;
  colPresenca: string;
  colWinrate: string;
  colSerie: string;
  colJogo: string;
  colMinutos: string;
  colVencedor: string;
  colPts: string;
  colCampanha: string;
  colQuantidade: string;
  colConfronto: string;
  colItem: string;
  colNumero: string;
};

export const forja = definir<TextosDaForja>({
  pt: {
    sobretitulo: "{edicao} · {jogos} jogos no fogo",
    lema: "Tudo que aconteceu no Rift, cunhado em bronze.",
    lema2: "Mecânica duvidosa. Números exatos.",
    rolar: "ROLE PARA FORJAR",
    atos: {
      fornalha: { numero: "ATO I", nome: "A FORNALHA", sub: "O resumo do campeonato" },
      liga: { numero: "ATO II", nome: "A LIGA", sub: "Distribuição por elo" },
      moldes: { numero: "ATO III", nome: "OS MOLDES", sub: "Força dos times" },
      pecas: { numero: "ATO IV", nome: "AS PEÇAS RARAS", sub: "Top jogadores por valor" },
      canais: { numero: "ATO V", nome: "OS CANAIS", sub: "Melhor por rota" },
      bigorna: { numero: "ATO VI", nome: "A BIGORNA", sub: "Ranking de jogadores" },
      arsenal: { numero: "ATO VII", nome: "O ARSENAL", sub: "Campeões" },
      tempera: { numero: "ATO VIII", nome: "A TÊMPERA", sub: "Duração das partidas" },
      fecho: { numero: "FECHO", nome: "O RESFRIAMENTO", sub: "Para onde ir agora" },
    },

    resumoJogadoresNota: "inscritos, sorteados e sem desculpa",
    resumoPoolNota: "moeda de draft, não de habilidade",
    resumoMediaNota: "o draft fechou a conta",
    resumoMonoNotaZero: "fidelidade zero a campeão",
    resumoMonoNota: "fiéis até o próximo nerf",
    resumoFaixa: "{jogos} jogos · {abates} abates · {series} de {total} séries",

    ligaBronzeZero: "Nenhum Bronze de verdade num campeonato chamado League of Bronze.",
    ligaBronzeUm: "Só 1 Bronze de verdade num campeonato chamado League of Bronze.",
    ligaBronzeVarios: "Só {n} Bronzes de verdade num campeonato chamado League of Bronze.",
    ligaBronzeMuitos: "{n} Bronzes de verdade: o nome do campeonato não mente.",
    ligaJogador: "jogador",
    ligaJogadores: "jogadores",
    ligaDica: "Passe o mouse (ou toque) num lingote para ver quem é.",

    moldesPts: "PTS DE ELENCO",
    moldesSemJogo: "ainda não estreou",
    moldesNota: "Todo mundo saiu do draft com a carteira parecida. O resto é mecânica.",
    moldesLugar: "{n}º na tabela",
    moldesVerTime: "Página do time",
    moldesSeries: "séries",

    pecasNota: "Os {n} mais caros do draft. Preço não é promessa.",
    pecasSelo: "TOP {n} · VALOR DE DRAFT",
    pecasAviso: "QUEBRE COM CUIDADO",
    cartaVirar: "Virar a carta",
    cartaDesvirar: "Voltar para a frente",
    cartaPts: "PTS",
    cartaValor: "VALOR DE DRAFT",
    cartaFicha: "FICHA COMPLETA",
    cartaHolofote: "HOLOFOTE",
    cartaCapitao: "CAPITÃO",
    cartaJogos: "JOGOS",
    cartaVitorias: "VITÓRIAS",
    cartaAbates: "ABATES",
    cartaMortes: "MORTES",
    cartaAssist: "ASSIST.",
    cartaAssinatura: "CAMPEÃO ASSINATURA",
    cartaSemJogo: "Ainda não entrou em jogo nesta edição.",
    cartaAbrir: "Abrir {nick} em destaque",

    canaisNota: "Melhor KDA de cada rota entre quem entrou em jogo. Amostra pequena, ego grande.",

    bigornaJogaram: "{n} DE {total} JÁ ENTRARAM EM JOGO",
    bigornaBanco: "AINDA NO BANCO",
    bigornaTodosJogaram: "TODO O ELENCO JÁ ENTROU EM JOGO",
    bigornaVerTodos: "VER OS {n}",
    bigornaVerMenos: "SÓ O TOPO",
    bigornaInverter: "Inverter a ordem",
    bigornaCriterio: "Critério do ranking",

    arsenalNota: "{n} campeões diferentes em {jogos} jogos.",
    arsenalLider: "Nº 1",
    arsenalVerTodos: "VER TODOS ({n})",
    arsenalVerMenos: "SÓ O TOPO",
    arsenalAbas: "Métrica dos campeões",

    temperaAtropelo: "O ATROPELO",
    temperaEpico: "O ÉPICO",
    temperaMedia: "MÉDIA",
    temperaNota: "{n} jogos com tempo registrado. O mais rápido mal esquentou a cadeira.",
    temperaMin: "min",
    temperaVerPartida: "Ver a partida",

    fechoTitulo: "O BRONZE ESFRIOU.",
    fechoTexto: "A temporada, não. Continue por aqui:",
    fechoJogadores: "JOGADORES",
    fechoJogadoresSub: "As fichas completas",
    fechoTimes: "TIMES",
    fechoTimesSub: "Os elencos e as cores",
    fechoPartidas: "PARTIDAS",
    fechoPartidasSub: "Série a série",
    fechoTabela: "VER COMO TABELA",

    portaSobre: "{edicao} · ESTATÍSTICAS",
    portaTitulo: "A FORJA ESTÁ ACESA",
    portaTexto: "Martelo, brasa e bronze esfriando. Com som fica melhor.",
    portaComSom: "ENTRAR COM SOM",
    portaSemSom: "ENTRAR SEM SOM",
    portaDica: "Dá para mudar depois: tecla M.",

    hudAtos: "Atos da página",
    hudSomLigar: "Ligar o som (M)",
    hudSomDesligar: "Desligar o som (M)",
    hudSomAviso: "CLIQUE PARA O SOM",
    hudVolume: "Volume",
    hudVs: "MODO VS",
    hudTabela: "TABELA",
    hudAtalhos: "← → atos · M som",
    hudAnterior: "Ato anterior (←)",
    hudProximo: "Próximo ato (→)",

    holofoteFechar: "Fechar",
    holofoteVs: "ENFRENTAR…",
    holofoteRanking: "NO RANKING",
    holofoteCampeoes: "CAMPEÕES JOGADOS",
    holofoteAnterior: "Jogador anterior",
    holofoteProximo: "Próximo jogador",
    holofotePosicao: "{n}º",
    holofoteTitulo: "Jogador em destaque",

    vsTitulo: "MODO VS",
    vsEscolha: "ESCOLHA OS DOIS LADOS",
    vsJogadores: "JOGADORES",
    vsTimes: "TIMES",
    vsLadoA: "CANTO ESQUERDO",
    vsLadoB: "CANTO DIREITO",
    vsVazio: "escolha abaixo",
    vsBuscar: "Buscar jogador",
    vsProximas: "PRÓXIMAS SÉRIES",
    vsLutar: "LUTAR",
    vsTrocar: "TROCAR LADOS",
    vsNovo: "NOVO CONFRONTO",
    vsCopiar: "COPIAR LINK",
    vsCopiado: "LINK COPIADO",
    vsVantagem: "{nome} leva em {n} de {total}",
    vsEmpate: "EMPATE TÉCNICO",
    vsConfronto: "CONFRONTO DIRETO",
    vsSemConfronto: "Ainda não se enfrentaram nesta edição.",
    vsProximo: "PRÓXIMO ENCONTRO",
    vsRotaARota: "ROTA A ROTA",
    vsMenosMelhor: "menos é melhor",
    vsSeries: "SÉRIES",
    vsMapas: "JOGOS",
    vsDuracao: "DURAÇÃO MÉDIA",
    vsPosicao: "POSIÇÃO NA TABELA",
    vsFechar: "Fechar o modo VS",

    tabelaTitulo: "ESTATÍSTICAS · TABELA",
    tabelaIntro: "Todos os números da página, crus e sem efeito.",
    tabelaVoltar: "VOLTAR AO ESPETÁCULO",
    tabelaResumo: "RESUMO",
    colJogador: "JOGADOR",
    colTime: "TIME",
    colRota: "ROTA",
    colElo: "ELO",
    colValor: "VALOR",
    colJogos: "JOGOS",
    colVitorias: "VITÓRIAS",
    colAbates: "ABATES",
    colMortes: "MORTES",
    colAssist: "ASSIST.",
    colKda: "KDA",
    colMvps: "MVPS",
    colCampeao: "CAMPEÃO",
    colPicks: "PICKS",
    colBans: "BANS",
    colPresenca: "PRESENÇA",
    colWinrate: "WINRATE",
    colSerie: "SÉRIE",
    colJogo: "JOGO",
    colMinutos: "MIN",
    colVencedor: "VENCEDOR",
    colPts: "PTS",
    colCampanha: "SÉRIES (V–D)",
    colQuantidade: "JOGADORES",
    colConfronto: "CONFRONTO",
    colItem: "ITEM",
    colNumero: "NÚMERO",
  },

  en: {
    sobretitulo: "{edicao} · {jogos} games in the fire",
    lema: "Everything that happened on the Rift, struck in bronze.",
    lema2: "Questionable mechanics. Exact numbers.",
    rolar: "SCROLL TO FORGE",
    atos: {
      fornalha: { numero: "ACT I", nome: "THE FURNACE", sub: "The tournament at a glance" },
      liga: { numero: "ACT II", nome: "THE ALLOY", sub: "Rank distribution" },
      moldes: { numero: "ACT III", nome: "THE MOLDS", sub: "Team strength" },
      pecas: { numero: "ACT IV", nome: "THE RARE PIECES", sub: "Top players by value" },
      canais: { numero: "ACT V", nome: "THE CHANNELS", sub: "Best by role" },
      bigorna: { numero: "ACT VI", nome: "THE ANVIL", sub: "Player rankings" },
      arsenal: { numero: "ACT VII", nome: "THE ARMORY", sub: "Champions" },
      tempera: { numero: "ACT VIII", nome: "THE TEMPERING", sub: "Game length" },
      fecho: { numero: "FINALE", nome: "THE COOLDOWN", sub: "Where to go next" },
    },

    resumoJogadoresNota: "signed up, drafted, out of excuses",
    resumoPoolNota: "draft currency, not skill",
    resumoMediaNota: "the draft balanced the books",
    resumoMonoNotaZero: "zero champion loyalty",
    resumoMonoNota: "loyal until the next nerf",
    resumoFaixa: "{jogos} games · {abates} kills · {series} of {total} series",

    ligaBronzeZero: "Not a single real Bronze in a tournament called League of Bronze.",
    ligaBronzeUm: "Only 1 real Bronze in a tournament called League of Bronze.",
    ligaBronzeVarios: "Only {n} real Bronzes in a tournament called League of Bronze.",
    ligaBronzeMuitos: "{n} real Bronzes: the tournament's name doesn't lie.",
    ligaJogador: "player",
    ligaJogadores: "players",
    ligaDica: "Hover (or tap) an ingot to see who's in it.",

    moldesPts: "ROSTER PTS",
    moldesSemJogo: "yet to debut",
    moldesNota: "Everyone left the draft with a similar wallet. The rest is mechanics.",
    moldesLugar: "#{n} in the standings",
    moldesVerTime: "Team page",
    moldesSeries: "series",

    pecasNota: "The {n} priciest picks of the draft. Price is not a promise.",
    pecasSelo: "TOP {n} · DRAFT VALUE",
    pecasAviso: "BREAK WITH CARE",
    cartaVirar: "Flip the card",
    cartaDesvirar: "Back to the front",
    cartaPts: "PTS",
    cartaValor: "DRAFT VALUE",
    cartaFicha: "FULL PROFILE",
    cartaHolofote: "SPOTLIGHT",
    cartaCapitao: "CAPTAIN",
    cartaJogos: "GAMES",
    cartaVitorias: "WINS",
    cartaAbates: "KILLS",
    cartaMortes: "DEATHS",
    cartaAssist: "ASSISTS",
    cartaAssinatura: "SIGNATURE CHAMPION",
    cartaSemJogo: "Hasn't played yet this edition.",
    cartaAbrir: "Put {nick} in the spotlight",

    canaisNota: "Best KDA in each role among those who played. Small sample, big ego.",

    bigornaJogaram: "{n} OF {total} HAVE PLAYED",
    bigornaBanco: "STILL ON THE BENCH",
    bigornaTodosJogaram: "THE WHOLE ROSTER HAS PLAYED",
    bigornaVerTodos: "SHOW ALL {n}",
    bigornaVerMenos: "TOP ONLY",
    bigornaInverter: "Reverse the order",
    bigornaCriterio: "Ranking criterion",

    arsenalNota: "{n} different champions in {jogos} games.",
    arsenalLider: "No. 1",
    arsenalVerTodos: "SHOW ALL ({n})",
    arsenalVerMenos: "TOP ONLY",
    arsenalAbas: "Champion metric",

    temperaAtropelo: "THE STOMP",
    temperaEpico: "THE EPIC",
    temperaMedia: "AVERAGE",
    temperaNota: "{n} games with a recorded time. The fastest barely warmed the chair.",
    temperaMin: "min",
    temperaVerPartida: "See the match",

    fechoTitulo: "THE BRONZE HAS COOLED.",
    fechoTexto: "The season hasn't. Keep going:",
    fechoJogadores: "PLAYERS",
    fechoJogadoresSub: "Full profiles",
    fechoTimes: "TEAMS",
    fechoTimesSub: "Rosters and colours",
    fechoPartidas: "MATCHES",
    fechoPartidasSub: "Series by series",
    fechoTabela: "VIEW AS TABLE",

    portaSobre: "{edicao} · STATS",
    portaTitulo: "THE FORGE IS LIT",
    portaTexto: "Hammer, embers and cooling bronze. It's better with sound.",
    portaComSom: "ENTER WITH SOUND",
    portaSemSom: "ENTER WITHOUT SOUND",
    portaDica: "You can change it later: press M.",

    hudAtos: "Page acts",
    hudSomLigar: "Turn sound on (M)",
    hudSomDesligar: "Turn sound off (M)",
    hudSomAviso: "CLICK FOR SOUND",
    hudVolume: "Volume",
    hudVs: "VS MODE",
    hudTabela: "TABLE",
    hudAtalhos: "← → acts · M sound",
    hudAnterior: "Previous act (←)",
    hudProximo: "Next act (→)",

    holofoteFechar: "Close",
    holofoteVs: "FACE OFF…",
    holofoteRanking: "IN THE RANKINGS",
    holofoteCampeoes: "CHAMPIONS PLAYED",
    holofoteAnterior: "Previous player",
    holofoteProximo: "Next player",
    holofotePosicao: "#{n}",
    holofoteTitulo: "Player in the spotlight",

    vsTitulo: "VS MODE",
    vsEscolha: "PICK BOTH SIDES",
    vsJogadores: "PLAYERS",
    vsTimes: "TEAMS",
    vsLadoA: "LEFT CORNER",
    vsLadoB: "RIGHT CORNER",
    vsVazio: "pick below",
    vsBuscar: "Search player",
    vsProximas: "UPCOMING SERIES",
    vsLutar: "FIGHT",
    vsTrocar: "SWAP SIDES",
    vsNovo: "NEW MATCHUP",
    vsCopiar: "COPY LINK",
    vsCopiado: "LINK COPIED",
    vsVantagem: "{nome} leads {n} of {total}",
    vsEmpate: "DEAD HEAT",
    vsConfronto: "HEAD TO HEAD",
    vsSemConfronto: "They haven't met yet this edition.",
    vsProximo: "NEXT MEETING",
    vsRotaARota: "LANE BY LANE",
    vsMenosMelhor: "fewer is better",
    vsSeries: "SERIES",
    vsMapas: "GAMES",
    vsDuracao: "AVG GAME LENGTH",
    vsPosicao: "STANDINGS",
    vsFechar: "Close VS mode",

    tabelaTitulo: "STATS · TABLE",
    tabelaIntro: "Every number on the page, raw, no effects.",
    tabelaVoltar: "BACK TO THE SHOW",
    tabelaResumo: "SUMMARY",
    colJogador: "PLAYER",
    colTime: "TEAM",
    colRota: "ROLE",
    colElo: "RANK",
    colValor: "VALUE",
    colJogos: "GAMES",
    colVitorias: "WINS",
    colAbates: "KILLS",
    colMortes: "DEATHS",
    colAssist: "ASSISTS",
    colKda: "KDA",
    colMvps: "MVPS",
    colCampeao: "CHAMPION",
    colPicks: "PICKS",
    colBans: "BANS",
    colPresenca: "PRESENCE",
    colWinrate: "WIN RATE",
    colSerie: "SERIES",
    colJogo: "GAME",
    colMinutos: "MIN",
    colVencedor: "WINNER",
    colPts: "PTS",
    colCampanha: "SERIES (W–L)",
    colQuantidade: "PLAYERS",
    colConfronto: "MATCHUP",
    colItem: "ITEM",
    colNumero: "NUMBER",
  },
});
