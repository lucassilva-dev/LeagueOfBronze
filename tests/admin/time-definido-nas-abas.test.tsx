// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { DadosEdicao, Inscrito } from "@/components/admin/e4/painel-edicao";
import { SecaoInscritos } from "@/components/admin/e4/secao-inscritos";
import { SecaoTimes } from "@/components/admin/e4/secao-times";
import { lerRegraDoSubstituto, tabelaDoSorteioDoDraft } from "@/components/admin/regra-do-substituto";
import { eloDoJogadorDaInscricao } from "@/lib/draft/elo-da-inscricao";
import { calcularTabela, retratoDaTabela } from "@/lib/draft/precos";
import { podeSubstituir, precosDoSorteio } from "@/lib/draft/previa-de-precos";
import type { DraftPublico } from "@/lib/draft/store";
import { regraDoSubstitutoPelosPrecos } from "@/lib/roster";
import { CAPITAES_23_10, POOL_4A_40_23_10, type JogadorDoPool } from "../draft/_pool-4a";

/**
 * O TIME DEFINIDO pela organização (decisão de 24/10/2026) nas abas Times e vagas e Inscritos
 * e na regra do substituto, sobre a lista real de 23/10 (40 titulares):
 *  - os cinco do time definido mostram a tag TIME DEFINIDO (com a rota) no lugar dos pontos —
 *    inclusive o capitão dele, que não leva a tag de CAPITÃO;
 *  - as contas do draft (tabela, capitães, "N × 30") são dos 7 times que disputam o draft, e o
 *    número de times da edição continua 8;
 *  - depois do sorteio, quem decide é o elenco do time com `definido` na visão pública do draft
 *    (`timeDefinidoDoDraft`): no draft eles constam com 0 ponto, e sem isso "cabiam" no lugar
 *    de qualquer titular;
 *  - nenhum deles substitui nem é substituído pela tabela (regra 6).
 *
 * O time definido do teste: 1 TOP (capitão definido, organizador), 4 JUNG, 2 MID, 3 ADC e
 * 31 SUP. Os outros 7 capitães definidos de 23/10 continuam (5, 29, 10, 20, 37, 15, 17).
 */

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  vi.unstubAllGlobals();
});

const nick = (posicao: number) => `Jogador${posicao}`;
const riotId = (posicao: number) => `${nick(posicao)}#BR1`;

const TIME_DEFINIDO: Readonly<Record<number, string>> = { 1: "TOP", 4: "JUNG", 2: "MID", 3: "ADC", 31: "SUP" };
const MEMBROS = Object.keys(TIME_DEFINIDO).map(Number);

function inscrito(j: JogadorDoPool, comMarca: boolean): Inscrito {
  const base: Inscrito = {
    id: `insc-${j.posicao}`,
    criado_em: `2026-10-06T12:${String(j.posicao).padStart(2, "0")}:00.000Z`,
    nick: nick(j.posicao),
    tag: "BR1",
    riot_id: riotId(j.posicao),
    nome_real: null,
    email: `j${j.posicao}@exemplo.com`,
    discord: `j${j.posicao}`,
    whatsapp: null,
    elo_declarado: j.elo,
    elo_verificado: j.elo,
    elo_fonte: "riot",
    elo_congelado: null,
    elo_riot: j.eloRiot ?? null,
    riot_divisao: j.divisao ?? null,
    riot_pdl: j.pdl ?? null,
    pontos: 4,
    rota_primaria: j.rota1,
    rota_secundaria: j.rota2,
    disponibilidade: ["noite"],
    quer_capitao: false,
    entrou_no_grupo: null,
    situacao: "apto",
    organizador: j.organizador,
    observacao: null,
    capitao: CAPITAES_23_10.includes(j.posicao),
  };
  // A coluna vem no `select *` das inscrições; o tipo do painel ainda não a declara.
  return comMarca ? ({ ...base, time_definido: TIME_DEFINIDO[j.posicao] ?? null } as Inscrito) : base;
}

/** A lista com o time definido marcado (`inscricoes.time_definido`). */
const COM_TIME = POOL_4A_40_23_10.map((j) => inscrito(j, true));
/** A mesma lista sem a marca — para provar que, depois do sorteio, quem manda é o draft. */
const SEM_MARCA = POOL_4A_40_23_10.map((j) => inscrito(j, false));

