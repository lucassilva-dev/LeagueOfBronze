// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { Swords } from "lucide-react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AdminTournamentPanel } from "@/components/admin/admin-tournament-panel";
import { ModoCompacto } from "@/components/admin/responsivo";
import { SorteioAoVivo } from "@/components/admin/sorteio-ao-vivo";
import { ContextoIconeDaSecao, Folha } from "@/components/admin/ui";
import type { TournamentDataset } from "@/lib/schema";

/**
 * Aba Torneio e cerimônia do sorteio no CELULAR.
 *
 * O que se protege aqui não é a aparência (jsdom não mede nada), e sim o que quebrava de
 * verdade no telefone:
 *
 *  - a cerimônia nasce dentro da folha do editor de série; o Esc dela subia até a folha e
 *    fechava o EDITOR por baixo, deixando a cerimônia aberta sobre um painel diferente;
 *  - os botões de sortear têm de ficar no rodapé preso, ao alcance do polegar;
 *  - a tabela de divergências do Torneio rolava de lado numa tela de 360px.
 *
 * E o outro lado: sem o provedor (o monitor), o arranjo aprovado continua o mesmo.
 */

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

// ---------------------------------------------------------------- sorteio

const nomes: Record<string, string> = { alfa: "Alfa", beta: "Beta" };

function Cerimonia({ onFechar }: Readonly<{ onFechar: () => void }>) {
  return (
    <SorteioAoVivo
      aberto
      onFechar={onFechar}
      serieId="serie-1"
      teamAId="alfa"
      teamBId="beta"
      nomeDoTime={(id) => nomes[id] ?? id}
      corDoTime={() => "#c98a4b"}
      podeLados
      podeCartas
      onSorteado={() => {}}
    />
  );
}

