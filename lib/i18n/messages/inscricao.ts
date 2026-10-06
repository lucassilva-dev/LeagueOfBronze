import { definir } from "@/lib/i18n/definir";

/**
 * Textos da inscrição da 4ª Edição.
 *
 * Nota sobre números: nada de valor, prazo ou quantidade fica escrito aqui. Taxa,
 * divisão do prêmio, mínimo de partidas e prazo de pagamento vêm de `edicao_config` e
 * são interpolados pela página. O regulamento permite ajustar o regulamento antes do
 * início (regra 18) — se estivessem no texto, mudariam em um lugar e continuariam
 * errados no outro.
 *
 * As regras citadas entre parênteses são as do regulamento da 4ª Edição (1 a 22).
 */
export const inscricao = definir({
  pt: {
    // ---------------------------------------------------------------- cabeçalho
    eyebrow: "4ª Edição · 2026",
    titulo: "INSCRIÇÃO",
    subtitulo: "A inscrição é individual. Os times só existem depois do draft.",

    // ---------------------------------------------------------------- estados da janela
    fechadaTitulo: "As inscrições ainda não abriram",
    fechadaTexto:
      "Esta página fica de pé assim que a organização abrir a janela. Acompanhe pelo Discord ou pelo grupo do WhatsApp — o aviso sai por lá primeiro.",
    encerradaTitulo: "As inscrições estão encerradas",
    encerradaTexto:
      "A janela desta edição fechou. Se você ficou de fora e quer entrar numa eventual vaga, fale com a organização.",
    jaInscritoTitulo: "Você já está inscrito",
    jaInscritoTexto:
      "A sua inscrição nesta edição já foi enviada. Acompanhe a conferência dos requisitos e o pagamento em Minha inscrição.",
    indisponivelTitulo: "Inscrição indisponível no momento",
    indisponivelTexto:
      "Não conseguimos carregar a configuração da edição agora. Tente de novo em alguns minutos.",
    dataIndefinida: "a definir",

    // ---------------------------------------------------------------- passos
    passo1: "IDENTIDADE",
    passo2: "JOGO",
    passo3: "CONFIRMAÇÃO",
    voltar: "← VOLTAR",
    continuar: "CONTINUAR →",

    // ---------------------------------------------------------------- passo 1
    nickLabel: "NICK DA RIOT",
    nickPlaceholder: "SeuNick",
    tagLabel: "#TAG",
    tagPlaceholder: "BR1",
    riotAjuda:
      "Exatamente como aparece no cliente. É por aqui que a organização confere a conta e o histórico.",
    emailLabel: "E-MAIL",
    emailPlaceholder: "voce@email.com",
    senhaLabel: "CRIE UMA SENHA",
    contaAjuda:
      "É com esse e-mail e senha que você entra no site. Se você for capitão, é assim que abre o seu painel no dia do draft.",
    discordLabel: "USUÁRIO DO DISCORD",
    discordPlaceholder: "seuusuario",
    discordAjuda: "Sua conta da Riot precisa estar vinculada a este Discord (regra 21).",
    whatsappLabel: "WHATSAPP",
    whatsappPlaceholder: "(00) 00000-0000",
    whatsappAjuda: "Opcional. Serve para a organização te achar rápido no dia do jogo.",
    nomeLabel: "NOME E SOBRENOME",
    nomePlaceholder: "Como aparece no grupo do WhatsApp",
    nomeAjuda: "Como no grupo do WhatsApp — é assim que a organização confere que você é do grupo (regra 1).",
    nomeIncompleto: "Informe nome e sobrenome.",
    campoObrigatorio: "Campo obrigatório.",
    nickCurto: "O nick precisa de ao menos 3 caracteres.",
    nickComHash: "Não inclua o # aqui — a tag vai no campo ao lado.",
    tagInvalida: "A tag tem de 2 a 8 letras ou números, sem espaço.",
    textoLongo: "Texto longo demais para este campo.",

    // conta já existente
    jaTenhoConta: "Já tenho conta",
    // Página /entrar. Ela existe porque, com as inscrições fechadas, o formulário some
    // — e com ele sumiam os únicos campos de login do site. Um capitão que perdesse a
    // sessão no dia do draft ficava sem caminho de volta.
    entrarPaginaSubtitulo:
      "Entre para acompanhar sua inscrição e, se for capitão, abrir seu painel no dia do draft.",
    entrarSemConta: "Ainda não tem conta?",
    entrarVoltar: "← Voltar ao início",
    // Rótulo próprio: na tela de entrar, "CRIE UMA SENHA" (herdado do cadastro) pede
    // à pessoa exatamente o oposto do que ela vai fazer.
    senhaLoginLabel: "SENHA",
    // Uma porta só para as duas contas. O rótulo precisa dizer isso, senão quem é da
    // organização digita o usuário num campo que pede e-mail e desiste.
    entrarIdentificador: "E-MAIL OU USUÁRIO",
    entrarIdentificadorAjuda:
      "Jogador entra com o e-mail; quem é da organização, com o nome de usuário.",
    entrarIdentificadorPlaceholder: "voce@email.com",
    entrarTitulo: "Entrar",
    entrarBotao: "ENTRAR",
    entrarAjuda: "Entre para continuar a inscrição com a conta que você já criou.",
    logadoComo: "Inscrevendo com a conta",
    sair: "Sair",

    // ---------------------------------------------------------------- passo 2
    eloLabel: "ELO ATUAL — FILA SOLO/DUO",
    eloAjuda:
      "Só o elo importa, sem divisão I–IV. Quanto cada elo vale no draft só é definido quando a lista de inscritos fechar, com os elos atualizados.",
    rotas: {
      TOPO: "TOPO",
      SELVA: "SELVA",
      MEIO: "MEIO",
      ATIRADOR: "ATIRADOR",
      SUPORTE: "SUPORTE",
    },
    rota1Label: "ROTA PRIMÁRIA",
    rota2Label: "ROTA SECUNDÁRIA",
    rotasIguais: "A rota secundária precisa ser diferente da primária.",
    disponibilidadeLabel: "DISPONIBILIDADE PARA JOGAR",
    disponibilidadeAjuda:
      "Marque todos os turnos em que você pode jogar. Vale como compromisso (regra 9) e vale para o time inteiro: quem só pode à noite leva o time todo para a noite.",
    disponibilidadeFaltando: "Marque pelo menos um turno.",
    turnos: {
      manha: "MANHÃ",
      tarde: "TARDE",
      noite: "NOITE",
    },
    capitaesTitulo: "QUEM É CAPITÃO",
    capitaesTexto:
      "Os capitães são os inscritos de maior elo, independentemente da rota — não é preciso se candidatar. Quem organiza esta edição não é capitão.",

    // ---------------------------------------------------------------- passo 3
    resumoTitulo: "SUA INSCRIÇÃO",
    taxaTitulo: "TAXA DE INSCRIÇÃO",
    taxaTexto:
      "100% do valor arrecadado vira premiação: {campeao}% para o campeão e {vice}% para o vice. A organização não fica com nada, e quem organiza esta edição não paga inscrição.",
    pixLabel: "CHAVE PIX",
    pixCopiar: "COPIAR",
    pixCopiado: "COPIADO",
    pixIndisponivel: "A organização ainda vai divulgar a chave.",
    pixQrRotulo: "QR code do Pix da inscrição, {valor}",
    pixQrAjuda:
      "No app do banco, escolha Pix e leia o QR code — o valor de {valor} já vem preenchido. Antes de confirmar, o app mostra o nome de quem recebe.",
    pixCopiaEColaLabel: "PIX COPIA E COLA",
    pixCopiarCodigo: "COPIAR CÓDIGO PIX",
    pixDepoisDoEnvio:
      "Assim que você enviar a inscrição, aparece o QR code do Pix com o valor já preenchido. Pague depois de enviar.",
    pagamentoAjuda:
      "Depois de pagar, avise a organização no Discord. A inscrição só é confirmada quando alguém conferir o extrato.",
    prazoAviso:
      "Você tem {dias} dias para pagar depois de enviar a inscrição. A vaga só é confirmada depois do pagamento (regra 22).",
    enviar: "ENVIAR INSCRIÇÃO",
    enviando: "ENVIANDO…",

    // aceites — os números saem da configuração
    lerRegulamento: "Ler o regulamento completo",
    aceite1:
      "Li e aceito o regulamento da 4ª Edição e estou ciente de que a vaga só é confirmada depois do pagamento da taxa (regra 22).",
    aceite2:
      "Autorizo a gravação e a transmissão das partidas com a minha imagem e o meu nick (regra 17), e a publicação no site do meu Riot ID, elo, rotas, time e estatísticas.",
    aceite3:
      "Confirmo que sou do grupo (regra 1), que fiz a MD5 da solo/duo (regra 3), que minha conta da Riot está vinculada ao meu Discord (regra 21), que esta não é uma conta smurf (regra 5) e que vou jogar ao menos {partidas} partidas solo/duo nos 10 dias anteriores ao início do torneio (regra 4).",
    aceitesFaltando: "Marque os três itens para enviar.",

    // ---------------------------------------------------------------- resultado
    prontoTitulo: "INSCRIÇÃO RECEBIDA",
    prontoVer: "ACOMPANHAR MINHA INSCRIÇÃO →",
    erroGenerico: "Não foi possível enviar agora. Tente de novo em instantes.",

    // ---------------------------------------------------------------- minha inscrição
    minhaTitulo: "MINHA INSCRIÇÃO",
    minhaSubtitulo: "O que a organização já conferiu e o que ainda falta.",
    minhaSemConta: "Entre na sua conta para ver a sua inscrição.",
    minhaSemInscricao: "Você ainda não tem inscrição nesta edição.",
    minhaIrParaInscricao: "FAZER MINHA INSCRIÇÃO →",
    situacaoLabel: "SITUAÇÃO",
    pagamentoLabel: "PAGAMENTO",
    disponibilidadeNaoInformada: "Ainda não informada — fale com a organização.",
    conferenciaTitulo: "CONFERÊNCIA DOS REQUISITOS",
    conferenciaAjuda:
      "Alguns itens só podem ser conferidos perto do início do campeonato — por isso podem ficar como “aguardando”.",
    venceEm: "Vence em",
    jaPaguei: "JÁ PAGUEI",
    jaPagueiAjuda:
      "Isto avisa a organização. A confirmação só acontece quando alguém abrir o extrato.",
    declarado: "Você avisou que pagou. Aguardando a conferência da organização.",

    situacoes: {
      pendente: "Em análise",
      apto: "Aprovado",
      recusado: "Recusado",
      desistiu: "Desistiu",
      sobra: "Aprovado, fora dos times",
    },
    pagamentos: {
      aguardando: "Aguardando pagamento",
      declarado: "Declarado, em conferência",
      pago: "Pago e conferido",
      isento: "Isento",
      estorno_devido: "Estorno a caminho",
      estornado: "Estornado",
      cancelado: "Cancelado",
    },
    conferencias: {
      pendente: "Aguardando",
      ok: "OK",
      provisorio: "Provisório",
      risco: "Atenção",
      recusado: "Recusado",
      nao_avaliavel: "Ainda não avaliável",
      excecao: "Exceção concedida",
    },
    itens: {
      a: "Membro do grupo",
      b: "Riot vinculada ao Discord",
      d: "MD5 da solo/duo",
      e: "Partidas recentes na solo/duo",
      f: "Não é smurf",
      m: "Riot ID confere",
    },
  },

  en: {
    eyebrow: "4th Edition · 2026",
    titulo: "SIGN-UP",
    subtitulo: "Sign-up is individual. Teams only exist after the draft.",

    fechadaTitulo: "Sign-ups haven't opened yet",
    fechadaTexto:
      "This page goes live as soon as the organizers open the window. Watch Discord or the WhatsApp group — the announcement lands there first.",
    encerradaTitulo: "Sign-ups are closed",
    encerradaTexto:
      "This edition's window has closed. If you missed it and want a spot should one open, talk to the organizers.",
    jaInscritoTitulo: "You're already signed up",
    jaInscritoTexto:
      "Your sign-up for this edition has already been sent. Follow the requirement checks and the payment in My sign-up.",
    indisponivelTitulo: "Sign-up unavailable right now",
    indisponivelTexto: "We couldn't load the edition settings. Try again in a few minutes.",
    dataIndefinida: "to be defined",

    passo1: "IDENTITY",
    passo2: "GAME",
    passo3: "CONFIRMATION",
    voltar: "← BACK",
    continuar: "CONTINUE →",

    nickLabel: "RIOT NAME",
    nickPlaceholder: "YourName",
    tagLabel: "#TAG",
    tagPlaceholder: "BR1",
    riotAjuda:
      "Exactly as it appears in the client. This is how the organizers check the account and its history.",
    emailLabel: "E-MAIL",
    emailPlaceholder: "you@email.com",
    senhaLabel: "CREATE A PASSWORD",
    contaAjuda:
      "You sign in with this e-mail and password. If you're a captain, this is how you open your panel on draft day.",
    discordLabel: "DISCORD USERNAME",
    discordPlaceholder: "yourhandle",
    discordAjuda: "Your Riot account must be linked to this Discord (rule 21).",
    whatsappLabel: "WHATSAPP",
    whatsappPlaceholder: "(00) 00000-0000",
    whatsappAjuda: "Optional. It helps the organizers reach you quickly on match day.",
    nomeLabel: "FIRST AND LAST NAME",
    nomePlaceholder: "As it shows in the WhatsApp group",
    nomeAjuda: "As in the WhatsApp group — it's how the organizers check you're part of the group (rule 1).",
    nomeIncompleto: "Enter your first and last name.",
    campoObrigatorio: "Required field.",
    nickCurto: "Your name needs at least 3 characters.",
    nickComHash: "Leave the # out — the tag goes in the field next to it.",
    tagInvalida: "The tag has 2 to 8 letters or numbers, no spaces.",
    textoLongo: "Too long for this field.",

    jaTenhoConta: "I already have an account",
    entrarPaginaSubtitulo:
      "Sign in to follow your sign-up and, if you're a captain, open your panel on draft day.",
    entrarSemConta: "Don't have an account yet?",
    entrarVoltar: "← Back to home",
    senhaLoginLabel: "PASSWORD",
    entrarIdentificador: "E-MAIL OR USERNAME",
    entrarIdentificadorAjuda: "Players sign in with their e-mail; organisers with their username.",
    entrarIdentificadorPlaceholder: "you@email.com",
    entrarTitulo: "Sign in",
    entrarBotao: "SIGN IN",
    entrarAjuda: "Sign in to continue with the account you already created.",
    logadoComo: "Signing up with the account",
    sair: "Sign out",

    eloLabel: "CURRENT RANK — SOLO/DUO QUEUE",
    eloAjuda:
      "Only the tier matters, no I–IV divisions. How much each tier is worth in the draft is only set once the sign-up list closes, with updated ranks.",
    rotas: {
      TOPO: "TOP",
      SELVA: "JUNGLE",
      MEIO: "MID",
      ATIRADOR: "BOT",
      SUPORTE: "SUPPORT",
    },
    rota1Label: "PRIMARY ROLE",
    rota2Label: "SECONDARY ROLE",
    rotasIguais: "The secondary role must differ from the primary one.",
    disponibilidadeLabel: "AVAILABILITY TO PLAY",
    disponibilidadeAjuda:
      "Tick every period you can play. It counts as a commitment (rule 9) and applies to the whole team: someone who can only play at night takes the whole team to the night slot.",
    disponibilidadeFaltando: "Tick at least one period.",
    turnos: {
      manha: "MORNING",
      tarde: "AFTERNOON",
      noite: "NIGHT",
    },
    capitaesTitulo: "WHO CAPTAINS",
    capitaesTexto:
      "Captains are the highest-ranked players signed up, regardless of role — there's no need to apply. The organizers of this edition are not captains.",

    resumoTitulo: "YOUR SIGN-UP",
    taxaTitulo: "ENTRY FEE",
    taxaTexto:
      "100% of what is collected becomes prize money: {campeao}% to the champion and {vice}% to the runner-up. The organizers keep nothing, and this edition's organizers don't pay the fee.",
    pixLabel: "PIX KEY",
    pixCopiar: "COPY",
    pixCopiado: "COPIED",
    pixIndisponivel: "The organizers haven't published the key yet.",
    pixQrRotulo: "Pix QR code for the sign-up fee, {valor}",
    pixQrAjuda:
      "In your bank app, choose Pix and scan the QR code — the {valor} amount is already filled in. Before you confirm, the app shows who receives it.",
    pixCopiaEColaLabel: "PIX COPY AND PASTE",
    pixCopiarCodigo: "COPY PIX CODE",
    pixDepoisDoEnvio:
      "As soon as you submit your sign-up, the Pix QR code shows up with the amount already filled in. Pay after submitting.",
    pagamentoAjuda:
      "After paying, tell the organizers on Discord. Sign-up is only confirmed once someone checks the bank statement.",
    prazoAviso:
      "You have {dias} days to pay after submitting. Your spot is only confirmed after payment (rule 22).",
    enviar: "SUBMIT SIGN-UP",
    enviando: "SUBMITTING…",

    lerRegulamento: "Read the full rulebook",
    aceite1:
      "I have read and accept the 4th Edition rulebook, and I understand my spot is only confirmed after the fee is paid (rule 22).",
    aceite2:
      "I allow matches to be recorded and streamed with my image and in-game name (rule 17), and my Riot ID, rank, roles, team and stats to be published on the site.",
    aceite3:
      "I confirm I'm part of the group (rule 1), that I played my solo/duo placement games (rule 3), that my Riot account is linked to my Discord (rule 21), that this is not a smurf account (rule 5), and that I'll play at least {partidas} solo/duo games in the 10 days before the tournament starts (rule 4).",
    aceitesFaltando: "Tick all three to submit.",

    prontoTitulo: "SIGN-UP RECEIVED",
    prontoVer: "TRACK MY SIGN-UP →",
    erroGenerico: "We couldn't submit right now. Try again in a moment.",

    minhaTitulo: "MY SIGN-UP",
    minhaSubtitulo: "What the organizers have checked and what is still missing.",
    minhaSemConta: "Sign in to see your sign-up.",
    minhaSemInscricao: "You don't have a sign-up for this edition yet.",
    minhaIrParaInscricao: "SIGN ME UP →",
    situacaoLabel: "STATUS",
    pagamentoLabel: "PAYMENT",
    disponibilidadeNaoInformada: "Not provided yet — talk to the organizers.",
    conferenciaTitulo: "REQUIREMENT CHECKS",
    conferenciaAjuda:
      "Some items can only be checked close to the start of the tournament — that's why they may sit as “waiting”.",
    venceEm: "Due",
    jaPaguei: "I'VE PAID",
    jaPagueiAjuda:
      "This notifies the organizers. Confirmation only happens once someone opens the bank statement.",
    declarado: "You reported the payment. Waiting for the organizers to check it.",

    situacoes: {
      pendente: "Under review",
      apto: "Approved",
      recusado: "Rejected",
      desistiu: "Withdrew",
      sobra: "Approved, outside the teams",
    },
    pagamentos: {
      aguardando: "Awaiting payment",
      declarado: "Reported, being checked",
      pago: "Paid and checked",
      isento: "Exempt",
      estorno_devido: "Refund on the way",
      estornado: "Refunded",
      cancelado: "Cancelled",
    },
    conferencias: {
      pendente: "Waiting",
      ok: "OK",
      provisorio: "Provisional",
      risco: "Needs attention",
      recusado: "Rejected",
      nao_avaliavel: "Not checkable yet",
      excecao: "Exception granted",
    },
    itens: {
      a: "Member of the group",
      b: "Riot account linked to Discord",
      d: "Solo/duo placements",
      e: "Recent solo/duo games",
      f: "Not a smurf",
      m: "Riot ID matches",
    },
  },
});
