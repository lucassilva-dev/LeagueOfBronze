// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AdminDashboardClient } from "@/components/admin/admin-dashboard-client";
import type { TournamentDataset } from "@/lib/schema";

/**
 * O SALVAR NO DIA DE JOGO.
 *
 * Duas pessoas no painel: uma lança o K/D/A da série que acabou, a outra sorteia lado e carta
 * da próxima (pela página da partida ou por outro aparelho). O sorteio grava sozinho e a
 * versão do campeonato anda; o Salvar de quem digitou cai em 409.
 *
 * Antes: o aviso oferecia "trazer a versão nova" (jogava fora as linhas digitadas) ou
 * "salvar por cima" (o rascunho inteiro de volta, desfazendo a carta anunciada na live). E
 * ainda: sessão expirada sem caminho de volta, resposta perdida virando "outra pessoa
 * salvou", texto técnico em inglês, digitação com o Salvar em voo sumindo, link do cabeçalho
 * descartando o rascunho sem pergunta.
 *
 * O servidor aqui é um falso EM MEMÓRIA com a trava de versão de verdade (409 quando a versão
 * enviada não é a gravada) — é ela que provoca cada cenário.
 */

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  document.querySelectorAll("a[data-teste]").forEach((a) => a.remove());
});

type Jogo = TournamentDataset["seriesMatches"][number]["games"][number];

function jogoDe(vencedor: string, duracao = 30): Jogo {
  return {
    winnerTeamId: vencedor,
    durationMin: duracao,
    mvpPlayerId: `${vencedor}-mid`,
    statsByPlayer: [{ playerId: `${vencedor}-mid`, champion: "Ahri", kills: 5, deaths: 1, assists: 2 }],
  };
}

function dataset(): TournamentDataset {
  const jog = (t: string) =>
    ["top", "mid"].map((r) => ({ id: `${t}-${r}`, nick: `${t}-${r}`, slug: `${t}-${r}`, teamId: t, role1: "MID", elo: "PRATA" }));
  return {
    tournament: {
      name: "4ª Edição",
      lastUpdatedISO: "2026-11-21T20:00:00.000Z",
      seriesPointsRule: { win: 3, loss: 0 },
      format: "BO3",
      status: "active",
      slug: "4a",
    },
    archivedSeasons: [],
    teams: [
      { id: "alfa", name: "Alfa", slug: "alfa" },
      { id: "beta", name: "Beta", slug: "beta" },
      { id: "gama", name: "Gama", slug: "gama" },
    ],
    players: [...jog("alfa"), ...jog("beta"), ...jog("gama")],
    seriesMatches: [
      { id: "4a-jogo-04", date: "2026-11-21T21:00:00-03:00", teamAId: "alfa", teamBId: "beta", games: [jogoDe("alfa")] },
      { id: "4a-jogo-05", date: "2026-11-21T22:00:00-03:00", teamAId: "beta", teamBId: "gama", games: [] },
    ],
    standingsSeed: [],
  } as unknown as TournamentDataset;
}

const json = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { "Content-Type": "application/json" } });

function sessao(over: Record<string, unknown> = {}) {
  return json({
    configured: true,
    authorized: true,
    authMode: "accounts",
    dataProvider: "supabase",
    user: {
      username: "lucas",
      displayName: "Lucas",
      isMaster: false,
      scopes: ["results:write"],
      mustChangePassword: false,
      legacy: false,
      ...over,
    },
  });
}

type Put = { dataset: TournamentDataset; versao?: unknown; force?: unknown };

/** Servidor em memória com a trava de versão. `antesDoPut` deixa o teste interferir no meio. */
function servidorFalso() {
  const estado = {
    dataset: dataset(),
    versao: 7,
    puts: [] as Put[],
    getsDoDataset: 0,
    logins: 0,
    /** Devolve uma Response para pular o comportamento normal do PUT. */
    antesDoPut: null as null | ((corpo: Put) => Response | Promise<Response | null> | null),
  };
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      if (url.includes("/api/admin/session")) return sessao();
      if (url.includes("/api/admin/login")) {
        estado.logins += 1;
        return json({ ok: true });
      }
      if (url.includes("/api/admin/dataset")) {
        if (init?.method === "PUT") {
          const corpo = JSON.parse(String(init.body)) as Put;
          estado.puts.push(corpo);
          const desvio = await estado.antesDoPut?.(corpo);
          if (desvio) return desvio;
          if (corpo.force !== true && corpo.versao !== estado.versao) {
            return json({ error: "Outra pessoa salvou alterações enquanto você editava.", conflict: true }, 409);
          }
          estado.dataset = corpo.dataset;
          estado.versao += 1;
          return json({ dataset: estado.dataset, versao: estado.versao, message: "Dados salvos com sucesso." });
        }
        estado.getsDoDataset += 1;
        return json({ dataset: estado.dataset, versao: estado.versao });
      }
      throw new Error(`fetch inesperado: ${url}`);
    }),
  );
  return estado;
}

