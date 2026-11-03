import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { atualizarNicksDoDataset, riotIdValido, type ContaConhecida } from "@/lib/riot/nicks-do-site";
import { tournamentDatasetSchema, type Player, type TournamentDataset } from "@/lib/schema";

/**
 * O nick do site acompanha a conta da Riot: cada caso é construído aqui.
 */

function jogador(over: Partial<Player> & Pick<Player, "id" | "nick">): Player {
  return { slug: over.id, teamId: "t1", role1: "MID", elo: "Ouro", ...over };
}

function dataset(players: Player[], arquivadas: Player[][] = []): TournamentDataset {
  return {
    tournament: { name: "LoB", season: "4ª" },
    teams: [{ id: "t1", name: "Time", slug: "time" }],
    players,
    seriesMatches: [],
    standingsSeed: [],
    archivedSeasons: arquivadas.map((elenco, i) => ({
      seasonId: `temporada-${i + 1}`,
      name: `Temporada ${i + 1}`,
      archivedAtISO: "2026-01-01T00:00:00.000Z",
      snapshot: {
        tournament: { name: "LoB", season: `${i + 1}ª` },
        teams: [{ id: "t1", name: "Time", slug: "time" }],
        players: elenco,
        seriesMatches: [],
        standingsSeed: [],
      },
    })),
  } as unknown as TournamentDataset;
}

const NAK = "PUUID-NAK";
const conta = (over: Partial<ContaConhecida> = {}): ContaConhecida => ({
  puuid: NAK,
  riotId: "Nak4y Novo#BR1",
  outrosNomes: ["Nak4y#BR1"],
  ...over,
});

