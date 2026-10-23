// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  EloPorRota,
  destaquesDoQuadro,
  montarEloPorRota,
  type JogadorDoQuadro,
} from "@/components/admin/e4/elo-por-rota";
import type { DadosEdicao, Inscrito } from "@/components/admin/e4/painel-edicao";
import { SecaoTimes } from "@/components/admin/e4/secao-times";
import { ModoCompacto } from "@/components/admin/responsivo";

/**
 * Elo por rota — o quadro que a organização tira print e manda no grupo.
 *
 * O que não pode quebrar: a conta (quem conta onde, no modo principal, só na secundária e
 * nas duas), e as promessas do print — nenhum ponto nunca, e nenhum nick à vista na matriz.
 * O modo ideal é a exceção pedida: ele mostra QUEM fica em cada rota, mas ainda sem ponto.
 */

afterEach(() => {
  cleanup();
  document.body.style.overflow = "";
});

function jogador(nick: string, elo: string, primaria: string, secundaria: string): JogadorDoQuadro {
  return { nick, elo, primaria, secundaria };
}

const POOL: JogadorDoQuadro[] = [
  jogador("Ana", "Mestre", "TOP", "JUNG"),
  jogador("Bia", "Diamante", "JUNG", "MID"),
  jogador("Caio", "Diamante", "ADC", "SUP"),
  jogador("Duda", "Platina", "ADC", "MID"),
  jogador("Edu", "Prata", "SUP", "SUP"),
];

const NICKS = /Ana|Bia|Caio|Duda|Edu/;

/**
 * As duas promessas do print, no TEXTO que aparece (o `title` não entra em textContent):
 * nenhum preço de elo — nem "pontos" nem "pts", a forma que o resto do painel usa — e
 * nenhum nick.
 */
function semPontosNemNicks(no: HTMLElement) {
  const texto = no.textContent ?? "";
  expect(texto).not.toMatch(/ponto/i);
  expect(texto).not.toMatch(/\bpts?\b/i);
  expect(texto).not.toMatch(NICKS);
}

