// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AdminPlayersPanel } from "@/components/admin/admin-players-panel";
import { AdminTournamentPanel } from "@/components/admin/admin-tournament-panel";
import { ModoCompacto } from "@/components/admin/responsivo";
import type { MutateDraft } from "@/components/admin/shared";
import type { TournamentDataset } from "@/lib/schema";
import { buildNextSeasonDataset, substituirDeVez } from "@/lib/tournament";

import { cenario, copia, id, jogo, linhasDoTime, validar } from "../torneio/_cenario-regra-6";

/**
 * O painel de JOGADORES com a regra 6 (decisões de 22/10/2026).
 *
 * - "Substituir de vez": o titular sai do elenco público e o reserva herda a vaga, com
 *   confirmação, sem mexer em linha nenhuma de estatística;
 * - quem já jogou não tem "Excluir": excluir apagava as linhas de K/D/A e os MVPs dele (a
 *   história das partidas), e o painel ainda chamava isso de "Excluir definitivamente";
 * - o jogador pode ser reserva (sem time) — antes o formulário exigia time e o tsc nem
 *   compilava com o `teamId` opcional.
 */

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

/** O cenário com um jogo de ALFA x BETA: os 10 titulares têm histórico; GAMA e o reserva, não. */
function comHistorico(): TournamentDataset {
  const d = cenario();
  d.seriesMatches[0].games = [jogo("alfa", [...linhasDoTime("alfa", [3, 1, 2]), ...linhasDoTime("beta", [1, 2, 1])])];
  return d;
}

function montar(inicial: TournamentDataset, compacto = false) {
  let atual = inicial;
  function Harness() {
    const [d, setD] = useState(atual);
    const mutate: MutateDraft = (recipe) =>
      setD((anterior) => {
        const proximo = structuredClone(anterior);
        recipe(proximo);
        atual = proximo;
        return proximo;
      });
    return <AdminPlayersPanel draft={d} mutateDraft={mutate} />;
  }
  render(
    <ModoCompacto ativo={compacto}>
      <Harness />
    </ModoCompacto>,
  );
  return { atual: () => atual };
}

const jogador = (d: TournamentDataset, playerId: string) => d.players.find((p) => p.id === playerId)!;

/**
 * Botão pelo texto (ou pelo nome de quem só tem ícone). Pela árvore e não por `getByRole`: o
 * painel tem centenas de nós e a consulta por papel levava segundos por chamada no jsdom —
 * com a máquina carregada, o teste estourava o tempo.
 */
function achar(texto: string | RegExp, raiz: ParentNode = document.body): HTMLButtonElement | undefined {
  const bate = (valor: string | null | undefined) =>
    typeof texto === "string" ? (valor ?? "").trim() === texto : texto.test(valor ?? "");
  return [...raiz.querySelectorAll("button")].find((b) => bate(b.textContent) || bate(b.getAttribute("aria-label")));
}

function botao(texto: string | RegExp, raiz: ParentNode = document.body): HTMLButtonElement {
  const achado = achar(texto, raiz);
  if (!achado) throw new Error(`Botão não encontrado: ${String(texto)}`);
  return achado;
}

const folha = () => document.querySelector<HTMLElement>('[role="dialog"]')!;

/** No monitor, abre a ficha pelo botão da lista. */
function abrirNoMonitor(nick: string) {
  fireEvent.click([...document.querySelectorAll("button")].find((b) => b.textContent?.includes(nick))!);
}

/** Escolhe o reserva, abre a confirmação e confirma. */
function substituirPor(reservaId: string, raiz: ParentNode = document.body) {
  fireEvent.change(within(raiz as HTMLElement).getByLabelText("Reserva que herda a vaga"), {
    target: { value: reservaId },
  });
  fireEvent.click(botao(/Substituir de vez…/, raiz));
  fireEvent.click(botao("Confirmar substituição", raiz));
}

