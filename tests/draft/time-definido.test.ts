import { describe, expect, it } from "vitest";

import {
  alcancarORelogio,
  aplicarEscolha,
  atualizarForaDoPool,
  ehTimeDefinido,
  escolhiveisDaVez,
  estadoFecha,
  gastoDoTime,
  iniciarDraft,
  jogadoresDisponiveis,
  maisBaratoValido,
  montarDraft,
  ordemSerpentina,
  timeDaVez,
  vagasAbertasDoTime,
  type EstadoDraft,
  type JogadorDoDraft,
  type TimeDoDraft,
} from "@/lib/draft/motor";
import {
  podeSubstituir,
  precosDoSorteio,
  previaDosPrecos,
  retratoDaPrevia,
  type InscricaoDaPrevia,
} from "@/lib/draft/previa-de-precos";
import { tabelaQueFecha } from "@/lib/draft/tabela-que-fecha";
import {
  rotaNoTimeDefinido,
  rotasDoMembro,
  separarTimeDefinido,
  type InscricaoDoTimeDefinido,
} from "@/lib/draft/time-definido";
import { ORCAMENTO_DA_MONTAGEM } from "@/lib/draft/viabilidade";
import { avisosDaVirada, datasetDoDraft, problemasDaVirada } from "@/lib/draft/virada";
import { resolveElo } from "@/lib/design";
import { CAPITAES_23_10, POOL_4A_40_23_10, type JogadorDoPool } from "./_pool-4a";

/**
 * O TIME DEFINIDO PELA ORGANIZAÇÃO (decisão de 24/10/2026, dia do draft da 4ª Edição).
 *
 * Os organizadores jogam juntos num time que já entra pronto e NÃO vai ao draft: não escolhe e
 * ninguém o escolhe. São 40 titulares, 8 times de 5 — o time definido e 7 que
 * disputam o draft, cada um com 30 pontos para as 4 escolhas. A tabela é calculada só sobre
 * os 28 que vão ser escolhidos (soma exata 7 × 30 = 210).
 *
 * Aqui fica a parte PURA (sem banco): a separação (lib/draft/time-definido.ts), o motor com o
 * elenco definido, a virada e a prévia de preços do navegador. A ligação com o banco (prévia
 * e montagem do sorteio) está em tests/draft/time-definido-store.test.ts.
 *
 * No pool real de 23/10 (`POOL_4A_40_23_10`) o time definido são as posições 1, 2, 3, 21 e
 * 31 — JUNG, MID, ADC, SUP e TOP —, com o capitão na 1; os 7 capitães do draft são os de
 * `CAPITAES_23_10` sem a 1.
 */

const T0 = Date.parse("2026-10-24T22:00:00.000Z");

// ---------------------------------------------------------------- o pool real

/** A rota de cada membro do time definido no pool real (posição → rota). */
const ROTA_NO_TIME: Readonly<Record<number, string>> = { 1: "JUNG", 2: "MID", 3: "ADC", 21: "SUP", 31: "TOP" };
/** Os membros na ordem das rotas (TOP, JUNG, MID, ADC, SUP). */
const MEMBROS_EM_ORDEM = [31, 1, 2, 3, 21];
const CAPITAES_DO_DRAFT = CAPITAES_23_10.filter((p) => p !== 1);

const id = (posicao: number) => `insc-${posicao}`;
const riotId = (posicao: number) => `Jogador${posicao}#BR1`;

/**
 * A tabela dos 28 que vão ser escolhidos (capitão sem preço, os 7 capitães do draft): classe →
 * quantos → pontos. Sem o Diamante III da lista de 8 times: ele (a posição 2) está no time
 * definido.
 */
const TABELA_DOS_28: [string, number, number][] = [
  ["Ferro", 1, 1],
  ["Bronze IV", 1, 1],
  ["Prata III", 2, 2],
  ["Prata I", 1, 3],
  ["Ouro IV", 1, 4],
  ["Ouro III", 2, 4],
  ["Ouro II", 1, 4],
  ["Platina IV", 2, 5],
  ["Platina III", 3, 6],
  ["Platina I", 3, 7],
  ["Esmeralda IV", 3, 8],
  ["Esmeralda II", 1, 10],
  ["Esmeralda I", 1, 11],
  ["Diamante IV", 2, 12],
  ["Diamante II", 1, 15],
  ["Diamante I", 1, 16],
  ["Mestre · 0–99 PDL", 2, 18],
];

/** Uma linha de `inscricoes` como o `select *` devolve, com as marcas de capitão e de time definido. */
function inscricao(j: JogadorDoPool, over: Record<string, unknown> = {}): InscricaoDaPrevia & { id: string } {
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
    time_definido: ROTA_NO_TIME[j.posicao] ?? null,
    ...over,
  } as unknown as InscricaoDaPrevia & { id: string };
}

const inscritosReais = (over: (j: JogadorDoPool) => Record<string, unknown> = () => ({})) =>
  POOL_4A_40_23_10.map((j) => inscricao(j, over(j)));

// ---------------------------------------------------------------- uma edição pequena

/**
 * Uma edição de 3 times de 5: o time definido (m1…m5, capitão m3) e dois do draft (capitães
 * c1 e c2, mais 8 jogadores). Os membros vêm FORA da ordem das rotas, de propósito.
 */
