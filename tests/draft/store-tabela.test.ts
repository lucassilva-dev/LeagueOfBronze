import { beforeEach, describe, expect, it, vi } from "vitest";

import { alcancarORelogio, estadoFecha, iniciarDraft } from "@/lib/draft/motor";
import { avisosDaVirada, problemasDaVirada } from "@/lib/draft/virada";
import { calcularTabela } from "@/lib/draft/precos";
import { ORCAMENTO_DA_MONTAGEM } from "@/lib/draft/viabilidade";
import { resolveElo } from "@/lib/design";
import { POOL_4A_40, type JogadorDoPool } from "./_pool-4a";

/**
 * A tabela automática ligada ao draft de verdade (lib/draft/store.ts): a prévia do painel
 * e a montagem do sorteio, contra um banco falso com o pool real da 4ª (40 pessoas, 8 times
 * de 5, orçamento 30, curvatura padrão 0,1).
 *
 * O que se prova aqui é a ligação, que os testes do núcleo (precos.test.ts) não alcançam:
 *  - o preço que entra no draft é o da tabela automática, não a coluna `pontos` do banco
 *    (a tabela fixa da 3ª, que continua lá para o robô);
 *  - depois do congelamento, o que o robô da Riot lê não muda nem o preço nem o corte dos
 *    capitães — a fotografia é a do congelamento;
 *  - a prévia não fala mais em "média + 15%", e avisa quando os capitães não fecham.
 */

type Linha = Record<string, unknown> & { id: string };

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

/** Uma linha de `inscricoes` como o `select *` devolve, com a tabela FIXA em `pontos`. */
function inscricao(j: JogadorDoPool, over: Partial<Linha> = {}): Linha {
  return {
    id: `insc-${j.posicao}`,
    riot_id: `Jogador${j.posicao}#BR1`,
    situacao: j.reserva ? "sobra" : "apto",
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
    ...over,
  };
}

/** O congelamento como `congelarElos` grava: elo, divisão e PDL do mesmo dia. */
function congelada(j: JogadorDoPool): Partial<Linha> {
  return { elo_congelado: j.elo, divisao_congelada: j.eloRiot ? j.divisao : null, pdl_congelado: j.eloRiot ? j.pdl : null };
}

beforeEach(() => {
  banco.config = {
    jogadores_por_time: 5,
    max_times: 8,
    orcamento_por_time: 30,
    segundos_por_escolha: 60,
    inscricoes_abertas: false,
    fechamento_inscricoes: null,
  };
  banco.inscritos = POOL_4A_40.map((j) => inscricao(j));
});

/**
 * Dois inscritos além dos 40 (hipotéticos), para os casos com sobra e com aptos ≠ vagas. O
 * 41º é um Diamante I: se jogasse, seria capitão pela regra (acima do Diamante II).
 */
const ALEM_DOS_40: JogadorDoPool[] = [
  { posicao: 41, elo: "Diamante", eloRiot: "Diamante", divisao: "I", pdl: 97, organizador: false, rota1: "TOP", rota2: "MID", reserva: true },
  { posicao: 42, elo: "Ouro", eloRiot: "Ouro", divisao: "III", pdl: 20, organizador: false, rota1: "SUP", rota2: "ADC", reserva: true },
];

/**
 * Um pool de 30 (6 times) sem empate no corte em que a tabela fecha a soma (180) mas os
 * capitães da regra não deixam os elencos fecharem: Prata e Ouro apertados, preços 1, 2, 4,
 * 5, 7, 9 e 10 (os mesmos com 0,075 e com 0,1) — capitães a 10, 10, 9, 9, 9, 9, e não há como
 * cada time somar exatamente o resto. Achado por busca em pools sorteados; mantido aqui como está.
 */
const ELOS_QUE_NAO_FECHAM: [string, string, number][] = [
  ["Ouro", "II", 1], ["Prata", "I", 4], ["Ouro", "III", 7], ["Prata", "II", 10], ["Ouro", "III", 13],
  ["Prata", "I", 16], ["Ouro", "II", 19], ["Ouro", "III", 22], ["Ouro", "I", 25], ["Prata", "II", 28],
  ["Ouro", "II", 31], ["Ouro", "III", 34], ["Ouro", "III", 37], ["Ouro", "IV", 40], ["Prata", "I", 43],
  ["Ouro", "IV", 46], ["Ouro", "III", 49], ["Ouro", "III", 52], ["Prata", "III", 55], ["Prata", "I", 58],
  ["Ouro", "III", 61], ["Ouro", "IV", 64], ["Ouro", "III", 67], ["Ouro", "II", 70], ["Ouro", "I", 73],
  ["Ouro", "IV", 76], ["Ouro", "III", 79], ["Ouro", "IV", 82], ["Prata", "I", 85], ["Prata", "I", 88],
];