/** O que outro aparelho faz: sorteia a carta da 4a-jogo-05 pela rota do sorteio. */
function sortearCartaEmOutroAparelho(estado: ReturnType<typeof servidorFalso>) {
  const serie = estado.dataset.seriesMatches.find((s) => s.id === "4a-jogo-05")!;
  serie.cardsUsed = [{ teamId: "beta", cardId: "ABCDRAFT" }];
  serie.sorteios = [
    { tipo: "carta", semente: "s".repeat(32), emISO: "2026-11-21T21:50:00.000Z", autor: "nakay", teamId: "beta", resultado: "ABCDRAFT" },
  ] as NonNullable<typeof serie.sorteios>;
  estado.versao += 1;
}

function stubTela(compacto = false) {
  vi.stubGlobal("matchMedia", (q: string) => ({ matches: compacto, media: q, addEventListener() {}, removeEventListener() {} }));
  vi.stubGlobal("confirm", vi.fn(() => true));
  vi.stubGlobal("scrollTo", () => {});
}

async function abrirSerieAlfaBeta() {
  const nav = await screen.findByRole("navigation", { name: "Seções do painel" });
  fireEvent.click(within(nav).getByText("Séries"));
  const item = (await screen.findAllByRole("button")).find(
    (b) => b.textContent?.includes("Alfa") && b.textContent?.includes("Beta"),
  )!;
  fireEvent.click(item);
}

/** Os botões ficam desligados até a tarefa anterior terminar de verdade (a transição). */
async function clicarQuandoLivre(botao: HTMLElement) {
  await waitFor(() => expect((botao as HTMLButtonElement).disabled).toBe(false));
  fireEvent.click(botao);
}

const campoDuracao = () => screen.getByLabelText("Duração (min)") as HTMLInputElement;
const botaoSalvar = () => screen.findByRole("button", { name: /Salvar no Supabase/ });
const duracaoGravada = (estado: ReturnType<typeof servidorFalso>) =>
  estado.dataset.seriesMatches.find((s) => s.id === "4a-jogo-04")!.games[0]!.durationMin;

// ---------------------------------------------------------------- 409: rebase

describe("409 depois de um sorteio feito em outro aparelho (CEN-01 / TOR-01 / PNL-03)", () => {
  it("reaplica o K/D/A sobre a versão nova sozinho: a carta sorteada fica e ninguém escolhe nada", async () => {
    stubTela();
    const estado = servidorFalso();
    render(<AdminDashboardClient />);
    await abrirSerieAlfaBeta();

    fireEvent.change(campoDuracao(), { target: { value: "38" } });
    sortearCartaEmOutroAparelho(estado);
    fireEvent.click(await botaoSalvar());

    await screen.findByText(/Outra pessoa tinha salvo antes/);
    expect(screen.queryByText("Alguém salvou antes de você")).toBeNull();

    // As duas coisas gravadas: o resultado digitado E a carta da live.
    expect(duracaoGravada(estado)).toBe(38);
    const sorteada = estado.dataset.seriesMatches.find((s) => s.id === "4a-jogo-05")!;
    expect(sorteada.cardsUsed).toEqual([{ teamId: "beta", cardId: "ABCDRAFT" }]);
    expect(sorteada.sorteios).toHaveLength(1);

    // Sem `force`: a segunda gravação vai condicionada à versão que o painel acabou de ler.
    expect(estado.puts.map((p) => [p.versao, p.force ?? null])).toEqual([
      [7, null],
      [8, null],
    ]);
    expect(screen.getByText("Tudo salvo")).toBeTruthy();
  });

  it("os dois mexeram no MESMO campo: o aviso diz o quê, e «Salvar por cima» grava só esse campo", async () => {
    stubTela();
    const estado = servidorFalso();
    render(<AdminDashboardClient />);
    await abrirSerieAlfaBeta();

    fireEvent.change(campoDuracao(), { target: { value: "38" } });
    // Outra pessoa corrigiu a mesma duração E sorteou a carta da série seguinte.
    estado.dataset.seriesMatches[0]!.games[0]!.durationMin = 40;
    sortearCartaEmOutroAparelho(estado);
    fireEvent.click(await botaoSalvar());

    await screen.findByText("Alguém salvou antes de você");
    expect(screen.getByText("Alfa x Beta › jogos")).toBeTruthy();
    expect(screen.getByText(/sorteio de lado ou carta em 1 série/)).toBeTruthy();
    expect(duracaoGravada(estado), "nada é gravado antes de a pessoa decidir").toBe(40);

    await clicarQuandoLivre(screen.getByRole("button", { name: /Salvar por cima assim mesmo/ }));
    await screen.findByText(/Dados salvos com sucesso/);

    expect(duracaoGravada(estado)).toBe(38);
    // Fora do conflito, o que a outra pessoa gravou continua: a carta da live não some.
    expect(estado.dataset.seriesMatches.find((s) => s.id === "4a-jogo-05")!.cardsUsed).toEqual([
      { teamId: "beta", cardId: "ABCDRAFT" },
    ]);
    expect(estado.puts.at(-1)!.force ?? null).toBeNull();
    expect(screen.queryByText("Alguém salvou antes de você")).toBeNull();
  });
});

