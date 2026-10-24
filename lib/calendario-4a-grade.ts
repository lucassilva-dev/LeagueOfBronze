import type { CalendarioDaEdicao } from "@/lib/calendario-4a";

/**
 * A GRADE DOS JOGOS DA 4ª EDIÇÃO — o ÚNICO lugar para preencher quando as datas chegarem.
 *
 * Decisão de 2026-10-22: 40 jogadores = 8 times de 5 (antes eram 6 times). O calendário de
 * 6 times (20 a 29/11, publicado em 2026-10-20) deixou de valer, e o de 8 ainda não tem
 * datas. Enquanto `divulgado` for `false`, o site inteiro diz "datas a divulgar" — /regras,
 * /calendario, a home e o formulário — e o botão do painel que cria as séries fica travado.
 *
 * O resto do código lê daqui através de lib/calendario-4a.ts (que tem as funções e os
 * tipos). Este arquivo fica separado só para guardar os DADOS: os testes trocam a grade
 * inteira por uma de mentira (vi.mock deste módulo) e exercitam as páginas com o
 * calendário divulgado sem depender de datas reais.
 *
 * ------------------------------------------------------------------------------------
 * COMO PREENCHER (8 times = 28 séries de pontos + 2 semifinais + a final = 31 séries)
 * ------------------------------------------------------------------------------------
 *
 * 1. Troque `divulgado: false` por `divulgado: true` e acrescente `slots: [ ... ]`, em
 *    ordem de data e hora, um objeto por horário:
 *
 *      { quando: "2026-11-20T20:00:00-03:00", tipo: "pontos", confronto: [3, 6], formato: "BO3" },
 *      { quando: "2026-11-20T22:00:00-03:00", tipo: "pontos", confronto: [2, 5], formato: "BO3", podeAtrasar: true },
 *      { quando: "2026-11-28T19:00:00-03:00", tipo: "reserva" },
 *      { quando: "2026-11-29T08:30:00-03:00", tipo: "semifinal", semifinal: 1, formato: "BO3" },
 *      { quando: "2026-11-29T10:30:00-03:00", tipo: "semifinal", semifinal: 2, formato: "BO3" },
 *      { quando: "2026-11-29T14:30:00-03:00", tipo: "final", formato: "BO5" },
 *
 *    - `quando`: hora de Brasília COM o fuso escrito (-03:00 — o Brasil não tem horário de
 *      verão desde 2019). É o mesmo formato das séries do dataset.
 *    - `confronto`: as POSIÇÕES que se enfrentam (Time N x Time M, de 1 a 8). Qual time
 *      real ocupa cada posição sai do sorteio ao vivo depois do draft (painel → Draft ao
 *      vivo → 4 · Calendário). Todos contra todos, uma vez: os 28 pares de 1..8, cada um
 *      exatamente uma vez, todos em MD3 ("BO3").
 *    - semifinal 1 = 1º x 4º e semifinal 2 = 2º x 3º, em MD3; a final em MD5 ("BO5"). Elas
 *      não viram série na hora do sorteio: são criadas no painel de Séries quando a tabela
 *      fechar (o dataset exige dois times de verdade em toda série).
 *    - `reserva`: pelo menos um horário vago para remarcar imprevistos — a regra 9 o cita.
 *    - `podeAtrasar`: o jogo que pode começar depois do horário se o anterior do mesmo dia
 *      passar do tempo (a tela escreve o horário do anterior).
 *
 * 2. Rode `npx vitest run tests/calendario-4a.test.tsx`. `problemasDaGrade` confere tudo
 *    isso (pares, posições 1..8, formatos, fuso, ordem pontos → semis → final, reserva) e o
 *    teste aponta as frases fixas que ainda dizem "a divulgar" e precisam do período:
 *    `paginasRegras.fichaPeriodoV` e `inscricao.disponibilidadeAjuda`. As demais (home,
 *    /calendario, notas da grade, cartão do painel) saem da grade sozinhas.
 *
 * 3. Se a organização decidir outro número de times, troque `times` aqui E o teto
 *    `edicao_config.max_times` no banco (o draft forma quantos times o teto deixar, e a
 *    criação das séries recusa um número diferente do calendário). Os textos fixos que
 *    citam o número ("8 nesta edição", "8 times de 5 jogadores (40 vagas)", a serpentina
 *    1…8) estão em lib/i18n/messages/paginas-regras.ts e calendario-4a.ts — o mesmo teste
 *    avisa qual ficou velho.
 */
/**
 * DIVULGADO em 24/10/2026 (dia do draft): 3 fins de semana — 13 a 15/11, 27 a 29/11 e 04 a
 * 06/12 —, um jogo de cada vez, começo às 08:30 no sábado e no domingo, almoço de 12:30 às
 * 14:30, e a final em MD5 no domingo 06/12. O Time 1 é o time definido pela organização (fica
 * fixo na posição 1 no sorteio das posições; os outros 7 são sorteados do 2 ao 8).
 *
 * `podeAtrasar` em todo jogo que vem logo depois de outro no mesmo dia: cada série reserva 2h
 * e começa assim que a anterior termina — o horário é de referência. Depois do almoço não,
 * porque as 2h de almoço absorvem o atraso.
 */