function edicaoPequena(): InscricaoDoTimeDefinido[] {
  const membro = (n: number, rota: string, capitao = false): InscricaoDoTimeDefinido => ({
    id: `m${n}`,
    riot_id: `M${n}#BR1`,
    situacao: "apto",
    capitao,
    time_definido: rota,
    rota_primaria: rota,
    rota_secundaria: "TOP",
  });
  const outro = (nome: string, capitao = false): InscricaoDoTimeDefinido => ({
    id: nome,
    riot_id: `${nome.toUpperCase()}#BR1`,
    situacao: "apto",
    capitao,
    time_definido: null,
    rota_primaria: "MID",
    rota_secundaria: "TOP",
  });
  return [
    membro(1, "SUP"),
    outro("c1", true),
    membro(2, "MID"),
    membro(3, "TOP", true),
    outro("c2", true),
    membro(4, "ADC"),
    membro(5, "JUNG"),
    ...Array.from({ length: 8 }, (_, k) => outro(`j${k + 1}`)),
  ];
}

function separar(inscritos: InscricaoDoTimeDefinido[], opcoes: { pool?: InscricaoDoTimeDefinido[]; times?: number } = {}) {
  return separarTimeDefinido({
    pool: opcoes.pool ?? inscritos.filter((i) => i.situacao === "apto"),
    inscritos,
    times: opcoes.times ?? 3,
    jogadoresPorTime: 5,
  });
}

/** A edição pequena com uma inscrição trocada. */
function comTroca(idDaInscricao: string, troca: Partial<InscricaoDoTimeDefinido>): InscricaoDoTimeDefinido[] {
  return edicaoPequena().map((i) => (i.id === idDaInscricao ? { ...i, ...troca } : i));
}

// ================================================================ a separação

describe("separarTimeDefinido: sem ninguém marcado, tudo como antes", () => {
  it("sem a coluna (banco antigo) ou com a coluna vazia: nada muda", () => {
    const semColuna = edicaoPequena().map((i) => {
      const linha = { ...i };
      delete linha.time_definido;
      return linha;
    });
    const vazia = edicaoPequena().map((i) => ({ ...i, time_definido: null }));
    for (const inscritos of [semColuna, vazia]) {
      const s = separar(inscritos);
      expect(s).toMatchObject({ marcado: false, ativo: false, membros: [], capitaoId: null, timesNoDraft: 3, impedimentos: [] });
      expect(s.rotaDe.size).toBe(0);
      expect(s.draft.map((i) => i.id)).toEqual(inscritos.map((i) => i.id));
      expect(s.inscritosDoDraft.map((i) => i.id)).toEqual(inscritos.map((i) => i.id));
    }
  });

  it("rota fora das cinco do dataset não marca ninguém (nem «SELVA», a palavra do formulário)", () => {
    for (const rota of ["FOO", "", "   ", "SELVA"]) {
      const inscritos = edicaoPequena().map((i) => (i.time_definido ? { ...i, time_definido: rota } : i));
      expect(separar(inscritos).marcado).toBe(false);
    }
    expect(rotaNoTimeDefinido({ time_definido: undefined })).toBeNull();
    expect(rotaNoTimeDefinido({ time_definido: null })).toBeNull();
  });

  it("a rota é lida sem caixa e sem espaço em volta", () => {
    expect(rotaNoTimeDefinido({ time_definido: " jung " })).toBe("JUNG");
    expect(rotaNoTimeDefinido({ time_definido: "Sup" })).toBe("SUP");
  });
});

describe("separarTimeDefinido: o time definido valendo", () => {
  it("os cinco saem do draft, um time a menos disputa as escolhas, e o capitão é o marcado entre eles", () => {
    const inscritos = edicaoPequena();
    const s = separar(inscritos);
    expect(s).toMatchObject({ marcado: true, ativo: true, capitaoId: "m3", timesNoDraft: 2, impedimentos: [] });
    // Na ordem das rotas (TOP, JUNG, MID, ADC, SUP), não na ordem da lista.
    expect(s.membros.map((i) => i.id)).toEqual(["m3", "m5", "m2", "m4", "m1"]);
    expect(Object.fromEntries(s.rotaDe)).toEqual({ m1: "SUP", m2: "MID", m3: "TOP", m4: "ADC", m5: "JUNG" });
    expect(s.draft.map((i) => i.id)).toEqual(["c1", "c2", "j1", "j2", "j3", "j4", "j5", "j6", "j7", "j8"]);
    expect(s.inscritosDoDraft.map((i) => i.id)).toEqual(s.draft.map((i) => i.id));
  });

  it("quem não está no pool continua nas inscrições do draft (a conta dos capitães o enxerga)", () => {
    const inscritos = [...edicaoPequena(), { id: "p", riot_id: "P#BR1", situacao: "pendente", capitao: true, time_definido: null }];
    const s = separar(inscritos);
    expect(s.ativo).toBe(true);
    expect(s.draft.map((i) => i.id)).not.toContain("p");
    expect(s.inscritosDoDraft.map((i) => i.id)).toContain("p");
  });

  it("no pool real de 23/10: as posições 1, 2, 3, 21 e 31, capitão o 1, e 35 no draft", () => {
    const inscritos = inscritosReais() as unknown as InscricaoDoTimeDefinido[];
    const s = separarTimeDefinido({ pool: inscritos, inscritos, times: 8, jogadoresPorTime: 5 });
    expect(s.ativo).toBe(true);
    expect(s.membros.map((i) => i.id)).toEqual(MEMBROS_EM_ORDEM.map(id));
    expect(s.capitaoId).toBe(id(1));
    expect(s.timesNoDraft).toBe(7);
    expect(s.draft).toHaveLength(35);
    // Os capitães marcados que sobram no draft são os 7 do draft.
    expect(s.draft.filter((i) => i.capitao === true).map((i) => i.id).sort()).toEqual(CAPITAES_DO_DRAFT.map(id).sort());
  });
});

