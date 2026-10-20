// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AdminBackupPanel } from "@/components/admin/admin-backup-panel";
import { AdminUsersPanel } from "@/components/admin/admin-users-panel";
import { ModoCompacto } from "@/components/admin/responsivo";
import { TrocarSenha } from "@/components/admin/trocar-senha";

/**
 * Usuários, Importar/Exportar e a troca de senha no CELULAR.
 *
 * No monitor, cada clique num chip de permissão grava na hora — e assim continua. No
 * celular a conta abre numa folha e as permissões viram rascunho com "Salvar" no rodapé:
 * numa lista de onze linhas tocáveis, o polegar que rola a tela esbarra numa caixa, e um
 * esbarrão gravando na hora mudaria o que uma conta real pode fazer.
 *
 * Os testes sem `ModoCompacto` são o arranjo de mesa, que precisa seguir igual.
 */

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

type Usuario = {
  id: string;
  username: string;
  displayName: string;
  isMaster: boolean;
  scopes: string[];
  disabled: boolean;
  mustChangePassword: boolean;
  activeSessions: number;
};

const MASTER: Usuario = {
  id: "m",
  username: "lucas",
  displayName: "Lucas",
  isMaster: true,
  scopes: [],
  disabled: false,
  mustChangePassword: false,
  activeSessions: 1,
};

const JOANA: Usuario = {
  id: "j",
  username: "joana",
  displayName: "Joana",
  isMaster: false,
  scopes: ["series:cards", "results:write"],
  disabled: false,
  mustChangePassword: true,
  activeSessions: 0,
};

/** Servidor falso de /api/admin/users: guarda os PATCH e devolve a lista já atualizada. */
function servidorDeContas() {
  let joana = { ...JOANA };
  const patches: Array<Record<string, unknown>> = [];
  const fetchFalso = vi.fn<typeof fetch>(async (entrada, init) => {
    const url = String(entrada);
    if (init?.method === "PATCH" && url.endsWith("/api/admin/users/j")) {
      const corpo = JSON.parse(String(init.body)) as Record<string, unknown>;
      patches.push(corpo);
      if (Array.isArray(corpo.scopes)) joana = { ...joana, scopes: corpo.scopes as string[] };
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }
    return new Response(JSON.stringify({ users: [MASTER, joana] }), { status: 200 });
  });
  vi.stubGlobal("fetch", fetchFalso);
  return { patches };
}

