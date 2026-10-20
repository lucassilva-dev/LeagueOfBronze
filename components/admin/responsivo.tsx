"use client";

import { createContext, useContext, useSyncExternalStore, type ReactNode } from "react";

/**
 * Modo COMPACTO do painel — o celular.
 *
 * Uma fonte só para o painel inteiro decidir entre o arranjo de mesa (trilho lateral,
 * tabelas largas) e o de bolso (doca embaixo, cartões no lugar de tabela, alvos de dedo).
 *
 * Por que contexto e não uma media query em cada componente:
 *  - estilo em objeto não tem `@media`, e o painel inteiro é estilo em objeto;
 *  - um `matchMedia` por botão seriam centenas de ouvintes para a mesma pergunta;
 *  - quem renderiza FORA do provedor (os testes em jsdom, que não têm `matchMedia`)
 *    cai no arranjo de mesa, que é o que os testes já conhecem.
 *
 * O corte é o mesmo de antes (900px): abaixo dele o trilho lateral não cabia ao lado do
 * conteúdo e já virava faixa.
 */
export const LARGURA_COMPACTA = 900;
const CONSULTA = `(max-width: ${LARGURA_COMPACTA - 0.02}px)`;

function assinar(avisar: () => void) {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return () => {};
  const consulta = window.matchMedia(CONSULTA);
  consulta.addEventListener("change", avisar);
  return () => consulta.removeEventListener("change", avisar);
}

function lerAgora() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia(CONSULTA).matches;
}

/** No servidor e no primeiro quadro da hidratação, mesa — o painel só monta depois da sessão. */
function lerNoServidor() {
  return false;
}

/** Lê a largura da janela. Use só no provedor; o resto do painel lê `useCompacto()`. */
export function useLarguraCompacta(): boolean {
  return useSyncExternalStore(assinar, lerAgora, lerNoServidor);
}

const ContextoCompacto = createContext(false);

export function CompactoProvider({ children }: Readonly<{ children: ReactNode }>) {
  const compacto = useLarguraCompacta();
  return <ContextoCompacto.Provider value={compacto}>{children}</ContextoCompacto.Provider>;
}

/** Verdadeiro no celular (abaixo de 900px), dentro do painel. Fora do provedor: falso. */
export function useCompacto(): boolean {
  return useContext(ContextoCompacto);
}

/**
 * Força um modo para o que vier dentro — para testes que precisam exercitar o arranjo de
 * bolso sem `matchMedia`.
 */
export function ModoCompacto({ ativo, children }: Readonly<{ ativo: boolean; children: ReactNode }>) {
  return <ContextoCompacto.Provider value={ativo}>{children}</ContextoCompacto.Provider>;
}
