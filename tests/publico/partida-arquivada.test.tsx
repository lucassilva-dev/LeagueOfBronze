import { beforeEach, describe, expect, it, vi } from "vitest";

import { tournamentDatasetSchema, type TournamentDataset } from "@/lib/schema";
import { buildArchivedSeason } from "@/lib/tournament";

import { ID_DA_TERCEIRA, TIME_A, TIME_B, html, temporadaJogada, texto } from "./_ajuda";

/**
 * A PARTIDA DO ARQUIVO no molde da partida do campeonato no ar (cartaz, resumo, jogos e arena).
 *
 * Três diferenças, e cada uma tem um motivo para não voltar:
 *  - os links levam às páginas DA TEMPORADA ARQUIVADA (o time e o jogador com os números
 *    daquela edição), nunca às do site ao vivo;
 *  - a arena só MOSTRA o que foi sorteado: sem botão, sem painel, sem perguntar a sessão — a rota
 *    de sorteio trabalha no campeonato no ar, e um botão aqui sortearia na série de mesmo id da
 *    temporada atual;
 *  - nada de "em breve"/"em andamento": no arquivo a série já acabou.
 */

const cenario = vi.hoisted(() => ({ dataset: null as unknown }));

vi.mock("@/lib/i18n/server", async () => {
  const { MESSAGES } = await import("@/lib/i18n/messages");
  return { getLocale: async () => "pt", getMessages: async () => MESSAGES.pt };
});

vi.mock("@/lib/server-data", async () => {
  const t = await import("@/lib/tournament");
  const ds = () => cenario.dataset as TournamentDataset;
  return {
    getServerDataset: async () => ({ dataset: ds(), indexes: t.createIndexes(ds()) }),
    getServerArchivedSeason: async (id: string) => {
      const archived = ds().archivedSeasons.find((s) => s.seasonId === id);
      if (!archived) return null;
      const dataset = t.snapshotToDataset(archived.snapshot);
      return { archived, dataset, indexes: t.createIndexes(dataset), overview: t.getDatasetOverview(dataset) };
    },
  };
});

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ refresh() {} }),
  redirect: (u: string) => {
    throw new Error(`REDIRECT ${u}`);
  },
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
}));

const SerieArquivada = (await import("@/app/temporadas/[seasonId]/partidas/[seriesId]/page")).default;
const FichaArquivada = (await import("@/app/temporadas/[seasonId]/jogadores/[playerSlug]/page")).default;

const serie = (seriesId: string) => html(SerieArquivada({ params: Promise.resolve({ seasonId: ID_DA_TERCEIRA, seriesId }) }));

/** Pares (letra, nome) das vagas de carta da arena: `<span>E</span></div><p>NOME</p>`. */
function letrasDasVagas(markup: string): Record<string, string> {
  return Object.fromEntries([...markup.matchAll(/>([A-F])<\/span><\/div><p[^>]*>([^<]+)<\/p>/g)].map((m) => [m[2]!, m[1]!]));
}

/** A 3ª Edição arquivada: a série jogada (2 x 0), uma com sorteios registrados, um W.O. e uma inacabada. */
function arquivoComSorteios(): TournamentDataset {
  const base = temporadaJogada({ nome: "3ª Edição", seasonId: ID_DA_TERCEIRA, status: "finished" });
  const jogada = base.seriesMatches[0]!;
  const terceira = tournamentDatasetSchema.parse({
    ...base,
    seriesMatches: [
      jogada,
      {
        ...jogada,
        id: "serie-sorteada",
        blueSideTeamId: TIME_B.id,
        cardsUsed: [{ teamId: TIME_A.id, cardId: "ABCDRAFT" }],
        sorteios: [
          { tipo: "lados", semente: "1".repeat(32), emISO: "2026-07-20T22:00:00.000Z", autor: "lucas", resultado: TIME_B.id },
          {
            tipo: "carta",
            semente: "2".repeat(32),
            emISO: "2026-07-20T22:01:00.000Z",
            autor: "lucas",
            teamId: TIME_A.id,
            resultado: "ABCDRAFT",
            detalhe: { letras: ["L", "S"], campeoes: 21 },
          },
        ],
      },
      { id: "serie-wo", date: "2026-07-27", teamAId: TIME_A.id, teamBId: TIME_B.id, games: [], walkoverWinnerTeamId: TIME_B.id, walkoverReason: "Não compareceu." },
      { ...jogada, id: "serie-inacabada", games: [jogada.games[0]!] },
      // Uma partida da época da 3ª (baralho de seis cartas, com a Yuumi), lançada à mão.
      { ...jogada, id: "serie-de-julho", date: "2026-07-25T20:00:00-03:00", cardsUsed: [{ teamId: TIME_B.id, cardId: "INVERSAO_ROTAS" }] },
    ],
    // Nick com "#" no slug, como há no arquivo da 2ª ("Zabulon#5020").
    players: base.players.map((p) => (p.slug === "brasa" ? { ...p, slug: "brasa#7" } : p)),
  });
  const arquivada = buildArchivedSeason(terceira, "2026-10-05T12:00:00.000Z");
  return tournamentDatasetSchema.parse({
    tournament: { ...terceira.tournament, name: "4ª Edição", seasonId: "season-4", status: "active" },
    teams: [],
    players: [],
    seriesMatches: [],
    standingsSeed: [],
    archivedSeasons: [arquivada],
  });
}

