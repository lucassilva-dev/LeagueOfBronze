import { readFileSync } from "node:fs";
import { cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CALENDARIO_4A, problemasDaGrade, seriesDaFaseDePontos } from "@/lib/calendario-4a";
import { MESSAGES } from "@/lib/i18n/messages";
import { diaEMes, horaNoIdioma, periodoPorExtenso } from "@/lib/i18n/messages/paginas-home";
import { tournamentDatasetSchema, type SeriesMatch, type TournamentDataset } from "@/lib/schema";

/**
 * As páginas públicas da temporada na 4ª Edição COM O CALENDÁRIO DIVULGADO.
 *
 * O calendário oficial de 8 times ainda está "a divulgar" (2026-10-22) — esse estado tem o
 * seu próprio arquivo, tests/publico/calendario-a-divulgar.test.tsx. Aqui a grade oficial é
 * trocada pela de 6 times publicada em 20/10 (tests/_calendarios.ts: 20 a 29/11/2026;
 * pontos corridos MD3, semifinais 1º x 4º e 2º x 3º em MD3, final MD5 em 29/11 às 14:30),
 * que casa com os 6 times da 3ª usados de figurante. O que se testa — a home, a /tabela e o
 * /calendario completando com a grade o que ainda não virou série — não depende do número
 * de times; quando a grade de 8 sair, estes caminhos são os mesmos.
 *
 * Os textos da home, de /times, /jogadores e /tabela tinham a 3ª cravada — "3ª EDIÇÃO",
 * "25 de julho a 02 de agosto", "os 2 primeiros vão à final" — e o bloco "Próxima edição —
 * 4ª" aparecia DURANTE a 4ª. Aqui as páginas são renderizadas de verdade, com o banco, o
 * idioma e a fase do site trocados por dublês.
 */

vi.mock("@/lib/calendario-4a-grade", async () => ({
  CALENDARIO_OFICIAL_4A: (await import("@/tests/_calendarios")).CALENDARIO_6_TIMES_DE_20_10,
}));

