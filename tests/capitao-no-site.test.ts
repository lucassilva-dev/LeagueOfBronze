import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { resolveRole } from "@/lib/design";
import { aplicarEscolha, iniciarDraft, montarDraft, type JogadorDoDraft } from "@/lib/draft/motor";
import { datasetDoDraft, problemasDaVirada } from "@/lib/draft/virada";
import { buildDesignPlayers, buildDesignTeams } from "@/lib/roster";
import { archivedSeasonSchema, tournamentDatasetSchema, type TournamentDataset } from "@/lib/schema";
import { buildArchivedSeason, snapshotToDataset } from "@/lib/tournament";

/**
 * O capitão que o site público mostra depois da virada do draft.
 *
 * Até a 3ª, capitão = MID, e o site deduzia isso da rota. Na 4ª o capitão é o do draft —
 * o de maior elo, de qualquer rota, e nunca alguém da organização. Se a virada não levar
 * a marca até o site, a página do time aponta como capitão o MID, que pode ser justamente
 * um organizador. E o arquivo das temporadas antigas, que não tem a marca, tem de
 * continuar mostrando o MID como sempre mostrou.
 */

const T0 = Date.parse("2026-11-08T20:00:00.000Z");

/** O dataset de verdade da 3ª: nenhum jogador tem `captain`. */
const terceira = tournamentDatasetSchema.parse(JSON.parse(readFileSync("leagueofbronze.json", "utf8")));

function draftDaQuarta() {
  const jogadores: JogadorDoDraft[] = [
    // CHAMA: o capitão é TOP Diamante; o MID dele é um jogador comum.
    { id: "cap-top", riotId: "Diamantino#BR1", pontos: 8, rota1: "TOPO", rota2: "SELVA", elo: "Diamante", timeId: null },
    { id: "mid-chama", riotId: "Meiao#BR1", pontos: 4, rota1: "MEIO", rota2: "TOPO", elo: "Ouro", timeId: null },
    { id: "sel-chama", riotId: "Mato#BR1", pontos: 3, rota1: "SELVA", rota2: "TOPO", elo: "Prata", timeId: null },
    // ÁUREA: o capitão é SUP; o MID é da organização — que nunca é capitão.
    { id: "cap-sup", riotId: "Escudo#BR1", pontos: 6, rota1: "SUPORTE", rota2: "ATIRADOR", elo: "Esmeralda", timeId: null },
    { id: "org-mid", riotId: "Organizador#BR1", pontos: 5, rota1: "MEIO", rota2: "SUPORTE", elo: "Platina", timeId: null },
    { id: "adc-aurea", riotId: "Flecha#BR1", pontos: 2, rota1: "ATIRADOR", rota2: "SUPORTE", elo: "Bronze", timeId: null },
  ];

  let draft = montarDraft({
    times: [
      { id: "time-1", nome: "CHAMA", cor: "#ef7d34", capitaoId: "cap-top" },
      { id: "time-2", nome: "ÁUREA", cor: "#e0b13c", capitaoId: "cap-sup" },
    ],
    jogadores,
    jogadoresPorTime: 3,
    orcamentoPorTime: 100,
    segundosPorEscolha: 60,
  });

  // Serpentina de 2 times e 2 rodadas: 1, 2, 2, 1.
  draft = iniciarDraft(draft, T0);
  draft = aplicarEscolha(draft, "time-1", "mid-chama", T0);
  draft = aplicarEscolha(draft, "time-2", "org-mid", T0);
  draft = aplicarEscolha(draft, "time-2", "adc-aurea", T0);
  draft = aplicarEscolha(draft, "time-1", "sel-chama", T0);
  return draft;
}

/**
 * O dataset ao vivo depois da virada, como a rota grava (times e jogadores do draft,
 * temporada sem séries) e com a 3ª no arquivo — e PASSADO PELO SCHEMA, que é o que toda
 * leitura do site faz. Sem o campo no schema, o Zod descartaria a marca aqui.
 */
function quartaNoAr(): TournamentDataset {
  const { teams, players } = datasetDoDraft(draftDaQuarta());
  return tournamentDatasetSchema.parse({
    tournament: { ...terceira.tournament, name: "4ª Edição", seasonId: "season-4", status: "active" },
    teams,
    players,
    seriesMatches: [],
    standingsSeed: [],
    archivedSeasons: [buildArchivedSeason(terceira, "2026-10-01T00:00:00.000Z")],
  });
}

/** A regra antiga, escrita à parte, para comparar com o que o roster devolve. */
function capitaesPelaRegraDoMid(dataset: TournamentDataset) {
  return dataset.teams.map((team) => {
    const roster = dataset.players
      .filter((p) => p.teamId === team.id)
      .sort((a, b) => resolveRole(a.role1).order - resolveRole(b.role1).order);
    const capitao = roster.find((p) => resolveRole(p.role1).short === "MID") ?? roster[0];
    return [team.id, capitao?.id ?? null];
  });
}

