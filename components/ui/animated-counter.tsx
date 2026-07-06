"use client";

import { useEffect, useRef } from "react";
import { animate, useInView, useReducedMotion } from "framer-motion";

type CounterProps = Readonly<{
  to: number;
  duration?: number;
  decimals?: number;
  className?: string;
}>;

// Rola 0 -> to ao entrar em vista. Formatação pt-BR, tabular-nums = sem layout shift.
// Fallback por setTimeout garante o valor final mesmo se o rAF não rodar (aba em 2º plano).
export function AnimatedCounter({ to, duration = 1.2, decimals = 0, className }: CounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10%" });
  const reduce = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fmt = (v: number) =>
      v.toLocaleString("pt-BR", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });

    if (reduce) {
      el.textContent = fmt(to);
      return;
    }
    if (!inView) return;

    const controls = animate(0, to, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => {
        el.textContent = fmt(v);
      },
    });

    // Se a aba estiver em segundo plano, o rAF não avança: garante o valor final.
    const fallback = setTimeout(() => {
      el.textContent = fmt(to);
    }, duration * 1000 + 120);

    return () => {
      controls.stop();
      clearTimeout(fallback);
    };
  }, [inView, to, duration, decimals, reduce]);

  return (
    <span ref={ref} className={className} style={{ fontVariantNumeric: "tabular-nums" }}>
      0
    </span>
  );
}
