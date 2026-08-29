// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import { AnimatedCounter } from "@/components/ui/animated-counter";

/**
 * O CONTADOR NUNCA PODE PISCAR PARA TRÁS.
 *
 * O valor de repouso é o número final — é o que faz o placar da Grande Final aparecer certo
 * no HTML do servidor, sem depender de JavaScript. A animação sobe de 0 até ele.
 *
 * A armadilha, que já entrou duas vezes: `useInView` começa FALSO e só vira verdadeiro
 * quando o IntersectionObserver entrega a primeira observação — depois do efeito. Quem
 * tratasse esse `false` inicial como "está fora de vista" zerava TODO contador na
 * montagem, inclusive os que já estão na tela: o número certo virava "0" na hidratação e só
 * então subia de novo.
 *
 * Por isso "fora de vista" é MEDIDO com `getBoundingClientRect`, e por isso este teste
 * NUNCA dispara o observador antes de asserir — disparar mediria a coisa errada e passaria
 * verde com o defeito dentro.
 */

function comObservadorMudo() {
  // Um IntersectionObserver que registra e nunca chama o callback: reproduz a janela real
  // entre a montagem e a primeira entrega do observador.
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return [];
      }
    },
  );
}

function comRetangulo(rect: Partial<DOMRect>) {
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue({
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    width: 0,
    height: 0,
    x: 0,
    y: 0,
    toJSON: () => ({}),
    ...rect,
  } as DOMRect);
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("contador animado", () => {
  it("já visível na montagem: fica no valor certo, sem passar por zero", () => {
    comObservadorMudo();
    // Um retângulo DENTRO da viewport (jsdom: 768×1024 por padrão).
    comRetangulo({ top: 100, bottom: 140, left: 10, right: 80, width: 70, height: 40 });

    render(<AnimatedCounter to={30} />);

    expect(screen.getByText("30")).toBeTruthy();
  });

  it("renderiza o valor final mesmo sem nenhum efeito de animação rodar", () => {
    // O ponto do valor de repouso: sem JavaScript, o número correto é o que está no HTML.
    comObservadorMudo();
    comRetangulo({ top: 200, bottom: 240, left: 10, right: 80, width: 70, height: 40 });

    render(<AnimatedCounter to={7} decimals={2} />);

    expect(screen.getByText("7,00")).toBeTruthy();
  });

  it("fora da viewport: zera para poder subir quando entrar em vista", () => {
    // A queda acontece onde ninguém vê — é o que permite a contagem existir sem piscar.
    comObservadorMudo();
    comRetangulo({ top: 5000, bottom: 5040, left: 10, right: 80, width: 70, height: 40 });

    render(<AnimatedCounter to={30} />);

    expect(screen.getByText("0")).toBeTruthy();
  });
});