describe("409 depois da virada do draft (CEN-06)", () => {
  it("resume o que mudou (+times, −séries) e NÃO oferece «Salvar por cima»", async () => {
    stubTela();
    const estado = servidorFalso();
    render(<AdminDashboardClient />);
    await abrirSerieAlfaBeta();
    fireEvent.change(campoDuracao(), { target: { value: "38" } });

    // A virada: times e séries novos, as séries antigas fora.
    estado.dataset.teams.push({ id: "carmesim", name: "Carmesim", slug: "carmesim" }, { id: "anil", name: "Anil", slug: "anil" });
    estado.dataset.seriesMatches = [
      { id: "4a-jogo-01", date: "2026-11-20T19:00:00-03:00", teamAId: "carmesim", teamBId: "anil", games: [] },
    ] as TournamentDataset["seriesMatches"];
    estado.versao += 1;

    fireEvent.click(await botaoSalvar());
    await screen.findByText("Alguém salvou antes de você");

    expect(screen.getByText(/\+2 times/)).toBeTruthy();
    expect(screen.getByText(/−2 séries/)).toBeTruthy();
    expect(screen.getByText(/cria ou apaga times, jogadores ou séries/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Salvar por cima/ })).toBeNull();
    // Trazer a versão nova continua sendo a saída.
    expect(screen.getByRole("button", { name: /Trazer a versão nova/ })).toBeTruthy();
    expect(estado.puts).toHaveLength(1);
  });
});

// ---------------------------------------------------------------- rede e plataforma

