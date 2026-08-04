import { definir } from "@/lib/i18n/definir";
import type { LocaleTag } from "@/lib/format";

/**
 * Textos dos componentes usados por MAIS DE UMA página.
 *
 * Estes componentes (card de série, painel do campeão, tabela de classificação, sorteio ao
 * vivo) aparecem tanto no campeonato atual quanto nas temporadas arquivadas. Colocar os
 * textos aqui evita duplicar as mesmas frases nos blocos de cada página e evita que um
 * componente compartilhado fique preso ao vocabulário de uma área só.
 *
 * Os mapas `fases` e `formatos` traduzem POR CHAVE o rótulo que `lib/tournament.ts` devolve
 * em português. O lib é consumido pelo admin e pelos testes, então ele continua intacto e a
 * tradução acontece só na camada de exibição — com fallback para o valor original, de modo
 * que um rótulo novo no lib nunca some da tela.
 */
export const compartilhados = definir({
  pt: {
    // components/series-summary-card.tsx
    serieGrandeFinal: "Grande Final",
    serieWalkover: "W.O.",
    serieFinalizada: "Finalizada",
    serieEmAndamento: "Em andamento",
    seriePlacarWalkover: "por W.O.",
    seriePlacarPrefixo: "Série",
    serieCampeao: "Campeão:",
    serieMvpFinal: "MVP da final:",
    serieVitoriaWalkover: "Vitória por W.O.",
    serieMvp: "MVP da série:",

    // components/championship-hero.tsx
    heroCampeaoDefinido: "Campeão definido",
    heroTituloCampeonato: "Título do campeonato",
    heroConfirmouTitulo: "Confirmou o título na grande final contra",
    heroPor: "por",
    heroEncerradaWalkover: " Série encerrada por W.O.",
    heroMvpFinal: "MVP da final:",
    heroPlacarFinal: "Placar da final",
    heroAcessosRapidos: "Acessos rápidos",
    heroAcessosRapidosDescricao: "Abra o campeão ou veja o detalhe completo da grande final.",
    heroVerTimeCampeao: "Ver time campeão",
    heroAbrirGrandeFinal: "Abrir grande final",

    // components/standings-page-client.tsx
    tabelaBuscarTime: "Buscar time",
    tabelaNomeDoTime: "Nome do time",
    tabelaFonteSeed: "Tabela inicial pela classificação inicial (será ignorada após a 1ª série)",
    tabelaFonteCalculada: "Tabela calculada pelas séries registradas",
    tabelaNenhumTime: "Nenhum time encontrado.",
    tabelaColPos: "Pos",
    tabelaColTime: "Time",
    tabelaColSeries: "Séries (V-D)",
    tabelaColJogos: "Jogos (V-D)",
    tabelaColSaldo: "Saldo",
    tabelaColVitorias: "% Vit.",
    tabelaColPontos: "Pts",
    tabelaLinhaSeriesVD: "V-D séries:",
    tabelaLinhaJogos: "Jogos:",
    tabelaLinhaSaldo: "Saldo:",
    tabelaLinhaVitorias: "% vitórias:",
    tabelaLinhaSeries: "Séries:",
    tabelaLinhaPontos: "Pontos:",

    // components/series-live-draw.tsx
    sorteioLadosTitulo: "Lados · Jogo 1",
    sorteioLadoAzul: "Lado Azul",
    sorteioLadoVermelho: "Lado Vermelho",
    sorteioSorteando: "Sorteando…",
    sorteioSemCarta: "Sem carta",
    sorteioCartaDupla: "Carta dupla · afeta os 2 times",
    sorteioCartinhasTitulo: "Cartinhas da série",
    sorteioAoVivo: "Sorteio ao vivo — grava na partida",
    sorteioDuplo: "Sorteio duplo · os dois capitães usaram · uma carta para os dois times",
    sorteioBotaoSortear: "Sortear",
    sorteioBotaoLados: "Sortear lados",
    sorteioBotaoDupla: "Sortear carta dupla (2 capitães)",
    sorteioDuplaExplicacao:
      "Quando os dois capitães usam a carta na mesma partida: sorteio único entre as 8 cartas (as 6 individuais + as 2 duplas), valendo para os dois times.",

    // app/not-found.tsx
    naoEncontradoTitulo: "Página não encontrada",
    naoEncontradoTexto: "O recurso solicitado não existe ou foi removido.",
    naoEncontradoVoltar: "Voltar para Home",

    // components/champion-icon.tsx e components/data-table.tsx
    campeaoNaoInformado: "Campeão não informado",
    semDados: "Sem dados",

    /** Chave = rótulo devolvido por getSeriesStageLabel (lib/tournament.ts). */
    fases: {
      "Fase regular": "Fase regular",
      Semifinal: "Semifinal",
      Final: "Final",
    } as Record<string, string>,
    /** Chave = rótulo devolvido por getSeriesFormatLabel (lib/tournament.ts). */
    formatos: {
      MD3: "MD3",
      MD5: "MD5",
    } as Record<string, string>,
    /** Chave = rótulo devolvido por getSeriesTurnoLabel (lib/format.ts). */
    turnos: {
      Matutino: "Matutino",
      Vespertino: "Vespertino",
    } as Record<string, string>,
    /** Tag de idioma para formatar datas e horas (lib/format.ts). */
    localeTag: "pt-BR" as LocaleTag,
  },
  en: {
    serieGrandeFinal: "Grand Final",
    serieWalkover: "WALKOVER",
    serieFinalizada: "Completed",
    serieEmAndamento: "In progress",
    seriePlacarWalkover: "by walkover",
    seriePlacarPrefixo: "Series",
    serieCampeao: "Champion:",
    serieMvpFinal: "Grand final MVP:",
    serieVitoriaWalkover: "Win by walkover.",
    serieMvp: "Series MVP:",

    heroCampeaoDefinido: "Champion decided",
    heroTituloCampeonato: "Tournament title",
    heroConfirmouTitulo: "Sealed the title in the grand final against",
    heroPor: "by",
    heroEncerradaWalkover: " Series decided by walkover.",
    heroMvpFinal: "Grand final MVP:",
    heroPlacarFinal: "Grand final score",
    heroAcessosRapidos: "Quick links",
    heroAcessosRapidosDescricao: "Open the champions or see the full grand final breakdown.",
    heroVerTimeCampeao: "View the champion team",
    heroAbrirGrandeFinal: "Open the grand final",

    tabelaBuscarTime: "Search team",
    tabelaNomeDoTime: "Team name",
    tabelaFonteSeed: "Provisional table from the initial seeding (dropped after the 1st series)",
    tabelaFonteCalculada: "Table calculated from the recorded series",
    tabelaNenhumTime: "No team found.",
    tabelaColPos: "Pos",
    tabelaColTime: "Team",
    tabelaColSeries: "Series (W-L)",
    tabelaColJogos: "Games (W-L)",
    tabelaColSaldo: "GD",
    tabelaColVitorias: "Win %",
    tabelaColPontos: "Pts",
    tabelaLinhaSeriesVD: "Series W-L:",
    tabelaLinhaJogos: "Games:",
    tabelaLinhaSaldo: "Game diff:",
    tabelaLinhaVitorias: "Win rate:",
    tabelaLinhaSeries: "Series:",
    tabelaLinhaPontos: "Points:",

    sorteioLadosTitulo: "Sides · Game 1",
    sorteioLadoAzul: "Blue Side",
    sorteioLadoVermelho: "Red Side",
    sorteioSorteando: "Drawing…",
    sorteioSemCarta: "No wildcard",
    sorteioCartaDupla: "Double wildcard · affects both teams",
    sorteioCartinhasTitulo: "Series wildcards",
    sorteioAoVivo: "Live draw — saved to the match",
    sorteioDuplo: "Double draw · both captains used it · one wildcard for both teams",
    sorteioBotaoSortear: "Draw",
    sorteioBotaoLados: "Draw sides",
    sorteioBotaoDupla: "Draw double wildcard (2 captains)",
    sorteioDuplaExplicacao:
      "When both captains play their wildcard in the same match: a single draw among the 8 wildcards (the 6 single ones + the 2 double ones), applied to both teams.",

    naoEncontradoTitulo: "Page not found",
    naoEncontradoTexto: "The page you asked for doesn't exist or has been removed.",
    naoEncontradoVoltar: "Back to Home",

    campeaoNaoInformado: "Champion not recorded",
    semDados: "No data",

    fases: {
      "Fase regular": "Group stage",
      Semifinal: "Semifinal",
      Final: "Final",
    } as Record<string, string>,
    formatos: {
      MD3: "Bo3",
      MD5: "Bo5",
    } as Record<string, string>,
    turnos: {
      Matutino: "Morning",
      Vespertino: "Afternoon",
    } as Record<string, string>,
    localeTag: "en-US" as LocaleTag,
  },
});

/** Rótulo de fase traduzido, com fallback para o valor vindo do lib. */
export function faseLabel(t: { fases: Record<string, string> }, valor: string): string {
  return t.fases[valor] ?? valor;
}

/** Rótulo de formato (MD3/MD5 → Bo3/Bo5) traduzido, com fallback. */
export function formatoLabel(t: { formatos: Record<string, string> }, valor: string): string {
  return t.formatos[valor] ?? valor;
}

/** Rótulo de turno (Matutino/Vespertino) traduzido, com fallback. */
export function turnoLabel(t: { turnos: Record<string, string> }, valor: string): string {
  return t.turnos[valor] ?? valor;
}
