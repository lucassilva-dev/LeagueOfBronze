import { describe, expect, it } from "vitest";

import {
  alcancarORelogio,
  aplicarEscolha,
  atualizarForaDoPool,
  escolhiveisDaVez,
  estadoFecha,
  iniciarDraft,
  maisBaratoValido,
  montarDraft,
  timeDaVez,
  vezSemSaida,
  type EstadoDraft,
  type JogadorDoDraft,
} from "@/lib/draft/motor";
import { avisosDaVirada, problemasDaVirada } from "@/lib/draft/virada";

/**
 * B1 (auditoria da retomada, 23/10) — a lista de escolhíveis muda no meio do draft: alguém
 * sai do pool (C1) ou volta a valer (a recusa é desfeita). Duas coisas não podem acontecer:
 *
 *  1. a vez trocar de time no meio do relógio. `atualizarForaDoPool` refazia a ordem da
 *     serpentina inteira, e a escolha cortada antes voltava ANTES da vez corrente: o prazo de
 *     um time valia para o outro, e a escolha que o capitão estava fazendo era recusada com
 *     «nao_e_a_vez»;
 *  2. o draft ficar sem saída. Sem corte a fazer, a ordem refeita não era conferida — o time
 *     que recebia a escolha de volta podia já ter gastado o orçamento inteiro, e o motor
 *     pausava com «sem_jogador» (e «retomar» voltava para o mesmo beco).
 *
 * Viabilidade (nunca travar) e a ordem do sorteio continuam valendo: a vez só passa quando o
 * time da vez não tem mais quem levar, e aí o próximo começa com o prazo inteiro.
 */

const T0 = Date.parse("2026-11-20T23:00:00.000Z");

const j = (id: string, pontos: number): JogadorDoDraft => ({
  id,
  riotId: `${id.toUpperCase()}#BR1`,
  pontos,
  rota1: "MID",
  rota2: "TOP",
  elo: "Prata",
  timeId: null,
});

/** Soma exata 20 = 2 × 10: sem o L, o único corte que fecha é a 2ª escolha de B (no MEIO). */
function apertado(): EstadoDraft {
  return montarDraft({
    times: [
      { id: "a", nome: "A", cor: "#fff", capitaoId: "ca" },
      { id: "b", nome: "B", cor: "#fff", capitaoId: "cb" },
    ],
    jogadores: [j("ca", 4), j("cb", 6), j("p2", 2), j("p3", 3), j("l", 1), j("x", 4)],
    jogadoresPorTime: 3,
    orcamentoPorTime: 10,
    segundosPorEscolha: 60,
  });
}

describe("quem volta a valer depois de um corte no meio da ordem", () => {
  function depoisDoCorte(): EstadoDraft {
    let e = atualizarForaDoPool(iniciarDraft(apertado(), T0), new Set(["l"]), T0);
    expect(e.ordem).toEqual(["a", "b", "a"]);
    e = aplicarEscolha(e, "a", "p2", T0 + 5_000);
    // B leva o X e fica com 10 de 10: não cabe mais ninguém nele.
    e = aplicarEscolha(e, "b", "x", T0 + 10_000);
    expect(timeDaVez(e)).toBe("a");
    return e;
  }

  it("a vez continua do time que está com o relógio, com o MESMO prazo", () => {
    const e = depoisDoCorte();
    const depois = atualizarForaDoPool(e, new Set(), T0 + 12_000);
    expect(depois.foraDoPool).toBeUndefined();
    expect(timeDaVez(depois)).toBe("a");
    expect(depois.prazoISO).toBe(e.prazoISO);
  });

  it("a escolha devolvida não cai no time que já gastou tudo: o draft tem saída e termina sem pausar", () => {
    const depois = atualizarForaDoPool(depoisDoCorte(), new Set(), T0 + 12_000);
    // B não cabe ninguém (folga 0): a escolha dele continua fora da ordem.
    expect(depois.ordem).toEqual(["a", "b", "a"]);
    expect(vezSemSaida(depois)).toBeNull();
    expect(escolhiveisDaVez(depois).sort()).toEqual(["l", "p3"]);

    const fim = alcancarORelogio(depois, Date.parse(depois.prazoISO!) + 1_000);
    expect(fim.fase).toBe("encerrado");
    expect(fim.motivoDaPausa).toBeUndefined();
    // B vai com a vaga aberta, e o L (que voltou e não foi escolhido) fica para a fila.
    expect(problemasDaVirada(fim)).toEqual([]);
    expect(avisosDaVirada(fim).join(" ")).toContain("B vai para o site com 2 de 3");
  });

  it("quando dá, a escolha volta — DEPOIS da vez corrente", () => {
    // Folga em todo mundo: quem sai e volta devolve a escolha cortada, sem mexer na vez.
    const folgado = montarDraft({
      times: [
        { id: "a", nome: "A", cor: "#fff", capitaoId: "ca" },
        { id: "b", nome: "B", cor: "#fff", capitaoId: "cb" },
      ],
      jogadores: [j("ca", 3), j("cb", 3), j("p1", 1), j("p2", 2), j("p3", 2), j("p4", 2)],
      jogadoresPorTime: 3,
      orcamentoPorTime: 20,
      segundosPorEscolha: 60,
    });
    let e = atualizarForaDoPool(iniciarDraft(folgado, T0), new Set(["p4"]), T0);
    expect(e.ordem).toEqual(["a", "b", "b"]);
    e = aplicarEscolha(e, "a", "p1", T0 + 1_000);
    expect(timeDaVez(e)).toBe("b");
    const voltou = atualizarForaDoPool(e, new Set(), T0 + 2_000);
    expect(voltou.ordem).toEqual(["a", "b", "b", "a"]);
    expect(timeDaVez(voltou)).toBe("b");
    expect(voltou.prazoISO).toBe(e.prazoISO);
  });
});