describe("separarTimeDefinido: o que impede o sorteio", () => {
  /** Inválido: nada sai do draft, e a mesa vê o porquê. */
  function invalido(s: ReturnType<typeof separar>, inscritos: InscricaoDoTimeDefinido[]) {
    expect(s).toMatchObject({ marcado: true, ativo: false, membros: [], capitaoId: null, timesNoDraft: 3 });
    expect(s.rotaDe.size).toBe(0);
    expect(s.draft.map((i) => i.id)).toEqual(inscritos.filter((i) => i.situacao === "apto").map((i) => i.id));
    expect(s.inscritosDoDraft).toHaveLength(inscritos.length);
    expect(s.impedimentos.length).toBeGreaterThan(0);
  }

  it.each(["recusado", "desistiu", "excluido"])("membro que saiu do campeonato (%s): troque o membro", (situacao) => {
    const inscritos = comTroca("m2", { situacao });
    const s = separar(inscritos);
    invalido(s, inscritos);
    expect(s.impedimentos[0]).toBe(
      `M2#BR1 (${situacao}) está marcado no time definido pela organização e saiu do campeonato. Troque o membro do time definido antes de sortear.`,
    );
    // E o time fica com 4: o número também é impedimento.
    expect(s.impedimentos).toContain("O time definido pela organização tem 4 jogadores e precisa de exatamente 5.");
  });

  it("membro fora do pool (inscrição ainda pendente): aprove antes de sortear", () => {
    const inscritos = comTroca("m4", { situacao: "pendente" });
    const s = separar(inscritos);
    invalido(s, inscritos);
    expect(s.impedimentos).toEqual([
      "M4#BR1 (pendente) está no time definido pela organização, mas não entre os titulares aptos. Aprove a inscrição antes de sortear.",
    ]);
  });

  it("número errado: 4 ou 6 marcados", () => {
    const quatro = comTroca("m1", { time_definido: null });
    const s4 = separar(quatro);
    invalido(s4, quatro);
    expect(s4.impedimentos).toEqual(["O time definido pela organização tem 4 jogadores e precisa de exatamente 5."]);

    // Seis: um a mais (na SUP, que já tinha dono) — o número e a rota repetida.
    const seis = comTroca("j1", { time_definido: "SUP" });
    const s6 = separar(seis);
    invalido(s6, seis);
    expect(s6.impedimentos).toEqual([
      "O time definido pela organização tem 6 jogadores e precisa de exatamente 5.",
      "O time definido pela organização tem a rota SUP repetida: cada membro precisa de uma rota diferente.",
    ]);
  });

  it("rota inválida conta como não marcado: o time fica com 4", () => {
    const inscritos = comTroca("m5", { time_definido: "SELVA" });
    expect(separar(inscritos).impedimentos).toEqual(["O time definido pela organização tem 4 jogadores e precisa de exatamente 5."]);
  });

  it("rota repetida: cada membro numa rota", () => {
    const inscritos = comTroca("m5", { time_definido: "MID" });
    const s = separar(inscritos);
    invalido(s, inscritos);
    expect(s.impedimentos).toEqual([
      "O time definido pela organização tem a rota MID repetida: cada membro precisa de uma rota diferente.",
    ]);
  });

  it("sem capitão: marque um dos membros", () => {
    const inscritos = comTroca("m3", { capitao: false });
    const s = separar(inscritos);
    invalido(s, inscritos);
    expect(s.impedimentos).toEqual([
      "O time definido pela organização está sem capitão: marque um dos membros em «Definir capitães».",
    ]);
  });

  it("dois capitães: só um dos membros pode ser", () => {
    const inscritos = comTroca("m1", { capitao: true });
    const s = separar(inscritos);
    invalido(s, inscritos);
    expect(s.impedimentos).toEqual([
      "O time definido pela organização tem 2 capitães (M1#BR1, M3#BR1): só um dos membros pode ser o capitão.",
    ]);
  });

  it("capitão marcado que saiu do campeonato não conta como capitão", () => {
    // O capitão desistiu: sai do time (4 jogadores), e o time fica sem capitão.
    const inscritos = comTroca("m3", { situacao: "desistiu" });
    const s = separar(inscritos);
    expect(s.impedimentos).toContain("O time definido pela organização está sem capitão: marque um dos membros em «Definir capitães».");
  });

  it("menos de 2 times: não sobra time para o draft", () => {
    const inscritos = edicaoPequena();
    const s = separar(inscritos, { times: 1 });
    expect(s).toMatchObject({ marcado: true, ativo: false, timesNoDraft: 1 });
    expect(s.impedimentos).toEqual(["Com o time definido pela organização é preciso pelo menos mais um time no draft."]);
  });

  it("sem Riot ID, o recado usa o id da inscrição", () => {
    const inscritos = comTroca("m4", { situacao: "pendente", riot_id: null });
    expect(separar(inscritos).impedimentos[0]).toMatch(/^m4 \(pendente\) está no time definido/);
  });
});

