import { describe, expect, it } from "vitest";

import {
  alcancarORelogio,
  aplicarEscolha,
  avancarPorTempo,
  gastoDoTime,
  iniciarDraft,
  jogadoresDisponiveis,
  maisBaratoValido,
  montarDraft,
  ordemSerpentina,
  pausarDraft,
  podeEscolher,
  retomarDraft,
  rodadasDoDraft,
  tetoDaEscolha,
  timeDaVez,
  vagasAbertasDoTime,
  type EstadoDraft,
  type JogadorDoDraft,
  type TimeDoDraft,
} from "@/lib/draft/motor";

const T0 = Date.parse("2026-11-08T20:00:00.000Z");

function timesDe(n: number): TimeDoDraft[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `time-${i + 1}`,
    nome: `TIME ${i + 1}`,
    cor: "#c98a4b",
    capitaoId: `cap-${i + 1}`,
  }));
}

/** N capitães de 5 pontos + `extras` jogadores baratos, suficientes para encher tudo. */
function poolDe(nTimes: number, extras: number, pontosExtra = 3): JogadorDoDraft[] {
  const capitaes: JogadorDoDraft[] = Array.from({ length: nTimes }, (_, i) => ({
    id: `cap-${i + 1}`,
    riotId: `Cap${String(i + 1).padStart(2, "0")}#BR1`,
    pontos: 5,
    rota1: "MID",
    rota2: "TOP",
    elo: "Platina",
    timeId: null,
  }));

  const resto: JogadorDoDraft[] = Array.from({ length: extras }, (_, i) => ({
    id: `jog-${i + 1}`,
    riotId: `Jog${String(i + 1).padStart(3, "0")}#BR1`,
    pontos: pontosExtra,
    rota1: "ADC",
    rota2: "SUP",
    elo: "Prata",
    timeId: null,
  }));

  return [...capitaes, ...resto];
}

function draftDe(nTimes: number, extras: number, pontosExtra = 3, orcamento = 30): EstadoDraft {
  return montarDraft({
    times: timesDe(nTimes),
    jogadores: poolDe(nTimes, extras, pontosExtra),
    jogadoresPorTime: 5,
    orcamentoPorTime: orcamento,
    segundosPorEscolha: 60,
  });
}

// ================================================================ ordem

describe("ordem serpentina", () => {
  it("inverte a cada rodada — senão o time 1 escolhe primeiro sempre", () => {
    expect(ordemSerpentina(["a", "b", "c"], 2)).toEqual(["a", "b", "c", "c", "b", "a"]);
  });

  it("as rodadas são as vagas menos o capitão", () => {
    expect(rodadasDoDraft(5)).toBe(4);
    expect(rodadasDoDraft(1)).toBe(0);
  });

  it("10 times dão 40 escolhas, não 24 — o formato de 6 times não vale mais", () => {
    const draft = draftDe(10, 45);
    expect(draft.times).toHaveLength(10);
    expect(draft.ordem).toHaveLength(40);
  });

  it("cada time escolhe o mesmo tanto de vezes", () => {
    const draft = draftDe(7, 30);
    const contagem = new Map<string, number>();
    for (const id of draft.ordem) contagem.set(id, (contagem.get(id) ?? 0) + 1);
    expect([...contagem.values()]).toEqual(Array(7).fill(4));
  });
});

// ================================================================ montagem

describe("montagem", () => {
  it("o capitão já entra no elenco e já custa os pontos dele", () => {
    const draft = draftDe(2, 10);
    expect(vagasAbertasDoTime(draft, "time-1")).toBe(4);
    expect(gastoDoTime(draft, "time-1")).toBe(5);
  });

  it("recusa montar com capitão que não está no pool", () => {
    expect(() =>
      montarDraft({
        times: [{ id: "t1", nome: "T1", cor: "#fff", capitaoId: "fantasma" }],
        jogadores: poolDe(1, 4),
        jogadoresPorTime: 5,
        orcamentoPorTime: 30,
        segundosPorEscolha: 60,
      }),
    ).toThrow(/capitão/i);
  });
});

// ================================================================ orçamento