describe("montarEloPorRota", () => {
  it("rota principal: cada pessoa conta uma vez, na rota que marcou primeiro", () => {
    const q = montarEloPorRota(POOL, "principal");
    const por = Object.fromEntries(q.rotas.map((c) => [c.meta.key, c]));

    expect(q.pessoas).toBe(5);
    expect(q.rotas.map((c) => c.total)).toEqual([1, 1, 0, 2, 1]);
    expect(por.ADC.porElo).toEqual({ diamante: 1, platina: 1 });
    expect(por.ADC.principais).toBe(2);
    // A escada só tem os elos que aparecem, do mais alto ao mais baixo.
    expect(q.elos.map((e) => e.key)).toEqual(["mestre", "diamante", "platina", "prata"]);
    expect(q.totalPorElo).toEqual({ mestre: 1, diamante: 2, platina: 1, prata: 1 });
    expect(q.maiorCelula).toBe(1);
    // Diamante (6) e Platina (4) → degrau 5 = Esmeralda.
    expect(por.ADC.medio?.key).toBe("esmeralda");
    expect(por.MID.medio).toBeNull();
  });

  it("com a secundária: conta nas duas rotas, sem dobrar quem marcou a mesma rota duas vezes", () => {
    const q = montarEloPorRota(POOL, "ambas");
    const por = Object.fromEntries(q.rotas.map((c) => [c.meta.key, c]));

    // Pessoas continuam 5; as rotas somam mais que isso.
    expect(q.pessoas).toBe(5);
    expect(por.MID.total).toBe(2);
    expect(por.MID.principais).toBe(0);
    expect(por.SUP.total).toBe(2); // Edu (SUP/SUP) uma vez + Caio pela secundária
    expect(por.SUP.nicksPorElo.prata).toEqual(["Edu"]);
    // O total por elo é de PESSOAS, não de presenças.
    expect(q.totalPorElo.diamante).toBe(2);
  });

  it("só a secundária: cada pessoa conta uma vez, na rota que marcou em segundo", () => {
    const q = montarEloPorRota(POOL, "secundaria");
    const por = Object.fromEntries(q.rotas.map((c) => [c.meta.key, c]));

    expect(q.pessoas).toBe(5);
    expect(q.rotas.map((c) => c.total)).toEqual([0, 1, 2, 0, 2]);
    expect(por.MID.porElo).toEqual({ diamante: 1, platina: 1 });
    expect(por.JUNG.nicksPorElo.mestre).toEqual(["Ana"]);
    // A cobertura continua sendo de titular, pela principal.
    expect(por.ADC.principais).toBe(2);
    expect(por.MID.principais).toBe(0);
    // Secundária ilegível tira a pessoa deste modo (e só deste).
    const ilegivel = montarEloPorRota([jogador("X", "Ouro", "TOP", "???")], "secundaria");
    expect(ilegivel.foraDoQuadro).toBe(1);
    expect(ilegivel.pessoas).toBe(0);
  });

  it("elo ou rota principal ilegível fica fora e é contado; secundária ilegível só não soma", () => {
    const q = montarEloPorRota(
      [
        jogador("X", "Lendário", "TOP", "MID"),
        jogador("Y", "Ouro", "???", "MID"),
        jogador("Z", "Ouro", "SEL", "???"),
      ],
      "ambas",
    );
    expect(q.foraDoQuadro).toBe(2);
    expect(q.pessoas).toBe(1);
    // "SEL" é o rótulo da selva e é aceito como JUNG.
    expect(q.rotas.find((c) => c.meta.key === "JUNG")?.total).toBe(1);
    expect(q.rotas.find((c) => c.meta.key === "MID")?.total).toBe(0);
  });

  it("elo ilegível tira da escada, mas não da cobertura da rota (igual à Cobertura de rotas)", () => {
    const q = montarEloPorRota([jogador("X", "Sem ranque", "ADC", "MID"), jogador("Y", "Ouro", "ADC", "MID")], "principal");
    const adc = q.rotas.find((c) => c.meta.key === "ADC");
    expect(adc?.total).toBe(1);
    expect(adc?.principais).toBe(2);
    expect(q.foraDoQuadro).toBe(1);
  });
});

describe("destaquesDoQuadro", () => {
  it("empate no extremo leva todos os empatados; empate geral some", () => {
    const d = destaquesDoQuadro(montarEloPorRota(POOL, "principal"));
    expect(d.maisDisputada.map((c) => c.meta.key)).toEqual(["ADC"]);
    expect(d.maisEscassa.map((c) => c.meta.key)).toEqual(["MID"]);
    expect(d.maiorMedia.map((c) => c.meta.key)).toEqual(["TOP"]);
    expect(d.topo?.elo.key).toBe("mestre");
    expect(d.topo?.rotas.map((c) => c.meta.key)).toEqual(["TOP"]);

    const iguais = destaquesDoQuadro(
      montarEloPorRota(
        ["TOP", "JUNG", "MID", "ADC", "SUP"].map((r, i) => jogador(`J${i}`, "Ouro", r, r)),
        "principal",
      ),
    );
    expect(iguais.maisDisputada).toEqual([]);
    expect(iguais.maisEscassa).toEqual([]);
    expect(iguais.maiorMedia).toEqual([]);
  });

  it("maior elo médio compara o elo que aparece escrito, não a média crua", () => {
    // Médias 3,33 (TOP), 3 (JUNG, MID, ADC) e 3,25 (SUP): as cinco colunas mostram Ouro.
    const ouros = destaquesDoQuadro(
      montarEloPorRota(
        [
          jogador("t1", "Ouro", "TOP", "TOP"),
          jogador("t2", "Ouro", "TOP", "TOP"),
          jogador("t3", "Platina", "TOP", "TOP"),
          jogador("j1", "Ouro", "JUNG", "JUNG"),
          jogador("m1", "Prata", "MID", "MID"),
          jogador("m2", "Platina", "MID", "MID"),
          jogador("a1", "Ouro", "ADC", "ADC"),
          jogador("s1", "Ouro", "SUP", "SUP"),
          jogador("s2", "Platina", "SUP", "SUP"),
          jogador("s3", "Prata", "SUP", "SUP"),
          jogador("s4", "Platina", "SUP", "SUP"),
        ],
        "principal",
      ),
    );
    expect(ouros.maiorMedia).toEqual([]);

    // Duas rotas exibindo Diamante (uma com média 5,5, outra 6): as duas entram.
    const empate = destaquesDoQuadro(
      montarEloPorRota(
        [
          jogador("a", "Esmeralda", "TOP", "TOP"),
          jogador("b", "Diamante", "TOP", "TOP"),
          jogador("c", "Diamante", "JUNG", "JUNG"),
          jogador("d", "Prata", "MID", "MID"),
        ],
        "principal",
      ),
    );
    expect(empate.maiorMedia.map((c) => c.meta.key)).toEqual(["TOP", "JUNG"]);
  });
});