describe("rotasDoMembro: a rota do time primeiro, e a segunda que ele marcou", () => {
  it("principal diferente da rota do time: a principal vira a segunda", () => {
    expect(rotasDoMembro({ rota_primaria: "TOP", rota_secundaria: "JUNG" }, "JUNG")).toEqual({ rota1: "JUNG", rota2: "TOP" });
    expect(rotasDoMembro({ rota_primaria: "ADC", rota_secundaria: "TOP" }, "TOP")).toEqual({ rota1: "TOP", rota2: "ADC" });
  });

  it("principal igual à rota do time: a secundária vira a segunda", () => {
    expect(rotasDoMembro({ rota_primaria: "MID", rota_secundaria: "ADC" }, "MID")).toEqual({ rota1: "MID", rota2: "ADC" });
  });

  it("sem segunda diferente da do time, a segunda fica vazia", () => {
    expect(rotasDoMembro({ rota_primaria: "SUP", rota_secundaria: "SUP" }, "SUP")).toEqual({ rota1: "SUP", rota2: "" });
    expect(rotasDoMembro({ rota_primaria: null, rota_secundaria: "TOP" }, "TOP")).toEqual({ rota1: "TOP", rota2: "" });
    expect(rotasDoMembro({ rota_primaria: null, rota_secundaria: null }, "ADC")).toEqual({ rota1: "ADC", rota2: "" });
  });

  it("sem principal, a secundária", () => {
    expect(rotasDoMembro({ rota_primaria: "", rota_secundaria: "ADC" }, "TOP")).toEqual({ rota1: "TOP", rota2: "ADC" });
  });
});

// ================================================================ o motor

const jogador = (jid: string, pontos: number, rotas: { rota1?: string; rota2?: string } = {}): JogadorDoDraft => ({
  id: jid,
  riotId: `${jid.toUpperCase()}#BR1`,
  pontos,
  rota1: rotas.rota1 ?? "MID",
  rota2: rotas.rota2 ?? "TOP",
  elo: "Prata",
  timeId: null,
});

/**
 * Dois times do draft de 3 (capitão + 2) e o time definido "d" (d1 capitão, d2, d3), que vem
 * PRIMEIRO na lista dos times — e mesmo assim fica fora da ordem. Orçamento 20, com folga:
 * qualquer um cabe em qualquer time.
 */
function comTimeDefinido(timesExtras: TimeDoDraft[] = []): EstadoDraft {
  return montarDraft({
    times: [
      { id: "d", nome: "DEFINIDO", cor: "#fff", capitaoId: "d1", elencoDefinido: ["d1", "d2", "d3"] },
      { id: "a", nome: "A", cor: "#fff", capitaoId: "ca" },
      { id: "b", nome: "B", cor: "#fff", capitaoId: "cb" },
      ...timesExtras,
    ],
    jogadores: [
      jogador("ca", 0),
      jogador("cb", 0),
      jogador("p1", 1),
      jogador("p2", 2),
      jogador("p3", 2),
      jogador("p4", 2),
      jogador("d1", 0),
      jogador("d2", 0),
      jogador("d3", 0),
    ],
    jogadoresPorTime: 3,
    orcamentoPorTime: 20,
    segundosPorEscolha: 60,
  });
}

/** Roda o relógio uma escolha por vez (a escolha automática), até parar. */
function rodarAteParar(e: EstadoDraft, desdeMs: number): EstadoDraft {
  let atual = e;
  for (let k = 1; k <= 60 && atual.fase === "rodando"; k++) atual = alcancarORelogio(atual, desdeMs + k * 60_000 + 1);
  return atual;
}