describe("o time da vez sem ninguém que caiba nele", () => {
  it("perde a escolha (é o único jeito de não travar), e o próximo ganha o prazo INTEIRO", () => {
    // A só cabe 1 ponto, e o único de 1 ponto desiste com o relógio de A correndo.
    const e = iniciarDraft(
      montarDraft({
        times: [
          { id: "a", nome: "A", cor: "#fff", capitaoId: "ca" },
          { id: "b", nome: "B", cor: "#fff", capitaoId: "cb" },
        ],
        jogadores: [j("ca", 9), j("cb", 5), j("p1", 1), j("p2", 4)],
        jogadoresPorTime: 2,
        orcamentoPorTime: 10,
        segundosPorEscolha: 60,
      }),
      T0,
    );
    expect(timeDaVez(e)).toBe("a");
    const agora = T0 + 20_000;
    const depois = atualizarForaDoPool(e, new Set(["p1"]), agora);
    expect(depois.ordem).toEqual(["b"]);
    expect(timeDaVez(depois)).toBe("b");
    // Não o resto do relógio de A: o prazo recomeça de agora.
    expect(depois.prazoISO).toBe(new Date(agora + 60_000).toISOString());
    expect(escolhiveisDaVez(depois)).toEqual(["p2"]);
  });
});

/*
 * Varredura: drafts pequenos sorteados, com saídas e voltas em momentos aleatórios. A
 * invariante é a do motor — montado viável, nunca trava — mais a da vez: a volta de alguém
 * nunca troca a vez nem o prazo, e uma saída só troca a vez quando o time da vez não tem
 * mais ninguém que caiba nele (e aí com prazo novo).
 */
