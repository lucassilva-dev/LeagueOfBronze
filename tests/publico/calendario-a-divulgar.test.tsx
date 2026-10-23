import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MESSAGES } from "@/lib/i18n/messages";
import { tournamentDatasetSchema, type TournamentDataset } from "@/lib/schema";

import { html, texto } from "./_ajuda";

/**
 * O SITE COM AS DATAS A DIVULGAR — o estado da 4ª desde 2026-10-22: 8 times (40 jogadores)
 * e nenhuma grade de jogos ainda.
 *
 * A grade é fixada aqui em `{ divulgado: false, times: 8 }` (e não lida do arquivo
 * oficial), para este caminho continuar testado depois que as datas forem preenchidas. O
 * estado REAL do arquivo oficial é conferido em tests/calendario-4a.test.tsx.
 *
 * O que não pode aparecer em lugar nenhum: a grade de 6 times (Time 6, 15/18 séries, 30
 * vagas), as datas 20 a 29/11 ou qualquer outro dia de jogo.
 */

vi.mock("@/lib/calendario-4a-grade", () => ({ CALENDARIO_OFICIAL_4A: { divulgado: false, times: 8 } }));

const cenario = vi.hoisted(() => ({
  locale: "pt" as "pt" | "en",
  dataset: null as unknown,
  preTemporada: true,
  bancoFora: false,
}));

vi.mock("@/lib/i18n/server", async () => {
  const { MESSAGES: mensagens } = await import("@/lib/i18n/messages");
  return {
    getLocale: async () => cenario.locale,
    getMessages: async () => mensagens[cenario.locale],
  };
});

vi.mock("@/lib/server-data", async () => {
  const { createIndexes } = await import("@/lib/tournament");
  return {
    getServerDataset: async () => {
      if (cenario.bancoFora) throw new Error("TypeError: fetch failed (tournament_state)");
      const dataset = cenario.dataset as TournamentDataset;
      return { dataset, indexes: createIndexes(dataset) };
    },
    getServerArchivedSeasons: async () => [],
  };
});

vi.mock("@/lib/fase-do-site", async (original) => ({
  ...(await original<typeof import("@/lib/fase-do-site")>()),
  emPreTemporada: () => cenario.preTemporada,
}));

vi.mock("@/lib/data-store", async (original) => ({
  ...(await original<typeof import("@/lib/data-store")>()),
  isSupabaseConfigured: () => true,
}));

vi.mock("@/lib/draft/store", () => ({ lerDraftCompleto: async () => ({ estado: null, revisao: 0 }) }));

vi.mock("@/lib/inscricoes/store", () => ({
  lerConfigOuNulo: async () => ({
    inscricoes_abertas: true,
    abertura_inscricoes: "2026-10-05T00:00:00-03:00",
    fechamento_inscricoes: null,
    taxa_centavos: 2000,
    prazo_pagamento_dias: 3,
    pct_campeao: 70,
    max_times: 8,
  }),
}));

const { default: InicioPage } = await import("@/app/page");
const { default: CalendarioPage } = await import("@/app/calendario/page");
const { default: RegrasPage } = await import("@/app/regras/page");
const { default: TabelaPage } = await import("@/app/tabela/page");

/** O dataset real da 3ª Edição (o arquivo do repositório). */
function terceira(): TournamentDataset {
  return tournamentDatasetSchema.parse(JSON.parse(readFileSync("leagueofbronze.json", "utf8")));
}

/** A 3ª no ar, encerrada: o que o site tem na pré-temporada até alguém iniciar a 4ª. */
function terceiraEncerrada(): TournamentDataset {
  const base = terceira();
  return { ...base, tournament: { ...base.tournament, status: "finished" } };
}

/** Nada da grade velha de 6 times, nem dia de jogo nenhum. */
const GRADE_VELHA = /Time 6\b|Team 6\b|\b(15|18) (SÉRIES|séries|series)\b|30 vagas|30 places|20 a 29|20 A 29|20 to 29|29\/11|28\/11|20\/11|29 de novembro|29 DE NOVEMBRO|November (20|29)/;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-23T12:00:00-03:00"));
  cenario.locale = "pt";
  cenario.preTemporada = true;
  cenario.bancoFora = false;
  cenario.dataset = terceiraEncerrada();
});
afterEach(() => vi.useRealTimers());

