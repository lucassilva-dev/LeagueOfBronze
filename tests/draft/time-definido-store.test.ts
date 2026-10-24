import { beforeEach, describe, expect, it, vi } from "vitest";

import { resolveElo } from "@/lib/design";
import { alcancarORelogio, ehTimeDefinido, estadoFecha, iniciarDraft } from "@/lib/draft/motor";
import { previaDosPrecos, type InscricaoDaPrevia } from "@/lib/draft/previa-de-precos";
import { ORCAMENTO_DA_MONTAGEM } from "@/lib/draft/viabilidade";
import { datasetDoDraft, problemasDaVirada } from "@/lib/draft/virada";
import { embaralhar } from "@/lib/series/sorteio";
import { CAPITAES_23_10, POOL_4A_40_23_10, type JogadorDoPool } from "./_pool-4a";

/**
 * O TIME DEFINIDO PELA ORGANIZAÇÃO ligado ao draft de verdade (lib/draft/store.ts): a prévia da
 * mesa e a montagem do sorteio, contra um banco falso com a lista real de 23/10 (40 titulares).
 *
 * Decisão de 24/10/2026: a organização joga num time que já entra pronto — as posições 1, 2, 3,
 * 21 e 31, em JUNG, MID, ADC, SUP e TOP, capitão a 1 — e que não vai ao draft. Os outros 7
 * times disputam as 28 escolhas com 30 pontos cada (soma exata 210), com os 7 capitães que a
 * organização definiu. O capitão do time definido entra no sorteio (tira nome e cor), mas o
 * time fica fora da ordem de escolha.
 *
 * A parte pura (separação, motor, virada, prévia do navegador) está em
 * tests/draft/time-definido.test.ts.
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

const ROTA_NO_TIME: Readonly<Record<number, string>> = { 1: "JUNG", 2: "MID", 3: "ADC", 21: "SUP", 31: "TOP" };
/** Os membros na ordem das rotas (TOP, JUNG, MID, ADC, SUP). */
const MEMBROS_EM_ORDEM = [31, 1, 2, 3, 21];
const MEMBROS = new Set(MEMBROS_EM_ORDEM.map(id));
const CAPITAES_DO_DRAFT = CAPITAES_23_10.filter((p) => p !== 1).map(id);

/** Uma linha de `inscricoes` como o `select *` devolve, com as marcas de capitão e de time definido. */
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
    time_definido: ROTA_NO_TIME[j.posicao] ?? null,
    ...over,
  };
}

/** A lista real com trocas por posição. */
function comTrocas(trocas: Record<number, Record<string, unknown>>) {
  return POOL_4A_40_23_10.map((j) => inscricao(j, trocas[j.posicao] ?? {}));
}

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

// ---------------------------------------------------------------- a prévia da mesa

