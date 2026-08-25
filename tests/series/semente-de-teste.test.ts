import { execFileSync } from "node:child_process";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { tournamentDatasetSchema } from "@/lib/schema";

/**
 * O campeonato falso do ambiente de teste.
 *
 * Ele é gerado por `scripts/semear-teste.mjs` e vai para o banco por um INSERT — ou seja,
 * entra no sistema SEM passar pelas rotas que validam. Se o JSON estiver malformado, o
 * ambiente de teste sobe quebrado e ninguém descobre até alguém tentar usar.
 *
 * Este teste roda o gerador de verdade e passa o resultado pelo MESMO schema Zod que
 * produção usa. É a única coisa entre um seed errado e um site de teste inútil.
 */

const gerador = path.join(process.cwd(), "scripts", "semear-teste.mjs");

const dataset = JSON.parse(
  execFileSync(process.execPath, [gerador], { encoding: "utf8", maxBuffer: 8 * 1024 * 1024 }),
) as unknown;

describe("a semente é um dataset válido", () => {
  it("passa no mesmo schema que produção usa", () => {
    const r = tournamentDatasetSchema.safeParse(dataset);
    expect(r.success ? null : JSON.stringify(r.error.issues.slice(0, 4), null, 2)).toBeNull();
  });
});

describe("a semente serve para o que foi feita", () => {
  const d = tournamentDatasetSchema.parse(dataset);

  it("tem 6 times e 30 jogadores, 5 por time", () => {
    expect(d.teams).toHaveLength(6);
    expect(d.players).toHaveLength(30);
    for (const time of d.teams) {
      expect(d.players.filter((p) => p.teamId === time.id), time.name).toHaveLength(5);
    }
  });

  it("todas as 15 séries são SORTEÁVEIS", () => {
    /*
     * O ponto do ambiente de teste é experimentar a roleta. Uma série com jogo lançado ou
     * decidida por W.O. é recusada pela rota de sorteio — e foi exatamente nisso que esbarrei
     * ao testar contra o campeonato de verdade: nenhuma série livre, e a roleta só sabia
     * dizer "esta série foi decidida por W.O.".
     */
    expect(d.seriesMatches).toHaveLength(15);
    for (const s of d.seriesMatches) {
      expect(s.games, s.id).toHaveLength(0);
      expect(s.walkoverWinnerTeamId, s.id).toBeUndefined();
      expect(s.blueSideTeamId, s.id).toBeUndefined();
    }
  });

  it("é turno único: cada par de times se enfrenta uma vez só", () => {
    const pares = d.seriesMatches.map((s) => [s.teamAId, s.teamBId].sort().join("|"));
    expect(new Set(pares).size).toBe(pares.length);
  });

  it("diz na cara que é teste", () => {
    // O nome aparece no cabeçalho e no rodapé de todas as páginas. Junto com a faixa
    // amarela, é o que impede alguém de confundir com o campeonato de verdade.
    expect(d.tournament.name).toContain("TESTE");
  });

  it("nenhum time ou jogador repete id", () => {
    expect(new Set(d.teams.map((t) => t.id)).size).toBe(d.teams.length);
    expect(new Set(d.players.map((p) => p.id)).size).toBe(d.players.length);
  });
});
