import { definir } from "@/lib/i18n/definir";

/**
 * Textos da inscrição da 4ª Edição.
 *
 * Nota sobre números: nada de valor, prazo ou quantidade fica escrito aqui. Taxa,
 * mínimo de ranqueadas, tempo de grupo e prazo de pagamento vêm de `edicao_config`
 * e são interpolados pela página. O regulamento permite ajustar esses parâmetros
 * antes do início (regra t) — se estivessem no texto, mudariam em um lugar e
 * continuariam errados no outro.
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
      "É com esse e-mail e senha que você entra no site. Se for sorteado capitão, é assim que abre o seu painel no dia do draft.",
    discordLabel: "USUÁRIO DO DISCORD",
    discordPlaceholder: "seuusuario",
    whatsappLabel: "WHATSAPP",
    whatsappPlaceholder: "(00) 00000-0000",
    whatsappAjuda: "Opcional. Serve para a organização te achar rápido no dia do jogo.",
    nomeLabel: "NOME (OPCIONAL)",
    nomePlaceholder: "Como te chamam",

    // conta já existente
    jaTenhoConta: "Já tenho conta",
    entrarTitulo: "Entrar",
    entrarBotao: "ENTRAR",
    entrarAjuda: "Entre para continuar a inscrição com a conta que você já criou.",
    logadoComo: "Inscrevendo com a conta",
    sair: "Sair",

    // ---------------------------------------------------------------- passo 2
    eloLabel: "ELO ATUAL — FILA SOLO/DUO",
    eloAjuda: "Só o elo importa, sem divisão I–IV. Ele define quantos pontos você vale no draft.",
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
    capitaoLabel: "QUERO SER CAPITÃO",
    capitaoAjuda:
      "A organização decide o método de escolha dos capitães antes do draft — isto é só uma sinalização.",

    // ---------------------------------------------------------------- passo 3
    resumoTitulo: "VOCÊ NO DRAFT",
    valorLabel: "VALOR",
    pontosSufixo: "PONTOS",
    taxaTitulo: "TAXA DE INSCRIÇÃO",
    taxaTexto:
      "100% do valor arrecadado vira premiação. A organização não retém nada e é isenta da taxa (regra w).",
    pixLabel: "CHAVE PIX",
    pixCopiar: "COPIAR",
    pixCopiado: "COPIADO",
    pixIndisponivel: "A organização ainda vai divulgar a chave.",
    pagamentoAjuda:
      "Depois de pagar, avise a organização no Discord. A inscrição só é confirmada quando alguém conferir o extrato.",
    prazoAviso: "Você tem {dias} dias para pagar depois de enviar a inscrição.",
    enviar: "ENVIAR INSCRIÇÃO",
    enviando: "ENVIANDO…",

    // aceites — os números saem da configuração
    aceite1:
      "Li e aceito o regulamento da 4ª Edição, incluindo W.O., tolerância de atraso e check-in.",
    aceite2:
      "Autorizo o uso da minha imagem e do meu nick nas transmissões do campeonato (regra s).",
    aceite3:
      "Confirmo que estou no grupo há pelo menos {meses}, que já fiz a colocação, que tenho ao menos {partidas} partidas solo/duo nos últimos 30 dias e que esta não é uma conta smurf.",
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
      a: "Tempo de grupo",
      b: "Riot vinculada ao Discord",
      d: "Colocação concluída",
      e: "Ranqueadas recentes",
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
      "You sign in with this e-mail and password. If you're picked as a captain, this is how you open your panel on draft day.",
    discordLabel: "DISCORD USERNAME",
    discordPlaceholder: "yourhandle",
    whatsappLabel: "WHATSAPP",
    whatsappPlaceholder: "(00) 00000-0000",
    whatsappAjuda: "Optional. It helps the organizers reach you quickly on match day.",
    nomeLabel: "NAME (OPTIONAL)",
    nomePlaceholder: "What people call you",

    jaTenhoConta: "I already have an account",
    entrarTitulo: "Sign in",
    entrarBotao: "SIGN IN",
    entrarAjuda: "Sign in to continue with the account you already created.",
    logadoComo: "Signing up with the account",
    sair: "Sign out",

    eloLabel: "CURRENT RANK — SOLO/DUO QUEUE",
    eloAjuda: "Only the tier matters, no I–IV divisions. It sets how many points you're worth in the draft.",
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
    capitaoLabel: "I WANT TO BE A CAPTAIN",
    capitaoAjuda:
      "The organizers decide how captains are chosen before the draft — this is just a signal.",

    resumoTitulo: "YOU IN THE DRAFT",
    valorLabel: "VALUE",
    pontosSufixo: "POINTS",
    taxaTitulo: "ENTRY FEE",
    taxaTexto:
      "100% of what is collected becomes prize money. The organizers keep nothing and are exempt from the fee (rule w).",
    pixLabel: "PIX KEY",
    pixCopiar: "COPY",
    pixCopiado: "COPIED",
    pixIndisponivel: "The organizers haven't published the key yet.",
    pagamentoAjuda:
      "After paying, tell the organizers on Discord. Sign-up is only confirmed once someone checks the bank statement.",
    prazoAviso: "You have {dias} days to pay after submitting.",
    enviar: "SUBMIT SIGN-UP",
    enviando: "SUBMITTING…",

    aceite1:
      "I have read and accept the 4th Edition rulebook, including walkovers, lateness tolerance and check-in.",
    aceite2: "I allow my image and in-game name to be used in the tournament broadcasts (rule s).",
    aceite3:
      "I confirm I have been in the group for at least {meses}, that I finished placements, that I have at least {partidas} solo/duo games in the last 30 days, and that this is not a smurf account.",
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
      a: "Time in the group",
      b: "Riot account linked to Discord",
      d: "Placements completed",
      e: "Recent ranked games",
      f: "Not a smurf",
      m: "Riot ID matches",
    },
  },
});
