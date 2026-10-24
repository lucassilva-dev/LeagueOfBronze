// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SecaoDraft } from "@/components/admin/e4/secao-draft";
import { ModoCompacto } from "@/components/admin/responsivo";
import { retratoDaTabela } from "@/lib/draft/precos";
import type { DraftPublico, PreviaDoDraft } from "@/lib/draft/store";
import { tabelaQueFecha } from "@/lib/draft/tabela-que-fecha";
import { CAPITAES_23_10, POOL_4A_40_23_10 } from "../draft/_pool-4a";

/**
 * A mesa do draft com o TIME DEFINIDO pela organização (decisão de 24/10/2026): os cinco
 * organizadores já entram prontos e não participam do draft. São 8 times, mas 7 disputam as
 * escolhas — a conta dos capitães e a soma da tabela são dos 7 (7 × 30 = 210), a lista de quem
 * joga mostra a tag TIME DEFINIDO no lugar do preço, e ninguém do time definido se marca como
 * capitão do draft. Depois do sorteio, o time definido aparece na grade sem gasto e sem vaga, e
 * não conta nas escolhas que a ordem perdeu.
 */

const id = (posicao: number) => `insc-${posicao}`;
const riotId = (posicao: number) => `Jogador${posicao}#BR1`;

/** O time definido: posição na lista → rota no time. O 27 (JUNG) é o capitão dele. */
const MEMBROS: ReadonlyMap<number, "TOP" | "JUNG" | "MID" | "ADC" | "SUP"> = new Map([
  [1, "TOP"],
  [27, "JUNG"],
  [2, "MID"],
  [3, "ADC"],
  [31, "SUP"],
]);
const CAPITAO_DO_DEFINIDO = 27;
/** Os 7 capitães do draft: os de 23/10 sem o 1, que está no time definido. */
const CAPITAES_DO_DRAFT = CAPITAES_23_10.filter((p) => !MEMBROS.has(p)).map(id);

const doDraft = POOL_4A_40_23_10.filter((j) => !MEMBROS.has(j.posicao));
const conta = tabelaQueFecha({
  pool: doDraft.map((j) => ({ id: id(j.posicao), elo: j })),
  capitaes: CAPITAES_DO_DRAFT,
  times: 7,
  jogadoresPorTime: 5,
  orcamentoPorTime: 30,
  capitaoGratis: true,
});

function timeDefinido(over: Partial<NonNullable<PreviaDoDraft["timeDefinido"]>> = {}): NonNullable<PreviaDoDraft["timeDefinido"]> {
  const ordem = ["TOP", "JUNG", "MID", "ADC", "SUP"];
  return {
    ativo: true,
    capitaoRiotId: riotId(CAPITAO_DO_DEFINIDO),
    membros: [...MEMBROS]
      .sort((a, b) => ordem.indexOf(a[1]) - ordem.indexOf(b[1]))
      .map(([posicao, rota]) => ({
        riotId: riotId(posicao),
        rota,
        elo: POOL_4A_40_23_10.find((j) => j.posicao === posicao)!.elo,
        capitao: posicao === CAPITAO_DO_DEFINIDO,
      })),
    impedimentos: [],
    ...over,
  };
}

function previa(over: Partial<PreviaDoDraft> = {}): PreviaDoDraft {
  const ativo = over.timeDefinido === undefined || over.timeDefinido?.ativo === true;
  return {
    config: { jogadoresPorTime: 5, maxTimes: 8, orcamentoPorTime: 30, segundosPorEscolha: 60 },
    times: 8,
    timesNoDraft: 7,
    vagas: 40,
    aprovados: 40,
    aptos: 40,
    sobra: 0,
    pendentes: 0,
    impedimentos: [],
    totalDePontos: doDraft
      .filter((j) => !CAPITAES_DO_DRAFT.includes(id(j.posicao)))
      .reduce((soma, j) => soma + (conta.precoDe.get(id(j.posicao)) ?? 0), 0),
    orcamentoSugerido: null,
    jogadores: POOL_4A_40_23_10.map((j) => {
      const membro = ativo ? (MEMBROS.get(j.posicao) ?? null) : null;
      const capitaoDoDraft = CAPITAES_DO_DRAFT.includes(id(j.posicao));
      return {
        id: id(j.posicao),
        riotId: riotId(j.posicao),
        elo: j.elo,
        forca: j.elo,
        pontos: membro ? 0 : (conta.precoDe.get(id(j.posicao)) ?? 0),
        rota1: j.rota1,
        rota2: j.rota2,
        organizador: j.organizador,
        temConta: true,
        capitao: capitaoDoDraft || (membro !== null && j.posicao === CAPITAO_DO_DEFINIDO),
        capitaoDefinido: capitaoDoDraft || j.posicao === CAPITAO_DO_DEFINIDO,
        timeDefinido: membro,
      };
    }),
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
    capitaesDefinidos: CAPITAES_DO_DRAFT,
    capitaesMarcados: 8,
    avisosDosCapitaes: [],
    metodoPadrao: "definidos",
    timeDefinido: timeDefinido(),
    ...over,
  };
}