describe("a prévia do draft com o time definido", () => {
  it("7 times no draft, a tabela dos 28 (210) com os 7 capitães definidos, e o time definido à parte", async () => {
    const previa = await previaDoDraft(SEM_DRAFT);
    expect(previa).toMatchObject({ times: 8, vagas: 40, timesNoDraft: 7, aptos: 40 });
    expect(previa.impedimentos).toEqual([]);
    expect(previa.avisosDoSorteio).toEqual([]);

    expect(previa.timeDefinido).toEqual({
      ativo: true,
      capitaoRiotId: riotId(1),
      membros: [
        { riotId: riotId(31), rota: "TOP", elo: "Platina", capitao: false },
        { riotId: riotId(1), rota: "JUNG", elo: "Mestre", capitao: true },
        { riotId: riotId(2), rota: "MID", elo: "Diamante", capitao: false },
        { riotId: riotId(3), rota: "ADC", elo: "Esmeralda", capitao: false },
        { riotId: riotId(21), rota: "SUP", elo: "Ouro", capitao: false },
      ],
      impedimentos: [],
    });

    // Os capitães e a tabela são só do draft: o capitão do time definido não conta aqui.
    expect(previa.metodoPadrao).toBe("definidos");
    expect(previa.capitaesDaTabela).toBe("definidos");
    expect([...previa.capitaesDefinidos].sort()).toEqual([...CAPITAES_DO_DRAFT].sort());
    expect(previa.capitaesMarcados).toBe(7);
    expect(previa.avisosDosCapitaes).toEqual([]);
    expect(previa.fechaComOsCapitaesDefinidos).toBe(true);
    expect(previa.tabela).toMatchObject({ capitaoGratis: true, times: 7, jogadoresPorTime: 4, alvo: 210, soma: 210, folga: 0 });
    expect(previa.tabela!.linhas.reduce((s, l) => s + l.quantos, 0)).toBe(28);
    expect(previa.totalDePontos).toBe(210);
    // Os da regra também são do draft: nenhum membro do time definido.
    expect(previa.capitaesPelaRegra.some((c) => MEMBROS.has(c))).toBe(false);
  });

  it("os jogadores: os 35 do draft e, no fim, os 5 do time definido com a rota, sem preço", async () => {
    const previa = await previaDoDraft(SEM_DRAFT);
    expect(previa.jogadores).toHaveLength(40);
    expect(new Set(previa.jogadores.map((j) => j.id)).size).toBe(40);
    expect(previa.jogadores.slice(-5).map((j) => [j.id, j.timeDefinido, j.pontos, j.capitao])).toEqual([
      [id(31), "TOP", 0, false],
      [id(1), "JUNG", 0, true],
      [id(2), "MID", 0, false],
      [id(3), "ADC", 0, false],
      [id(21), "SUP", 0, false],
    ]);
    const doDraft = previa.jogadores.slice(0, 35);
    expect(doDraft.every((j) => j.timeDefinido === null)).toBe(true);
    expect(doDraft.filter((j) => j.capitao).map((j) => j.id).sort()).toEqual([...CAPITAES_DO_DRAFT].sort());
    expect(doDraft.reduce((s, j) => s + j.pontos, 0)).toBe(210);
    const porId = new Map(previa.jogadores.map((j) => [j.id, j]));
    expect(porId.get(id(5))).toMatchObject({ capitao: true, capitaoDefinido: true, pontos: 0, timeDefinido: null });
    expect(porId.get(id(4))).toMatchObject({ capitao: false, pontos: 18 });
    // O capitão do time definido continua com a marca de capitão definido da organização.
    expect(porId.get(id(1))).toMatchObject({ capitaoDefinido: true, organizador: true });
  });

  it.each([
    ["capitão sem preço", false, 4, 28],
    ["capitão pago (`capitao_com_preco`)", true, 5, 35],
  ])("%s: a prévia do navegador dá a MESMA tabela que a do servidor", async (_, capitaoComPreco, porTime, pessoas) => {
    if (capitaoComPreco) banco.config = { ...banco.config, capitao_com_preco: true };
    const servidor = await previaDoDraft(SEM_DRAFT);
    const navegador = previaDosPrecos({
      inscritos: banco.inscritos as unknown as InscricaoDaPrevia[],
      jogadoresPorTime: 5,
      orcamentoPorTime: 30,
      maxTimes: 8,
      capitaoComPreco,
    });
    expect(servidor.tabela).toMatchObject({ times: 7, jogadoresPorTime: porTime, soma: 210 });
    expect(servidor.tabela!.linhas.reduce((s, l) => s + l.quantos, 0)).toBe(pessoas);
    expect(navegador.tabela!.linhas.map((l) => [l.classe.rotulo, l.quantos, l.pontos])).toEqual(
      servidor.tabela!.linhas.map((l) => [l.rotulo, l.quantos, l.pontos]),
    );
    // Preço a preço, de cada um dos 40.
    const lista = banco.inscritos as unknown as InscricaoDaPrevia[];
    const doServidor = new Map(servidor.jogadores.map((j) => [j.id, j.pontos]));
    expect(lista.map((i) => navegador.preco(i))).toEqual(lista.map((i) => doServidor.get(i.id)));
  });

  it("capitão pago: os membros continuam sem preço, e a montagem cobra o capitão do draft", async () => {
    banco.config = { ...banco.config, capitao_com_preco: true };
    const estado = await montarDraftDosAprovados({ metodo: "definidos" });
    expect(estado.capitaoGratis).toBeUndefined();
    expect(estado.tabelaDePontos).toMatchObject({ times: 7, jogadoresPorTime: 5, soma: 210 });
    expect(estado.jogadores.filter((j) => MEMBROS.has(j.id)).every((j) => j.pontos === 0)).toBe(true);
    const doDraft = estado.jogadores.filter((j) => !MEMBROS.has(j.id));
    expect(doDraft).toHaveLength(35);
    expect(doDraft.reduce((s, j) => s + j.pontos, 0)).toBe(210);
    expect(CAPITAES_DO_DRAFT.every((c) => estado.jogadores.find((j) => j.id === c)!.pontos > 0)).toBe(true);

    let e = iniciarDraft(estado, 0);
    for (let k = 1; k <= 28 && e.fase === "rodando"; k++) e = alcancarORelogio(e, k * 60_000 + 1);
    expect(e.fase).toBe("encerrado");
    const gastos = paraPublico(e, 2).times.map((t) => (t.definido ? "definido" : t.gasto));
    expect(gastos.filter((g) => g === 30)).toHaveLength(7);
  });

  it("sem marca de time definido: a prévia de antes (8 times, 240, `timeDefinido` nulo)", async () => {
    banco.inscritos = POOL_4A_40_23_10.map((j) => inscricao(j, { time_definido: null }));
    const previa = await previaDoDraft(SEM_DRAFT);
    expect(previa.timesNoDraft).toBe(8);
    expect(previa.timeDefinido).toBeNull();
    expect(previa.tabela).toMatchObject({ times: 8, jogadoresPorTime: 4, soma: 240 });
    expect(previa.capitaesDefinidos).toHaveLength(8);
    expect(previa.jogadores.every((j) => j.timeDefinido === null)).toBe(true);
  });

  it("banco sem a coluna `time_definido`: o mesmo que sem marca", async () => {
    banco.inscritos = POOL_4A_40_23_10.map((j) => {
      const linha = inscricao(j);
      delete linha.time_definido;
      return linha;
    });
    const previa = await previaDoDraft(SEM_DRAFT);
    expect(previa.timeDefinido).toBeNull();
    expect(previa.timesNoDraft).toBe(8);
    expect(previa.impedimentos).toEqual([]);
  });

  it("membro ainda pendente: impedimento com o nome, e a conta volta a ser de todo mundo", async () => {
    banco.inscritos = comTrocas({ 21: { situacao: "pendente" } });
    const previa = await previaDoDraft(SEM_DRAFT);
    const recado =
      "Jogador21#BR1 (pendente) está no time definido pela organização, mas não entre os titulares aptos. Aprove a inscrição antes de sortear.";
    expect(previa.impedimentos).toContain(recado);
    expect(previa.timesNoDraft).toBe(8);
    expect(previa.timeDefinido).toMatchObject({ ativo: false, capitaoRiotId: null, impedimentos: [recado] });
    // A lista mostra quem está marcado (ainda que inválido), sem rota resolvida — e a marca de
    // capitão de cada um, para a mesa ver quem está marcado (só o 1).
    expect(previa.timeDefinido!.membros.map((m) => m.riotId).sort()).toEqual(MEMBROS_EM_ORDEM.map(riotId).sort());
    expect(previa.timeDefinido!.membros.filter((m) => m.capitao).map((m) => m.riotId)).toEqual([riotId(1)]);
    expect(previa.jogadores.every((j) => j.timeDefinido === null)).toBe(true);
    // Com impedimento, a tabela é a pedida de todo mundo (8 times).
    expect(previa.tabela?.times).toBe(8);
    expect(previa.capitaesDaTabela).toBeNull();
  });

  it("rota repetida e membro que desistiu: os dois recados, e quem desistiu fica fora da lista", async () => {
    banco.inscritos = comTrocas({ 21: { time_definido: "MID" }, 3: { situacao: "desistiu" } });
    const previa = await previaDoDraft(SEM_DRAFT);
    const impedimentos = previa.timeDefinido!.impedimentos.join(" ");
    expect(impedimentos).toContain("Jogador3#BR1 (desistiu) está marcado no time definido pela organização e saiu do campeonato");
    expect(impedimentos).toContain("tem a rota MID repetida");
    expect(impedimentos).toContain("tem 4 jogadores e precisa de exatamente 5");
    expect(previa.timeDefinido!.membros.map((m) => m.riotId)).not.toContain(riotId(3));
    for (const recado of previa.timeDefinido!.impedimentos) expect(previa.impedimentos).toContain(recado);
  });
});

