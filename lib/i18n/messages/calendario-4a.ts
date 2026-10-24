import { definir } from "@/lib/i18n/definir";

/**
 * Textos do calendário da 4ª Edição (lib/calendario-4a.ts), usado em /regras, em
 * /calendario e na home da pré-temporada.
 *
 * 8 times, datas a divulgar (decisão de 2026-10-22): enquanto a grade não sai, as páginas
 * mostram o bloco `aDivulgar*` — o formato, sem dia nem hora. Quando a grade é divulgada,
 * as frases que dependem dela são MOLDES preenchidos pela grade (`{times}`, `{dia}`,
 * `{hora}`…): nenhuma data fica escrita aqui, então nenhuma fica velha.
 *
 * `intro` é a exceção, porque /regras e /calendario a mostram direto: ela diz só o formato
 * (8 times, 31 séries), que vale com e sem as datas. tests/calendario-4a.test.tsx confere
 * esses números com `TIMES_DO_CALENDARIO_4A` e com a grade, quando ela existir.
 */
export const calendario4a = definir({
  pt: {
    titulo: "CALENDÁRIO DA 4ª EDIÇÃO",
    intro:
      "8 times e 31 séries: 28 de pontos corridos (todos contra todos, em MD3), as 2 semifinais em MD3 e a final em MD5. Horários de Brasília.",
    // `{n}` = 1, 2, 3… — os dias da mesma semana formam um fim de semana.
    fimDeSemana: "{n}º FIM DE SEMANA",
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
    // `{anterior}` = horário do jogo anterior do mesmo dia (ex.: 20:00).
    podeAtrasar: "Se o jogo das {anterior} passar do horário, este começa assim que ele acabar.",
    formatoMd3: "MD3",
    formatoMd5: "MD5",

    // `{times}` = número de times do calendário.
    notaPosicoes:
      "Time 1 a Time {times} são posições. O Time 1 é o time da organização; qual time ocupa cada uma das outras sai de um sorteio ao vivo logo depois do draft.",
    notaAtraso:
      "Os jogos com o aviso de horário nunca começam antes da hora marcada. Se o jogo anterior passar do tempo, eles começam assim que ele acabar.",
    // `{dia}` = "sábado, 28/11"; `{hora}` = "19:00". Uma nota por horário de reserva.
    notaReserva: "A reserva de {dia}, às {hora}, fica vaga para remarcar imprevistos.",
    notaSemis: "Os confrontos das semifinais saem da classificação da fase de pontos: 1º x 4º e 2º x 3º.",

    // ---------- datas a divulgar ----------
    aDivulgarSelo: "A DIVULGAR",
    aDivulgarTitulo: "Datas e horários dos jogos a divulgar",
    // `{times}` = 8; `{vagas}` = 40.
    aDivulgarTexto:
      "O formato está fechado: {times} times de 5 jogadores ({vagas} vagas). As datas e os horários dos jogos saem aqui assim que a organização fechar o calendário — e o aviso vai também para o Discord e o grupo do WhatsApp.",
    aDivulgarPontosK: "FASE DE PONTOS",
    // `{pontos}` = 28 com 8 times.
    aDivulgarPontosV: "Todos contra todos, uma vez: {pontos} séries em MD3.",
    aDivulgarSemisK: "SEMIFINAIS",
    aDivulgarSemisV: "1º x 4º e 2º x 3º colocados, em MD3.",
    aDivulgarFinalK: "FINAL",
    aDivulgarFinalV: "Os vencedores das semifinais, em MD5.",
    aDivulgarPosicoes:
      "Na grade, os times entram como posições (Time 1 a Time {times}). O Time 1 é o time da organização; as outras são sorteadas ao vivo logo depois do draft.",

    // home
    resumoTitulo: "CALENDÁRIO",
    pilulaADivulgar: "DATAS A DIVULGAR",
    pilulaFormato: "{times} TIMES · {vagas} JOGADORES",
    resumoJogos: "{n} jogos",
    resumoJogo: "1 jogo",
    resumoSemis: "semis",
    resumoFinal: "final",
    verCalendario: "VER O CALENDÁRIO →",
  },
  en: {
    titulo: "4TH EDITION SCHEDULE",
    intro:
      "8 teams and 31 series: 28 in the round robin (everyone plays everyone, Bo3), the 2 Bo3 semifinals and the Bo5 final. Brasília time.",
    fimDeSemana: "WEEKEND {n}",
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
    podeAtrasar: "If the {anterior} game runs over, this one starts as soon as it ends.",
    formatoMd3: "Bo3",
    formatoMd5: "Bo5",

    notaPosicoes:
      "Team 1 to Team {times} are slots. Team 1 is the organisers' team; which team takes each of the others is decided by a live draw right after the draft.",
    notaAtraso:
      "Games marked with a start-time note never start early. If the game before them runs over, they start as soon as it ends.",
    notaReserva: "The reserve slot on {dia}, at {hora}, is kept free to reschedule anything that goes wrong.",
    notaSemis: "The semifinal match-ups come from the round-robin standings: 1st v 4th and 2nd v 3rd.",

    aDivulgarSelo: "TO BE ANNOUNCED",
    aDivulgarTitulo: "Match dates and times to be announced",
    aDivulgarTexto:
      "The format is set: {times} teams of 5 players ({vagas} places). Match dates and times will be posted here as soon as the organisers finalise the schedule — and announced on Discord and in the WhatsApp group too.",
    aDivulgarPontosK: "ROUND ROBIN",
    aDivulgarPontosV: "Everyone plays everyone once: {pontos} Bo3 series.",
    aDivulgarSemisK: "SEMIFINALS",
    aDivulgarSemisV: "1st v 4th and 2nd v 3rd, Bo3.",
    aDivulgarFinalK: "FINAL",
    aDivulgarFinalV: "The semifinal winners, Bo5.",
    aDivulgarPosicoes:
      "On the schedule, teams appear as slots (Team 1 to Team {times}). Team 1 is the organisers' team; the others are drawn live right after the draft.",

    resumoTitulo: "SCHEDULE",
    pilulaADivulgar: "DATES TO BE ANNOUNCED",
    pilulaFormato: "{times} TEAMS · {vagas} PLAYERS",
    resumoJogos: "{n} games",
    resumoJogo: "1 game",
    resumoSemis: "semis",
    resumoFinal: "final",
    verCalendario: "SEE THE SCHEDULE →",
  },
});