describe("a virada leva o capitão do draft para o dataset", () => {
  it("o capitão TOP Diamante sai com captain true; o MID do time, não", () => {
    const draft = draftDaQuarta();
    expect(problemasDaVirada(draft)).toEqual([]);

    const { players } = datasetDoDraft(draft);
    const porNick = new Map(players.map((p) => [p.nick, p]));

    expect(porNick.get("Diamantino#BR1")?.captain).toBe(true);
    expect(porNick.get("Escudo#BR1")?.captain).toBe(true);

    // Nos outros o campo nem existe — o JSON vai inteiro para todo visitante.
    for (const nick of ["Meiao#BR1", "Mato#BR1", "Organizador#BR1", "Flecha#BR1"]) {
      expect(Object.hasOwn(porNick.get(nick)!, "captain"), nick).toBe(false);
    }
  });

  it("a marca é a ÚNICA coisa a mais que atravessa a fronteira de privacidade", () => {
    // A virada é a fronteira entre as tabelas com contato e o dataset público. Campo
    // novo ali tem de ser decisão consciente: o capitão leva só `captain`, o resto nada.
    const { players } = datasetDoDraft(draftDaQuarta());
    const base = ["elo", "id", "nick", "role1", "role2", "slug", "teamId"];

    expect(Object.keys(players.find((p) => p.nick === "Diamantino#BR1")!).sort()).toEqual(
      ["captain", ...base].sort(),
    );
    expect(Object.keys(players.find((p) => p.nick === "Meiao#BR1")!).sort()).toEqual(base);
  });

  it("exatamente um capitão por time no resultado da virada", () => {
    const { teams, players } = datasetDoDraft(draftDaQuarta());
    for (const team of teams) {
      expect(players.filter((p) => p.teamId === team.id && p.captain === true)).toHaveLength(1);
    }
  });
});

describe("o site público da temporada nova", () => {
  it("a marca sobrevive à validação de leitura do dataset", () => {
    const capitaes = quartaNoAr()
      .players.filter((p) => p.captain === true)
      .map((p) => p.nick)
      .sort();
    expect(capitaes).toEqual(["Diamantino#BR1", "Escudo#BR1"]);
  });

  it("a página do time mostra o capitão do draft, e não o MID (nem o organizador)", () => {
    const times = new Map(buildDesignTeams(quartaNoAr()).map((t) => [t.name, t]));

    expect(times.get("CHAMA")?.captain?.nick).toBe("Diamantino#BR1");
    expect(times.get("ÁUREA")?.captain?.nick).toBe("Escudo#BR1");
  });

  it("um só capitão por time nos cards de jogador, e nenhum MID marcado", () => {
    const dataset = quartaNoAr();
    const jogadores = buildDesignPlayers(dataset);

    for (const team of dataset.teams) {
      const capitaes = jogadores.filter((p) => p.teamId === team.id && p.captain);
      expect(capitaes, team.name).toHaveLength(1);
    }
    expect(jogadores.find((p) => p.nick === "Meiao#BR1")?.captain).toBe(false);
    expect(jogadores.find((p) => p.nick === "Organizador#BR1")?.captain).toBe(false);
  });

  it("arquivar a 4ª guarda a marca: o arquivo dela continua com o capitão certo", () => {
    const arquivada = archivedSeasonSchema.parse(buildArchivedSeason(quartaNoAr(), "2026-12-01T00:00:00.000Z"));
    const times = new Map(buildDesignTeams(snapshotToDataset(arquivada.snapshot)).map((t) => [t.name, t]));

    expect(times.get("CHAMA")?.captain?.nick).toBe("Diamantino#BR1");
    expect(times.get("ÁUREA")?.captain?.nick).toBe("Escudo#BR1");
  });
});

describe("temporadas sem a marca continuam com a regra do MID", () => {
  it("o dataset da 3ª não tem o campo (premissa do teste)", () => {
    expect(terceira.players.some((p) => Object.hasOwn(p, "captain"))).toBe(false);
  });

  it("3ª ao vivo: cada jogador é capitão se, e só se, é MID", () => {
    for (const p of buildDesignPlayers(terceira)) {
      expect(p.captain, p.nick).toBe(p.roleMeta.short === "MID");
    }
  });

  it("3ª ao vivo: o capitão de cada time é o mesmo da regra antiga", () => {
    const agora = buildDesignTeams(terceira).map((t) => [t.id, t.captain?.id ?? null]);
    expect(agora).toEqual(capitaesPelaRegraDoMid(terceira));
  });

  it("3ª no arquivo, com a 4ª marcada no ar: o arquivo NÃO herda a regra da temporada ao vivo", () => {
    // A decisão "tem marca?" é tomada sobre o dataset exibido. Se fosse sobre o ao vivo,
    // o arquivo da 3ª passaria a ficar sem capitão nenhum depois da virada.
    const arquivo = snapshotToDataset(quartaNoAr().archivedSeasons[0]!.snapshot);

    expect(buildDesignTeams(arquivo).map((t) => [t.id, t.captain?.id ?? null])).toEqual(
      capitaesPelaRegraDoMid(arquivo),
    );
    for (const p of buildDesignPlayers(arquivo)) {
      expect(p.captain, p.nick).toBe(p.roleMeta.short === "MID");
    }
  });
});

describe("dataset marcado, mas mexido à mão no painel", () => {
  it("dois marcados no mesmo time: vale o primeiro, e o site mostra um só", () => {
    const dataset = quartaNoAr();
    // Um capitão trocado de time no painel leva a marca junto.
    const mexido: TournamentDataset = {
      ...dataset,
      players: dataset.players.map((p) => (p.nick === "Escudo#BR1" ? { ...p, teamId: "chama" } : p)),
    };

    const chama = buildDesignTeams(mexido).find((t) => t.name === "CHAMA")!;
    expect(chama.captain?.nick).toBe("Diamantino#BR1");
    expect(chama.roster.filter((p) => p.captain).map((p) => p.nick)).toEqual(["Diamantino#BR1"]);
  });

  it("time sem capitão marcado fica sem capitão, em vez de ganhar o MID ou o primeiro do elenco", () => {
    const dataset = quartaNoAr();
    const mexido: TournamentDataset = {
      ...dataset,
      players: dataset.players.map((p) => (p.nick === "Escudo#BR1" ? { ...p, captain: undefined } : p)),
    };

    const aurea = buildDesignTeams(mexido).find((t) => t.name === "ÁUREA")!;
    expect(aurea.captain).toBeNull();
    expect(aurea.roster.some((p) => p.captain)).toBe(false);
  });
});