describe("Substituir de vez (monitor)", () => {
  it("o titular ganha a saída e fica com o time; o reserva herda a vaga; as linhas não mudam", () => {
    const inicial = comHistorico();
    const seriesAntes = copia(inicial.seriesMatches);
    const { atual } = montar(inicial);
    abrirNoMonitor("alfaTOP#BR1");

    fireEvent.change(screen.getByLabelText("Reserva que herda a vaga"), { target: { value: "r1" } });
    fireEvent.click(botao(/Substituir de vez…/));
    expect(screen.getByText("Substituir alfaTOP#BR1 por Reserva#BR1 de vez?")).toBeTruthy();
    fireEvent.click(botao("Confirmar substituição"));

    const titular = jogador(atual(), id("alfa", "TOP"));
    const herdeiro = jogador(atual(), "r1");
    expect(titular.teamId).toBe("alfa");
    expect(typeof titular.saiuEm).toBe("string");
    expect(Number.isNaN(Date.parse(titular.saiuEm!))).toBe(false);
    expect(herdeiro.teamId).toBe("alfa");
    expect("reserva" in herdeiro).toBe(false);
    expect(atual().seriesMatches).toEqual(seriesAntes);
    expect(validar(atual()).success).toBe(true);

    // A ficha aberta acompanha: mostra a saída, e não oferece mais a troca.
    expect(screen.getByText(/^Saiu do time em /)).toBeTruthy();
    expect(screen.queryByLabelText("Reserva que herda a vaga")).toBeNull();
  });

  it("salvar a ficha depois da troca NÃO apaga a saída (o formulário recarrega do rascunho)", () => {
    const { atual } = montar(comHistorico());
    abrirNoMonitor("alfaTOP#BR1");
    substituirPor("r1");
    const saiuEm = jogador(atual(), id("alfa", "TOP")).saiuEm;
    expect(saiuEm).toBeTruthy();

    fireEvent.click(botao("Salvar no rascunho"));
    expect(jogador(atual(), id("alfa", "TOP")).saiuEm).toBe(saiuEm);
    expect(validar(atual()).success).toBe(true);
  });

  it("capitã que sai: a confirmação avisa que a marca deixa de valer", () => {
    montar(comHistorico());
    abrirNoMonitor("alfaMID#BR1");
    fireEvent.change(screen.getByLabelText("Reserva que herda a vaga"), { target: { value: "r1" } });
    fireEvent.click(botao(/Substituir de vez…/));
    expect(screen.getByText(/era capitão: a marca deixa de valer — marque o novo capitão do time/)).toBeTruthy();
  });

  it("com a ficha editada e não salva, a troca espera", () => {
    montar(comHistorico());
    abrirNoMonitor("alfaTOP#BR1");
    fireEvent.change(screen.getByPlaceholderText("Nick do jogo"), { target: { value: "outro nick" } });
    fireEvent.change(screen.getByLabelText("Reserva que herda a vaga"), { target: { value: "r1" } });
    expect(botao(/Substituir de vez…/).disabled).toBe(true);
    expect(screen.getByText("Salve ou desfaça a edição desta ficha antes de substituir.")).toBeTruthy();
  });
});

describe("quem já jogou não é excluído", () => {
  it("titular com K/D/A: sem “Excluir jogador”, com o caminho da troca", () => {
    montar(comHistorico());
    abrirNoMonitor("alfaTOP#BR1");
    expect(achar("Excluir jogador")).toBeUndefined();
    expect(screen.getByText(/não dá para excluir sem apagar a história das partidas/)).toBeTruthy();
  });

  it("quem nunca jogou continua podendo sair do cadastro, sem mexer em partida", () => {
    const { atual } = montar(comHistorico());
    abrirNoMonitor("gamaTOP#BR1");
    fireEvent.click(botao("Excluir jogador"));
    fireEvent.click(botao("Excluir definitivamente"));
    expect(atual().players.some((p) => p.id === id("gama", "TOP"))).toBe(false);
  });

  it("no celular a lixeira do rodapé também some para quem já jogou", () => {
    montar(comHistorico(), true);
    fireEvent.click(botao("Editar alfaTOP#BR1"));
    expect(achar("Excluir jogador", folha())).toBeUndefined();
  });
});

