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
import { elencosFecham } from "@/lib/draft/viabilidade";

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