const POOL_QUE_NAO_FECHA: Linha[] = ELOS_QUE_NAO_FECHAM.map(([elo, divisao, pdl], k) =>
  inscricao({ posicao: 100 + k, elo, eloRiot: elo, divisao, pdl, organizador: false, rota1: "MID", rota2: "TOP", reserva: false }),
);

/**
 * Um pool estreito (só Prata, quase todo Prata III) em que NADA fecha com os capitães da
 * regra — nem descendo a curvatura até 0, nem a soma até 180 − 6: os quatro Prata II viram
 * capitães caros demais para o resto. Achado por busca em pools sorteados.
 */
const ELOS_QUE_NUNCA_FECHAM: [string, string, number][] = [
  ["Prata", "III", 1], ["Prata", "III", 4], ["Prata", "III", 7], ["Prata", "III", 10], ["Prata", "III", 13],
  ["Prata", "III", 16], ["Prata", "III", 19], ["Prata", "III", 22], ["Prata", "III", 25], ["Prata", "III", 28],
  ["Prata", "III", 31], ["Prata", "III", 34], ["Prata", "III", 37], ["Prata", "II", 40], ["Prata", "III", 43],
  ["Prata", "II", 46], ["Prata", "III", 49], ["Prata", "II", 52], ["Prata", "IV", 55], ["Prata", "III", 58],
  ["Prata", "III", 61], ["Prata", "III", 64], ["Prata", "III", 67], ["Prata", "III", 70], ["Prata", "III", 73],
  ["Prata", "III", 76], ["Prata", "III", 79], ["Prata", "III", 82], ["Prata", "II", 85], ["Prata", "III", 88],
];

const POOL_QUE_NUNCA_FECHA: Linha[] = ELOS_QUE_NUNCA_FECHAM.map(([elo, divisao, pdl], k) =>
  inscricao({ posicao: 200 + k, elo, eloRiot: elo, divisao, pdl, organizador: false, rota1: "MID", rota2: "TOP", reserva: false }),
);

/** 30 Platinas das quatro divisões: a soma exata não fecha com os capitães em curvatura nenhuma. */
const ELOS_SO_PLATINA: [string, string, number][] = [
  ["Platina", "IV", 0], ["Platina", "III", 37], ["Platina", "II", 74], ["Platina", "I", 11], ["Platina", "IV", 48],
  ["Platina", "III", 85], ["Platina", "II", 22], ["Platina", "IV", 59], ["Platina", "III", 96], ["Platina", "II", 33],
  ["Platina", "I", 70], ["Platina", "IV", 7], ["Platina", "III", 44], ["Platina", "II", 81], ["Platina", "IV", 18],
  ["Platina", "III", 55], ["Platina", "II", 92], ["Platina", "I", 29], ["Platina", "IV", 66], ["Platina", "III", 3],
  ["Platina", "II", 40], ["Platina", "IV", 77], ["Platina", "III", 14], ["Platina", "II", 51], ["Platina", "I", 88],
  ["Platina", "IV", 25], ["Platina", "III", 62], ["Platina", "II", 99], ["Platina", "IV", 36], ["Platina", "III", 73],
];

const POOL_SO_PLATINA: Linha[] = ELOS_SO_PLATINA.map(([elo, divisao, pdl], k) =>
  inscricao({ posicao: 300 + k, elo, eloRiot: elo, divisao, pdl, organizador: false, rota1: "MID", rota2: "TOP", reserva: false }),
);

const pontosDe = (previa: Awaited<ReturnType<typeof previaDoDraft>>) =>
  Object.fromEntries(previa.jogadores.map((j) => [j.riotId, j.pontos]));

/** Os 8 maiores elos fora da organização: os dois Mestres (#32 e #4) e seis Diamantes. */
const CAPITAES_DA_REGRA = ["insc-4", "insc-5", "insc-8", "insc-28", "insc-29", "insc-32", "insc-37", "insc-39"];

