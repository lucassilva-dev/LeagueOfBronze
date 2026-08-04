import { definir } from "@/lib/i18n/definir";
import { AVISO_RIOT_OFICIAL } from "@/lib/i18n/messages/legal";

/** Navegação, rodapé e textos que aparecem no site inteiro. */
export const comum = definir({
  pt: {
    navInicio: "INÍCIO",
    navTimes: "TIMES",
    navJogadores: "JOGADORES",
    navCalendario: "CALENDÁRIO",
    navTabela: "TABELA",
    navEstatisticas: "ESTATÍSTICAS",
    navCartas: "CARTAS",
    navRegras: "REGRAS",
    navTemporadas: "TEMPORADAS",
    navAriaPrincipal: "Navegação principal",
    navAbrirMenu: "Abrir menu",

    edicao: "3ª EDIÇÃO",
    rodapeAssinatura: "LEAGUE OF BRONZE · 3ª EDIÇÃO · 2026",
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
    navInicio: "HOME",
    navTimes: "TEAMS",
    navJogadores: "PLAYERS",
    navCalendario: "SCHEDULE",
    navTabela: "STANDINGS",
    navEstatisticas: "STATS",
    navCartas: "CARDS",
    navRegras: "RULES",
    navTemporadas: "SEASONS",
    navAriaPrincipal: "Main navigation",
    navAbrirMenu: "Open menu",

    edicao: "3RD EDITION",
    rodapeAssinatura: "LEAGUE OF BRONZE · 3RD EDITION · 2026",
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
