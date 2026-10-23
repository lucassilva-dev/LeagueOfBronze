import { beforeEach, describe, expect, it, vi } from "vitest";

import { resolveElo } from "@/lib/design";
import { alcancarORelogio, estadoFecha, iniciarDraft } from "@/lib/draft/motor";
import { precoDeTodasAsDivisoes } from "@/lib/draft/precos";
import {
  podeSubstituir,
  precosDoSorteio,
  previaDosPrecos,
  retratoDaPrevia,
  type InscricaoDaPrevia,
} from "@/lib/draft/previa-de-precos";
import { capitaesFecham, tabelaQueFecha } from "@/lib/draft/tabela-que-fecha";
import { ORCAMENTO_DA_MONTAGEM } from "@/lib/draft/viabilidade";
import { CAPITAES_23_10, POOL_4A_40_23_10, type JogadorDoPool } from "./_pool-4a";

/**
 * OS CAPITÃES DEFINIDOS PELA ORGANIZAÇÃO E O CAPITÃO SEM PREÇO (decisão de 23/10/2026).
 *
 * Na véspera do draft da 4ª a organização definiu os 8 capitães — um deles organizador — e
 * decidiu que capitão não tem preço: todo time tem os mesmos 30 pontos para as 4 escolhas.
 * Com isso a tabela é calculada SÓ sobre quem vai ser escolhido (os 32 que não são capitães),
 * com 4 pagos por time e a soma exata 8 × 30 = 240 (preço médio 7,5).
 *
 * O pool é a lista real de produção às 09h30 de 23/10 (`POOL_4A_40_23_10`, sem nicks), com os
 * capitães nas posições 5, 29, 10, 1, 20, 37, 15 e 17.
 */

const banco = vi.hoisted(() => ({
  inscritos: [] as Record<string, unknown>[],
  config: {} as Record<string, unknown>,
}));

vi.mock("@/lib/data-store", () => ({
  createSupabaseAdminClient: () => {
    throw new Error("sem banco no teste");
  },
}));
vi.mock("@/lib/inscricoes/store", () => ({
  lerConfig: async () => structuredClone(banco.config),
  listarInscricoes: async () => structuredClone(banco.inscritos),
}));

const { montarDraftDosAprovados, paraPublico, previaDoDraft } = await import("@/lib/draft/store");

const SEM_DRAFT = { estado: null, revisao: 0 };
const id = (posicao: number) => `insc-${posicao}`;
const riotId = (posicao: number) => `Jogador${posicao}#BR1`;
const CAPITAES = CAPITAES_23_10.map(id);

/** Uma linha de `inscricoes` como o `select *` devolve, com a marca de capitão. */
function inscricao(j: JogadorDoPool, over: Record<string, unknown> = {}): Record<string, unknown> & { id: string } {
  return {
    id: id(j.posicao),
    riot_id: riotId(j.posicao),
    criado_em: `2026-10-${String(5 + Math.floor(j.posicao / 10)).padStart(2, "0")}T12:${String(j.posicao).padStart(2, "0")}:00Z`,
    situacao: "apto",
    organizador: j.organizador,
    elo_declarado: j.elo,
    elo_verificado: j.elo,
    elo_congelado: null,
    elo_riot: j.eloRiot,
    riot_divisao: j.divisao,
    riot_pdl: j.pdl,
    pontos: resolveElo(j.elo)!.pts,
    rota_primaria: j.rota1,
    rota_secundaria: j.rota2,
    jogador_id: `conta-${j.posicao}`,
    capitao: CAPITAES_23_10.includes(j.posicao),
    ...over,
  };
}

