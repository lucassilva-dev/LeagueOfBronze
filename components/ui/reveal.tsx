"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

type RevealProps = Readonly<{
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}>;

/**
 * Dispara a entrada na primeira vez que o elemento entra em vista.
 *
 * ANIMA SÓ `transform`, NUNCA `opacity` — e isso não é preferência de estilo.
 *
 * `initial={{ opacity: 0 }}` num componente com framer-motion é renderizado NO
 * SERVIDOR como `style="opacity:0"`. Se a animação não chega a rodar (aba em segundo
 * plano no carregamento, pintura suspensa pelo navegador, JavaScript que não
 * executa), o conteúdo nunca aparece. Esse mesmo padrão já apagou páginas inteiras
 * deste site QUATRO vezes — `.lob-fade` três vezes e `page-shell.tsx` uma, esta
 * última deixando 7 rotas e a página 404 totalmente em branco sem JavaScript.
 *
 * `page-shell.tsx` e `.lob-fade` hoje animam só transform, pelo mesmo motivo. O
 * estado de repouso tem de ser o VISÍVEL: na pior das hipóteses o conteúdo aparece
 * sem o efeito — nunca some.
 */
export function Reveal({ children, delay = 0, y = 20, className }: RevealProps) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { y }}
      whileInView={{ y: 0 }}
      viewport={{ once: true, margin: "-12%" }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay }}
    >
      {children}
    </motion.div>
  );
}
