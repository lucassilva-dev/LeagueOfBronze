"use client";

import { useCallback, useEffect, useRef } from "react";

import {
  anguloLivre,
  anguloNoFreio,
  passoDaFatia,
  planejarFreio,
  velocidadeLivre,
  type Freio,
  type GiroLivre,
} from "@/lib/series/roda";

/**
 * O MOTOR DO GIRO — um laço de `requestAnimationFrame` que escreve o ângulo direto no DOM.
 *
 * O ângulo sai das funções puras de `lib/series/roda.ts` (arranque, giro livre, freio contínuo)
 * e vai para quem chamou por `aplicar(angulo)`, que costuma ser um `el.style.transform = …`.
 * Nada disto passa pelo estado do React: re-renderizar a cerimônia 60 vezes por segundo só
 * para girar uma peça engasgaria a captura do OBS.
 *
 * Dois cuidados que valem mais que a animação:
 *
 *  1. O FIM NÃO DEPENDE DO QUADRO. Com a aba em segundo plano (OBS capturando outra janela,
 *     navegador economizando bateria) o `requestAnimationFrame` para. Por isso `freiar` também
 *     arma um `setTimeout` para o fim da freada: ele aplica o ângulo FINAL e avisa `aoParar`,
 *     com ou sem quadro desenhado. O resultado aparece mesmo que a animação nunca tenha rodado.
 *
 *  2. O TIQUE É DA FATIA, NÃO DO RELÓGIO. A cada quadro o motor vê se uma fronteira de fatia
 *     passou pelo ponteiro e avisa `aoCruzar` — o som e o ponteiro batem exatamente quando a
 *     peça passa, e espaçam sozinhos quando ela desacelera.
 */

export type Rotor = Readonly<{
  /** Começa o giro livre a partir do repouso (o ângulo atual vira a origem). */
  girar: () => void;
  /**
   * Freia até o meio de uma das fatias `indices` (de `total`) encostar no ponteiro, em
   * ~`duracaoAlvo` ms. Várias fatias valem o mesmo resultado (nos lados, as 3 fatias de um time):
   * fica a que dá a freada mais perto da duração pedida — escolha de encenação, não de resultado.
   * Devolve o plano da freada (para quem quiser sincronizar som e luz com a duração real).
   */
  freiar: (indices: readonly number[], total: number, duracaoAlvo: number) => Freio;
  /** Vai direto para a fatia (movimento reduzido ou resultado fora da animação). */
  saltar: (indice: number, total: number) => void;
  /** Para tudo onde está (fechar a cerimônia). */
  parar: () => void;
}>;

type Estado =
  | { nome: "parado"; angulo: number }
  | { nome: "livre"; origem: number; inicio: number }
  | { nome: "freio"; freio: Freio; inicio: number };