describe("sorteio ao vivo no celular", () => {
  it("Esc dentro da cerimônia fecha só a cerimônia — a folha do editor embaixo fica", () => {
    const folhaFechou = vi.fn();
    const sorteioFechou = vi.fn();

    render(
      <ModoCompacto ativo>
        <Folha aberta cheia titulo="Editar série" onFechar={folhaFechou}>
          <Cerimonia onFechar={sorteioFechou} />
        </Folha>
      </ModoCompacto>,
    );

    fireEvent.keyDown(screen.getByRole("dialog", { name: "Sorteio ao vivo" }), { key: "Escape" });

    expect(sorteioFechou).toHaveBeenCalledTimes(1);
    expect(folhaFechou, "o Esc da cerimônia não pode fechar o editor").not.toHaveBeenCalled();
  });

  it("os botões de sortear moram no rodapé preso, ao alcance do polegar", () => {
    render(
      <ModoCompacto ativo>
        <Cerimonia onFechar={() => {}} />
      </ModoCompacto>,
    );

    const dialogo = screen.getByRole("dialog", { name: "Sorteio ao vivo" });
    const rodape = dialogo.querySelector("footer");
    expect(rodape, "no celular as ações ficam num rodapé fixo").not.toBeNull();

    const noRodape = within(rodape as HTMLElement);
    expect(noRodape.getByRole("button", { name: /sortear lados/i })).toBeTruthy();
    expect(noRodape.getByRole("button", { name: /sortear carta.*alfa/i })).toBeTruthy();
    expect(noRodape.getByRole("button", { name: /sortear carta.*beta/i })).toBeTruthy();
    expect(noRodape.getByRole("button", { name: /sorteio duplo/i })).toBeTruthy();
  });

  it("fechar devolve o foco ao botão que abriu a cerimônia", () => {
    function Harness() {
      const [aberto, setAberto] = useState(false);
      return (
        <ModoCompacto ativo>
          <button type="button" onClick={() => setAberto(true)}>
            Sortear ao vivo
          </button>
          {aberto ? <Cerimonia onFechar={() => setAberto(false)} /> : null}
        </ModoCompacto>
      );
    }
    render(<Harness />);

    const abrir = screen.getByRole("button", { name: "Sortear ao vivo" });
    abrir.focus();
    fireEvent.click(abrir);
    expect(document.activeElement).toBe(screen.getByRole("dialog", { name: "Sorteio ao vivo" }));

    fireEvent.click(screen.getByRole("button", { name: "Fechar" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement, "o foco não pode cair no <body>").toBe(abrir);
  });
});

describe("sorteio ao vivo no monitor", () => {
  it("o cabeçalho tem o selo do sorteio, e não as espadas herdadas da aba Séries", () => {
    render(
      <ContextoIconeDaSecao.Provider value={Swords}>
        <Cerimonia onFechar={() => {}} />
      </ContextoIconeDaSecao.Provider>,
    );

    const dialogo = screen.getByRole("dialog", { name: "Sorteio ao vivo" });
    expect(dialogo.querySelector(".lucide-swords")).toBeNull();
    expect(dialogo.querySelector(".lucide-dices")).not.toBeNull();
  });

  it("o arranjo aprovado continua: sem rodapé preso, Esc fecha e a cobertura é a de sempre", () => {
    const sorteioFechou = vi.fn();
    render(<Cerimonia onFechar={sorteioFechou} />);

    const dialogo = screen.getByRole("dialog", { name: "Sorteio ao vivo" });
    expect(dialogo.querySelector("footer")).toBeNull();
    expect(dialogo.style.zIndex).toBe("9000");
    expect(dialogo.style.position).toBe("fixed");

    fireEvent.keyDown(dialogo, { key: "Escape" });
    expect(sorteioFechou).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------- torneio

function dataset(nome: string): TournamentDataset {
  return {
    tournament: {
      name: nome,
      lastUpdatedISO: "2026-10-20T00:00:00.000Z",
      seriesPointsRule: { win: 3, loss: 0 },
      format: "BO3",
      status: "active",
    },
    archivedSeasons: [],
    teams: [
      { id: "alfa", name: "Alfa", slug: "alfa" },
      { id: "beta", name: "Beta", slug: "beta" },
    ],
    players: [],
    seriesMatches: [],
    standingsSeed: [],
  };
}

/** O servidor responde com um dataset de OUTRO nome: o painel tem de acusar a divergência. */
function servidorComOutroNome() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      if (String(url).includes("/api/admin/dataset")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ dataset: dataset("3ª Edição (gravada)") }),
        } as unknown as Response;
      }
      throw new Error(`fetch inesperado: ${url}`);
    }),
  );
}

function Painel() {
  return (
    <AdminTournamentPanel
      draft={dataset("4ª Edição (na tela)")}
      isBusy={false}
      onEndTournament={() => {}}
      onStartTournament={() => {}}
    />
  );
}

describe("aba Torneio", () => {
  it("no celular, as divergências viram lista com «gravado» e «na tela» — sem tabela que rola de lado", async () => {
    servidorComOutroNome();
    render(
      <ModoCompacto ativo>
        <Painel />
      </ModoCompacto>,
    );

    const titulo = await screen.findByText("O rascunho na tela está diferente do que está gravado");
    const aviso = titulo.closest<HTMLElement>('[role="alert"]');
    if (!aviso) throw new Error("o aviso de divergência sumiu");

    expect(document.querySelector("table"), "tabela larga não cabe em 360px").toBeNull();
    const lista = within(aviso);
    expect(lista.getByText("Gravado")).toBeTruthy();
    expect(lista.getByText("Na tela")).toBeTruthy();
    expect(lista.getByText("3ª Edição (gravada)")).toBeTruthy();
    expect(lista.getByText("4ª Edição (na tela)")).toBeTruthy();
  });

  it("no monitor, a tabela de divergências continua a mesma", async () => {
    servidorComOutroNome();
    render(<Painel />);

    await screen.findByText("O rascunho na tela está diferente do que está gravado");
    const tabela = document.querySelector("table");
    expect(tabela).not.toBeNull();
    expect(within(tabela as HTMLElement).getByText("3ª Edição (gravada)")).toBeTruthy();
  });
});
