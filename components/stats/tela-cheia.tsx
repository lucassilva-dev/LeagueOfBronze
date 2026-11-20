"use client";

import { useLayoutEffect, useRef, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";

import s from "./camadas.module.css";

/**
 * A TELA CHEIA — a base do holofote e do modo VS.
 *
 * É um `<dialog>` aberto com `showModal()`: o navegador o põe na camada de cima (por cima do
 * cabeçalho do site, sem briga de z-index), prende o foco dentro dele, deixa o resto da página
 * inerte e fecha no Esc. Ao fechar, o foco volta para onde estava — o rosto ou o botão que abriu.
 *
 * Abre num efeito de LAYOUT: dentro de uma View Transition a tela já tem de estar aberta quando o
 * navegador fotografa o estado novo.
 */
export function TelaCheia({
  rotulo,
  rotuloDeFechar,
  aoFechar,
  aoTeclar,
  className,
  estilo,
  inerte = false,
  children,
}: Readonly<{
  /** O nome da tela para o leitor de tela. */
  rotulo: string;
  rotuloDeFechar: string;
  aoFechar: () => void;
  /** Teclas da própria tela (setas do holofote); o Esc já é do `<dialog>`. */
  aoTeclar?: (ev: KeyboardEvent<HTMLDialogElement>) => void;
  className?: string;
  estilo?: CSSProperties;
  /** Há outra tela cheia aberta por cima desta. */
  inerte?: boolean;
  children: ReactNode;
}>) {
  const tela = useRef<HTMLDialogElement | null>(null);

  useLayoutEffect(() => {
    const el = tela.current;
    if (!el) return;
    try {
      if (!el.open) el.showModal();
    } catch {
      // Navegador sem <dialog> modal: abre como caixa comum (o CSS já a deixa de tela cheia).
      el.setAttribute("open", "");
    }
    // O foco inicial fica na PRÓPRIA tela, no topo. Deixado por conta do navegador, ele ia para
    // o primeiro link — e no celular a tela abria rolada até lá embaixo.
    el.focus({ preventScroll: true });
    el.scrollTop = 0;
    return () => {
      try {
        // Fechar ANTES de sair do documento é o que faz o navegador devolver o foco.
        el.close();
      } catch {
        /* já estava fechada */
      }
    };
  }, []);

  return (
    <dialog
      ref={tela}
      className={`${s.tela} ${className ?? ""}`}
      style={estilo}
      aria-label={rotulo}
      tabIndex={-1}
      inert={inerte}
      onCancel={(ev) => {
        // O Esc pede para fechar: quem fecha é o estado da página (a tela sai do documento).
        ev.preventDefault();
        aoFechar();
      }}
      onKeyDown={aoTeclar}
    >
      {children}
      <button type="button" className={s.fechar} onClick={aoFechar}>
        {rotuloDeFechar}
        <span className={s.fecharTecla} aria-hidden>
          ESC
        </span>
      </button>
    </dialog>
  );
}
