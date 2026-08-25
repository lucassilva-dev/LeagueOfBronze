// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * UM CLIQUE, UM SORTEIO.
 *
 * Este arquivo existe por causa de um defeito que só aparecia no banco: clicar uma vez em
 * "Sortear lados" gravava 24 sorteios em 52 segundos. Na tela nada denunciava — a cerimônia
 * girava normalmente. O que acontecia era um laço:
 *
 *   sorteio → onSorteado → router.refresh() → o servidor devolve objetos de time NOVOS
 *   (mesmos dados, outra identidade) → o `useMemo` das fatias recalculava → o efeito do
 *   sorteio via dependência nova → sorteava de novo → refresh → ...
 *
 * Cada volta sobrescrevia o lado sorteado e enchia o histórico da série de lixo. Ao vivo,
 * seria o lado azul mudando sozinho enquanto o narrador anuncia o anterior.
 *
 * O teste simula exatamente o gatilho: re-renderiza com times de MESMO conteúdo e outra
 * identidade, que é o que `router.refresh()` provoca.
 */

const roteador = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => roteador }));

const { SeriesLiveDraw } = await import("@/components/series-live-draw");

/** Times sempre novos em memória, com os mesmos dados — como o servidor devolve. */
const times = () => ({
  a: { id: "time-a", name: "Vanguarda de Ferro" },
  b: { id: "time-b", name: "Capangas do Motomoto" },
});

let sorteios = 0;

beforeEach(() => {
  sorteios = 0;
  roteador.refresh.mockReset();

  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      if (String(url).includes("/api/admin/session")) {
        return {
          ok: true,
          json: async () => ({
            authorized: true,
            user: { isMaster: true, scopes: [] },
          }),
        } as unknown as Response;
      }

      if (String(url).includes("/api/admin/series/sorteio")) {
        sorteios += 1;
        return {
          ok: true,
          status: 200,
          json: async () => ({
            ok: true,
            sorteio: {
              tipo: "lados",
              semente: "a".repeat(32),
              autor: "lucas",
              resultado: "time-a",
            },
            blueSideTeamId: "time-a",
            cardsUsed: [],
            vezes: 1,
          }),
        } as unknown as Response;
      }

      throw new Error(`fetch inesperado: ${url}`);
    }),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function desenhar() {
  const t = times();
  return render(
    <SeriesLiveDraw seriesId="serie-15" teamA={t.a} teamB={t.b} initialCards={[]} />,
  );
}

describe("clicar uma vez sorteia uma vez", () => {
  it("re-renderizar com times de outra identidade NÃO sorteia de novo", async () => {
    const tela = desenhar();

    // O botão só aparece depois de a sessão responder com os escopos.
    const botao = await screen.findByRole("button", { name: /sortear lados/i });
    fireEvent.click(botao);

    await waitFor(() => expect(sorteios).toBe(1));

    // O gatilho do defeito: `router.refresh()` devolvendo objetos novos, várias vezes.
    for (let i = 0; i < 5; i += 1) {
      const novos = times();
      tela.rerender(
        <SeriesLiveDraw
          seriesId="serie-15"
          teamA={novos.a}
          teamB={novos.b}
          initialCards={[]}
        />,
      );
    }

    // Espera de verdade: dá tempo de o efeito reexecutar, se ele for reexecutar.
    await new Promise((r) => setTimeout(r, 120));
    expect(sorteios, "um clique não pode virar mais de um registro").toBe(1);
  });

  it("o resultado é pedido ao servidor, e não decidido aqui", async () => {
    desenhar();
    fireEvent.click(await screen.findByRole("button", { name: /sortear lados/i }));

    await waitFor(() => expect(sorteios).toBe(1));

    const chamadas = (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls;
    const pedido = chamadas.find((c) => String(c[0]).includes("/sorteio"));

    // O corpo diz O QUE sortear, nunca O QUE SAIU. Mandar o resultado pronto foi o furo
    // original desta tela: dava para girar até gostar e só então gravar.
    const corpo = JSON.parse(String((pedido?.[1] as RequestInit).body)) as Record<string, unknown>;
    expect(corpo).toEqual({ seriesId: "serie-15", tipo: "lados" });
    expect(Object.keys(corpo)).not.toContain("resultado");
    expect(Object.keys(corpo)).not.toContain("blueSideTeamId");
  });

  it("dois cliques sorteiam duas vezes — refazer continua permitido", async () => {
    desenhar();

    const botao = await screen.findByRole("button", { name: /sortear lados/i });
    fireEvent.click(botao);
    await waitFor(() => expect(sorteios).toBe(1));

    // Fecha a cerimônia e clica de novo: um sorteio novo, de propósito. A trava é contra
    // repetição AUTOMÁTICA, não contra a pessoa querer sortear outra vez.
    fireEvent.click(screen.getAllByRole("button", { name: /fechar/i })[0]!);
    fireEvent.click(screen.getByRole("button", { name: /sortear lados/i }));

    await waitFor(() => expect(sorteios).toBe(2));
  });
});

describe("a cerimônia revela o resultado — e revela mesmo sem animação", () => {
  it("com movimento reduzido, o resultado aparece inteiro: lados, semente e autor", async () => {
    /*
     * Quem liga "reduzir movimento" no sistema não vê a roda girar. Isso NÃO pode custar o
     * resultado: a regra da casa é que nenhuma animação decide se o conteúdo é visível — foi
     * assim que o site já ficou em branco quatro vezes.
     *
     * Este caminho também é o que torna a revelação testável sem esperar os ~6 s de encenação.
     */
    vi.stubGlobal("matchMedia", (consulta: string) => ({
      matches: consulta.includes("prefers-reduced-motion"),
      media: consulta,
      addEventListener: () => {},
      removeEventListener: () => {},
    }));

    desenhar();
    fireEvent.click(await screen.findByRole("button", { name: /sortear lados/i }));

    const dialogo = await screen.findByRole("dialog");
    await waitFor(() => expect(dialogo.textContent).toContain("Vanguarda de Ferro"));

    // O lado sorteado, com os dois lados nomeados.
    expect(dialogo.textContent).toContain("Lado Azul");
    expect(dialogo.textContent).toContain("Lado Vermelho");

    // A procedência: sem ela, "confie em nós". Com ela, "confira você mesmo".
    expect(dialogo.textContent).toContain("semente");
    expect(dialogo.textContent).toContain("a".repeat(32));
    expect(dialogo.textContent).toContain("lucas");
  });

  it("a cerimônia cobre a tela inteira e não deixa a página vazar por baixo", async () => {
    desenhar();
    fireEvent.click(await screen.findByRole("button", { name: /sortear lados/i }));

    const dialogo = await screen.findByRole("dialog");
    expect(dialogo.getAttribute("aria-modal")).toBe("true");
    // Fundo OPACO e na faixa de cerimônia da escala de z-index do site.
    expect(dialogo.style.zIndex).toBe("9000");
    expect(dialogo.style.background).toBe("rgb(11, 8, 4)");
    expect(dialogo.style.position).toBe("fixed");
  });
});