/** A tabela que a organização confere (capitão sem preço, os 8 capitães de 23/10): classe → pontos. */
const TABELA_23_10: [string, number, number][] = [
  ["Ferro", 1, 1],
  ["Bronze IV", 1, 1],
  ["Prata III", 2, 2],
  ["Prata I", 1, 3],
  ["Ouro IV", 1, 3],
  ["Ouro III", 2, 4],
  ["Ouro II", 2, 4],
  ["Platina IV", 2, 5],
  ["Platina III", 4, 6],
  ["Platina I", 3, 7],
  ["Esmeralda IV", 4, 8],
  ["Esmeralda II", 1, 10],
  ["Esmeralda I", 1, 11],
  ["Diamante IV", 2, 12],
  ["Diamante III", 1, 13],
  ["Diamante II", 1, 15],
  ["Diamante I", 1, 16],
  ["Mestre · 0–99 PDL", 2, 18],
];

beforeEach(() => {
  // Sem `capitao_com_preco`: banco sem a coluna — vale a decisão da 4ª (capitão sem preço).
  banco.config = {
    jogadores_por_time: 5,
    max_times: 8,
    orcamento_por_time: 30,
    segundos_por_escolha: 60,
    inscricoes_abertas: false,
    fechamento_inscricoes: null,
  };
  banco.inscritos = POOL_4A_40_23_10.map((j) => inscricao(j));
});

// ---------------------------------------------------------------- a conta pura

describe("a tabela com o capitão sem preço (lib/draft/tabela-que-fecha.ts)", () => {
  const pool = POOL_4A_40_23_10.map((j) => ({ id: id(j.posicao), elo: j }));
  const conta = (capitaoGratis: boolean) =>
    tabelaQueFecha({ pool, capitaes: CAPITAES, times: 8, jogadoresPorTime: 5, orcamentoPorTime: 30, capitaoGratis });

  it("é só de quem vai ser escolhido: 32 pessoas, 4 por time, soma exata 240, preço médio 7,5", () => {
    const { tabela, fecha, queda } = conta(true);
    expect(fecha).toBe(true);
    expect(queda).toBeNull();
    expect(tabela).toMatchObject({ times: 8, jogadoresPorTime: 4, orcamentoPorTime: 30, alvo: 240, soma: 240, folga: 0, curvatura: 0.1 });
    expect(tabela.reta.precoMedio).toBe(7.5);
    expect(tabela.linhas.reduce((s, l) => s + l.quantos, 0)).toBe(32);
  });

  it("os preços finais da 4ª com os 8 capitães de 23/10 (a tabela do PDF)", () => {
    const { tabela } = conta(true);
    expect(tabela.linhas.map((l) => [l.classe.rotulo, l.quantos, l.pontos])).toEqual(TABELA_23_10);
    expect(tabela.erroMaximoEmDegraus).toBeCloseTo(2.21, 2);
  });

  it("o capitão entra no draft com 0 ponto, e cada time tem a folga do orçamento inteiro", () => {
    const { precoDe } = conta(true);
    for (const c of CAPITAES) expect(precoDe.get(c)).toBe(0);
    const outros = [...precoDe].filter(([k]) => !CAPITAES.includes(k));
    expect(outros).toHaveLength(32);
    expect(outros.reduce((s, [, p]) => s + p, 0)).toBe(240);
  });

  it("o caminho antigo continua: com o capitão pago, a tabela é dos 40 e o capitão custa os pontos dele", () => {
    const { tabela, precoDe, fecha } = conta(false);
    expect(fecha).toBe(true);
    expect(tabela).toMatchObject({ jogadoresPorTime: 5, alvo: 240, soma: 240 });
    expect(tabela.reta.precoMedio).toBe(6);
    expect(tabela.linhas.reduce((s, l) => s + l.quantos, 0)).toBe(40);
    expect(CAPITAES_23_10.map((p) => precoDe.get(id(p)))).toEqual([9, 9, 7, 14, 4, 9, 9, 6]);
  });

  it("a viabilidade com o capitão sem preço ignora o preço que viesse no mapa: folga = orçamento inteiro", () => {
    // Dois times de 2 (capitão + 1), orçamento 10, e dois jogadores de 10 para repartir.
    const precoDe = new Map([
      ["c1", 6],
      ["c2", 6],
      ["j1", 10],
      ["j2", 10],
    ]);
    const base = { capitaes: ["c1", "c2"], precoDe, jogadoresPorTime: 2, orcamentoPorTime: 10 };
    expect(capitaesFecham({ ...base, capitaoGratis: true })).toBe(true);
    // Pago, o capitão de 6 deixa só 4 para um jogador de 10.
    expect(capitaesFecham(base)).toBe(false);
  });
});