describe("montarDraft com o elenco definido", () => {
  it("o time definido nasce completo, sem gasto, e fica fora da ordem (mesmo vindo primeiro)", () => {
    const e = comTimeDefinido();
    expect(e.jogadores.filter((j) => j.timeId === "d").map((j) => j.id)).toEqual(["d1", "d2", "d3"]);
    expect(vagasAbertasDoTime(e, "d")).toBe(0);
    expect(gastoDoTime(e, "d")).toBe(0);
    expect(e.ordem).toEqual(["a", "b", "b", "a"]);
    expect(ehTimeDefinido(e.times[0]!)).toBe(true);
    expect(ehTimeDefinido(e.times[1]!)).toBe(false);
    // Os membros não estão à disposição de ninguém.
    expect(jogadoresDisponiveis(e).map((j) => j.id)).toEqual(["p1", "p2", "p3", "p4"]);
    expect(estadoFecha(e)).toBe(true);
  });

  it("elenco definido vazio não é time definido (vai ao draft como os outros)", () => {
    expect(ehTimeDefinido({ elencoDefinido: [] })).toBe(false);
    expect(ehTimeDefinido({})).toBe(false);
  });

  it("8 times com 1 definido: a serpentina é dos 7, 7 × 4 = 28 escolhas", () => {
    const times: TimeDoDraft[] = Array.from({ length: 8 }, (_, k) => ({
      id: `time-${k + 1}`,
      nome: `TIME ${k + 1}`,
      cor: "#fff",
      capitaoId: `cap-${k + 1}`,
      ...(k === 2 ? { elencoDefinido: ["cap-3", "td-1", "td-2", "td-3", "td-4"] } : {}),
    }));
    const jogadores = [
      ...Array.from({ length: 8 }, (_, k) => jogador(`cap-${k + 1}`, 0)),
      ...Array.from({ length: 4 }, (_, k) => jogador(`td-${k + 1}`, 0)),
      ...Array.from({ length: 28 }, (_, k) => jogador(`j-${k + 1}`, 7)),
    ];
    const e = montarDraft({ times, jogadores, jogadoresPorTime: 5, orcamentoPorTime: 30, segundosPorEscolha: 60 });
    const doDraft = times.filter((t) => t.id !== "time-3").map((t) => t.id);
    expect(e.ordem).toEqual(ordemSerpentina(doDraft, 4));
    expect(e.ordem).toHaveLength(28);
    expect(e.ordem).not.toContain("time-3");
    expect(e.jogadores.filter((j) => j.timeId === "time-3")).toHaveLength(5);
  });

  it("recusa o capitão fora do elenco definido", () => {
    expect(() =>
      montarDraft({
        times: [
          { id: "d", nome: "DEFINIDO", cor: "#fff", capitaoId: "d1", elencoDefinido: ["d2", "d3", "p1"] },
          { id: "a", nome: "A", cor: "#fff", capitaoId: "ca" },
        ],
        jogadores: [jogador("ca", 0), jogador("d1", 0), jogador("d2", 0), jogador("d3", 0), jogador("p1", 1), jogador("p2", 1)],
        jogadoresPorTime: 3,
        orcamentoPorTime: 20,
        segundosPorEscolha: 60,
      }),
    ).toThrow("O capitão do time DEFINIDO não está no elenco definido dele.");
  });

  it("recusa o elenco definido do tamanho errado", () => {
    expect(() =>
      montarDraft({
        times: [
          { id: "d", nome: "DEFINIDO", cor: "#fff", capitaoId: "d1", elencoDefinido: ["d1", "d2"] },
          { id: "a", nome: "A", cor: "#fff", capitaoId: "ca" },
        ],
        jogadores: [jogador("ca", 0), jogador("d1", 0), jogador("d2", 0), jogador("p1", 1), jogador("p2", 1)],
        jogadoresPorTime: 3,
        orcamentoPorTime: 20,
        segundosPorEscolha: 60,
      }),
    ).toThrow("O time DEFINIDO foi definido com 2 jogadores para 3 vagas.");
  });

  it("recusa o mesmo jogador em dois elencos definidos", () => {
    expect(() =>
      comTimeDefinido([{ id: "e", nome: "OUTRO", cor: "#fff", capitaoId: "p1", elencoDefinido: ["p1", "p2", "d2"] }]),
    ).toThrow("O mesmo jogador foi colocado em mais de um time definido.");
  });

  it("recusa o capitão de um time do draft dentro do elenco definido", () => {
    expect(() =>
      montarDraft({
        times: [
          { id: "d", nome: "DEFINIDO", cor: "#fff", capitaoId: "d1", elencoDefinido: ["d1", "d2", "ca"] },
          { id: "a", nome: "A", cor: "#fff", capitaoId: "ca" },
        ],
        jogadores: [jogador("ca", 0), jogador("d1", 0), jogador("d2", 0), jogador("p1", 1), jogador("p2", 1)],
        jogadoresPorTime: 3,
        orcamentoPorTime: 20,
        segundosPorEscolha: 60,
      }),
    ).toThrow("O capitão do time A está no elenco do time definido.");
  });

  it("recusa membro do elenco definido que não está no pool", () => {
    expect(() =>
      montarDraft({
        times: [
          { id: "d", nome: "DEFINIDO", cor: "#fff", capitaoId: "d1", elencoDefinido: ["d1", "d2", "fantasma"] },
          { id: "a", nome: "A", cor: "#fff", capitaoId: "ca" },
        ],
        jogadores: [jogador("ca", 0), jogador("d1", 0), jogador("d2", 0), jogador("p1", 1), jogador("p2", 1)],
        jogadoresPorTime: 3,
        orcamentoPorTime: 20,
        segundosPorEscolha: 60,
      }),
    ).toThrow("Um jogador do time definido não está no pool.");
  });
});

describe("o draft andando com o time definido", () => {
  it("o time definido nunca tem a vez, e ninguém leva um membro", () => {
    const fim = rodarAteParar(iniciarDraft(comTimeDefinido(), T0), T0);
    expect(fim.fase).toBe("encerrado");
    expect(fim.historico.map((h) => h.timeId)).toEqual(["a", "b", "b", "a"]);
    expect(fim.jogadores.filter((j) => j.timeId === "d").map((j) => j.id)).toEqual(["d1", "d2", "d3"]);
    expect(problemasDaVirada(fim)).toEqual([]);
    expect(avisosDaVirada(fim)).toEqual([]);
  });

  it("alguém do pool sai: a escolha cortada é de um time do draft, nunca do definido — e volta a eles", () => {
    const antes = iniciarDraft(comTimeDefinido(), T0);
    const comSaida = atualizarForaDoPool(antes, new Set(["p4"]), T0);
    expect(comSaida.ordem).toHaveLength(3);
    expect(comSaida.ordem).not.toContain("d");
    expect(timeDaVez(comSaida)).toBe("a");

    // Quem saiu volta a valer: a ordem recupera a escolha, e ela continua sem o definido.
    const voltou = atualizarForaDoPool(comSaida, new Set(), T0);
    expect(voltou.ordem).toEqual(["a", "b", "b", "a"]);

    // O draft fecha sem travar; o definido segue com os três, e o aviso da virada é só do outro.
    const fim = rodarAteParar(comSaida, T0);
    expect(fim.fase).toBe("encerrado");
    expect(fim.jogadores.filter((j) => j.timeId === "d")).toHaveLength(3);
    expect(problemasDaVirada(fim)).toEqual([]);
    expect(avisosDaVirada(fim).join(" ")).not.toContain("DEFINIDO");
  });

  it("um membro do time definido que sai do campeonato não mexe no draft (C2): ele já está num elenco", () => {
    const e = iniciarDraft(comTimeDefinido(), T0);
    expect(atualizarForaDoPool(e, new Set(["d2"]), T0)).toBe(e);
    const misto = atualizarForaDoPool(e, new Set(["d2", "p4"]), T0);
    expect(misto.foraDoPool).toEqual(["p4"]);
    expect(misto.ordem).not.toContain("d");
  });

  it("o capitão do time definido não consegue escolher: nunca é a vez dele", () => {
    const e = iniciarDraft(comTimeDefinido(), T0);
    expect(() => aplicarEscolha(e, "d", "p1", T0)).toThrow("Não é a vez do seu time.");
  });
});