describe("home da pré-temporada, com as datas a divulgar", () => {
  it("a pílula diz «datas a divulgar» e o formato (8 times · 40 jogadores)", async () => {
    const t = texto(await html(InicioPage()));
    expect(t).toContain("DATAS A DIVULGAR");
    expect(t).toContain("8 TIMES · 40 JOGADORES");
    expect(t).not.toMatch(GRADE_VELHA);
  });

  it("o bloco do calendário mostra o formato e o aviso, sem fichas de dia nem link para um calendário vazio", async () => {
    const markup = await html(InicioPage());
    const t = texto(markup);
    expect(markup).toContain('data-calendario="a-divulgar"');
    expect(t).toContain("Datas e horários dos jogos a divulgar");
    expect(t).toContain("Todos contra todos, uma vez: 28 séries em MD3.");
    expect(t).not.toMatch(/\d+ jogos\b|semis \+ final/);
    expect(t).not.toContain("VER O CALENDÁRIO");
  });

  it("o passo 5 diz 8 times e que as datas ainda vão sair", async () => {
    const t = texto(await html(InicioPage()));
    expect(t).toContain(
      "8 times de 5 jogadores. Pontos corridos em séries MD3, semifinais 1º x 4º e 2º x 3º, e final em MD5. As datas saem assim que a organização fechar o calendário",
    );
  });

  it("em inglês", async () => {
    cenario.locale = "en";
    const t = texto(await html(InicioPage()));
    expect(t).toContain("DATES TO BE ANNOUNCED");
    expect(t).toContain("8 TEAMS · 40 PLAYERS");
    expect(t).toContain("8 teams of 5 players. Round robin in best-of-3 series");
    expect(t).toContain("Match dates and times to be announced");
    expect(t).not.toMatch(GRADE_VELHA);
  });
});

describe("/calendario com as datas a divulgar", () => {
  it("na pré-temporada: o formato e o aviso, sem grade", async () => {
    const markup = await html(CalendarioPage());
    const t = texto(markup);
    expect(markup).toContain('data-calendario="a-divulgar"');
    expect(t).toContain(MESSAGES.pt.calendario4a.intro);
    expect(t).toContain("8 times de 5 jogadores (40 vagas)");
    expect(t).not.toMatch(GRADE_VELHA);
    expect(t).not.toContain("FIM DE SEMANA");
  });

  it("com o banco fora, a pré-temporada mostra o mesmo bloco em vez de cair", async () => {
    cenario.bancoFora = true;
    const markup = await html(CalendarioPage());
    expect(markup).toContain('data-calendario="a-divulgar"');
  });

  it("com o banco fora e a temporada no ar, o erro segue para a tela de erro", async () => {
    cenario.bancoFora = true;
    cenario.preTemporada = false;
    await expect(CalendarioPage()).rejects.toThrow(/fetch failed/);
  });
});

describe("/regras com as datas a divulgar", () => {
  it("período a divulgar, 8 times, 40 vagas, 8 capitães, serpentina até 8 — e a seção do calendário sem grade", async () => {
    const markup = await html(RegrasPage());
    const t = texto(markup);
    expect(t).toContain("Datas a divulgar: o calendário dos jogos sai no fim desta página");
    expect(t).toContain("esta edição tem 8 times de 5 jogadores (40 vagas)");
    expect(t).toContain("O número de capitães é igual ao número de times: 8 nesta edição.");
    expect(t).toContain("1-2-3-4-5-6-7-8-8-7-6-5-4-3-2-1");
    expect(t).toContain(MESSAGES.pt.calendario4a.intro);
    expect(markup).toContain('data-calendario="a-divulgar"');
    expect(t).not.toMatch(GRADE_VELHA);
    expect(t).not.toMatch(/\b6 times\b|1-2-3-4-5-6-6/);
  });

  it("em inglês", async () => {
    cenario.locale = "en";
    const t = texto(await html(RegrasPage()));
    expect(t).toContain("Dates to be announced");
    expect(t).toContain("8 teams of 5 players (40 places)");
    expect(t).toContain("8 in this edition");
    expect(t).not.toMatch(GRADE_VELHA);
  });
});

describe("a temporada no ar sem a grade divulgada (séries criadas à mão no painel)", () => {
  function quartaAMao(): TournamentDataset {
    const base = terceira();
    const [a, b] = base.teams;
    return tournamentDatasetSchema.parse({
      ...base,
      tournament: { ...base.tournament, name: "4ª Edição", seasonId: "season-4", status: "active" },
      seriesMatches: [
        { id: "s1", date: "2026-12-04T20:00:00-03:00", teamAId: a!.id, teamBId: b!.id, stage: "REGULAR_SEASON", format: "BO3", games: [] },
      ],
      archivedSeasons: [],
    });
  }

  it("a home do campeonato não inventa semifinais nem final com data", async () => {
    cenario.preTemporada = false;
    cenario.dataset = quartaAMao();
    const t = texto(await html(InicioPage()));
    expect(t).toContain("4ª EDIÇÃO");
    expect(t).not.toMatch(GRADE_VELHA);
    expect(t).not.toContain("SEMIFINAIS · MD3");
  });

  it("a /tabela mantém o formato vigente: os 4 primeiros vão às semifinais", async () => {
    cenario.preTemporada = false;
    cenario.dataset = quartaAMao();
    const t = texto(await html(TabelaPage()));
    expect(t).toContain("Os 4 primeiros avançam às semifinais");
  });

  it("o bloco «próxima edição» (3ª encerrada, fora da pré-temporada) fala sem data", async () => {
    cenario.preTemporada = false;
    const t = texto(await html(InicioPage()));
    expect(t).toContain(MESSAGES.pt.conformidade.proximaEdicaoTextoSemData);
    expect(t).not.toContain("tem data marcada");
  });
});