describe("teto de gasto", () => {
  it("reserva 1 ponto por vaga que ainda vai sobrar", () => {
    // 30 de orçamento, capitão de 5, 4 vagas abertas.
    // teto = 30 − 5 − (4 − 1) = 22
    const draft = draftDe(2, 10);
    expect(tetoDaEscolha(draft, "time-1")).toBe(22);
  });

  it("na última vaga o time pode gastar tudo o que sobrou", () => {
    let draft = iniciarDraft(draftDe(1, 10, 1), T0);
    // 1 time, 4 escolhas. Depois de 3, resta 1 vaga.
    for (let i = 0; i < 3; i++) {
      draft = aplicarEscolha(draft, "time-1", `jog-${i + 1}`, T0);
    }
    expect(vagasAbertasDoTime(draft, "time-1")).toBe(1);
    // 30 − (5 + 1 + 1 + 1) − 0 = 22
    expect(tetoDaEscolha(draft, "time-1")).toBe(22);
  });

  it("recusa quem custa mais que o teto, e explica o porquê", () => {
    const draft = iniciarDraft(
      montarDraft({
        times: timesDe(1),
        jogadores: [
          ...poolDe(1, 0),
          { id: "caro", riotId: "Caro#BR1", pontos: 25, rota1: "TOP", rota2: "MID", elo: "Desafiante", timeId: null },
        ],
        jogadoresPorTime: 5,
        orcamentoPorTime: 30,
        segundosPorEscolha: 60,
      }),
      T0,
    );

    const veredito = podeEscolher(draft, "time-1", "caro");
    expect(veredito.ok).toBe(false);
    if (!veredito.ok) expect(veredito.motivo).toMatch(/reservad/i);
  });

  it("um time nunca consegue estourar o orçamento, mesmo escolhendo o mais caro possível", () => {
    // 1 time, pool com preços variados. A cada escolha pega o mais caro permitido.
    const caros: JogadorDoDraft[] = [15, 12, 10, 8, 6, 4, 3, 2, 1, 1].map((p, i) => ({
      id: `p-${i}`,
      riotId: `P${i}#BR1`,
      pontos: p,
      rota1: "MID",
      rota2: "TOP",
      elo: "x",
      timeId: null,
    }));

    let draft = iniciarDraft(
      montarDraft({
        times: timesDe(1),
        jogadores: [...poolDe(1, 0), ...caros],
        jogadoresPorTime: 5,
        orcamentoPorTime: 30,
        segundosPorEscolha: 60,
      }),
      T0,
    );

    while (draft.fase !== "encerrado") {
      const time = timeDaVez(draft)!;
      const teto = tetoDaEscolha(draft, time);
      const maisCaroValido = jogadoresDisponiveis(draft)
        .filter((j) => j.pontos <= teto)
        .sort((a, b) => b.pontos - a.pontos)[0];
      expect(maisCaroValido).toBeDefined();
      draft = aplicarEscolha(draft, time, maisCaroValido!.id, T0);
    }

    expect(gastoDoTime(draft, "time-1")).toBeLessThanOrEqual(30);
    expect(vagasAbertasDoTime(draft, "time-1")).toBe(0);
  });
});

// ================================================================ de quem é a vez

describe("de quem é a vez", () => {
  it("um time não escolhe fora da vez dele", () => {
    const draft = iniciarDraft(draftDe(3, 20), T0);
    expect(timeDaVez(draft)).toBe("time-1");

    const veredito = podeEscolher(draft, "time-2", "jog-1");
    expect(veredito.ok).toBe(false);
    if (!veredito.ok) expect(veredito.motivo).toMatch(/vez/i);
  });

  it("ninguém escolhe antes de começar nem depois de encerrar", () => {
    const parado = draftDe(2, 10);
    expect(podeEscolher(parado, "time-1", "jog-1").ok).toBe(false);

    const pausado = pausarDraft(iniciarDraft(parado, T0));
    expect(podeEscolher(pausado, "time-1", "jog-1").ok).toBe(false);
  });

  it("não dá para pegar quem já foi escolhido", () => {
    let draft = iniciarDraft(draftDe(2, 10), T0);
    draft = aplicarEscolha(draft, "time-1", "jog-1", T0);
    expect(podeEscolher(draft, "time-2", "jog-1").ok).toBe(false);
  });

  it("aplicarEscolha revalida e recusa — o motor não confia em quem chama", () => {
    const draft = iniciarDraft(draftDe(2, 10), T0);
    expect(() => aplicarEscolha(draft, "time-2", "jog-1", T0)).toThrow(/vez/i);
  });
});

// ================================================================ cronômetro