// ================================================================ o draft inteiro com o pool real

/** O draft da 4ª montado à mão com o motor: o time definido e os 7 do draft, com a tabela dos 28. */
function draftReal(): EstadoDraft {
  const doDraft = POOL_4A_40_23_10.filter((j) => !(j.posicao in ROTA_NO_TIME));
  const conta = tabelaQueFecha({
    pool: doDraft.map((j) => ({ id: id(j.posicao), elo: j })),
    capitaes: CAPITAES_DO_DRAFT.map(id),
    times: 7,
    jogadoresPorTime: 5,
    orcamentoPorTime: 30,
    capitaoGratis: true,
  });
  const membros = MEMBROS_EM_ORDEM.map((p) => POOL_4A_40_23_10[p - 1]!);
  const jogadores: JogadorDoDraft[] = [
    ...doDraft.map((j) => ({
      id: id(j.posicao),
      riotId: riotId(j.posicao),
      pontos: conta.precoDe.get(id(j.posicao))!,
      rota1: j.rota1,
      rota2: j.rota2,
      elo: j.elo,
      timeId: null,
    })),
    ...membros.map((j) => ({
      id: id(j.posicao),
      riotId: riotId(j.posicao),
      pontos: 0,
      ...rotasDoMembro({ rota_primaria: j.rota1, rota_secundaria: j.rota2 }, ROTA_NO_TIME[j.posicao] as "TOP"),
      elo: j.elo,
      timeId: null,
    })),
  ];
  // O time definido no meio da lista, como pode sair do sorteio.
  const capitaes = [...CAPITAES_DO_DRAFT.slice(0, 3), 1, ...CAPITAES_DO_DRAFT.slice(3)];
  const times: TimeDoDraft[] = capitaes.map((p, k) => ({
    id: `time-${k + 1}`,
    nome: `TIME ${k + 1}`,
    cor: "#fff",
    capitaoId: id(p),
    ...(p === 1 ? { elencoDefinido: MEMBROS_EM_ORDEM.map(id) } : {}),
  }));
  return montarDraft({ times, jogadores, jogadoresPorTime: 5, orcamentoPorTime: 30, segundosPorEscolha: 60 });
}

describe("o draft da 4ª inteiro, com o time definido", () => {
  it("a tabela dos 28: soma exata 210, 4 escolhas por time, preço médio 7,5", () => {
    const doDraft = POOL_4A_40_23_10.filter((j) => !(j.posicao in ROTA_NO_TIME));
    const { tabela, fecha, queda, precoDe } = tabelaQueFecha({
      pool: doDraft.map((j) => ({ id: id(j.posicao), elo: j })),
      capitaes: CAPITAES_DO_DRAFT.map(id),
      times: 7,
      jogadoresPorTime: 5,
      orcamentoPorTime: 30,
      capitaoGratis: true,
    });
    expect(fecha).toBe(true);
    expect(queda).toBeNull();
    expect(tabela).toMatchObject({ times: 7, jogadoresPorTime: 4, alvo: 210, soma: 210, folga: 0 });
    expect(tabela.reta.precoMedio).toBe(7.5);
    expect(tabela.linhas.map((l) => [l.classe.rotulo, l.quantos, l.pontos])).toEqual(TABELA_DOS_28);
    const pagos = [...precoDe].filter(([k]) => !CAPITAES_DO_DRAFT.map(id).includes(k));
    expect(pagos).toHaveLength(28);
    expect(pagos.reduce((s, [, p]) => s + p, 0)).toBe(210);
  });

  it("a montagem fecha, e a ordem é a serpentina dos 7 (28 escolhas)", () => {
    const e = draftReal();
    expect(estadoFecha(e, ORCAMENTO_DA_MONTAGEM)).toBe(true);
    expect(e.ordem).toHaveLength(28);
    expect(e.ordem).not.toContain("time-4");
    expect(jogadoresDisponiveis(e)).toHaveLength(28);
  });

  it("sempre o mais barato válido (a escolha automática): os 7 terminam com os 30 certinhos", () => {
    let e = iniciarDraft(draftReal(), T0);
    while (e.fase === "rodando") {
      const vez = timeDaVez(e)!;
      const escolhido = maisBaratoValido(e, vez);
      expect(escolhido, `sem saída na escolha ${e.escolhaAtual}`).not.toBeNull();
      e = aplicarEscolha(e, vez, escolhido!.id, T0);
    }
    expect(e.fase).toBe("encerrado");
    for (const t of e.times) {
      expect(vagasAbertasDoTime(e, t.id)).toBe(0);
      expect(gastoDoTime(e, t.id)).toBe(ehTimeDefinido(t) ? 0 : 30);
    }
    expect(e.jogadores.filter((j) => j.timeId === "time-4").map((j) => j.id)).toEqual(MEMBROS_EM_ORDEM.map(id));
  });

  it("sempre o mais caro que o motor deixa: também fecha os 7 com 30", () => {
    let e = iniciarDraft(draftReal(), T0);
    while (e.fase === "rodando") {
      const vez = timeDaVez(e)!;
      const livres = new Map(jogadoresDisponiveis(e).map((j) => [j.id, j]));
      const opcoes = escolhiveisDaVez(e)
        .map((x) => livres.get(x)!)
        .sort((a, b) => b.pontos - a.pontos || a.riotId.localeCompare(b.riotId));
      expect(opcoes.length, `sem saída na escolha ${e.escolhaAtual}`).toBeGreaterThan(0);
      e = aplicarEscolha(e, vez, opcoes[0]!.id, T0);
    }
    expect(e.times.filter((t) => !ehTimeDefinido(t)).map((t) => gastoDoTime(e, t.id))).toEqual(Array(7).fill(30));
  });

  it("a virada leva o time definido com a rota de cada um no time e a marca só no capitão", () => {
    const fim = rodarAteParar(iniciarDraft(draftReal(), T0), T0);
    expect(fim.fase).toBe("encerrado");
    expect(problemasDaVirada(fim)).toEqual([]);
    expect(avisosDaVirada(fim)).toEqual([]);

    const { teams, players } = datasetDoDraft(fim);
    expect(teams).toHaveLength(8);
    const doDefinido = players.filter((p) => p.teamId === "time-4");
    expect(doDefinido.map((p) => [p.nick, p.role1, p.role2, p.captain ?? false])).toEqual([
      ["Jogador31#BR1", "TOP", "ADC", false],
      ["Jogador1#BR1", "JUNG", "TOP", true],
      ["Jogador2#BR1", "MID", "ADC", false],
      ["Jogador3#BR1", "ADC", "MID", false],
      ["Jogador21#BR1", "SUP", "TOP", false],
    ]);
    // Um capitão por time, os 8.
    expect(players.filter((p) => p.captain)).toHaveLength(8);
    expect(new Set(players.filter((p) => p.captain).map((p) => p.teamId)).size).toBe(8);
  });
});