describe("o preço de todas as divisões (para reserva, substituto e mudança de elo)", () => {
  const pool = POOL_4A_40_23_10.map((j) => ({ id: id(j.posicao), elo: j }));
  const { tabela } = tabelaQueFecha({ pool, capitaes: CAPITAES, times: 8, jogadoresPorTime: 5, orcamentoPorTime: 30, capitaoGratis: true });
  const todas = precoDeTodasAsDivisoes(tabela);

  it("Ferro IV … Diamante I, o Mestre por faixa até a mais alta do pool mais uma, Grão-Mestre e Desafiante", () => {
    expect(todas.map((d) => d.rotulo)).toEqual([
      ...["Ferro", "Bronze", "Prata", "Ouro", "Platina", "Esmeralda", "Diamante"].flatMap((elo) =>
        ["IV", "III", "II", "I"].map((d) => `${elo} ${d}`),
      ),
      "Mestre · 0–99 PDL",
      "Mestre · 100–199 PDL",
      "Grão-Mestre",
      "Desafiante",
    ]);
  });

  it("os preços de 23/10: quem está no pool custa o da linha, e o resto sai da régua presa entre as vizinhas", () => {
    const preco = Object.fromEntries(todas.map((d) => [d.rotulo, d.pontos]));
    expect(preco).toMatchObject({
      "Ferro IV": 1,
      "Ferro I": 1,
      "Bronze IV": 1,
      "Bronze III": 2,
      "Prata IV": 2,
      "Prata III": 2,
      "Prata II": 3,
      "Prata I": 3,
      "Ouro IV": 3,
      "Ouro I": 5,
      "Platina II": 6,
      "Esmeralda III": 9,
      "Mestre · 0–99 PDL": 18,
      "Mestre · 100–199 PDL": 20,
      "Grão-Mestre": 26,
      Desafiante: 38,
    });
    // Toda classe que tem alguém do pool tem exatamente o preço da linha da tabela.
    for (const d of todas.filter((x) => x.noPool)) {
      expect(tabela.linhas.find((l) => l.classe.forca === d.forca)?.pontos).toBe(d.pontos);
    }
    expect(todas.find((d) => d.rotulo === "Esmeralda III")?.noPool).toBe(false);
  });

  it("nunca desce quando o elo sobe", () => {
    for (let k = 1; k < todas.length; k++) expect(todas[k]!.pontos).toBeGreaterThanOrEqual(todas[k - 1]!.pontos);
  });

  it("na granularidade «elo», uma linha por elo", () => {
    const porElo = tabelaQueFecha({
      pool,
      capitaes: CAPITAES,
      times: 8,
      jogadoresPorTime: 5,
      orcamentoPorTime: 30,
      capitaoGratis: true,
      granularidade: "elo",
    }).tabela;
    expect(precoDeTodasAsDivisoes(porElo).map((d) => d.rotulo)).toEqual([
      "Ferro",
      "Bronze",
      "Prata",
      "Ouro",
      "Platina",
      "Esmeralda",
      "Diamante",
      "Mestre",
      "Grão-Mestre",
      "Desafiante",
    ]);
  });
});

// ---------------------------------------------------------------- a prévia do painel

