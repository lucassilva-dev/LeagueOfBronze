import { describe, expect, it } from "vitest";

import {
  alcancarORelogio,
  aplicarEscolha,
  escolhiveisDaVez,
  estadoFecha,
  iniciarDraft,
  maisBaratoValido,
  montarDraft,
  pausarDraft,
  podeEscolher,
  timeDaVez,
  type EstadoDraft,
  type JogadorDoDraft,
} from "@/lib/draft/motor";
import { rankingDeCapitaes } from "@/lib/draft/capitaes";
import { calcularTabela, precoNaTabela } from "@/lib/draft/precos";
import { elencosFecham, ORCAMENTO_DA_MONTAGEM, ORCAMENTO_DE_PASSOS, type VagasDoTime } from "@/lib/draft/viabilidade";
import { TITULARES_4A, type JogadorDoPool } from "./_pool-4a";

const T0 = Date.parse("2026-11-15T20:00:00.000Z");

/**
 * O pool da 4ª como estava em produção em 2026-10-20 (28 inscritos, tabela da 3ª), mais
 * dois Ouro para fechar 30: Mestre 10, seis Diamante 8, sete Esmeralda 6, seis Platina 5,
 * quatro Ouro 4 (+2) e quatro Prata 3. O mais barato custa 3 — não há Ferro nem Bronze.
 */
const PONTOS_REAIS = [10, ...Array(6).fill(8), ...Array(7).fill(6), ...Array(6).fill(5), ...Array(6).fill(4), ...Array(4).fill(3)];

function poolReal(): JogadorDoDraft[] {
  return PONTOS_REAIS.map((pontos, i) => ({
    id: `j${String(i).padStart(2, "0")}`,
    riotId: `Jogador${String(i).padStart(2, "0")}#BR1`,
    pontos,
    rota1: "ADC",
    rota2: "SUP",
    elo: "Ouro",
    timeId: null,
  }));
}

/** Capitães como a regra daria: cinco Diamante (8) e uma Esmeralda (6). */
function draftReal(orcamento: number): EstadoDraft {
  const jogadores = poolReal();
  const diamantes = jogadores.filter((j) => j.pontos === 8).slice(0, 5);
  const esmeralda = jogadores.find((j) => j.pontos === 6)!;
  const capitaes = [...diamantes, esmeralda];
  return montarDraft({
    times: capitaes.map((c, i) => ({ id: `time-${i + 1}`, nome: `T${i + 1}`, cor: "#fff", capitaoId: c.id })),
    jogadores,
    jogadoresPorTime: 5,
    orcamentoPorTime: orcamento,
    segundosPorEscolha: 60,
  });
}

/** Gerador determinístico (LCG): o mesmo teste sorteia sempre as mesmas escolhas. */
function rng(semente: number) {
  let x = semente >>> 0;
  return () => {
    x = (Math.imul(x, 1664525) + 1013904223) >>> 0;
    return x / 0x1_0000_0000;
  };
}

describe("a checagem de viabilidade (lib/draft/viabilidade.ts)", () => {
  it("fecha quando dá para distribuir e não fecha quando não dá", () => {
    expect(elencosFecham([{ vagas: 2, folga: 7 }], [3, 3, 5])).toBe("fecha");
    // Duas vagas com 5 pontos e o mais barato custa 3: 3 + 3 = 6 > 5.
    expect(elencosFecham([{ vagas: 2, folga: 5 }], [3, 3, 5])).toBe("nao_fecha");
    // Cada um sozinho fecharia; juntos não — os dois precisam do mesmo 3.
    expect(elencosFecham([{ vagas: 1, folga: 3 }, { vagas: 1, folga: 3 }], [3, 5])).toBe("nao_fecha");
    expect(elencosFecham([{ vagas: 1, folga: 3 }, { vagas: 1, folga: 5 }], [3, 5])).toBe("fecha");
    expect(elencosFecham([], [3])).toBe("fecha");
    expect(elencosFecham([{ vagas: 3, folga: 99 }], [3, 3])).toBe("nao_fecha");
  });
});

