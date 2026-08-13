import { definir } from "@/lib/i18n/definir";

/**
 * Textos do draft ao vivo e do painel do capitão.
 *
 * Nada de número aqui: orçamento, vagas e segundos por escolha vêm do estado do draft,
 * que por sua vez veio da configuração da edição. O formato muda a cada edição — foi o
 * que aconteceu entre a 2ª e a 3ª — e texto com número cravado envelhece calado.
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
    encerrado: "Draft encerrado",
    encerradoTexto: "Os elencos estão fechados. Boa sorte a todos.",

    // quadro
    rodada: "Rodada",
    de: "de",
    escolha: "Escolha",
    naVez: "NA VEZ",
    capitao: "capitão",
    vagaAberta: "vaga aberta",
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
    verTransmissao: "VER A TRANSMISSÃO →",
    suaVez: "É A SUA VEZ",
    suaVezTexto: "Escolha um jogador antes do tempo acabar. Se o relógio virar, o mais barato válido entra sozinho.",
    aguardeSuaVez: "Aguarde a sua vez",
    vezDe: "Escolhendo agora:",
    podeGastar: "Você pode gastar",
    nestaEscolha: "nesta escolha",
    reservado: "o resto fica reservado para as vagas que ainda faltam",
    escolher: "ESCOLHER",
    escolhendo: "ESCOLHENDO…",
    caroDemais: "acima do que você pode gastar agora",
    buscarJogador: "Buscar por nick, elo ou rota",
    nenhumDisponivel: "Ninguém disponível no momento.",
    meuElenco: "MEU ELENCO",

    erroGenerico: "Não foi possível falar com o servidor. A tela se atualiza sozinha em instantes.",
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
    encerrado: "Draft finished",
    encerradoTexto: "Rosters are closed. Good luck to everyone.",

    rodada: "Round",
    de: "of",
    escolha: "Pick",
    naVez: "ON THE CLOCK",
    capitao: "captain",
    vagaAberta: "open slot",
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
    verTransmissao: "WATCH THE BROADCAST →",
    suaVez: "IT'S YOUR TURN",
    suaVezTexto: "Pick a player before time runs out. If the clock turns, the cheapest valid player comes in.",
    aguardeSuaVez: "Wait for your turn",
    vezDe: "Now picking:",
    podeGastar: "You can spend",
    nestaEscolha: "on this pick",
    reservado: "the rest is reserved for the slots you still have to fill",
    escolher: "PICK",
    escolhendo: "PICKING…",
    caroDemais: "above what you can spend right now",
    buscarJogador: "Search by name, rank or role",
    nenhumDisponivel: "Nobody available right now.",
    meuElenco: "MY ROSTER",

    erroGenerico: "We couldn't reach the server. The screen refreshes itself in a moment.",
  },
});
