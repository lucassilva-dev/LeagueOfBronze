import { createHmac, randomBytes } from "node:crypto";

import { ALL_CARDS, CARDS, isDuplaCard } from "@/lib/cards";
import { CHAMPIONS } from "@/lib/champions";
import type { CardId } from "@/lib/schema";

/**
 * Sorteios da série: lados e cartinhas.
 *
 * ⚠ O QUE MUDA AQUI EM RELAÇÃO AO QUE EXISTIA.
 *
 * Antes, o sistema não sorteava nada: `POST /api/admin/series/sides` recebia o
 * `blueSideTeamId` pronto e `.../cards` recebia o `cardId` pronto. Alguém rolava um
 * dado fora do site e digitava o resultado. Duas consequências:
 *
 *  1. não havia o que animar, porque não havia sorteio;
 *  2. nada impedia repetir até gostar — a carta nova substituía a anterior e não
 *     ficava registro de que houve duas.
 *
 * Agora o resultado nasce de uma SEMENTE, e a semente é gravada junto. Qualquer pessoa
 * com a semente e o mesmo pool recalcula e confere o resultado — o sorteio deixa de
 * depender da palavra de quem clicou.
 *
 * As funções são puras (a semente entra por parâmetro) justamente para que isso seja
 * verificável num teste, e para que a conferência possa ser refeita anos depois.
 */

/** Semente nova, 128 bits em hexadecimal. Só isto usa aleatoriedade de verdade. */
export function novaSemente(): string {
  return randomBytes(16).toString("hex");
}

/**
 * Índice uniforme em [0, tamanho), derivado da semente.
 *
 * Usa HMAC-SHA256 e amostragem por rejeição. O `% tamanho` direto sobre um inteiro de
 * 32 bits enviesa os primeiros índices quando `tamanho` não divide 2³² — com 6 cartas
 * o desvio é pequeno, mas num sorteio que decide partida "pequeno" não é argumento.
 *
 * O `rotulo` separa sorteios diferentes da mesma semente: com ele, lados e carta saem
 * de fluxos independentes em vez de repetirem o mesmo número.
 */
export function sortearIndice(semente: string, rotulo: string, tamanho: number): number {
  if (!Number.isInteger(tamanho) || tamanho <= 0) {
    throw new Error(`Tamanho inválido para sorteio: ${tamanho}`);
  }
  if (tamanho === 1) return 0;

  // Maior múltiplo de `tamanho` que cabe em 32 bits: valores acima dele são descartados.
  const limite = Math.floor(0x1_0000_0000 / tamanho) * tamanho;

  for (let bloco = 0; bloco < 64; bloco++) {
    const bytes = createHmac("sha256", semente).update(`${rotulo}:${bloco}`).digest();
    for (let off = 0; off + 4 <= bytes.length; off += 4) {
      const valor = bytes.readUInt32BE(off);
      if (valor < limite) return valor % tamanho;
    }
  }

  // Estatisticamente inalcançável (cada bloco tem 8 chances de ~99,9%); existe para
  // não haver caminho que devolva um número enviesado por desistência.
  throw new Error("Não foi possível sortear sem viés.");
}

// ---------------------------------------------------------------- lados

/**
 * Quem começa no lado azul. O outro começa no vermelho.
 *
 * A ordem do par é fixada (A, B) para que a conferência posterior seja possível: com
 * a mesma semente e a mesma série, o resultado é sempre o mesmo.
 */
export function sortearLado(semente: string, teamAId: string, teamBId: string): string {
  return sortearIndice(semente, "lados", 2) === 0 ? teamAId : teamBId;
}

// ---------------------------------------------------------------- cartinhas

/**
 * O pool de cada modalidade.
 *
 * No sorteio individual valem as 6 cartas que afetam o adversário. No sorteio duplo —
 * quando os DOIS capitães usam e uma carta só vale para ambos — entram também as 2
 * duplas. Mesma regra que a rota antiga já validava.
 */
export function poolDeCartas(dupla: boolean): CardId[] {
  return (dupla ? ALL_CARDS : CARDS).map((c) => c.cardId);
}

export function sortearCarta(semente: string, dupla: boolean, rotulo = "carta"): CardId {
  const pool = poolDeCartas(dupla);
  const escolhida = pool[sortearIndice(semente, rotulo, pool.length)]!;

  // Rede: uma carta dupla no sorteio individual quebraria a regra do regulamento.
  if (!dupla && isDuplaCard(escolhida)) {
    throw new Error(`Carta dupla saiu num sorteio individual: ${escolhida}`);
  }
  return escolhida;
}