describe("o draft da 4ª com os pontos reais não trava mais", () => {
  it("o caminho exato da auditoria: a Prata que deixaria a última vaga com 1 ponto é recusada", () => {
    // Capitão Diamante (8), orçamento 30: Mestre 10 (teto 19) e Diamante 8 (teto 10) —
    // gasto 26. Antes, a Prata 3 passava no teto (3) e a última vaga ficava com 1 ponto,
    // sem ninguém que custasse 1. O draft pausava ao vivo e não tinha volta.
    let e = iniciarDraft(draftReal(30), T0);
    const t1 = timeDaVez(e)!;
    const mestre = e.jogadores.find((j) => j.pontos === 10)!;
    e = aplicarEscolha(e, t1, mestre.id, T0);
    // Os outros cinco escolhem o mais barato válido até voltar ao time 1 (serpentina).
    while (timeDaVez(e) !== t1) e = aplicarEscolha(e, timeDaVez(e)!, maisBaratoValido(e, timeDaVez(e)!)!.id, T0);
    const diamante = e.jogadores.find((j) => j.timeId === null && j.pontos === 8);
    if (diamante && podeEscolher(e, t1, diamante.id).ok) {
      e = aplicarEscolha(e, t1, diamante.id, T0);
      while (timeDaVez(e) !== t1) e = aplicarEscolha(e, timeDaVez(e)!, maisBaratoValido(e, timeDaVez(e)!)!.id, T0);
      const prata = e.jogadores.find((j) => j.timeId === null && j.pontos === 3);
      if (prata) {
        const veredito = podeEscolher(e, t1, prata.id);
        expect(veredito.ok).toBe(false);
      }
    }
    expect(estadoFecha(e)).toBe(true);
  });

  it("em 300 drafts com escolhas aleatórias (orçamento 30), nenhum trava e todos fecham dentro do orçamento", () => {
    let travados = 0;
    for (let s = 1; s <= 300; s++) {
      const sortear = rng(s);
      let e = iniciarDraft(draftReal(30), T0);
      for (let passo = 0; passo < 40 && e.fase === "rodando"; passo++) {
        const time = timeDaVez(e)!;
        const opcoes = escolhiveisDaVez(e);
        if (opcoes.length === 0) {
          travados++;
          break;
        }
        const id = opcoes[Math.floor(sortear() * opcoes.length)]!;
        e = aplicarEscolha(e, time, id, T0);
      }
      if (e.fase !== "encerrado") {
        travados++;
        continue;
      }
      for (const t of e.times) {
        const gasto = e.jogadores.filter((j) => j.timeId === t.id).reduce((soma, j) => soma + j.pontos, 0);
        expect(gasto).toBeLessThanOrEqual(30);
        expect(e.jogadores.filter((j) => j.timeId === t.id)).toHaveLength(5);
      }
    }
    expect(travados).toBe(0);
  });

  it("o relógio estourando a toda escolha (só auto-pick) também chega ao fim", () => {
    let e = iniciarDraft(draftReal(30), T0);
    // 24 escolhas × 60 s; a corrente de prazos aplica uma por vez sem pausar por atraso.
    for (let k = 1; k <= 24 && e.fase === "rodando"; k++) e = alcancarORelogio(e, T0 + k * 60_000 + 1);
    expect(e.fase).toBe("encerrado");
    expect(e.motivoDaPausa).toBeUndefined();
  });

  it("toda escolha que a tela oferece o servidor aceita, e toda recusada some da lista", () => {
    let e = iniciarDraft(draftReal(30), T0);
    const sortear = rng(42);
    while (e.fase === "rodando") {
      const time = timeDaVez(e)!;
      const oferecidos = new Set(escolhiveisDaVez(e));
      for (const j of e.jogadores.filter((x) => x.timeId === null)) {
        expect(podeEscolher(e, time, j.id).ok).toBe(oferecidos.has(j.id));
      }
      const lista = [...oferecidos];
      e = aplicarEscolha(e, time, lista[Math.floor(sortear() * lista.length)]!, T0);
    }
    expect(e.fase).toBe("encerrado");
  });

  it("um sorteio que já nasce sem saída é reconhecido antes de ir ao ar", () => {
    // Orçamento 20 com capitão de 8: sobram 12 para 4 vagas, e o mais barato custa 3 —
    // 4 × 3 = 12 fecha UM time, mas não os seis com o pool real.
    expect(estadoFecha(draftReal(20))).toBe(false);
    expect(estadoFecha(draftReal(30))).toBe(true);
  });

  it("recusa com o recado certo: o próprio elenco não fecha × outro time ficaria sem saída", () => {
    // Dois times, 2 vagas cada (1 capitão + 1 escolha). A: capitão 5, folga 3. B:
    // capitão 5, folga 3. Pool: um 3 e um 3 — se A levar... os dois cabem. Para provocar o
    // "outro time", B só cabe o 3 e A pode levar 3 ou 4.
    const jogadores: JogadorDoDraft[] = [
      { id: "ca", riotId: "CapA#BR1", pontos: 5, rota1: "MID", rota2: "TOP", elo: "Platina", timeId: null },
      { id: "cb", riotId: "CapB#BR1", pontos: 6, rota1: "MID", rota2: "TOP", elo: "Esmeralda", timeId: null },
      { id: "p3", riotId: "Prata#BR1", pontos: 3, rota1: "ADC", rota2: "SUP", elo: "Prata", timeId: null },
      { id: "o4", riotId: "Ouro#BR1", pontos: 4, rota1: "ADC", rota2: "SUP", elo: "Ouro", timeId: null },
    ];
    const e = iniciarDraft(
      montarDraft({
        times: [
          { id: "a", nome: "A", cor: "#fff", capitaoId: "ca" },
          { id: "b", nome: "B", cor: "#fff", capitaoId: "cb" },
        ],
        jogadores,
        jogadoresPorTime: 2,
        orcamentoPorTime: 9,
        segundosPorEscolha: 60,
      }),
      T0,
    );
    // A (folga 4) poderia levar o 3 ou o 4; B (folga 3) só cabe o 3. Levar o 3 trava B.
    const recusa = podeEscolher(e, "a", "p3");
    expect(recusa.ok).toBe(false);
    if (!recusa.ok) expect(recusa.motivo).toContain("outro time");
    expect(podeEscolher(e, "a", "o4").ok).toBe(true);
    expect(escolhiveisDaVez(e)).toEqual(["o4"]);
    // O auto-pick também não leva o 3 (o "mais barato"): leva o que mantém tudo fechando.
    expect(maisBaratoValido(e, "a")?.id).toBe("o4");
  });

  it("pausa registra o motivo, e retomar limpa", () => {
    const rodando = iniciarDraft(draftReal(30), T0);
    expect(pausarDraft(rodando).motivoDaPausa).toBe("organizacao");
    // Mais de 10 escolhas sem ninguém sondar: pausa por atraso, não pela organização.
    expect(alcancarORelogio(rodando, T0 + 11 * 60_000 + 1000).motivoDaPausa).toBe("atraso");
    const retomado = iniciarDraft(pausarDraft(rodando), T0 + 5000);
    expect(retomado.motivoDaPausa).toBeUndefined();
  });
});