describe("<EloPorRota>", () => {
  it("no monitor: matriz com as cinco rotas, cobertura pelos times e nenhum ponto", () => {
    render(<EloPorRota jogadores={POOL} times={2} />);
    const tabela = screen.getByRole("table", { name: "Divisão de elo por rota" });

    expect(within(tabela).getAllByRole("columnheader")).toHaveLength(7); // Elo + 5 rotas + Total
    expect(within(tabela).getByRole("cell", { name: "Atirador, Diamante: 1" })).toBeTruthy();
    expect(within(tabela).getByRole("cell", { name: "Meio, Mestre: 0" })).toBeTruthy();
    // Duas principais de ADC cobrem 2 times; Meio não tem nenhuma.
    expect(screen.getAllByText("ok").length).toBeGreaterThan(0);
    expect(screen.getByText("falta 2")).toBeTruthy();
    // A cobertura também chega ao leitor de tela pelo cabeçalho da coluna.
    expect(within(tabela).getByRole("columnheader", { name: "Meio: 0 jogadores, falta 2 para 2 times" })).toBeTruthy();
    // O print não pode levar preço de elo nem nick; os nicks só vivem no `title`.
    semPontosNemNicks(document.body);
    expect(within(tabela).getByRole("cell", { name: "Atirador, Diamante: 1" }).getAttribute("title")).toContain("Caio");
  });

  it("o modo com secundária muda a conta e o subtítulo, some com a cobertura e troca Total por Pessoas", () => {
    render(<EloPorRota jogadores={POOL} times={2} />);
    fireEvent.click(screen.getByRole("button", { name: "Principal + secundária" }));

    expect(screen.getByText(/principal \+ secundária \(cada um/)).toBeTruthy();
    expect(screen.getByRole("cell", { name: "Meio, Diamante: 1" })).toBeTruthy();
    expect(screen.queryByText(/^falta/)).toBeNull();
    // Diamante aparece em quatro rotas, mas são duas pessoas.
    expect(screen.getByRole("columnheader", { name: "Pessoas" })).toBeTruthy();
    expect(screen.getByRole("cell", { name: "Diamante, pessoas: 2" })).toBeTruthy();
    semPontosNemNicks(document.body);
  });

  it("só a secundária: a matriz conta a segunda rota e não mostra cobertura", () => {
    render(<EloPorRota jogadores={POOL} times={2} />);
    fireEvent.click(screen.getByRole("button", { name: "Só secundária" }));

    expect(screen.getByText(/só a rota secundária/)).toBeTruthy();
    expect(screen.getByRole("cell", { name: "Meio, Diamante: 1" })).toBeTruthy();
    expect(screen.getByRole("cell", { name: "Atirador, Diamante: 0" })).toBeTruthy();
    expect(screen.queryByText(/^falta/)).toBeNull();
    semPontosNemNicks(document.body);
  });

  it("no celular: sem tabela de verdade, sem coluna de total e sem nick nem no title", () => {
    render(
      <ModoCompacto ativo>
        <EloPorRota jogadores={POOL} times={2} />
      </ModoCompacto>,
    );
    expect(document.querySelector("table")).toBeNull();
    expect(screen.getAllByRole("columnheader")).toHaveLength(6);
    // Nem no `title`: no celular não há mouse para justificar.
    expect(document.body.innerHTML).not.toMatch(NICKS);
    semPontosNemNicks(document.body);
    // As siglas desfazem a confusão entre os emblemas azulados.
    expect(screen.getAllByText("DIA").length).toBeGreaterThan(0);
  });

  it("a tela de print: foco dentro, sem nick nem no title, Tab parado e Esc devolvendo rolagem e foco", () => {
    render(<EloPorRota jogadores={POOL} times={2} />);
    const abrir = screen.getByRole("button", { name: /Abrir para print/ });
    abrir.focus();
    fireEvent.click(abrir);

    const tela = screen.getByRole("dialog", { name: /tela cheia para print/ });
    expect(within(tela).getByRole("table", { name: "Divisão de elo por rota" })).toBeTruthy();
    expect(document.activeElement).toBe(tela);
    expect(document.body.style.overflow).toBe("hidden");
    // O tooltip com nicks sairia no print: dentro da tela cheia ele não existe.
    expect(tela.innerHTML).not.toMatch(NICKS);
    semPontosNemNicks(tela);

    const tab = new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true });
    window.dispatchEvent(tab);
    expect(tab.defaultPrevented).toBe(true);

    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.body.style.overflow).toBe("");
    expect(document.activeElement).toBe(abrir);
  });

  it("sem ninguém na conta, avisa e não deixa abrir o print", () => {
    render(<EloPorRota jogadores={[]} times={0} />);
    expect(screen.getByText(/Ninguém na conta ainda/)).toBeTruthy();
    expect((screen.getByRole("button", { name: /Abrir para print/ }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("com todas as fichas ilegíveis, manda corrigir a ficha em vez de dizer que não há ninguém", () => {
    render(<EloPorRota jogadores={[jogador("X", "Lendário", "ADC", "SUP")]} times={0} />);
    expect(screen.queryByText(/Ninguém na conta ainda/)).toBeNull();
    expect(screen.getByText(/1 ficha está com elo ou rota que a tabela do site não reconhece/)).toBeTruthy();
  });
});

// ---------------------------------------------------------------- o ideal

/** Dez jogadores, dois times: a Selva tem um só na principal, o Atirador tem três. */
const POOL_IDEAL: JogadorDoQuadro[] = [
  jogador("Ana", "Mestre", "TOP", "JUNG"),
  jogador("Beto", "Ouro", "TOP", "MID"),
  jogador("Cris", "Diamante", "JUNG", "MID"),
  jogador("Davi", "Esmeralda", "MID", "TOP"),
  jogador("Eva", "Prata", "MID", "SUP"),
  jogador("Fabi", "Diamante", "ADC", "JUNG"),
  jogador("Gui", "Platina", "ADC", "SUP"),
  jogador("Hugo", "Prata", "ADC", "JUNG"),
  jogador("Ivo", "Ouro", "SUP", "ADC"),
  jogador("Juca", "Ferro", "SUP", "TOP"),
];

describe("<EloPorRota> no modo ideal", () => {
  it("mostra quem fica em cada rota, com o veredito e a marca de quem foi para a secundária", () => {
    render(<EloPorRota jogadores={POOL_IDEAL} times={2} />);
    fireEvent.click(screen.getByRole("button", { name: "Ideal: 2 por rota" }));

    expect(screen.getByRole("heading", { name: "O ideal: 2 por rota" })).toBeTruthy();
    expect(screen.getByText("Fecha 2 de cada")).toBeTruthy();
    expect(screen.getByText("9 na principal · 1 na secundária")).toBeTruthy();
    // O Atirador lotado manda para a Selva quem tem o elo mais baixo e marcou Selva: o Hugo.
    const selva = screen.getByRole("region", { name: /^Selva: 2 de 2 vagas/ });
    expect(within(selva).getByText("Hugo")).toBeTruthy();
    expect(within(selva).getByText("2ª")).toBeTruthy();
    // O leitor de tela ouve o nick, o elo e o porquê (a marca "2ª" é só visual).
    const hugo = within(selva).getByText("Hugo").closest("li")!;
    expect(hugo.textContent).toContain("Hugo, Prata, na rota secundária");
    expect(hugo.getAttribute("aria-label")).toBeNull();
    const atirador = screen.getByRole("region", { name: /^Atirador: 2 de 2 vagas/ });
    expect(within(atirador).getByText("Fabi")).toBeTruthy();
    expect(within(atirador).queryByText("Hugo")).toBeNull();
    // Nicks à vista é o pedido deste modo; ponto continua proibido. E não é matriz.
    expect(screen.queryByRole("table")).toBeNull();
    expect(document.body.textContent ?? "").not.toMatch(/ponto|\bpts?\b/i);
    expect(screen.getByText(/No draft a rota não é travada/)).toBeTruthy();
  });

  it("quando não fecha, diz isso e marca quem fica fora das duas rotas", () => {
    const soAdcEMid = [
      ...["Mestre", "Diamante", "Esmeralda", "Platina", "Ouro"].map((e, i) => jogador(`A${i}`, e, "ADC", "MID")),
      ...["Mestre", "Diamante", "Esmeralda", "Platina", "Prata"].map((e, i) => jogador(`M${i}`, e, "MID", "ADC")),
    ];
    render(<EloPorRota jogadores={soAdcEMid} times={2} />);
    fireEvent.click(screen.getByRole("button", { name: "Ideal: 2 por rota" }));

    expect(screen.getByText("Não fecha")).toBeTruthy();
    expect(screen.getByText(/nem toda vaga fecha com a principal ou a secundária/)).toBeTruthy();
    expect(screen.getAllByText("fora")).toHaveLength(6);
  });

  it("no celular vira cartões por rota, e a tela de print leva os nomes sem ponto", () => {
    render(
      <ModoCompacto ativo>
        <EloPorRota jogadores={POOL_IDEAL} times={2} />
      </ModoCompacto>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Ideal: 2 por rota" }));
    expect(document.querySelector("table")).toBeNull();
    expect(screen.getAllByRole("region")).toHaveLength(5);
    // As quatro opções cabem na tela: rótulo curto e fileira que quebra (não rola).
    const grupo = screen.getByRole("group", { name: "O que mostrar" });
    expect(within(grupo).getByText("As duas")).toBeTruthy();
    expect(within(grupo).getByText("Ideal: 2")).toBeTruthy();
    expect(grupo.className).not.toContain("adm-rolagem-x");

    fireEvent.click(screen.getByRole("button", { name: /Abrir para print/ }));
    const tela = screen.getByRole("dialog", { name: "O ideal: 2 por rota, em tela cheia para print" });
    expect(within(tela).getByText("Hugo")).toBeTruthy();
    expect(tela.textContent ?? "").not.toMatch(/ponto|\bpts?\b/i);
  });

  it("com mais gente que vagas, diz quantos ficam sem vaga — sem dar o nome de ninguém", () => {
    const comSobra = [...POOL_IDEAL, jogador("Zeca", "Ferro", "ADC", "JUNG")];
    render(<EloPorRota jogadores={comSobra} times={2} />);
    fireEvent.click(screen.getByRole("button", { name: "Ideal: 2 por rota" }));

    expect(screen.getByText(/1 inscrito fica sem vaga/)).toBeTruthy();
    // Os 11 nomes não cabem nas 10 vagas, e quem sobrou não aparece por nome.
    const aparecem = comSobra.filter((x) => screen.queryByText(x.nick));
    expect(aparecem).toHaveLength(10);
    // O subtítulo fala das vagas, não de "cada um" (há alguém sem vaga).
    expect(screen.getByText(/toda vaga com alguém na principal ou na secundária/)).toBeTruthy();
  });

  it("no monitor estreito (meia tela), as rotas viram 3 + 2 em vez de cinco colunas espremidas", () => {
    class Observador {
      observe() {}
      disconnect() {}
    }
    const largura = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "clientWidth");
    vi.stubGlobal("ResizeObserver", Observador);
    Object.defineProperty(HTMLElement.prototype, "clientWidth", { configurable: true, get: () => 700 });
    try {
      render(<EloPorRota jogadores={POOL_IDEAL} times={2} />);
      fireEvent.click(screen.getByRole("button", { name: "Ideal: 2 por rota" }));
      const grade = screen.getAllByRole("region")[0].parentElement!;
      expect(grade.style.gridTemplateColumns).toBe("repeat(3, minmax(0, 1fr))");
    } finally {
      if (largura) Object.defineProperty(HTMLElement.prototype, "clientWidth", largura);
      vi.unstubAllGlobals();
    }
  });

  it("sem time fechado, o ideal fica desligado", () => {
    render(<EloPorRota jogadores={POOL} times={0} />);
    const ideal = screen.getByRole("button", { name: "Ideal por rota" }) as HTMLButtonElement;
    expect(ideal.disabled).toBe(true);
  });
});

// ---------------------------------------------------------------- dentro da aba

function inscrito(over: Partial<Inscrito> & { id: string }): Inscrito {
  return {
    criado_em: "2026-10-05T12:00:00.000Z",
    nick: `N${over.id}`,
    tag: "BR1",
    riot_id: `N${over.id}#BR1`,
    nome_real: null,
    email: `${over.id}@exemplo.com`,
    discord: over.id,
    whatsapp: null,
    elo_declarado: "Prata",
    elo_verificado: null,
    elo_congelado: null,
    pontos: 3,
    rota_primaria: "MID",
    rota_secundaria: "TOP",
    disponibilidade: ["noite"],
    quer_capitao: false,
    entrou_no_grupo: null,
    situacao: "apto",
    organizador: false,
    observacao: null,
    ...over,
  };
}

function dadosDaEdicao(inscritos: Inscrito[]): DadosEdicao {
  return {
    config: {
      nome: "4ª Edição",
      abertura_inscricoes: null,
      fechamento_inscricoes: null,
      prazo_vinculo_riot: null,
      congelamento_elo: null,
      data_draft: null,
      inicio_campeonato: null,
      inscricoes_abertas: true,
      jogadores_por_time: 5,
      orcamento_por_time: 30,
      min_ranqueadas: 5,
      dias_no_grupo: 60,
      prazo_pagamento_dias: 14,
      segundos_por_escolha: 60,
      taxa_centavos: 3000,
      pct_campeao: 70,
      chave_pix: null,
      responsavel_financeiro: null,
    },
    inscritos,
    conferencias: [],
    pagamentos: [],
    panorama: {
      inscritos: inscritos.length,
      elegiveis: inscritos.length,
      aprovados: inscritos.length,
      pendentes: 0,
      recusados: 0,
      times: 0,
      vagas: 0,
      sobra: inscritos.length,
      caixa: { recebido: 0, estornado: 0, aDevolver: 0, emCaixa: 0, arrecadado: 0, aReceber: 0, isento: 0 },
    },
    auditoria: [],
  };
}

describe("Times e vagas com o quadro", () => {
  it("usa o elo de preço (congelado antes do verificado) e deixa recusado e desistente de fora", () => {
    render(
      <SecaoTimes
        dados={dadosDaEdicao([
          inscrito({ id: "a", elo_declarado: "Prata", elo_verificado: "Ouro", elo_congelado: "Diamante", rota_primaria: "SUP" }),
          inscrito({ id: "b", elo_declarado: "Ouro", situacao: "pendente", rota_primaria: "SUP" }),
          inscrito({ id: "c", elo_declarado: "Mestre", situacao: "recusado", rota_primaria: "SUP" }),
          inscrito({ id: "d", elo_declarado: "Mestre", situacao: "desistiu", rota_primaria: "SUP" }),
        ])}
        executar={async () => true}
        ocupado={false}
        podeConferir
        podeFinanceiro
        podeConfigurar
      />,
    );
    const tabela = screen.getByRole("table", { name: "Divisão de elo por rota" });
    expect(within(tabela).getByRole("cell", { name: "Suporte, Diamante: 1" })).toBeTruthy();
    expect(within(tabela).getByRole("cell", { name: "Suporte, Ouro: 1" })).toBeTruthy();
    expect(within(tabela).queryByRole("cell", { name: /Mestre/ })).toBeNull();
    expect(screen.getByText("· rota principal", { exact: false }).textContent).toBe("2 jogadores · rota principal");
  });
});
