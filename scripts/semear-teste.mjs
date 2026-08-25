#!/usr/bin/env node
/**
 * Gera o campeonato FALSO do ambiente de teste.
 *
 * Uso:
 *   node scripts/semear-teste.mjs            # imprime o JSON
 *   node scripts/semear-teste.mjs --sql      # imprime o INSERT para o schema lob_teste
 *
 * Tudo aqui é inventado, e de propósito: nome de time, nick, elo, data. Quem abrir o site
 * de teste tem que perceber em três segundos que não é o campeonato de verdade — daí os
 * nomes serem piada explícita e a faixa amarela no topo do site.
 *
 * As 15 séries nascem SEM jogos e SEM W.O.: é o que as deixa sorteáveis. Uma série com jogo
 * lançado não aceita sorteio (a rota recusa), e foi justamente nisso que esbarrei ao testar
 * — o campeonato de verdade não tinha nenhuma série livre.
 *
 * O JSON é validado pelo schema Zod do projeto em tests/series/semente-de-teste.test.ts.
 */

const TIMES = [
  { id: "tropa-ping-alto", name: "Tropa do Ping Alto", slug: "tropa-do-ping-alto" },
  { id: "lanterna-de-prata", name: "Lanterna de Prata", slug: "lanterna-de-prata" },
  { id: "feed-sagrado", name: "Feed Sagrado", slug: "feed-sagrado" },
  { id: "retorno-ao-ferro", name: "Retorno ao Ferro", slug: "retorno-ao-ferro" },
  { id: "comite-do-yasuo", name: "Comitê do Yasuo", slug: "comite-do-yasuo" },
  { id: "mafia-do-minion", name: "Máfia do Minion", slug: "mafia-do-minion" },
];

const ROTAS = ["TOP", "JUNG", "MID", "ADC", "SUP"];
const ELOS = ["FERRO", "BRONZE", "PRATA", "OURO", "PLATINA"];

/** Cinco apelidos por time. Nada de nome real: é ambiente de teste. */
const NICKS = [
  ["TorreSolo", "MatoOMeuJungle", "MidOuAfk", "UltimoTiro", "SuporteDeLuxo"],
  ["PratinhaEterno", "GankQueNaoVem", "RoubaFarm", "ChutaTorre", "EscudoFurado"],
  ["AlimentaGeral", "CacaBaraoSozinho", "RoamInfinito", "CriticoNaMinion", "WardCega"],
  ["VoltaProFerro", "SmiteAtrasado", "RoubaAzul", "MissaNaBase", "CuraTardia"],
  ["YasuoDoMal", "ZeroPorCento", "MuroDeVento", "TresPorNove", "PingaNaLane"],
  ["MinionChefe", "CanhaoAndante", "OndaDeAtaque", "EmpurraSempre", "GuardaCosta"],
];

const times = TIMES;

const jogadores = TIMES.flatMap((time, t) =>
  NICKS[t].map((nick, i) => ({
    id: `${time.id}-p${i + 1}`,
    nick,
    slug: nick.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    teamId: time.id,
    role1: ROTAS[i],
    role2: ROTAS[(i + 2) % ROTAS.length],
    elo: ELOS[(t + i) % ELOS.length],
  })),
);

/*
 * Turno único: cada time joga contra cada um dos outros uma vez = 15 séries.
 *
 * As datas são só rótulo — o campeonato de verdade ainda não tem dia nem hora marcados.
 * Aqui elas existem para o calendário ter o que mostrar.
 */
const series = [];
let n = 0;
for (let a = 0; a < TIMES.length; a += 1) {
  for (let b = a + 1; b < TIMES.length; b += 1) {
    n += 1;
    const dia = String(((n - 1) % 28) + 1).padStart(2, "0");
    series.push({
      id: `teste-serie-${String(n).padStart(2, "0")}`,
      date: `2026-11-${dia}`,
      teamAId: TIMES[a].id,
      teamBId: TIMES[b].id,
      format: "BO3",
      stage: "REGULAR_SEASON",
      // Sem jogos e sem W.O.: é o que mantém as 15 sorteáveis.
      games: [],
    });
  }
}

const dataset = {
  tournament: {
    name: "4ª Edição (AMBIENTE DE TESTE)",
    lastUpdatedISO: "2026-08-25T12:00:00.000Z",
    seriesPointsRule: { win: 3, loss: 0 },
    format: "BO3",
    seasonId: "teste-4a-edicao",
    status: "active",
    startedAtISO: "2026-08-25T12:00:00.000Z",
  },
  teams: times,
  players: jogadores,
  seriesMatches: series,
  standingsSeed: [],
  archivedSeasons: [],
};

const json = JSON.stringify(dataset);

if (process.argv.includes("--sql")) {
  // Aspas simples dobradas: é assim que se escapa string literal em SQL.
  const escapado = json.replace(/'/g, "''");
  process.stdout.write(
    `insert into lob_teste.tournament_state (id, payload, updated_at)\n` +
      `values ('leagueofbronze', '${escapado}'::jsonb, now())\n` +
      `on conflict (id) do update set payload = excluded.payload, updated_at = now();\n`,
  );
} else {
  process.stdout.write(json);
}