describe("a prévia do draft com a tabela automática", () => {
  it("o preço de cada um é o da tabela automática, não a coluna `pontos` (tabela da 3ª)", async () => {
    const previa = await previaDoDraft(SEM_DRAFT);
    const pontos = pontosDe(previa);

    expect(previa.impedimentos).toEqual([]);
    expect(pontos["Jogador1#BR1"]).toBe(15); // Mestre 208 PDL — na 3ª valia 10
    expect(pontos["Jogador4#BR1"]).toBe(12); // Mestre 21 PDL
    expect(pontos["Jogador24#BR1"]).toBe(2); // Prata III — na 3ª valia 3
    expect(pontos["Jogador16#BR1"]).toBe(2); // Prata sem leitura: meio do elo
    expect(pontos["Jogador13#BR1"]).toBe(5); // Platina I
    expect(pontos["Jogador35#BR1"]).toBe(1); // Ferro sem leitura: o mais fraco custa 1
    expect(previa.totalDePontos).toBe(240);
    expect(previa.jogadores).toHaveLength(40);
  });

  it("devolve a tabela desta edição, e nada da regra antiga (média + 15%)", async () => {
    const previa = await previaDoDraft(SEM_DRAFT);
    // Nulo, e não ausente: o painel de antes do deploy testa `!== null` e, sem a chave,
    // mostrava "O orçamento configurado (30) não é o da regra (undefined)".
    expect(previa.orcamentoSugerido).toBeNull();
    expect(previa.tabela).toMatchObject({ granularidade: "divisao", curvatura: 0.1, alvo: 240, soma: 240, folga: 0, times: 8, queda: null });
    expect(previa.tabela!.poolIncompleto).toBeUndefined();
    expect(previa.tabela!.linhas.map((l) => [l.rotulo, l.quantos, l.pontos])).toContainEqual(["Mestre · 200–299 PDL", 1, 15]);
    expect(previa.tabela!.erroMaximoEmDegraus).toBeCloseTo(1.73, 2);
    // Serializável: é o que a rota manda em JSON.
    expect(JSON.parse(JSON.stringify(previa.tabela))).toEqual(previa.tabela);
  });

  it("os capitães da regra fecham os elencos com essa tabela, e a prévia diz isso", async () => {
    const previa = await previaDoDraft(SEM_DRAFT);
    expect([...previa.capitaesPelaRegra].sort()).toEqual([...CAPITAES_DA_REGRA].sort());
    expect(previa.fechaComOsCapitaesDaRegra).toBe(true);
  });

  it("congelado, o robô da Riot não mexe mais no preço nem no corte dos capitães", async () => {
    const antes = await previaDoDraft(SEM_DRAFT);

    // Congela todo mundo com a leitura do dia e, DEPOIS, o robô lê outra coisa: o Diamante IV
    // 34 PDL (#5, último capitão) cai para Esmeralda, a Prata III sobe para Prata I e o Mestre
    // de 208 PDL vai a 650.
    banco.inscritos = POOL_4A_40.map((j) => {
      const linha = inscricao(j, congelada(j));
      if (j.posicao === 5) return { ...linha, elo_riot: "Esmeralda", riot_divisao: "I", riot_pdl: 90 };
      if (j.posicao === 24) return { ...linha, riot_divisao: "I", riot_pdl: 10 };
      if (j.posicao === 1) return { ...linha, riot_pdl: 650 };
      return linha;
    });
    const depois = await previaDoDraft(SEM_DRAFT);

    expect(pontosDe(depois)).toEqual(pontosDe(antes));
    expect(depois.tabela).toEqual(antes.tabela);
    expect([...depois.capitaesPelaRegra].sort()).toEqual([...CAPITAES_DA_REGRA].sort());
    expect(depois.semEloCongelado).toEqual([]);
  });

  it("o corte dos capitães também é o do congelamento: a leitura de hoje não troca quem capitaneia", async () => {
    // A posição 15 vira um Diamante IV de 30 PDL, logo abaixo do último capitão (#5, Diamante
    // IV, 34 PDL). Congelados os dois, a Riot passa a mostrar a 15 com 90 PDL: pela leitura de
    // hoje ela tomaria a vaga de capitão; pela fotografia do congelamento, não.
    const p15 = { ...POOL_4A_40.find((j) => j.posicao === 15)!, elo: "Diamante", eloRiot: "Diamante", divisao: "IV", pdl: 30 };
    banco.inscritos = POOL_4A_40.map((j) => {
      const base = j.posicao === 15 ? p15 : j;
      const linha = inscricao(base, congelada(base));
      return j.posicao === 15 ? { ...linha, riot_pdl: 90 } : linha;
    });
    const previa = await previaDoDraft(SEM_DRAFT);
    expect(previa.empateNoCorte).toBeNull();
    expect([...previa.capitaesPelaRegra].sort()).toEqual([...CAPITAES_DA_REGRA].sort());
    expect(previa.capitaesPelaRegra).not.toContain("insc-15");

    // Sem congelar, a mesma leitura troca o capitão — a diferença é a fotografia.
    banco.inscritos = POOL_4A_40.map((j) => (j.posicao === 15 ? inscricao(p15, { riot_pdl: 90 }) : inscricao(j)));
    expect((await previaDoDraft(SEM_DRAFT)).capitaesPelaRegra).toContain("insc-15");
  });

  it("sem congelar, a mesma leitura nova da Riot muda o preço (é por isso que se congela)", async () => {
    banco.inscritos = POOL_4A_40.map((j) => (j.posicao === 24 ? inscricao(j, { riot_divisao: "I", riot_pdl: 10 }) : inscricao(j)));
    const previa = await previaDoDraft(SEM_DRAFT);
    expect(previa.tabela!.linhas.find((l) => l.rotulo === "Prata I")!.quantos).toBe(2);
  });

  it("congelado sem divisão (leitura de outro tier, ou congelado antes da migração): meio do elo", async () => {
    // O Ouro I 82 PDL (posição 9) foi congelado sem divisão; o robô hoje diz Ouro I.
    banco.inscritos = POOL_4A_40.map((j) =>
      j.posicao === 9 ? inscricao(j, { elo_congelado: "Ouro", divisao_congelada: null, pdl_congelado: null }) : inscricao(j),
    );
    const previa = await previaDoDraft(SEM_DRAFT);
    const rotulos = previa.tabela!.linhas.map((l) => l.rotulo);
    expect(rotulos).toContain("Ouro"); // a classe do meio do elo
    expect(rotulos).not.toContain("Ouro I");
  });

  it("elo que a tabela não reconhece vira impedimento, e a prévia continua de pé", async () => {
    banco.inscritos = POOL_4A_40.map((j) => (j.posicao === 7 ? inscricao(j, { elo_verificado: "Lata" }) : inscricao(j)));
    const previa = await previaDoDraft(SEM_DRAFT);
    expect(previa.impedimentos.some((p) => p.includes("Jogador7#BR1") && p.includes("Lata"))).toBe(true);
    expect(previa.fechaComOsCapitaesDaRegra).toBeNull();
  });

  it("pool em que a soma exata não fecha com os capitães da regra: a conta desce sozinha e a prévia diz por quê", async () => {
    banco.inscritos = POOL_QUE_NAO_FECHA.map((linha) => ({ ...linha }));
    const previa = await previaDoDraft(SEM_DRAFT);
    expect(previa.impedimentos).toEqual([]);
    // Nenhuma curvatura fecha com a soma exata; com a soma 1 ponto abaixo de 180, fecha.
    expect(previa.fechaComOsCapitaesDaRegra).toBe(true);
    expect(previa.tabela).toMatchObject({ curvatura: 0, soma: 179, folga: 1 });
    expect(previa.tabela).toMatchObject({ times: 6, alvo: 180 });
    expect(previa.tabela!.queda).toMatchObject({ curvaturaPedida: 0.1 });
    expect(previa.tabela!.queda!.motivo).toContain("A curvatura caiu de 0,1 para 0 e a soma ficou 1 ponto abaixo de 180 (179)");
    expect(previa.totalDePontos).toBe(179);
  });

  it("pool em que nada fecha (nem descendo a curvatura e a soma): aí sim a prévia avisa", async () => {
    banco.inscritos = POOL_QUE_NUNCA_FECHA.map((linha) => ({ ...linha }));
    const previa = await previaDoDraft(SEM_DRAFT);
    expect(previa.impedimentos).toEqual([]);
    expect(previa.empateNoCorte).toBeNull();
    expect(previa.fechaComOsCapitaesDaRegra).toBe(false);
    // A tabela mostrada é a pedida, sem queda.
    expect(previa.tabela).toMatchObject({ curvatura: 0.1, folga: 0, queda: null });
  });

  it("menos aptos que vagas (C4): a tabela é a do sorteio, sem «pool incompleto», e fecha com uma vaga aberta", async () => {
    // Um titular dos 40 ainda pendente: 39 titulares aptos para 40 vagas. O sorteio pode
    // seguir assim (titular não apto é aviso, não impedimento), então a tabela calculada sobre
    // os 39 é a que vai para o draft — e a conta dos capitães sabe que um time fica com a
    // vaga aberta (sem isso, nenhuma tabela fecharia com um a menos).
    banco.inscritos = POOL_4A_40.map((j) => inscricao(j, j.posicao === 7 ? { situacao: "pendente" } : {}));
    const previa = await previaDoDraft(SEM_DRAFT);
    expect(previa.aptos).toBe(39);
    expect(previa.vagas).toBe(40);
    expect(previa.impedimentos).toEqual([]);
    expect(previa.avisosDoSorteio.join(" ")).toContain("Faltam 1");
    expect(previa.tabela!.poolIncompleto).toBeUndefined();
    expect(previa.fechaComOsCapitaesDaRegra).toBe(true);
  });

  it("mais aptos que vagas (sem teto de times): aí sim a tabela vem marcada como pool incompleto", async () => {
    banco.config = { ...banco.config, max_times: null };
    banco.inscritos = [...POOL_4A_40, ...ALEM_DOS_40].map((j) => inscricao(j, { situacao: "apto" }));
    const previa = await previaDoDraft(SEM_DRAFT);
    expect(previa.aptos).toBeGreaterThan(previa.vagas);
    expect(previa.impedimentos.length).toBeGreaterThan(0);
    expect(previa.tabela!.poolIncompleto).toBe(true);
  });
});

