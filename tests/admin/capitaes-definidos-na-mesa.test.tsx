// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SecaoDraft } from "@/components/admin/e4/secao-draft";
import { retratoDaTabela } from "@/lib/draft/precos";
import type { DraftPublico, PreviaDoDraft } from "@/lib/draft/store";
import { tabelaQueFecha } from "@/lib/draft/tabela-que-fecha";
import { CAPITAES_23_10, POOL_4A_40_23_10 } from "../draft/_pool-4a";

/**
 * A mesa do draft com os capitães DEFINIDOS pela organização e o capitão SEM PREÇO (decisão
 * de 23/10/2026): o método padrão passa a ser «Definidos», o capitão aparece com a tag no
 * lugar dos pontos, a tabela diz que os capitães não entram nela, e «Salvar capitães» grava a
 * marcação pela rota da mesa.
 */

const id = (posicao: number) => `insc-${posicao}`;
const riotId = (posicao: number) => `Jogador${posicao}#BR1`;
const CAPITAES = CAPITAES_23_10.map(id);

const conta = tabelaQueFecha({
  pool: POOL_4A_40_23_10.map((j) => ({ id: id(j.posicao), elo: j })),
  capitaes: CAPITAES,
  times: 8,
  jogadoresPorTime: 5,
  orcamentoPorTime: 30,
  capitaoGratis: true,
});

function previa(over: Partial<PreviaDoDraft> = {}): PreviaDoDraft {
  return {
    config: { jogadoresPorTime: 5, maxTimes: 8, orcamentoPorTime: 30, segundosPorEscolha: 60 },
    times: 8,
    vagas: 40,
    aprovados: 40,
    aptos: 40,
    sobra: 0,
    pendentes: 0,
    impedimentos: [],
    totalDePontos: 240,
    orcamentoSugerido: null,
    jogadores: POOL_4A_40_23_10.map((j) => ({
      id: id(j.posicao),
      riotId: riotId(j.posicao),
      elo: j.elo,
      forca: j.elo,
      pontos: conta.precoDe.get(id(j.posicao)) ?? 0,
      rota1: j.rota1,
      rota2: j.rota2,
      organizador: j.organizador,
      temConta: true,
      capitao: CAPITAES.includes(id(j.posicao)),
      capitaoDefinido: CAPITAES.includes(id(j.posicao)),
    })),
    capitaesPelaRegra: [],
    empateNoCorte: null,
    faltamCapitaes: 0,
    semEloCongelado: [],
    inscricoesAbertas: false,
    tabela: { ...retratoDaTabela(conta.tabela), queda: null, capitaoGratis: true },
    fechaComOsCapitaesDaRegra: null,
    fechaComOsCapitaesDefinidos: true,
    capitaoGratis: true,
    capitaesDaTabela: "definidos",
    capitaesDefinidos: CAPITAES,
    capitaesMarcados: 8,
    avisosDosCapitaes: [],
    metodoPadrao: "definidos",
    ...over,
  };
}

function responder(corpo: unknown) {
  const fetchFalso = vi.fn<typeof fetch>(async () => new Response(JSON.stringify(corpo), { status: 200 }));
  vi.stubGlobal("fetch", fetchFalso);
  return fetchFalso;
}

function renderizar() {
  render(<SecaoDraft onAlert={vi.fn()} podeConduzir onDatasetMudou={vi.fn()} />);
}