// ================================================================ a prévia de preços do navegador

describe("previaDosPrecos com o time definido (abas Times e vagas e Inscritos)", () => {
  it("a mesma conta do servidor: 28 pagos, soma 210, 7 times no draft, os membros sem preço", () => {
    const lista = inscritosReais();
    const previa = previaDosPrecos({ inscritos: lista, jogadoresPorTime: 5, orcamentoPorTime: 30, maxTimes: 8 });
    expect(previa).toMatchObject({ origem: "titulares", times: 8, timesNoDraft: 7, vagas: 40, capitaesDaTabela: "definidos" });
    expect(previa.fechaComOsCapitaes).toBe(true);
    expect(previa.tabela).toMatchObject({ times: 7, jogadoresPorTime: 4, alvo: 210, soma: 210 });
    expect(previa.tabela!.linhas.map((l) => [l.classe.rotulo, l.quantos, l.pontos])).toEqual(TABELA_DOS_28);
    expect(retratoDaPrevia(previa)).toMatchObject({ times: 7, capitaoGratis: true });
    expect([...previa.capitaes].sort()).toEqual(CAPITAES_DO_DRAFT.map(id).sort());
    // A conta da tabela é só de quem vai ao draft.
    expect(previa.noPool.size).toBe(35);
    for (const p of MEMBROS_EM_ORDEM) expect(previa.noPool.has(id(p))).toBe(false);

    const porId = new Map(lista.map((i) => [i.id, i]));
    const pagos = lista.filter((i) => !previa.semPreco(i));
    expect(pagos).toHaveLength(28);
    expect(pagos.reduce((s, i) => s + previa.preco(i)!, 0)).toBe(210);

    for (const p of MEMBROS_EM_ORDEM) {
      const membro = porId.get(id(p))!;
      expect(previa.doTimeDefinido(membro)).toBe(true);
      expect(previa.semPreco(membro)).toBe(true);
      expect(previa.preco(membro)).toBe(0);
    }
    // O capitão do draft é sem preço, mas NÃO é do time definido (a tela mostra CAPITÃO).
    const capitao = porId.get(id(5))!;
    expect(previa.doTimeDefinido(capitao)).toBe(false);
    expect(previa.semPreco(capitao)).toBe(true);
    expect(previa.preco(porId.get(id(4))!)).toBe(18);

    // Membro do time definido não substitui nem é substituído pela tabela.
    expect(podeSubstituir(previa, porId.get(id(35))!, porId.get(id(2))!)).toBe(false);
    expect(podeSubstituir(previa, porId.get(id(2))!, porId.get(id(4))!)).toBe(false);
    expect(podeSubstituir(previa, porId.get(id(35))!, porId.get(id(4))!)).toBe(true);
  });

  it.each([
    ["um membro desistiu", (j: JogadorDoPool) => (j.posicao === 21 ? { situacao: "desistiu" } : {})],
    ["rota repetida", (j: JogadorDoPool) => (j.posicao === 21 ? { time_definido: "MID" } : {})],
    ["dois capitães", (j: JogadorDoPool) => (j.posicao === 2 ? { capitao: true } : {})],
    ["sem capitão", (j: JogadorDoPool) => (j.posicao === 1 ? { capitao: false } : {})],
  ])("time definido inválido (%s): a conta volta a ser a de todo mundo", (_, troca) => {
    const lista = inscritosReais(troca);
    const previa = previaDosPrecos({ inscritos: lista, jogadoresPorTime: 5, orcamentoPorTime: 30, maxTimes: 8 });
    expect(previa.timesNoDraft).toBe(previa.times);
    expect(lista.some((i) => previa.doTimeDefinido(i))).toBe(false);
    expect(previa.tabela!.times).toBe(previa.times);
    expect(previa.noPool.has(id(2))).toBe(true);
  });

  /*
   * Marcado e inválido, o servidor tem um impedimento e mostra a tabela PEDIDA de todo mundo, sem
   * capitães (revisão de 24/10): a prévia do navegador faz o mesmo, em vez de calcular com os 8
   * capitães marcados — as duas telas mostravam preços diferentes.
   */
  it("time definido inválido: a tabela é a pedida de todo mundo, sem capitães, como no servidor", () => {
    const lista = inscritosReais((j) => (j.posicao === 21 ? { time_definido: "MID" } : {}));
    const previa = previaDosPrecos({ inscritos: lista, jogadoresPorTime: 5, orcamentoPorTime: 30, maxTimes: 8 });
    expect(previa).toMatchObject({ times: 8, timesNoDraft: 8, capitaesDaTabela: null, fechaComOsCapitaes: null });
    expect(previa.tabela).toMatchObject({ times: 8, jogadoresPorTime: 5, soma: 240 });
    expect(previa.tabela!.linhas.reduce((s, l) => s + l.quantos, 0)).toBe(40);
    expect(lista.some((i) => previa.doTimeDefinido(i) || previa.semPreco(i))).toBe(false);
  });

  it("sem marca nenhuma: a prévia de antes (8 times, sem ninguém do time definido)", () => {
    const lista = inscritosReais(() => ({ time_definido: null }));
    const previa = previaDosPrecos({ inscritos: lista, jogadoresPorTime: 5, orcamentoPorTime: 30, maxTimes: 8 });
    expect(previa).toMatchObject({ times: 8, timesNoDraft: 8 });
    expect(previa.tabela).toMatchObject({ times: 8, soma: 240 });
  });

  it("sem o pool fechado (ainda há quem não está na fila certa): não separa o time definido", () => {
    // 39 com elo legível para 40 vagas: a prévia cai nos mais fracos, e aí não há time definido.
    const lista = inscritosReais((j) => (j.posicao === 40 ? { elo_declarado: "??", elo_verificado: "??", elo_riot: null } : {}));
    const previa = previaDosPrecos({ inscritos: lista, jogadoresPorTime: 5, orcamentoPorTime: 30, maxTimes: 8 });
    expect(previa.origem).toBe("mais_fracos");
    expect(previa.timesNoDraft).toBe(8);
    expect(lista.some((i) => previa.doTimeDefinido(i))).toBe(false);
  });
});

