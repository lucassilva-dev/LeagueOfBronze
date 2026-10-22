import { definir } from "@/lib/i18n/definir";
import { AVISO_RIOT_OFICIAL } from "@/lib/i18n/messages/legal";

/** Navegação, rodapé e textos que aparecem no site inteiro. */
export const comum = definir({
  pt: {
    // ---------------------------------------------------------------- sessão
    // Duas sessões independentes convivem no site: a da organização e a do jogador.
    // O cabeçalho precisa dizer em qual a pessoa está — e no dia do draft isso deixa
    // de ser conveniência.
    sessaoEntrar: "ENTRAR",
    sessaoSair: "Sair",
    sessaoSaindo: "Saindo…",
    sessaoAbrirMenu: "Abrir menu da conta",
    sessaoJogador: "Jogador",
    sessaoOrganizacao: "Organização",
    sessaoMaster: "Organização · master",
    sessaoMinhaInscricao: "Minha inscrição",
    sessaoFazerInscricao: "Fazer minha inscrição",
    sessaoPainelCapitao: "Painel do capitão",
    sessaoPainelAdmin: "Painel da organização",
    // Aviso de senha provisória pendente; é LINK para /conta/senha, não só um recado.
    sessaoTrocarSenha: "Troque sua senha",
    sessaoMenuTrocarSenha: "Trocar senha",
    // Pergunta do "Sair" com rascunho do painel por salvar (o painel marca `data-lob-painel-sujo`).
    sessaoSairPainelSujo: "Você tem alterações não salvas no painel. Sair da conta vai descartá-las. Continuar?",
    sessaoDuasContas: "Você está nas duas ao mesmo tempo.",
    navInicio: "INÍCIO",
    navTimes: "TIMES",
    navJogadores: "JOGADORES",
    navCalendario: "CALENDÁRIO",
    navTabela: "TABELA",
    navEstatisticas: "ESTATÍSTICAS",
    navCartas: "CARTAS",
    navRegras: "REGRAS",
    navTemporadas: "TEMPORADAS",
    navInscricao: "INSCRIÇÃO",
    navAriaPrincipal: "Navegação principal",
    navAbrirMenu: "Abrir menu",
    pularParaConteudo: "Pular para o conteúdo",

    edicao: "4ª EDIÇÃO",
    rodapeAssinatura: "LEAGUE OF BRONZE · 4ª EDIÇÃO · 2026",
    rodapeLema: "MECÂNICA DUVIDOSA · ENTRETENIMENTO IMACULADO",
    // Tradução fiel do aviso obrigatório. A versão em inglês (abaixo, no bloco `en`) é o
    // texto EXIGIDO literalmente pela Riot e não pode ser reescrita.
    rodapeAviso:
      "League of Bronze não é endossado pela Riot Games e não reflete as visões ou opiniões da Riot Games ou de qualquer pessoa oficialmente envolvida na produção ou gestão das propriedades da Riot Games. Riot Games e todas as propriedades associadas são marcas comerciais ou marcas registradas da Riot Games, Inc.",
    rodapeLinkLegal: "Aviso legal e privacidade",
    rodapeContato: "Contato",

    idioma: "Idioma",
    idiomaPt: "Português",
    idiomaEn: "English",
    trocarParaEn: "Switch to English",
    trocarParaPt: "Mudar para português",
  },
  en: {
    sessaoEntrar: "SIGN IN",
    sessaoSair: "Sign out",
    sessaoSaindo: "Signing out…",
    sessaoAbrirMenu: "Open account menu",
    sessaoJogador: "Player",
    sessaoOrganizacao: "Organisers",
    sessaoMaster: "Organisers · master",
    sessaoMinhaInscricao: "My sign-up",
    sessaoFazerInscricao: "Sign me up",
    sessaoPainelCapitao: "Captain panel",
    sessaoPainelAdmin: "Organisers' panel",
    sessaoTrocarSenha: "Change your password",
    sessaoMenuTrocarSenha: "Change password",
    sessaoSairPainelSujo: "You have unsaved changes in the panel. Signing out will discard them. Continue?",
    sessaoDuasContas: "You're signed in to both at once.",
    navInicio: "HOME",
    navTimes: "TEAMS",
    navJogadores: "PLAYERS",
    navCalendario: "SCHEDULE",
    navTabela: "STANDINGS",
    navEstatisticas: "STATS",
    navCartas: "CARDS",
    navRegras: "RULES",
    navTemporadas: "SEASONS",
    navInscricao: "SIGN-UP",
    navAriaPrincipal: "Main navigation",
    navAbrirMenu: "Open menu",
    pularParaConteudo: "Skip to content",

    edicao: "4TH EDITION",
    rodapeAssinatura: "LEAGUE OF BRONZE · 4TH EDITION · 2026",
    rodapeLema: "QUESTIONABLE MECHANICS · IMMACULATE ENTERTAINMENT",
    // NÃO substituir por outra redação: é o texto obrigatório, palavra por palavra.
    rodapeAviso: AVISO_RIOT_OFICIAL,
    rodapeLinkLegal: "Legal notice & privacy",
    rodapeContato: "Contact",

    idioma: "Language",
    idiomaPt: "Português",
    idiomaEn: "English",
    trocarParaEn: "Switch to English",
    trocarParaPt: "Mudar para português",
  },
});
