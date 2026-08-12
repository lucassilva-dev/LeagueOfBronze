"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

export function PageShell({
  children,
  className,
}: Readonly<{
  children: ReactNode;
  className?: string;
}>) {
  const pathname = usePathname();
  const reduce = useReducedMotion();

  return (
    <motion.main
      key={pathname}
      // ⚠ SÓ DESLOCAMENTO. Nada de opacidade nem de blur aqui.
      //
      // `initial` é renderizado NO SERVIDOR: com opacidade 0 e blur, o HTML saía como
      // <main style="opacity:0;filter:blur(7px)"> e o conteúdo destas rotas (mais o do
      // 404) ficava 100% invisível para quem não executa o JavaScript — leitor sem JS,
      // rastreador, e principalmente qualquer situação em que a CSP bloqueie o script.
      // É o mesmo tropeço que já apagou a página três vezes neste projeto; o
      // `.lob-fade` em globals.css foi corrigido do mesmo jeito, animando só transform.
      initial={reduce ? false : { y: 14 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.34, ease: [0.2, 0.8, 0.2, 1] }}
      className={cn(
        "mx-auto min-h-screen max-w-[1160px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8",
        className,
      )}
    >
      {children}
    </motion.main>
  );
}