const cenario = vi.hoisted(() => ({
  locale: "pt" as "pt" | "en",
  dataset: null as unknown,
  preTemporada: false,
  draft: { estado: null as unknown, revisao: 0 },
  draftFalha: false,
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

vi.mock("@/lib/draft/store", () => ({
  lerDraftCompleto: async () => {
    if (cenario.draftFalha) throw new Error("banco fora do ar");
    return cenario.draft;
  },
}));

vi.mock("@/lib/inscricoes/store", () => ({
  // Inscrições encerradas: é o estado da home quando o draft acontece.
  lerConfigOuNulo: async () => ({
    inscricoes_abertas: false,
    fechamento_inscricoes: "2026-11-10T23:59:00-03:00",
    taxa_centavos: 2000,
    prazo_pagamento_dias: 3,
  }),
}));

const { default: InicioPage } = await import("@/app/page");
const { default: TabelaPage } = await import("@/app/tabela/page");
const { default: CalendarioPage } = await import("@/app/calendario/page");
const { default: TimesPage } = await import("@/app/times/page");
const { default: JogadoresPage } = await import("@/app/jogadores/page");
const { HomePreTemporada } = await import("@/components/home-pre-temporada");

/**
 * Resolve os componentes `async` da árvore (as páginas e alguns blocos são Server
 * Components), que o renderToStaticMarkup não sabe esperar. Os síncronos — inclusive os
 * "use client" — ficam para o render normal.
 */
async function resolver(no: ReactNode): Promise<ReactNode> {
  if (Array.isArray(no)) return Promise.all(no.map(resolver));
  if (!isValidElement(no)) return no;
  const elemento = no as ReactElement<{ children?: ReactNode }>;
  const { type, props } = elemento;
  if (typeof type === "function" && type.constructor.name === "AsyncFunction") {
    return resolver(await (type as (p: unknown) => Promise<ReactNode>)(props));
  }
  if (props && props.children !== undefined) {
    const filhos = await resolver(props.children);
    return cloneElement(elemento, undefined, ...(Array.isArray(filhos) ? filhos : [filhos]));
  }
  return elemento;
}

async function html(pagina: ReactNode | Promise<ReactNode>): Promise<string> {
  return renderToStaticMarkup(<>{await resolver(await pagina)}</>);
}

/** O texto da página, sem tags e com os espaços normalizados. */
function texto(markup: string): string {
  return markup
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/\s+/g, " ");
}

/** O dataset real da 3ª Edição (o arquivo do repositório). */
function terceira(): TournamentDataset {
  return tournamentDatasetSchema.parse(JSON.parse(readFileSync("leagueofbronze.json", "utf8")));
}

/**
 * A 4ª depois de o painel criar as 15 séries a partir do calendário oficial: 6 times, 30
 * jogadores (os elencos da 3ª servem de figurantes), ainda sem semifinais nem final.
 */
function quarta(extras: SeriesMatch[] = []): TournamentDataset {
  const base = terceira();
  return tournamentDatasetSchema.parse({
    ...base,
    tournament: { ...base.tournament, name: "4ª Edição", seasonId: "season-4", status: "active" },
    seriesMatches: [...seriesDaFaseDePontos(base.teams.map((t) => t.id)), ...extras],
    archivedSeasons: [],
  });
}

function numero(markup: string, rotulo: string): string | undefined {
  return new RegExp(`>(\\d+)</div><div[^>]*>${rotulo}<`).exec(markup)?.[1];
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-15T12:00:00-03:00"));
  cenario.locale = "pt";
  cenario.preTemporada = false;
  cenario.draft = { estado: null, revisao: 0 };
  cenario.draftFalha = false;
  cenario.dataset = quarta();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("home da temporada, com a 4ª no ar", () => {
  it("o título e o texto de abertura falam da 4ª, com as datas dela", async () => {
    const t = texto(await html(InicioPage()));
    expect(t).toContain("4ª EDIÇÃO");
    expect(t).toContain("6 times forjados no draft, 30 feras do Ferro ao Mestre");
    expect(t).toContain("de 20 a 29 de novembro");
    expect(t).not.toMatch(/3ª|julho|agosto|02\/08/i);
  });

  it("sem a série da final, a pílula usa a final do calendário oficial: 29/11 às 14:30", async () => {
    const t = texto(await html(InicioPage()));
    expect(t).toContain("29 DE NOVEMBRO · 14:30");
    // A final da 4ª é entre os vencedores das semifinais, não 1º x 2º.
    expect(t).toContain("VENCEDOR DA SEMI 1");
    expect(t).toContain("VENCEDOR DA SEMI 2");
    expect(t).not.toContain("1º COLOCADO");
    expect(t).toContain("SEMIFINAIS · MD3");
  });

  it("com a série da final no dataset, a pílula usa a data e a hora DELA (em Brasília)", async () => {
    // Remarcada para as 15:00 e gravada em UTC (18:00Z): é a série que manda.
    cenario.dataset = quarta([
      { id: "4a-final", date: "2026-11-29T18:00:00.000Z", teamAId: "pantera-cor-de-goza", teamBId: terceira().teams[1]!.id, stage: "FINAL", format: "BO5", games: [] },
    ]);
    const t = texto(await html(InicioPage()));
    expect(t).toContain("29 DE NOVEMBRO · 15:00");
    expect(t).not.toContain("14:30");
  });

  it("conta 18 séries (15 + 2 semifinais + final) em 6 dias de jogo", async () => {
    const markup = await html(InicioPage());
    expect(numero(markup, "CONFRONTOS")).toBe("18");
    expect(numero(markup, "DIAS DE JOGO")).toBe("6");
  });

  it("NÃO mostra o bloco de próxima edição durante a temporada", async () => {
    const t = texto(await html(InicioPage()));
    expect(t).not.toContain("Em organização");
    expect(t).not.toContain("próxima edição");
    expect(t).not.toMatch(/começo de novembro/i);
  });

  it("em inglês, data e hora no formato de lá — e nada da 3ª", async () => {
    cenario.locale = "en";
    const t = texto(await html(InicioPage()));
    expect(t).toContain("LEAGUE OF BRONZE");
    // O nome vem do dataset ("4ª Edição") e sai no idioma da página.
    expect(t).toContain("4TH EDITION");
    expect(t).not.toContain("EDIÇÃO");
    expect(t).toContain("from November 20 to 29");
    expect(t).toMatch(/NOVEMBER 29 · 2:30\sPM/u);
    expect(t).not.toMatch(/3RD|July|August/i);
  });

  it("o calendário oficial da 4ª não vaza para outra edição", async () => {
    // Uma edição seguinte, com as séries em 2027: a final de 29/11/2026 não pode aparecer.
    const base = quarta();
    cenario.dataset = {
      ...base,
      tournament: { ...base.tournament, name: "5ª Edição" },
      seriesMatches: base.seriesMatches.map((s) => ({ ...s, date: s.date.replace("2026-11", "2027-03") })),
    };
    vi.setSystemTime(new Date("2027-03-01T12:00:00-03:00"));
    const markup = await html(InicioPage());
    const t = texto(markup);
    expect(t).toContain("5ª EDIÇÃO");
    expect(t).not.toMatch(/novembro/i);
    expect(t).not.toContain("SEMIFINAIS · MD3");
    expect(numero(markup, "CONFRONTOS")).toBe("15");
    expect(numero(markup, "DIAS DE JOGO")).toBe("5");
  });
});

describe("bloco de próxima edição", () => {
  it("com a 3ª encerrada, aparece e anuncia as datas do calendário oficial", async () => {
    const base = terceira();
    cenario.dataset = { ...base, tournament: { ...base.tournament, status: "finished" } };
    vi.setSystemTime(new Date("2026-10-20T12:00:00-03:00"));
    const t = texto(await html(InicioPage()));
    expect(t).toContain("Em organização");
    expect(t).toContain("League of Bronze — próxima edição");
    expect(t).toContain("tem data marcada: de 20 a 29 de novembro");
    expect(t).not.toMatch(/começo de novembro/i);
    // E a home da 3ª continua sendo a da 3ª: título, período e campeão dela.
    expect(t).toContain("3ª EDIÇÃO");
    expect(t).toContain("de 25 de julho a 2 de agosto");
    expect(t).toContain("CAMPEÃO · 3ª EDIÇÃO");
  });

  it("com a 4ª encerrada, fala da próxima sem data (o calendário oficial já passou)", async () => {
    const base = quarta();
    cenario.dataset = { ...base, tournament: { ...base.tournament, status: "finished" } };
    vi.setSystemTime(new Date("2026-12-05T12:00:00-03:00"));
    const t = texto(await html(InicioPage()));
    expect(t).toContain("Em organização");
    expect(t).toContain(MESSAGES.pt.conformidade.proximaEdicaoTextoSemData);
    expect(t).not.toContain("tem data marcada");
  });
});

describe("home da pré-temporada: botão do draft ao vivo", () => {
  beforeEach(() => {
    cenario.preTemporada = true;
  });

  it("aparece, levando a /draft, quando há um draft montado", async () => {
    cenario.draft = { estado: { versao: 1, fase: "preparando" }, revisao: 3 };
    const markup = await html(InicioPage());
    expect(markup).toMatch(/<a[^>]*href="\/draft"[^>]*>DRAFT AO VIVO →<\/a>/);
  });

  it("com o draft encerrado, vira \"VER O DRAFT\" e sai do destaque — não promete ao vivo o que acabou", async () => {
    cenario.draft = { estado: { versao: 1, fase: "encerrado" }, revisao: 9 };
    const markup = await html(InicioPage());
    expect(markup).toMatch(/<a[^>]*href="\/draft"[^>]*>VER O DRAFT →<\/a>/);
    expect(markup).not.toContain("DRAFT AO VIVO →");
    expect(markup).not.toMatch(/<a[^>]*class="lob-btn-gold"[^>]*href="\/draft"/);
  });

  it("com a grade divulgada e por vir: o período na pílula e no passo 5, e as fichas dos dias", async () => {
    const t = texto(await html(HomePreTemporada()));
    expect(t).toContain("DE 20 A 29 DE NOVEMBRO");
    expect(t).toContain("6 TIMES · 30 JOGADORES");
    expect(t).not.toContain("DATAS A DIVULGAR");
    expect(t).toContain("6 times de 5 jogadores. Pontos corridos em séries MD3, semifinais 1º x 4º e 2º x 3º, e final em MD5 — de 20 a 29 de novembro.");
    expect(t).toContain("semis + final");
    expect(t).toContain("VER O CALENDÁRIO");
  });

  it("passado o calendário oficial, o resumo de datas some da home", async () => {
    vi.setSystemTime(new Date("2026-12-10T12:00:00-03:00"));
    const t = texto(await html(HomePreTemporada()));
    expect(t).not.toContain("20 A 29 DE NOVEMBRO");
    expect(t).not.toContain("VER O CALENDÁRIO");
    // Nem o formato daquele calendário: a pílula "N TIMES · M JOGADORES" é dele.
    expect(t).not.toContain("6 TIMES · 30 JOGADORES");
  });

  it("não aparece sem draft montado", async () => {
    const markup = await html(InicioPage());
    expect(markup).not.toContain('href="/draft"');
    expect(markup).not.toContain("DRAFT AO VIVO →");
  });

  it("falha ao ler o draft não derruba a home: o botão some e a inscrição continua", async () => {
    cenario.draftFalha = true;
    const erro = vi.spyOn(console, "error").mockImplementation(() => {});
    const markup = await html(HomePreTemporada());
    expect(markup).not.toContain('href="/draft"');
    expect(markup).toContain('href="/inscricao"');
    expect(erro).toHaveBeenCalled();
    erro.mockRestore();
  });
});

describe("/tabela da 4ª", () => {
  it("pinta de dourado os 4 primeiros (os que vão às semifinais) e diz isso no card", async () => {
    const markup = await html(TabelaPage());
    expect(markup.match(/data-classificado="sim"/g)).toHaveLength(4);
    // Linha de corte depois do 4º.
    expect(markup.match(/border-top:1px dashed/g)).toHaveLength(1);
    const t = texto(markup);
    expect(t).toContain("Os 4 primeiros avançam às semifinais (1º x 4º e 2º x 3º, em MD3); a Grande Final é em MD5.");
    expect(t).not.toContain("2 primeiros");
  });

  it("a 1ª rodada é a da primeira série da temporada no ar: 20 de novembro", async () => {
    const t = texto(await html(TabelaPage()));
    expect(t).toContain("a partir da 1ª rodada, em 20 de novembro.");
    expect(t).not.toContain("julho");
  });

  it("em inglês também", async () => {
    cenario.locale = "en";
    const t = texto(await html(TabelaPage()));
    expect(t).toContain("The top 4 advance to the semifinals (1st v 4th and 2nd v 3rd, Bo3)");
    expect(t).toContain("from round 1, on November 20.");
  });
});

describe("/tabela da 3ª encerrada (o que está no ar até a organização iniciar a 4ª)", () => {
  it("diz que os 2 primeiros foram à final e pinta só os 2 — a 3ª não teve semifinal", async () => {
    const base = terceira();
    cenario.preTemporada = true;
    cenario.dataset = { ...base, tournament: { ...base.tournament, status: "finished" } };
    const markup = await html(TabelaPage());
    expect(markup.match(/data-classificado="sim"/g)).toHaveLength(2);
    const t = texto(markup);
    expect(t).toContain("Os 2 primeiros avançam para a Grande Final em MD5.");
    expect(t).not.toContain("semifinais");
  });
});

describe("/calendario", () => {
  it("com as 15 séries criadas e sem semifinais ainda, mostra as semifinais previstas e conta 18", async () => {
    const markup = await html(CalendarioPage());
    const t = texto(markup);
    expect(t).toContain("Semifinal: 1º x 4º colocados");
    expect(t).toContain("Semifinal: 2º x 3º colocados");
    expect(t).toContain("08:30");
    expect(t).toContain("18 SÉRIES");
    expect(t).toContain("29/11");
  });

  it("na pré-temporada com a 3ª encerrada, mostra a grade planejada da 4ª", async () => {
    const base = terceira();
    cenario.preTemporada = true;
    cenario.dataset = { ...base, tournament: { ...base.tournament, status: "finished" } };
    const t = texto(await html(CalendarioPage()));
    expect(t).toContain("Time 3 x Time 6");
    expect(t).not.toMatch(/julho|02\/08/i);
  });

  it("depois do calendário oficial, a grade planejada não volta numa pré-temporada seguinte", async () => {
    const base = terceira();
    vi.setSystemTime(new Date("2027-02-01T12:00:00-03:00"));
    cenario.preTemporada = true;
    cenario.dataset = { ...base, tournament: { ...base.tournament, status: "finished" } };
    const t = texto(await html(CalendarioPage()));
    expect(t).not.toContain("Time 3 x Time 6");
  });
});

describe("/times e /jogadores", () => {
  it("em inglês, o nome da edição sai em inglês", async () => {
    cenario.locale = "en";
    for (const pagina of [TimesPage, JogadoresPage]) {
      const t = texto(await html(pagina()));
      expect(t).toContain("League of Bronze — 4th Edition");
      expect(t).not.toContain("Edição");
    }
  });

  it("o sobretítulo é o nome da temporada no ar, não a 3ª cravada", async () => {
    for (const pagina of [TimesPage, JogadoresPage]) {
      const t = texto(await html(pagina()));
      expect(t).toContain("League of Bronze — 4ª Edição");
      expect(t).not.toMatch(/3ª|02 de agosto/);
    }
  });
});

describe("textos que não podem voltar a cravar a 3ª", () => {
  const blocos = (locale: "pt" | "en") => {
    const m = MESSAGES[locale];
    // O texto do desempate fica de fora: depende de uma decisão pendente da organização.
    const competicao = Object.fromEntries(
      Object.entries(m.paginasCompeticao).filter(([chave]) => chave !== "tabelaInfoDesempateTexto"),
    );
    return { ...m.paginasHome, ...competicao, ...m.conformidade };
  };

  it.each(["pt", "en"] as const)("%s: nada de julho/agosto, 3ª/3rd edition ou 1º x 2º na home, na tabela e no bloco da próxima edição", (locale) => {
    for (const [chave, valor] of Object.entries(blocos(locale))) {
      // formatoVariaExemplos conta a história das edições de propósito ("a 3ª foi…").
      if (chave === "formatoVariaExemplos") continue;
      expect(String(valor), chave).not.toMatch(/julho|agosto|July|August|3ª|3rd edition|02\/08|começo de novembro|early November|top 2\b|2 primeiros/i);
    }
  });

  it("regra 9: só a organização remarca, e só para a reserva do calendário", () => {
    expect(MESSAGES.pt.paginasRegras.regra9).toContain(
      "Só a organização pode realocar uma série, e apenas para o horário de reserva do calendário.",
    );
    expect(MESSAGES.en.paginasRegras.regra9).toContain("Only the organisers may move a series, and only to the schedule's reserve slot.");
    // O resto da regra continua lá.
    expect(MESSAGES.pt.paginasRegras.regra9).toMatch(/^Não será aceito trocar os confrontos/);
  });

  it("a reserva que a regra 9 cita: a conferência da grade não aceita calendário sem ela", () => {
    expect(CALENDARIO_4A.filter((s) => s.tipo === "reserva").map((s) => s.quando)).toEqual(["2026-11-28T19:00:00-03:00"]);
    const semReserva = { divulgado: true, times: 6, slots: CALENDARIO_4A.filter((s) => s.tipo !== "reserva") } as const;
    expect(problemasDaGrade(semReserva).join(" ")).toMatch(/regra 9/);
  });
});

describe("datas por extenso", () => {
  const pt = MESSAGES.pt.paginasHome;
  const en = MESSAGES.en.paginasHome;

  it("período no mesmo mês, em meses diferentes e num dia só", () => {
    expect(periodoPorExtenso(pt, "2026-11-20", "2026-11-29", "pt-BR")).toBe("de 20 a 29 de novembro");
    expect(periodoPorExtenso(pt, "2026-07-25", "2026-08-02", "pt-BR")).toBe("de 25 de julho a 2 de agosto");
    expect(periodoPorExtenso(pt, "2026-11-29", "2026-11-29", "pt-BR")).toBe("em 29 de novembro");
    expect(periodoPorExtenso(en, "2026-11-20", "2026-11-29", "en-US")).toBe("from November 20 to 29");
    expect(periodoPorExtenso(en, "2026-07-25", "2026-08-02", "en-US")).toBe("from July 25 to August 2");
  });

  it("dia e hora no fuso de Brasília, de onde quer que o servidor rode", () => {
    expect(diaEMes("2026-11-29", "pt-BR")).toBe("29 de novembro");
    expect(horaNoIdioma("2026-11-29", "14:30", "pt-BR")).toBe("14:30");
    expect(horaNoIdioma("2026-11-29", "14:30", "en-US")).toMatch(/^2:30\sPM$/u);
  });
});