/** A linha da tabela «Quem joga» deste Riot ID (no monitor). */
function linhaDe(rid: string): HTMLElement {
  const celula = screen.getAllByText(rid).find((el) => el.closest("tr"));
  return celula!.closest("tr") as HTMLElement;
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("a mesa com os capitães definidos", () => {
  it("o método padrão é «Definidos», com os 8 listados — um deles organizador", async () => {
    responder({ draft: null, sorteio: null, semSaida: null, previa: previa() });
    renderizar();
    const seletor = (await screen.findByLabelText("Como escolher os capitães")) as HTMLSelectElement;
    expect(seletor.value).toBe("definidos");
    expect(seletor.options[seletor.selectedIndex]!.textContent).toContain("Definidos pela organização (8 de 8)");
    expect(screen.getByText("Definidos:")).toBeTruthy();
    // O organizador capitão: nada de «não capitaneia» quando quem define é a organização.
    expect(within(linhaDe(riotId(1))).queryByText(/não capitaneia/)).toBeNull();
  });

  it("na lista de quem joga, o capitão tem a tag no lugar dos pontos; quem vai ser escolhido, o preço", async () => {
    responder({ draft: null, sorteio: null, semSaida: null, previa: previa() });
    renderizar();
    await screen.findByLabelText("Como escolher os capitães");
    const capitao = linhaDe(riotId(5));
    const celulaDePontos = capitao.querySelectorAll("td")[2]!;
    expect(celulaDePontos.textContent).toBe("capitão");
    const mestre = linhaDe(riotId(4));
    expect(mestre.querySelectorAll("td")[2]!.textContent).toBe("18");
    expect(screen.getByText("Pontos das escolhas")).toBeTruthy();
  });

  it("a tabela diz que os 8 capitães não entram nela e traz o preço de todas as divisões", async () => {
    responder({ draft: null, sorteio: null, semSaida: null, previa: previa() });
    renderizar();
    await screen.findByText("Tabela de pontos desta edição");
    const texto = document.body.textContent ?? "";
    expect(texto).toContain("Os 8 capitães não entram nesta tabela");
    expect(texto).toContain("cada time tem os 30 pontos para as 4 escolhas");
    expect(texto).toContain("Quem vai ser escolhido com o elo mais baixo custa 1 ponto e o jogador médio custa 7,5 (30 ÷ 4)");
    expect(screen.getByText("Preço de todas as divisões")).toBeTruthy();
    const todas = screen.getByRole("list", { name: "Preço de todas as divisões" });
    expect(todas.querySelectorAll("li")).toHaveLength(32);
    expect(todas.textContent).toContain("100–199 PDL");
  });

  it("«Editar capitães» abre a marcação, e «Salvar capitães» manda a lista para a rota", async () => {
    const fetchFalso = responder({ draft: null, sorteio: null, semSaida: null, previa: previa() });
    renderizar();
    fireEvent.click(await screen.findByRole("button", { name: /Editar capitães/ }));
    // Troca o capitão da posição 17 pelo da 13.
    fireEvent.click(screen.getByLabelText(`Marcar ${riotId(17)} como capitão`));
    const salvar = screen.getByRole("button", { name: /Salvar capitães/ }) as HTMLButtonElement;
    expect(salvar.disabled).toBe(true); // 7 de 8
    fireEvent.click(screen.getByLabelText(`Marcar ${riotId(13)} como capitão`));
    expect(salvar.disabled).toBe(false);
    fireEvent.click(salvar);
    await waitFor(() => {
      const post = fetchFalso.mock.calls.find((c) => c[1]?.method === "POST");
      expect(post).toBeTruthy();
      const corpo = JSON.parse(String(post![1]!.body)) as { acao: string; capitaes: string[] };
      expect(corpo.acao).toBe("capitaes");
      expect([...corpo.capitaes].sort()).toEqual([...CAPITAES.filter((c) => c !== id(17)), id(13)].sort());
    });
  });

  it("sortear pelos definidos manda o método «definidos»", async () => {
    const fetchFalso = responder({ draft: null, sorteio: null, semSaida: null, previa: previa() });
    renderizar();
    fireEvent.click(await screen.findByRole("button", { name: "Sortear" }));
    await waitFor(() => {
      const post = fetchFalso.mock.calls.find((c) => c[1]?.method === "POST");
      expect(JSON.parse(String(post![1]!.body))).toMatchObject({ acao: "montar", metodo: "definidos" });
    });
  });

  it("definidos em número errado: avisa e não deixa sortear por eles", async () => {
    responder({
      draft: null,
      sorteio: null,
      semSaida: null,
      previa: previa({
        capitaesDefinidos: CAPITAES.slice(0, 7),
        capitaesDaTabela: "regra",
        fechaComOsCapitaesDefinidos: null,
        avisosDosCapitaes: ["Há 7 capitães definidos entre os titulares aptos para 8 times: marque exatamente 8."],
      }),
    });
    renderizar();
    await screen.findByText("Capitães definidos: confira");
    expect((screen.getByRole("button", { name: "Sortear" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("com o draft sorteado: o elenco mostra a tag do capitão, sem «(0)», e «Editar capitães» fica travado", async () => {
    const draft: DraftPublico = {
      revisao: 4,
      fase: "preparando",
      times: [{ id: "time-1", nome: "CHAMA", cor: "#ef7d34", capitaoRiotId: riotId(5), gasto: 0, vagas: 4 }],
      elencos: { "time-1": [{ riotId: riotId(5), pontos: 0, rota1: "SUP", rota2: "TOP", elo: "Diamante", capitao: true }] },
      disponiveis: [],
      escolhaAtual: 0,
      totalEscolhas: 4,
      timeDaVezId: null,
      escolhiveis: [],
      prazoISO: null,
      motivoDaPausa: null,
      sorteioId: "S1",
      orcamentoPorTime: 30,
      jogadoresPorTime: 5,
      historico: [],
      capitaoGratis: true,
    };
    responder({ draft, sorteio: { semente: "S1", capitaes: [id(5)], emISO: new Date().toISOString() }, semSaida: null, previa: previa() });
    renderizar();
    await screen.findByText("1º · CHAMA");
    const item = screen.getAllByText((_, el) => el?.tagName === "LI" && (el.textContent ?? "").startsWith(riotId(5)))[0]!;
    expect(item.textContent).toContain("capitão");
    expect(item.textContent).not.toContain("(0)");
    expect((screen.getByRole("button", { name: /Editar capitães/ }) as HTMLButtonElement).disabled).toBe(true);
  });
});