const BRT = "-03:00";
const em = (dia: string, hora: string) => `2026-${dia}T${hora}:00${BRT}`;

export const CALENDARIO_OFICIAL_4A: CalendarioDaEdicao = {
  divulgado: true,
  times: 8,
  slots: [
    // ---- 1º fim de semana
    { quando: em("11-13", "20:00"), tipo: "pontos", confronto: [7, 8], formato: "BO3" },
    { quando: em("11-13", "22:00"), tipo: "pontos", confronto: [1, 6], formato: "BO3", podeAtrasar: true },
    { quando: em("11-14", "08:30"), tipo: "pontos", confronto: [2, 5], formato: "BO3" },
    { quando: em("11-14", "10:30"), tipo: "pontos", confronto: [4, 7], formato: "BO3", podeAtrasar: true },
    { quando: em("11-14", "14:30"), tipo: "pontos", confronto: [2, 3], formato: "BO3" },
    { quando: em("11-14", "16:30"), tipo: "pontos", confronto: [6, 8], formato: "BO3", podeAtrasar: true },
    { quando: em("11-14", "18:30"), tipo: "pontos", confronto: [3, 5], formato: "BO3", podeAtrasar: true },
    { quando: em("11-14", "20:30"), tipo: "pontos", confronto: [6, 7], formato: "BO3", podeAtrasar: true },
    { quando: em("11-15", "08:30"), tipo: "pontos", confronto: [4, 5], formato: "BO3" },
    { quando: em("11-15", "10:30"), tipo: "pontos", confronto: [1, 2], formato: "BO3", podeAtrasar: true },
    { quando: em("11-15", "14:30"), tipo: "reserva" },
    // ---- 2º fim de semana
    { quando: em("11-27", "20:00"), tipo: "pontos", confronto: [1, 5], formato: "BO3" },
    { quando: em("11-27", "22:00"), tipo: "pontos", confronto: [2, 4], formato: "BO3", podeAtrasar: true },
    { quando: em("11-28", "08:30"), tipo: "pontos", confronto: [3, 7], formato: "BO3" },
    { quando: em("11-28", "10:30"), tipo: "pontos", confronto: [4, 6], formato: "BO3", podeAtrasar: true },
    { quando: em("11-28", "14:30"), tipo: "pontos", confronto: [5, 6], formato: "BO3" },
    { quando: em("11-28", "16:30"), tipo: "pontos", confronto: [4, 8], formato: "BO3", podeAtrasar: true },
    { quando: em("11-28", "18:30"), tipo: "pontos", confronto: [1, 7], formato: "BO3", podeAtrasar: true },
    { quando: em("11-28", "20:30"), tipo: "pontos", confronto: [3, 8], formato: "BO3", podeAtrasar: true },
    { quando: em("11-29", "08:30"), tipo: "pontos", confronto: [1, 8], formato: "BO3" },
    { quando: em("11-29", "10:30"), tipo: "pontos", confronto: [2, 7], formato: "BO3", podeAtrasar: true },
    { quando: em("11-29", "14:30"), tipo: "reserva" },
    // ---- 3º fim de semana
    { quando: em("12-04", "20:00"), tipo: "pontos", confronto: [3, 4], formato: "BO3" },
    { quando: em("12-04", "22:00"), tipo: "pontos", confronto: [2, 8], formato: "BO3", podeAtrasar: true },
    { quando: em("12-05", "08:30"), tipo: "pontos", confronto: [3, 6], formato: "BO3" },
    { quando: em("12-05", "10:30"), tipo: "pontos", confronto: [5, 8], formato: "BO3", podeAtrasar: true },
    { quando: em("12-05", "14:30"), tipo: "pontos", confronto: [1, 4], formato: "BO3" },
    { quando: em("12-05", "16:30"), tipo: "pontos", confronto: [5, 7], formato: "BO3", podeAtrasar: true },
    { quando: em("12-05", "18:30"), tipo: "pontos", confronto: [1, 3], formato: "BO3", podeAtrasar: true },
    { quando: em("12-05", "20:30"), tipo: "pontos", confronto: [2, 6], formato: "BO3", podeAtrasar: true },
    { quando: em("12-05", "22:30"), tipo: "reserva" },
    { quando: em("12-06", "08:30"), tipo: "semifinal", semifinal: 1, formato: "BO3" },
    { quando: em("12-06", "10:30"), tipo: "semifinal", semifinal: 2, formato: "BO3", podeAtrasar: true },
    { quando: em("12-06", "14:30"), tipo: "final", formato: "BO5" },
  ],
};
