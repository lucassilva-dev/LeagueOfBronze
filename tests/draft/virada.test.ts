import { describe, expect, it } from "vitest";

import { aplicarEscolha, iniciarDraft, montarDraft, type JogadorDoDraft } from "@/lib/draft/motor";
import { datasetDoDraft, problemasDaVirada } from "@/lib/draft/virada";

const T0 = Date.parse("2026-11-08T20:00:00.000Z");

/**
 * A virada é a fronteira de privacidade do projeto: de um lado, tabelas com e-mail,
 * WhatsApp, Discord e nome real; do outro, um dataset que vai inteiro para o navegador
 * de qualquer visitante. Estes testes existem para que a regra "só nick, rotas, elo e
 * time" seja verificável, e não apenas prometida num comentário.
 */

function draftCompleto() {
  const jogadores: JogadorDoDraft[] = [
    { id: "cap-a", riotId: "Onigami#BR1", pontos: 5, rota1: "MEIO", rota2: "TOPO", elo: "Platina", timeId: null },
    { id: "cap-b", riotId: "Nakay#JPN", pontos: 5, rota1: "MEIO", rota2: "SELVA", elo: "Platina", timeId: null },
    { id: "j1", riotId: "Thalin#BR1", pontos: 2, rota1: "SELVA", rota2: "TOPO", elo: "Bronze", timeId: null },
    { id: "j2", riotId: "Gaylord#BR1", pontos: 2, rota1: "ATIRADOR", rota2: "SUPORTE", elo: "Bronze", timeId: null },
  ];

  let draft = montarDraft({
    times: [
      { id: "time-1", nome: "CHAMA", cor: "#ef7d34", capitaoId: "cap-a" },
      { id: "time-2", nome: "ÁUREA", cor: "#e0b13c", capitaoId: "cap-b" },
    ],
    jogadores,
    jogadoresPorTime: 2,
    orcamentoPorTime: 30,
    segundosPorEscolha: 60,
  });

  draft = iniciarDraft(draft, T0);
  draft = aplicarEscolha(draft, "time-1", "j1", T0);
  draft = aplicarEscolha(draft, "time-2", "j2", T0);
  return draft;
}

describe("o que atravessa para o dataset público", () => {
  it("NADA de contato ou dado interno cruza a fronteira", () => {
    // Um `...inscrito` no lugar da conversão por campo publicaria o contato de 50
    // pessoas sem nenhum erro aparecer. Este é o teste que impede isso.
    const bruto = JSON.stringify(datasetDoDraft(draftCompleto())).toLowerCase();

    for (const proibido of ["email", "@", "whatsapp", "discord", "ip_hash", "jogador_id", "pontos", "observ"]) {
      expect(bruto, `vazou "${proibido}"`).not.toContain(proibido);
    }
  });

  it("cada jogador leva exatamente nick, slug, id, time, rotas e elo", () => {
    const { players } = datasetDoDraft(draftCompleto());
    const campos = Object.keys(players[0]!).sort();

    expect(campos).toEqual(["elo", "id", "nick", "role1", "role2", "slug", "teamId"]);
  });

  it("o nome real NÃO vai junto, mesmo havendo campo para ele no dataset", () => {
    // O dataset aceita `name`, e o combinado com o grupo foi expor o nick.
    const { players } = datasetDoDraft(draftCompleto());
    expect(players.every((p) => p.name === undefined)).toBe(true);
  });

  it("as rotas saem no vocabulário do dataset, não no do formulário", () => {
    const { players } = datasetDoDraft(draftCompleto());
    const thalin = players.find((p) => p.nick === "Thalin#BR1")!;

    // O formulário manda "SELVA"; o dataset fala "JUNG" — foi exatamente aqui que a
    // selva já saiu gravada como "SEL", que o próprio site não reconhecia.
    expect(thalin.role1).toBe("JUNG");
    expect(thalin.role2).toBe("TOP");
  });

  it("times viram slug legível, e os jogadores apontam para ele", () => {
    const { teams, players } = datasetDoDraft(draftCompleto());

    expect(teams.map((t) => t.slug)).toEqual(["chama", "aurea"]);
    expect(players.find((p) => p.nick === "Onigami#BR1")?.teamId).toBe("chama");
  });

  it("nicks iguais com tags diferentes não brigam pela mesma página", () => {
    // O slug vira a URL do jogador. Sem desempate, um sobrescreveria o outro.
    let draft = montarDraft({
      times: [{ id: "t1", nome: "CHAMA", cor: "#ef7d34", capitaoId: "a" }],
      jogadores: [
        { id: "a", riotId: "Nak4y#BR1", pontos: 3, rota1: "MEIO", rota2: "TOPO", elo: "Ouro", timeId: null },
        { id: "b", riotId: "Nak4y#JPN", pontos: 3, rota1: "SELVA", rota2: "TOPO", elo: "Ouro", timeId: null },
      ],
      jogadoresPorTime: 2,
      orcamentoPorTime: 30,
      segundosPorEscolha: 60,
    });
    draft = aplicarEscolha(iniciarDraft(draft, T0), "t1", "b", T0);

    const slugs = datasetDoDraft(draft).players.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(2);
  });

  it("quem sobrou sem time não entra no dataset", () => {
    const draft = montarDraft({
      times: [{ id: "t1", nome: "CHAMA", cor: "#ef7d34", capitaoId: "a" }],
      jogadores: [
        { id: "a", riotId: "Cap#BR1", pontos: 3, rota1: "MEIO", rota2: "TOPO", elo: "Ouro", timeId: null },
        { id: "z", riotId: "Sobra#BR1", pontos: 3, rota1: "SELVA", rota2: "TOPO", elo: "Ouro", timeId: null },
      ],
      jogadoresPorTime: 2,
      orcamentoPorTime: 30,
      segundosPorEscolha: 60,
    });

    const { players } = datasetDoDraft(draft);
    expect(players.map((p) => p.nick)).toEqual(["Cap#BR1"]);
  });
});