describe("atualizarNicksDoDataset", () => {
  it("liga pelo nome declarado e troca o nick, mantendo id e slug", () => {
    const antes = dataset([jogador({ id: "nak4y", nick: "Nak4y#BR1" })]);
    const { dataset: depois, mudancas, vinculados } = atualizarNicksDoDataset(antes, [conta()]);
    expect(depois.players[0]).toMatchObject({ id: "nak4y", slug: "nak4y", nick: "Nak4y Novo#BR1", puuid: NAK });
    expect(mudancas).toEqual([{ temporada: null, jogadorId: "nak4y", de: "Nak4y#BR1", para: "Nak4y Novo#BR1" }]);
    expect(vinculados).toBe(1);
    // A entrada não é mexida.
    expect(antes.players[0]!.nick).toBe("Nak4y#BR1");
  });

  it("quem já tem puuid casa por ele, mesmo depois de duas trocas de nick", () => {
    const antes = dataset([jogador({ id: "nak4y", nick: "Nome Do Meio#BR1", puuid: NAK })]);
    const { dataset: depois, vinculados } = atualizarNicksDoDataset(antes, [conta({ riotId: "Terceiro#BR1" })]);
    expect(depois.players[0]!.nick).toBe("Terceiro#BR1");
    expect(vinculados).toBe(0);
  });

  it("o casamento pelo nome ignora acento, espaço e maiúsculas, como a Riot", () => {
    const antes = dataset([jogador({ id: "bety", nick: "BETY CLARAO#2424" })]);
    const { dataset: depois } = atualizarNicksDoDataset(antes, [
      { puuid: "P-BETY", riotId: "BETY CLARÃO#2424", outrosNomes: ["bety clarao#2424"] },
    ]);
    expect(depois.players[0]).toMatchObject({ nick: "BETY CLARÃO#2424", puuid: "P-BETY" });
  });

  it("o jogador da temporada arquivada também ganha o nick novo (nome com espaço solto, da 3ª)", () => {
    const antes = dataset(
      [jogador({ id: "nak4y", nick: "Nak4y#BR1" })],
      [[jogador({ id: "nak4y-3", nick: "NAK4Y # br1" }), jogador({ id: "outro", nick: "Outro#BR1" })]],
    );
    const { dataset: depois, mudancas } = atualizarNicksDoDataset(antes, [conta()]);
    expect(depois.archivedSeasons[0]!.snapshot.players[0]).toMatchObject({ nick: "Nak4y Novo#BR1", puuid: NAK });
    expect(depois.archivedSeasons[0]!.snapshot.players[1]!.nick).toBe("Outro#BR1");
    expect(mudancas.map((m) => m.temporada)).toEqual([null, "temporada-1"]);
  });

  it("nada mudou: devolve o MESMO objeto (não grava à toa)", () => {
    const antes = dataset([jogador({ id: "nak4y", nick: "Nak4y Novo#BR1", puuid: NAK })], [[jogador({ id: "x", nick: "X#1" })]]);
    const r = atualizarNicksDoDataset(antes, [conta()]);
    expect(r.dataset).toBe(antes);
    expect(r.mudancas).toEqual([]);
    expect(r.vinculados).toBe(0);
  });

  it("um nome que serve a duas contas não liga ninguém", () => {
    const antes = dataset([jogador({ id: "a", nick: "Dono#BR1" })]);
    const { dataset: depois } = atualizarNicksDoDataset(antes, [
      { puuid: "P1", riotId: "Dono#BR1" },
      { puuid: "P2", riotId: "Outro#BR1", outrosNomes: ["Dono#BR1"] },
    ]);
    expect(depois.players[0]).toEqual(antes.players[0]);
  });

  it("duas pessoas da mesma temporada caindo na mesma conta: nenhuma é mexida", () => {
    const antes = dataset([
      jogador({ id: "a", nick: "Nak4y#BR1" }),
      jogador({ id: "b", nick: "x#1", puuid: NAK }),
    ]);
    const { dataset: depois, mudancas } = atualizarNicksDoDataset(antes, [conta()]);
    expect(depois.players).toEqual(antes.players);
    expect(mudancas).toEqual([]);
  });

  it("conta sem Riot ID completo (sem #TAG) nunca vira nick — o OP.GG precisa da tag", () => {
    const antes = dataset([jogador({ id: "nak4y", nick: "Nak4y#BR1", puuid: NAK })]);
    const { dataset: depois } = atualizarNicksDoDataset(antes, [conta({ riotId: "SemTag" })]);
    expect(depois.players[0]!.nick).toBe("Nak4y#BR1");
  });

  it("o resultado continua válido no schema do campeonato, com o puuid preservado", () => {
    const real = tournamentDatasetSchema.parse(JSON.parse(readFileSync(path.join(process.cwd(), "leagueofbronze.json"), "utf8")));
    const alvo = real.players[0]!;
    const { dataset: depois } = atualizarNicksDoDataset(real, [
      { puuid: "abc_DEF-123", riotId: "Nick Novo#BR1", outrosNomes: [alvo.nick] },
    ]);
    const lido = tournamentDatasetSchema.parse(depois);
    expect(lido.players[0]).toMatchObject({ id: alvo.id, slug: alvo.slug, nick: "Nick Novo#BR1", puuid: "abc_DEF-123" });
  });

  it("riotIdValido", () => {
    expect(riotIdValido("Nome#TAG")).toBe(true);
    expect(riotIdValido("Nome")).toBe(false);
    expect(riotIdValido("#TAG")).toBe(false);
    expect(riotIdValido("Nome#")).toBe(false);
  });

  it("quem já tem puuid NÃO cai no nome quando a conta dele não está entre as conhecidas", () => {
    const antes = dataset([jogador({ id: "a", nick: "Nak4y#BR1", puuid: "OUTRA-CONTA" })]);
    expect(atualizarNicksDoDataset(antes, [conta()]).dataset).toBe(antes);
  });

  it("chave da API trocada: o puuid antigo da mesma conta leva ao novo", () => {
    const antes = dataset([jogador({ id: "a", nick: "Nak4y#BR1", puuid: "P-VELHO" })]);
    const { dataset: depois } = atualizarNicksDoDataset(antes, [conta({ puuidsAntigos: ["P-VELHO"] })]);
    expect(depois.players[0]).toMatchObject({ puuid: NAK, nick: "Nak4y Novo#BR1" });
  });

  it("conta que não renomeia (Riot ID possivelmente velho): liga a conta, mas não troca o nick", () => {
    const antes = dataset([jogador({ id: "a", nick: "Nak4y#BR1" })]);
    const { dataset: depois, mudancas, vinculados } = atualizarNicksDoDataset(antes, [conta({ renomeia: false })]);
    expect(depois.players[0]).toMatchObject({ nick: "Nak4y#BR1", puuid: NAK });
    expect(mudancas).toEqual([]);
    expect(vinculados).toBe(1);
  });

  it("arquivo: só liga pelo nome contas que ligamArquivo; a temporada atual liga qualquer uma", () => {
    const antes = dataset([jogador({ id: "a", nick: "Nak4y#BR1" })], [[jogador({ id: "a-3", nick: "Nak4y#BR1" })]]);
    const { dataset: depois } = atualizarNicksDoDataset(antes, [conta({ ligaArquivo: false })]);
    expect(depois.players[0]!.puuid).toBe(NAK);
    expect(depois.archivedSeasons[0]!.snapshot.players[0]!.puuid).toBeUndefined();
  });

  it("duas leituras da mesma conta: vale a que pode renomear e, depois, a mais nova", () => {
    const antes = dataset([jogador({ id: "a", nick: "Nak4y#BR1", puuid: NAK })]);
    const { dataset: depois } = atualizarNicksDoDataset(antes, [
      conta({ riotId: "Hoje#BR1", lidaEm: "2026-11-03" }),
      conta({ riotId: "Ontem#BR1", lidaEm: "2026-11-02" }),
      conta({ riotId: "Velho Sem Renomear#BR1", renomeia: false, lidaEm: "2026-11-04" }),
    ]);
    expect(depois.players[0]!.nick).toBe("Hoje#BR1");
  });
});