describe("falhas de rede e de plataforma (PNL-11)", () => {
  it("queda de rede vira texto em português, e a resposta perdida não vira 'outra pessoa salvou'", async () => {
    stubTela();
    const estado = servidorFalso();
    let perder = true;
    estado.antesDoPut = (corpo) => {
      if (!perder || corpo.versao !== estado.versao) return null;
      // O servidor GRAVA, mas a resposta não chega.
      perder = false;
      estado.dataset = corpo.dataset;
      estado.versao += 1;
      throw new TypeError("Load failed");
    };
    render(<AdminDashboardClient />);
    await abrirSerieAlfaBeta();
    fireEvent.change(campoDuracao(), { target: { value: "38" } });

    const salvar = await botaoSalvar();
    fireEvent.click(salvar);
    await screen.findByText(/Sem conexão: não deu para confirmar o salvamento/);
    expect(screen.queryByText("Load failed")).toBeNull();

    await waitFor(() => expect((salvar as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(salvar);

    await screen.findByText(/Suas alterações já estavam gravadas/);
    expect(screen.queryByText("Alguém salvou antes de você")).toBeNull();
    expect(screen.getByText("Tudo salvo")).toBeTruthy();
    expect(duracaoGravada(estado)).toBe(38);
  });

  it("resposta sem JSON (500 da plataforma) diz o status, não o erro do parser", async () => {
    stubTela();
    const estado = servidorFalso();
    estado.antesDoPut = () => new Response("", { status: 500 });
    render(<AdminDashboardClient />);
    await abrirSerieAlfaBeta();
    fireEvent.change(campoDuracao(), { target: { value: "38" } });
    fireEvent.click(await botaoSalvar());

    await screen.findByText(/O servidor falhou \(HTTP 500\)/);
    expect(screen.queryByText(/Unexpected end of JSON input/)).toBeNull();
  });
});

// ---------------------------------------------------------------- sessão expirada

describe("sessão expirada no meio do lançamento (PNL-02)", () => {
  it("o 401 abre o cartão de entrar por cima do editor; entrar NÃO recarrega o rascunho", async () => {
    stubTela();
    const estado = servidorFalso();
    let expirada = true;
    estado.antesDoPut = () => (expirada ? json({ error: "Não autorizado." }, 401) : null);
    render(<AdminDashboardClient />);
    await abrirSerieAlfaBeta();
    fireEvent.change(campoDuracao(), { target: { value: "38" } });
    fireEvent.click(await botaoSalvar());

    await screen.findByText(/Sua sessão expirou — o rascunho continua aqui/);
    expect(campoDuracao().value, "o editor continua montado com o que foi digitado").toBe("38");
    const getsAntes = estado.getsDoDataset;

    fireEvent.change(screen.getByPlaceholderText("sua senha"), { target: { value: "segredo" } });
    expirada = false;
    fireEvent.click(screen.getByRole("button", { name: /Entrar de novo/ }));
    await screen.findByText(/Sessão renovada/);

    expect(estado.logins).toBe(1);
    expect(estado.getsDoDataset, "entrar de novo não busca o campeonato").toBe(getsAntes);
    expect(campoDuracao().value).toBe("38");

    await clicarQuandoLivre(await botaoSalvar());
    await screen.findByText(/Dados salvos com sucesso/);
    expect(duracaoGravada(estado)).toBe(38);
  });
});

// ---------------------------------------------------------------- digitar com o Salvar em voo

describe("digitação feita com o Salvar em voo (PNL-04)", () => {
  it("continua no rascunho, como alteração pendente, quando a resposta chega", async () => {
    stubTela();
    const estado = servidorFalso();
    let soltar: (() => void) | null = null;
    estado.antesDoPut = () =>
      new Promise<null>((resolve) => {
        soltar = () => resolve(null);
      });
    render(<AdminDashboardClient />);
    await abrirSerieAlfaBeta();

    fireEvent.change(campoDuracao(), { target: { value: "31" } });
    fireEvent.click(await botaoSalvar());
    await waitFor(() => expect(soltar).not.toBeNull());
    fireEvent.change(campoDuracao(), { target: { value: "45" } });
    soltar!();

    await screen.findByText(/Dados salvos com sucesso/);
    expect(duracaoGravada(estado), "foi gravado o que estava na tela no clique").toBe(31);
    expect(campoDuracao().value, "o que veio depois do clique não some").toBe("45");
    expect(screen.getByText("1 alteração não salva")).toBeTruthy();
  });
});

// ---------------------------------------------------------------- sair com alteração pendente

describe("link do site com alteração não salva (PNL-01)", () => {
  function linkDoCabecalho(href = "/regras") {
    const a = document.createElement("a");
    a.href = href;
    a.textContent = "Regras";
    a.dataset.teste = "1";
    document.body.appendChild(a);
    return a;
  }

  it("pergunta antes de sair; recusar impede a navegação", async () => {
    stubTela();
    servidorFalso();
    const confirmar = vi.fn(() => false);
    render(<AdminDashboardClient />);
    await abrirSerieAlfaBeta();
    vi.stubGlobal("confirm", confirmar);
    fireEvent.change(campoDuracao(), { target: { value: "38" } });

    const seguiu = fireEvent.click(linkDoCabecalho());
    expect(confirmar).toHaveBeenCalledOnce();
    expect(String((confirmar.mock.calls[0] as unknown[])[0])).toMatch(/1 alteração\(ões\) não salva\(s\)/);
    expect(seguiu, "a navegação foi cancelada").toBe(false);
    expect(document.documentElement.dataset.lobPainelSujo).toBe("1");
  });

  it("sem nada pendente, o link navega sem pergunta", async () => {
    stubTela();
    servidorFalso();
    const confirmar = vi.fn(() => false);
    render(<AdminDashboardClient />);
    await abrirSerieAlfaBeta();
    vi.stubGlobal("confirm", confirmar);

    const seguiu = fireEvent.click(linkDoCabecalho());
    expect(confirmar).not.toHaveBeenCalled();
    expect(seguiu).toBe(true);
    expect(document.documentElement.dataset.lobPainelSujo).toBeUndefined();
  });
});

// ---------------------------------------------------------------- senha provisória no celular

describe("senha provisória no celular (PNL-13)", () => {
  it("a tela de trabalho avisa e leva ao formulário de troca", async () => {
    stubTela(true);
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.includes("/api/admin/session")) return sessao({ mustChangePassword: true });
        return json({ dataset: dataset(), versao: 4 });
      }),
    );
    render(<AdminDashboardClient />);

    await screen.findByText("Troque a senha provisória antes de salvar");
    expect(screen.queryByLabelText("Senha atual")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Trocar a senha agora/ }));
    expect(await screen.findByLabelText("Senha atual")).toBeTruthy();
  });
});