describe("a prévia do painel (Times e vagas, Inscritos) com os capitães definidos", () => {
  const inscritos = () => POOL_4A_40_23_10.map((j) => inscricao(j) as unknown as InscricaoDaPrevia);

  it("a mesma tabela do servidor: os definidos, o capitão a 0 e a tag no lugar do preço", () => {
    const lista = inscritos();
    const previa = previaDosPrecos({ inscritos: lista, jogadoresPorTime: 5, orcamentoPorTime: 30, maxTimes: 8 });
    expect(previa.capitaesDaTabela).toBe("definidos");
    expect(previa.capitaoGratis).toBe(true);
    expect(previa.tabela).toMatchObject({ jogadoresPorTime: 4, soma: 240 });
    expect(previa.tabela!.linhas.map((l) => [l.classe.rotulo, l.quantos, l.pontos])).toEqual(TABELA_23_10);
    expect(retratoDaPrevia(previa)?.capitaoGratis).toBe(true);
    const porId = new Map(lista.map((i) => [i.id, i]));
    expect(previa.semPreco(porId.get(id(5))!)).toBe(true);
    expect(previa.preco(porId.get(id(5))!)).toBe(0);
    expect(previa.semPreco(porId.get(id(4))!)).toBe(false);
    expect(previa.preco(porId.get(id(4))!)).toBe(18);
    // Capitão não substitui nem é substituído pela tabela (regra 6).
    expect(podeSubstituir(previa, porId.get(id(4))!, porId.get(id(5))!)).toBe(false);
    expect(podeSubstituir(previa, porId.get(id(5))!, porId.get(id(4))!)).toBe(false);
    expect(podeSubstituir(previa, porId.get(id(35))!, porId.get(id(4))!)).toBe(true);
  });

  it("com `capitao_com_preco` ligado, o capitão tem preço e entra na regra do substituto", () => {
    const lista = inscritos();
    const previa = previaDosPrecos({ inscritos: lista, jogadoresPorTime: 5, orcamentoPorTime: 30, maxTimes: 8, capitaoComPreco: true });
    expect(previa.tabela).toMatchObject({ jogadoresPorTime: 5, soma: 240 });
    expect(retratoDaPrevia(previa)?.capitaoGratis).toBeUndefined();
    const capitao = lista.find((i) => i.id === id(1))!;
    expect(previa.semPreco(capitao)).toBe(false);
    expect(previa.preco(capitao)).toBe(14);
  });

  it("depois do sorteio, os capitães do draft sem preço ficam fora da regra do substituto", () => {
    const lista = inscritos();
    const previa = previaDosPrecos({ inscritos: lista, jogadoresPorTime: 5, orcamentoPorTime: 30, maxTimes: 8 });
    const retrato = retratoDaPrevia(previa)!;
    const sorteio = precosDoSorteio({
      retrato,
      pontosDoDraft: new Map(lista.map((i) => [i.riot_id!, previa.preco(i) ?? 0])),
      inscritos: lista,
      capitaesDoDraft: new Set(CAPITAES_23_10.map(riotId)),
      capitaoGratis: true,
    });
    expect(sorteio.vagas).toBe(40);
    const capitao = lista.find((i) => i.id === id(5))!;
    expect(sorteio.semPreco(capitao)).toBe(true);
    expect(podeSubstituir(sorteio, lista.find((i) => i.id === id(35))!, capitao)).toBe(false);
  });
});

// ---------------------------------------------------------------- a prévia do servidor

