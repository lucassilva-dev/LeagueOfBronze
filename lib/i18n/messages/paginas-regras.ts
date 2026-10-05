import { definir } from "@/lib/i18n/definir";

/**
 * Textos das páginas de Regras (regulamento oficial) e Temporadas (arquivo histórico).
 *
 * /regras publica o regulamento da 4ª Edição (4º Campeonato dos Bronzes), seção por seção
 * do PDF oficial, com as decisões da organização de 05/10/2026 aplicadas por cima dele
 * (capitães pela solo/duo, organizadores sem taxa e sem capitania, 100% do arrecadado
 * vira prêmio). Nada de valor em R$ ou percentual cravado aqui: a taxa e a fatia do
 * campeão vêm da Configuração da edição (`edicao_config`), e o texto tem a versão com e a
 * versão sem esses números para quando a configuração não puder ser lida.
 *
 * Os marcadores entre chaves ({link}, {canal1}, {r21}…) são trocados por links na página.
 * Mantenha-os IGUAIS nos dois idiomas — o inglês não traduz o nome do marcador.
 *
 * As regras são NUMERADAS (regra1…regra22) e a página dá a cada uma o id "regra-N": a
 * inscrição e o painel apontam para /regras#regra-17 e afins. Renumerar quebra esses links.
 */