describe("cronômetro e auto-pick", () => {
  it("não faz nada enquanto há tempo", () => {
    const draft = iniciarDraft(draftDe(2, 10), T0);
    expect(avancarPorTempo(draft, T0 + 30_000)).toBe(draft);
  });

  it("estourou: escolhe o mais barato válido e marca como automática", () => {
    const draft = iniciarDraft(draftDe(2, 10), T0);
    const depois = avancarPorTempo(draft, T0 + 61_000);

    expect(depois.escolhaAtual).toBe(1);
    expect(depois.historico[0]).toMatchObject({ timeId: "time-1", automatica: true });
  });

  it("o desempate é determinístico — dois cálculos do mesmo estado dão a mesma pessoa", () => {
    const draft = iniciarDraft(draftDe(2, 10), T0);
    const a = maisBaratoValido(draft, "time-1");
    const b = maisBaratoValido(draft, "time-1");
    expect(a?.id).toBe(b?.id);
    expect(a?.riotId).toBe("Jog001#BR1");
  });

  it("recupera o atraso: várias escolhas vencidas de uma vez", () => {
    // Em serverless ninguém garante que o servidor acordou a cada 60s. Sem isto o
    // draft "voltaria no tempo" ao ser acordado depois de uma pausa longa.
    const draft = iniciarDraft(draftDe(2, 20), T0);
    const muitoDepois = alcancarORelogio(draft, T0 + 10 * 60_000);

    expect(muitoDepois.escolhaAtual).toBeGreaterThan(1);
    expect(muitoDepois.historico.every((e) => e.automatica)).toBe(true);
  });

  it("o prazo seguinte parte do que venceu, não de agora — dois espectadores convergem", () => {
    // Se partisse de "agora", quem sondou aos 61s e quem sondou aos 200s chegariam a
    // estados diferentes a partir do mesmo histórico.
    const draft = iniciarDraft(draftDe(2, 20), T0);
    const cedo = alcancarORelogio(draft, T0 + 61_000);
    const tarde = alcancarORelogio(draft, T0 + 200_000);

    // Quem olhou mais tarde vê mais escolhas, mas as que os dois têm são idênticas.
    expect(tarde.escolhaAtual).toBeGreaterThan(cedo.escolhaAtual);
    expect(tarde.historico.slice(0, cedo.historico.length)).toEqual(cedo.historico);
  });

  it("atraso grande demais PAUSA em vez de sortear o draft inteiro sozinho", () => {
    // "Ninguém abriu a página desde ontem" não é um draft atrasado — é um draft que
    // parou de acontecer. Com a corrente de prazos, sem este freio ele acordaria
    // inteiro escolhido por auto-pick.
    const draft = iniciarDraft(draftDe(4, 30), T0);
    const abandonado = alcancarORelogio(draft, T0 + 12 * 60 * 60 * 1000);

    expect(abandonado.fase).toBe("pausado");
    expect(abandonado.historico).toHaveLength(0);
  });

  it("sem ninguém que caiba no orçamento, PAUSA em vez de travar calado", () => {
    // 1 time, orçamento 6, capitão de 5: teto da 1ª escolha = 6 − 5 − 3 = −2.
    const draft = iniciarDraft(draftDe(1, 6, 3, 6), T0);
    const depois = avancarPorTempo(draft, T0 + 61_000);

    expect(depois.fase).toBe("pausado");
    expect(depois.escolhaAtual).toBe(0);
  });

  it("pausar tira o prazo; retomar dá o tempo cheio de novo", () => {
    const rodando = iniciarDraft(draftDe(2, 10), T0);
    const pausado = pausarDraft(rodando);
    expect(pausado.prazoISO).toBeNull();

    const retomado = retomarDraft(pausado, T0 + 5 * 60_000);
    expect(retomado.fase).toBe("rodando");
    expect(Date.parse(retomado.prazoISO!)).toBe(T0 + 5 * 60_000 + 60_000);
  });
});

// ================================================================ draft inteiro

describe("draft completo", () => {
  /** Simula até o fim escolhendo sempre o mais barato válido. */
  function simular(estado: EstadoDraft): EstadoDraft {
    let draft = iniciarDraft(estado, T0);
    let passos = 0;

    while (draft.fase === "rodando" && passos < 500) {
      const time = timeDaVez(draft)!;
      const escolhido = maisBaratoValido(draft, time);
      expect(escolhido).not.toBeNull();
      draft = aplicarEscolha(draft, time, escolhido!.id, T0);
      passos++;
    }
    return draft;
  }

  it("10 times: 40 escolhas, todos os elencos completos e dentro do orçamento", () => {
    const draft = simular(draftDe(10, 45, 3));

    expect(draft.fase).toBe("encerrado");
    expect(draft.historico).toHaveLength(40);

    for (const time of draft.times) {
      expect(vagasAbertasDoTime(draft, time.id)).toBe(0);
      expect(gastoDoTime(draft, time.id)).toBeLessThanOrEqual(30);
    }
  });

  it("6 times: o formato antigo continua funcionando", () => {
    const draft = simular(draftDe(6, 25, 3));

    expect(draft.fase).toBe("encerrado");
    expect(draft.historico).toHaveLength(24);
    for (const time of draft.times) {
      expect(vagasAbertasDoTime(draft, time.id)).toBe(0);
    }
  });

  it("ninguém é escolhido duas vezes", () => {
    const draft = simular(draftDe(10, 45, 3));
    const escolhidos = draft.historico.map((e) => e.jogadorId);
    expect(new Set(escolhidos).size).toBe(escolhidos.length);
  });

  it("quem sobrou do pool fica sem time, e isso é normal", () => {
    // 10 times × 5 = 50 vagas; pool de 10 capitães + 45 = 55 pessoas.
    const draft = simular(draftDe(10, 45, 3));
    expect(jogadoresDisponiveis(draft)).toHaveLength(5);
  });

  it("depois de encerrado, mais nenhuma escolha entra", () => {
    const draft = simular(draftDe(2, 10, 1));
    expect(podeEscolher(draft, "time-1", "jog-9").ok).toBe(false);
  });
});
