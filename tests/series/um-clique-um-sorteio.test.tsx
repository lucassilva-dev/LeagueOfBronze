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
    // Os nomes dos times já aparecem na abertura (a barra do confronto); o sinal de que o
    // resultado chegou é a semente, que só existe depois da resposta do servidor.
    await waitFor(() => expect(dialogo.textContent).toContain("a".repeat(32)));
    expect(dialogo.textContent).toContain("Vanguarda de Ferro");

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

describe("StrictMode (desenvolvimento): o efeito roda duas vezes, o sorteio uma", () => {
  it("em <StrictMode> um clique faz UM pedido e a encenação anda (não congela na abertura)", async () => {
    const { StrictMode } = await import("react");
    const t = times();
    render(
      <StrictMode>
        <SeriesLiveDraw seriesId="serie-15" teamA={t.a} teamB={t.b} initialCards={[]} />
      </StrictMode>,
    );
    fireEvent.click(await screen.findByRole("button", { name: /sortear lados/i }));

    const dialogo = await screen.findByRole("dialog");
    // O StrictMode monta → limpa → monta o efeito. Antes, a 2ª montagem saía cedo pela trava do
    // pedido e a cerimônia ficava parada na abertura para sempre; agora a encenação recomeça e
    // a contagem chega — com UM só POST.
    await waitFor(() => expect(dialogo.getAttribute("data-fase")).toBe("contagem"), { timeout: 4000 });
    expect(sorteios, "o StrictMode não pode dobrar o sorteio").toBe(1);
  });
});

describe("ENSAIO técnico: a cerimônia inteira sem sortear nem gravar", () => {
  it("não faz pedido ao servidor, mostra a marca do ensaio e não mexe na página", async () => {
    vi.stubGlobal("matchMedia", (consulta: string) => ({
      matches: consulta.includes("prefers-reduced-motion"),
      media: consulta,
      addEventListener: () => {},
      removeEventListener: () => {},
    }));
    desenhar();
    fireEvent.click(await screen.findByRole("button", { name: /ensaio: lados/i }));

    const dialogo = await screen.findByRole("dialog");
    expect(dialogo.textContent).toContain("ENSAIO · NADA FOI SORTEADO");
    // O resultado de demonstração chega (sem rede) e a revelação monta com o crédito do ensaio.
    await waitFor(() => expect(dialogo.textContent).toContain("ensaio técnico: nada foi sorteado nem gravado"), {
      timeout: 3000,
    });
    expect(sorteios, "o ensaio nunca chama a rota do sorteio").toBe(0);
    expect(roteador.refresh).not.toHaveBeenCalled();

    // Fechou: a arena continua "a sortear" — o ensaio não aplicou nada.
    fireEvent.click(screen.getAllByRole("button", { name: /fechar/i })[0]!);
    expect(screen.getAllByText(/a sortear/i)).toHaveLength(2);
  });
});

describe("erro honesto: «nada foi gravado» só quando a rota recusou", () => {
  /** A sessão de sempre, e o sorteio respondendo com o que o teste mandar. */
  function rotaDoSorteio(resposta: () => Response) {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (String(url).includes("/api/admin/session")) {
          return new Response(JSON.stringify({ authorized: true, user: { isMaster: true, scopes: [] } }));
        }
        if (String(url).includes("/api/admin/series/sorteio")) {
          sorteios += 1;
          return resposta();
        }
        throw new Error(`fetch inesperado: ${url}`);
      }),
    );
  }

  const SEM_CONEXAO = "O sorteio PODE ter sido gravado";

  it("gateway fora do ar (502 em HTML): PODE ter sido gravado — e a página confere ao fechar", async () => {
    rotaDoSorteio(() => new Response("<html><body>502 Bad Gateway</body></html>", { status: 502 }));
    desenhar();
    fireEvent.click(await screen.findByRole("button", { name: /sortear lados/i }));

    const dialogo = await screen.findByRole("dialog");
    await waitFor(() => expect(dialogo.getAttribute("data-fase")).toBe("erro"));
    expect(dialogo.textContent).toContain(SEM_CONEXAO);
    expect(dialogo.textContent).not.toContain("HTTP 502");

    fireEvent.click(screen.getAllByRole("button", { name: /fechar/i })[0]!);
    expect(roteador.refresh, "o servidor pode ter gravado: a página busca o estado de verdade").toHaveBeenCalledTimes(1);
  });

  it("200 com corpo ilegível (a conexão caiu no meio da resposta): o sorteio JÁ está gravado", async () => {
    rotaDoSorteio(() => new Response('{"ok":true,"sorteio":{"tipo":"la', { status: 200 }));
    desenhar();
    fireEvent.click(await screen.findByRole("button", { name: /sortear lados/i }));

    const dialogo = await screen.findByRole("dialog");
    await waitFor(() => expect(dialogo.getAttribute("data-fase")).toBe("erro"));
    expect(dialogo.textContent).toContain(SEM_CONEXAO);
  });

  it("a rota recusou com o JSON dela (409): a mensagem dela, e nada a conferir", async () => {
    rotaDoSorteio(
      () =>
        new Response(JSON.stringify({ error: "Alguém salvou o campeonato enquanto você sorteava.", conflict: true }), {
          status: 409,
        }),
    );
    desenhar();
    fireEvent.click(await screen.findByRole("button", { name: /sortear lados/i }));

    const dialogo = await screen.findByRole("dialog");
    await waitFor(() => expect(dialogo.getAttribute("data-fase")).toBe("erro"));
    expect(dialogo.textContent).toContain("Alguém salvou o campeonato enquanto você sorteava.");
    expect(dialogo.textContent).not.toContain(SEM_CONEXAO);

    fireEvent.click(screen.getAllByRole("button", { name: /fechar/i })[0]!);
    expect(roteador.refresh).not.toHaveBeenCalled();
  });
});

describe("com a cerimônia no ar, a página de baixo não recebe foco", () => {
  it("o resto do <body> fica inerte enquanto o show está aberto, e volta ao fechar", async () => {
    const tela = desenhar();
    fireEvent.click(await screen.findByRole("button", { name: /sortear lados/i }));
    await screen.findByRole("dialog");

    // Com Shift+Tab o operador chegava aos botões da arena por trás do palco.
    expect(tela.container.hasAttribute("inert")).toBe(true);

    fireEvent.click(screen.getAllByRole("button", { name: /fechar/i })[0]!);
    expect(tela.container.hasAttribute("inert")).toBe(false);
  });
});

describe("show completo com «reduzir movimento» no sistema (o Windows com efeitos desligados)", () => {
  it("o 1º sorteio depois de abrir a página já respeita o show completo salvo", async () => {
    vi.stubGlobal("matchMedia", (consulta: string) => ({
      matches: consulta.includes("prefers-reduced-motion"),
      media: consulta,
      addEventListener: () => {},
      removeEventListener: () => {},
    }));
    window.localStorage.setItem("lob-show-completo", "1");
    try {
      desenhar();
      fireEvent.click(await screen.findByRole("button", { name: /sortear lados/i }));
      const dialogo = await screen.findByRole("dialog");
      // Show completo = não é a versão calma: sem `data-reduzido`, e a encenação chega à contagem
      // (na calma ela pularia direto para o resultado).
      expect(dialogo.hasAttribute("data-reduzido")).toBe(false);
      await waitFor(() => expect(dialogo.getAttribute("data-fase")).toBe("contagem"), { timeout: 4000 });
      expect(sorteios).toBe(1);
    } finally {
      window.localStorage.removeItem("lob-show-completo");
    }
  });
});
