import { describe, expect, it } from "vitest";

import { avisosDoSorteio, impedimentosDoSorteio, montarDraft, type JogadorDoDraft } from "@/lib/draft/motor";

/**
 * Regressão dos dois defeitos que a auditoria do draft encontrou, e que só apareceriam
 * no dia do sorteio — quando o conserto é refazer tudo na frente do grupo.
 */

function jogador(id: string, pontos: number): JogadorDoDraft {
  return { id, riotId: `${id}#BR1`, pontos, rota1: "MID", rota2: "TOP", elo: "Ouro", timeId: null };
}

describe("quem joga é decidido pela fila (decisão C4 de 2026-10-22)", () => {
  it("recusa sortear com mais titulares aptos que vagas — e manda a fila cortar, não a mão", () => {
    // A fila corta pela ordem de inscrição quando há teto de times (lib/inscricoes/fila.ts).
    // Mais titulares que vagas só acontece sem teto (ou com teto maior que os times que
    // fecham): o conserto é o número de times em Configuração, não "marcar N como sobra" —
    // aquela mensagem dizia que a ordem de inscrição não decidia, o oposto da regra nova.
    const problemas = impedimentosDoSorteio({
      pontosDosQueJogam: Array(12).fill(3),
      vagas: 10,
      times: 2,
      orcamentoPorTime: 30,
      totalDeElegiveis: 12,
    });

    expect(problemas).toHaveLength(1);
    expect(problemas[0]).toContain("Há 12 titulares aptos para 10 vagas (2 times)");
    expect(problemas[0]).toContain("ordem de inscrição");
    expect(problemas[0]).toContain("os 2 últimos inscritos vão para a fila de reserva");
    expect(problemas[0]).not.toMatch(/marque|não da ordem de inscrição/i);
  });

  it("menos titulares aptos que vagas NÃO impede o sorteio: vira aviso na mesa (C4)", () => {
    // Especificação C4: «titular que não está apto na hora de sortear vira aviso na mesa». Um
    // titular pendente no dia do draft (o reserva chamado em 01/11, que tem 48 h para pagar)
    // impedia o sorteio inteiro.
    const params = { pontosDosQueJogam: Array(8).fill(3), vagas: 10, times: 2, orcamentoPorTime: 30, totalDeElegiveis: 12 };
    expect(impedimentosDoSorteio(params)).toEqual([]);

    const avisos = avisosDoSorteio({ quantos: 8, vagas: 10, times: 2 });
    expect(avisos).toHaveLength(1);
    expect(avisos[0]).toContain("Faltam 2");
    expect(avisos[0]).toContain("vaga aberta");
    expect(avisos[0]).toContain("próximo da fila de reserva");
    expect(avisosDoSorteio({ quantos: 10, vagas: 10, times: 2 })).toEqual([]);
  });

  it("menos titulares aptos que TIMES impede: não há nem o capitão de cada um", () => {
    const problemas = impedimentosDoSorteio({
      pontosDosQueJogam: [3],
      vagas: 10,
      times: 2,
      orcamentoPorTime: 30,
      totalDeElegiveis: 12,
    });
    expect(problemas).toHaveLength(1);
    expect(problemas[0]).toContain("cada time precisa ao menos do capitão");
    expect(avisosDoSorteio({ quantos: 1, vagas: 10, times: 2 })).toEqual([]);
  });

  it("com a conta exata, nada impede", () => {
    expect(
      impedimentosDoSorteio({
        pontosDosQueJogam: Array(10).fill(3),
        vagas: 10,
        times: 2,
        orcamentoPorTime: 30,
        totalDeElegiveis: 12,
      }),
    ).toEqual([]);
  });

  it("sem gente para um time sequer, diz isso e para por aí", () => {
    const problemas = impedimentosDoSorteio({
      pontosDosQueJogam: [3, 3],
      vagas: 0,
      times: 0,
      orcamentoPorTime: 30,
      totalDeElegiveis: 2,
    });

    expect(problemas).toHaveLength(1);
    expect(problemas[0]).toContain("suficientes");
  });
});

describe("orçamento conferido antes do sorteio, não durante", () => {
  it("recusa um pool que não cabe no teto total", () => {
    // O caso real: dois Desafiantes (15) e oito de 4 pontos somam 62 para um teto de
    // 60. Nenhum arranjo fecha os dois elencos — o draft entraria ao vivo condenado a
    // travar numa escolha em que ninguém cabe.
    const problemas = impedimentosDoSorteio({
      pontosDosQueJogam: [15, 15, 4, 4, 4, 4, 4, 4, 4, 4],
      vagas: 10,
      times: 2,
      orcamentoPorTime: 30,
      totalDeElegiveis: 10,
    });

    expect(problemas).toHaveLength(1);
    expect(problemas[0]).toContain("62");
    expect(problemas[0]).toContain("60");
  });

  it("exatamente no teto passa — a recusa é só acima dele", () => {
    expect(
      impedimentosDoSorteio({
        pontosDosQueJogam: Array(10).fill(6),
        vagas: 10,
        times: 2,
        orcamentoPorTime: 30,
        totalDeElegiveis: 10,
      }),
    ).toEqual([]);
  });

  it("acusa os dois problemas de uma vez, em vez de um por tentativa", () => {
    const problemas = impedimentosDoSorteio({
      pontosDosQueJogam: [15, 15, 15, 15, 15, 15],
      vagas: 5,
      times: 1,
      orcamentoPorTime: 30,
      totalDeElegiveis: 6,
    });

    expect(problemas).toHaveLength(2);
  });
});

describe("um capitão, um time", () => {
  it("recusa o mesmo jogador capitaneando dois times", () => {
    // Repetido, `montarDraft` liga o jogador ao PRIMEIRO time que o reivindica e o
    // segundo nasce sem elenco: ninguém consegue escolher por ele, tudo cai no
    // auto-pick, e a virada fica travada com "time X tem 4 de 5" — descoberto no fim
    // do evento ao vivo.
    expect(() =>
      montarDraft({
        times: [
          { id: "t1", nome: "CHAMA", cor: "#ef7d34", capitaoId: "a" },
          { id: "t2", nome: "ÁUREA", cor: "#e0b13c", capitaoId: "a" },
        ],
        jogadores: [jogador("a", 5), jogador("b", 5), jogador("c", 3), jogador("d", 3)],
        jogadoresPorTime: 2,
        orcamentoPorTime: 30,
        segundosPorEscolha: 60,
      }),
    ).toThrow(/mais de um time/i);
  });

  it("capitães distintos montam normalmente", () => {
    const draft = montarDraft({
      times: [
        { id: "t1", nome: "CHAMA", cor: "#ef7d34", capitaoId: "a" },
        { id: "t2", nome: "ÁUREA", cor: "#e0b13c", capitaoId: "b" },
      ],
      jogadores: [jogador("a", 5), jogador("b", 5), jogador("c", 3), jogador("d", 3)],
      jogadoresPorTime: 2,
      orcamentoPorTime: 30,
      segundosPorEscolha: 60,
    });

    // Cada time nasce com o capitão dentro e uma vaga aberta.
    expect(draft.jogadores.filter((j) => j.timeId === "t1")).toHaveLength(1);
    expect(draft.jogadores.filter((j) => j.timeId === "t2")).toHaveLength(1);
    expect(draft.ordem).toHaveLength(2);
  });
});