function config(): DadosEdicao["config"] {
  return {
    nome: "4ª Edição",
    abertura_inscricoes: null,
    fechamento_inscricoes: null,
    prazo_vinculo_riot: null,
    congelamento_elo: null,
    data_draft: null,
    inicio_campeonato: null,
    inscricoes_abertas: false,
    jogadores_por_time: 5,
    max_times: 8,
    orcamento_por_time: 30,
    min_ranqueadas: 5,
    dias_no_grupo: 60,
    prazo_pagamento_dias: 14,
    segundos_por_escolha: 60,
    taxa_centavos: 3000,
    pct_campeao: 70,
    chave_pix: null,
    responsavel_financeiro: null,
  };
}

function dados(lista: Inscrito[]): DadosEdicao {
  return {
    config: config(),
    inscritos: lista,
    conferencias: [],
    pagamentos: [],
    panorama: {
      inscritos: lista.length,
      elegiveis: lista.length,
      aprovados: lista.length,
      pendentes: 0,
      recusados: 0,
      times: 8,
      vagas: 40,
      sobra: 0,
      caixa: { recebido: 0, estornado: 0, aDevolver: 0, emCaixa: 0, arrecadado: 0, aReceber: 0, isento: 0 },
    },
    auditoria: [],
  };
}

const props = {
  executar: vi.fn(async () => true) as never,
  ocupado: false,
  podeConferir: true,
  podeFinanceiro: true,
  podeConfigurar: true,
};

/**
 * Um draft sorteado com o time definido (o `time-1`, com `definido`): os cinco com 0 ponto, como
 * o servidor monta. O resto está disponível a 4 pontos — o preço não importa aqui, só que os
 * cinco a 0 "caberiam" no lugar de qualquer um se o painel não soubesse do time definido.
 */
function draftComTimeDefinido(): DraftPublico {
  const doDraft = SEM_MARCA.filter((i) => !MEMBROS.includes(Number(i.id.slice(5))));
  const tabela = calcularTabela({ pool: doDraft.map(eloDoJogadorDaInscricao), times: 7, jogadoresPorTime: 5, orcamentoPorTime: 30 });
  const jogador = (posicao: number, pontos: number) => ({ riotId: riotId(posicao), pontos, rota1: "MID", rota2: "TOP", elo: "Ouro" });
  return {
    revisao: 3,
    fase: "rodando",
    times: [
      { id: "time-1", nome: "FERRO", cor: "#888888", capitaoRiotId: riotId(1), gasto: 0, vagas: 0, definido: true },
      { id: "time-2", nome: "CHAMA", cor: "#ef7d34", capitaoRiotId: riotId(5), gasto: 0, vagas: 4 },
    ],
    elencos: {
      "time-1": MEMBROS.map((p) => ({ ...jogador(p, 0), capitao: p === 1 })),
      "time-2": [{ ...jogador(5, 0), capitao: true }],
    },
    disponiveis: doDraft
      .filter((i) => i.id !== "insc-5")
      .map((i) => ({ id: i.id, ...jogador(Number(i.id.slice(5)), 4) })),
    escolhaAtual: 0,
    totalEscolhas: 28,
    timeDaVezId: "time-2",
    escolhiveis: [],
    prazoISO: null,
    motivoDaPausa: null,
    sorteioId: "semente",
    orcamentoPorTime: 30,
    jogadoresPorTime: 5,
    historico: [],
    tabelaDePontos: retratoDaTabela(tabela),
    capitaoGratis: true,
  };
}

/** Sem draft sorteado: a aba Times fica com a prévia. */
function semDraft() {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ draft: null }), { status: 200 })));
}

function comDraft(draft: DraftPublico) {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ draft }), { status: 200 })));
}

const seletor = () => screen.getByLabelText("Jogador a substituir") as HTMLSelectElement;
const opcao = (posicao: number) => [...seletor().options].find((o) => o.value === `insc-${posicao}`)!.textContent ?? "";