describe("precosDoSorteio com o time definido (depois do sorteio)", () => {
  function sorteioReal(comTimeDefinido = true) {
    const lista = inscritosReais();
    const previa = previaDosPrecos({ inscritos: lista, jogadoresPorTime: 5, orcamentoPorTime: 30, maxTimes: 8 });
    const precos = precosDoSorteio({
      retrato: retratoDaPrevia(previa)!,
      pontosDoDraft: new Map(lista.map((i) => [i.riot_id!, previa.preco(i) ?? 0])),
      inscritos: lista,
      // Na visão pública o capitão do time definido também tem a marca de capitão.
      capitaesDoDraft: new Set(CAPITAES_23_10.map(riotId)),
      capitaoGratis: true,
      ...(comTimeDefinido ? { timeDefinidoDoDraft: new Set(MEMBROS_EM_ORDEM.map(riotId)) } : {}),
    });
    return { lista, precos, porId: new Map(lista.map((i) => [i.id, i])) };
  }

  it("os membros sem preço e fora da regra do substituto; o retrato é dos 7 que disputaram", () => {
    const { precos, porId } = sorteioReal();
    expect(precos).toMatchObject({ origem: "sorteio", times: 8, timesNoDraft: 7 });
    for (const p of MEMBROS_EM_ORDEM) {
      const membro = porId.get(id(p))!;
      expect(precos.doTimeDefinido(membro)).toBe(true);
      expect(precos.semPreco(membro)).toBe(true);
      expect(precos.preco(membro)).toBe(0);
    }
    expect(precos.doTimeDefinido(porId.get(id(5))!)).toBe(false);
    expect(precos.semPreco(porId.get(id(5))!)).toBe(true);
    expect(precos.semPreco(porId.get(id(4))!)).toBe(false);
    expect(podeSubstituir(precos, porId.get(id(35))!, porId.get(id(3))!)).toBe(false);
    expect(podeSubstituir(precos, porId.get(id(3))!, porId.get(id(4))!)).toBe(false);
    expect(podeSubstituir(precos, porId.get(id(35))!, porId.get(id(4))!)).toBe(true);
  });

  it("sem `timeDefinidoDoDraft` (draft sem time definido, ou tela velha): ninguém é do time definido", () => {
    const { lista, precos, porId } = sorteioReal(false);
    expect(lista.some((i) => precos.doTimeDefinido(i))).toBe(false);
    expect(precos.times).toBe(7);
    // O membro que não é capitão volta a ter preço na regra (o do draft, 0).
    expect(precos.semPreco(porId.get(id(2))!)).toBe(false);
  });

  /*
   * Achado da revisão de 24/10: com o time definido, `times` conta a edição inteira (7 + 1 = 8),
   * e `vagas` contava só a do draft (7 × 5 = 35). Na prévia (`previaDosPrecos`) as duas contam a
   * edição (8 times, 40 vagas), e a conta das telas «vagas do draft = vagas − (times −
   * timesNoDraft) × jogadores» daria 30 em vez de 35 com a tabela do sorteio.
   */
  it("vagas e times contam a mesma coisa: 8 times, 40 vagas", () => {
    const { precos } = sorteioReal();
    expect(precos.times).toBe(8);
    expect(precos.vagas).toBe(40);
  });
});
