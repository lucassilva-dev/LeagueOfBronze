import { definir } from "@/lib/i18n/definir";

/**
 * Textos fixos da home, da listagem/ficha de times e da listagem/ficha de jogadores.
 *
 * Só entra aqui o que é texto de interface. Nome de time, Riot ID, nome de jogador e nome de
 * campeão vêm do dataset e continuam iguais nos dois idiomas.
 *
 * As chaves com `{n}` são preenchidas com `.replace("{n}", ...)` na página.
 */
export const paginasHome = definir({
  pt: {
    // ---------- compartilhado pelas três áreas ----------
    edicaoSobretitulo: "League of Bronze — 3ª Edição",
    ptsDraft: "PTS DRAFT",
    capitao: "◆ CAPITÃO",
    ficha: "FICHA →",

    // ---------- home · hero ----------
    homeSobretitulo: "Campeonato amador de League of Legends",
    homeTituloLinha1: "3ª EDIÇÃO",
    homeTituloLinha2: "LEAGUE OF BRONZE",
    homeIntro:
      "Onde o low elo é o protagonista. Seis times forjados no draft, trinta feras do Ferro ao Mestre e uma taça em disputa — de 25 de julho a 02 de agosto.",
    homeBotaoTimes: "VER OS TIMES →",
    homeBotaoJogadores: "JOGADORES",
    homeBotaoCalendario: "CALENDÁRIO",
    homePilulaFase: "PONTOS CORRIDOS · MD3",
    homePilulaFinal: "GRANDE FINAL · MD5",
    homePilulaPool: "POOL DE {n} PONTOS",

    // ---------- home · campeão / grande final ----------
    homeCampeaoSobretitulo: "CAMPEÃO DA 3ª EDIÇÃO",
    homeCampeaoAntes: "Levantou a taça vencendo ",
    homeCampeaoMeio: " por ",
    homeCampeaoDepois: " na Grande Final.",
    homeCampeaoMvp: "MVP DA FINAL",
    homeCampeaoVerFinal: "VER A FINAL →",
    homeFinalSobretitulo: "A GRANDE FINAL",
    homeFinalPrimeiro: "1º",
    homeFinalPrimeiroLabel: "1º COLOCADO",
    homeFinalSegundo: "2º",
    homeFinalSegundoLabel: "2º COLOCADO",
    homeFinalVs: "VS",
    homeFinalMelhorDe5: "MELHOR DE 5",
    homeFinalData: "02 DE AGOSTO · 14:00",

    // ---------- home · números ----------
    homeNumTimes: "TIMES",
    homeNumJogadores: "JOGADORES",
    homeNumConfrontos: "CONFRONTOS",
    homeNumDias: "DIAS DE JOGO",

    // ---------- home · explore ----------
    homeExploreTitulo: "EXPLORE O CAMPEONATO",
    homeExploreTimes: "TIMES",
    homeExploreTimesDesc: "Os 6 elencos e seus lineups completos.",
    homeExploreJogadores: "JOGADORES",
    homeExploreJogadoresDesc: "Os inscritos, do Ferro ao Mestre.",
    homeExploreCalendario: "CALENDÁRIO",
    homeExploreCalendarioDesc: "15 confrontos + a Grande Final em MD5.",
    homeExploreTabela: "TABELA",
    homeExploreTabelaDesc: "A classificação da fase de pontos corridos.",
    homeExploreStats: "ESTATÍSTICAS",
    homeExploreStatsDesc: "Rankings de jogadores e campeões.",
    homeExploreCartas: "CARTAS",
    homeExploreCartasDesc: "As cartinhas surpresa que viram o jogo.",
    homeExploreRegras: "REGRAS",
    homeExploreRegrasDesc: "Formato, draft por pontos e regulamento.",

    // ---------- home · abertura ----------
    homeAbertura: "ABERTURA",
    homeVerCalendario: "VER CALENDÁRIO COMPLETO →",
    homeJogo: "JOGO",
    homeFinalizado: "✓ FINALIZADO",
    homeMd3: "MD3",
    turnoMatutino: "Matutino",
    turnoVespertino: "Vespertino",
    turnoNoturno: "Noturno",

    // ---------- times ----------
    timesTitulo: "TIMES",
    timesIntro:
      "Seis elencos forjados no draft por pontos. Só um levanta a taça no dia 02 de agosto.",
    timesSecao: "OS {n} TIMES",
    timesDica: "CLIQUE EM VER ELENCO PARA ABRIR O LINEUP",
    timesCapitaoCurto: "◆ CAP",
    timesCampanha: "CAMPANHA",
    timesVitoriasCurto: "V",
    timesDerrotasCurto: "D",
    timesPontosCurto: "PTS",
    timesSemSeries: "sem séries",
    timesVerElenco: "VER ELENCO →",

    // ---------- time · elenco ----------
    timeVoltar: "← VOLTAR AOS TIMES",
    timeElencoOficial: "ELENCO OFICIAL",
    timePtsElenco: "PTS DE ELENCO",

    // ---------- jogadores ----------
    jogadoresTitulo: "JOGADORES",
    jogadoresIntro:
      "Trinta feras do low elo, do Ferro ao Mestre — escolhidas a peso de ouro no draft por pontos.",
    jogadoresInscritos: "{n} INSCRITOS",
    jogadoresRotas: "5 ROTAS",
    jogadoresContagem: "JOGADORES",
    jogadorVoltar: "← VOLTAR AO ELENCO",
    jogadorPerformance: "PERFORMANCE NO CAMPEONATO",
    jogadorNota:
      "As estatísticas de performance zeram no apito inicial e são atualizadas a cada rodada do campeonato.",
    jogadorFechar: "Fechar",

    // ---------- tiles de performance ----------
    statPartidas: "PARTIDAS",
    statVitorias: "VITÓRIAS",
    statAbates: "ABATES",
    statMortes: "MORTES",
    statAssistencias: "ASSIST.",
    statKda: "KDA",
    statMvps: "MVPs",
    statWinrate: "WINRATE",

    // ---------- rotas ----------
    rotaTop: "Topo",
    rotaSel: "Selva",
    rotaMid: "Meio",
    rotaAdc: "Atirador",
    rotaSup: "Suporte",
    rotaCurtoTop: "TOP",
    rotaCurtoSel: "SEL",
    rotaCurtoMid: "MID",
    rotaCurtoAdc: "ADC",
    rotaCurtoSup: "SUP",

    // ---------- elos ----------
    eloFerro: "Ferro",
    eloBronze: "Bronze",
    eloPrata: "Prata",
    eloOuro: "Ouro",
    eloPlatina: "Platina",
    eloEsmeralda: "Esmeralda",
    eloDiamante: "Diamante",
    eloMestre: "Mestre",
    eloGraoMestre: "Grão-Mestre",
    eloDesafiante: "Desafiante",
  },
  en: {
    // ---------- compartilhado pelas três áreas ----------
    edicaoSobretitulo: "League of Bronze — 3rd Edition",
    ptsDraft: "DRAFT PTS",
    capitao: "◆ CAPTAIN",
    ficha: "PROFILE →",

    // ---------- home · hero ----------
    homeSobretitulo: "Amateur League of Legends tournament",
    homeTituloLinha1: "LEAGUE OF BRONZE",
    homeTituloLinha2: "3RD EDITION",
    homeIntro:
      "Where low elo takes the spotlight. Six teams forged in the draft, thirty players from Iron to Master and one trophy on the line — from July 25 to August 2.",
    homeBotaoTimes: "VIEW THE TEAMS →",
    homeBotaoJogadores: "PLAYERS",
    homeBotaoCalendario: "SCHEDULE",
    homePilulaFase: "GROUP STAGE · BO3",
    homePilulaFinal: "GRAND FINAL · BO5",
    homePilulaPool: "{n}-POINT DRAFT POOL",

    // ---------- home · campeão / grande final ----------
    homeCampeaoSobretitulo: "3RD EDITION CHAMPION",
    homeCampeaoAntes: "Lifted the trophy by beating ",
    homeCampeaoMeio: " ",
    homeCampeaoDepois: " in the Grand Final.",
    homeCampeaoMvp: "FINAL MVP",
    homeCampeaoVerFinal: "VIEW THE FINAL →",
    homeFinalSobretitulo: "THE GRAND FINAL",
    homeFinalPrimeiro: "1ST",
    homeFinalPrimeiroLabel: "1ST SEED",
    homeFinalSegundo: "2ND",
    homeFinalSegundoLabel: "2ND SEED",
    homeFinalVs: "VS",
    homeFinalMelhorDe5: "BEST OF 5",
    homeFinalData: "AUGUST 2 · 2:00 PM",

    // ---------- home · números ----------
    homeNumTimes: "TEAMS",
    homeNumJogadores: "PLAYERS",
    homeNumConfrontos: "MATCHUPS",
    homeNumDias: "MATCH DAYS",

    // ---------- home · explore ----------
    homeExploreTitulo: "EXPLORE THE TOURNAMENT",
    homeExploreTimes: "TEAMS",
    homeExploreTimesDesc: "All 6 rosters and their full lineups.",
    homeExploreJogadores: "PLAYERS",
    homeExploreJogadoresDesc: "Every player on the list, from Iron to Master.",
    homeExploreCalendario: "SCHEDULE",
    homeExploreCalendarioDesc: "15 matchups + the Grand Final in Bo5.",
    homeExploreTabela: "STANDINGS",
    homeExploreTabelaDesc: "The group stage table.",
    homeExploreStats: "STATS",
    homeExploreStatsDesc: "Player and champion rankings.",
    homeExploreCartas: "CARDS",
    homeExploreCartasDesc: "The surprise wildcards that swing games.",
    homeExploreRegras: "RULES",
    homeExploreRegrasDesc: "Format, points draft and rulebook.",

    // ---------- home · abertura ----------
    homeAbertura: "OPENING DAY",
    homeVerCalendario: "VIEW FULL SCHEDULE →",
    homeJogo: "GAME",
    homeFinalizado: "✓ FINAL",
    homeMd3: "BO3",
    turnoMatutino: "Morning",
    turnoVespertino: "Afternoon",
    turnoNoturno: "Night",

    // ---------- times ----------
    timesTitulo: "TEAMS",
    timesIntro: "Six rosters forged in the points draft. Only one lifts the trophy on August 2.",
    timesSecao: "THE {n} TEAMS",
    timesDica: "CLICK VIEW ROSTER TO OPEN THE LINEUP",
    timesCapitaoCurto: "◆ CAPT",
    timesCampanha: "RECORD",
    timesVitoriasCurto: "W",
    timesDerrotasCurto: "L",
    timesPontosCurto: "PTS",
    timesSemSeries: "no series yet",
    timesVerElenco: "VIEW ROSTER →",

    // ---------- time · elenco ----------
    timeVoltar: "← BACK TO TEAMS",
    timeElencoOficial: "OFFICIAL ROSTER",
    timePtsElenco: "ROSTER PTS",

    // ---------- jogadores ----------
    jogadoresTitulo: "PLAYERS",
    jogadoresIntro:
      "Thirty low-elo legends, from Iron to Master — picked at a premium in the points draft.",
    jogadoresInscritos: "{n} REGISTERED",
    jogadoresRotas: "5 ROLES",
    jogadoresContagem: "PLAYERS",
    jogadorVoltar: "← BACK TO ROSTER",
    jogadorPerformance: "TOURNAMENT PERFORMANCE",
    jogadorNota:
      "Performance stats start from zero at kickoff and are updated after every round of the tournament.",
    jogadorFechar: "Close",

    // ---------- tiles de performance ----------
    statPartidas: "GAMES",
    statVitorias: "WINS",
    statAbates: "KILLS",
    statMortes: "DEATHS",
    statAssistencias: "ASSISTS",
    statKda: "KDA",
    statMvps: "MVPs",
    statWinrate: "WIN RATE",

    // ---------- rotas ----------
    rotaTop: "Top",
    rotaSel: "Jungle",
    rotaMid: "Mid",
    rotaAdc: "Bot/ADC",
    rotaSup: "Support",
    rotaCurtoTop: "TOP",
    rotaCurtoSel: "JG",
    rotaCurtoMid: "MID",
    rotaCurtoAdc: "ADC",
    rotaCurtoSup: "SUP",

    // ---------- elos ----------
    eloFerro: "Iron",
    eloBronze: "Bronze",
    eloPrata: "Silver",
    eloOuro: "Gold",
    eloPlatina: "Platinum",
    eloEsmeralda: "Emerald",
    eloDiamante: "Diamond",
    eloMestre: "Master",
    eloGraoMestre: "Grandmaster",
    eloDesafiante: "Challenger",
  },
});

