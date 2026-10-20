// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { useState, type ComponentType } from "react";
import { afterEach, describe, expect, it } from "vitest";

import { AdminOverviewPanel } from "@/components/admin/admin-overview-panel";
import { AdminPlayersPanel } from "@/components/admin/admin-players-panel";
import { AdminTeamsPanel } from "@/components/admin/admin-teams-panel";
import { ModoCompacto } from "@/components/admin/responsivo";
import type { MutateDraft } from "@/components/admin/shared";
import type { TournamentDataset } from "@/lib/schema";

/**
 * Cadastro (Visão geral, Times, Jogadores) no celular.
 *
 * O painel foi montado para o monitor: no celular a classificação empurrava a página para
 * ~518px numa tela de 390px, e Times/Jogadores empilhavam lista e formulário — o "Salvar"
 * ficava duas telas abaixo de onde a pessoa tocou. Aqui o editor abre numa folha, e fechá-la
 * com edição pendente pergunta antes, como trocar de time sempre perguntou.
 *
 * Os testes de fora do provedor (sem `ModoCompacto`) continuam vendo o arranjo de mesa.
 */

afterEach(cleanup);

function dataset(): TournamentDataset {
  return {
    tournament: {
      name: "4ª Edição",
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
    players: [
      { id: "p1", nick: "Fulano", slug: "fulano", teamId: "alfa", role1: "MID", role2: "TOP", elo: "OURO" },
      { id: "p2", nick: "Ciclano", slug: "ciclano", teamId: "beta", role1: "JUNG", elo: "MESTRE" },
    ],
    seriesMatches: [],
    standingsSeed: [],
  };
}

type Painel = ComponentType<{
  draft: TournamentDataset;
  mutateDraft: MutateDraft;
  onSujoChange?: (sujo: boolean) => void;
}>;

/** O painel com o rascunho num estado de verdade; `sujos` guarda cada aviso de formulário sujo. */
function montar(Componente: Painel, compacto: boolean) {
  const sujos: boolean[] = [];
  function Harness() {
    const [draft, setDraft] = useState(dataset);
    const mutate: MutateDraft = (recipe) =>
      setDraft((atual) => {
        const proximo = structuredClone(atual);
        recipe(proximo);
        return proximo;
      });
    return <Componente draft={draft} mutateDraft={mutate} onSujoChange={(s) => sujos.push(s)} />;
  }
  render(
    <ModoCompacto ativo={compacto}>
      <Harness />
    </ModoCompacto>,
  );
  return { ultimoSujo: () => sujos.at(-1) };
}

describe("Visão geral", () => {
  it("abre com o cabeçalho de seção, no celular e no monitor, como as outras abas", () => {
    render(
      <ModoCompacto ativo>
        <AdminOverviewPanel draft={dataset()} />
      </ModoCompacto>,
    );
    expect(screen.getByRole("heading", { level: 2, name: "Visão geral" })).toBeTruthy();
    cleanup();

    render(<AdminOverviewPanel draft={dataset()} />);
    expect(screen.getByRole("heading", { level: 2, name: "Visão geral" })).toBeTruthy();
  });

  it("no celular a classificação não tem piso de largura e as métricas vão em duas colunas", () => {
    const { container } = render(
      <ModoCompacto ativo>
        <AdminOverviewPanel draft={dataset()} />
      </ModoCompacto>,
    );
    const tabela = container.querySelector("table")!;
    expect(tabela.style.minWidth).toBe("");
    const grades = Array.from(container.querySelectorAll<HTMLElement>("div")).map((d) => d.style.gridTemplateColumns);
    expect(grades).toContain("repeat(2, minmax(0, 1fr))");
  });

  it("no monitor a tabela segue com o piso de 480px dentro da rolagem", () => {
    const { container } = render(<AdminOverviewPanel draft={dataset()} />);
    expect(container.querySelector("table")!.style.minWidth).toBe("480px");
  });
});

describe("Times no celular", () => {
  it("lista na página; o editor só existe na folha, aberta pelo cartão", () => {
    montar(AdminTeamsPanel, true);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.queryByRole("button", { name: "Salvar no rascunho" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Editar Alfa" }));
    const folha = screen.getByRole("dialog", { name: "Editar time" });
    expect((within(folha).getByLabelText("Nome") as HTMLInputElement).value).toBe("Alfa");
    expect(within(folha).getByRole("button", { name: "Salvar no rascunho" })).toBeTruthy();
  });

  it("fechar com edição pendente pergunta; descartar volta ao que estava salvo", () => {
    const { ultimoSujo } = montar(AdminTeamsPanel, true);
    fireEvent.click(screen.getByRole("button", { name: "Editar Alfa" }));
    let folha = screen.getByRole("dialog");
    fireEvent.change(within(folha).getByLabelText("Nome"), { target: { value: "Alfa FC" } });
    expect(ultimoSujo()).toBe(true);

    // O X não fecha calado: o rodapé vira a pergunta.
    fireEvent.click(within(folha).getByRole("button", { name: "Fechar o editor" }));
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(within(folha).getByRole("alert").textContent).toContain("joga fora o que foi digitado em Alfa");

    // "Continuar editando" mantém o que foi digitado.
    fireEvent.click(within(folha).getByRole("button", { name: "Continuar editando" }));
    expect((within(folha).getByLabelText("Nome") as HTMLInputElement).value).toBe("Alfa FC");

    // Esc também pergunta (a folha manda o Esc para o mesmo lugar do X).
    fireEvent.keyDown(folha, { key: "Escape" });
    fireEvent.click(within(folha).getByRole("button", { name: "Descartar" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(ultimoSujo()).toBe(false);

    fireEvent.click(screen.getByRole("button", { name: "Editar Alfa" }));
    folha = screen.getByRole("dialog");
    expect((within(folha).getByLabelText("Nome") as HTMLInputElement).value).toBe("Alfa");
  });

  it("salvar pelo rodapé grava no rascunho e a lista acompanha", () => {
    montar(AdminTeamsPanel, true);
    fireEvent.click(screen.getByRole("button", { name: "Editar Alfa" }));
    const folha = screen.getByRole("dialog");
    fireEvent.change(within(folha).getByLabelText("Nome"), { target: { value: "Alfa FC" } });
    fireEvent.click(within(folha).getByRole("button", { name: "Salvar no rascunho" }));

    // Salvo, fecha sem perguntar.
    expect(within(folha).getByText("Em dia com o rascunho")).toBeTruthy();
    fireEvent.click(within(folha).getByRole("button", { name: "Fechar o editor" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("button", { name: "Editar Alfa FC" })).toBeTruthy();
  });

  it("excluir pelo rodapé mostra o estrago e fecha a folha depois", () => {
    montar(AdminTeamsPanel, true);
    fireEvent.click(screen.getByRole("button", { name: "Editar Beta" }));
    const folha = screen.getByRole("dialog");
    fireEvent.click(within(folha).getByRole("button", { name: "Excluir time" }));
    fireEvent.click(within(folha).getByRole("button", { name: "Excluir definitivamente" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.queryByRole("button", { name: "Editar Beta" })).toBeNull();
  });
});

describe("Jogadores", () => {
  it("no celular: cartão com o emblema do elo e editor na folha com o emblema da escolha", () => {
    montar(AdminPlayersPanel, true);
    const cartao = screen.getByRole("button", { name: "Editar Fulano" }).closest(".adm-cartao") as HTMLElement;
    expect(within(cartao).getByRole("img", { name: "Ouro" })).toBeTruthy();
    // O nome do elo não aparece escrito: é o emblema.
    expect(within(cartao).queryByText("Ouro")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Editar Fulano" }));
    const folha = screen.getByRole("dialog", { name: "Editar jogador" });
    const elo = within(folha).getByLabelText("Elo") as HTMLSelectElement;
    expect(elo.value).toBe("OURO");
    fireEvent.change(elo, { target: { value: "MESTRE" } });
    expect(within(folha).getAllByRole("img", { name: "Mestre" }).length).toBeGreaterThan(0);
  });

  it("no celular o filtro de time é uma fileira de chips", () => {
    montar(AdminPlayersPanel, true);
    const fileira = screen.getByRole("group", { name: "Filtrar por time" });
    fireEvent.click(within(fileira).getByRole("button", { name: /Beta/ }));
    expect(screen.queryByRole("button", { name: "Editar Fulano" })).toBeNull();
    expect(screen.getByRole("button", { name: "Editar Ciclano" })).toBeTruthy();
  });

  it("no monitor: editor ao lado da lista, e o elo da lista vira emblema", () => {
    render(<AdminPlayersPanel draft={dataset()} mutateDraft={() => {}} />);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("button", { name: "Salvar no rascunho" })).toBeTruthy();
    const item = screen.getByRole("button", { name: /Ciclano/ });
    expect(within(item).getByRole("img", { name: "Mestre" })).toBeTruthy();
    expect(within(item).queryByText("Mestre")).toBeNull();
  });
});