describe("a prévia do draft com os capitães definidos", () => {
  it("usa os 8 definidos (um deles organizador), o capitão sem preço e a tabela dos 32", async () => {
    const previa = await previaDoDraft(SEM_DRAFT);
    expect(previa.metodoPadrao).toBe("definidos");
    expect(previa.capitaesDaTabela).toBe("definidos");
    expect(previa.capitaoGratis).toBe(true);
    expect([...previa.capitaesDefinidos].sort()).toEqual([...CAPITAES].sort());
    expect(previa.avisosDosCapitaes).toEqual([]);
    expect(previa.fechaComOsCapitaesDefinidos).toBe(true);
    expect(previa.impedimentos).toEqual([]);

    expect(previa.tabela).toMatchObject({ capitaoGratis: true, jogadoresPorTime: 4, alvo: 240, soma: 240, folga: 0 });
    expect(previa.tabela!.linhas.map((l) => [l.rotulo, l.quantos, l.pontos])).toEqual(TABELA_23_10);
    expect(previa.totalDePontos).toBe(240);

    const porId = new Map(previa.jogadores.map((j) => [j.id, j]));
    for (const c of CAPITAES) {
      expect(porId.get(c)).toMatchObject({ capitao: true, capitaoDefinido: true, pontos: 0 });
    }
    // O organizador capitão (posição 1, Mestre 177 PDL): permitido quando a organização define.
    expect(porId.get(id(1))).toMatchObject({ organizador: true, capitao: true, pontos: 0 });
    expect(porId.get(id(4))).toMatchObject({ capitao: false, pontos: 18 });
    expect(porId.get(id(35))).toMatchObject({ capitao: false, pontos: 1 });
  });

  it("sem marca nenhuma: o comportamento de antes (regra do maior elo, sem organizador)", async () => {
    banco.inscritos = POOL_4A_40_23_10.map((j) => inscricao(j, { capitao: false }));
    const previa = await previaDoDraft(SEM_DRAFT);
    expect(previa.metodoPadrao).toBe("maior_elo");
    expect(previa.capitaesDefinidos).toEqual([]);
    expect(previa.avisosDosCapitaes).toEqual([]);
    expect(previa.capitaesDaTabela).toBe("regra");
    expect(previa.capitaesPelaRegra).not.toContain(id(1));
    expect(previa.tabela?.capitaoGratis).toBe(true);
  });

  it("marcados em número errado: a prévia avisa, e a tabela fica com os da regra", async () => {
    banco.inscritos = POOL_4A_40_23_10.map((j) => inscricao(j, { capitao: CAPITAES_23_10.slice(0, 7).includes(j.posicao) }));
    const previa = await previaDoDraft(SEM_DRAFT);
    expect(previa.metodoPadrao).toBe("definidos");
    expect(previa.capitaesDaTabela).toBe("regra");
    expect(previa.fechaComOsCapitaesDefinidos).toBeNull();
    expect(previa.avisosDosCapitaes.join(" ")).toContain("Há 7 capitães definidos entre os titulares aptos para 8 times");
  });

  it("marcado que saiu do campeonato não conta (e a prévia avisa para desmarcar)", async () => {
    banco.inscritos = [
      ...POOL_4A_40_23_10.map((j) => inscricao(j)),
      inscricao({ ...POOL_4A_40_23_10[38]!, posicao: 41 }, { situacao: "desistiu", capitao: true }),
    ];
    const previa = await previaDoDraft(SEM_DRAFT);
    expect(previa.capitaesDaTabela).toBe("definidos");
    expect(previa.avisosDosCapitaes.join(" ")).toContain("Jogador41#BR1 (desistiu) tinha a marca de capitão");
  });
});

// ---------------------------------------------------------------- a montagem do sorteio

