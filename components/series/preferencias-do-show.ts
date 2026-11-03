"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

/**
 * AS PREFERÊNCIAS DO OPERADOR DO SHOW — volume, show completo com movimento reduzido, tela cheia.
 *
 * Ficam no `localStorage` do navegador de quem conduz a transmissão: são conveniência de UMA
 * máquina (o volume que combina com o OBS dela), nunca estado do campeonato. Toda leitura e
 * escrita é embrulhada — aba anônima, armazenamento bloqueado ou cheio só fazem a preferência
 * voltar ao padrão; o show nunca quebra por isso.
 */

const CHAVE_VOLUME = "lob-show-volume";
const CHAVE_SHOW_COMPLETO = "lob-show-completo";

/** Os degraus do botão de volume: mudo, baixo, médio, alto. */
export const DEGRAUS_DE_VOLUME = [0, 0.35, 0.65, 1] as const;

function ler(chave: string): string | null {
  try {
    return window.localStorage.getItem(chave);
  } catch {
    return null;
  }
}

function gravar(chave: string, valor: string) {
  try {
    window.localStorage.setItem(chave, valor);
  } catch {
    /* sem armazenamento: vale só nesta abertura */
  }
}

/**
 * O degrau de volume salvo (índice em DEGRAUS_DE_VOLUME); o padrão é o médio. Devolve também
 * `proximo` (o botão: mudo → baixo → médio → alto → mudo) e `alternarMudo` (a tecla M, que
 * volta para o último volume audível).
 */
export function useVolumeDoShow(): readonly [number, () => void, () => void] {
  const [degrau, setDegrau] = useState(2);
  const [ultimoAudivel, setUltimoAudivel] = useState(2);
  useEffect(() => {
    const texto = ler(CHAVE_VOLUME);
    // `Number(null)` é 0 (mudo): sem nada salvo, fica o padrão — nunca o show começar mudo.
    const salvo = texto === null || texto === "" ? Number.NaN : Number(texto);
    // Lido depois de montar: no servidor não existe localStorage, e ler no render quebraria a
    // hidratação. O primeiro quadro usa o padrão — a cerimônia só abre por clique, bem depois.
    if (Number.isInteger(salvo) && salvo >= 0 && salvo < DEGRAUS_DE_VOLUME.length) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDegrau(salvo);
      if (salvo > 0) setUltimoAudivel(salvo);
    }
  }, []);
  const definir = useCallback((novo: number) => {
    setDegrau(novo);
    if (novo > 0) setUltimoAudivel(novo);
    gravar(CHAVE_VOLUME, String(novo));
  }, []);
  const proximo = useCallback(() => definir((degrau + 1) % DEGRAUS_DE_VOLUME.length), [definir, degrau]);
  const alternarMudo = useCallback(() => definir(degrau === 0 ? ultimoAudivel : 0), [definir, degrau, ultimoAudivel]);
  return [degrau, proximo, alternarMudo] as const;
}

/**
 * O SISTEMA pede movimento reduzido? (`prefers-reduced-motion`.)
 *
 * No Windows, "Efeitos de animação" desligado liga essa preferência no Chrome — e muita gente
 * desliga por desempenho. Respeitar às cegas mataria o show ao vivo no computador da
 * organização sem ninguém entender por quê; por isso a cerimônia mostra o aviso e oferece o
 * "show completo" (abaixo), que fica lembrado neste navegador.
 */
export function useMovimentoReduzidoDoSistema(): boolean {
  return useSyncExternalStore(
    (avisar) => {
      const consulta = window.matchMedia?.("(prefers-reduced-motion: reduce)");
      consulta?.addEventListener?.("change", avisar);
      return () => consulta?.removeEventListener?.("change", avisar);
    },
    () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true,
    () => false,
  );
}

/** O operador pediu o show completo mesmo com movimento reduzido no sistema. */
export function useShowCompleto(): readonly [boolean, (v: boolean) => void] {
  const [ligado, setLigado] = useState(false);
  useEffect(() => {
    // Mesmo motivo do volume: localStorage só existe no navegador, depois de montar.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (ler(CHAVE_SHOW_COMPLETO) === "1") setLigado(true);
  }, []);
  const definir = useCallback((v: boolean) => {
    setLigado(v);
    gravar(CHAVE_SHOW_COMPLETO, v ? "1" : "0");
  }, []);
  return [ligado, definir] as const;
}

type ComWebkit = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
};
type ElementoComWebkit = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void };

function elementoEmTelaCheia(): Element | null {
  const d = document as ComWebkit;
  return d.fullscreenElement ?? d.webkitFullscreenElement ?? null;
}

/** Keyboard Lock (Chrome/Edge): fora do lib.dom do TypeScript. */
type TecladoTravavel = { lock?: (teclas?: string[]) => Promise<void>; unlock?: () => void };
function teclado(): TecladoTravavel | undefined {
  return (navigator as Navigator & { keyboard?: TecladoTravavel }).keyboard;
}

/**
 * Este navegador deixa a página ficar com o Esc na tela cheia (Chrome/Edge). Sem isso, o 1º Esc
 * do operador derruba a tela cheia — e a live mostra a barra de endereço — em vez de fechar.
 */
export function podePrenderEsc(): boolean {
  return typeof navigator !== "undefined" && typeof teclado()?.lock === "function";
}

/**
 * Tela cheia do navegador (a página inteira), para o OBS capturar sem barra de endereço.
 * É a página inteira de propósito: a cerimônia é uma camada fixa por cima dela, e pôr só um
 * pedaço em tela cheia esconderia a cerimônia.
 */
export function useTelaCheia(): readonly [boolean, () => void] {
  const ativa = useSyncExternalStore(
    (avisar) => {
      document.addEventListener("fullscreenchange", avisar);
      document.addEventListener("webkitfullscreenchange", avisar);
      return () => {
        document.removeEventListener("fullscreenchange", avisar);
        document.removeEventListener("webkitfullscreenchange", avisar);
      };
    },
    () => elementoEmTelaCheia() !== null,
    () => false,
  );
  const alternar = useCallback(() => {
    try {
      if (elementoEmTelaCheia()) {
        const d = document as ComWebkit;
        teclado()?.unlock?.();
        void (d.exitFullscreen?.() ?? d.webkitExitFullscreen?.());
      } else {
        const raiz = document.documentElement as ElementoComWebkit;
        const pedido = raiz.requestFullscreen?.() ?? raiz.webkitRequestFullscreen?.();
        // Com o Esc preso, Esc fecha a cerimônia e só SEGURAR o Esc sai da tela cheia.
        void Promise.resolve(pedido)
          .then(() => teclado()?.lock?.(["Escape"]))
          .catch(() => {});
      }
    } catch {
      /* navegador sem tela cheia (iPhone): o show segue na janela */
    }
  }, []);
  return [ativa, alternar] as const;
}
