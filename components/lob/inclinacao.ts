"use client";

import { useCallback, useRef } from "react";

/**
 * A INCLINAÇÃO 3D DAS CARTAS — o motor que era só do `TcgCard` (/cartas) e agora é das duas
 * famílias de carta do site: as cartinhas de regra e as cartas holográficas de jogador (/stats).
 *
 * Um ouvinte só, por delegação: todo `[data-inclina]` dentro da raiz inclina sozinho. O motor não
 * escreve `transform` — escreve VARIÁVEIS no elemento, e o CSS de cada carta decide o que fazer
 * com elas:
 *
 *   --ry / --rx   rotação em graus (o valor de `data-inclina` é a amplitude de ponta a ponta)
 *   --px / --py   a posição do ponteiro na carta, de −0,5 a 0,5 (parallax da arte)
 *   --bx / --by   a mesma posição em % (onde o brilho e o foil se concentram)
 *   [data-inclinando]  presente enquanto o ponteiro está em cima (transição curta; ao sair, a
 *                      carta volta devagar ao repouso)
 *
 * Só mouse e caneta: no toque a carta fica parada (o dedo cobre a carta, e inclinar junto com a
 * rolagem enjoa). Com movimento reduzido o motor nem liga.
 */

const AMPLITUDE_PADRAO = 18;

function soltar(el: HTMLElement) {
  delete el.dataset.inclinando;
  for (const nome of ["--ry", "--rx", "--px", "--py", "--bx", "--by"]) el.style.removeProperty(nome);
}

/** Liga a inclinação em todo `[data-inclina]` de `raiz` (inclusive ela mesma). Devolve o desligar. */
export function ligarInclinacao(raiz: HTMLElement): () => void {
  if (typeof window === "undefined") return () => {};
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return () => {};

  let atual: HTMLElement | null = null;

  const mover = (ev: PointerEvent) => {
    if (ev.pointerType === "touch") return;
    const alvo = ev.target instanceof Element ? ev.target.closest<HTMLElement>("[data-inclina]") : null;
    if (alvo !== atual) {
      if (atual) soltar(atual);
      atual = alvo && raiz.contains(alvo) ? alvo : null;
      if (atual) atual.dataset.inclinando = "1";
    }
    if (!atual) return;
    const r = atual.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const px = Math.max(-0.5, Math.min(0.5, (ev.clientX - r.left) / r.width - 0.5));
    const py = Math.max(-0.5, Math.min(0.5, (ev.clientY - r.top) / r.height - 0.5));
    const amplitude = Number(atual.dataset.inclina) || AMPLITUDE_PADRAO;
    const st = atual.style;
    st.setProperty("--ry", `${(px * amplitude).toFixed(2)}deg`);
    st.setProperty("--rx", `${(-py * amplitude).toFixed(2)}deg`);
    st.setProperty("--px", px.toFixed(3));
    st.setProperty("--py", py.toFixed(3));
    st.setProperty("--bx", `${((px + 0.5) * 100).toFixed(1)}%`);
    st.setProperty("--by", `${((py + 0.5) * 100).toFixed(1)}%`);
  };

  const sair = () => {
    if (atual) soltar(atual);
    atual = null;
  };

  raiz.addEventListener("pointermove", mover, { passive: true });
  raiz.addEventListener("pointerleave", sair);
  return () => {
    raiz.removeEventListener("pointermove", mover);
    raiz.removeEventListener("pointerleave", sair);
    sair();
  };
}

/**
 * Para uma carta sozinha (sem uma raiz que delegue): devolve o `ref` do elemento que tem
 * `data-inclina`. É o que o `TcgCard` usa em /cartas.
 */
export function useInclinacao<T extends HTMLElement>(): (el: T | null) => void {
  const desligar = useRef<(() => void) | null>(null);
  return useCallback((el: T | null) => {
    desligar.current?.();
    desligar.current = el ? ligarInclinacao(el) : null;
  }, []);
}