/*
 * A busca sem "indeterminado" no tamanho da 4ª (revisão de 22/10).
 *
 * Com a tabela de soma exata, a busca estourava o orçamento de passos já na 1ª escolha do
 * pool real — e "indeterminado" conta como "fecha". Com curvatura 0,1, uma escolha de 1 ponto
 * era aceita assim, e o draft travava na escolha 2 de 24. Dois cortes (times iguais tentados
 * uma vez só; com todo mundo escolhido, a sobra total é fixa) resolvem sem mudar a resposta.
 */
describe("a busca de viabilidade com a tabela de soma exata", () => {
  const id = (j: JogadorDoPool) => `j${String(j.posicao).padStart(2, "0")}`;

  function draftDoPoolReal(curvatura: number): EstadoDraft {
    const tabela = calcularTabela({ pool: TITULARES_4A, times: 6, jogadoresPorTime: 5, orcamentoPorTime: 30, curvatura });
    const jogadores: JogadorDoDraft[] = TITULARES_4A.map((j) => ({
      id: id(j),
      riotId: `Jogador${j.posicao}#BR1`,
      pontos: precoNaTabela(tabela, j),
      rota1: j.rota1,
      rota2: j.rota2,
      elo: j.elo,
      timeId: null,
    }));
    const ranking = rankingDeCapitaes(
      TITULARES_4A.map((j) => ({ id: id(j), riotId: id(j), organizador: j.organizador, elo: j.elo, eloRiot: j.eloRiot, divisao: j.divisao, pdl: j.pdl })),
      6,
    );
    return montarDraft({
      times: ranking.escolhidos.map((capitaoId, i) => ({ id: `time-${i + 1}`, nome: `T${i + 1}`, cor: "#fff", capitaoId })),
      jogadores,
      jogadoresPorTime: 5,
      orcamentoPorTime: 30,
      segundosPorEscolha: 60,
    });
  }

  /** As sondagens que `escolhiveisDaVez` faz: uma por valor de pontos que cabe no teto. */
  function sondagensDaVez(e: EstadoDraft) {
    const vez = timeDaVez(e)!;
    const livres = e.jogadores.filter((j) => j.timeId === null);
    const gasto = (t: string) => e.jogadores.filter((j) => j.timeId === t).reduce((s, j) => s + j.pontos, 0);
    const vagas = (t: string) => 5 - e.jogadores.filter((j) => j.timeId === t).length;
    return [...new Set(livres.map((j) => j.pontos))].map((v) => {
      const levado = livres.find((j) => j.pontos === v)!;
      const times = e.times.map((t) => ({
        vagas: vagas(t.id) - (t.id === vez ? 1 : 0),
        folga: 30 - gasto(t.id) - (t.id === vez ? v : 0),
      }));
      return { v, resposta: elencosFecham(times, livres.filter((j) => j !== levado).map((j) => j.pontos), ORCAMENTO_DE_PASSOS) };
    });
  }

  it("1ª escolha do pool real, com 0,075 (a padrão) e com 0,1: nenhuma sondagem indeterminada", () => {
    for (const curvatura of [0.075, 0.1]) {
      const respostas = sondagensDaVez(iniciarDraft(draftDoPoolReal(curvatura), T0));
      expect(respostas.length).toBeGreaterThan(5);
      expect(respostas.filter((r) => r.resposta === "indeterminado"), `curvatura ${curvatura}`).toEqual([]);
    }
  });

  it("curvatura 0,1: a escolha de 1 ponto que travava o draft na escolha 2 agora é recusada, e o auto-pick vai até o fim", () => {
    let e = iniciarDraft(draftDoPoolReal(0.1), T0);
    expect(estadoFecha(e, ORCAMENTO_DA_MONTAGEM)).toBe(true);
    const vez = timeDaVez(e)!;
    const umPonto = e.jogadores
      .filter((j) => j.timeId === null && j.pontos === 1)
      .sort((a, b) => a.riotId.localeCompare(b.riotId))[0]!;
    // A resposta verdadeira é "não fecha": antes a busca estourava e a escolha passava.
    expect(podeEscolher(e, vez, umPonto.id).ok).toBe(false);
    expect(escolhiveisDaVez(e)).not.toContain(umPonto.id);

    // Quem o motor oferece leva o draft até o fim, só com auto-pick.
    e = aplicarEscolha(e, vez, escolhiveisDaVez(e)[0]!, T0);
    for (let k = 1; k <= 30 && e.fase === "rodando"; k++) e = alcancarORelogio(e, T0 + k * 60_000 + 1);
    expect(e.motivoDaPausa).toBeUndefined();
    expect(e.fase).toBe("encerrado");
  });

  it("curvatura 0,1 só com auto-pick: o mais barato da 1ª escolha era a armadilha, e agora o draft vai até o fim", () => {
    // O auto-pick leva o mais barato que "fecha". Com a busca estourando, o Prata de 1 ponto
    // da 1ª escolha passava como "fecha" — e o draft pausava sem jogador logo depois.
    let e = iniciarDraft(draftDoPoolReal(0.1), T0);
    for (let k = 1; k <= 30 && e.fase === "rodando"; k++) e = alcancarORelogio(e, T0 + k * 60_000 + 1);
    expect(e.motivoDaPausa).toBeUndefined();
    expect(e.fase).toBe("encerrado");
    for (const t of e.times) {
      const elenco = e.jogadores.filter((j) => j.timeId === t.id);
      expect(elenco).toHaveLength(5);
      expect(elenco.reduce((s, j) => s + j.pontos, 0)).toBe(30);
    }
  });

  it("drafts sorteados com curvatura 0,1 não travam (escolha uniforme entre o que o motor oferece)", () => {
    const estado = draftDoPoolReal(0.1);
    for (const semente of [1, 2, 3, 4, 5, 6]) {
      const sortear = rng(semente);
      let e = iniciarDraft(estado, T0);
      while (e.fase === "rodando") {
        const opcoes = escolhiveisDaVez(e);
        expect(opcoes.length, `semente ${semente}, escolha ${e.escolhaAtual}`).toBeGreaterThan(0);
        e = aplicarEscolha(e, timeDaVez(e)!, opcoes[Math.floor(sortear() * opcoes.length)]!, T0);
      }
      expect(e.fase).toBe("encerrado");
    }
  }, 60_000);

  /**
   * Tenta todas as distribuições, uma pessoa por vez (fica de fora, ou vai para qualquer time
   * com vaga e folga), sem nenhum dos cortes da busca de verdade — só memória de estado.
   */
  function exaustiva(times: readonly VagasDoTime[], custos: readonly number[]): boolean {
    const vagas = times.map((t) => t.vagas);
    const folgas = times.map((t) => t.folga);
    const total = vagas.reduce((s, v) => s + v, 0);
    if (folgas.some((f, i) => f < 0 && vagas[i]! > 0)) return false;
    const visto = new Map<string, boolean>();
    const ir = (k: number, faltam: number): boolean => {
      if (faltam === 0) return true;
      if (custos.length - k < faltam) return false;
      const chave = `${k}|${vagas.join(",")}|${folgas.join(",")}`;
      const guardado = visto.get(chave);
      if (guardado !== undefined) return guardado;
      let ok = ir(k + 1, faltam);
      for (let t = 0; t < times.length && !ok; t++) {
        if (vagas[t]! === 0 || folgas[t]! < custos[k]!) continue;
        vagas[t]!--;
        folgas[t]! -= custos[k]!;
        ok = ir(k + 1, faltam - 1);
        vagas[t]!++;
        folgas[t]! += custos[k]!;
      }
      visto.set(chave, ok);
      return ok;
    };
    return ir(0, total);
  }

  it("a resposta é exata: bate com a busca exaustiva em casos sorteados (times iguais, soma exata, sobra de gente)", () => {
    const sortear = rng(2210);
    let fecham = 0;
    let naoFecham = 0;
    for (let caso = 0; caso < 1500; caso++) {
      const n = 1 + Math.floor(sortear() * 4);
      const folgas = [3 + Math.floor(sortear() * 12), 3 + Math.floor(sortear() * 12)];
      const vagasIguais = 1 + Math.floor(sortear() * 3);
      const times: VagasDoTime[] = Array.from({ length: n }, () => ({
        vagas: caso % 2 === 0 ? vagasIguais : 1 + Math.floor(sortear() * 3),
        folga: folgas[Math.floor(sortear() * 2)]!,
      }));
      const totalVagas = times.reduce((s, t) => s + t.vagas, 0);
      const extra = caso % 3 === 0 ? 1 + Math.floor(sortear() * 2) : 0;
      const custos = Array.from({ length: totalVagas + extra }, () => 1 + Math.floor(sortear() * 7));
      if (caso % 3 === 1) {
        // Soma exata: a folga do 1º time fecha Σ folgas = Σ custos.
        const resto = custos.reduce((s, c) => s + c, 0) - times.slice(1).reduce((s, t) => s + t.folga, 0);
        if (resto >= 0) times[0]!.folga = resto;
      }
      const esperado = exaustiva(times, custos);
      const resposta = elencosFecham(times, custos);
      expect(resposta, JSON.stringify({ times, custos })).toBe(esperado ? "fecha" : "nao_fecha");
      if (esperado) fecham++;
      else naoFecham++;
    }
    expect(fecham).toBeGreaterThan(200);
    expect(naoFecham).toBeGreaterThan(200);
  });
});