/*
 * C4 (decisão de 2026-10-22): o pool do draft são os TITULARES da fila que estão `apto`. A
 * fila corta pela ordem de inscrição (organizadores sempre dentro); antes, com 42 aptos para
 * 40 vagas, o sorteio travava até a organização marcar 2 como sobra.
 */
describe("o pool do draft é o dos titulares da fila (C4)", () => {
  /** `criado_em` na ordem da posição: a fila corta pela ordem de inscrição. */
  const comData = (j: JogadorDoPool, over: Partial<Linha> = {}) =>
    inscricao(j, { criado_em: new Date(Date.UTC(2026, 9, 5, 12, 0, j.posicao)).toISOString(), ...over });

  it("42 aptos para 40 vagas: entram os 40 primeiros da fila, sem impedimento", async () => {
    banco.inscritos = [...POOL_4A_40, ...ALEM_DOS_40].map((j) => comData(j, { situacao: "apto" }));
    const previa = await previaDoDraft(SEM_DRAFT);
    expect(previa.impedimentos).toEqual([]);
    expect(previa.aptos).toBe(40);
    expect(previa.titulares).toBe(40);
    expect(previa.naFila).toBe(2);
    const quem = previa.jogadores.map((j) => j.riotId);
    expect(quem).not.toContain("Jogador41#BR1");
    expect(quem).not.toContain("Jogador42#BR1");
    // O Diamante I (#41) seria capitão pelo elo — mas chegou depois das 40 vagas.
    expect([...previa.capitaesPelaRegra].sort()).toEqual([...CAPITAES_DA_REGRA].sort());
    expect(previa.tabela!.poolIncompleto).toBeUndefined();

    const estado = await montarDraftDosAprovados({ metodo: "maior_elo" });
    expect(estado.jogadores).toHaveLength(40);
    expect(estado.jogadores.some((j) => j.riotId === "Jogador41#BR1")).toBe(false);
  });

  it("quem se inscreveu ANTES fica: um dos 40 desiste e o 41º sobe para o pool", async () => {
    banco.inscritos = [...POOL_4A_40, ...ALEM_DOS_40].map((j) =>
      comData(j, j.posicao === 7 ? { situacao: "desistiu" } : { situacao: "apto" }),
    );
    const estado = await montarDraftDosAprovados({ metodo: "manual", capitaesManuais: CAPITAES_DA_REGRA });
    const quem = estado.jogadores.map((j) => j.riotId);
    expect(quem).toHaveLength(40);
    expect(quem).toContain("Jogador41#BR1");
    expect(quem).not.toContain("Jogador42#BR1");
    expect(quem).not.toContain("Jogador7#BR1");
  });

  it("titular ainda pendente não entra no sorteio e vira AVISO na mesa, com o nome — o sorteio segue (C4)", async () => {
    banco.inscritos = [...POOL_4A_40, ...ALEM_DOS_40].map((j) =>
      comData(j, j.posicao === 9 ? { situacao: "pendente" } : { situacao: "apto" }),
    );
    const previa = await previaDoDraft(SEM_DRAFT);
    expect(previa.titularesNaoAptos).toEqual([{ riotId: "Jogador9#BR1", situacao: "pendente" }]);
    expect(previa.aptos).toBe(39);
    expect(previa.jogadores.map((j) => j.riotId)).not.toContain("Jogador9#BR1");
    // O 41º NÃO sobe sozinho: o 9º continua titular (só não está apto) — faltam 1.
    expect(previa.jogadores.map((j) => j.riotId)).not.toContain("Jogador41#BR1");
    // Especificação C4: «titular que não está apto na hora de sortear vira aviso na mesa».
    expect(previa.impedimentos).toEqual([]);
    expect(previa.avisosDoSorteio.join(" ")).toContain("Faltam 1");

    // O sorteio sai com os 39, e a ordem perde a escolha que não teria quem escolher.
    const estado = await montarDraftDosAprovados({ metodo: "maior_elo" });
    expect(estado.jogadores).toHaveLength(39);
    expect(estado.ordem).toHaveLength(8 * 4 - 1);
    expect(estadoFecha(estado, ORCAMENTO_DA_MONTAGEM)).toBe(true);

    // Só com a escolha automática, o draft vai até o fim sem pausar; um time termina com 4 de
    // 5, e a virada aceita (a vaga é de um reserva da fila) e avisa.
    let e = iniciarDraft(estado, 0);
    for (let k = 1; k <= 40 && e.fase === "rodando"; k++) e = alcancarORelogio(e, k * 60_000 + 1);
    expect(e.motivoDaPausa).toBeUndefined();
    expect(e.fase).toBe("encerrado");
    const tamanhos = e.times.map((t) => e.jogadores.filter((j) => j.timeId === t.id).length).sort();
    expect(tamanhos).toEqual([4, 5, 5, 5, 5, 5, 5, 5]);
    expect(problemasDaVirada(e)).toEqual([]);
    expect(avisosDaVirada(e).join(" ")).toContain("vai para o site com 4 de 5");
  });

  it("quem está em «sobra» é reserva da fila, mesmo inscrito antes: a vaga vai ao próximo", async () => {
    banco.inscritos = [...POOL_4A_40, ...ALEM_DOS_40].map((j) =>
      comData(j, { situacao: j.posicao === 7 ? "sobra" : "apto" }),
    );
    const previa = await previaDoDraft(SEM_DRAFT);
    const quem = previa.jogadores.map((j) => j.riotId);
    expect(previa.impedimentos).toEqual([]);
    expect(quem).toHaveLength(40);
    expect(quem).not.toContain("Jogador7#BR1");
    expect(quem).toContain("Jogador41#BR1");
    expect(quem).not.toContain("Jogador42#BR1");
    expect(previa.naFila).toBe(2);
  });
});