describe("Times e vagas com o time definido (prévia)", () => {
  it("as contas do draft são dos 7 times que escolhem; a edição continua com 8", () => {
    semDraft();
    render(<SecaoTimes {...props} dados={dados(COM_TIME)} />);
    const texto = document.body.textContent ?? "";
    expect(texto).toContain("o time definido + 7 no draft");
    expect(texto).toContain("Os 28 que vão ser escolhidos");
    expect(texto).toContain("(7 × 30)");
    expect(texto).toContain("os 7 capitães entram sem preço");
    expect(texto).toContain("Capitães: os 7 definidos pela organização");
    expect(texto).toContain("cada time do draft tem 30 pontos para as 4 escolhas");
    expect(texto).toContain("Calculada com os 35 titulares que vão ao draft");
    expect(texto).toContain(
      "Time definido pela organização: Jogador1 (TOP), Jogador4 (SEL), Jogador2 (MID), Jogador3 (ADC), Jogador31 (SUP).",
    );
    expect(texto).not.toContain("8 × 30");
    expect(texto).not.toContain("O time definido ainda não fecha");
  });

  it("no substituto, os cinco aparecem como «time definido» com a rota — o capitão dele também", () => {
    semDraft();
    render(<SecaoTimes {...props} dados={dados(COM_TIME)} />);
    expect(opcao(2)).toMatch(/· time definido · MID$/);
    expect(opcao(4)).toMatch(/· time definido · SEL$/);
    // O capitão do time definido não leva a tag de capitão: o time dele não vai ao draft.
    expect(opcao(1)).toMatch(/· time definido · TOP$/);
    expect(opcao(5)).toMatch(/· capitão$/);
    expect(opcao(32)).toMatch(/· \d+ pt$/);

    fireEvent.change(seletor(), { target: { value: "insc-2" } });
    expect(screen.getByText("Time definido não é substituído pela tabela")).toBeTruthy();
    expect(screen.queryByText("Capitão não é substituído pela tabela")).toBeNull();
  });

  it("nem substitui: ninguém do time definido entra na lista de quem pode substituir", () => {
    semDraft();
    render(<SecaoTimes {...props} dados={dados(COM_TIME)} />);
    fireEvent.change(seletor(), { target: { value: "insc-32" } });
    const lista = screen.getByText(/aprovados? pode(m)? entrar no lugar de/).parentElement!;
    const nomes = [...lista.querySelectorAll("tbody tr")].map((tr) => tr.querySelector("td")?.textContent ?? "");
    expect(nomes.length).toBeGreaterThan(0);
    for (const p of MEMBROS) expect(nomes).not.toContain(riotId(p));
  });

  it("marcado sem fechar (só 4 dos 5), avisa e a conta segue com os 8 no draft", () => {
    semDraft();
    const quatro = COM_TIME.map((i) => (i.id === "insc-31" ? ({ ...i, time_definido: null } as Inscrito) : i));
    render(<SecaoTimes {...props} dados={dados(quatro)} />);
    const texto = document.body.textContent ?? "";
    expect(texto).toContain("O time definido ainda não fecha");
    expect(texto).toContain("4 inscrições estão marcadas no time definido");
    expect(opcao(2)).not.toContain("time definido");
  });
});

describe("Times e vagas com o time definido (depois do sorteio)", () => {
  it("o elenco do time `definido` do draft vale, mesmo sem a marca nas inscrições", async () => {
    comDraft(draftComTimeDefinido());
    render(<SecaoTimes {...props} dados={dados(SEM_MARCA)} />);
    await screen.findByText("tabela do sorteio");
    expect(opcao(2)).toMatch(/· time definido$/);
    expect(opcao(1)).toMatch(/· time definido$/);
    expect(opcao(5)).toMatch(/· capitão$/);
  });

  it("os cinco (0 ponto no draft) não entram no lugar de quem custou 4", async () => {
    comDraft(draftComTimeDefinido());
    render(<SecaoTimes {...props} dados={dados(SEM_MARCA)} />);
    await screen.findByText("tabela do sorteio");
    fireEvent.change(seletor(), { target: { value: "insc-32" } });
    const lista = screen.getByText(/aprovados? pode(m)? entrar no lugar de/).parentElement!;
    const nomes = [...lista.querySelectorAll("tbody tr")].map((tr) => tr.querySelector("td")?.textContent ?? "");
    expect(nomes.length).toBeGreaterThan(0);
    for (const p of MEMBROS) expect(nomes).not.toContain(riotId(p));
  });
});

describe("Inscritos com o time definido", () => {
  const linha = (posicao: number) => document.getElementById(`inscrito-insc-${posicao}`)!.closest("tr")!;

  it("a coluna Pts mostra «time definido» com a rota nos cinco, e «capitão» nos capitães do draft", () => {
    render(<SecaoInscritos {...props} dados={dados(COM_TIME)} />);
    expect(within(linha(2)).getByText("time definido · MID")).toBeTruthy();
    expect(within(linha(31)).getByText("time definido · SUP")).toBeTruthy();
    expect(within(linha(1)).getByText("time definido · TOP")).toBeTruthy();
    expect(within(linha(1)).queryByText("capitão")).toBeNull();
    expect(within(linha(5)).getByText("capitão")).toBeTruthy();
    expect(within(linha(32)).queryByText(/time definido/)).toBeNull();
  });

  it("a gaveta diz que ele está no time definido, sem preço", () => {
    render(<SecaoInscritos {...props} dados={dados(COM_TIME)} />);
    fireEvent.click(document.getElementById("inscrito-insc-2")!);
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("tab", { name: /^Contato/ }));
    const cartao = screen.getByText("Pontos no draft").parentElement!;
    expect(cartao.textContent).toContain("Time definido");
    expect(cartao.textContent).toContain("time definido · MID");
    expect(cartao.textContent).not.toContain("Capitão");
  });
});

