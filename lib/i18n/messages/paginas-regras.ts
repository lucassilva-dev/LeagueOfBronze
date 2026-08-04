import { definir } from "@/lib/i18n/definir";

/**
 * Textos das páginas de Regras (regulamento oficial) e Temporadas (arquivo histórico).
 *
 * O regulamento é a página mais lida por quem avalia o campeonato de fora — inclusive a
 * Riot Games — então a inscrição, a premiação e a frase de "100% das inscrições vira
 * premiação" estão escritas de forma explícita nos dois idiomas. Os valores em R$ são os
 * mesmos em pt e en de propósito: é dinheiro real, em reais, e converter confundiria.
 */
const pt = {
  // ---------- app/regras: cabeçalho ----------
  regrasSobretitulo: "Regulamento oficial",
  regrasTitulo: "REGRAS",
  regrasSubtitulo:
    "Tudo que rege a 3ª Edição dos Bronzes — formato, draft por pontos, conduta e as cartinhas surpresa.",

  // ---------- app/regras: ficha rápida ----------
  fichaTitulo: "FICHA RÁPIDA",
  fichaInscricaoK: "INSCRIÇÃO",
  fichaInscricaoV: "R$ 20,00 por pessoa",
  fichaPremio1K: "PREMIAÇÃO 1º",
  fichaPremio1V: "R$ 420,00 · R$ 84,00 por jogador",
  fichaPremio2K: "PREMIAÇÃO 2º",
  fichaPremio2V: "R$ 180,00 · R$ 36,00 por jogador",
  fichaModalidadeK: "MODALIDADE",
  fichaModalidadeV: "5v5 · Summoner’s Rift",
  fichaFormacaoK: "FORMAÇÃO",
  fichaFormacaoV: "Draft — capitães são os mids",
  fichaFaseK: "FASE DE PONTOS",
  fichaFaseV: "Melhor de 3 (MD3)",
  fichaFinalK: "GRANDE FINAL",
  fichaFinalV: "Melhor de 5 (MD5)",
  fichaDatasK: "DATAS",
  fichaDatasV: "25–26/07 e 01–02/08",
  fichaTurnosK: "TURNOS",
  fichaTurnosV: "Matutino 9h · Vespertino 14h",
  fichaOrcamentoK: "ORÇAMENTO",
  fichaOrcamentoV: "30 pontos por capitão",

  // ---------- app/regras: regras gerais ----------
  regrasGeraisTitulo: "REGRAS GERAIS",
  regraA: "Apenas gente do grupo do WhatsApp/Discord — nada de estranhos desconhecidos.",
  regraB: "Vínculo obrigatório da conta com o Discord.",
  regraC: "Capitães montam o time pelo draft e pelos valores de elo.",
  regraD: "É preciso ter feito a MD5 da fila solo/duo para participar.",
  regraE: "Mínimo de 5 partidas nos últimos 30 dias.",
  regraF: "Conta smurf não é aceita.",
  regraG: "Substituições só com jogadores do próprio grupo — ninguém é obrigado a aceitar.",
  regraH: "Não apareceu na hora ou no dia do jogo: W.O.",
  regraI: "Tolerância de 10 minutos na SÉRIE (MD3), não por partida.",
  regraJ: "Proibido trocar confrontos, adiar ou adiantar jogos.",
  regraK:
    "O capitão pode trocar a lane de dois jogadores na série; eles só voltam à lane original após um jogo.",
  regraL: "Check-in no Discord até 10 minutos antes do horário marcado.",
  regraM: "Informe o nick/ID antes do torneio — trocar de conta sem aviso desclassifica a partida.",
  regraN: "Conta da Riot vinculada ao Discord antes do início do torneio.",
  regraO: "Lado (blue/red): sorteio no 1º jogo; depois escolhe quem perdeu.",
  regraP: "Fair play: ofensa, discurso de ódio ou griefing geram punição até desclassificação.",
  regraQ: "Queda de conexão não pausa nem invalida o jogo.",
  regraR: "O capitão vencedor envia o print do resultado no Discord em até 15 minutos.",
  regraS: "Ao participar, você autoriza o uso da sua imagem/nick em transmissões.",
  regraT: "A organização pode ajustar o regulamento antes do início, com aviso no Discord.",
  regraU: "Empate na tabela: confronto direto → saldo de mapas → sorteio.",
  regraV: "Uso do canal de voz oficial obrigatório durante as partidas.",

  // ---------- app/regras: draft por pontos ----------
  draftTitulo: "FORMAÇÃO & DRAFT POR PONTOS",
  draft1:
    "Os 6 capitães são os 6 midlaners — o Mid é a cabeça do time. O sorteio define qual time cada um capitaneia.",
  draft2: "Cada capitão tem 30 pontos de orçamento (o valor do próprio capitão já entra na conta).",
  draft3: "O draft tem 4 rodadas: Topo, Selva, Atirador e Suporte.",
  draft4: "A ordem de escolha é serpentina (1-2-3-4-5-6-6-5-4-3-2-1).",
  draft5: "Jogador escolhido não pode ser pego por outro time.",
  draft6: "Pool total de 156 pontos — média de 26 por time.",

  // ---------- app/regras: valores por elo ----------
  eloTitulo: "VALORES POR ELO",
  eloOrcamentoPre: "Orçamento de",
  eloOrcamentoValor: "30 pontos",
  eloOrcamentoMeio: "por capitão · pool total de",
  eloPoolValor: "156 pontos",

  // ---------- app/regras: pontuação ----------
  pontuacaoTitulo: "PONTUAÇÃO & DESEMPATE",
  pontuacao1: "Vitória na série (MD3) = 3 pontos · Derrota = 0.",
  pontuacao2: "Critério de desempate: 1º confronto direto, 2º saldo de mapas, 3º sorteio.",
  pontuacao3: "Os 2 primeiros da fase de pontos avançam para a Grande Final em MD5.",
  pontuacao4:
    "100% das inscrições vira premiação: R$ 600,00 arrecadados (30 × R$ 20,00) e R$ 600,00 distribuídos — R$ 420,00 ao campeão e R$ 180,00 ao vice, divididos igualmente entre os 5 jogadores de cada time. A organização não retém nenhum valor.",

  // ---------- app/regras: cartinhas ----------
  cartasTitulo: "CARTINHAS SURPRESA",
  cartaIntro:
    "Em cada série (MD3), cada capitão pode optar por sortear — ou não — uma cartinha surpresa, usável em qualquer partida da série a seu critério. Se optar por usar, a carta é sorteada publicamente e ao vivo, com os dois times acompanhando, antes da fase de pick & ban da partida escolhida, e o efeito vale apenas para aquela partida. Máximo de 1 cartinha por capitão por série.",
  cartaIntro2:
    "Se só um capitão usa, o sorteio vale entre as 6 cartinhas individuais (A–F) e afeta apenas o time adversário. Quando os DOIS capitães usam na mesma partida, entram no sorteio também as 2 cartinhas duplas — cujo efeito atinge os dois times — passando a valer entre as 8 cartas, sorteada uma única vez. Toda escolha exigida por uma carta é feita na hora e informada à organização, que tem a palavra final.",
  cartasIndividuaisLabel: "CARTINHAS INDIVIDUAIS · A–F",
  cartasDuplasLabel: "CARTINHAS DUPLAS · SÓ QUANDO OS 2 CAPITÃES USAM",

  // ---------- app/temporadas: lista ----------
  temporadasBadge: "Histórico",
  temporadasTitulo: "Temporadas",
  temporadasDescricao:
    "Campeonatos encerrados, arquivados com tabela final, séries e campeão de cada temporada.",
  temporadasVazioTitulo: "Nenhuma temporada arquivada",
  temporadasVazioDescricao:
    "Quando uma temporada for encerrada no admin, ela aparece aqui com tudo o que aconteceu.",
  temporadaEncerradaSelo: "Encerrada",
  semCampeao: "Sem campeão",
  rotuloTimes: "times",
  rotuloSeries: "séries",
  verTemporada: "Ver temporada",

  // ---------- app/temporadas/[seasonId] ----------
  voltarTodasTemporadas: "Todas as temporadas",
  detalheBadge: "Temporada encerrada",
  detalheEncerradaEm: "Encerrada em",
  detalheSomenteLeituraTexto:
    "Visualização somente leitura do que foi registrado nesta temporada.",
  somenteLeitura: "Somente leitura",
  classificacaoTitulo: "Classificação final",
  classificacaoSubtitulo: "Tabela da fase regular no encerramento desta temporada.",
  seriesTitulo: "Séries",
  seriesSubtitulo: "Todas as séries registradas nesta temporada, por fase.",
  seriesVazioTitulo: "Sem séries",
  seriesVazioDescricao: "Esta temporada não registrou séries antes de ser encerrada.",
  faseFinal: "Grande Final",
  faseSemifinais: "Semifinais",
  faseRegular: "Fase regular",
  cartasMaisSorteadasTitulo: "Cartinhas mais sorteadas",
  cartasMaisSorteadasSubtitulo: "Cartas usadas ao longo desta temporada.",
  duplaSufixo: " (dupla)",
  sorteioSingular: "sorteio",
  sorteioPlural: "sorteios",
  estatisticasTitulo: "Estatísticas",
  estatisticasSubtitulo: "Rankings de jogadores e campeões registrados nesta temporada.",

  // ---------- app/temporadas/[seasonId]/times/[teamSlug] ----------
  voltarPara: "Voltar para",
  timeBadge: "Time · temporada arquivada",
  timeElencoDescricaoPre: "Elenco e desempenho de cada jogador em",
  capitao: "Capitão",
  ptsElenco: "Pts de elenco",
  colJogador: "Jogador",
  colRota: "Rota",
  colElo: "Elo",
  colJogos: "Jogos",
  colVitorias: "Vitórias",
  colKda: "KDA",
  colMvps: "MVPs",
  colCampeao: "Campeão",

  // ---------- app/temporadas/[seasonId]/jogadores/[playerSlug] ----------
  voltarElenco: "← VOLTAR AO ELENCO",
  somenteLeituraMinusculo: "somente leitura",
  tilePartidas: "PARTIDAS",
  tileVitorias: "VITÓRIAS",
  tileAbates: "ABATES",
  tileMortes: "MORTES",
  tileAssistencias: "ASSIST.",
  tileKda: "KDA",
  tileMvps: "MVPs",
  tileWinrate: "WINRATE",
  desempenhoTemporada: "DESEMPENHO NA TEMPORADA",
  jogoAJogo: "JOGO A JOGO",
  jogadorSemJogos: "Este jogador não entrou em nenhum jogo registrado nesta temporada.",
  colData: "DATA",
  colAdversario: "ADVERSÁRIO",
  colCampeaoCaixaAlta: "CAMPEÃO",
  colMvp: "MVP",
  jogoAbreviacao: "J",

  // ---------- app/temporadas/[seasonId]/partidas/[seriesId] ----------
  partidaBadge: "Partida arquivada",
  mvpDaSerie: "MVP da série:",
  etapaFinal: "Final",
  etapaSemifinal: "Semifinal",
  etapaRegular: "Fase regular",
  formatoMd3: "MD3",
  formatoMd5: "MD5",
  woTitulo: "Vitória por W.O.",
  woVenceu: "venceu por W.O.",
  woSerieEncerrada: "Série encerrada por W.O.",
  abatesPorTime: "Abates por time na série",
  cartasDaSerie: "Cartinhas da série",
  serieSemJogos: "Esta série não teve jogos registrados.",
  jogoRotulo: "Jogo",
  vencedorRotulo: "Vencedor:",
  mvpRotulo: "MVP:",
  duracaoRotulo: "Duração:",
  minutosAbreviacao: "min",
  semEstatisticasJogo: "Sem estatísticas neste jogo.",
};

