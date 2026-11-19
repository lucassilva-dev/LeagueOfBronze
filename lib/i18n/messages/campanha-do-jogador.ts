import { definir } from "@/lib/i18n/definir";

/**
 * Os textos da CAMPANHA na ficha do jogador (components/times/campanha.tsx; os números saem de
 * lib/jogadores/campanha.ts), somados ao bloco paginasHome (lib/i18n/messages/paginas-home.ts).
 * Os títulos que cada time troca pelo seu (lib/temas: `textos.campanha`…) moram no arquivo do
 * time em lib/i18n/messages/temas.
 *
 * Nada de pronome para o jogador: a frase usa o nick ({nick}), que serve para qualquer pessoa.
 */
export const textosCampanhaDoJogador = definir({
  pt: {
    campanhaTitulo: "A CAMPANHA",
    campanhaResultados: "SÉRIE A SÉRIE",
    campanhaCampeoes: "CAMPEÕES JOGADOS",
    campanhaProximo: "PRÓXIMO DESAFIO",
    campanhaDestaques: "Destaques da campanha",
    campanhaSemJogos: "{nick} ainda não entrou em quadra nesta edição. Os números aparecem aqui depois do primeiro jogo.",
    // Os outros avisos de quem está sem números (components/times/campanha.tsx, avisoSemNumeros).
    campanhaSoProvisorio:
      "{nick} ainda não tem jogo com K/D/A nesta edição. O time tem jogo lançado só com o resultado, à espera dos prints.",
    campanhaSoSubstituto:
      "{nick} entrou em {n} jogos como substituto, que não pontuam no site: os números estão nas páginas das partidas.",
    campanhaSoSubstituto1:
      "{nick} entrou em 1 jogo como substituto, que não pontua no site: os números estão na página da partida.",
    campanhaSaiuSemJogar: "{nick} saiu do time sem jogar nesta edição.",

    // ---------- destaques
    campanhaRanking: "NO RANKING GERAL",
    campanhaRankingEntre: "entre {n} jogadores que já jogaram",
    // Com empate: a ficha divide o lugar (o /stats lista um por linha, desempatando pelo nick).
    campanhaRankingEntreEmpate: "entre {n} jogadores que já jogaram · empate divide a posição",
    campanhaEmpate: ", empate com mais {n}",
    campanhaRankingRota: "KDA entre os {rota}: {posicao} de {n}",
    campanhaMetricaAbates: "ABATES",
    campanhaMetricaKda: "KDA",
    campanhaMetricaMvps: "MVPs",
    campanhaMetricaAssistencias: "ASSIST.",
    campanhaMelhorJogo: "MELHOR JOGO",
    campanhaRecordeAbates: "Recorde de abates: {n}",
    campanhaParticipacao: "PARTICIPAÇÃO EM ABATES",
    campanhaParticipacaoDetalhe: "dos abates do time passaram por {nick}",
    campanhaForma: "FORMA RECENTE",
    campanhaFormaUltimos: "últimos {n} jogos",
    campanhaFormaUltimo: "o último jogo",
    campanhaSequenciaVitorias: "{n} vitórias seguidas",
    campanhaSequenciaDerrotas: "{n} derrotas seguidas",
    campanhaSequenciaVitoria1: "venceu o último jogo",
    campanhaSequenciaDerrota1: "perdeu o último jogo",

    // ---------- série a série
    campanhaVitoria: "VITÓRIA",
    campanhaDerrota: "DERROTA",
    campanhaEmAndamento: "EM ANDAMENTO",
    campanhaVitoriaCurta: "V",
    campanhaDerrotaCurta: "D",
    campanhaJogoCurto: "J{n}",
    campanhaJogoLongo: "Jogo {n}",
    campanhaNaoJogou: "não jogou",
    campanhaProvisorio: "sem K/D/A ainda",
    campanhaWo: "W.O.",
    campanhaVs: "vs",
    campanhaMvp: "MVP",
    campanhaMvpDaSerie: "MVP DA SÉRIE",
    campanhaSubstitutoEm: "como substituto em {time}",
    campanhaMinutos: "{n} min",
    campanhaVerPartida: "VER PARTIDA →",
    campanhaPlacar: "Placar da série: {time} {a} a {b} {adversario}",
    campanhaFaseRegular: "Fase regular",
    campanhaSemifinal: "Semifinal",
    campanhaFinal: "Final",

    // ---------- campeões
    campanhaJogos: "{n} jogos",
    campanhaJogo: "1 jogo",
    campanhaVd: "{v}V {d}D",
    campanhaKda: "KDA {kda}",
    // O K/D/A para o leitor de tela ("19/1/8" é lido como data); sem plural para escolher.
    campanhaKdaLeitor: "abates {k}, mortes {d}, assistências {a}",

    // ---------- o time
    campanhaNaTabela: "O TIME NA TABELA",
    campanhaTabela: "{posicao} na tabela",
    campanhaTabelaCampanha: "{v}V {d}D · {pts} pts",
    campanhaAoVivo: "EM ANDAMENTO · {a} × {b}",
  },
  en: {
    campanhaTitulo: "THE CAMPAIGN",
    campanhaResultados: "SERIES BY SERIES",
    campanhaCampeoes: "CHAMPIONS PLAYED",
    campanhaProximo: "NEXT UP",
    campanhaDestaques: "Campaign highlights",
    campanhaSemJogos: "{nick} hasn't played yet this season. The numbers show up here after the first game.",
    campanhaSoProvisorio: "{nick} has no game with stats yet this season. The team has a game posted with only the result, waiting for the screenshots.",
    campanhaSoSubstituto: "{nick} played {n} games as a non-scoring sub: the numbers are on the match pages.",
    campanhaSoSubstituto1: "{nick} played 1 game as a non-scoring sub: the numbers are on the match page.",
    campanhaSaiuSemJogar: "{nick} left the team without playing this season.",

    campanhaRanking: "OVERALL RANKING",
    campanhaRankingEntre: "among {n} players who have played",
    campanhaRankingEntreEmpate: "among {n} players who have played · ties share the spot",
    campanhaEmpate: ", tied with {n} more",
    campanhaRankingRota: "KDA among {rota} players: {posicao} of {n}",
    campanhaMetricaAbates: "KILLS",
    campanhaMetricaKda: "KDA",
    campanhaMetricaMvps: "MVPs",
    campanhaMetricaAssistencias: "ASSISTS",
    campanhaMelhorJogo: "BEST GAME",
    campanhaRecordeAbates: "Most kills: {n}",
    campanhaParticipacao: "KILL PARTICIPATION",
    campanhaParticipacaoDetalhe: "of the team's kills went through {nick}",
    campanhaForma: "RECENT FORM",
    campanhaFormaUltimos: "last {n} games",
    campanhaFormaUltimo: "the last game",
    campanhaSequenciaVitorias: "{n} wins in a row",
    campanhaSequenciaDerrotas: "{n} losses in a row",
    campanhaSequenciaVitoria1: "won the last game",
    campanhaSequenciaDerrota1: "lost the last game",

    campanhaVitoria: "WIN",
    campanhaDerrota: "LOSS",
    campanhaEmAndamento: "IN PROGRESS",
    campanhaVitoriaCurta: "W",
    campanhaDerrotaCurta: "L",
    campanhaJogoCurto: "G{n}",
    campanhaJogoLongo: "Game {n}",
    campanhaNaoJogou: "did not play",
    campanhaProvisorio: "no stats yet",
    // O resto do site em inglês diz "Walkover" (paginas-competicao.ts) e "Bo3" / "Group stage".
    campanhaWo: "Walkover",
    campanhaVs: "vs",
    campanhaMvp: "MVP",
    campanhaMvpDaSerie: "SERIES MVP",
    campanhaSubstitutoEm: "subbing for {time}",
    campanhaMinutos: "{n} min",
    campanhaVerPartida: "MATCH PAGE →",
    campanhaPlacar: "Series score: {time} {a}–{b} {adversario}",
    campanhaFaseRegular: "Group stage",
    campanhaSemifinal: "Semifinal",
    campanhaFinal: "Final",

    campanhaJogos: "{n} games",
    campanhaJogo: "1 game",
    campanhaVd: "{v}W {d}L",
    campanhaKda: "KDA {kda}",
    campanhaKdaLeitor: "kills {k}, deaths {d}, assists {a}",

    campanhaNaTabela: "THE TEAM IN THE STANDINGS",
    campanhaTabela: "{posicao} in the standings",
    campanhaTabelaCampanha: "{v}W {d}L · {pts} pts",
    campanhaAoVivo: "IN PROGRESS · {a} × {b}",
  },
});
