import { definir } from "@/lib/i18n/definir";

/**
 * E-mail público de contato do campeonato.
 *
 * Exigido para a avaliação da Riot (o revisor precisa conseguir falar com a organização) e
 * para atender pedidos de correção/remoção de dados de LGPD/GDPR — inclusive os que a Riot
 * repassa. Trocar aqui muda em todos os lugares onde aparece.
 */
export const CONTATO_EMAIL = "lucasfullstackdeveloper@gmail.com";

/**
 * Frase de não-endosso EXIGIDA literalmente pelas políticas da Riot Games.
 * Não editar, não traduzir, não abreviar — é copiada da política, palavra por palavra.
 */
export const AVISO_RIOT_OFICIAL =
  "League of Bronze isn't endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games, and all associated properties are trademarks or registered trademarks of Riot Games, Inc.";

export const legal = definir({
  pt: {
    metaTitulo: "Aviso legal e privacidade · League of Bronze",
    metaDescricao:
      "Aviso legal exigido pela Riot Games, atribuição de propriedade intelectual e política de privacidade do site League of Bronze.",
    sobretitulo: "Aviso legal",
    titulo: "LEGAL & PRIVACIDADE",
    subtitulo: "Quem somos, nossa relação com a Riot Games e o que este site guarda sobre você.",

    secaoNaoSomos: "NÃO SOMOS A RIOT GAMES",
    traducaoPrefixo: "Em português:",
    traducaoAviso:
      "League of Bronze não é endossado pela Riot Games e não reflete as visões ou opiniões da Riot Games ou de qualquer pessoa oficialmente envolvida na produção ou gestão das propriedades da Riot Games.",
    projetoAmador:
      "Este é um projeto amador, feito por e para um grupo de amigos, sem qualquer vínculo oficial, patrocínio ou aprovação da Riot Games.",

    secaoPropriedade: "PROPRIEDADE INTELECTUAL E ASSETS",
    marcas:
      "League of Legends e Riot Games são marcas comerciais ou marcas registradas da Riot Games, Inc. League of Legends © Riot Games, Inc.",
    assets:
      "Todo asset da Riot exibido aqui vem de uma fonte oficial e aprovada: as imagens de campeões vêm do Data Dragon; os emblemas de elo (Ferro a Desafiante) vêm do pacote oficial ranked-emblems-latest.zip; e os ícones de posição vêm do pacote oficial ranked-positions.zip — ambos publicados pela Riot Games na documentação para desenvolvedores de League of Legends. Nenhum asset é obtido de fonte não aprovada nem redesenhado.",
    assetsProprios:
      "São criação própria da organização, ou material enviado pelos próprios participantes: o logotipo do campeonato, os escudos dos times, a arte das cartinhas e as fotos dos jogadores.",

    secaoGuarda: "O QUE ESTE SITE GUARDA",
    guardaIntro:
      "Depende do que você faz aqui. Quem só visita não deixa nenhum dado registrado pelo site. Quem cria uma conta de jogador ou se inscreve na edição informa dados que ficam com a organização — explicados nas duas seções logo abaixo. Nas páginas do campeonato aparece só o que é do próprio torneio:",
    guardaItem1: "Riot ID, time, rota e elo de cada participante.",
    guardaItem2:
      "Resultados das partidas: campeões, banimentos, abates/mortes/assistências, duração.",
    guardaItem3: "Foto de perfil, quando o participante envia uma.",
    guardaVisitante:
      "Não usamos cookies de rastreamento, não há anúncios e não há rastreadores de terceiros. Os cookies que existem servem só para o site funcionar, e são estes:",
    cookieIdioma:
      "guarda o idioma escolhido no seletor PT | EN do cabeçalho. Só é criado quando você troca o idioma e dura um ano.",
    cookieJogador:
      "sessão da conta de jogador. É criado quando você cria a conta ou entra com ela, mantém você conectado por até 7 dias e é apagado quando você sai. Scripts da página não conseguem lê-lo.",
    cookieAdmin:
      "sessão do painel administrativo. Só existe no navegador de quem é da organização e entrou no painel; dura até 12 horas e é apagado ao sair. Scripts da página não conseguem lê-lo.",
    guardaLinksExternos:
      "As fichas de jogador trazem links para o OP.GG, um site de estatísticas independente. São apenas links: nada é carregado do OP.GG dentro das nossas páginas e nenhum dado seu é enviado para lá enquanto você navega aqui. Ao clicar, você passa a estar no site deles, sob a política de privacidade deles. Quanto às imagens: as de campeões são carregadas dos servidores da Riot Games (Data Dragon), então seu navegador contata a Riot ao abrir essas páginas; já os emblemas de elo e os ícones de posição foram baixados dos pacotes oficiais e são servidos pelo nosso próprio site, sem contato com terceiros.",
    guardaConsentimento:
      "Todos os participantes são membros do grupo do WhatsApp/Discord que organiza o campeonato. Da 4ª Edição em diante, a inscrição é feita neste site: quem se inscreve aceita o regulamento — que, na regra 17, autoriza o uso da imagem e do nick nas gravações e transmissões — e, no próprio formulário, autoriza a publicação no site do Riot ID, do elo, das rotas, do time e das estatísticas. Nas edições anteriores, a participação seguiu o regulamento de cada uma, combinado no grupo. Em todos os casos, quem participa passa a constar das páginas públicas do campeonato com os dados do torneio listados no início desta seção. Não publicamos dados de nenhum jogador que não seja participante inscrito, e não cruzamos informações para identificar jogadores fora do torneio.",

    secaoConta: "CONTA DE JOGADOR",
    contaIntro:
      "Para se inscrever — e, no caso dos capitães, para escolher no draft — é preciso ter uma conta de jogador. Ela guarda três coisas: o seu e-mail, que é o seu login; o seu nome e sobrenome, informado na inscrição e mostrado quando você está conectado; e a sua senha.",
    contaSenha:
      "A senha nunca é guardada do jeito que você digitou. O site guarda só um hash (scrypt), calculado junto com um segredo que fica no servidor, e não no banco de dados — nem a organização consegue ler a sua senha.",
    contaRegistros:
      "Para manter você conectado e frear quem tenta adivinhar senhas, o site registra cada sessão (início, validade de 7 dias e encerramento) e cada tentativa de entrar ou de criar conta (o e-mail digitado, a data e o resultado). Em nenhum dos dois casos o seu IP é guardado em claro: fica só um hash dele, calculado com um segredo do servidor. Nas sessões também fica um hash do identificador do navegador (user-agent).",
    contaEmail: "O site não envia e-mails — nem de confirmação, nem de propaganda.",
    contaRetencao:
      "A conta não expira sozinha, e o site não tem um botão para apagá-la. Para pedir que ela seja apagada, escreva para o contato no fim desta página.",

    secaoInscricao: "INSCRIÇÃO NA 4ª EDIÇÃO",
    inscricaoIntro:
      "A inscrição é feita na página /inscricao, já com a conta de jogador. O formulário pede:",
    inscricaoItem1: "Nome e sobrenome, como aparecem no grupo do WhatsApp, e o @ do Discord.",
    inscricaoItem2:
      "Riot ID (Nick#TAG) — a conta da Riot precisa estar vinculada ao Discord (regra 21).",
    inscricaoItem3: "Elo atual na fila solo/duo, rota primária e rota secundária.",
    inscricaoItem4: "Disponibilidade por turno: manhã, tarde e/ou noite.",
    inscricaoItem5: "WhatsApp, se você quiser informar.",
    inscricaoItem6:
      "Os aceites: regulamento e ciência do pagamento; gravação e transmissão com a sua imagem e o seu nick (regra 17) e publicação no site do seu Riot ID, elo, rotas, time e estatísticas; e a confirmação de que você cumpre os requisitos das regras 1, 3, 4, 5 e 21.",
    inscricaoAutomatico:
      "Junto com o formulário, o site grava o e-mail da sua conta, a data do envio, o valor em pontos do seu elo para o draft (calculado pelo servidor, nunca enviado pelo navegador) e um hash do IP de onde a inscrição saiu — usado só para frear envio em massa, nunca o IP em claro.",
    inscricaoOrganizacao:
      "Depois do envio, a organização registra na sua ficha a conferência de cada requisito (situação e observações), o elo verificado, a situação da inscrição e a do pagamento. Cada alteração fica num histórico interno, com quem fez e quando.",
    inscricaoPagamento:
      "O pagamento não passa pelo site: não pedimos nem guardamos dados bancários ou de cartão. O site registra só a situação da cobrança — valor, prazo, o seu aviso de pagamento, quando você o dá pelo site, e a conferência feita pela organização.",
    rotuloParaQue: "Para quê.",
    inscricaoParaQue:
      "Para conferir os requisitos das regras 1, 3, 4, 5 e 21 do regulamento; montar os times no draft e o calendário — é para isso que serve a disponibilidade por turno; falar com você durante o campeonato; e cobrar a inscrição, conforme a regra 22.",
    rotuloQuemVe: "Quem vê o quê.",
    inscricaoQuemVe:
      "A organização vê todos os dados da inscrição, pelo painel administrativo. Você acompanha a sua em Minha inscrição: Riot ID, elo, rotas, situação de cada requisito, observações da organização e situação do pagamento. O público não vê o seu nome, e-mail, Discord, WhatsApp nem a sua disponibilidade.",
    inscricaoPublico:
      "Durante o draft ao vivo, a transmissão aqui no site mostra o Riot ID, as rotas, o elo e o valor em pontos de cada jogador do draft. Depois do draft, vão para as páginas do campeonato só o Riot ID, as rotas, o elo e o time; ao longo da edição entram a foto, quando houver, e as estatísticas das partidas.",
    inscricaoTransmissao:
      "Pela regra 17, as partidas podem ser gravadas e transmitidas pela organização, e quem participa autoriza o uso da própria imagem e do nick para essa finalidade. Os jogos são transmitidos na Twitch, nos canais n4kay ou thalissonvieira.",
    rotuloPrazo: "Por quanto tempo.",
    inscricaoPrazo:
      "Os dados de inscrição ficam guardados até você pedir a remoção — não há prazo automático, e o site não apaga nada sozinho, nem ao fim da edição. Para remover os seus, peça pelo contato abaixo. Os resultados públicos — classificação, partidas e elencos — ficam no arquivo de temporadas, como os das edições anteriores.",
    rotuloCorrecao: "Correção ou remoção.",
    inscricaoCorrecaoAntes: "Escreva para",
    inscricaoCorrecaoDepois: "ou fale com a organização no Discord ou no grupo do WhatsApp.",

    secaoApi: "USO DA API DA RIOT GAMES",
    apiComoUsamos:
      "Este site usa a API oficial da Riot Games para importar dados das partidas do campeonato. O acesso é feito somente pelo servidor, em conexão segura, e apenas pela organização a partir do painel administrativo. A chave de API nunca é enviada ao navegador.",
    apiQuaisDados:
      "Quais dados buscamos: identificador da partida (match ID), identificador da conta dos participantes (PUUID), campeões escolhidos e banidos, abates, mortes, assistências, duração e time vencedor. Quando passarmos a usar a Tournament API, também geraremos códigos de torneio e receberemos os resultados das partidas jogadas com esses códigos.",
    apiRetencao:
      "Por quanto tempo: os dados de partida ficam guardados enquanto o campeonato e seu histórico público existirem, porque são o próprio conteúdo do site (classificação e histórico). Identificadores técnicos como PUUID e match ID são usados apenas para vincular a partida ao jogador já cadastrado e não são exibidos publicamente.",
    apiExclusao:
      "Exclusão: atendemos pedidos de exclusão feitos diretamente por participantes e também os repassados pela Riot Games pelos canais oficiais. Ao receber um pedido, removemos os dados daquele jogador do site e do nosso banco.",
    apiNaoFazemos:
      "Não fazemos automação de jogo, scripts, trapaça, integração dentro do jogo, apostas nem qualquer sistema alternativo de ranqueamento de jogadores.",

    secaoContato: "CORREÇÕES E CONTATO",
    contatoTexto:
      "Encontrou um dado errado sobre você, quer que sua foto, seu Riot ID, suas estatísticas ou os dados da sua conta e da sua inscrição sejam removidos, ou precisa falar com a organização? Escreva para:",
    contatoPrazo:
      "Respondemos e atendemos pedidos de correção ou remoção de dados em até 30 dias. Participantes também podem falar com a organização pelo Discord ou pelo grupo de WhatsApp do campeonato.",
  },
  en: {
    metaTitulo: "Legal notice & privacy · League of Bronze",
    metaDescricao:
      "Riot Games required legal notice, intellectual property attribution and privacy policy for the League of Bronze website.",
    sobretitulo: "Legal notice",
    titulo: "LEGAL & PRIVACY",
    subtitulo: "Who we are, our relationship with Riot Games, and what this site stores about you.",

    secaoNaoSomos: "WE ARE NOT RIOT GAMES",
    traducaoPrefixo: "In Portuguese:",
    traducaoAviso:
      "League of Bronze não é endossado pela Riot Games e não reflete as visões ou opiniões da Riot Games ou de qualquer pessoa oficialmente envolvida na produção ou gestão das propriedades da Riot Games.",
    projetoAmador:
      "This is an amateur project, built by and for a group of friends, with no official affiliation, sponsorship or approval from Riot Games.",

    secaoPropriedade: "INTELLECTUAL PROPERTY AND ASSETS",
    marcas:
      "League of Legends and Riot Games are trademarks or registered trademarks of Riot Games, Inc. League of Legends © Riot Games, Inc.",
    assets:
      "Every Riot asset shown here comes from an official, approved source: champion images come from Data Dragon; rank emblems (Iron through Challenger) come from the official ranked-emblems-latest.zip package; and position icons come from the official ranked-positions.zip package — both published by Riot Games in the League of Legends developer documentation. No asset is taken from an unapproved source, and none has been redrawn.",
    assetsProprios:
      "Created by the organisation itself, or submitted by the participants: the tournament logo, the team crests, the wildcard artwork and the player photos.",

    secaoGuarda: "WHAT THIS SITE STORES",
    guardaIntro:
      "It depends on what you do here. Merely visiting leaves no data recorded by the site. Creating a player account or signing up for the edition means giving the organisation some data — explained in the two sections just below. The tournament pages show only what belongs to the tournament itself:",
    guardaItem1: "Riot ID, team, role and rank of each participant.",
    guardaItem2: "Match results: champions, bans, kills/deaths/assists, duration.",
    guardaItem3: "Profile photo, when the participant sends one.",
    guardaVisitante:
      "We use no tracking cookies, there is no advertising and there are no third-party trackers. The cookies that do exist are there only to make the site work, and these are all of them:",
    cookieIdioma:
      "remembers the language picked in the PT | EN switch in the header. It is only set when you change language, and it lasts a year.",
    cookieJogador:
      "player account session. It is set when you create your account or sign in, keeps you signed in for up to 7 days and is cleared when you sign out. Page scripts cannot read it.",
    cookieAdmin:
      "admin panel session. It only exists in the browser of organisers who have signed in to the panel; it lasts up to 12 hours and is cleared on sign-out. Page scripts cannot read it.",
    guardaLinksExternos:
      "Player pages link out to OP.GG, an independent statistics site. These are links only: nothing from OP.GG is loaded inside our pages and none of your data is sent there while you browse here. Once you click, you are on their site, under their privacy policy. As for images: champion art is loaded from Riot Games servers (Data Dragon), so your browser does contact Riot on those pages; rank emblems and position icons were downloaded from the official packs and are served from our own site, with no third party involved.",
    guardaConsentimento:
      "All participants are members of the WhatsApp/Discord group that runs the tournament. From the 4th Edition onwards, sign-up happens on this site: whoever signs up accepts the rules — rule 17 of which authorises the use of their image and nickname in recordings and broadcasts — and, on the sign-up form itself, authorises the publication on the site of their Riot ID, rank, roles, team and stats. In earlier editions, taking part followed each edition's own rules, agreed in the group. In every case, participants appear on the tournament's public pages with the tournament data listed at the start of this section. We publish no data about players who are not registered participants, and we do not cross-reference information to identify players outside the tournament.",

    secaoConta: "PLAYER ACCOUNT",
    contaIntro:
      "Signing up — and, for captains, picking in the draft — requires a player account. It stores three things: your email address, which is your login; your first and last name, given when you sign up and shown while you are signed in; and your password.",
    contaSenha:
      "Your password is never stored as you typed it. The site keeps only a hash (scrypt), computed together with a secret that lives on the server, not in the database — not even the organisation can read your password.",
    contaRegistros:
      "To keep you signed in and to slow down anyone trying to guess passwords, the site records each session (start, 7-day validity and end) and each attempt to sign in or create an account (the email address entered, the date and the outcome). In neither case is your IP address stored in the clear: only a hash of it is kept, computed with a server-side secret. Sessions also keep a hash of your browser identifier (user agent).",
    contaEmail: "The site sends no emails — neither confirmations nor marketing.",
    contaRetencao:
      "The account does not expire on its own, and the site has no button to delete it. To ask for it to be deleted, write to the contact address at the end of this page.",

    secaoInscricao: "SIGN-UP FOR THE 4TH EDITION",
    inscricaoIntro:
      "Sign-up happens on the /inscricao page, using your player account. The form asks for:",
    inscricaoItem1: "First name and surname, as they appear in the WhatsApp group, and your Discord @.",
    inscricaoItem2:
      "Riot ID (Name#TAG) — the Riot account must be linked to Discord (rule 21).",
    inscricaoItem3: "Current solo/duo queue rank, primary role and secondary role.",
    inscricaoItem4: "Availability by time slot: morning, afternoon and/or evening.",
    inscricaoItem5: "WhatsApp, if you choose to give it.",
    inscricaoItem6:
      "The acceptances: the rules and awareness of the payment; recording and streaming with your image and nickname (rule 17) and publication on the site of your Riot ID, rank, roles, team and stats; and confirmation that you meet the requirements of rules 1, 3, 4, 5 and 21.",
    inscricaoAutomatico:
      "Along with the form, the site records your account's email address, the submission date, the points value of your rank for the draft (calculated by the server, never sent by the browser) and a hash of the IP address the sign-up came from — used only to stop mass submissions, never the IP in the clear.",
    inscricaoOrganizacao:
      "After submission, the organisation records on your entry the check of each requirement (status and notes), the verified rank, the status of your sign-up and the status of your payment. Every change goes into an internal log, with who made it and when.",
    inscricaoPagamento:
      "Payment does not go through the site: we neither ask for nor store bank or card details. The site records only the state of the charge — amount, due date, your payment notice when you send it through the site, and the organisation's check.",
    rotuloParaQue: "What for.",
    inscricaoParaQue:
      "To check the requirements of rules 1, 3, 4, 5 and 21 of the rulebook; to build the teams in the draft and the schedule — which is what the availability by time slot is for; to reach you during the tournament; and to collect the entry fee, under rule 22.",
    rotuloQuemVe: "Who sees what.",
    inscricaoQuemVe:
      "The organisation sees all sign-up data, through the admin panel. You can follow your own under My sign-up: Riot ID, rank, roles, the status of each requirement, the organisation's notes and the payment status. The public never sees your name, email address, Discord, WhatsApp or availability.",
    inscricaoPublico:
      "During the live draft, the broadcast here on the site shows the Riot ID, roles, rank and points value of each player in the draft. After the draft, only the Riot ID, roles, rank and team go to the tournament pages; over the edition, the photo (when there is one) and match statistics are added.",
    inscricaoTransmissao:
      "Under rule 17, matches may be recorded and broadcast by the organisation, and taking part authorises the use of your image and nickname for that purpose. Matches are streamed on Twitch, on the n4kay or thalissonvieira channels.",
    rotuloPrazo: "How long.",
    inscricaoPrazo:
      "Sign-up data is kept until you ask for it to be removed — there is no automatic deadline, and the site deletes nothing on its own, not even when the edition ends. To have yours removed, ask through the contact below. Public results — standings, matches and rosters — stay in the seasons archive, like those of earlier editions.",
    rotuloCorrecao: "Correction or removal.",
    inscricaoCorrecaoAntes: "Write to",
    inscricaoCorrecaoDepois: "or reach the organisation on Discord or in the WhatsApp group.",

    secaoApi: "USE OF THE RIOT GAMES API",
    apiComoUsamos:
      "This site uses the official Riot Games API to import tournament match data. Access happens server-side only, over a secure connection, and solely by the organisation from the admin panel. The API key is never sent to the browser.",
    apiQuaisDados:
      "What we request: match ID, participant account identifier (PUUID), champions picked and banned, kills, deaths, assists, duration and winning team. Once we start using the Tournament API, we will also generate tournament codes and receive the results of matches played with those codes.",
    apiRetencao:
      "How long we keep it: match data is retained for as long as the tournament and its public history exist, because it is the site's actual content (standings and match history). Technical identifiers such as PUUID and match ID are used only to link a match to an already registered player and are never displayed publicly.",
    apiExclusao:
      "Deletion: we honour deletion requests made directly by participants as well as those forwarded by Riot Games through its official channels. On receiving a request, we remove that player's data from the site and from our database.",
    apiNaoFazemos:
      "We do not perform gameplay automation, scripting, cheating, in-game integration, betting, or any alternative player ranking system.",

    secaoContato: "CORRECTIONS AND CONTACT",
    contatoTexto:
      "Found something wrong about you, want your photo, Riot ID, statistics or your account and sign-up data removed, or need to reach the organisation? Write to:",
    contatoPrazo:
      "We answer and act on correction or deletion requests within 30 days. Participants can also reach the organisation through the tournament's Discord or WhatsApp group.",
  },
});
