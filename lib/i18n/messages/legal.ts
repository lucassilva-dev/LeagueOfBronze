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
  "Os Bronzes isn't endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games, and all associated properties are trademarks or registered trademarks of Riot Games, Inc.";

export const legal = definir({
  pt: {
    metaTitulo: "Aviso legal e privacidade · Os Bronzes",
    metaDescricao:
      "Aviso legal exigido pela Riot Games, atribuição de propriedade intelectual e política de privacidade do site Os Bronzes.",
    sobretitulo: "Aviso legal",
    titulo: "LEGAL & PRIVACIDADE",
    subtitulo: "Quem somos, nossa relação com a Riot Games e o que este site guarda sobre você.",

    secaoNaoSomos: "NÃO SOMOS A RIOT GAMES",
    traducaoPrefixo: "Em português:",
    traducaoAviso:
      "Os Bronzes não é endossado pela Riot Games e não reflete as visões ou opiniões da Riot Games ou de qualquer pessoa oficialmente envolvida na produção ou gestão das propriedades da Riot Games.",
    projetoAmador:
      "Este é um projeto amador, feito por e para um grupo de amigos, sem qualquer vínculo oficial, patrocínio ou aprovação da Riot Games.",

    secaoPropriedade: "PROPRIEDADE INTELECTUAL E ASSETS",
    marcas:
      "League of Legends e Riot Games são marcas comerciais ou marcas registradas da Riot Games, Inc. League of Legends © Riot Games, Inc.",
    assets:
      "As imagens de campeões exibidas neste site vêm do Data Dragon, a fonte de assets pública e aprovada pela Riot Games. Nenhum asset é obtido de fonte não aprovada. Logotipos, escudos de elo, arte das cartinhas e fotos de jogadores são criações próprias da organização ou material enviado pelos próprios participantes.",

    secaoGuarda: "O QUE ESTE SITE GUARDA",
    guardaIntro:
      "Bem pouco. Os dados publicados aqui são os do próprio campeonato, informados pelos participantes à organização:",
    guardaItem1: "Riot ID, time, rota e elo de cada participante.",
    guardaItem2:
      "Resultados das partidas: campeões, banimentos, abates/mortes/assistências, duração.",
    guardaItem3: "Foto de perfil, quando o participante envia uma.",
    guardaVisitante:
      "Não coletamos nada de quem apenas visita o site. Não há cadastro de visitante, não usamos cookies de rastreamento, não há anúncios e não há rastreadores de terceiros. Os únicos cookies existentes são o de sessão do painel administrativo, usado para manter a organização autenticada, e o que memoriza o idioma escolhido.",
    guardaConsentimento:
      "Todos os participantes são membros do grupo privado que organiza o campeonato e autorizam expressamente, ao se inscrever, a exibição pública do seu Riot ID, foto e estatísticas das partidas do torneio, conforme consta no regulamento. Não publicamos dados de nenhum jogador que não seja participante inscrito, e não cruzamos informações para identificar jogadores fora do torneio.",

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
      "Encontrou um dado errado sobre você, quer que sua foto, seu Riot ID ou suas estatísticas sejam removidos, ou precisa falar com a organização? Escreva para:",
    contatoPrazo:
      "Respondemos e atendemos pedidos de correção ou remoção de dados em até 30 dias. Participantes também podem falar com a organização pelo Discord ou pelo grupo de WhatsApp do campeonato.",
  },
  en: {
    metaTitulo: "Legal notice & privacy · Os Bronzes",
    metaDescricao:
      "Riot Games required legal notice, intellectual property attribution and privacy policy for the Os Bronzes website.",
    sobretitulo: "Legal notice",
    titulo: "LEGAL & PRIVACY",
    subtitulo: "Who we are, our relationship with Riot Games, and what this site stores about you.",

    secaoNaoSomos: "WE ARE NOT RIOT GAMES",
    traducaoPrefixo: "In Portuguese:",
    traducaoAviso:
      "Os Bronzes não é endossado pela Riot Games e não reflete as visões ou opiniões da Riot Games ou de qualquer pessoa oficialmente envolvida na produção ou gestão das propriedades da Riot Games.",
    projetoAmador:
      "This is an amateur project, built by and for a group of friends, with no official affiliation, sponsorship or approval from Riot Games.",

    secaoPropriedade: "INTELLECTUAL PROPERTY AND ASSETS",
    marcas:
      "League of Legends and Riot Games are trademarks or registered trademarks of Riot Games, Inc. League of Legends © Riot Games, Inc.",
    assets:
      "Champion images shown on this site come from Data Dragon, the public asset source approved by Riot Games. No asset is taken from an unapproved source. Logos, rank crests, card artwork and player photos are created by the organisation or submitted by the participants themselves.",

    secaoGuarda: "WHAT THIS SITE STORES",
    guardaIntro:
      "Very little. The data published here belongs to the tournament itself and is provided by participants to the organisation:",
    guardaItem1: "Riot ID, team, role and rank of each participant.",
    guardaItem2: "Match results: champions, bans, kills/deaths/assists, duration.",
    guardaItem3: "Profile photo, when the participant sends one.",
    guardaVisitante:
      "We collect nothing from people who merely visit the site. There is no visitor sign-up, no tracking cookies, no advertising and no third-party trackers. The only cookies are the admin panel session cookie, used to keep the organisation authenticated, and the one that remembers your chosen language.",
    guardaConsentimento:
      "All participants are members of the private group that runs the tournament and expressly consent, on sign-up, to the public display of their Riot ID, photo and tournament match statistics, as stated in the rules. We publish no data about players who are not registered participants, and we do not cross-reference information to identify players outside the tournament.",

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
      "Found something wrong about you, want your photo, Riot ID or statistics removed, or need to reach the organisation? Write to:",
    contatoPrazo:
      "We answer and act on correction or deletion requests within 30 days. Participants can also reach the organisation through the tournament's Discord or WhatsApp group.",
  },
});