describe("precosDoSorteio com o time definido do draft", () => {
  const draft = draftComTimeDefinido();
  const sorteio = tabelaDoSorteioDoDraft(draft)!;
  const precos = (timeDefinidoDoDraft?: ReadonlySet<string>) =>
    precosDoSorteio({
      retrato: sorteio.retrato,
      pontosDoDraft: sorteio.pontos,
      inscritos: SEM_MARCA,
      capitaesDoDraft: sorteio.capitaes,
      capitaoGratis: sorteio.capitaoGratis,
      timeDefinidoDoDraft,
    });
  const de = (posicao: number) => SEM_MARCA.find((i) => i.id === `insc-${posicao}`)!;

  it("a leitura do draft acha o elenco do time `definido`", () => {
    expect([...sorteio.timeDefinido].sort()).toEqual(MEMBROS.map(riotId).sort());
    expect(sorteio.capitaes.has(riotId(1))).toBe(true);
  });

  it("os cinco ficam sem preço e fora da regra 6; os times são os 7 do draft + o definido", () => {
    const p = precos(sorteio.timeDefinido);
    expect(p.timesNoDraft).toBe(7);
    expect(p.times).toBe(8);
    for (const m of MEMBROS) {
      expect(p.doTimeDefinido(de(m))).toBe(true);
      expect(p.semPreco(de(m))).toBe(true);
      expect(podeSubstituir(p, de(m), de(32))).toBe(false);
      expect(podeSubstituir(p, de(32), de(m))).toBe(false);
    }
    expect(p.doTimeDefinido(de(5))).toBe(false);
    expect(p.semPreco(de(5))).toBe(true);
  });

  it("sem `timeDefinidoDoDraft`, o 0 do draft deixava o membro substituir qualquer um", () => {
    const p = precos();
    expect(p.doTimeDefinido(de(2))).toBe(false);
    expect(podeSubstituir(p, de(2), de(32))).toBe(true);
  });
});

describe("regra do substituto no painel de séries com o time definido", () => {
  const draft = draftComTimeDefinido();

  it("quem está no time definido não tem preço: a comparação volta «sem valor»", () => {
    const sorteio = tabelaDoSorteioDoDraft(draft)!;
    const precos = precosDoSorteio({
      retrato: sorteio.retrato,
      pontosDoDraft: sorteio.pontos,
      inscritos: SEM_MARCA,
      capitaesDoDraft: sorteio.capitaes,
      capitaoGratis: sorteio.capitaoGratis,
      timeDefinidoDoDraft: sorteio.timeDefinido,
    });
    const regra = regraDoSubstitutoPelosPrecos(precos, SEM_MARCA);
    expect(regra.preco({ nick: riotId(2) })).toBeNull();
    expect(regra.comparar({ nick: riotId(32) }, { nick: riotId(2) })).toBeNull();
    expect(regra.comparar({ nick: riotId(2) }, { nick: riotId(32) })).toBeNull();
    // O capitão sem preço também; quem tem preço segue comparando.
    expect(regra.comparar({ nick: riotId(32) }, { nick: riotId(5) })).toBeNull();
    expect(regra.comparar({ nick: riotId(32) }, { nick: riotId(40) })).toBe(true);
  });

  it("lerRegraDoSubstituto passa o time definido e os capitães do draft para os preços", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: RequestInfo | URL) =>
        String(url).includes("/api/admin/edicao")
          ? new Response(JSON.stringify({ config: config(), inscritos: SEM_MARCA }), { status: 200 })
          : new Response(JSON.stringify({ draft }), { status: 200 }),
      ),
    );
    const regra = (await lerRegraDoSubstituto())!;
    expect(regra).not.toBeNull();
    expect(regra.preco({ nick: riotId(2) })).toBeNull();
    expect(regra.comparar({ nick: riotId(32) }, { nick: riotId(2) })).toBeNull();
    expect(regra.comparar({ nick: riotId(32) }, { nick: riotId(5) })).toBeNull();
    expect(regra.preco({ nick: riotId(32) })).toBe(4);
  });
});
