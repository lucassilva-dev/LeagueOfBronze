"use client";

import { useEffect, useRef } from "react";
import { animate, useInView, useReducedMotion } from "framer-motion";

type CounterProps = Readonly<{
  to: number;
  duration?: number;
  decimals?: number;
  className?: string;
}>;

const formatar = (valor: number, decimals: number) =>
  valor.toLocaleString("pt-BR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

/**
 * Rola 0 -> to ao entrar em vista. Formatação pt-BR, tabular-nums = sem layout shift.
 *
 * O ESTADO DE REPOUSO É O VALOR FINAL, e não "0". Antes o JSX trazia `0` fixo e só o
 * efeito escrevia o número certo: sem JavaScript — ou se o efeito não chegasse a rodar
 * — TODO contador do site mostrava zero, incluindo o placar da Grande Final, que
 * aparecia como "0 - 0" para quem lesse a página sem script.
 *
 * É a mesma regra que vale para as animações daqui: o repouso tem de ser o estado
 * CORRETO, e a animação só enfeite. Na pior das hipóteses o número aparece sem rolar
 * — nunca aparece errado.
 *
 * Hidratação: servidor e cliente formatam o mesmo `to` pela mesma função pura, então o
 * texto bate; o efeito só mexe em `textContent` depois de montado.
 *
 * Fallback por setTimeout garante o valor final mesmo se o rAF não rodar (aba em 2º plano).
 */
export function AnimatedCounter({ to, duration = 1.2, decimals = 0, className }: CounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10%" });
  const reduce = useReducedMotion();

  /*
   * O zero de partida é escrito ANTES de o elemento entrar em vista.
   *
   * Como o repouso agora é o valor final (para a página funcionar sem JavaScript), animar
   * de 0 no momento em que o elemento aparece faria o número já visível CAIR para zero e
   * subir de novo — um piscar para trás bem no instante em que a pessoa olha.
   *
   * Zerar enquanto ainda está fora de vista resolve: a queda acontece onde ninguém vê, e
   * a contagem sobe quando entra na tela. Quem já está com o elemento em vista na
   * montagem (o contador do topo da página) não anima: fica no valor certo, que é melhor
   * do que um piscar.
   */
  const zerado = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduce) return;

    /*
     * "Está fora de vista?" é MEDIDO, não deduzido de `inView`.
     *
     * `useInView` começa falso e só vira verdadeiro quando o IntersectionObserver entrega
     * a primeira observação — o que acontece DEPOIS deste efeito. Confiar nele aqui fazia
     * todo contador ser zerado na montagem, inclusive os que já estão na tela: o placar da
     * Grande Final, acima da dobra, aparecia certo no HTML do servidor, virava "0 - 0" na
     * hidratação e só então subia. Era exatamente o piscar para trás que o valor de
     * repouso correto existe para evitar.
     *
     * Medindo o retângulo, quem já está visível nunca é zerado — e a guarda de
     * `zerado.current` abaixo passa a valer de verdade: esse fica no número certo, sem
     * animar, que é melhor do que piscar.
     */
    const r = el.getBoundingClientRect();
    const foraDeVista =
      r.bottom <= window.innerHeight * 0.1 ||
      r.top >= window.innerHeight * 0.9 ||
      r.right <= 0 ||
      r.left >= window.innerWidth;

    if (!foraDeVista) return;
    el.textContent = formatar(0, decimals);
    zerado.current = true;
  }, [inView, reduce, decimals]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fmt = (v: number) => formatar(v, decimals);

    if (reduce) {
      el.textContent = fmt(to);
      return;
    }
    if (!inView) return;

    // Nunca esteve fora de vista: já está mostrando o valor certo, não há de onde subir.
    if (!zerado.current) {
      el.textContent = fmt(to);
      return;
    }

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
      {formatar(to, decimals)}
    </span>
  );
}