const pt = {
  // ---------- app/regras: cabeçalho ----------
  regrasSobretitulo: "Regulamento oficial",
  regrasTitulo: "REGRAS",
  regrasSubtitulo:
    "Regulamento do 4º Campeonato dos Bronzes (League of Bronze, 4ª Edição) — League of Legends 5v5. Atualizado em 05/10/2026.",
  sumarioRotulo: "Nesta página",

  // ---------- app/regras: 1. visão geral ----------
  visaoGeralTitulo: "VISÃO GERAL",
  visaoGeralIntro:
    "O 4º Campeonato dos Bronzes é um torneio 5v5 de League of Legends com fase de pontos corridos, semifinais 1º x 4º e 2º x 3º, e final em melhor de 5.",
  fichaModalidadeK: "MODALIDADE",
  fichaModalidadeV: "5v5, Summoner’s Rift",
  fichaPeriodoK: "PERÍODO",
  fichaPeriodoV:
    "Previsto para novembro, provavelmente na segunda quinzena. As datas serão divulgadas assim que as inscrições forem encerradas.",
  fichaFaseK: "FASE DE PONTOS CORRIDOS",
  fichaFaseV: "Todos contra todos, uma vez, em séries MD3 (melhor de 3). Vitória na série = 3 pontos.",
  fichaSemifinaisK: "SEMIFINAIS",
  fichaSemifinaisV: "1º x 4º e 2º x 3º colocados, em MD3.",
  fichaFinalK: "FINAL",
  fichaFinalV: "Vencedores das semifinais, em MD5 (melhor de 5).",
  fichaInscricaoK: "INSCRIÇÃO",
  fichaInscricaoV: "Pelo site oficial do campeonato, na {link}.",
  fichaInscricaoLink: "página de inscrição",
  fichaTransmissaoK: "TRANSMISSÃO",
  fichaTransmissaoV:
    "Todos os jogos na Twitch, em {canal1} ou {canal2}. O canal de cada jogo será divulgado com antecedência.",
  fichaValorK: "VALOR DA INSCRIÇÃO",
  fichaValorSemConfig: "Informado na {link}.",

  // ---------- app/regras: 2. inscrição ----------
  inscricaoTitulo: "INSCRIÇÃO",
  inscricaoIntro:
    "A inscrição é feita só pelo site oficial e só vale depois da validação pela organização. Os requisitos de elegibilidade estão nas regras {r1}, {r3}, {r4}, {r5} e {r21}.",
  inscricaoCamposTitulo: "CAMPOS PEDIDOS NO FORMULÁRIO",
  inscricaoCampo1: "Nome e sobrenome (como no grupo do WhatsApp) e @ do Discord.",
  inscricaoCampo2: "Nick Riot#TAG, com a conta vinculada ao Discord (regra 21).",
  inscricaoCampo3: "Elo atual na fila solo/duo.",
  inscricaoCampo4: "Rota primária e rota secundária.",
  inscricaoCampo5:
    "Disponibilidade por turno (manhã, tarde e/ou noite). As datas só serão divulgadas depois do encerramento das inscrições, e a disponibilidade informada vale como compromisso (regra 9).",
  inscricaoCampo6:
    "Aceite do regulamento e ciência do pagamento, autorização de uso de imagem e nick (regra 17) e confirmação dos requisitos das regras 1, 3, 4, 5 e 21.",
  inscricaoNota:
    "Nick ou Discord repetido bloqueia a inscrição. A disponibilidade vale para o time inteiro: um jogador que só pode à noite leva o time todo para a noite.",
  inscricaoReservasRotulo: "Reservas:",
  inscricaoReservasTexto:
    "o número de times é inscritos ÷ 5. Quem sobrar vira reserva oficial e pode substituir titulares (regra 6).",

  // ---------- app/regras: 3. formação dos times ----------
  formacaoTitulo: "FORMAÇÃO DOS TIMES",
  formacaoIntro:
    "Os capitães são os inscritos de maior elo na fila solo/duo, e os times são montados em um draft por pontos, no mesmo modelo da 3ª edição.",
  capitaesTitulo: "CAPITÃES",
  capitaes1:
    "Os capitães são os inscritos de maior elo na fila solo/duo, independentemente da rota. O elo da flex não conta.",
  capitaes2: "Os organizadores desta edição jogam, mas não são capitães.",
  capitaes3:
    "O número de capitães é igual ao número de times (inscritos ÷ 5; com 40 inscritos, são 8).",
  capitaes4:
    "Um sorteio ao vivo define qual time cada capitão vai capitanear e a ordem de escolha do draft.",
  capitaes5:
    "O capitão também é jogador: ocupa a rota do seu cadastro, que é fixa, independentemente da rota em que jogar na partida, e o valor dele em pontos sai do orçamento do time.",
  draftTitulo: "DRAFT POR PONTOS",
  draft1:
    "Cada jogador tem um valor em pontos conforme o elo. A tabela de valores só será definida quando a lista completa de jogadores estiver fechada, com os elos atualizados.",
  draft2:
    "Cada capitão recebe um orçamento definido junto com a tabela: a média de pontos por time + 15%, arredondada para cima.",
  draft3:
    "O capitão entra com a rota do seu cadastro, fixa, e o draft é feito em 4 rodadas para as outras 4 rotas.",
  draft4:
    "A ordem de escolha é serpentina (ex.: com 6 times, 1-2-3-4-5-6-6-5-4-3-2-1) e não pode ser trocada nem alterada depois de sorteada.",
  draft5:
    "Nenhum capitão pode estourar o orçamento; deve sempre reservar pontos para fechar as rodadas restantes com o jogador mais barato ainda disponível em cada rota.",
  draft6: "Jogador escolhido não pode ser escolhido por outro time.",
  tabelaValoresRotulo: "Tabela de valores.",
  tabelaValoresTexto:
    "Será divulgada depois que a lista completa de jogadores estiver fechada, com os elos atualizados. Os valores serão recalculados para esta edição, em vez de reaproveitar os da 3ª.",

  // ---------- app/regras: 4. regras (numeradas; id="regra-N" na página) ----------
  regrasGeraisTitulo: "REGRAS GERAIS",
  regra1:
    "Não serão aceitas pessoas de fora do grupo do WhatsApp/Discord que não conhecemos. Basta ser do grupo e conhecido — não existe tempo mínimo no grupo.",
  regra2:
    "Capitães montam o time com base no draft e nos valores de cada elo, conforme a seção {secao}.",
  regra2Link: "Formação dos times",
  regra3: "Jogadores precisam ter feito a MD5 obrigatoriamente da fila solo/duo para participar.",
  regra4:
    "Jogadores precisam ter jogado no mínimo 5 partidas da fila solo/duo nos 10 dias anteriores ao início do torneio. Partidas de outras filas não contam.",
  regra5: "Conta smurf não será aceita.",
  regra6:
    "Não haverá substituições de fora — apenas de jogadores do próprio grupo (inscritos ou reservas oficiais) que cumpram as regras 3, 4, 5 e 21 e cujo valor em pontos seja igual ou menor ao do jogador substituído; caso contrário, a substituição depende de aprovação da organização. Não é obrigação de ninguém aceitar. A substituição é informada no check-in.",
  regra7: "Tolerância de 10 minutos na SÉRIE (MD3 ou MD5), e não por partida.",
  regra8:
    "Passada a tolerância da regra 7, sem 5 jogadores presentes (titulares ou substitutos da regra 6), o jogo é W.O.: vitória 2x0 e 3 pontos para o time completo presente. Se nenhum dos times estiver completo, é W.O. duplo: ninguém pontua e a série não é remarcada.",
  regra9:
    "Não será aceito trocar os confrontos com outros capitães, nem adiar ou adiantar jogos. A disponibilidade informada na inscrição vale como compromisso: o calendário é montado pela organização após o draft e, depois de publicado, é definitivo.",
  regra10:
    "O capitão poderá trocar a lane de dois jogadores na série; porém, os jogadores só poderão retornar à sua lane original após um jogo pós-troca. A troca por cartinha (INVERSÃO DE ROTAS) não conta como a troca desta regra.",
  regra11:
    "Check-in obrigatório: todos os jogadores da série devem confirmar presença no Discord até 10 minutos antes do horário marcado. Quem não confirmar até o horário é considerado ausente para a contagem da tolerância.",
  regra12:
    "Conta verificada: cada jogador deve informar o nick/ID da conta que vai usar antes do início do torneio — trocar de conta ou mudar o nickname sem aviso prévio gera desclassificação da partida.",
  regra13:
    "Escolha de lado (blue/red side): definida por sorteio da organização antes do 1º jogo da série; nos jogos seguintes, quem perdeu o jogo anterior escolhe o lado.",
  regra14:
    "Comportamento e fair play: ofensas, discurso de ódio, griefing proposital ou qualquer conduta antidesportiva (dentro ou fora do jogo) pode resultar em advertência, perda de partida (W.O.) ou desclassificação do time, a critério da organização.",
  regra15:
    "Problemas técnicos: queda de conexão durante a partida não pausa nem invalida o jogo — cabe ao time se organizar para reconectar. Remake só é possível se o problema ocorrer nos primeiros 3 minutos de jogo e os dois capitães concordarem. Casos excepcionais serão avaliados pela organização.",
  regra16:
    "Registro de resultado: ao fim de cada série, o capitão vencedor deve enviar print da tela de resultado (ou da súmula preenchida) no canal oficial do Discord em até 15 minutos após o término. Sem o envio no prazo, o time vencedor perde 1 dos 5 banimentos no jogo 1 da série seguinte; se não houver série seguinte, recebe uma advertência registrada.",
  regra17:
    "Transmissão/gravação: partidas poderão ser gravadas/transmitidas pela organização; ao participar, o jogador autoriza o uso de sua imagem/nick para essa finalidade. Os jogos serão todos transmitidos na Twitch (canal n4kay ou thalissonvieira), com o canal de cada jogo divulgado com antecedência. É proibido assistir à transmissão durante a própria partida.",
  regra18:
    "Alteração de regras: a organização se reserva o direito de ajustar o regulamento antes do início do torneio, em caso de necessidade, com aviso prévio no Discord e no grupo de WhatsApp.",
  regra19:
    "Empates na tabela (fase de pontos): critério de desempate na seguinte ordem — confronto direto, depois saldo de games (vitórias menos derrotas em mapas, com o W.O. contando 2x0), depois sorteio. Em empate entre 3 ou mais times, o confronto direto considera só os jogos entre os empatados.",
  regra20:
    "Uso de chat de voz: obrigatório o uso do canal de voz oficial do torneio durante as partidas, para fins de arbitragem e resolução de disputas. É proibido o time jogar sem voice de todos os jogadores; sem isso a partida não inicia e o tempo corre como tolerância.",
  regra21:
    "É obrigatório que a conta da Riot esteja vinculada ao Discord (Configurações > Conexões) antes do início do torneio, para reduzir fraudes e facilitar a verificação de elo e histórico pela organização.",
  regra22:
    "Inscrição: valor, prazo e forma de pagamento são informados no site e no grupo; a vaga só é confirmada após o pagamento.",

  // ---------- app/regras: 5. cartinhas surpresa ----------
  cartasTitulo: "CARTINHAS SURPRESA",
  cartasIntro:
    "Em cada série, cada capitão pode usar no máximo 1 cartinha surpresa, sorteada ao vivo e à vista de todos antes do pick & ban da partida escolhida.",
  cartasRegra1:
    "A cartinha vale só para a partida em que foi usada, e pode ser usada em qualquer partida da série.",
  cartasRegra2:
    "Escolhas exigidas pela cartinha (quais jogadores, quais lanes) são feitas na hora e informadas à organização.",
  cartasRegra3: "Dúvidas sobre a aplicação de um efeito são decididas pela organização.",
  cartasIndividuaisLabel: "CARTINHAS INDIVIDUAIS",
  cartasIndividuaisTexto: "O efeito atinge só o time adversário; o sorteio é entre as individuais.",
  cartasDuplasLabel: "CARTINHAS DUPLAS",
  cartasDuplasTexto:
    "Afetam os dois times. Quando os dois capitães decidem usar cartinha na mesma partida, entram mais duas cartinhas e o sorteio passa a ser entre todas as cartinhas (individuais e duplas), uma única vez para a partida.",
  // Efeito de cada carta no texto do regulamento da 4ª. Os nomes vêm de paginasStats.cartas.
  efeitoAbcdraft:
    "Duas letras são sorteadas. O capitão adversário deve montar a composição só com campeões cujos nomes iniciam com essas letras.",
  efeitoDraftSabotado:
    "O capitão que usou a cartinha escolhe o campeão de dois jogadores do time adversário, respeitando a role de cada um (ex.: não vale Yuumi na jungle).",
  efeitoInterClasse:
    "Uma classe de campeões é sorteada. O time adversário só pode escolher campeões dessa classe.",
  efeitoInversaoRotas:
    "O capitão que usou a cartinha escolhe dois jogadores do time adversário para trocarem de lane entre si.",
  efeitoTudoLiberado: "O time adversário fica proibido de banir qualquer campeão.",
  efeitoAmigosNatureza: "Nenhum dos dois times pode ter Jungler nem levar Smite.",
  efeitoDraftInvertido:
    "Um time escolhe o draft do outro; os campeões devem ser da rota de cada jogador, sem trocar campeões entre rotas diferentes.",
  cartasNovasRotulo: "Novas cartinhas.",
  cartasNovasTexto:
    "A lista será ampliada com outras cartinhas, que a organização divulga depois. A cartinha INVASÃO DA YUUMI foi retirada.",

  // ---------- app/regras: 6. pontuação e fases finais ----------
  pontuacaoTitulo: "PONTUAÇÃO E FASES FINAIS",
  pontuacaoIntro:
    "Os 4 primeiros da fase de pontos corridos avançam às semifinais, e a pontuação é 3 pontos por série vencida.",
  pontuacaoFaseK: "Fase de pontos corridos:",
  pontuacaoFaseV: "vitória na série (2x0 ou 2x1) = 3 pontos; derrota = 0. O W.O. vale 2x0 (regra 8).",
  pontuacaoDesempateK: "Desempate:",
  pontuacaoDesempateV:
    "conforme a {regra} — confronto direto, depois saldo de games, depois sorteio.",
  pontuacaoDesempateLink: "regra 19",
  pontuacaoSemisK: "Semifinais (MD3):",
  pontuacaoSemisV: "1º x 4º e 2º x 3º. Os demais colocados estão eliminados.",
  pontuacaoFinalK: "Final (MD5):",
  pontuacaoFinalV:
    "vencedores das semifinais. A escolha de lado segue a regra 13: sorteio no jogo 1 e, nos seguintes, escolhe quem perdeu o jogo anterior.",
  pontuacaoSeriesK: "Séries MD3 e MD5:",
  pontuacaoSeriesV: "vence quem fizer 2 (MD3) ou 3 (MD5) jogos primeiro.",

  // ---------- app/regras: premiação (decisão da organização de 05/10/2026) ----------
  premiacaoTitulo: "PREMIAÇÃO",
  premiacaoTexto:
    "100% do valor arrecadado com as inscrições vira prêmio: {campeao} para o time campeão e {vice} para o vice. A organização não fica com nada.",
  premiacaoTextoSemConfig:
    "100% do valor arrecadado com as inscrições vira prêmio, dividido entre o time campeão e o vice. A organização não fica com nada.",
  premiacaoCampeaoK: "CAMPEÃO",
  premiacaoViceK: "VICE",
  premiacaoOrganizadores:
    "Os organizadores desta edição jogam, mas não pagam inscrição e não são capitães.",

  // ---------- app/regras: 7. calendário modelo ----------
  calendarioTitulo: "CALENDÁRIO MODELO (8 TIMES)",
  calendarioIntro:
    "Com 8 times (40 inscritos) são 31 séries: 28 de pontos corridos, 2 semifinais e a final. Com 6 séries por data (3 de manhã e 3 à tarde), cabem em 6 datas, ou 3 fins de semana.",
  calColData: "Data",
  calColTurno: "Turno",
  calColHorarios: "Horários",
  calColOque: "O que acontece",
  calDatas1a4: "Datas 1 a 4",
  calData5: "Data 5",
  calData6: "Data 6",
  turnoManha: "Manhã",
  turnoTarde: "Tarde",
  turnoNoite: "Noite",
  calSeries3: "3 séries de pontos corridos",
  calUltimaSerie:
    "Última série da fase de pontos (28ª); o restante do turno é reserva técnica para remarcações",
  calSemis: "Semifinais: 1º x 4º e 2º x 3º",
  calFinal: "Final em MD5",
  calendarioNota:
    "Os confrontos são definidos por sorteio ao vivo após o draft. As datas serão divulgadas assim que as inscrições forem encerradas, e os horários saem depois do draft, cruzando a disponibilidade por turno (manhã, tarde e noite) informada por todos os jogadores de cada time. Cada série MD3 reserva cerca de 90 minutos; a final em MD5 pode passar de 3 horas.",
  calendarioOutros:
    "Com outro número de times a conta muda: os pontos corridos têm 10 séries com 5 times, 15 com 6 e 21 com 7.",

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
      "Rulebook of the 4th Campeonato dos Bronzes (League of Bronze, 4th Edition) — League of Legends 5v5. Updated on 5 October 2026.",
    sumarioRotulo: "On this page",

    // ---------- app/regras: 1. visão geral ----------
    visaoGeralTitulo: "OVERVIEW",
    visaoGeralIntro:
      "The 4th Campeonato dos Bronzes is a 5v5 League of Legends tournament with a round-robin points stage, semifinals of 1st v 4th and 2nd v 3rd, and a best-of-5 final.",
    fichaModalidadeK: "MODE",
    fichaModalidadeV: "5v5, Summoner’s Rift",
    fichaPeriodoK: "WHEN",
    fichaPeriodoV:
      "Planned for November, most likely in the second half of the month. Dates will be announced as soon as sign-ups close.",
    fichaFaseK: "ROUND-ROBIN STAGE",
    fichaFaseV: "Everyone plays everyone once, in Bo3 series (best of 3). Series win = 3 points.",
    fichaSemifinaisK: "SEMIFINALS",
    fichaSemifinaisV: "1st v 4th and 2nd v 3rd, in Bo3.",
    fichaFinalK: "FINAL",
    fichaFinalV: "The semifinal winners, in a Bo5 (best of 5).",
    fichaInscricaoK: "SIGN-UP",
    fichaInscricaoV: "Through the tournament's official site, on the {link}.",
    fichaInscricaoLink: "sign-up page",
    fichaTransmissaoK: "BROADCAST",
    fichaTransmissaoV:
      "Every game on Twitch, on {canal1} or {canal2}. Each game's channel will be announced in advance.",
    fichaValorK: "ENTRY FEE",
    fichaValorSemConfig: "Shown on the {link}.",

    // ---------- app/regras: 2. inscrição ----------
    inscricaoTitulo: "SIGN-UP",
    inscricaoIntro:
      "Sign-up is done only through the official site and is only valid once the organisers have checked it. The eligibility requirements are in rules {r1}, {r3}, {r4}, {r5} and {r21}.",
    inscricaoCamposTitulo: "WHAT THE FORM ASKS FOR",
    inscricaoCampo1: "First name and surname (as in the WhatsApp group) and Discord @.",
    inscricaoCampo2: "Riot ID (Name#TAG), with the account linked to Discord (rule 21).",
    inscricaoCampo3: "Current solo/duo queue rank.",
    inscricaoCampo4: "Primary and secondary role.",
    inscricaoCampo5:
      "Availability by session (morning, afternoon and/or evening). Dates will only be announced after sign-ups close, and the availability you give counts as a commitment (rule 9).",
    inscricaoCampo6:
      "Acceptance of the rulebook and acknowledgement of the payment, consent to the use of your image and nickname (rule 17) and confirmation of the requirements in rules 1, 3, 4, 5 and 21.",
    inscricaoNota:
      "A duplicate Riot ID or Discord blocks the sign-up. Availability applies to the whole team: a player who can only play in the evening takes the whole team to the evening.",
    inscricaoReservasRotulo: "Reserves:",
    inscricaoReservasTexto:
      "the number of teams is sign-ups ÷ 5. Anyone left over becomes an official reserve and may replace starters (rule 6).",

    // ---------- app/regras: 3. formação dos times ----------
    formacaoTitulo: "TEAM FORMATION",
    formacaoIntro:
      "The captains are the highest-ranked sign-ups in solo/duo queue, and teams are built through a points draft, using the same model as the 3rd edition.",
    capitaesTitulo: "CAPTAINS",
    capitaes1:
      "The captains are the sign-ups with the highest solo/duo queue rank, regardless of role. Flex rank does not count.",
    capitaes2: "This edition's organisers play, but they are not captains.",
    capitaes3:
      "The number of captains equals the number of teams (sign-ups ÷ 5; with 40 sign-ups, that makes 8).",
    capitaes4:
      "A live draw decides which team each captain will lead and the pick order of the draft.",
    capitaes5:
      "The captain is also a player: they take the role from their sign-up, which is fixed regardless of the role they actually play in the game, and their point value comes out of the team's budget.",
    draftTitulo: "POINTS DRAFT",
    draft1:
      "Every player has a point value based on their rank. The value table will only be set once the full player list is closed, with up-to-date ranks.",
    draft2:
      "Each captain receives a budget set together with the table: the average points per team + 15%, rounded up.",
    draft3:
      "The captain comes in with the fixed role from their sign-up, and the draft runs over 4 rounds for the other 4 roles.",
    draft4:
      "Pick order is snake (e.g. with 6 teams, 1-2-3-4-5-6-6-5-4-3-2-1) and cannot be swapped or changed once drawn.",
    draft5:
      "No captain may go over budget; they must always keep enough points to fill the remaining rounds with the cheapest player still available in each role.",
    draft6: "A player who has been picked cannot be picked by another team.",
    tabelaValoresRotulo: "Value table.",
    tabelaValoresTexto:
      "It will be published once the full player list is closed, with up-to-date ranks. The values will be recalculated for this edition instead of reusing the 3rd edition's.",

    // ---------- app/regras: 4. regras (numeradas; id="regra-N" na página) ----------
    regrasGeraisTitulo: "GENERAL RULES",
    regra1:
      "People from outside the WhatsApp/Discord group whom we do not know will not be accepted. Being in the group and known to us is enough — there is no minimum time in the group.",
    regra2:
      "Captains build their team through the draft and the point value of each rank, as set out in the {secao} section.",
    regra2Link: "Team formation",
    regra3: "Players must have completed their 5 solo/duo queue placement games to take part.",
    regra4:
      "Players must have played at least 5 solo/duo queue games in the 10 days before the tournament starts. Games in other queues do not count.",
    regra5: "Smurf accounts will not be accepted.",
    regra6:
      "There will be no outside substitutes — only players from the group itself (sign-ups or official reserves) who meet rules 3, 4, 5 and 21 and whose point value is equal to or lower than that of the player being replaced; otherwise, the substitution needs the organisers' approval. Nobody is obliged to accept. Substitutions are declared at check-in.",
    regra7: "10-minute grace period per SERIES (Bo3 or Bo5), not per game.",
    regra8:
      "Once the grace period in rule 7 has passed, a team without 5 players present (starters or rule 6 substitutes) loses by walkover (W.O.): a 2-0 win and 3 points for the complete team that is present. If neither team is complete, it is a double W.O.: nobody scores and the series is not rescheduled.",
    regra9:
      "Swapping fixtures with other captains, or moving games earlier or later, is not allowed. The availability given at sign-up counts as a commitment: the organisers build the schedule after the draft and, once published, it is final.",
    regra10:
      "A captain may swap the lanes of two players during a series; however, the players can only return to their original lane after one game following the swap. A swap caused by a wildcard (ROLE SWAP) does not count as the swap in this rule.",
    regra11:
      "Mandatory check-in: every player in the series must confirm attendance on Discord at least 10 minutes before the scheduled time. Anyone who has not confirmed by the scheduled time counts as absent for the grace period.",
    regra12:
      "Verified account: each player must give the Riot ID of the account they will use before the tournament starts — switching accounts or changing nickname without prior notice means disqualification from the game.",
    regra13:
      "Side choice (blue/red side): drawn by the organisers before game 1 of the series; in the following games, the team that lost the previous game picks the side.",
    regra14:
      "Behaviour and fair play: insults, hate speech, deliberate griefing or any unsporting conduct (in or out of the game) may lead to a warning, loss of the game (W.O.) or the team's disqualification, at the organisers' discretion.",
    regra15:
      "Technical problems: a disconnect during a game neither pauses nor voids it — it is up to the team to get the player back in. A remake is only possible if the problem happens in the first 3 minutes of the game and both captains agree. Exceptional cases will be assessed by the organisers.",
    regra16:
      "Reporting results: at the end of each series, the winning captain must post a screenshot of the result screen (or of the completed match sheet) in the official Discord channel within 15 minutes of the end. If it is not posted in time, the winning team loses 1 of its 5 bans in game 1 of its next series; if there is no next series, it receives a recorded warning.",
    regra17:
      "Broadcast/recording: games may be recorded/streamed by the organisers; by taking part, players authorise the use of their image/nickname for that purpose. Every game will be streamed on Twitch (n4kay or thalissonvieira channel), with each game's channel announced in advance. Watching the stream during your own game is forbidden.",
    regra18:
      "Rule changes: the organisers reserve the right to adjust the rulebook before the tournament starts, if needed, with prior notice on Discord and in the WhatsApp group.",
    regra19:
      "Ties in the standings (points stage): tiebreakers in this order — head-to-head, then game difference (games won minus games lost, with a W.O. counting as 2-0), then a random draw. In a tie between 3 or more teams, head-to-head only considers the games between the tied teams.",
    regra20:
      "Voice chat: using the tournament's official voice channel during games is mandatory, for refereeing and settling disputes. A team may not play without every player on voice; until then the game does not start and the clock runs as grace period.",
    regra21:
      "Your Riot account must be linked to Discord (Settings > Connections) before the tournament starts, to reduce fraud and make it easier for the organisers to check rank and match history.",
    regra22:
      "Sign-up: the fee, deadline and payment method are announced on the site and in the group; a place is only confirmed after payment.",

    // ---------- app/regras: 5. cartinhas surpresa ----------
    cartasTitulo: "SURPRISE WILDCARDS",
    cartasIntro:
      "In each series, each captain may use at most 1 surprise wildcard, drawn live in front of everyone before the pick & ban of the chosen game.",
    cartasRegra1:
      "The wildcard only applies to the game it was used in, and it can be used in any game of the series.",
    cartasRegra2:
      "Any choices the wildcard requires (which players, which lanes) are made on the spot and reported to the organisers.",
    cartasRegra3: "Questions about how an effect applies are decided by the organisers.",
    cartasIndividuaisLabel: "SINGLE WILDCARDS",
    cartasIndividuaisTexto:
      "The effect only hits the opposing team; the draw is among the single wildcards.",
    cartasDuplasLabel: "DOUBLE WILDCARDS",
    cartasDuplasTexto:
      "They affect both teams. When both captains decide to use a wildcard in the same game, two more wildcards come in and the draw is made among all of them (single and double), once for that game.",
    efeitoAbcdraft:
      "Two letters are drawn. The opposing captain must build the composition using only champions whose names start with those letters.",
    efeitoDraftSabotado:
      "The captain who played the wildcard picks the champion for two players on the opposing team, respecting each one's role (e.g. no Yuumi in the jungle).",
    efeitoInterClasse:
      "A champion class is drawn. The opposing team may only pick champions from that class.",
    efeitoInversaoRotas:
      "The captain who played the wildcard picks two players on the opposing team to swap lanes with each other.",
    efeitoTudoLiberado: "The opposing team is not allowed to ban any champion.",
    efeitoAmigosNatureza: "Neither team may have a Jungler or take Smite.",
    efeitoDraftInvertido:
      "One team picks the other's draft; champions must belong to each player's role, with no swapping champions between different roles.",
    cartasNovasRotulo: "New wildcards.",
    cartasNovasTexto:
      "The list will grow with other wildcards, which the organisers will announce later. The YUUMI INVASION wildcard has been withdrawn.",

    // ---------- app/regras: 6. pontuação e fases finais ----------
    pontuacaoTitulo: "POINTS AND PLAYOFFS",
    pontuacaoIntro:
      "The top 4 of the round-robin stage go through to the semifinals, and each series won is worth 3 points.",
    pontuacaoFaseK: "Round-robin stage:",
    pontuacaoFaseV: "series win (2-0 or 2-1) = 3 points; loss = 0. A W.O. counts as 2-0 (rule 8).",
    pontuacaoDesempateK: "Tiebreakers:",
    pontuacaoDesempateV: "as per {regra} — head-to-head, then game difference, then a random draw.",
    pontuacaoDesempateLink: "rule 19",
    pontuacaoSemisK: "Semifinals (Bo3):",
    pontuacaoSemisV: "1st v 4th and 2nd v 3rd. Everyone else is eliminated.",
    pontuacaoFinalK: "Final (Bo5):",
    pontuacaoFinalV:
      "the semifinal winners. Side choice follows rule 13: drawn for game 1 and, in the following games, the team that lost the previous game picks.",
    pontuacaoSeriesK: "Bo3 and Bo5 series:",
    pontuacaoSeriesV: "the first team to win 2 (Bo3) or 3 (Bo5) games wins the series.",

    // ---------- app/regras: premiação (decisão da organização de 05/10/2026) ----------
    premiacaoTitulo: "PRIZES",
    premiacaoTexto:
      "100% of the money raised from entry fees becomes prize money: {campeao} to the champions and {vice} to the runners-up. The organisers keep nothing.",
    premiacaoTextoSemConfig:
      "100% of the money raised from entry fees becomes prize money, split between the champions and the runners-up. The organisers keep nothing.",
    premiacaoCampeaoK: "CHAMPIONS",
    premiacaoViceK: "RUNNERS-UP",
    premiacaoOrganizadores:
      "This edition's organisers play, but they do not pay the entry fee and are not captains.",

    // ---------- app/regras: 7. calendário modelo ----------
    calendarioTitulo: "SAMPLE SCHEDULE (8 TEAMS)",
    calendarioIntro:
      "With 8 teams (40 sign-ups) there are 31 series: 28 in the round robin, 2 semifinals and the final. At 6 series per date (3 in the morning and 3 in the afternoon), they fit into 6 dates, or 3 weekends.",
    calColData: "Date",
    calColTurno: "Session",
    calColHorarios: "Times",
    calColOque: "What happens",
    calDatas1a4: "Dates 1 to 4",
    calData5: "Date 5",
    calData6: "Date 6",
    turnoManha: "Morning",
    turnoTarde: "Afternoon",
    turnoNoite: "Evening",
    calSeries3: "3 round-robin series",
    calUltimaSerie:
      "Last series of the points stage (28th); the rest of the session is held in reserve for rescheduling",
    calSemis: "Semifinals: 1st v 4th and 2nd v 3rd",
    calFinal: "Bo5 final",
    calendarioNota:
      "Fixtures are set by a live draw after the draft. Dates will be announced as soon as sign-ups close, and the times come out after the draft, cross-checking the availability by session (morning, afternoon and evening) given by every player on each team. Each Bo3 series is allotted about 90 minutes; the Bo5 final may run past 3 hours.",
    calendarioOutros:
      "With a different number of teams the maths changes: the round robin has 10 series with 5 teams, 15 with 6 and 21 with 7.",

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
