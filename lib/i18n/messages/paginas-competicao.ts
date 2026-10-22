import { definir } from "@/lib/i18n/definir";

/**
 * Textos das páginas de competição: TABELA, CALENDÁRIO, lista de PARTIDAS e o detalhe
 * de uma série (/partidas/[id]).
 *
 * Só entra texto de interface aqui. Nomes de times, nicks de jogadores, nomes de campeões
 * e nomes de cartas vêm do dataset e permanecem como estão nos dois idiomas.
 *
 * Convenções de esports adotadas no inglês: MD3 -> Bo3, MD5 -> Bo5, W.O. -> Walkover,
 * "fase de pontos corridos" -> "group stage", "saldo de mapas" -> "game differential".
 */
export const paginasCompeticao = definir({
  pt: {
    // ---------- /tabela ----------
    tabelaEyebrow: "Fase de pontos corridos",
    tabelaTitulo: "TABELA",
    // `{data}` = dia da primeira série da temporada no ar ("20 de novembro"), vindo do
    // dataset. Sem série ainda, vale a versão sem data — nada de data cravada aqui.
    tabelaIntro:
      "Classificação zerada até o apito inicial. As posições se definem a partir da 1ª rodada, em {data}.",
    tabelaIntroSemData:
      "Classificação zerada até o apito inicial. As posições se definem a partir da 1ª rodada.",
    // As duas de cima só valem antes da 1ª série decidida; depois, uma destas.
    tabelaIntroEmAndamento: "Classificação da fase de pontos, atualizada a cada série.",
    tabelaIntroEncerrada: "Classificação final da fase de pontos.",

    tabelaColPosicao: "#",
    tabelaColTime: "TIME",
    tabelaColJogos: "J",
    tabelaColVitorias: "V",
    tabelaColDerrotas: "D",
    tabelaColSaldo: "SG",
    tabelaColPontos: "PTS",
    tabelaColElenco: "ELENCO",

    tabelaInfoPontuacaoTitulo: "PONTUAÇÃO",
    tabelaInfoPontuacaoAntes: "Vitória na série (MD3) = ",
    tabelaInfoPontuacaoDestaque: "3 pontos",
    tabelaInfoPontuacaoDepois: " · Derrota = 0.",
    tabelaInfoDesempateTitulo: "DESEMPATE",
    tabelaInfoDesempateTexto:
      "1º confronto direto · 2º saldo de mapas (SG) · 3º mapas ganhos · 4º sorteio.",
    tabelaInfoClassificacaoTitulo: "CLASSIFICAÇÃO",
    tabelaInfoClassificacaoAntes: "Os ",
    // `{n}` = `classificadosDaTemporada` de app/tabela/page.tsx, o mesmo número que
    // pinta as linhas de dourado.
    tabelaInfoClassificacaoDestaque: "{n} primeiros",
    tabelaInfoClassificacaoDepois:
      " avançam às semifinais (1º x 4º e 2º x 3º, em MD3); a Grande Final é em MD5.",
    // Temporada com final direta (a 3ª): sem semifinal, os 2 primeiros jogam a final.
    tabelaInfoClassificacaoDepoisFinalDireta: " avançam para a Grande Final em MD5.",

    // ---------- /calendario ----------
    // `{temporada}` = nome da temporada no ar (ex.: "4ª Edição").
    calendarioEyebrow: "League of Bronze — {temporada}",
    calendarioTitulo: "CALENDÁRIO",
    calendarioIntro:
      "Fase de pontos corridos: todos contra todos, em séries MD3. Os 4 primeiros vão às semifinais (1º x 4º e 2º x 3º, em MD3), e os vencedores decidem a Grande Final em MD5.",

    calendarioPillMatutino: "MATUTINO · ANTES DAS 13H",
    calendarioPillVespertino: "VESPERTINO · 13H–18H",
    calendarioPillNoturno: "NOTURNO · A PARTIR DAS 18H",
    calendarioPillConfrontos: "SÉRIES",
    calendarioSemifinaisTitulo: "SEMIFINAIS",
    calendarioSemifinaisDia: "1º x 4º e 2º x 3º · MD3",

    calendarioJogo: "JOGO",
    calendarioTurnoMatutino: "MATUTINO",
    calendarioTurnoVespertino: "VESPERTINO",
    calendarioTurnoNoturno: "NOTURNO",

    calendarioStatusWo: "W.O.",
    calendarioStatusFinalizado: "FINALIZADO",
    calendarioVitoriaWo: "Vitória por W.O.",

    calendarioFinalDia: "DOMINGO · GRANDE FINAL",
    calendarioFinalMelhorDe5: "MELHOR DE 5",
    calendarioFinalConfronto: "VENCEDORES DAS SEMIFINAIS",
    calendarioFinalPrimeiro: "VENCEDOR DA SEMI 1",
    calendarioFinalSegundo: "VENCEDOR DA SEMI 2",
    calendarioVs: "VS",

    // ---------- /partidas ----------
    partidasBadge: "Séries",
    partidasTitulo: "Partidas",
    partidasDescricao:
      "Lista de confrontos por série, incluindo fase regular, semifinal e final em MD3 ou MD5.",
    partidasVazioTitulo: "Nenhuma série lançada",
    partidasVazioDescricao:
      "As séries cadastradas no /admin aparecerão aqui em ordem da mais recente para a mais antiga.",

    // ---------- /partidas/[id] ----------
    faseRegular: "Fase regular",
    faseSemifinal: "Semifinal",
    faseFinal: "Final",
    formatoBo3: "MD3",
    formatoBo5: "MD5",

    detalheBadgeGrandeFinal: "Grande Final",
    detalheBadgeSerie: "Detalhe da Série",
    detalheSerieRotulo: "Série",

    detalheStatusWo: "Série encerrada por W.O.",
    detalheStatusFinalizada: "Série finalizada",
    detalheStatusEmAndamento: "Série em andamento",
    detalheVencedorWo: "Vencedor por W.O.:",
    detalheMvpSerie: "MVP da série:",
    detalheMvpFinal: "MVP da final:",
    detalheResultadoWo: "O resultado foi definido por W.O.",
    detalheSemJogos: "Esta série ainda não possui jogos lançados.",
    detalheEncerradaWo: "Esta série foi encerrada por W.O.",

    detalheCampeaoBadge: "Campeão do campeonato",
    detalheTituloConfirmado: "Título confirmado",
    detalheFechouFinalAntes: "Fechou a grande final por ",
    detalhePlacarFinal: "Placar da final",
    detalheTimeCampeao: "Time campeão",
    detalheTimeCampeaoTexto:
      "Abra a página do campeão para ver elenco, campanha e estatísticas.",
    detalheVerTimeCampeao: "Ver time campeão",

    detalheLinksRapidos: "Links rápidos",
    detalheVerTime: "Ver time:",
    detalheVoltarPartidas: "Voltar para lista de partidas",

    detalheAbatesPorTime: "Abates por time na série",

    detalheJogo: "Jogo",
    detalheVencedor: "Vencedor:",
    detalheMvp: "MVP:",
    detalheDuracao: "Duração:",
    detalheMinutos: "min",

    detalheColJogador: "Jogador",
    detalheColCampeaoCurto: "Camp.",
    detalheColCampeao: "Campeão",
    detalheColKda: "K/D/A",
    detalheColKdaMedia: "KDA",
    detalheSemEstatisticas: "Sem estatísticas neste jogo.",

    vazio: "—",
  },
  en: {
    // ---------- /tabela ----------
    tabelaEyebrow: "Group stage",
    tabelaTitulo: "STANDINGS",
    tabelaIntro:
      "Everyone starts from zero until the first whistle. Positions are set from round 1, on {data}.",
    tabelaIntroSemData: "Everyone starts from zero until the first whistle. Positions are set from round 1.",
    tabelaIntroEmAndamento: "Group-stage standings, updated after every series.",
    tabelaIntroEncerrada: "Final group-stage standings.",

    tabelaColPosicao: "#",
    tabelaColTime: "TEAM",
    tabelaColJogos: "GP",
    tabelaColVitorias: "W",
    tabelaColDerrotas: "L",
    tabelaColSaldo: "GD",
    tabelaColPontos: "PTS",
    tabelaColElenco: "ROSTER",

    tabelaInfoPontuacaoTitulo: "SCORING",
    tabelaInfoPontuacaoAntes: "Series win (Bo3) = ",
    tabelaInfoPontuacaoDestaque: "3 points",
    tabelaInfoPontuacaoDepois: " · Loss = 0.",
    tabelaInfoDesempateTitulo: "TIEBREAKERS",
    tabelaInfoDesempateTexto:
      "1st head-to-head · 2nd game differential (GD) · 3rd games won · 4th coin flip.",
    tabelaInfoClassificacaoTitulo: "QUALIFICATION",
    tabelaInfoClassificacaoAntes: "The ",
    tabelaInfoClassificacaoDestaque: "top {n}",
    tabelaInfoClassificacaoDepois:
      " advance to the semifinals (1st v 4th and 2nd v 3rd, Bo3); the Grand Final is a Bo5.",
    tabelaInfoClassificacaoDepoisFinalDireta: " advance to the Grand Final, a Bo5.",

    // ---------- /calendario ----------
    calendarioEyebrow: "League of Bronze — {temporada}",
    calendarioTitulo: "SCHEDULE",
    calendarioIntro:
      "Group stage: round robin, every series a Bo3. The top 4 go to the semifinals (1st v 4th and 2nd v 3rd, Bo3), and the winners settle it in the Grand Final, a Bo5.",

    calendarioPillMatutino: "MORNING · BEFORE 1PM",
    calendarioPillVespertino: "AFTERNOON · 1PM–6PM",
    calendarioPillNoturno: "EVENING · FROM 6PM",
    calendarioPillConfrontos: "SERIES",
    calendarioSemifinaisTitulo: "SEMIFINALS",
    calendarioSemifinaisDia: "1st v 4th and 2nd v 3rd · Bo3",

    calendarioJogo: "MATCH",
    calendarioTurnoMatutino: "MORNING",
    calendarioTurnoVespertino: "AFTERNOON",
    calendarioTurnoNoturno: "EVENING",

    calendarioStatusWo: "WALKOVER",
    calendarioStatusFinalizado: "COMPLETED",
    calendarioVitoriaWo: "Win by walkover",

    calendarioFinalDia: "SUNDAY · GRAND FINAL",
    calendarioFinalMelhorDe5: "BEST OF 5",
    calendarioFinalConfronto: "SEMIFINAL WINNERS",
    calendarioFinalPrimeiro: "SEMI 1 WINNER",
    calendarioFinalSegundo: "SEMI 2 WINNER",
    calendarioVs: "VS",

    // ---------- /partidas ----------
    partidasBadge: "Series",
    partidasTitulo: "Matches",
    partidasDescricao:
      "Every series in the tournament — group stage, semifinal and final, played as Bo3 or Bo5.",
    partidasVazioTitulo: "No series posted yet",
    partidasVazioDescricao:
      "Series registered in the admin panel show up here, from the most recent to the oldest.",

    // ---------- /partidas/[id] ----------
    faseRegular: "Group stage",
    faseSemifinal: "Semifinal",
    faseFinal: "Final",
    formatoBo3: "Bo3",
    formatoBo5: "Bo5",

    detalheBadgeGrandeFinal: "Grand Final",
    detalheBadgeSerie: "Series detail",
    detalheSerieRotulo: "Series",

    detalheStatusWo: "Series ended by walkover",
    detalheStatusFinalizada: "Series completed",
    detalheStatusEmAndamento: "Series in progress",
    detalheVencedorWo: "Winner by walkover:",
    detalheMvpSerie: "Series MVP:",
    detalheMvpFinal: "Final MVP:",
    detalheResultadoWo: "The result was decided by walkover.",
    detalheSemJogos: "This series has no games posted yet.",
    detalheEncerradaWo: "This series ended by walkover.",

    detalheCampeaoBadge: "Tournament champion",
    detalheTituloConfirmado: "Title confirmed",
    detalheFechouFinalAntes: "Closed out the grand final ",
    detalhePlacarFinal: "Final score",
    detalheTimeCampeao: "Champion team",
    detalheTimeCampeaoTexto:
      "Open the champion's page for the roster, the run and full stats.",
    detalheVerTimeCampeao: "View champion team",

    detalheLinksRapidos: "Quick links",
    detalheVerTime: "View team:",
    detalheVoltarPartidas: "Back to the match list",

    detalheAbatesPorTime: "Kills per team in the series",

    detalheJogo: "Game",
    detalheVencedor: "Winner:",
    detalheMvp: "MVP:",
    detalheDuracao: "Duration:",
    detalheMinutos: "min",

    detalheColJogador: "Player",
    detalheColCampeaoCurto: "Champ.",
    detalheColCampeao: "Champion",
    detalheColKda: "K/D/A",
    detalheColKdaMedia: "KDA",
    detalheSemEstatisticas: "No stats for this game.",

    vazio: "—",
  },
});