function responder(corpo: unknown) {
  const fetchFalso = vi.fn<typeof fetch>(async () => new Response(JSON.stringify(corpo), { status: 200 }));
  vi.stubGlobal("fetch", fetchFalso);
  return fetchFalso;
}

function renderizar(compacto = false) {
  render(
    <ModoCompacto ativo={compacto}>
      <SecaoDraft onAlert={vi.fn()} podeConduzir onDatasetMudou={vi.fn()} />
    </ModoCompacto>,
  );
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

describe("a mesa com o time definido pela organização", () => {
  it("o bloco do time definido lista os 5 na ordem das rotas, com o capitão marcado", async () => {
    responder({ draft: null, sorteio: null, semSaida: null, previa: previa() });
    renderizar();
    const lista = await screen.findByRole("list", { name: "Membros do time definido" });
    expect(screen.getByText("Time definido pela organização")).toBeTruthy();
    expect(document.body.textContent).toContain("Já entra pronto e não participa do draft");
    const itens = within(lista).getAllByRole("listitem");
    expect(itens.map((li) => li.textContent?.slice(0, 3))).toEqual(["TOP", "SEL", "MID", "ADC", "SUP"]);
    expect(itens[0]!.textContent).toContain("Jogador1");
    expect(itens[1]!.textContent).toContain(`Jogador${CAPITAO_DO_DEFINIDO}`);
    expect(itens[1]!.textContent).toContain("capitão");
    expect(itens.filter((li) => li.textContent?.includes("capitão"))).toHaveLength(1);
    expect(within(lista.parentElement!.parentElement!).queryByText("pronto")).toBeTruthy();
  });

  it("a conta é dos 7 que disputam o draft: 7 × 30 = 210 e (7 de 7); a métrica de times segue com 8", async () => {
    responder({ draft: null, sorteio: null, semSaida: null, previa: previa() });
    renderizar();
    const seletor = (await screen.findByLabelText("Como escolher os capitães")) as HTMLSelectElement;
    expect(seletor.options[seletor.selectedIndex]!.textContent).toContain("Definidos pela organização (7 de 7)");
    const texto = document.body.textContent ?? "";
    expect(texto).toContain("7 × 30 = 210");
    expect(texto).not.toContain("8 × 30");
    expect(texto).toContain("1 definido pela organização · 7 vão ao draft");
    expect(texto).toContain("O capitão do time definido pela organização (Jogador27#BR1) não conta aqui");
    expect((screen.getByRole("button", { name: "Sortear" }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("na lista de quem joga, o membro tem a tag TIME DEFINIDO com a rota no lugar do preço, sem CAPITÃO", async () => {
    responder({ draft: null, sorteio: null, semSaida: null, previa: previa() });
    renderizar();
    await screen.findByLabelText("Como escolher os capitães");
    const top = linhaDe(riotId(1));
    expect(top.querySelectorAll("td")[2]!.textContent).toBe("time definido· TOP");
    // O 1 era capitão em 23/10: no time definido, nenhuma marca de capitão do draft.
    expect(within(top).queryByText(/capitão/)).toBeNull();
    const capitao = linhaDe(riotId(CAPITAO_DO_DEFINIDO));
    expect(capitao.querySelectorAll("td")[2]!.textContent).toBe("time definido· SEL");
    expect(within(capitao).getByText("capitão do time definido")).toBeTruthy();
    expect(within(capitao).queryByText("capitão definido")).toBeNull();
    // Quem vai ao draft segue como antes: capitão com a tag, o resto com o preço.
    expect(linhaDe(riotId(5)).querySelectorAll("td")[2]!.textContent).toBe("capitão");
    expect(linhaDe(riotId(4)).querySelectorAll("td")[2]!.textContent).toBe(String(conta.precoDe.get(id(4))));
  });

  it("«Editar capitães» não oferece marcar quem está no time definido, e salva só os 7 do draft", async () => {
    const fetchFalso = responder({ draft: null, sorteio: null, semSaida: null, previa: previa() });
    renderizar();
    fireEvent.click(await screen.findByRole("button", { name: /Editar capitães/ }));
    for (const posicao of MEMBROS.keys()) {
      expect(screen.queryByLabelText(`Marcar ${riotId(posicao)} como capitão`)).toBeNull();
    }
    expect(screen.getByLabelText(`Marcar ${riotId(5)} como capitão`)).toBeTruthy();
    expect(screen.getByText("7 de 7 marcados")).toBeTruthy();
    expect(document.body.textContent).toContain("Marque os 7 capitães");
    const salvar = screen.getByRole("button", { name: /Salvar capitães/ }) as HTMLButtonElement;
    expect(salvar.disabled).toBe(false);
    fireEvent.click(salvar);
    await waitFor(() => {
      const post = fetchFalso.mock.calls.find((c) => c[1]?.method === "POST");
      expect(post).toBeTruthy();
      const corpo = JSON.parse(String(post![1]!.body)) as { acao: string; capitaes: string[] };
      expect(corpo.acao).toBe("capitaes");
      expect([...corpo.capitaes].sort()).toEqual([...CAPITAES_DO_DRAFT].sort());
    });
  });

  it("à mão, no celular: o cartão do membro tem a tag e nenhuma marcação de capitão", async () => {
    responder({ draft: null, sorteio: null, semSaida: null, previa: previa() });
    renderizar(true);
    const seletor = await screen.findByLabelText("Como escolher os capitães");
    fireEvent.change(seletor, { target: { value: "manual" } });
    expect(screen.getByText("0 de 7 marcados")).toBeTruthy();
    expect(screen.queryByText(`: ${riotId(1)}`)).toBeNull();
    expect(screen.queryByText(`: ${riotId(CAPITAO_DO_DEFINIDO)}`)).toBeNull();
    expect(screen.getByText(`: ${riotId(5)}`)).toBeTruthy();
    expect(screen.getAllByText("time definido").length).toBeGreaterThanOrEqual(5);
  });

  it("time definido que não vale: o bloco mostra o que falta acertar", async () => {
    const impedimento = "O time definido pela organização tem 4 jogadores e precisa de exatamente 5.";
    responder({
      draft: null,
      sorteio: null,
      semSaida: null,
      previa: previa({
        times: 8,
        timesNoDraft: 8,
        impedimentos: [impedimento],
        timeDefinido: timeDefinido({ ativo: false, capitaoRiotId: null, impedimentos: [impedimento] }),
      }),
    });
    renderizar();
    await screen.findByText("O time definido ainda não está pronto: o sorteio fica travado");
    expect(screen.getByText("falta acertar")).toBeTruthy();
    expect(screen.getAllByText(impedimento).length).toBe(2);
    expect((screen.getByRole("button", { name: "Sortear" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("com o draft sorteado: o time definido vem sem gasto e sem vaga, e não conta nas escolhas que faltam", async () => {
    const times: DraftPublico["times"] = [
      ...CAPITAES_DO_DRAFT.slice(0, 3).map((c, i) => ({
        id: `time-${i + 1}`,
        nome: `TIME${i + 1}`,
        cor: "#ef7d34",
        capitaoRiotId: riotId(Number(c.slice(5))),
        gasto: 0,
        vagas: 4,
      })),
      // O sorteio é um só: o time definido sai no meio, e a grade o leva para o fim.
      { id: "time-4", nome: "DEFINIDO", cor: "#5aa2ff", capitaoRiotId: riotId(CAPITAO_DO_DEFINIDO), gasto: 0, vagas: 0, definido: true },
      ...CAPITAES_DO_DRAFT.slice(3).map((c, i) => ({
        id: `time-${i + 5}`,
        nome: `TIME${i + 5}`,
        cor: "#ef7d34",
        capitaoRiotId: riotId(Number(c.slice(5))),
        gasto: 0,
        vagas: 4,
      })),
    ];
    const elencos: DraftPublico["elencos"] = {};
    for (const t of times) {
      elencos[t.id] = t.definido
        ? timeDefinido().membros.map((m) => ({ riotId: m.riotId, pontos: 0, rota1: m.rota, rota2: "", elo: m.elo, capitao: m.capitao }))
        : [{ riotId: t.capitaoRiotId, pontos: 0, rota1: "MID", rota2: "TOP", elo: "Diamante", capitao: true }];
    }
    const draft: DraftPublico = {
      revisao: 4,
      fase: "preparando",
      times,
      elencos,
      disponiveis: [],
      escolhaAtual: 0,
      totalEscolhas: 28,
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
    responder({ draft, sorteio: { semente: "S1", capitaes: [], emISO: new Date().toISOString() }, semSaida: null, previa: previa() });
    renderizar();
    await screen.findByText("1º · TIME1");
    // Os 7 numerados na ordem; o definido sem número (não está na ordem de escolha).
    expect(screen.getByText("4º · TIME5")).toBeTruthy();
    expect(screen.getByText("7º · TIME8")).toBeTruthy();
    const nome = screen.getByText("DEFINIDO");
    const cartao = nome.parentElement!.parentElement as HTMLElement;
    expect(cartao.textContent).toContain("time definido");
    expect(cartao.textContent).not.toContain("/30 pts");
    expect(cartao.textContent).not.toContain("(0)");
    expect(cartao.textContent).not.toContain("vaga");
    expect(within(cartao).getAllByRole("img", { name: "capitão" })).toHaveLength(1);
    // 7 times × 4 escolhas = 28: a ordem não perdeu nada. Contando o definido, seriam 4 "a menos".
    expect(document.body.textContent).not.toContain("escolhas a menos");
    expect(screen.getAllByText("0/30 pts")).toHaveLength(7);
  });
});