export function useRotor({
  giro,
  total,
  aplicar,
  aoCruzar,
  aoParar,
  anguloInicial = 0,
}: Readonly<{
  giro: GiroLivre;
  /** Quantas fatias o rotor tem (para o tique). */
  total: number;
  aplicar: (angulo: number) => void;
  /** Uma fronteira de fatia passou pelo ponteiro. `velocidade` em graus/ms. */
  aoCruzar?: (velocidade: number) => void;
  /** A freada terminou (chamado UMA vez por freada, com ou sem quadro desenhado). */
  aoParar?: () => void;
  /** Onde a peça descansa antes de girar (a pose da abertura). */
  anguloInicial?: number;
}>): Rotor {
  const estado = useRef<Estado>({ nome: "parado", angulo: anguloInicial });
  const quadro = useRef<number | null>(null);
  const relogioDoFim = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ultimaFatia = useRef(0);
  const ultimoAngulo = useRef(anguloInicial);

  // Os callbacks mudam a cada render do pai; o laço lê sempre os mais recentes.
  const chamadas = useRef({ aplicar, aoCruzar, aoParar, total, giro });
  useEffect(() => {
    chamadas.current = { aplicar, aoCruzar, aoParar, total, giro };
  });

  const anguloAgora = useCallback((agora: number): number => {
    const e = estado.current;
    if (e.nome === "parado") return e.angulo;
    if (e.nome === "livre") return e.origem + anguloLivre(chamadas.current.giro, agora - e.inicio);
    return anguloNoFreio(e.freio, agora - e.inicio);
  }, []);

  const velocidadeAgora = useCallback((agora: number): number => {
    const e = estado.current;
    if (e.nome === "livre") return velocidadeLivre(chamadas.current.giro, agora - e.inicio);
    if (e.nome === "freio") {
      const s = Math.min(1, Math.max(0, (agora - e.inicio) / Math.max(1, e.freio.duracao)));
      const v0 = ((e.freio.potencia + 1) * (e.freio.parada - e.freio.inicio)) / Math.max(1, e.freio.duracao);
      return v0 * Math.pow(1 - s, e.freio.potencia);
    }
    return 0;
  }, []);

  const desenhar = useCallback(
    (agora: number) => {
      const angulo = anguloAgora(agora);
      ultimoAngulo.current = angulo;
      chamadas.current.aplicar(angulo);
      const fatia = Math.floor(angulo / passoDaFatia(chamadas.current.total));
      if (fatia > ultimaFatia.current) {
        ultimaFatia.current = fatia;
        chamadas.current.aoCruzar?.(velocidadeAgora(agora));
      }
    },
    [anguloAgora, velocidadeAgora],
  );

  const pararLaco = useCallback(() => {
    if (quadro.current !== null) cancelAnimationFrame(quadro.current);
    quadro.current = null;
  }, []);

  const laco = useCallback(() => {
    pararLaco();
    const passo = (agora: number) => {
      desenhar(agora);
      if (estado.current.nome !== "parado") quadro.current = requestAnimationFrame(passo);
    };
    quadro.current = requestAnimationFrame(passo);
  }, [desenhar, pararLaco]);

  const limparFim = useCallback(() => {
    if (relogioDoFim.current !== null) clearTimeout(relogioDoFim.current);
    relogioDoFim.current = null;
  }, []);

  const girar = useCallback(() => {
    limparFim();
    const agora = performance.now();
    const origem = anguloAgora(agora);
    ultimaFatia.current = Math.floor(origem / passoDaFatia(chamadas.current.total));
    estado.current = { nome: "livre", origem, inicio: agora };
    laco();
  }, [anguloAgora, laco, limparFim]);

  const terminar = useCallback(
    (parada: number) => {
      limparFim();
      pararLaco();
      estado.current = { nome: "parado", angulo: parada };
      ultimoAngulo.current = parada;
      chamadas.current.aplicar(parada);
      chamadas.current.aoParar?.();
    },
    [limparFim, pararLaco],
  );

  const freiar = useCallback(
    (indices: readonly number[], total: number, duracaoAlvo: number): Freio => {
      const agora = performance.now();
      const giroAtual = anguloAgora(agora);
      // Rotor parado (nunca girou): freia a partir de uma velocidade de giro livre, para o
      // plano sempre ter curso. Na prática a freada sempre começa com a peça em movimento.
      const velocidade = Math.max(velocidadeAgora(agora), chamadas.current.giro.velocidade * 0.35);
      const planos = indices.map((indice) => planejarFreio({ giroAtual, velocidade, indice, total, duracaoAlvo }));
      const freio = planos.reduce((melhor, plano) =>
        Math.abs(plano.duracao - duracaoAlvo) < Math.abs(melhor.duracao - duracaoAlvo) ? plano : melhor,
      );
      estado.current = { nome: "freio", freio, inicio: agora };
      laco();
      limparFim();
      // O fim da freada não espera quadro: aba escondida também chega ao resultado.
      relogioDoFim.current = setTimeout(() => terminar(freio.parada), freio.duracao + 40);
      return freio;
    },
    [anguloAgora, laco, limparFim, terminar, velocidadeAgora],
  );

  const saltar = useCallback(
    (indice: number, total: number) => {
      const freio = planejarFreio({
        giroAtual: ultimoAngulo.current,
        velocidade: chamadas.current.giro.velocidade,
        indice,
        total,
        duracaoAlvo: 0,
        voltasMinimas: 0,
      });
      terminar(freio.parada);
    },
    [terminar],
  );

  const parar = useCallback(() => {
    limparFim();
    pararLaco();
    estado.current = { nome: "parado", angulo: ultimoAngulo.current };
  }, [limparFim, pararLaco]);

  // A pose inicial já no primeiro quadro (antes de qualquer giro).
  useEffect(() => {
    if (estado.current.nome === "parado") chamadas.current.aplicar(estado.current.angulo);
  }, []);

  // Desmontou no meio do giro (fechou a cerimônia): nada de laço nem relógio órfão.
  useEffect(
    () => () => {
      limparFim();
      pararLaco();
    },
    [limparFim, pararLaco],
  );

  return { girar, freiar, saltar, parar };
}