describe("o que impede uma virada errada", () => {
  it("draft terminado e elencos cheios não acusam nada", () => {
    expect(problemasDaVirada(draftCompleto())).toEqual([]);
  });

  it("draft no meio é recusado, com o time incompleto nomeado", () => {
    let draft = montarDraft({
      times: [
        { id: "t1", nome: "CHAMA", cor: "#ef7d34", capitaoId: "a" },
        { id: "t2", nome: "ÁUREA", cor: "#e0b13c", capitaoId: "b" },
      ],
      jogadores: [
        { id: "a", riotId: "A#BR1", pontos: 3, rota1: "MEIO", rota2: "TOPO", elo: "Ouro", timeId: null },
        { id: "b", riotId: "B#BR1", pontos: 3, rota1: "MEIO", rota2: "TOPO", elo: "Ouro", timeId: null },
        { id: "c", riotId: "C#BR1", pontos: 3, rota1: "SELVA", rota2: "TOPO", elo: "Ouro", timeId: null },
        { id: "d", riotId: "D#BR1", pontos: 3, rota1: "SELVA", rota2: "TOPO", elo: "Ouro", timeId: null },
      ],
      jogadoresPorTime: 2,
      orcamentoPorTime: 30,
      segundosPorEscolha: 60,
    });
    draft = aplicarEscolha(iniciarDraft(draft, T0), "t1", "c", T0);

    const problemas = problemasDaVirada(draft);
    expect(problemas.some((p) => p.includes("não terminou"))).toBe(true);
    expect(problemas.some((p) => p.includes("ÁUREA") && p.includes("1 de 2"))).toBe(true);
  });

  it("dois times de nome equivalente seriam pegos antes de escrever", () => {
    // "CHAMA" e "Chama" viram o mesmo slug, e o segundo apagaria a página do primeiro.
    const draft = montarDraft({
      times: [
        { id: "t1", nome: "CHAMA", cor: "#ef7d34", capitaoId: "a" },
        { id: "t2", nome: "Chama", cor: "#e0b13c", capitaoId: "b" },
      ],
      jogadores: [
        { id: "a", riotId: "A#BR1", pontos: 3, rota1: "MEIO", rota2: "TOPO", elo: "Ouro", timeId: null },
        { id: "b", riotId: "B#BR1", pontos: 3, rota1: "MEIO", rota2: "TOPO", elo: "Ouro", timeId: null },
      ],
      jogadoresPorTime: 1,
      orcamentoPorTime: 30,
      segundosPorEscolha: 60,
    });

    expect(problemasDaVirada(draft).some((p) => p.includes("mesmo endereço"))).toBe(true);
  });
});
