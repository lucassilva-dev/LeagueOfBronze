import { definir } from "@/lib/i18n/definir";

/**
 * Título da aba e descrição (a prévia do link no WhatsApp e no Google) de cada página.
 *
 * Antes só o layout declarava isso, então TODA página saía como "League of Bronze · 4ª
 * Edição — … Inscrição para a 4ª Edição": as abas todas com o mesmo nome, e o link da
 * final arquivada da 3ª se anunciando como 4ª. E as poucas páginas que tinham título
 * próprio o tinham só em português.
 *
 * Os títulos já vêm COMPLETOS ("Regulamento · League of Bronze"): o layout não usa
 * `title.template`, porque as páginas que ainda declaram o título por conta própria já
 * escrevem o sufixo — com template, ele sairia duas vezes.
 *
 * `{time}`, `{jogador}`, `{timeA}`, `{timeB}` e `{temporada}` são preenchidos por
 * `preencher` (lib/i18n/metadados.ts) com o que vem do dataset; `{temporada}` já chega
 * traduzida por `nomeDaTemporada`. As descrições evitam "na/do {temporada}": o nome da
 * temporada é livre ("2º Campeonato do Grupo") e o artigo erraria o gênero.
 */
export const metadados = definir({
  pt: {
    regras: {
      titulo: "Regulamento · League of Bronze",
      descricao:
        "Regulamento oficial do League of Bronze: inscrição, formação dos times, draft por pontos, regras gerais, pontuação e fases finais.",
    },
    calendario: {
      titulo: "Calendário · League of Bronze",
      descricao: "Datas e horários das séries do League of Bronze, da fase de pontos à Grande Final.",
    },
    tabela: {
      titulo: "Tabela · League of Bronze",
      descricao: "Classificação da fase de pontos do League of Bronze: pontos, saldo de mapas e quem avança.",
    },
    times: {
      titulo: "Times · League of Bronze",
      descricao: "Os times do League of Bronze e seus elencos, montados no draft por pontos.",
    },
    jogadores: {
      titulo: "Jogadores · League of Bronze",
      descricao: "Os jogadores do League of Bronze por rota, com elo e desempenho no campeonato.",
    },
    stats: {
      titulo: "Estatísticas · League of Bronze",
      descricao: "Rankings de jogadores e campeões do League of Bronze: abates, KDA, winrate, picks e bans.",
    },
    cartas: {
      titulo: "Cartas · League of Bronze",
      descricao: "As cartas do League of Bronze e o que cada uma faz numa série.",
    },
    temporadas: {
      titulo: "Temporadas · League of Bronze",
      descricao: "Arquivo das edições anteriores do League of Bronze: campeões, tabelas, times e partidas.",
    },
    partidas: {
      titulo: "Partidas · League of Bronze",
      descricao: "Todas as séries do League of Bronze, com placar e mapas.",
    },
    entrar: {
      titulo: "Entrar · League of Bronze",
      descricao: "Entre na sua conta do League of Bronze.",
    },
    // As quatro abaixo são de páginas de outras áreas (inscrição e draft); ficam aqui para o
    // título delas acompanhar o idioma também, no mesmo padrão.
    inscricao: {
      titulo: "Inscrição · League of Bronze",
      descricao: "Inscrição individual para a 4ª Edição do League of Bronze.",
    },
    minhaInscricao: {
      titulo: "Minha inscrição · League of Bronze",
      descricao: "Acompanhe a sua inscrição no League of Bronze.",
    },
    capitao: {
      titulo: "Painel do capitão · League of Bronze",
      descricao: "Painel do capitão no draft do League of Bronze.",
    },
    draft: {
      titulo: "Draft ao vivo · League of Bronze",
      descricao: "Acompanhe o sorteio dos times da 4ª Edição em tempo real.",
    },

    // ---- páginas com nome vindo do dataset
    time: {
      titulo: "{time} · League of Bronze",
      descricao: "Elenco e resultados do time {time} — League of Bronze, {temporada}.",
    },
    jogador: {
      titulo: "{jogador} · League of Bronze",
      descricao: "Ficha de {jogador} — League of Bronze, {temporada}: rota, time e desempenho.",
    },
    serie: {
      titulo: "{timeA} x {timeB} · League of Bronze",
      descricao: "{timeA} x {timeB} — League of Bronze, {temporada}: placar, mapas e estatísticas.",
    },
    temporada: {
      titulo: "{temporada} · League of Bronze",
      descricao: "Arquivo da temporada {temporada} do League of Bronze: campeão, tabela, times e partidas.",
    },
    temporadaTime: {
      titulo: "{time} · {temporada} · League of Bronze",
      descricao: "Elenco e resultados do time {time} — League of Bronze, {temporada}.",
    },
    temporadaJogador: {
      titulo: "{jogador} · {temporada} · League of Bronze",
      descricao: "Ficha de {jogador} — League of Bronze, {temporada}: rota, time e desempenho.",
    },
    temporadaSerie: {
      titulo: "{timeA} x {timeB} · {temporada} · League of Bronze",
      descricao: "{timeA} x {timeB} — League of Bronze, {temporada}: placar, mapas e estatísticas.",
    },
  },
  en: {
    regras: {
      titulo: "Rules · League of Bronze",
      descricao:
        "Official League of Bronze rules: sign-ups, team building, the points draft, general rules, scoring and playoffs.",
    },
    calendario: {
      titulo: "Schedule · League of Bronze",
      descricao: "Dates and times of every League of Bronze series, from the group stage to the Grand Final.",
    },
    tabela: {
      titulo: "Standings · League of Bronze",
      descricao: "League of Bronze group-stage standings: points, game differential and who advances.",
    },
    times: {
      titulo: "Teams · League of Bronze",
      descricao: "League of Bronze teams and their rosters, built in the points draft.",
    },
    jogadores: {
      titulo: "Players · League of Bronze",
      descricao: "League of Bronze players by role, with rank and tournament performance.",
    },
    stats: {
      titulo: "Stats · League of Bronze",
      descricao: "League of Bronze player and champion rankings: kills, KDA, win rate, picks and bans.",
    },
    cartas: {
      titulo: "Cards · League of Bronze",
      descricao: "The League of Bronze cards and what each one does in a series.",
    },
    temporadas: {
      titulo: "Seasons · League of Bronze",
      descricao: "Archive of past League of Bronze editions: champions, standings, teams and series.",
    },
    partidas: {
      titulo: "Matches · League of Bronze",
      descricao: "Every League of Bronze series, with score and games.",
    },
    entrar: {
      titulo: "Sign in · League of Bronze",
      descricao: "Sign in to your League of Bronze account.",
    },
    inscricao: {
      titulo: "Sign-up · League of Bronze",
      descricao: "Individual sign-up for the League of Bronze 4th Edition.",
    },
    minhaInscricao: {
      titulo: "My sign-up · League of Bronze",
      descricao: "Follow your League of Bronze sign-up.",
    },
    capitao: {
      titulo: "Captain panel · League of Bronze",
      descricao: "Captain panel for the League of Bronze draft.",
    },
    draft: {
      titulo: "Live draft · League of Bronze",
      descricao: "Follow the 4th Edition team draft live.",
    },

    time: {
      titulo: "{time} · League of Bronze",
      descricao: "Roster and results of {time} — League of Bronze, {temporada}.",
    },
    jogador: {
      titulo: "{jogador} · League of Bronze",
      descricao: "{jogador}'s profile — League of Bronze, {temporada}: role, team and performance.",
    },
    serie: {
      titulo: "{timeA} vs {timeB} · League of Bronze",
      descricao: "{timeA} vs {timeB} — League of Bronze, {temporada}: score, games and stats.",
    },
    temporada: {
      titulo: "{temporada} · League of Bronze",
      descricao: "Archive of the League of Bronze {temporada}: champion, standings, teams and series.",
    },
    temporadaTime: {
      titulo: "{time} · {temporada} · League of Bronze",
      descricao: "Roster and results of {time} — League of Bronze, {temporada}.",
    },
    temporadaJogador: {
      titulo: "{jogador} · {temporada} · League of Bronze",
      descricao: "{jogador}'s profile — League of Bronze, {temporada}: role, team and performance.",
    },
    temporadaSerie: {
      titulo: "{timeA} vs {timeB} · {temporada} · League of Bronze",
      descricao: "{timeA} vs {timeB} — League of Bronze, {temporada}: score, games and stats.",
    },
  },
});