describe("reserva (sem time) no cadastro", () => {
  it("jogador novo como “Reserva (sem time)”: grava reserva sem teamId, e o servidor aceita", () => {
    const { atual } = montar(comHistorico());
    fireEvent.click(botao("Novo jogador"));
    fireEvent.change(screen.getByPlaceholderText("Nick do jogo"), { target: { value: "Fila2#BR1" } });
    fireEvent.change(screen.getByPlaceholderText("nick-do-jogador"), { target: { value: "fila-2" } });
    fireEvent.change(screen.getByLabelText("Time"), { target: { value: "__reserva__" } });
    const selects = [...document.querySelectorAll("select")];
    const rota = selects.find((s) => [...s.options].some((o) => o.value === "TOP") && s.value === "")!;
    fireEvent.change(rota, { target: { value: "TOP" } });
    const elo = selects.find((s) => [...s.options].some((o) => o.value === "PRATA"))!;
    fireEvent.change(elo, { target: { value: "PRATA" } });
    fireEvent.click(botao("Salvar no rascunho"));

    const novo = atual().players.find((p) => p.nick === "Fila2#BR1")!;
    expect(novo.reserva).toBe(true);
    expect("teamId" in novo).toBe(false);
    expect(validar(atual()).success).toBe(true);
  });

  it("titular com K/D/A pelo próprio time não vira reserva pelo campo Time: a ficha manda usar a troca", () => {
    montar(comHistorico());
    abrirNoMonitor("alfaTOP#BR1");
    fireEvent.change(screen.getByLabelText("Time"), { target: { value: "__reserva__" } });
    expect(
      screen.getByText(
        /linha\(s\) de K\/D\/A pelo time dele — para tirá-lo do time sem mudar a história, use “Substituir de vez”/,
      ),
    ).toBeTruthy();
    expect(botao("Salvar no rascunho").disabled).toBe(true);
  });

  it("o filtro “Reservas” mostra só quem está sem time", () => {
    montar(comHistorico());
    fireEvent.change(screen.getByDisplayValue("Todos os times"), { target: { value: "__reserva__" } });
    expect(screen.getByText("1 de 16")).toBeTruthy();
  });
});

describe("Substituir de vez no celular", () => {
  it("a troca acontece dentro da folha, com a mesma confirmação", () => {
    const { atual } = montar(comHistorico(), true);
    fireEvent.click(botao("Editar alfaTOP#BR1"));
    substituirPor("r1", folha());
    expect(jogador(atual(), "r1").teamId).toBe("alfa");
    expect(validar(atual()).success).toBe(true);
  });
});

describe("aba Torneio: quem a nova temporada mantém", () => {
  it("conta só o elenco de hoje — a mesma conta da virada (sem quem saiu, sem reserva)", async () => {
    const d = substituirDeVez(comHistorico(), id("alfa", "TOP"), "r1", "2026-11-22T12:00:00.000Z");
    d.players.push({ id: "r2", nick: "Fila2#BR1", slug: "fila-2", reserva: true, role1: "TOP", elo: "Prata" });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ dataset: d, versao: 1 }) }) as unknown as Response),
    );
    render(<AdminTournamentPanel draft={d} isBusy={false} onEndTournament={() => {}} onStartTournament={() => {}} />);

    const mantidos = buildNextSeasonDataset(d, {
      name: "5ª",
      format: "BO3",
      keepTeams: true,
      keepPlayers: true,
      seasonId: "s5",
      now: "2026-12-01T00:00:00.000Z",
    }).players.length;
    expect(mantidos).toBe(15);
    expect(await screen.findByText(`${mantidos} mantidos · ${d.players.length - mantidos} apagados`)).toBeTruthy();
    expect(screen.getByText("2 jogador(es) fora do elenco de hoje")).toBeTruthy();
  });
});
