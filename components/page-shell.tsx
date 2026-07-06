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
      initial={reduce ? false : { opacity: 0, y: 14, filter: "blur(7px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
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