// ---------------------------------------------------------------- a montagem do sorteio

describe("o sorteio com o time definido", () => {
  it("os 8 capitães no sorteio, o time definido completo e fora da ordem de 28, a tabela de 7 × 30", async () => {
    const estado = await montarDraftDosAprovados({ metodo: "definidos" });

    // O sorteio é um só, com o capitão do time definido junto — e pode ser refeito.
    expect(estado.times).toHaveLength(8);
    expect(estado.sorteio!.capitaes).toEqual([...CAPITAES_DO_DRAFT.slice().sort(byPosicao), id(1)]);
    expect(embaralhar(estado.sorteio!.semente, "capitaes", estado.sorteio!.capitaes)).toEqual(estado.times.map((t) => t.capitaoId));

    const definidos = estado.times.filter(ehTimeDefinido);
    expect(definidos).toHaveLength(1);
    const definido = definidos[0]!;
    expect(definido.capitaoId).toBe(id(1));
    expect(definido.elencoDefinido).toEqual(MEMBROS_EM_ORDEM.map(id));
    expect(estado.times.filter((t) => !ehTimeDefinido(t)).map((t) => t.capitaoId).sort()).toEqual([...CAPITAES_DO_DRAFT].sort());

    // A ordem: só os 7, 4 escolhas cada.
    expect(estado.ordem).toHaveLength(28);
    expect(estado.ordem).not.toContain(definido.id);
    const contagem = new Map<string, number>();
    for (const t of estado.ordem) contagem.set(t, (contagem.get(t) ?? 0) + 1);
    expect([...contagem.values()]).toEqual(Array(7).fill(4));

    // Os membros: no time definido, sem preço, com a rota do time primeiro.
    const membros = estado.jogadores.filter((j) => MEMBROS.has(j.id));
    expect(membros.map((j) => [j.id, j.timeId, j.pontos, j.rota1, j.rota2])).toEqual([
      [id(31), definido.id, 0, "TOP", "ADC"],
      [id(1), definido.id, 0, "JUNG", "TOP"],
      [id(2), definido.id, 0, "MID", "ADC"],
      [id(3), definido.id, 0, "ADC", "MID"],
      [id(21), definido.id, 0, "SUP", "TOP"],
    ]);
    expect(membros.every((j) => typeof j.classe === "string")).toBe(true);

    // A tabela é a dos 28: capitães do draft a 0 e as escolhas somando 210.
    expect(estado.capitaoGratis).toBe(true);
    expect(estado.tabelaDePontos).toMatchObject({ capitaoGratis: true, times: 7, jogadoresPorTime: 4, alvo: 210, soma: 210, folga: 0 });
    for (const c of CAPITAES_DO_DRAFT) expect(estado.jogadores.find((j) => j.id === c)!.pontos).toBe(0);
    const escolhas = estado.jogadores.filter((j) => j.timeId === null);
    expect(escolhas).toHaveLength(28);
    expect(escolhas.reduce((s, j) => s + j.pontos, 0)).toBe(210);
    expect(estadoFecha(estado, ORCAMENTO_DA_MONTAGEM)).toBe(true);
  });

  it("a visão pública: o time definido com `definido`, gasto 0, sem vaga, e ninguém dele à disposição", async () => {
    const estado = await montarDraftDosAprovados({ metodo: "definidos" });
    const publico = paraPublico(estado, 1);
    const definido = publico.times.find((t) => t.definido === true)!;
    expect(definido).toMatchObject({ capitaoRiotId: riotId(1), gasto: 0, vagas: 0 });
    expect(publico.times.filter((t) => "definido" in t)).toHaveLength(1);
    expect(publico.times.filter((t) => t !== definido).every((t) => t.vagas === 4 && t.gasto === 0)).toBe(true);
    expect(publico.elencos[definido.id]!.map((j) => [j.riotId, j.rota1, j.capitao])).toEqual([
      [riotId(31), "TOP", false],
      [riotId(1), "JUNG", true],
      [riotId(2), "MID", false],
      [riotId(3), "ADC", false],
      [riotId(21), "SUP", false],
    ]);
    expect(publico.totalEscolhas).toBe(28);
    expect(publico.disponiveis).toHaveLength(28);
    expect(publico.disponiveis.some((j) => MEMBROS_EM_ORDEM.map(riotId).includes(j.riotId))).toBe(false);
  });

  it("o draft inteiro pelo relógio: os 7 fecham com 30, e a virada leva os 8 times", async () => {
    const estado = await montarDraftDosAprovados({ metodo: "definidos" });
    let e = iniciarDraft(estado, 0);
    for (let k = 1; k <= 28 && e.fase === "rodando"; k++) e = alcancarORelogio(e, k * 60_000 + 1);
    expect(e.fase).toBe("encerrado");
    const publico = paraPublico({ ...estado, ...e }, 2);
    expect(publico.times.map((t) => (t.definido ? "definido" : t.gasto))).toEqual(
      estado.times.map((t) => (ehTimeDefinido(t) ? "definido" : 30)),
    );
    expect(publico.times.every((t) => t.vagas === 0)).toBe(true);

    expect(problemasDaVirada(e)).toEqual([]);
    const { teams, players } = datasetDoDraft(e);
    expect(teams).toHaveLength(8);
    expect(players.filter((p) => p.captain)).toHaveLength(8);
    const capitaoDoDefinido = players.find((p) => p.nick === riotId(1))!;
    expect(capitaoDoDefinido).toMatchObject({ captain: true, role1: "JUNG", role2: "TOP" });
  });

  it("pela regra do maior elo: os 7 da regra (nenhum membro), e o time definido igual", async () => {
    const estado = await montarDraftDosAprovados({ metodo: "maior_elo" });
    const doDraft = estado.times.filter((t) => !ehTimeDefinido(t)).map((t) => t.capitaoId);
    expect(doDraft).toHaveLength(7);
    expect(doDraft.some((c) => MEMBROS.has(c))).toBe(false);
    expect(estado.times.find(ehTimeDefinido)?.elencoDefinido).toEqual(MEMBROS_EM_ORDEM.map(id));
    expect(estado.ordem).toHaveLength(28);
  });

  it("à mão, um membro do time definido não pode capitanear um time do draft", async () => {
    await expect(
      montarDraftDosAprovados({ metodo: "manual", capitaesManuais: [...CAPITAES_DO_DRAFT.slice(0, 6), id(2)] }),
    ).rejects.toThrow(/não está entre os titulares aptos/);
    // E à mão são 7, não 8.
    await expect(montarDraftDosAprovados({ metodo: "manual", capitaesManuais: [...CAPITAES_DO_DRAFT, id(4)] })).rejects.toThrow(
      "Escolha exatamente 7 capitães (você marcou 8).",
    );
  });

  it("titular do draft ainda pendente (C4): a ordem perde a escolha que falta, nunca do time definido", async () => {
    banco.inscritos = comTrocas({ 40: { situacao: "pendente" } });
    const previa = await previaDoDraft(SEM_DRAFT);
    expect(previa.impedimentos).toEqual([]);
    expect(previa.avisosDoSorteio.join(" ")).toContain("Há 34 titulares aptos para 35 vagas");

    const estado = await montarDraftDosAprovados({ metodo: "definidos" });
    const definido = estado.times.find(ehTimeDefinido)!;
    expect(estado.ordem).toHaveLength(27);
    expect(estado.ordem).not.toContain(definido.id);
    expect(estado.jogadores.filter((j) => j.timeId === definido.id)).toHaveLength(5);
  });

  describe("time definido inválido: recusa com o que fazer (por qualquer método)", () => {
    it.each([
      ["membro pendente", { 21: { situacao: "pendente" } }, /Jogador21#BR1 \(pendente\) está no time definido pela organização, mas não entre os titulares aptos/],
      ["membro excluído", { 2: { situacao: "excluido" } }, /Jogador2#BR1 \(excluido\) está marcado no time definido pela organização e saiu do campeonato/],
      ["dois capitães", { 3: { capitao: true } }, /tem 2 capitães \(Jogador1#BR1, Jogador3#BR1\)/],
      ["sem capitão", { 1: { capitao: false } }, /está sem capitão/],
      ["rota repetida", { 31: { time_definido: "SUP" } }, /tem a rota SUP repetida/],
      ["seis marcados", { 4: { time_definido: "TOP" } }, /tem 6 jogadores e precisa de exatamente 5/],
    ])("%s", async (_, trocas, recado) => {
      banco.inscritos = comTrocas(trocas);
      await expect(montarDraftDosAprovados({ metodo: "definidos" })).rejects.toThrow(recado);
      await expect(montarDraftDosAprovados({ metodo: "maior_elo" })).rejects.toThrow(recado);
    });
  });

  it("os capitães do draft são 7: com 6 marcados, recusa pedindo 7 (o do time definido não conta)", async () => {
    banco.inscritos = comTrocas({ 5: { capitao: false } });
    await expect(montarDraftDosAprovados({ metodo: "definidos" })).rejects.toThrow(
      /Há 6 capitães definidos entre os titulares aptos para 7 times\. Marque exatamente 7/,
    );
  });
});

/** Ordena os ids `insc-N` na ordem em que a lista os traz (a da inscrição, que é a da posição aqui). */
function byPosicao(a: string, b: string): number {
  return Number(a.slice(5)) - Number(b.slice(5));
}
