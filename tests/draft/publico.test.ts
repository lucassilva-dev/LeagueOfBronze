import { describe, expect, it } from "vitest";

import { montarDraft, iniciarDraft, aplicarEscolha, type JogadorDoDraft } from "@/lib/draft/motor";
import { paraPublico, timeDoCapitao } from "@/lib/draft/store";
import { TIMES_DO_DRAFT, identidadeDoTime } from "@/lib/draft/times";

const T0 = Date.parse("2026-11-08T20:00:00.000Z");

function draftDe2Times() {
  const jogadores: JogadorDoDraft[] = [
    { id: "cap-a", riotId: "CapA#BR1", pontos: 5, rota1: "MID", rota2: "TOP", elo: "Platina", timeId: null },
    { id: "cap-b", riotId: "CapB#BR1", pontos: 5, rota1: "MID", rota2: "TOP", elo: "Platina", timeId: null },
    ...Array.from({ length: 10 }, (_, i) => ({
      id: `j${i}`,
      riotId: `Jog${i}#BR1`,
      pontos: 2,
      rota1: "ADC",
      rota2: "SUP",
      elo: "Prata",
      timeId: null,
    })),
  ];

  return montarDraft({
    times: [
      { id: "t1", nome: "CHAMA", cor: "#ef7d34", capitaoId: "cap-a" },
      { id: "t2", nome: "ÁUREA", cor: "#e0b13c", capitaoId: "cap-b" },
    ],
    jogadores,
    jogadoresPorTime: 5,
    orcamentoPorTime: 30,
    segundosPorEscolha: 60,
  });
}

describe("a visão pública do draft", () => {
  it("NÃO carrega nada que identifique alguém fora do jogo", () => {
    // A transmissão é aberta. Se um e-mail ou WhatsApp entrasse aqui, bastaria abrir
    // o painel de rede do navegador para colher o contato de 50 pessoas.
    const publico = paraPublico(iniciarDraft(draftDe2Times(), T0), 1);
    const bruto = JSON.stringify(publico).toLowerCase();

    for (const proibido of ["email", "e-mail", "@exemplo", "whatsapp", "discord", "telefone", "ip_hash"]) {
      expect(bruto, `vazou "${proibido}"`).not.toContain(proibido);
    }
  });

  it("mostra o gasto e as vagas de cada time, que é o que a plateia acompanha", () => {
    let draft = iniciarDraft(draftDe2Times(), T0);
    draft = aplicarEscolha(draft, "t1", "j0", T0);

    const publico = paraPublico(draft, 1);
    const chama = publico.times.find((t) => t.id === "t1")!;

    expect(chama.gasto).toBe(7); // capitão 5 + escolhido 2
    expect(chama.vagas).toBe(3);
    expect(chama.capitaoRiotId).toBe("CapA#BR1");
  });

  it("o capitão vem marcado dentro do elenco", () => {
    const publico = paraPublico(iniciarDraft(draftDe2Times(), T0), 1);
    expect(publico.elencos.t1?.filter((j) => j.capitao)).toHaveLength(1);
  });

  it("quem já foi escolhido sai da lista de disponíveis", () => {
    let draft = iniciarDraft(draftDe2Times(), T0);
    const antes = paraPublico(draft, 1).disponiveis.length;
    draft = aplicarEscolha(draft, "t1", "j0", T0);

    const depois = paraPublico(draft, 1).disponiveis;
    expect(depois).toHaveLength(antes - 1);
    expect(depois.some((j) => j.id === "j0")).toBe(false);
  });

  it("o histórico sai com o nick, não com o id interno", () => {
    let draft = iniciarDraft(draftDe2Times(), T0);
    draft = aplicarEscolha(draft, "t1", "j0", T0);

    expect(paraPublico(draft, 1).historico[0]).toMatchObject({ timeId: "t1", riotId: "Jog0#BR1" });
  });

  it("o total de escolhas é 4 por time, não um número fixo", () => {
    expect(paraPublico(draftDe2Times(), 1).totalEscolhas).toBe(8);
  });
});

describe("de quem é o time", () => {
  it("acha o time do capitão pela inscrição, e devolve null para os outros", () => {
    const draft = draftDe2Times();
    expect(timeDoCapitao(draft, "cap-a")).toBe("t1");
    expect(timeDoCapitao(draft, "cap-b")).toBe("t2");
    // Um jogador comum não capitaneia nada — é o que barra a escolha alheia.
    expect(timeDoCapitao(draft, "j0")).toBeNull();
    expect(timeDoCapitao(draft, "inexistente")).toBeNull();
  });
});

describe("identidade dos times", () => {
  it("os seis primeiros são os do design, na mesma ordem", () => {
    expect(identidadeDoTime(0).nome).toBe("CHAMA");
    expect(identidadeDoTime(5).nome).toBe("CARMESIM");
  });

  it("passa de seis sem repetir nome — a edição pode ter 10 times", () => {
    const nomes = Array.from({ length: 10 }, (_, i) => identidadeDoTime(i).nome);
    expect(new Set(nomes).size).toBe(10);
  });

  it("as cores são todas distintas", () => {
    const cores = TIMES_DO_DRAFT.map((t) => t.cor);
    expect(new Set(cores).size).toBe(cores.length);
  });

  it("estourando a lista, numera em vez de repetir", () => {
    const primeiro = identidadeDoTime(0);
    const daVolta = identidadeDoTime(TIMES_DO_DRAFT.length);
    expect(daVolta.nome).not.toBe(primeiro.nome);
    expect(daVolta.nome).toContain("II");
  });
});
