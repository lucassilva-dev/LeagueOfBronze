import { definir } from "@/lib/i18n/definir";

/**
 * Textos do calendário da 4ª Edição (lib/calendario-4a.ts), usado em /regras, em
 * /calendario e na home da pré-temporada.
 *
 * `{n}` é o número da posição (Time 1 … Time 6). A GRADE (dia, hora, confronto) vem do
 * arquivo do calendário. As frases abaixo repetem algumas datas e horas porque precisam
 * soar naturais nos dois idiomas ("Sexta 22:00 e sábado 23:00…") — e o teste
 * tests/calendario-4a.test.tsx compara cada uma com a grade: mudou um horário lá, o teste
 * aponta qual frase daqui (e de /regras, da home e do formulário) ficou velha.
 */
export const calendario4a = definir({
  pt: {
    titulo: "CALENDÁRIO DA 4ª EDIÇÃO",
    intro:
      "6 times, um jogo de cada vez: 18 séries em dois fins de semana — 20, 21 e 22/11 e 27, 28 e 29/11. Semifinais e final no mesmo dia, domingo 29/11. Horários de Brasília.",
    fimDeSemana1: "1º FIM DE SEMANA",
    fimDeSemana2: "2º FIM DE SEMANA",
    diasDaSemana: "DOMINGO,SEGUNDA,TERÇA,QUARTA,QUINTA,SEXTA,SÁBADO",

    legendaManha: "Manhã",
    legendaTarde: "Tarde",
    legendaNoite: "Noite",
    legendaSemifinal: "Semifinal",
    legendaFinal: "Final MD5",
    legendaReserva: "Reserva",

    time: "Time {n}",
    versus: "x",
    semifinal1: "Semifinal: 1º x 4º colocados",
    semifinal2: "Semifinal: 2º x 3º colocados",
    final: "FINAL em MD5",
    reserva: "RESERVA: realocação de imprevistos",
    podeAtrasar: "pode atrasar",
    podeAtrasarTitulo: "Começa quando o jogo anterior terminar, se ele se estender.",
    formatoMd3: "MD3",
    formatoMd5: "MD5",

    notaPosicoes:
      "Time 1 a Time 6 são posições: qual time ocupa cada uma sai de um sorteio ao vivo logo depois do draft.",
    notaAtraso:
      "Sexta 22:00 e sábado 23:00 podem atrasar se o jogo anterior ainda estiver rolando; a equipe espera.",
    notaReserva: "A reserva de sábado 28/11 às 19:00 fica vaga para remarcar imprevistos.",
    notaSemis: "Os confrontos das semifinais saem da classificação da fase de pontos: 1º x 4º e 2º x 3º.",

    // home
    resumoTitulo: "CALENDÁRIO",
    resumoPeriodo: "20 A 29 DE NOVEMBRO",
    resumoTexto:
      "Dois fins de semana, 18 séries: pontos corridos de 20 a 28/11 e, no domingo 29/11, semifinais e a final em MD5.",
    resumoJogos: "{n} jogos",
    resumoJogo: "1 jogo",
    resumoFinais: "semis + final",
    verCalendario: "VER O CALENDÁRIO →",
  },
  en: {
    titulo: "4TH EDITION SCHEDULE",
    intro:
      "6 teams, one game at a time: 18 series over two weekends — 20, 21 and 22 Nov and 27, 28 and 29 Nov. Semifinals and the final on the same day, Sunday 29 Nov. Brasília time.",
    fimDeSemana1: "1ST WEEKEND",
    fimDeSemana2: "2ND WEEKEND",
    diasDaSemana: "SUNDAY,MONDAY,TUESDAY,WEDNESDAY,THURSDAY,FRIDAY,SATURDAY",

    legendaManha: "Morning",
    legendaTarde: "Afternoon",
    legendaNoite: "Evening",
    legendaSemifinal: "Semifinal",
    legendaFinal: "Bo5 final",
    legendaReserva: "Reserve",

    time: "Team {n}",
    versus: "v",
    semifinal1: "Semifinal: 1st v 4th",
    semifinal2: "Semifinal: 2nd v 3rd",
    final: "Bo5 FINAL",
    reserva: "RESERVE: slot for rescheduling",
    podeAtrasar: "may start late",
    podeAtrasarTitulo: "Starts when the previous game ends, if it runs long.",
    formatoMd3: "Bo3",
    formatoMd5: "Bo5",

    notaPosicoes:
      "Team 1 to Team 6 are slots: which team takes each one is decided by a live draw right after the draft.",
    notaAtraso:
      "Friday 22:00 and Saturday 23:00 may start late if the previous game is still running; the team waits.",
    notaReserva: "The Saturday 28 Nov 19:00 reserve slot is kept free to reschedule anything that goes wrong.",
    notaSemis: "The semifinal match-ups come from the round-robin standings: 1st v 4th and 2nd v 3rd.",

    resumoTitulo: "SCHEDULE",
    resumoPeriodo: "20 TO 29 NOVEMBER",
    resumoTexto:
      "Two weekends, 18 series: round robin from 20 to 28 Nov and, on Sunday 29 Nov, the semifinals and the Bo5 final.",
    resumoJogos: "{n} games",
    resumoJogo: "1 game",
    resumoFinais: "semis + final",
    verCalendario: "SEE THE SCHEDULE →",
  },
});