/*
 * A queda automática (lib/draft/tabela-que-fecha.ts) ligada à prévia e à montagem.
 *
 * O risco que a simulação apontou: o Mestre do topo (organizador, 208 PDL) subir até o
 * congelamento. Com 8 times e a curvatura 0,1 ele fecha até 399 PDL; com 400 a 499 ele
 * custaria 19 e não existe repartição dos outros que feche os 8 elencos — o sorteio era
 * recusado. Agora a conta desce para 0,0875 sozinha.
 */
describe("a queda automática da curvatura", () => {
  const MESTRE_450 = () => POOL_4A_40.map((j) => inscricao(j.posicao === 1 ? { ...j, pdl: 450 } : j));

  it("Mestre #1 com 450 PDL: a prévia desce para 0,0875, explica, e os capitães da regra fecham", async () => {
    banco.inscritos = MESTRE_450();
    const previa = await previaDoDraft(SEM_DRAFT);
    expect(previa.fechaComOsCapitaesDaRegra).toBe(true);
    expect(previa.tabela).toMatchObject({ curvatura: 0.0875, soma: 240, folga: 0 });
    expect(previa.tabela!.queda).toEqual({
      curvaturaPedida: 0.1,
      motivo:
        "A curvatura caiu de 0,1 para 0,0875: com 0,1, não existe divisão dos outros jogadores que feche os elencos de todos os capitães (cada time precisa terminar com os 30 pontos certinhos).",
    });
    expect(pontosDe(previa)["Jogador1#BR1"]).toBe(17);
    expect(previa.totalDePontos).toBe(240);
  });

  it("Mestre #1 com 450 PDL: a montagem usa a mesma tabela e grava a queda no retrato", async () => {
    banco.inscritos = MESTRE_450();
    const estado = await montarDraftDosAprovados({ metodo: "maior_elo" });
    expect(estado.jogadores.find((j) => j.riotId === "Jogador1#BR1")!.pontos).toBe(17);
    expect(estado.jogadores.reduce((s, j) => s + j.pontos, 0)).toBe(240);
    expect(estado.tabelaDePontos).toMatchObject({ curvatura: 0.0875, folga: 0, queda: { curvaturaPedida: 0.1 } });
    expect(estadoFecha(estado, ORCAMENTO_DA_MONTAGEM)).toBe(true);
    // A prévia e a montagem dão o mesmo preço a todo mundo.
    const previa = await previaDoDraft(SEM_DRAFT);
    const daPrevia = pontosDe(previa);
    for (const j of estado.jogadores) expect(j.pontos, j.riotId).toBe(daPrevia[j.riotId]);
  });

  it("pool estreito (todos Platina): a soma exata não fecha em curvatura nenhuma, e a conta baixa a soma", async () => {
    banco.inscritos = POOL_SO_PLATINA.map((linha) => ({ ...linha }));
    const previa = await previaDoDraft(SEM_DRAFT);
    expect(previa.empateNoCorte).toBeNull();
    expect(previa.fechaComOsCapitaesDaRegra).toBe(true);
    expect(previa.tabela).toMatchObject({ curvatura: 0, alvo: 180, soma: 176, folga: 4 });
    expect(previa.tabela!.queda!.motivo).toContain("a soma ficou 4 pontos abaixo de 180 (176)");
    expect(previa.tabela!.queda!.motivo).toContain("um time pode terminar o draft gastando até 4 pontos a menos");

    const estado = await montarDraftDosAprovados({ metodo: "maior_elo" });
    expect(estado.jogadores.reduce((s, j) => s + j.pontos, 0)).toBe(176);
    expect(estado.tabelaDePontos).toMatchObject({ curvatura: 0, folga: 4 });
    expect(estadoFecha(estado, ORCAMENTO_DA_MONTAGEM)).toBe(true);
  });

  it("capitães à mão também ganham a queda: a tabela é a que fecha com OS ESCOLHIDOS", async () => {
    banco.inscritos = MESTRE_450();
    const estado = await montarDraftDosAprovados({ metodo: "manual", capitaesManuais: CAPITAES_DA_REGRA });
    expect(estado.tabelaDePontos!.curvatura).toBe(0.0875);
  });
});

