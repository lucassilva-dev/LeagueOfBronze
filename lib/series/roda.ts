/**
 * A GEOMETRIA E OS TEMPOS DA RODA DE SORTEIO.
 *
 * Módulo puro, sem React e sem DOM, por um motivo prático: a roda desenha as fatias com
 * um `conic-gradient` e o freio escolhe o ângulo de parada — e as duas coisas precisam
 * concordar sobre onde cada fatia começa. Quando essa conta existia duplicada dentro de
 * um componente, bastava alguém mexer num dos lados para a roda parar "quase" no
 * resultado certo, o que numa transmissão ao vivo é pior do que não ter roda nenhuma.
 *
 * Aqui a conta é uma só, e o teste trava o contrato: o meio da fatia vencedora encosta
 * no ponteiro, sempre girando para a frente.
 *
 * Convenção de ângulos, igual à do `conic-gradient` do CSS: 0° é o topo (onde fica o
 * ponteiro) e o sentido positivo é horário.
 */

// ---------------------------------------------------------------- tempos

/** Um passo de giro livre. Intervalo e transição têm a MESMA duração: o giro não engasga. */
export const PASSO_MS = 560;
export const PASSO_GRAUS = 420;

/** Piso de suspense: mesmo que a rede responda em 80 ms, a roda gira isto antes de frear. */
export const MINIMO_MS = 1400;

/** A desaceleração. É o único trecho que conhece o resultado. */
export const FREIO_MS = 2600;

/** Voltas inteiras de sobra para a freada ter curso — sem elas a roda "pula" para o fim. */
export const VOLTAS_FINAIS = 3;

/** A curva do freio. Sai rápido, chega devagar, encosta sem repique. */
export const CURVA_DO_FREIO = "cubic-bezier(.14,.72,.12,1)";

// ---------------------------------------------------------------- geometria

/** O tamanho angular de cada fatia. */
export function passoDaFatia(total: number): number {
  return 360 / Math.max(1, total);
}

/** Onde a fatia `i` começa, termina e onde está o meio dela — na roda parada em 0°. */
export function fatiaDoIndice(i: number, total: number) {
  const passo = passoDaFatia(total);
  const inicio = i * passo;
  return { inicio, fim: inicio + passo, meio: inicio + passo / 2 };
}

/**
 * O ângulo em que a roda tem de parar para o meio da fatia `indice` encostar no ponteiro.
 *
 * Girar a roda em `giro` leva o meio da fatia de `meio` para `meio + giro`; o ponteiro está
 * em 0°, então queremos `meio + giro ≡ 0 (mod 360)`, ou seja `giro ≡ 360 − meio`.
 *
 * O resto é encenação honesta: arredonda para cima até a próxima volta inteira e soma
 * `VOLTAS_FINAIS`, de modo que o resultado é SEMPRE maior que o ângulo atual. A roda nunca
 * anda de ré para "achar" o resultado — o que entregaria o jogo para quem estivesse olhando.
 */
export function anguloDeParada({
  giroAtual,
  indice,
  total,
  voltas = VOLTAS_FINAIS,
}: {
  giroAtual: number;
  indice: number;
  total: number;
  voltas?: number;
}): number {
  const { meio } = fatiaDoIndice(indice, total);
  return Math.ceil(giroAtual / 360) * 360 + voltas * 360 + (360 - meio);
}

/**
 * As fatias como `conic-gradient`, mais os riscos que separam uma da outra.
 *
 * Sem SVG e sem canvas de propósito: um gradiente cônico é uma string, roda em qualquer
 * navegador e não precisa de camada de desenho para acompanhar o `transform`.
 */
export function pinturaDasFatias(cores: readonly string[]): string {
  const total = Math.max(1, cores.length);
  const passo = passoDaFatia(total);
  const fatias = cores
    .map((cor, i) => `${cor} ${(i * passo).toFixed(3)}deg ${((i + 1) * passo).toFixed(3)}deg`)
    .join(", ");
  const separadores = `repeating-conic-gradient(from 0deg, rgba(8,5,2,.9) 0deg .7deg, rgba(0,0,0,0) .7deg ${passo.toFixed(3)}deg)`;
  return `${separadores}, conic-gradient(from 0deg, ${fatias})`;
}

/**
 * Onde plantar o rótulo da fatia `i`, em porcentagem do lado da roda.
 *
 * O rótulo gira JUNTO com a roda e nasce virado para fora (`rotacao`); assim, quando a fatia
 * vencedora chega ao ponteiro, o rótulo dela está exatamente na horizontal — e não de lado,
 * que é como fica se alguém esquecer de rotacionar o texto.
 */
export function posicaoDoRotulo(i: number, total: number, raio: number) {
  const { meio } = fatiaDoIndice(i, total);
  const rad = (meio * Math.PI) / 180;
  return {
    esquerda: 50 + raio * 100 * Math.sin(rad),
    topo: 50 - raio * 100 * Math.cos(rad),
    rotacao: meio,
  };
}

/**
 * Quantas fatias passaram pelo ponteiro entre dois ângulos.
 *
 * Serve para o tique: o ponteiro bate uma vez a cada fatia que cruza, como numa roda de
 * verdade. Sem isto o tique seria um relógio fixo e desandaria justamente quando a roda
 * desacelera — que é quando o ouvido mais percebe.
 */
export function fatiasCruzadas(de: number, para: number, total: number): number {
  const passo = passoDaFatia(total);
  return Math.max(0, Math.floor(para / passo) - Math.floor(de / passo));
}
