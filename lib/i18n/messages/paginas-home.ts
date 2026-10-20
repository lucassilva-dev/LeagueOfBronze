import { definir } from "@/lib/i18n/definir";

/**
 * Textos fixos da home, da listagem/ficha de times e da listagem/ficha de jogadores.
 *
 * Só entra aqui o que é texto de interface. Nome de time, Riot ID, nome de jogador e nome de
 * campeão vêm do dataset e continuam iguais nos dois idiomas.
 *
 * As chaves com `{n}` são preenchidas com `.replace("{n}", ...)` na página. `{temporada}` é
 * o nome da temporada no ar (`dataset.tournament.name`, ex.: "4ª Edição"): o número da
 * edição sai do dataset, e não daqui — texto que crava "3ª" fica velho calado na edição
 * seguinte. Datas também não moram aqui: vêm das séries ou de lib/calendario-4a.ts.
 */
export const paginasHome = definir({
  pt: {
    // ---------- compartilhado pelas três áreas ----------
    edicaoSobretitulo: "League of Bronze — {temporada}",
    ptsDraft: "PTS DRAFT",
    capitao: "◆ CAPITÃO",
    ficha: "FICHA →",

    // ---------- home · hero ----------
    homeSobretitulo: "Campeonato amador de League of Legends",
    homeTituloLinha1: "{temporada}",
    homeTituloLinha2: "LEAGUE OF BRONZE",
    // `{periodo}` vem pronto de periodoPorExtenso(): "de 20 a 29 de novembro".
    homeIntro:
      "Onde o low elo é o protagonista. {times} times forjados no draft, {jogadores} feras do Ferro ao Mestre e uma taça em disputa — {periodo}.",
    homeIntroSemPeriodo:
      "Onde o low elo é o protagonista. {times} times forjados no draft, {jogadores} feras do Ferro ao Mestre e uma taça em disputa.",
    // {dia1}/{dia2} = só o dia ("20"); {diaMes1}/{diaMes2} = dia e mês ("20 de novembro").
    homePeriodoMesmoMes: "de {dia1} a {diaMes2}",
    homePeriodoMesesDiferentes: "de {diaMes1} a {diaMes2}",
    homePeriodoUmDia: "em {diaMes1}",
    homeBotaoTimes: "VER OS TIMES →",
    homeBotaoJogadores: "JOGADORES",
    homeBotaoCalendario: "CALENDÁRIO",
    homePilulaFase: "PONTOS CORRIDOS · MD3",
    homePilulaSemifinais: "SEMIFINAIS · MD3",
    homePilulaFinal: "GRANDE FINAL · MD5",
    homePilulaPool: "POOL DE {n} PONTOS",

    // ---------- home · campeão / grande final ----------
    homeCampeaoSobretitulo: "CAMPEÃO · {temporada}",
    homeCampeaoAntes: "Levantou a taça vencendo ",
    homeCampeaoMeio: " por ",
    homeCampeaoDepois: " na Grande Final.",
    homeCampeaoMvp: "MVP DA FINAL",
    homeCampeaoVerFinal: "VER A FINAL →",
    homeFinalSobretitulo: "A GRANDE FINAL",
    // Temporada SEM semifinal (como a 3ª): a final é 1º x 2º da tabela.
    homeFinalPrimeiro: "1º",
    homeFinalPrimeiroLabel: "1º COLOCADO",
    homeFinalSegundo: "2º",
    homeFinalSegundoLabel: "2º COLOCADO",
    // Temporada COM semifinal (a 4ª: 1º x 4º e 2º x 3º): a final é entre os vencedores.
    homeFinalSemi1: "S1",
    homeFinalSemi1Label: "VENCEDOR DA SEMI 1",
    homeFinalSemi2: "S2",
    homeFinalSemi2Label: "VENCEDOR DA SEMI 2",
    homeFinalVs: "VS",
    homeFinalMelhorDe5: "MELHOR DE 5",
    // {data} = "29 DE NOVEMBRO"; {hora} = "14:30" (Brasília). Vêm da série da final ou do calendário oficial.
    homeFinalData: "{data} · {hora}",

    // ---------- home · números ----------
    homeNumTimes: "TIMES",
    homeNumJogadores: "JOGADORES",
    homeNumConfrontos: "CONFRONTOS",
    homeNumDias: "DIAS DE JOGO",

    // ---------- home · explore ----------
    homeExploreTitulo: "EXPLORE O CAMPEONATO",
    homeExploreTimes: "TIMES",
    homeExploreTimesDesc: "Os {n} elencos e seus lineups completos.",
    homeExploreJogadores: "JOGADORES",
    homeExploreJogadoresDesc: "Os inscritos, do Ferro ao Mestre.",
    homeExploreCalendario: "CALENDÁRIO",
    homeExploreCalendarioDesc: "Pontos corridos em MD3, semifinais e a Grande Final em MD5.",
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
    timesIntro: "Elencos forjados no draft por pontos. Só um levanta a taça na Grande Final.",
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
    edicaoSobretitulo: "League of Bronze — {temporada}",
    ptsDraft: "DRAFT PTS",
    capitao: "◆ CAPTAIN",
    ficha: "PROFILE →",

    // ---------- home · hero ----------
    homeSobretitulo: "Amateur League of Legends tournament",
    homeTituloLinha1: "LEAGUE OF BRONZE",
    homeTituloLinha2: "{temporada}",
    homeIntro:
      "Where low elo takes the spotlight. {times} teams forged in the draft, {jogadores} players from Iron to Master and one trophy on the line — {periodo}.",
    homeIntroSemPeriodo:
      "Where low elo takes the spotlight. {times} teams forged in the draft, {jogadores} players from Iron to Master and one trophy on the line.",
    homePeriodoMesmoMes: "from {diaMes1} to {dia2}",
    homePeriodoMesesDiferentes: "from {diaMes1} to {diaMes2}",
    homePeriodoUmDia: "on {diaMes1}",
    homeBotaoTimes: "VIEW THE TEAMS →",
    homeBotaoJogadores: "PLAYERS",
    homeBotaoCalendario: "SCHEDULE",
    homePilulaFase: "GROUP STAGE · BO3",
    homePilulaSemifinais: "SEMIFINALS · BO3",
    homePilulaFinal: "GRAND FINAL · BO5",
    homePilulaPool: "{n}-POINT DRAFT POOL",

    // ---------- home · campeão / grande final ----------
    homeCampeaoSobretitulo: "CHAMPION · {temporada}",
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
    homeFinalSemi1: "S1",
    homeFinalSemi1Label: "SEMI 1 WINNER",
    homeFinalSemi2: "S2",
    homeFinalSemi2Label: "SEMI 2 WINNER",
    homeFinalVs: "VS",
    homeFinalMelhorDe5: "BEST OF 5",
    homeFinalData: "{data} · {hora}",

    // ---------- home · números ----------
    homeNumTimes: "TEAMS",
    homeNumJogadores: "PLAYERS",
    homeNumConfrontos: "MATCHUPS",
    homeNumDias: "MATCH DAYS",

    // ---------- home · explore ----------
    homeExploreTitulo: "EXPLORE THE TOURNAMENT",
    homeExploreTimes: "TEAMS",
    homeExploreTimesDesc: "All {n} rosters and their full lineups.",
    homeExploreJogadores: "PLAYERS",
    homeExploreJogadoresDesc: "Every player on the list, from Iron to Master.",
    homeExploreCalendario: "SCHEDULE",
    homeExploreCalendarioDesc: "Bo3 round robin, semifinals and the Bo5 Grand Final.",
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
    timesIntro: "Rosters forged in the points draft. Only one lifts the trophy in the Grand Final.",
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

/**
 * O campeonato é jogado no horário de Brasília, e é nele que as datas aparecem — de onde
 * quer que a pessoa esteja lendo (o mesmo critério de lib/format.ts).
 */
const FUSO_DO_CAMPEONATO = "America/Sao_Paulo";

/** "20 de novembro" / "November 20". `dateKey` é "YYYY-MM-DD", já no calendário de Brasília. */
export function diaEMes(dateKey: string, localeTag: string): string {
  // Meio-dia, e não meia-noite: longe das duas viradas de dia, nenhum fuso troca a data.
  const data = new Date(`${dateKey}T12:00:00-03:00`);
  if (Number.isNaN(data.getTime())) return dateKey;
  return new Intl.DateTimeFormat(localeTag, { day: "numeric", month: "long", timeZone: FUSO_DO_CAMPEONATO }).format(data);
}

/** "14:30" em português, "2:30 PM" em inglês, a partir de "HH:mm" já em Brasília. */
export function horaNoIdioma(dateKey: string, hora: string, localeTag: string): string {
  const data = new Date(`${dateKey}T${hora}:00-03:00`);
  if (Number.isNaN(data.getTime())) return hora;
  return new Intl.DateTimeFormat(localeTag, {
    hour: "numeric",
    minute: "2-digit",
    hourCycle: localeTag === "pt-BR" ? "h23" : "h12",
    timeZone: FUSO_DO_CAMPEONATO,
  }).format(data);
}

/**
 * "de 20 a 29 de novembro" / "from November 20 to 29" — o período de uma temporada, do
 * primeiro ao último dia de jogo ("YYYY-MM-DD", em Brasília).
 */
export function periodoPorExtenso(t: PaginasHomeTextos, inicio: string, fim: string, localeTag: string): string {
  const molde =
    inicio === fim
      ? t.homePeriodoUmDia
      : inicio.slice(0, 7) === fim.slice(0, 7)
        ? t.homePeriodoMesmoMes
        : t.homePeriodoMesesDiferentes;
  return molde
    .replace("{dia1}", String(Number(inicio.slice(8, 10))))
    .replace("{dia2}", String(Number(fim.slice(8, 10))))
    .replace("{diaMes1}", diaEMes(inicio, localeTag))
    .replace("{diaMes2}", diaEMes(fim, localeTag));
}
