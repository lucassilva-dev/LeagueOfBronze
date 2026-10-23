import { definir } from "@/lib/i18n/definir";

/**
 * Textos do draft ao vivo e do painel do capitão.
 *
 * Nada de número aqui: orçamento, vagas e segundos por escolha vêm do estado do draft,
 * que por sua vez veio da configuração da edição. O formato muda a cada edição — foi o
 * que aconteceu entre a 2ª e a 3ª — e texto com número cravado envelhece calado.
 *
 * Os números entram por marcador (`{n}`, `{pontos}`…), preenchido pela tela. Os ordinais
 * têm quatro moldes porque o inglês muda o sufixo (1st, 2nd, 3rd, 4th); em português os
 * quatro são iguais. Os `erros` traduzem a recusa do servidor pelo `codigo` que ela traz
 * (lib/draft/motor.ts e app/api/draft/escolha) — sem eles, o capitão com o site em inglês
 * lia o recado do servidor em português.
 */
export const draft = definir({
  pt: {
    eyebrow: "4ª Edição · ao vivo",
    titulo: "DRAFT",
    subtitulo: "Os capitães montam os elencos. Cada um tem um orçamento e o relógio corre.",

    // estados
    semDraft: "O draft ainda não foi montado",
    semDraftTexto:
      "A organização monta o sorteio depois de fechar a lista de aprovados. Volte quando o horário for anunciado.",
    preparando: "Tudo pronto, aguardando o apito",
    preparandoTexto: "Os times e os capitães já estão definidos. O draft começa quando a organização iniciar.",
    pausado: "Draft pausado",
    pausadoTexto: "A organização interrompeu o relógio. Ninguém escolhe enquanto isso.",
    pausadoAtrasoTexto:
      "O relógio parou sozinho: a conexão caiu por mais de uma escolha inteira. A organização retoma quando todos estiverem de volta.",
    pausadoSemJogadorTexto:
      "O relógio parou sozinho: o time da vez não tem jogador que caiba no orçamento. A organização está resolvendo.",
    encerrado: "Draft encerrado",
    encerradoTexto: "Os elencos estão fechados. Boa sorte a todos.",

    // quadro
    rodada: "Rodada",
    de: "de",
    escolha: "Escolha",
    naVez: "NA VEZ",
    capitao: "capitão",
    vagaAberta: "vaga aberta",
    vagasAbertas: "vagas abertas",
    vagaAbertaN: "{n} vaga aberta",
    vagasAbertasN: "{n} vagas abertas",
    ordinalUm: "{n}º",
    ordinalDois: "{n}º",
    ordinalTres: "{n}º",
    ordinalOutros: "{n}º",
    pontos: "pts",
    pontosLivres: "livres de",
    orcamentoRestante: "ORÇAMENTO RESTANTE",
    espectador: "MODO ESPECTADOR",
    espectadorTexto: "você está acompanhando a transmissão — as escolhas são feitas pelos capitães",
    automatica: "escolha automática",
    semTempo: "sem tempo",

    // painel do capitão
    capitaoTitulo: "PAINEL DO CAPITÃO",
    capitaoSubtitulo: "Escolha quando for a sua vez. O tempo é contado no servidor.",
    entreParaVer: "Entre na sua conta para abrir o seu painel.",
    naoEhCapitao: "Você não é capitão nesta edição",
    naoEhCapitaoTexto:
      "Só quem capitaneia um time escolhe no draft. Você pode acompanhar tudo pela transmissão.",
    semInscricao: "Esta conta não tem inscrição nesta edição",
    semInscricaoTexto:
      "Se você é capitão, saia e entre com a conta usada na inscrição, ou peça à organização para escolher por você.",
    verTransmissao: "VER A TRANSMISSÃO →",
    suaVez: "É A SUA VEZ",
    suaVezTexto: "Escolha um jogador antes do tempo acabar. Se o relógio virar, o mais barato válido entra sozinho.",
    aguardeSuaVez: "Aguarde a sua vez",
    vezDe: "Escolhendo agora:",
    podeGastar: "Você pode gastar",
    nestaEscolha: "nesta escolha",
    reservado: "o resto fica reservado para as vagas que ainda faltam",
    escolher: "ESCOLHER",
    escolherRotulo: "Escolher {riotId}, {pontos} pontos",
    escolhendo: "ESCOLHENDO…",
    caroDemais: "acima do que você pode gastar agora",
    naoFecha: "deixaria algum elenco sem como fechar no orçamento",
    buscarJogador: "Buscar por nick, elo ou rota",
    nenhumDisponivel: "Ninguém disponível no momento.",
    meuElenco: "MEU ELENCO",

    erroGenerico: "Não foi possível falar com o servidor. A tela se atualiza sozinha em instantes.",

    // recusas do servidor, pelo `codigo`
    erros: {
      encerrado: "O draft já terminou.",
      nao_comecou: "O draft ainda não começou.",
      pausado: "O draft está pausado.",
      sem_escolha: "Não há escolha em andamento.",
      nao_e_a_vez: "Não é a vez do seu time.",
      fora_do_pool: "Jogador não está no pool.",
      saiu_do_pool: "{riotId} saiu do draft depois do sorteio e não pode mais ser escolhido. Escolha outro jogador.",
      ja_escolhido: "Esse jogador já foi escolhido.",
      elenco_completo: "Seu elenco já está completo.",
      acima_do_teto:
        "Esse jogador custa {pontos} e você só pode gastar {teto} nesta escolha — o resto está reservado para as vagas que faltam.",
      nao_fecha_o_seu:
        "Com {riotId} ({pontos} pts) o seu elenco não fecha: não sobraria jogador barato o bastante para as vagas que faltam. Escolha alguém mais barato.",
      falta_para_outro:
        "{riotId} é o que falta para outro time conseguir fechar o elenco dentro do orçamento. Escolha outro jogador.",
      vez_passou:
        "Essa escolha não entrou: a sua vez já tinha passado (o tempo acabou ou a escolha já foi feita). Confira o quadro.",
      sem_sessao: "Entre na sua conta para escolher.",
      sem_jogador: "Escolha um jogador.",
      sem_inscricao: "Sua conta não está ligada a uma inscrição.",
      sem_draft: "O draft ainda não foi montado.",
      nao_e_capitao: "Você não é capitão nesta edição.",
      outra_escolha: "Outra escolha entrou primeiro. Confira o quadro e tente de novo.",
    },

    // ---- textos do handoff de design da transmissão ----
    vazioTitulo: "O DRAFT AINDA NÃO ABRIU",
    vazioTexto:
      "Data e horário serão anunciados no Discord. Quando abrir, esta tela vira a transmissão oficial: sorteio dos times, cronômetro, orçamento drenando e cada escolha aparecendo ao vivo.",
    capitaoAbrev: "cap.",
    sorteioKicker: "SORTEIO DOS TIMES E DA ORDEM DE ESCOLHA",
    sorteioTitulo: "OS CAPITÃES ESTÃO DEFINIDOS",
    sorteando: "sorteando…",
    // A sequência (1-2-…-N · N-…-1) é montada pela tela com o número real de times.
    ordemSerpentina: "Ordem serpentina:",
    eRepete: "e repete.",
    escolhaLivre: "ESCOLHA LIVRE",
    poolDisponivel: "POOL DISPONÍVEL",
    poolNota: "quem escolhe é o capitão, pelo painel dele",
    saiuDoDraft: "SAIU DO DRAFT",
    saiuDoDraftNota: "saiu depois do sorteio · não pode mais ser escolhido",
    modoTv: "MODO TV",
    sairDaTv: "SAIR DA TV",
    escolhido: "ESCOLHIDO",
    tempoEsgotado: "TEMPO ESGOTADO · ESCOLHA AUTOMÁTICA",
    fimKicker: "DRAFT ENCERRADO · 4ª EDIÇÃO",
    timesFormados: "OS TIMES ESTÃO FORMADOS",
    fimTexto: "Agora é com vocês. Calendário e confrontos saem no Discord.",
    pontosUsados: "pontos usados",
    jogadores: "jogadores",
  },

  en: {
    eyebrow: "4th Edition · live",
    titulo: "DRAFT",
    subtitulo: "Captains build their rosters. Each has a budget and the clock is running.",

    semDraft: "The draft hasn't been set up yet",
    semDraftTexto:
      "The organizers build the draw after the approved list is closed. Come back when the time is announced.",
    preparando: "Ready, waiting for the whistle",
    preparandoTexto: "Teams and captains are set. The draft begins when the organizers start it.",
    pausado: "Draft paused",
    pausadoTexto: "The organizers stopped the clock. Nobody picks in the meantime.",
    pausadoAtrasoTexto:
      "The clock stopped on its own: the connection dropped for more than one full pick. The organizers will resume once everyone is back.",
    pausadoSemJogadorTexto:
      "The clock stopped on its own: the team on the clock has no player that fits its budget. The organizers are sorting it out.",
    encerrado: "Draft finished",
    encerradoTexto: "Rosters are closed. Good luck to everyone.",

    rodada: "Round",
    de: "of",
    escolha: "Pick",
    naVez: "ON THE CLOCK",
    capitao: "captain",
    vagaAberta: "open slot",
    vagasAbertas: "open slots",
    vagaAbertaN: "{n} open slot",
    vagasAbertasN: "{n} open slots",
    ordinalUm: "{n}st",
    ordinalDois: "{n}nd",
    ordinalTres: "{n}rd",
    ordinalOutros: "{n}th",
    pontos: "pts",
    pontosLivres: "free of",
    orcamentoRestante: "BUDGET LEFT",
    espectador: "SPECTATOR MODE",
    espectadorTexto: "you're watching the broadcast — picks are made by the captains",
    automatica: "auto pick",
    semTempo: "no time",

    capitaoTitulo: "CAPTAIN PANEL",
    capitaoSubtitulo: "Pick when it's your turn. Time is counted on the server.",
    entreParaVer: "Sign in to open your panel.",
    naoEhCapitao: "You're not a captain this edition",
    naoEhCapitaoTexto: "Only captains pick in the draft. You can still follow everything on the broadcast.",
    semInscricao: "This account has no sign-up for this edition",
    semInscricaoTexto:
      "If you are a captain, sign out and sign in with the account you used to sign up, or ask the organizers to pick for you.",
    verTransmissao: "WATCH THE BROADCAST →",
    suaVez: "IT'S YOUR TURN",
    suaVezTexto: "Pick a player before time runs out. If the clock turns, the cheapest valid player comes in.",
    aguardeSuaVez: "Wait for your turn",
    vezDe: "Now picking:",
    podeGastar: "You can spend",
    nestaEscolha: "on this pick",
    reservado: "the rest is reserved for the slots you still have to fill",
    escolher: "PICK",
    escolherRotulo: "Pick {riotId}, {pontos} points",
    escolhendo: "PICKING…",
    caroDemais: "above what you can spend right now",
    naoFecha: "would leave a roster unable to fill up within budget",
    buscarJogador: "Search by name, rank or role",
    nenhumDisponivel: "Nobody available right now.",
    meuElenco: "MY ROSTER",

    erroGenerico: "We couldn't reach the server. The screen refreshes itself in a moment.",

    erros: {
      encerrado: "The draft is over.",
      nao_comecou: "The draft hasn't started yet.",
      pausado: "The draft is paused.",
      sem_escolha: "There's no pick in progress.",
      nao_e_a_vez: "It's not your team's turn.",
      fora_do_pool: "That player isn't in the pool.",
      saiu_do_pool: "{riotId} left the draft after the draw and can no longer be picked. Pick someone else.",
      ja_escolhido: "That player has already been picked.",
      elenco_completo: "Your roster is already full.",
      acima_do_teto:
        "That player costs {pontos} and you can only spend {teto} on this pick — the rest is reserved for the slots you still have to fill.",
      nao_fecha_o_seu:
        "With {riotId} ({pontos} pts) your roster can't be completed: there wouldn't be anyone cheap enough left for your remaining slots. Pick someone cheaper.",
      falta_para_outro:
        "{riotId} is the player another team needs to complete its roster within budget. Pick someone else.",
      vez_passou:
        "That pick didn't go through: your turn had already passed (time ran out or the pick was already made). Check the board.",
      sem_sessao: "Sign in to your account to pick.",
      sem_jogador: "Choose a player.",
      sem_inscricao: "Your account isn't linked to a sign-up.",
      sem_draft: "The draft hasn't been set up yet.",
      nao_e_capitao: "You're not a captain this edition.",
      outra_escolha: "Another pick got in first. Check the board and try again.",
    },

    vazioTitulo: "THE DRAFT HASN'T OPENED YET",
    vazioTexto:
      "Date and time will be announced on Discord. Once it opens, this screen becomes the official broadcast: the team draw, the clock, budgets draining and every pick landing live.",
    capitaoAbrev: "cap.",
    sorteioKicker: "DRAWING THE TEAMS AND THE PICK ORDER",
    sorteioTitulo: "THE CAPTAINS ARE SET",
    sorteando: "drawing…",
    ordemSerpentina: "Snake order:",
    eRepete: "and repeat.",
    escolhaLivre: "FREE PICK",
    poolDisponivel: "AVAILABLE POOL",
    poolNota: "the captain picks, from their own panel",
    saiuDoDraft: "LEFT THE DRAFT",
    saiuDoDraftNota: "left after the draw · can no longer be picked",
    modoTv: "TV MODE",
    sairDaTv: "EXIT TV",
    escolhido: "PICKED",
    tempoEsgotado: "TIME'S UP · AUTOMATIC PICK",
    fimKicker: "DRAFT CLOSED · 4TH EDITION",
    timesFormados: "THE TEAMS ARE SET",
    fimTexto: "It's on you now. Schedule and fixtures go out on Discord.",
    pontosUsados: "points used",
    jogadores: "players",
  },
});