function rng(semente: number) {
  let s = semente >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

function draftAleatorio(r: () => number): EstadoDraft {
  const times = 2 + Math.floor(r() * 3);
  const porTime = 3 + Math.floor(r() * 2);
  const orcamento = 10 + Math.floor(r() * 6);
  const jogadores = Array.from({ length: times * porTime }, (_, i) => j(`j${i}`, 1 + Math.floor(r() * 5)));
  return montarDraft({
    times: Array.from({ length: times }, (_, t) => ({ id: `t${t}`, nome: `T${t}`, cor: "#fff", capitaoId: `j${t}` })),
    jogadores,
    jogadoresPorTime: porTime,
    orcamentoPorTime: orcamento,
    segundosPorEscolha: 60,
  });
}

describe("saídas e voltas sorteadas", () => {
  it("nunca trava, a volta nunca troca a vez, e a saída só troca quando o time da vez não cabe ninguém", () => {
    const falhas: string[] = [];
    let drafts = 0;
    let voltas = 0;
    for (let semente = 1; semente <= 2500 && falhas.length < 3; semente++) {
      const r = rng(semente);
      let e = iniciarDraft(draftAleatorio(r), 0);
      if (!estadoFecha(e)) continue;
      drafts++;
      const saiu = new Set<string>();
      let t = 1;
      while (e.fase === "rodando") {
        const sorte = r();
        const antes = e;
        const vez = timeDaVez(e);
        let tipo: "saida" | "volta" | null = null;
        if (sorte < 0.2) {
          const livres = e.jogadores.filter((x) => x.timeId === null && !saiu.has(x.id));
          if (livres.length > 0) {
            saiu.add(livres[Math.floor(r() * livres.length)]!.id);
            tipo = "saida";
          }
        } else if (sorte < 0.32 && saiu.size > 0) {
          saiu.delete([...saiu][Math.floor(r() * saiu.size)]!);
          tipo = "volta";
          voltas++;
        }
        if (tipo) {
          e = atualizarForaDoPool(e, saiu, t * 1000);
          if (e.fase === "rodando" && timeDaVez(e) !== vez) {
            const folga = antes.orcamentoPorTime - antes.jogadores.filter((x) => x.timeId === vez).reduce((s, x) => s + x.pontos, 0);
            const cabia = antes.jogadores.some((x) => x.timeId === null && !saiu.has(x.id) && x.pontos <= folga);
            if (tipo === "volta" || cabia) falhas.push(`semente ${semente}: a ${tipo} trocou a vez de ${vez} para ${timeDaVez(e)}`);
            else if (e.prazoISO !== new Date(t * 1000 + 60_000).toISOString()) falhas.push(`semente ${semente}: vez nova sem prazo novo`);
          } else if (e.fase === "rodando" && e.prazoISO !== antes.prazoISO) {
            falhas.push(`semente ${semente}: o prazo mudou sem a vez mudar`);
          }
        }
        if (e.fase !== "rodando") break;
        const opcoes = escolhiveisDaVez(e);
        if (opcoes.length === 0) {
          falhas.push(`semente ${semente}: vez de ${timeDaVez(e)} sem escolhíveis (${JSON.stringify(vezSemSaida(e))})`);
          break;
        }
        e = aplicarEscolha(e, timeDaVez(e)!, opcoes[Math.floor(r() * opcoes.length)]!, t++ * 1000);
      }
      if (e.fase === "encerrado" && problemasDaVirada(e).length > 0) {
        falhas.push(`semente ${semente}: a virada recusou (${problemasDaVirada(e).join(" ")})`);
      }
    }
    expect(falhas).toEqual([]);
    expect(drafts).toBeGreaterThan(500);
    expect(voltas).toBeGreaterThan(300);
  });
});

/*
 * Depois de saídas, a soma deixa de ser exata e a poda da busca de viabilidade fica fraca:
 * provar que um preço NÃO fecha passa do orçamento de passos, e o "indeterminado" contava
 * como "fecha". O capitão (ou a escolha automática) podia levar justamente o jogador que
 * travava o draft algumas escolhas depois. O estado abaixo é o de um draft de 8 times com o
 * pool real da 4ª, na 9ª escolha, depois de três desistências (achado por varredura).
 */
describe("o «indeterminado» não entra na lista quando há escolha provada", () => {
  function estadoDepoisDeTresSaidas(): EstadoDraft {
    const folgas = [16, 12, 14, 17, 18, 17, 18, 20];
    const custos = [2, 2, 2, 3, 3, 4, 4, 4, 4, 4, 5, 5, 5, 6, 6, 6, 7, 8, 8, 9, 15];
    return {
      versao: 1,
      fase: "rodando",
      times: folgas.map((_, i) => ({ id: `t${i + 1}`, nome: `T${i + 1}`, cor: "#fff", capitaoId: `c${i + 1}` })),
      jogadores: [
        ...folgas.map((f, i) => ({ ...j(`c${i + 1}`, 30 - f), timeId: `t${i + 1}` })),
        ...custos.map((p, i) => j(`p${String(i).padStart(2, "0")}`, p)),
      ],
      ordem: "8,7,6,5,4,3,2,1,1,2,3,4,5,6,7,8,8,7,6,5,4".split(",").map((n) => `t${n}`),
      escolhaAtual: 0,
      prazoISO: new Date(T0 + 60_000).toISOString(),
      jogadoresPorTime: 5,
      orcamentoPorTime: 30,
      segundosPorEscolha: 60,
      historico: [],
    };
  }

  it("toda escolha oferecida mantém o draft com saída (conferido com uma busca bem maior)", () => {
    const e = estadoDepoisDeTresSaidas();
    const oferecidos = escolhiveisDaVez(e);
    expect(oferecidos.length).toBeGreaterThan(0);
    for (const id of oferecidos) {
      expect(estadoFecha(aplicarEscolha(e, "t8", id, T0 + 1_000), 50_000_000), id).toBe(true);
    }
    const auto = maisBaratoValido(e, "t8")!;
    expect(oferecidos).toContain(auto.id);
  });
});