beforeEach(() => {
  cenario.dataset = arquivoComSorteios();
});

describe("partida arquivada no molde novo", () => {
  it("cartaz com o placar, a volta para a edição e o selo de somente leitura", async () => {
    const t = texto(await serie("serie-1"));
    expect(t).toContain("Falcões de Ferro 2–0 Lobos do Sul");
    expect(t).toContain("Voltar para 3ª Edição");
    expect(t).toContain("Partida arquivada · somente leitura");
    expect(t).toContain("Série finalizada");
    expect(t).not.toMatch(/Em breve|em andamento/i);
  });

  it("os links levam ao ARQUIVO: time e jogador daquela edição, nunca os do site ao vivo", async () => {
    const markup = await serie("serie-1");
    expect(markup).toContain(`href="/temporadas/${ID_DA_TERCEIRA}/times/${TIME_A.slug}"`);
    expect(markup).toContain(`href="/temporadas/${ID_DA_TERCEIRA}/jogadores/faisca"`);
    expect(markup).toContain(`href="/temporadas/${ID_DA_TERCEIRA}"`);
    expect(markup).not.toMatch(/href="\/(times|jogadores)\//);
    expect(markup).not.toContain('href="/partidas"');
  });

  it("sem sorteio registrado, sem arena (só '?' e 'a sortear' não diz nada no arquivo)", async () => {
    const t = texto(await serie("serie-1"));
    expect(t).not.toContain("Arena do sorteio");
    expect(t).not.toMatch(/a sortear/i);
  });

  it("com lado e carta registrados: a arena só MOSTRA — resultado e semente, sem botão nem painel", async () => {
    const markup = await serie("serie-sorteada");
    const t = texto(markup);
    expect(t).toContain("Arena do sorteio");
    expect(t).toContain("ABCDRAFT");
    expect(t).toContain("L · S");
    expect(t).toContain(`semente: ${"1".repeat(32)}`);
    expect(t).toContain(`semente: ${"2".repeat(32)}`);
    expect(markup).not.toMatch(/<button/);
    expect(t).not.toMatch(/Sortear|Ensaio|Modo transmissão|a sortear/i);
    // O cartaz marca o lado do jogo 1.
    expect(t).toContain("Lado azul · J1");
  });

  it("W.O. sem jogos: 'encerrada por W.O.' com o motivo, e nada de cabo de guerra de abates zerado", async () => {
    const t = texto(await serie("serie-wo"));
    expect(t).toContain("Série encerrada por W.O.");
    expect(t).toContain("Não compareceu.");
    expect(t).not.toContain("Abates por time");
  });

  it("série que a temporada não terminou: 'não concluída', nunca 'em andamento'", async () => {
    const t = texto(await serie("serie-inacabada"));
    expect(t).toContain("Série não concluída");
    expect(t).not.toMatch(/em andamento|Em breve/i);
  });

  it("HTML válido: nada de bloco dentro de <p> (o navegador fecha o <p> e a hidratação quebra)", async () => {
    // O escudo era um <div> dentro do <p> do cabeçalho de cada jogo: a página ao vivo quebraria
    // no 1º jogo lançado, e a do arquivo já quebrava em toda série com jogos.
    const markup = await serie("serie-1");
    const blocosEmP = [...markup.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/g)]
      .filter((m) => /<(div|section|article|nav|ul|ol|table|h[1-6])\b/.test(m[1]!))
      .map((m) => m[0].slice(0, 140));
    expect(blocosEmP).toEqual([]);
  });

  it("a letra da carta é a do baralho DAQUELA edição (na 3ª, Inversão de Rotas era E; hoje é D)", async () => {
    expect(letrasDasVagas(await serie("serie-de-julho"))).toEqual({ "INVERSÃO DE ROTAS": "E" });
  });

  it("no arquivo a arena não promete sorteio do servidor (parte foi lançada à mão, antes do sorteio no site)", async () => {
    const t = texto(await serie("serie-de-julho"));
    expect(t).toContain("Lados do jogo 1 e cartinhas registrados nesta série.");
    expect(t).not.toContain("Quem sorteia é o servidor");
  });

  it("nick com '#' no slug: o link vai codificado e a ficha do arquivo abre (não cai na âncora nem no 404)", async () => {
    expect(await serie("serie-1")).toContain(`href="/temporadas/${ID_DA_TERCEIRA}/jogadores/brasa%237"`);
    // O Next entrega o segmento com o "#" ainda codificado.
    const ficha = texto(await html(FichaArquivada({ params: Promise.resolve({ seasonId: ID_DA_TERCEIRA, playerSlug: "brasa%237" }) })));
    expect(ficha).toContain("Brasa");
  });

  it("série que não existe no arquivo: 404", async () => {
    await expect(serie("nao-existe")).rejects.toThrow("NOT_FOUND");
  });
});
