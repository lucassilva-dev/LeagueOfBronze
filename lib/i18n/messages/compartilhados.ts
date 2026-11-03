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
    // O sorteio deixou de acontecer no navegador: quem sorteia é o servidor, e a
    // semente fica gravada para qualquer um conferir depois.
    sorteioSemente: "semente",
    sorteioPorFulano: "sorteado por",
    // A carta definida à mão no painel (registro `carta_manual`, sem semente): não foi
    // sorteada, então a linha de procedência diz quem corrigiu em vez de mostrar semente.
    sorteioCorrecaoManual: "correção manual por",
    sorteioRepetido: "Este sorteio já foi feito antes nesta série — o histórico registra as duas vezes.",
    sorteioFalhou: "Não foi possível sortear. Nada foi gravado.",
    sorteioLetras: "Letras sorteadas",
    sorteioCampeoesDisponiveis: "campeões disponíveis",
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
      "Quando os dois capitães usam a carta na mesma partida: sorteio único entre todas as cartas em vigor, individuais e duplas, valendo para os dois times.",

    // components/series/cerimonia-de-sorteio.tsx — a roleta em tela cheia
    cerimoniaTitulo: "Sorteio ao vivo",
    cerimoniaFechar: "Fechar",
    cerimoniaVai: "VAI!",
    cerimoniaResultado: "E o resultado é",
    cerimoniaSom: "Som",
    // components/series/cerimonia-de-sorteio.tsx e components/series-live-draw.tsx — o show
    cerimoniaSemConexao:
      "A conexão caiu antes da resposta. O sorteio PODE ter sido gravado: feche, recarregue a página e confira antes de sortear de novo.",
    cerimoniaSemResposta:
      "O servidor ainda não respondeu. O sorteio pode ter sido gravado — se a resposta não chegar, feche, recarregue e confira antes de sortear de novo.",
    cerimoniaTituloLados:
      "Sorteio de lados",
    cerimoniaTituloCarta:
      "Sorteio da cartinha",
    cerimoniaTituloDupla:
      "Sorteio duplo",
    cerimoniaPerguntaLados:
      "Quem começa no lado azul?",
    cerimoniaJogo1:
      "jogo 1",
    cerimoniaComecaNo:
      "começa no",
    cerimoniaVolumes: ["mudo", "baixo", "médio", "alto"],
    cerimoniaTelaCheia:
      "Tela cheia",
    cerimoniaSairDaTelaCheia:
      "Sair da tela cheia",
    cerimoniaReduzidoAviso:
      "Este computador está com «reduzir movimento» ligado (no Windows: Efeitos de animação desligados). A live vai ver a versão calma, sem giro.",
    cerimoniaShowCompleto:
      "Ligar o show completo",
    cerimoniaShowCompletoLigado:
      "Show completo ligado neste navegador, mesmo com «reduzir movimento».",
    cerimoniaAtalhos:
      "F tela cheia · M som · Esc fechar",
    // Na tela cheia o Esc é do navegador; no Chrome/Edge o Keyboard Lock devolve o Esc à página.
    cerimoniaAtalhosTelaCheia:
      "F sair da tela cheia · M som · Esc fechar (segure o Esc para sair da tela cheia)",
    cerimoniaAtalhosTelaCheiaSemTrava:
      "F sair da tela cheia · M som · Esc sai da tela cheia (o segundo Esc fecha)",
    cerimoniaAoVivo:
      "Ao vivo",
    cerimoniaUsouACarta:
      "usou a carta contra",
    cerimoniaSofre:
      "Quem sofre",
    cerimoniaOsDoisTimes:
      "Vale para os dois times",
    cerimoniaDuploCabecalho:
      "os dois capitães usaram",
    cerimoniaSaiuACarta:
      "Saiu a carta",
    cerimoniaCarta:
      "Carta",
    cerimoniaChipSurpresa:
      "SURPRESA",
    cerimoniaChipDupla:
      "DUPLA",
    cerimoniaLendaria:
      "Lendária",
    cerimoniaOQueAcontece:
      "O que acontece",
    cerimoniaARegra:
      "A regra",
    arenaOlho:
      "Sorteios da partida",
    arenaTitulo:
      "Arena do sorteio",
    arenaSubtitulo:
      "Lados do jogo 1 e cartinhas da série. Quem sorteia é o servidor, com semente pública — a tela só revela.",
    arenaASortear:
      "a sortear",
    arenaWo:
      "Série decidida por W.O.: não há sorteio.",
    arenaLadosTravados:
      "Lados travados: o jogo 1 já foi registrado.",
    arenaOperador:
      "Painel da transmissão",
    arenaModoTransmissao:
      "Modo transmissão",
    arenaSairDaTransmissao:
      "Sair do modo transmissão",
    arenaTestarSom:
      "Testar som",
    arenaVoltarAoCalmo:
      "Voltar à versão calma",
    arenaDicaObs:
      "Para a live: capture a JANELA do navegador no OBS sem minimizar nem cobrir (o Chrome congela janela coberta) e use «Testar som» para acertar o volume antes de entrar no ar.",
    cerimoniaLetreirosLados: ["DOIS TIMES.", "UM SÓ LADO AZUL."],
    cerimoniaLetreirosCarta: ["UMA CARTA.", "NENHUMA PIEDADE."],
    cerimoniaLetreirosDupla: ["DOIS CAPITÃES.", "UMA CARTA PARA TODOS."],
    cerimoniaEnsaioMarca: "ENSAIO · NADA FOI SORTEADO",
    cerimoniaEnsaioCreditos: "ensaio técnico: nada foi sorteado nem gravado",
    arenaEnsaio: "Ensaio (não sorteia nem grava)",
    arenaEnsaioLados: "Ensaio: lados",
    arenaEnsaioCarta: "Ensaio: carta",
    arenaEnsaioDupla: "Ensaio: dupla",
    arenaValeContra:
      "vale contra",
    arenaSortearCartaPara:
      "Sortear carta para",
    cerimoniaFrases: [
      "chacoalhando o pote…",
      "subornando a aleatoriedade…",
      "consultando o além…",
      "girando na força do Ferro IV…",
      "conferindo com o juiz…",
      "pedindo licença pro RNG…",
      "soprando o dado…",
      "acordando o servidor…",
      "olhando pro outro lado…",
      "fingindo que não é sorte…",
    ],

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
      Noturno: "Noturno",
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

    sorteioSemente: "seed",
    sorteioPorFulano: "drawn by",
    sorteioCorrecaoManual: "manual correction by",
    sorteioRepetido: "This draw was already made for this series — the history records both.",
    sorteioFalhou: "Couldn't draw. Nothing was saved.",
    sorteioLetras: "Letters drawn",
    sorteioCampeoesDisponiveis: "champions available",
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
      "When both captains play their wildcard in the same match: a single draw among every wildcard in force, single and double, applied to both teams.",

    cerimoniaTitulo: "Live draw",
    cerimoniaFechar: "Close",
    cerimoniaVai: "GO!",
    cerimoniaResultado: "And the result is",
    cerimoniaSom: "Sound",
    cerimoniaSemConexao:
      "The connection dropped before the answer. The draw MAY have been saved: close, reload the page and check before drawing again.",
    cerimoniaSemResposta:
      "The server hasn't answered yet. The draw may have been saved — if no answer comes, close, reload and check before drawing again.",
    cerimoniaTituloLados:
      "Side draw",
    cerimoniaTituloCarta:
      "Wildcard draw",
    cerimoniaTituloDupla:
      "Double draw",
    cerimoniaPerguntaLados:
      "Who starts on the blue side?",
    cerimoniaJogo1:
      "game 1",
    cerimoniaComecaNo:
      "starts on the",
    cerimoniaVolumes: ["muted", "low", "medium", "high"],
    cerimoniaTelaCheia:
      "Full screen",
    cerimoniaSairDaTelaCheia:
      "Exit full screen",
    cerimoniaReduzidoAviso:
      "This computer has “reduce motion” on (on Windows: Animation effects off). The stream will get the calm version, with no spin.",
    cerimoniaShowCompleto:
      "Turn on the full show",
    cerimoniaShowCompletoLigado:
      "Full show on in this browser, even with “reduce motion”.",
    cerimoniaAtalhos:
      "F full screen · M sound · Esc close",
    cerimoniaAtalhosTelaCheia:
      "F exit full screen · M sound · Esc close (hold Esc to exit full screen)",
    cerimoniaAtalhosTelaCheiaSemTrava:
      "F exit full screen · M sound · Esc exits full screen (a second Esc closes)",
    cerimoniaAoVivo:
      "Live",
    cerimoniaUsouACarta:
      "played the wildcard on",
    cerimoniaSofre:
      "Who takes it",
    cerimoniaOsDoisTimes:
      "Applies to both teams",
    cerimoniaDuploCabecalho:
      "both captains played it",
    cerimoniaSaiuACarta:
      "Out comes card",
    cerimoniaCarta:
      "Card",
    cerimoniaChipSurpresa:
      "SURPRISE",
    cerimoniaChipDupla:
      "DOUBLE",
    cerimoniaLendaria:
      "Legendary",
    cerimoniaOQueAcontece:
      "What happens",
    cerimoniaARegra:
      "The rule",
    arenaOlho:
      "Match draws",
    arenaTitulo:
      "Draw arena",
    arenaSubtitulo:
      "Game 1 sides and the series wildcards. The server does the drawing, with a public seed — the screen only reveals it.",
    arenaASortear:
      "to be drawn",
    arenaWo:
      "Series decided by walkover: there's nothing to draw.",
    arenaLadosTravados:
      "Sides locked: game 1 has already been recorded.",
    arenaOperador:
      "Broadcast panel",
    arenaModoTransmissao:
      "Broadcast mode",
    arenaSairDaTransmissao:
      "Leave broadcast mode",
    arenaTestarSom:
      "Test sound",
    arenaVoltarAoCalmo:
      "Back to the calm version",
    arenaDicaObs:
      "For the stream: capture the browser WINDOW in OBS without minimizing or covering it (Chrome freezes covered windows) and use “Test sound” to set the level before going live.",
    cerimoniaLetreirosLados: ["TWO TEAMS.", "ONE BLUE SIDE."],
    cerimoniaLetreirosCarta: ["ONE CARD.", "NO MERCY."],
    cerimoniaLetreirosDupla: ["TWO CAPTAINS.", "ONE CARD FOR ALL."],
    cerimoniaEnsaioMarca: "REHEARSAL · NOTHING WAS DRAWN",
    cerimoniaEnsaioCreditos: "technical rehearsal: nothing was drawn or saved",
    arenaEnsaio: "Rehearsal (draws and saves nothing)",
    arenaEnsaioLados: "Rehearsal: sides",
    arenaEnsaioCarta: "Rehearsal: wildcard",
    arenaEnsaioDupla: "Rehearsal: double",
    arenaValeContra:
      "used on",
    arenaSortearCartaPara:
      "Draw wildcard for",
    cerimoniaFrases: [
      "shaking the jar…",
      "bribing the randomness…",
      "consulting the beyond…",
      "spinning on Iron IV power…",
      "checking with the referee…",
      "asking RNG nicely…",
      "blowing on the dice…",
      "waking the server up…",
      "looking the other way…",
      "pretending this isn't luck…",
    ],

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
      // Mesmo termo já usado em `calendarioTurnoNoturno` (paginas-competicao).
      Noturno: "Evening",
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