// ---------------------------------------------------------------- letras do ABCDRAFT

const LETRAS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

/** Quantos campeões começam com cada letra, no patch que o site tem hoje. */
export function campeoesPorLetra(): Record<string, number> {
  const mapa: Record<string, number> = {};
  for (const campeao of CHAMPIONS) {
    const letra = campeao.name.charAt(0).toUpperCase();
    mapa[letra] = (mapa[letra] ?? 0) + 1;
  }
  return mapa;
}

/**
 * Mínimo de campeões que o par de letras precisa cobrir.
 *
 * NÃO é enfeite. Hoje o pior par possível é Q + U: **4 campeões para 5 vagas**. Sorteado
 * ao vivo, seria uma carta impossível de cumprir, e a organização descobriria isso na
 * frente de todo mundo. Doze deixa escolha de verdade — com 5 jogadores e rotas
 * diferentes, o mínimo aritmético (5) só produziria uma composição obrigatória.
 */
export const MINIMO_DE_CAMPEOES = 12;

/**
 * As duas letras do ABCDRAFT.
 *
 * Sorteia pares até achar um que cubra o mínimo. Determinístico: o mesmo par sai da
 * mesma semente, e a rejeição faz parte do cálculo — quem conferir depois chega ao
 * mesmo resultado.
 */
export function sortearLetras(
  semente: string,
  minimo = MINIMO_DE_CAMPEOES,
): { letras: [string, string]; campeoes: number } {
  const porLetra = campeoesPorLetra();

  for (let tentativa = 0; tentativa < 200; tentativa++) {
    const a = LETRAS[sortearIndice(semente, `letra-a:${tentativa}`, LETRAS.length)]!;
    const b = LETRAS[sortearIndice(semente, `letra-b:${tentativa}`, LETRAS.length)]!;
    if (a === b) continue;

    const campeoes = (porLetra[a] ?? 0) + (porLetra[b] ?? 0);
    if (campeoes >= minimo) {
      // Ordem alfabética na saída: o par {L, M} e {M, L} são a mesma carta.
      const letras: [string, string] = a < b ? [a, b] : [b, a];
      return { letras, campeoes };
    }
  }

  throw new Error(`Nenhum par de letras alcançou ${minimo} campeões.`);
}

// ---------------------------------------------------------------- registro

export type TipoDeSorteio = "lados" | "carta";

/** O que fica gravado na série. É isto que permite conferir depois. */
export type RegistroDeSorteio = {
  tipo: TipoDeSorteio;
  semente: string;
  emISO: string;
  autor: string;
  /** Time sorteado (lados) ou dono da carta (individual). Ausente no sorteio duplo. */
  teamId?: string;
  /** `blueSideTeamId` nos lados; o `cardId` nas cartas. */
  resultado: string;
  /** Ex.: as letras do ABCDRAFT, com quantos campeões elas cobrem. */
  detalhe?: Record<string, unknown>;
};

/**
 * Refaz o sorteio a partir do que foi gravado e diz se bate.
 *
 * É a função que transforma "confie em nós" em "confira você mesmo". Se alguém
 * questionar um resultado meses depois, isto responde.
 */
export function conferirSorteio(
  registro: RegistroDeSorteio,
  contexto: { teamAId: string; teamBId: string; dupla?: boolean },
): boolean {
  if (registro.tipo === "lados") {
    return sortearLado(registro.semente, contexto.teamAId, contexto.teamBId) === registro.resultado;
  }
  /*
   * O tipo de pool sai do PRÓPRIO REGISTRO, não de quem está conferindo.
   *
   * O sorteio duplo usa as 8 cartas; o individual, só as 6. Com `contexto.dupla ?? false`,
   * quem conferisse um registro duplo sem saber que precisava avisar recebia `false` — a
   * ferramenta que existe para provar honestidade acusava de fraude um sorteio honesto.
   * E quem confere meses depois tem em mãos exatamente o registro, que já carrega
   * `detalhe.dupla`.
   *
   * `contexto.dupla` continua valendo como sobreposição explícita, para quem quiser
   * conferir contra um pool escolhido à mão.
   */
  const dupla =
    contexto.dupla ??
    (registro.detalhe?.dupla === true || isDuplaCard(registro.resultado as CardId));

  try {
    return sortearCarta(registro.semente, dupla) === registro.resultado;
  } catch {
    return false;
  }
}