/**
 * Mesmas chaves do português, mas com o valor tipado como `string`.
 *
 * Passar esse tipo explicitamente para `definir` é o que mantém a checagem útil (faltou uma
 * chave, sobrou uma chave = erro de compilação) sem exigir que o inglês repita o texto
 * literal do português, que é o que o parâmetro `const` do helper acabaria pedindo.
 */
type ChavesPaginasRegras = { [K in keyof typeof pt]: string };

export const paginasRegras = definir<ChavesPaginasRegras>({
  pt,
  en: {
    // ---------- app/regras: cabeçalho ----------
    regrasSobretitulo: "Official rulebook",
    regrasTitulo: "RULES",
    regrasSubtitulo:
      "Everything that governs the 3rd edition of Os Bronzes — format, points draft, conduct and the surprise wildcards.",

    // ---------- app/regras: ficha rápida ----------
    fichaTitulo: "QUICK FACTS",
    fichaInscricaoK: "ENTRY FEE",
    fichaInscricaoV: "R$ 20,00 per player",
    fichaPremio1K: "1ST PLACE PRIZE",
    fichaPremio1V: "R$ 420,00 · R$ 84,00 per player",
    fichaPremio2K: "2ND PLACE PRIZE",
    fichaPremio2V: "R$ 180,00 · R$ 36,00 per player",
    fichaModalidadeK: "MODE",
    fichaModalidadeV: "5v5 · Summoner’s Rift",
    fichaFormacaoK: "ROSTERS",
    fichaFormacaoV: "Points draft — captains are the midlaners",
    fichaFaseK: "GROUP STAGE",
    fichaFaseV: "Best of 3 (Bo3)",
    fichaFinalK: "GRAND FINAL",
    fichaFinalV: "Best of 5 (Bo5)",
    fichaDatasK: "DATES",
    fichaDatasV: "25–26 Jul and 1–2 Aug",
    fichaTurnosK: "SESSIONS",
    fichaTurnosV: "Morning 9am · Afternoon 2pm",
    fichaOrcamentoK: "BUDGET",
    fichaOrcamentoV: "30 points per captain",

    // ---------- app/regras: regras gerais ----------
    regrasGeraisTitulo: "GENERAL RULES",
    regraA: "Open only to members of the WhatsApp/Discord group — no outside players.",
    regraB: "Linking your Riot account to Discord is mandatory.",
    regraC: "Captains build their rosters through the draft, using the rank point values.",
    regraD: "You must have completed your solo/duo queue placement games to take part.",
    regraE: "At least 5 matches played in the last 30 days.",
    regraF: "Smurf accounts are not accepted.",
    regraG: "Substitutes must come from the group itself — no team is obliged to accept one.",
    regraH: "Failing to show up at the scheduled time or date is a walkover (W.O.) loss.",
    regraI: "A 10-minute grace period applies to the SERIES (Bo3), not to each game.",
    regraJ: "Swapping fixtures or moving games earlier or later is forbidden.",
    regraK:
      "A captain may swap the lanes of two players during a series; they only return to their original lanes after one full game.",
    regraL: "Check in on Discord at least 10 minutes before the scheduled start.",
    regraM:
      "Submit your Riot ID before the tournament — switching accounts without notice disqualifies the game.",
    regraN: "Your Riot account must be linked to Discord before the tournament starts.",
    regraO: "Side (blue/red): coin flip for game 1; after that the losing team picks.",
    regraP: "Fair play: insults, hate speech or griefing lead to penalties up to disqualification.",
    regraQ: "A disconnect neither pauses nor voids the game.",
    regraR:
      "The winning captain must post a screenshot of the result on Discord within 15 minutes.",
    regraS: "By taking part you consent to your image and Riot ID being used in broadcasts.",
    regraT:
      "The organisation may adjust the rulebook before the tournament starts, with notice on Discord.",
    regraU: "Standings tiebreak: head-to-head → map differential → coin flip.",
    regraV: "Using the official voice channel during matches is mandatory.",

    // ---------- app/regras: draft por pontos ----------
    draftTitulo: "ROSTERS & POINTS DRAFT",
    draft1:
      "The 6 captains are the 6 midlaners — Mid is the brain of the team. A draw decides which team each of them captains.",
    draft2:
      "Each captain has a 30-point budget (the captain's own value already counts against it).",
    draft3: "The draft runs over 4 rounds: Top, Jungle, Bot and Support.",
    draft4: "Pick order is snake (1-2-3-4-5-6-6-5-4-3-2-1).",
    draft5: "Once a player is picked, no other team can take them.",
    draft6: "Total pool of 156 points — an average of 26 per team.",

    // ---------- app/regras: valores por elo ----------
    eloTitulo: "RANK POINT VALUES",
    eloOrcamentoPre: "Budget of",
    eloOrcamentoValor: "30 points",
    eloOrcamentoMeio: "per captain · total pool of",
    eloPoolValor: "156 points",

    // ---------- app/regras: pontuação ----------
    pontuacaoTitulo: "POINTS & TIEBREAKERS",
    pontuacao1: "Series win (Bo3) = 3 points · Loss = 0.",
    pontuacao2: "Tiebreakers, in order: 1st head-to-head, 2nd map differential, 3rd coin flip.",
    pontuacao3: "The top 2 of the group stage advance to the Grand Final, played as a Bo5.",
    pontuacao4:
      "100% of the entry fees go to the prize pool: R$ 600,00 collected (30 × R$ 20,00) and R$ 600,00 paid out — R$ 420,00 to the champions and R$ 180,00 to the runners-up, split equally between the 5 players of each team. The organisation keeps nothing.",

    // ---------- app/regras: cartinhas ----------
    cartasTitulo: "SURPRISE WILDCARDS",
    cartaIntro:
      "In every series (Bo3) each captain may choose whether or not to draw a surprise wildcard, playable in any game of the series at their discretion. If they choose to use it, the card is drawn publicly and live, with both teams watching, before the pick & ban phase of the chosen game, and the effect applies to that game only. Maximum of 1 wildcard per captain per series.",
    cartaIntro2:
      "If only one captain uses it, the draw covers the 6 single wildcards (A–F) and affects the opposing team only. When BOTH captains use one in the same game, the 2 double wildcards — whose effect hits both teams — join the draw as well, making it a single draw across all 8 cards. Any choice a card requires is made on the spot and reported to the organisation, which has the final say.",
    cartasIndividuaisLabel: "SINGLE WILDCARDS · A–F",
    cartasDuplasLabel: "DOUBLE WILDCARDS · ONLY WHEN BOTH CAPTAINS PLAY ONE",

    // ---------- app/temporadas: lista ----------
    temporadasBadge: "Archive",
    temporadasTitulo: "Seasons",
    temporadasDescricao:
      "Finished tournaments, archived with the final standings, every series and the champion of each season.",
    temporadasVazioTitulo: "No archived season yet",
    temporadasVazioDescricao:
      "Once a season is closed in the admin panel, it shows up here with everything that happened.",
    temporadaEncerradaSelo: "Finished",
    semCampeao: "No champion",
    rotuloTimes: "teams",
    rotuloSeries: "series",
    verTemporada: "View season",

    // ---------- app/temporadas/[seasonId] ----------
    voltarTodasTemporadas: "All seasons",
    detalheBadge: "Season finished",
    detalheEncerradaEm: "Ended on",
    detalheSomenteLeituraTexto: "Read-only view of everything recorded in this season.",
    somenteLeitura: "Read only",
    classificacaoTitulo: "Final standings",
    classificacaoSubtitulo: "Group stage table as it stood when this season closed.",
    seriesTitulo: "Series",
    seriesSubtitulo: "Every series recorded in this season, by stage.",
    seriesVazioTitulo: "No series",
    seriesVazioDescricao: "This season recorded no series before it was closed.",
    faseFinal: "Grand Final",
    faseSemifinais: "Semifinals",
    faseRegular: "Group stage",
    cartasMaisSorteadasTitulo: "Most drawn wildcards",
    cartasMaisSorteadasSubtitulo: "Cards played over the course of this season.",
    duplaSufixo: " (double)",
    sorteioSingular: "draw",
    sorteioPlural: "draws",
    estatisticasTitulo: "Stats",
    estatisticasSubtitulo: "Player and champion rankings recorded in this season.",

    // ---------- app/temporadas/[seasonId]/times/[teamSlug] ----------
    voltarPara: "Back to",
    timeBadge: "Team · archived season",
    timeElencoDescricaoPre: "Roster and per-player performance in",
    capitao: "Captain",
    ptsElenco: "Roster pts",
    colJogador: "Player",
    colRota: "Role",
    colElo: "Rank",
    colJogos: "Games",
    colVitorias: "Wins",
    colKda: "KDA",
    colMvps: "MVPs",
    colCampeao: "Champion",

    // ---------- app/temporadas/[seasonId]/jogadores/[playerSlug] ----------
    voltarElenco: "← BACK TO ROSTER",
    somenteLeituraMinusculo: "read only",
    tilePartidas: "GAMES",
    tileVitorias: "WINS",
    tileAbates: "KILLS",
    tileMortes: "DEATHS",
    tileAssistencias: "ASSISTS",
    tileKda: "KDA",
    tileMvps: "MVPs",
    tileWinrate: "WIN RATE",
    desempenhoTemporada: "SEASON PERFORMANCE",
    jogoAJogo: "GAME BY GAME",
    jogadorSemJogos: "This player did not appear in any game recorded in this season.",
    colData: "DATE",
    colAdversario: "OPPONENT",
    colCampeaoCaixaAlta: "CHAMPION",
    colMvp: "MVP",
    jogoAbreviacao: "G",

    // ---------- app/temporadas/[seasonId]/partidas/[seriesId] ----------
    partidaBadge: "Archived match",
    mvpDaSerie: "Series MVP:",
    etapaFinal: "Final",
    etapaSemifinal: "Semifinal",
    etapaRegular: "Group stage",
    formatoMd3: "Bo3",
    formatoMd5: "Bo5",
    woTitulo: "Win by walkover",
    woVenceu: "won by walkover",
    woSerieEncerrada: "Series ended by walkover.",
    abatesPorTime: "Kills per team in the series",
    cartasDaSerie: "Series wildcards",
    serieSemJogos: "This series had no recorded games.",
    jogoRotulo: "Game",
    vencedorRotulo: "Winner:",
    mvpRotulo: "MVP:",
    duracaoRotulo: "Duration:",
    minutosAbreviacao: "min",
    semEstatisticasJogo: "No stats for this game.",
  },
});
