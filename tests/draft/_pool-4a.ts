import type { EloDoJogador } from "@/lib/draft/precos";

/**
 * O pool REAL da 4ª Edição, lido em produção em 22/10/2026 — a lista que a organização
 * conferiu ao decidir a tabela automática de pontos, quando o formato ainda era de 30
 * pessoas (6 times). O formato final, de 40 pessoas (8 times), é o `POOL_4A_40` mais abaixo.
 *
 * `posicao` é a ordem da lista (a da inscrição). Titulares = 1–29 e 31; reservas = 30 e
 * 32–36. `elo` é o elo que VALE; `eloRiot`/`divisao`/`pdl` são a leitura da Riot (null
 * quando o robô não leu a conta). Os organizadores jogam, mas não capitaneiam.
 *
 * Arquivo de apoio dos testes: não termina em `.test.ts`, então o vitest não o roda sozinho.
 */
export type JogadorDoPool = EloDoJogador & {
  posicao: number;
  organizador: boolean;
  rota1: string;
  rota2: string;
  reserva: boolean;
};

type Linha = [number, string, string | null, string | null, number | null, boolean, string, string, boolean?];

const LINHAS: Linha[] = [
  [1, "Mestre", "Mestre", "I", 208, true, "TOP", "JUNG"],
  [2, "Diamante", "Diamante", "III", 47, true, "MID", "ADC"],
  [3, "Esmeralda", "Esmeralda", "IV", 45, true, "ADC", "MID"],
  [4, "Mestre", "Mestre", "I", 21, false, "JUNG", "ADC"],
  [5, "Diamante", "Diamante", "IV", 34, false, "SUP", "TOP"],
  [6, "Platina", "Platina", "III", 46, false, "ADC", "JUNG"],
  [7, "Ouro", "Ouro", "IV", 0, false, "TOP", "SUP"],
  [8, "Diamante", "Diamante", "III", 58, false, "ADC", "MID"],
  [9, "Ouro", "Ouro", "I", 82, false, "TOP", "JUNG"],
  [10, "Esmeralda", "Esmeralda", "II", 88, false, "SUP", "MID"],
  [11, "Esmeralda", "Esmeralda", "IV", 52, false, "ADC", "SUP"],
  [12, "Platina", "Platina", "IV", 0, false, "ADC", "MID"],
  [13, "Platina", "Platina", "II", 93, false, "TOP", "ADC"],
  [14, "Platina", "Platina", "III", 44, false, "SUP", "JUNG"],
  [15, "Esmeralda", "Esmeralda", "I", 75, false, "JUNG", "TOP"],
  [16, "Prata", null, null, null, false, "ADC", "JUNG"],
  [17, "Esmeralda", "Esmeralda", "III", 31, false, "ADC", "SUP"],
  [18, "Platina", "Platina", "IV", 0, false, "ADC", "JUNG"],
  [19, "Prata", "Prata", "I", 29, false, "SUP", "JUNG"],
  [20, "Platina", "Platina", "III", 42, false, "ADC", "JUNG"],
  [21, "Ouro", "Ouro", "II", 61, false, "SUP", "TOP"],
  [22, "Diamante", "Diamante", "IV", 5, false, "SUP", "ADC"],
  [23, "Ouro", "Ouro", "III", 7, false, "ADC", "MID"],
  [24, "Prata", "Prata", "III", 79, false, "MID", "TOP"],
  [25, "Prata", "Prata", "III", 75, false, "MID", "SUP"],
  [26, "Esmeralda", "Esmeralda", "II", 29, false, "TOP", "SUP"],
  [27, "Esmeralda", "Esmeralda", "I", 75, false, "JUNG", "MID"],
  [28, "Diamante", "Diamante", "IV", 48, false, "JUNG", "MID"],
  [29, "Diamante", "Diamante", "IV", 67, false, "MID", "TOP"],
  [30, "Platina", "Platina", "I", 71, false, "MID", "TOP", true],
  [31, "Platina", "Platina", "III", 5, true, "ADC", "TOP"],
  [32, "Diamante", "Diamante", "I", 97, false, "TOP", "MID", true],
  [33, "Esmeralda", "Esmeralda", "III", 8, false, "ADC", "TOP", true],
  [34, "Platina", "Platina", "III", 38, false, "MID", "SUP", true],
  [35, "Ferro", null, null, null, false, "ADC", "SUP", true],
  [36, "Platina", "Platina", "I", 24, false, "ADC", "JUNG", true],
];

export const POOL_4A: readonly JogadorDoPool[] = LINHAS.map(
  ([posicao, elo, eloRiot, divisao, pdl, organizador, rota1, rota2, reserva]) => ({
    posicao,
    elo,
    eloRiot,
    divisao,
    pdl,
    organizador,
    rota1,
    rota2,
    reserva: reserva ?? false,
  }),
);

