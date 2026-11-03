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

// ---------------------------------------------------------------- o giro contínuo (show)

/*
 * O GIRO DO SHOW: ângulo como FUNÇÃO DO TEMPO, sem troca de transição CSS no meio.
 *
 * A roda antiga girava em passos de transição linear e, quando a resposta chegava, trocava
 * para uma transição com curva de freio. A troca muda a velocidade de uma vez — o "tranco"
 * que se vê quando o freio entra. Aqui o ângulo é calculado a cada quadro por estas funções
 * puras e escrito direto no `transform`: o arranque sai do repouso, o giro livre é constante
 * e o freio começa EXATAMENTE na velocidade em que a roda estava, desacelerando até parar
 * no meio da fatia sorteada. Velocidade contínua do começo ao fim.
 *
 * A honestidade continua a mesma: o giro livre não conhece o resultado; só `planejarFreio`
 * recebe o índice sorteado pelo servidor, e a parada é sempre À FRENTE (nunca de ré).
 */

/** O giro livre: parte do repouso, acelera em `arranqueMs` e segue em `velocidade` (graus/ms). */
export type GiroLivre = Readonly<{ velocidade: number; arranqueMs: number }>;

/** Ângulo do giro livre depois de `ms` (aceleração constante no arranque, depois constante). */
export function anguloLivre(giro: GiroLivre, ms: number): number {
  const t = Math.max(0, ms);
  const arranque = Math.max(1, giro.arranqueMs);
  if (t <= arranque) return (giro.velocidade * t * t) / (2 * arranque);
  return (giro.velocidade * arranque) / 2 + giro.velocidade * (t - arranque);
}

/** Velocidade do giro livre (graus/ms) depois de `ms`. */
export function velocidadeLivre(giro: GiroLivre, ms: number): number {
  const t = Math.max(0, ms);
  const arranque = Math.max(1, giro.arranqueMs);
  return t >= arranque ? giro.velocidade : (giro.velocidade * t) / arranque;
}

export type Freio = Readonly<{
  /** Ângulo em que o freio começou (onde a roda estava). */
  inicio: number;
  /** Ângulo final: o meio da fatia sorteada encostado no ponteiro. */
  parada: number;
  /** Quanto tempo a freada leva, em ms. */
  duracao: number;
  /** Expoente da queda de velocidade: v(s) = v0·(1−s)^potencia. Maior = cauda mais longa. */
  potencia: number;
}>;

/** O expoente padrão: a roda perde força rápido e se arrasta nas últimas fatias (suspense). */
export const POTENCIA_DO_FREIO = 1.8;

/**
 * Planeja a freada a partir de onde a roda ESTÁ e da velocidade que ela TEM.
 *
 * A distância até a parada sai de `anguloDeParada` (a mesma conta testada acima, que garante o
 * meio da fatia no ponteiro e nunca anda de ré). Com velocidade inicial v0 e queda
 * v(s) = v0·(1−s)^p, a distância percorrida é v0·T/(p+1) — então, para uma distância D, a
 * duração é T = (p+1)·D/v0. Como D só pode crescer em voltas inteiras, escolhe-se o número de
 * voltas cuja duração fica mais perto de `duracaoAlvo`, sem nunca frear em menos de
 * `voltasMinimas` voltas (freada curta demais parece "parar de repente").
 */
export function planejarFreio({
  giroAtual,
  velocidade,
  indice,
  total,
  duracaoAlvo,
  potencia = POTENCIA_DO_FREIO,
  voltasMinimas = 1,
}: {
  giroAtual: number;
  /** Graus por ms no instante do freio. */
  velocidade: number;
  indice: number;
  total: number;
  duracaoAlvo: number;
  potencia?: number;
  voltasMinimas?: number;
}): Freio {
  const v0 = Math.max(0.01, velocidade);
  let melhor: Freio | null = null;
  for (let voltas = Math.max(0, voltasMinimas - 1); voltas <= voltasMinimas + 12; voltas += 1) {
    const parada = anguloDeParada({ giroAtual, indice, total, voltas });
    const distancia = parada - giroAtual;
    if (distancia < voltasMinimas * 360) continue;
    const duracao = ((potencia + 1) * distancia) / v0;
    if (!melhor || Math.abs(duracao - duracaoAlvo) < Math.abs(melhor.duracao - duracaoAlvo)) {
      melhor = { inicio: giroAtual, parada, duracao, potencia };
    }
    if (duracao > duracaoAlvo) break;
  }
  // Sempre há candidato: a 1ª volta que passa do mínimo entra no laço acima.
  return melhor ?? { inicio: giroAtual, parada: anguloDeParada({ giroAtual, indice, total }), duracao: duracaoAlvo, potencia };
}

/** Ângulo da roda `ms` depois do início do freio. Depois do fim, a parada exata. */
export function anguloNoFreio(freio: Freio, ms: number): number {
  if (ms >= freio.duracao) return freio.parada;
  const s = Math.max(0, ms) / Math.max(1, freio.duracao);
  return freio.inicio + (freio.parada - freio.inicio) * (1 - Math.pow(1 - s, freio.potencia + 1));
}

/** Índice da fatia que está sob o ponteiro num ângulo de giro qualquer. */
export function fatiaNoPonteiro(giro: number, total: number): number {
  const passo = passoDaFatia(total);
  // O ponteiro está em 0°: a fatia sob ele é a que, girada, cobre 0° — ou seja, a de ângulo −giro.
  const posicao = (((-giro % 360) + 360) % 360) / passo;
  return Math.min(Math.max(0, total - 1), Math.floor(posicao));
}