describe("o draft público leva a classe e a tabela do sorteio", () => {
  it("cada jogador sai com a classe de preço, e a tabela do sorteio vai junto (sem ninguém nela)", async () => {
    const estado = await montarDraftDosAprovados({ metodo: "maior_elo" });
    expect(estado.jogadores.find((j) => j.riotId === "Jogador21#BR1")!.classe).toBe("Ouro II");
    expect(estado.jogadores.find((j) => j.riotId === "Jogador1#BR1")!.classe).toBe("Mestre · 200–299 PDL");
    expect(estado.jogadores.find((j) => j.riotId === "Jogador16#BR1")!.classe).toBe("Prata");

    const publico = paraPublico(estado, 1);
    const todos = [...Object.values(publico.elencos).flat(), ...publico.disponiveis];
    expect(todos.find((j) => j.riotId === "Jogador21#BR1")!.classe).toBe("Ouro II");
    expect(publico.tabelaDePontos).toEqual(estado.tabelaDePontos);
    // Só classes e números.
    expect(JSON.stringify(publico.tabelaDePontos)).not.toMatch(/Jogador|insc-|conta-/);
  });

  it("estado antigo, sem classe nem tabela: continua saindo como antes", async () => {
    const estado = await montarDraftDosAprovados({ metodo: "maior_elo" });
    const semClasse = estado.jogadores.map((j) => {
      const copia = { ...j };
      delete copia.classe;
      return copia;
    });
    const antigo = { ...estado, jogadores: semClasse };
    delete (antigo as { tabelaDePontos?: unknown }).tabelaDePontos;
    const publico = paraPublico(antigo, 1);
    expect(publico.tabelaDePontos).toBeNull();
    expect(publico.disponiveis.every((j) => !("classe" in j))).toBe(true);
  });
});