/**
 * Formato do bloco — usado para passar os textos a componentes client por prop.
 *
 * As chaves vêm do português (fonte da verdade), mas os valores são alargados para `string`:
 * o `const` do `definir` transforma cada texto num tipo literal, e sem alargar nem o bloco em
 * inglês nem o objeto devolvido por getMessages() seriam atribuíveis a este tipo.
 */
export type PaginasHomeTextos = {
  readonly [K in keyof (typeof paginasHome)["pt"]]: string;
};

/** Rótulo da rota (Topo/Selva/...) traduzido, a partir da sigla do design system. */
export function rotaLabel(t: PaginasHomeTextos, short: string, padrao: string) {
  const mapa: Record<string, string> = {
    TOP: t.rotaTop,
    SEL: t.rotaSel,
    MID: t.rotaMid,
    ADC: t.rotaAdc,
    SUP: t.rotaSup,
  };
  return mapa[short] ?? padrao;
}

/** Sigla da rota traduzida (SEL vira JG em inglês). */
export function rotaCurto(t: PaginasHomeTextos, short: string) {
  const mapa: Record<string, string> = {
    TOP: t.rotaCurtoTop,
    SEL: t.rotaCurtoSel,
    MID: t.rotaCurtoMid,
    ADC: t.rotaCurtoAdc,
    SUP: t.rotaCurtoSup,
  };
  return mapa[short] ?? short;
}

/** Rótulo do elo traduzido, a partir da chave do design system. */
export function eloLabel(t: PaginasHomeTextos, key: string | undefined, padrao: string) {
  if (!key) return padrao;
  const mapa: Record<string, string> = {
    ferro: t.eloFerro,
    bronze: t.eloBronze,
    prata: t.eloPrata,
    ouro: t.eloOuro,
    platina: t.eloPlatina,
    esmeralda: t.eloEsmeralda,
    diamante: t.eloDiamante,
    mestre: t.eloMestre,
    "grao-mestre": t.eloGraoMestre,
    desafiante: t.eloDesafiante,
  };
  return mapa[key] ?? padrao;
}

/** Turno do dia ("Matutino"/"Vespertino"/"Noturno") vindo de lib/calendar. */
export function turnoLabel(t: PaginasHomeTextos, turno: string) {
  const mapa: Record<string, string> = {
    Matutino: t.turnoMatutino,
    Vespertino: t.turnoVespertino,
    Noturno: t.turnoNoturno,
  };
  return mapa[turno] ?? turno;
}