describe("Usuários no celular", () => {
  it("cada conta é um cartão; o formulário de conta nova sai da página para uma folha", async () => {
    servidorDeContas();
    render(
      <ModoCompacto ativo>
        <AdminUsersPanel onAlert={vi.fn()} />
      </ModoCompacto>,
    );

    const cartao = await screen.findByRole("button", { name: /Abrir a conta de Joana/ });
    expect(cartao.getAttribute("aria-haspopup")).toBe("dialog");
    expect(screen.getByText(/2 de \d+ permissões/)).toBeTruthy();
    // Nada de cartão de cadastro aberto na página nem de chip de 10px para o dedo.
    expect(screen.queryByRole("button", { name: "Criar conta" })).toBeNull();
    expect(screen.queryByRole("button", { name: /Sortear cartinhas/ })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /Nova conta/ }));
    const folha = screen.getByRole("dialog", { name: "Nova conta" });
    // Permissão no celular é caixa de marcação de verdade, numa linha inteira de toque.
    const cartinhas = within(folha).getByRole("checkbox", { name: /Sortear cartinhas/ });
    fireEvent.click(cartinhas);
    expect((cartinhas as HTMLInputElement).checked).toBe(true);
    // As exclusivas do master aparecem, mas travadas.
    const usuarios = within(folha).getByRole("checkbox", { name: /Gerenciar usuários e permissões/ });
    expect((usuarios as HTMLInputElement).disabled).toBe(true);
    expect(within(folha).getByRole("button", { name: /Criar conta/ })).toBeTruthy();
  });

  it("permissão vira rascunho: tocar não grava, sair pergunta, salvar manda só o que mudou", async () => {
    const { patches } = servidorDeContas();
    render(
      <ModoCompacto ativo>
        <AdminUsersPanel onAlert={vi.fn()} />
      </ModoCompacto>,
    );

    fireEvent.click(await screen.findByRole("button", { name: /Abrir a conta de Joana/ }));
    const folha = screen.getByRole("dialog", { name: "Joana" });

    const times = within(folha).getByRole("checkbox", { name: /Criar e editar times/ });
    fireEvent.click(times);
    expect((times as HTMLInputElement).checked).toBe(true);
    // O toque NÃO foi ao servidor.
    expect(patches).toHaveLength(0);

    // Esc com rascunho pergunta antes de descartar; a folha continua aberta.
    fireEvent.keyDown(folha, { key: "Escape" });
    expect(within(folha).getByRole("alert").textContent).toMatch(/Sair sem salvar a mudança/);
    fireEvent.click(within(folha).getByRole("button", { name: "Continuar editando" }));

    fireEvent.click(within(folha).getByRole("button", { name: /Salvar permissões \(1\)/ }));
    await waitFor(() => expect(patches).toHaveLength(1));
    // As que ela já tinha vão junto, intocadas; a nova entra.
    expect(patches[0]).toEqual({ scopes: ["series:cards", "results:write", "teams:write"] });
    await waitFor(() =>
      expect(within(folha).getByRole("button", { name: /Salvar permissões/ }).hasAttribute("disabled")).toBe(true),
    );

    // Sem rascunho, fechar fecha direto.
    fireEvent.keyDown(screen.getByRole("dialog", { name: "Joana" }), { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("as ações de risco continuam pedindo confirmação nomeada dentro da folha", async () => {
    const { patches } = servidorDeContas();
    render(
      <ModoCompacto ativo>
        <AdminUsersPanel onAlert={vi.fn()} />
      </ModoCompacto>,
    );

    fireEvent.click(await screen.findByRole("button", { name: /Abrir a conta de Joana/ }));
    const folha = screen.getByRole("dialog", { name: "Joana" });
    fireEvent.click(within(folha).getByRole("button", { name: /Desativar/ }));
    expect(within(folha).getByText("Desativar a conta de Joana?")).toBeTruthy();
    expect(patches).toHaveLength(0);
  });
});

describe("Usuários no monitor (fora do provedor) segue igual", () => {
  it("o cadastro fica na página e o chip de permissão grava no clique", async () => {
    const { patches } = servidorDeContas();
    render(<AdminUsersPanel onAlert={vi.fn()} />);

    await screen.findByText("@joana");
    // O primeiro "Criar e editar times" é o do formulário de conta nova; o da Joana é o que
    // tem a dica de conceder.
    const chip = screen
      .getAllByRole("button", { name: /Criar e editar times/ })
      .find((botao) => botao.getAttribute("title") === "Conceder esta permissão");
    if (!chip) throw new Error("chip de permissão da Joana não apareceu");
    expect(screen.getByRole("button", { name: "Criar conta" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Abrir a conta de/ })).toBeNull();

    fireEvent.click(chip);
    await waitFor(() => expect(patches).toHaveLength(1));
    expect(patches[0]).toEqual({ scopes: ["series:cards", "results:write", "teams:write"] });
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("troca de senha no celular", () => {
  const desenhar = (obrigatoria: boolean) =>
    renderToStaticMarkup(
      <ModoCompacto ativo>
        <TrocarSenha obrigatoria={obrigatoria} onTrocada={() => {}} />
      </ModoCompacto>,
    );

  it("é um <form>: o 'Ir' do teclado do telefone envia", () => {
    const html = desenhar(true);
    expect(html).toContain("<form");
    expect(html).toMatch(/<button[^>]*type="submit"/);
    expect(html.match(/type="password"/g)).toHaveLength(3);
    expect(html).toMatch(/autocomplete="current-password"/i);
    expect(html).not.toContain("Cancelar");
  });

  it("no monitor continua sem <form>, do jeito que sempre foi", () => {
    const html = renderToStaticMarkup(<TrocarSenha obrigatoria onTrocada={() => {}} />);
    expect(html).not.toContain("<form");
  });
});

describe("Importar/Exportar no celular", () => {
  const BACKUP = JSON.stringify({
    tournament: { name: "3ª Edição", status: "finished" },
    teams: [{}, {}],
    players: [{}],
    seriesMatches: [],
    archivedSeasons: [],
  });

  function montar(compacto: boolean) {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(
        async () =>
          new Response(
            JSON.stringify({
              dataset: {
                tournament: { name: "4ª Edição", status: "active" },
                teams: [{}, {}, {}],
                players: [{}, {}],
                seriesMatches: [{}],
                archivedSeasons: [],
              },
            }),
            { status: 200 },
          ),
      ),
    );
    const painel = <AdminBackupPanel onImportText={vi.fn()} onImportFile={vi.fn()} />;
    render(compacto ? <ModoCompacto ativo>{painel}</ModoCompacto> : painel);
    fireEvent.change(screen.getByPlaceholderText(/Cole aqui um backup/), { target: { value: BACKUP } });
    fireEvent.click(screen.getByRole("button", { name: "Conferir antes de importar" }));
  }

  it("a prévia vira lista (sem tabela que role de lado), com a perda dita por extenso", async () => {
    montar(true);
    await screen.findByText(/Confirmo que quero substituir o campeonato gravado por este JSON/);
    expect(document.querySelector("table")).toBeNull();
    await waitFor(() => expect(screen.getAllByText(/\(menos que hoje\)/).length).toBeGreaterThan(0));
  });

  it("no monitor a prévia continua sendo a tabela", async () => {
    montar(false);
    await screen.findByText(/Confirmo que quero substituir o campeonato gravado por este JSON/);
    expect(document.querySelector("table")).not.toBeNull();
  });
});