describe("a montagem do sorteio com a tabela automática", () => {
  it("o pool entra com os preços da tabela, e o retrato dela fica gravado no estado", async () => {
    // Os 40 e dois aprovados na sobra (42 aprovados: 8 times, 40 vagas).
    banco.inscritos = [...POOL_4A_40, ...ALEM_DOS_40].map((j) => inscricao(j));
    const estado = await montarDraftDosAprovados({ metodo: "maior_elo" });

    const preco = Object.fromEntries(estado.jogadores.map((j) => [j.riotId, j.pontos]));
    expect(preco["Jogador1#BR1"]).toBe(15);
    expect(preco["Jogador24#BR1"]).toBe(2);
    expect(estado.jogadores).toHaveLength(40);
    expect(estado.jogadores.reduce((s, j) => s + j.pontos, 0)).toBe(240);
    expect(estado.tabelaDePontos).toMatchObject({ times: 8, alvo: 240, soma: 240, folga: 0 });
    expect(estado.tabelaDePontos!.linhas.reduce((s, l) => s + l.quantos * l.pontos, 0)).toBe(240);
    expect([...estado.times.map((t) => t.capitaoId)].sort()).toEqual([...CAPITAES_DA_REGRA].sort());
    expect(estadoFecha(estado, ORCAMENTO_DA_MONTAGEM)).toBe(true);
    // Reserva (sobra) não entra no pool — nem o Diamante I, que pelo elo seria capitão.
    expect(estado.jogadores.some((j) => j.riotId === "Jogador41#BR1")).toBe(false);
    expect(estado.jogadores.some((j) => j.riotId === "Jogador42#BR1")).toBe(false);
  });

  it("congelado: o sorteio usa a fotografia do congelamento, não a leitura de hoje", async () => {
    banco.inscritos = POOL_4A_40.map((j) => {
      const linha = inscricao(j, congelada(j));
      return j.posicao === 1 ? { ...linha, riot_pdl: 650 } : linha;
    });
    const estado = await montarDraftDosAprovados({ metodo: "maior_elo" });
    expect(estado.jogadores.find((j) => j.riotId === "Jogador1#BR1")!.pontos).toBe(15);
  });

  it("os capitães não fecham nem com a queda: recusa explicando a soma exata, sem sugerir média + 15%", async () => {
    banco.inscritos = POOL_QUE_NUNCA_FECHA.map((linha) => ({ ...linha }));
    const erro = await montarDraftDosAprovados({ metodo: "maior_elo" }).catch((e: Error) => e);
    expect(erro).toBeInstanceOf(Error);
    const texto = (erro as Error).message;
    expect(texto).toContain("soma exatamente 180");
    expect(texto).toContain("baixar a curvatura até 0 e a soma até 174");
    expect(texto).toContain("Troque os capitães");
    expect(texto).not.toMatch(/15%|a regra dá/);
  });

  it("o pool em que só a soma exata não fechava agora monta, com a soma 1 ponto abaixo", async () => {
    banco.inscritos = POOL_QUE_NAO_FECHA.map((linha) => ({ ...linha }));
    const estado = await montarDraftDosAprovados({ metodo: "maior_elo" });
    expect(estado.jogadores.reduce((s, j) => s + j.pontos, 0)).toBe(179);
    expect(estado.tabelaDePontos).toMatchObject({ curvatura: 0, folga: 1 });
    expect(estadoFecha(estado, ORCAMENTO_DA_MONTAGEM)).toBe(true);
  });

  it("elo que a tabela não reconhece trava o sorteio com o nome de quem corrigir", async () => {
    banco.inscritos = POOL_4A_40.map((j) => (j.posicao === 7 ? inscricao(j, { elo_verificado: "Lata" }) : inscricao(j)));
    await expect(montarDraftDosAprovados({ metodo: "maior_elo" })).rejects.toThrow(/Jogador7#BR1/);
  });
});

describe("o pool que não fecha é mesmo de soma exata", () => {
  it("a tabela dele fecha 180 — o problema é a repartição, não a soma", () => {
    const t = calcularTabela({
      pool: ELOS_QUE_NAO_FECHAM.map(([elo, divisao, pdl]) => ({ elo, eloRiot: elo, divisao, pdl })),
      times: 6,
      jogadoresPorTime: 5,
      orcamentoPorTime: 30,
    });
    expect(t).toMatchObject({ soma: 180, folga: 0 });
  });
});
