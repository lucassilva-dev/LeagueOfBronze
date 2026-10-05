import { definir } from "@/lib/i18n/definir";

/**
 * Textos da PRÉ-TEMPORADA — o intervalo entre arquivar uma edição e aplicar o draft da
 * próxima (ver lib/fase-do-site.ts).
 *
 * Regra da casa: nada aqui crava data nem número de times — as datas saem depois que as
 * inscrições fecham e os times dependem de quantos se inscrevem. O formato segue o
 * regulamento da 4ª (pontos corridos em MD3, semifinais e final em MD5). O que é número
 * (taxa, prazo) vem da Configuração da edição e é interpolado pela página: `{valor}`,
 * `{dias}` e `{temporada}`.
 */
export const preTemporada = definir({
  pt: {
    // ---------- home · hero ----------
    homeSobretitulo: "Campeonato amador de League of Legends",
    homeTituloLinha1: "4ª EDIÇÃO",
    homeTituloLinha2: "LEAGUE OF BRONZE",
    seloAberta: "INSCRIÇÕES ABERTAS",
    seloAindaNaoAbriu: "INSCRIÇÕES EM BREVE",
    seloEncerrada: "INSCRIÇÕES ENCERRADAS",
    seloIndisponivel: "INSCRIÇÕES",
    introAberta:
      "A inscrição é individual: você se inscreve sozinho, a organização confere os requisitos e os times saem de um draft ao vivo, com os capitães escolhendo jogadores por pontos.",
    introAindaNaoAbriu:
      "A 4ª Edição está em organização. Quando as inscrições abrirem, o aviso sai primeiro no Discord e no grupo do WhatsApp.",
    introEncerrada:
      "As inscrições da 4ª Edição foram encerradas. Os times saem do draft ao vivo — acompanhe pelo Discord e pelo grupo do WhatsApp.",
    botaoInscrever: "FAZER MINHA INSCRIÇÃO →",
    botaoVerInscricao: "VER A INSCRIÇÃO →",
    botaoRegras: "REGRAS",
    botaoTemporadas: "TEMPORADAS",
    pilulaIndividual: "INSCRIÇÃO INDIVIDUAL",
    pilulaTaxa: "TAXA DE {valor}",
    pilulaPremio: "100% DO ARRECADADO VIRA PRÊMIO",

    // ---------- home · como funciona ----------
    comoTitulo: "COMO FUNCIONA",
    passo1Titulo: "INSCRIÇÃO",
    passo1Texto:
      "Crie sua conta e informe o Riot ID, o elo da solo/duo, as duas rotas que você joga e os turnos em que pode jogar.",
    passo2Titulo: "CONFERÊNCIA",
    passo2Texto:
      "A organização confere os requisitos do regulamento: ser do grupo, MD5 da solo/duo feita, partidas recentes, conta Riot vinculada ao Discord e nada de smurf.",
    passo3Titulo: "PAGAMENTO",
    passo3Texto:
      "Taxa de {valor} por Pix, com {dias} dias de prazo contados do envio da inscrição. Tudo o que é arrecadado vira prêmio.",
    passo3TextoSemValores:
      "A taxa é paga por Pix depois do envio da inscrição. Tudo o que é arrecadado vira prêmio.",
    passo4Titulo: "DRAFT AO VIVO",
    passo4Texto:
      "Os inscritos de maior elo são os capitães e montam os times escolhendo jogadores por pontos — o preço de cada um vem do elo.",
    passo5Titulo: "CAMPEONATO",
    passo5Texto:
      "Pontos corridos em séries MD3, semifinais 1º x 4º e 2º x 3º, e final em MD5. As datas saem quando as inscrições fecharem; os detalhes estão nas Regras.",

    // ---------- home · campeão da edição anterior ----------
    campeaoSobretitulo: "CAMPEÃO · {temporada}",
    campeaoVer: "VER A TEMPORADA →",
    campeaoVerFinal: "VER A FINAL →",

    // ---------- páginas da temporada sem times ----------
    avisoSobretitulo: "League of Bronze — 4ª Edição",
    avisoTitulo: "A 4ª Edição ainda não começou",
    avisoTexto:
      "Os times saem do draft ao vivo, depois das inscrições. Até lá esta página fica vazia — e as edições anteriores continuam inteiras em Temporadas: campeão, tabela, séries e estatísticas.",
    avisoBotaoInscricao: "FAZER MINHA INSCRIÇÃO →",
    avisoBotaoTemporadas: "VER TEMPORADAS",
  },
  en: {
    homeSobretitulo: "Amateur League of Legends tournament",
    homeTituloLinha1: "4TH EDITION",
    homeTituloLinha2: "LEAGUE OF BRONZE",
    seloAberta: "SIGN-UPS OPEN",
    seloAindaNaoAbriu: "SIGN-UPS COMING SOON",
    seloEncerrada: "SIGN-UPS CLOSED",
    seloIndisponivel: "SIGN-UPS",
    introAberta:
      "Sign-up is individual: you register on your own, the organisers check the requirements and teams are formed in a live draft, with captains picking players by points.",
    introAindaNaoAbriu:
      "The 4th Edition is being organised. When sign-ups open, the announcement lands first on Discord and in the WhatsApp group.",
    introEncerrada:
      "Sign-ups for the 4th Edition are closed. Teams are formed in the live draft — follow along on Discord and in the WhatsApp group.",
    botaoInscrever: "SIGN ME UP →",
    botaoVerInscricao: "SEE SIGN-UP →",
    botaoRegras: "RULES",
    botaoTemporadas: "SEASONS",
    pilulaIndividual: "INDIVIDUAL SIGN-UP",
    pilulaTaxa: "{valor} FEE",
    pilulaPremio: "100% OF THE POT GOES TO PRIZES",

    comoTitulo: "HOW IT WORKS",
    passo1Titulo: "SIGN-UP",
    passo1Texto:
      "Create your account and enter your Riot ID, solo/duo rank, the two roles you play and the times of day you can play.",
    passo2Titulo: "VERIFICATION",
    passo2Texto:
      "The organisers check the rulebook requirements: being part of the group, solo/duo placements done, recent games, Riot account linked to Discord and no smurfs.",
    passo3Titulo: "PAYMENT",
    passo3Texto:
      "A {valor} fee via Pix, due within {dias} days of submitting your sign-up. Everything collected goes to prizes.",
    passo3TextoSemValores:
      "The fee is paid via Pix after you submit your sign-up. Everything collected goes to prizes.",
    passo4Titulo: "LIVE DRAFT",
    passo4Texto:
      "The highest-ranked players are the captains, and they build their teams by picking players with points — each player's price comes from their rank.",
    passo5Titulo: "TOURNAMENT",
    passo5Texto:
      "Round robin in best-of-3 series, semi-finals 1st v 4th and 2nd v 3rd, and a best-of-5 final. Dates come out when sign-ups close; the details are in the Rules.",

    campeaoSobretitulo: "CHAMPION · {temporada}",
    campeaoVer: "SEE THE SEASON →",
    campeaoVerFinal: "SEE THE FINAL →",

    avisoSobretitulo: "League of Bronze — 4th Edition",
    avisoTitulo: "The 4th Edition hasn't started yet",
    avisoTexto:
      "Teams are formed in the live draft, after sign-ups. Until then this page stays empty — and past editions are kept in full under Seasons: champion, standings, series and stats.",
    avisoBotaoInscricao: "SIGN ME UP →",
    avisoBotaoTemporadas: "SEE SEASONS",
  },
});