/** Os 30 que jogam (posições 1–29 e 31). */
export const TITULARES_4A = POOL_4A.filter((j) => !j.reserva);
/** A fila de reserva (posições 30 e 32–36). */
export const RESERVAS_4A = POOL_4A.filter((j) => j.reserva);

/**
 * O pool da 4ª no formato FINAL: 40 pessoas, 8 times de 5.
 *
 * As posições 1–39 são os 39 inscritos lidos em produção em 22/10/2026 à noite (a leitura
 * mais nova: alguns mudaram de divisão ou PDL desde a lista de 30 acima). A posição 40 é
 * hipotética — um Platina II 50 PDL (ADC/SUP) no lugar da última vaga, que ainda não foi
 * preenchida. Todos jogam (nenhum reserva); os organizadores são 1, 2, 3 e 31.
 */
const LINHAS_40: Linha[] = [
  [1, "Mestre", "Mestre", "I", 208, true, "TOP", "JUNG"],
  [2, "Diamante", "Diamante", "III", 47, true, "MID", "ADC"],
  [3, "Esmeralda", "Esmeralda", "IV", 45, true, "ADC", "MID"],
  [4, "Mestre", "Mestre", "I", 21, false, "JUNG", "ADC"],
  [5, "Diamante", "Diamante", "IV", 34, false, "SUP", "TOP"],
  [6, "Platina", "Platina", "III", 46, false, "ADC", "JUNG"],
  [7, "Ouro", "Ouro", "IV", 0, false, "TOP", "SUP"],
  [8, "Diamante", "Diamante", "III", 58, false, "ADC", "MID"],
  [9, "Ouro", "Ouro", "I", 82, false, "TOP", "JUNG"],
  [10, "Esmeralda", "Esmeralda", "II", 88, false, "SUP", "MID"],
  [11, "Esmeralda", "Esmeralda", "IV", 52, false, "ADC", "SUP"],
  [12, "Platina", "Platina", "IV", 0, false, "ADC", "MID"],
  [13, "Platina", "Platina", "I", 58, false, "TOP", "ADC"],
  [14, "Platina", "Platina", "III", 44, false, "SUP", "JUNG"],
  [15, "Esmeralda", "Esmeralda", "I", 75, false, "JUNG", "TOP"],
  [16, "Prata", null, null, null, false, "ADC", "JUNG"],
  [17, "Esmeralda", "Esmeralda", "III", 31, false, "ADC", "SUP"],
  [18, "Platina", "Platina", "IV", 0, false, "ADC", "JUNG"],
  [19, "Prata", "Prata", "I", 29, false, "SUP", "JUNG"],
  [20, "Platina", "Platina", "III", 42, false, "ADC", "JUNG"],
  [21, "Ouro", "Ouro", "II", 61, false, "SUP", "TOP"],
  [22, "Diamante", "Diamante", "IV", 5, false, "SUP", "ADC"],
  [23, "Ouro", "Ouro", "III", 7, false, "ADC", "MID"],
  [24, "Prata", "Prata", "III", 79, false, "MID", "TOP"],
  [25, "Prata", "Prata", "III", 75, false, "MID", "SUP"],
  [26, "Esmeralda", "Esmeralda", "II", 29, false, "TOP", "SUP"],
  [27, "Esmeralda", "Esmeralda", "I", 75, false, "JUNG", "MID"],
  [28, "Diamante", "Diamante", "IV", 48, false, "JUNG", "MID"],
  [29, "Diamante", "Diamante", "IV", 67, false, "MID", "TOP"],
  [30, "Esmeralda", "Esmeralda", "IV", 2, false, "MID", "TOP"],
  [31, "Platina", "Platina", "III", 5, true, "ADC", "TOP"],
  [32, "Mestre", "Mestre", "I", 32, false, "TOP", "MID"],
  [33, "Esmeralda", "Esmeralda", "IV", 65, false, "ADC", "TOP"],
  [34, "Platina", "Platina", "III", 38, false, "MID", "SUP"],
  [35, "Ferro", null, null, null, false, "ADC", "SUP"],
  [36, "Platina", "Platina", "I", 46, false, "ADC", "JUNG"],
  [37, "Diamante", "Diamante", "III", 67, false, "ADC", "MID"],
  [38, "Ouro", "Ouro", "II", 60, false, "MID", "TOP"],
  [39, "Diamante", "Diamante", "II", 75, false, "TOP", "MID"],
  [40, "Platina", "Platina", "II", 50, false, "ADC", "SUP"],
];

/** Os 40 da 4ª (8 times de 5), todos titulares. */
export const POOL_4A_40: readonly JogadorDoPool[] = LINHAS_40.map(
  ([posicao, elo, eloRiot, divisao, pdl, organizador, rota1, rota2]) => ({
    posicao,
    elo,
    eloRiot,
    divisao,
    pdl,
    organizador,
    rota1,
    rota2,
    reserva: false,
  }),
);