describe("o sorteio pelos capitães definidos", () => {
  it("monta com os 8 definidos, capitão a 0 e as 32 escolhas somando 240 — e o draft fecha 30 por time", async () => {
    const estado = await montarDraftDosAprovados({ metodo: "definidos" });
    expect([...estado.times.map((t) => t.capitaoId)].sort()).toEqual([...CAPITAES].sort());
    expect(estado.capitaoGratis).toBe(true);
    expect(estado.tabelaDePontos).toMatchObject({ capitaoGratis: true, jogadoresPorTime: 4, soma: 240, folga: 0 });

    const doCapitao = new Set(CAPITAES);
    for (const j of estado.jogadores.filter((x) => doCapitao.has(x.id))) expect(j.pontos).toBe(0);
    const escolhas = estado.jogadores.filter((x) => !doCapitao.has(x.id));
    expect(escolhas).toHaveLength(32);
    expect(escolhas.reduce((s, j) => s + j.pontos, 0)).toBe(240);
    expect(estadoFecha(estado, ORCAMENTO_DA_MONTAGEM)).toBe(true);

    // A visão pública: o capitão não pesa no gasto, e as telas sabem que ele é sem preço.
    const antes = paraPublico(estado, 1);
    expect(antes.capitaoGratis).toBe(true);
    expect(antes.times.every((t) => t.gasto === 0)).toBe(true);

    // O draft inteiro pelo relógio: todo time termina com os 30 certinhos nas 4 escolhas.
    let e = iniciarDraft(estado, 0);
    for (let k = 1; k <= 32 && e.fase === "rodando"; k++) e = alcancarORelogio(e, k * 60_000 + 1);
    expect(e.fase).toBe("encerrado");
    const depois = paraPublico(e, 2);
    expect(depois.times.map((t) => t.gasto)).toEqual(Array(8).fill(30));
    expect(depois.times.every((t) => t.vagas === 0)).toBe(true);
  });

  it("número errado de definidos: recusa com a mensagem do que fazer", async () => {
    banco.inscritos = POOL_4A_40_23_10.map((j) => inscricao(j, { capitao: CAPITAES_23_10.slice(0, 7).includes(j.posicao) }));
    await expect(montarDraftDosAprovados({ metodo: "definidos" })).rejects.toThrow(
      /Há 7 capitães definidos entre os titulares aptos para 8 times\. Marque exatamente 8/,
    );
  });

  it("nenhum definido: recusa e manda definir (ou sortear pela regra ou à mão)", async () => {
    banco.inscritos = POOL_4A_40_23_10.map((j) => inscricao(j, { capitao: false }));
    await expect(montarDraftDosAprovados({ metodo: "definidos" })).rejects.toThrow(/Nenhum capitão foi definido/);
  });

  it("definido que ainda não está apto: recusa dizendo quem", async () => {
    banco.inscritos = POOL_4A_40_23_10.map((j) => inscricao(j, j.posicao === 5 ? { situacao: "pendente" } : {}));
    await expect(montarDraftDosAprovados({ metodo: "definidos" })).rejects.toThrow(
      /Capitão definido fora de quem joga o draft: Jogador5#BR1 \(pendente\)/,
    );
  });

  it("à mão, a organização também pode escolher um organizador (a trava é só da regra do maior elo)", async () => {
    const estado = await montarDraftDosAprovados({ metodo: "manual", capitaesManuais: CAPITAES });
    expect(estado.times.map((t) => t.capitaoId)).toContain(id(1));
  });

  it("a regra do maior elo continua sem organizador", async () => {
    banco.inscritos = POOL_4A_40_23_10.map((j) => inscricao(j, { capitao: false }));
    const estado = await montarDraftDosAprovados({ metodo: "maior_elo" });
    const organizadores = new Set(POOL_4A_40_23_10.filter((j) => j.organizador).map((j) => id(j.posicao)));
    expect(estado.times.some((t) => organizadores.has(t.capitaoId))).toBe(false);
  });

  it("com `capitao_com_preco` ligado, o caminho antigo: o capitão paga do orçamento e a tabela é dos 40", async () => {
    banco.config = { ...banco.config, capitao_com_preco: true };
    const estado = await montarDraftDosAprovados({ metodo: "definidos" });
    expect(estado.capitaoGratis).toBeUndefined();
    expect(estado.tabelaDePontos?.capitaoGratis).toBeUndefined();
    expect(estado.tabelaDePontos).toMatchObject({ jogadoresPorTime: 5, soma: 240 });
    const preco = new Map(estado.jogadores.map((j) => [j.id, j.pontos]));
    expect(CAPITAES_23_10.map((p) => preco.get(id(p)))).toEqual([9, 9, 7, 14, 4, 9, 9, 6]);
    expect(estado.jogadores.reduce((s, j) => s + j.pontos, 0)).toBe(240);
    expect(paraPublico(estado, 1).capitaoGratis).toBe(false);
  });
});