/**
 * A lista REAL de produção às 09h30 de 23/10/2026 — a véspera do draft —, sem nicks: só a
 * posição na lista, o elo lido e as rotas. São os 40 titulares (8 times de 5); os
 * organizadores são 1, 2, 3 e 31. A 35 é Ferro sem leitura da Riot (fica no meio do Ferro).
 *
 * Nesse dia a organização DEFINIU os 8 capitães (`CAPITAES_23_10`): um deles, o 1, é
 * organizador — permitido quando a organização define. O capitão não tem preço, e a tabela
 * sai dos outros 32.
 */
const LINHAS_40_23_10: Linha[] = [
  [1, "Mestre", "Mestre", "I", 177, true, "TOP", "JUNG"],
  [2, "Diamante", "Diamante", "III", 47, true, "MID", "ADC"],
  [3, "Esmeralda", "Esmeralda", "IV", 26, true, "ADC", "MID"],
  [4, "Mestre", "Mestre", "I", 21, false, "JUNG", "ADC"],
  [5, "Diamante", "Diamante", "IV", 34, false, "SUP", "TOP"],
  [6, "Platina", "Platina", "III", 46, false, "ADC", "JUNG"],
  [7, "Ouro", "Ouro", "IV", 18, false, "TOP", "SUP"],
  [8, "Diamante", "Diamante", "II", 15, false, "ADC", "MID"],
  [9, "Ouro", "Ouro", "III", 47, false, "TOP", "JUNG"],
  [10, "Esmeralda", "Esmeralda", "II", 25, false, "SUP", "MID"],
  [11, "Esmeralda", "Esmeralda", "IV", 52, false, "ADC", "SUP"],
  [12, "Platina", "Platina", "IV", 33, false, "ADC", "MID"],
  [13, "Platina", "Platina", "I", 75, false, "TOP", "ADC"],
  [14, "Platina", "Platina", "III", 24, false, "SUP", "JUNG"],
  [15, "Diamante", "Diamante", "IV", 77, false, "JUNG", "TOP"],
  [16, "Bronze", "Bronze", "IV", 80, false, "ADC", "JUNG"],
  [17, "Esmeralda", "Esmeralda", "III", 31, false, "ADC", "SUP"],
  [18, "Platina", "Platina", "IV", 0, false, "ADC", "JUNG"],
  [19, "Prata", "Prata", "I", 9, false, "SUP", "JUNG"],
  [20, "Platina", "Platina", "III", 22, false, "ADC", "JUNG"],
  [21, "Ouro", "Ouro", "II", 61, false, "SUP", "TOP"],
  [22, "Diamante", "Diamante", "IV", 65, false, "SUP", "ADC"],
  [23, "Ouro", "Ouro", "III", 7, false, "ADC", "MID"],
  [24, "Prata", "Prata", "III", 96, false, "MID", "TOP"],
  [25, "Prata", "Prata", "III", 75, false, "MID", "SUP"],
  [26, "Esmeralda", "Esmeralda", "II", 29, false, "TOP", "SUP"],
  [27, "Esmeralda", "Esmeralda", "I", 75, false, "JUNG", "MID"],
  [28, "Diamante", "Diamante", "IV", 72, false, "JUNG", "MID"],
  [29, "Diamante", "Diamante", "IV", 67, false, "MID", "TOP"],
  [30, "Esmeralda", "Esmeralda", "IV", 2, false, "MID", "TOP"],
  [31, "Platina", "Platina", "III", 5, true, "ADC", "TOP"],
  [32, "Mestre", "Mestre", "I", 3, false, "TOP", "MID"],
  [33, "Esmeralda", "Esmeralda", "IV", 64, false, "ADC", "TOP"],
  [34, "Platina", "Platina", "III", 18, false, "MID", "SUP"],
  [35, "Ferro", null, null, null, false, "ADC", "SUP"],
  [36, "Platina", "Platina", "I", 46, false, "ADC", "JUNG"],
  [37, "Diamante", "Diamante", "III", 67, false, "ADC", "MID"],
  [38, "Ouro", "Ouro", "II", 97, false, "MID", "TOP"],
  [39, "Diamante", "Diamante", "I", 26, false, "TOP", "MID"],
  [40, "Platina", "Platina", "I", 46, false, "MID", "ADC"],
];

/** Os 40 titulares da 4ª na lista de 23/10/2026, 09h30. */
export const POOL_4A_40_23_10: readonly JogadorDoPool[] = LINHAS_40_23_10.map(
  ([posicao, elo, eloRiot, divisao, pdl, organizador, rota1, rota2]) => ({
    posicao,
    elo,
    eloRiot,
    divisao,
    pdl,
    organizador,
    rota1,
    rota2,
    reserva: false,
  }),
);

/** As posições dos 8 capitães definidos pela organização em 23/10/2026 (o 1 é organizador). */
export const CAPITAES_23_10: readonly number[] = [5, 29, 10, 1, 20, 37, 15, 17];
