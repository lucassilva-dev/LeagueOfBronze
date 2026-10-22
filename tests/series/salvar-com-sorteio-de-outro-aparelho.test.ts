import { beforeEach, describe, expect, it, vi } from "vitest";

import type { TournamentDataset } from "@/lib/schema";

/**
 * DIA DE JOGO: SORTEIO FEITO EM OUTRO APARELHO × RASCUNHO ABERTO NO PAINEL.
 *
 * O painel está aberto com o K/D/A da 4a-jogo-04 digitado no rascunho, e o PC da
 * transmissão sorteia lado e carta da 4a-jogo-05 pela rota real. A linha avança e o
 * Salvar do painel cai em 409 — isso continua (é a trava). O que mudou é o "Salvar por
 * cima": antes ele gravava a série 5 SEM o lado e a carta anunciados na live (master) ou
 * dava 403 por `series:cards`/`series:sides` a quem só lança resultado, sobrando só
 * "trazer a versão nova", que joga fora as linhas digitadas.
 *
 * E o "Salvar por cima" agora RELÊ e REMESCLA com a gravação condicionada: um sorteio que
 * cai entre a leitura do PUT e a gravação não some mais do histórico append-only.
 *
 * Rotas e `lib/data-store.ts` de verdade, sobre a linha `tournament_state` em memória; só
 * o `requireAdmin` é trocado.
 */
vi.mock("@supabase/supabase-js", async () => {
  const m = await import("./_tournament-state-em-memoria");
  return { createClient: () => m.clienteFalso };
});

vi.mock("@/lib/security/route-guard", async () => {
  const { sessao } = await import("./_tournament-state-em-memoria");
  const { NextResponse } = await import("next/server");
  return {
    mesmaOrigem: () => true,
    requireAdmin: async (_r: unknown, scope?: string) => {
      const identity = sessao.identity;
      if (scope && !identity.isMaster && !identity.scopes.includes(scope)) {
        return { ok: false, response: NextResponse.json({ error: "sem escopo" }, { status: 403 }) };
      }
      return { ok: true, identity };
    },
  };
});

import {
  banco,
  datasetDoDia,
  gravado,
  gravarPorFora,
  jogoAB,
  ligarSupabaseFalso,
  MASTER,
  req,
  sessao,
  zerarBanco,
} from "./_tournament-state-em-memoria";

ligarSupabaseFalso();

const { GET, PUT } = await import("@/app/api/admin/dataset/route");
const { POST: SORTEAR } = await import("@/app/api/admin/series/sorteio/route");

const SO_RESULTADOS = { ...MASTER, id: "u-nakay", username: "nakay", isMaster: false, scopes: ["results:write"] };

beforeEach(() => {
  ligarSupabaseFalso();
  zerarBanco(datasetDoDia(), 7);
  sessao.identity = { ...MASTER };
});

type Aberto = { dataset: TournamentDataset; versao: number };

/** O painel abre, a pessoa digita os dois jogos da série 4 e a transmissão sorteia a 5. */
async function rascunhoComSorteioEmOutroAparelho() {
  const aberto = (await (await GET(req({}, "GET"))).json()) as Aberto;
  expect(aberto.versao).toBe(7);
  const rascunho = aberto.dataset;
  rascunho.seriesMatches.find((s) => s.id === "4a-jogo-04")!.games = [jogoAB("a"), jogoAB("a")];

  // A cerimônia da série 5 no PC da transmissão, pela rota real (master lá).
  const quemEstaNoPainel = sessao.identity;
  sessao.identity = { ...MASTER };
  expect((await SORTEAR(req({ seriesId: "4a-jogo-05", tipo: "lados" }, "POST"))).status).toBe(200);
  expect((await SORTEAR(req({ seriesId: "4a-jogo-05", tipo: "carta", teamId: "c" }, "POST"))).status).toBe(200);
  sessao.identity = quemEstaNoPainel;

  const sorteada = gravado().seriesMatches.find((s) => s.id === "4a-jogo-05")!;
  expect(sorteada.blueSideTeamId).toBeDefined();
  expect(sorteada.cardsUsed).toHaveLength(1);
  expect(banco.linha!.version).toBe(9);

  return { rascunho, sorteada };
}

describe("«Salvar por cima» depois de um sorteio feito em outro aparelho", () => {
  it("quem só lança resultado: 409 no Salvar normal, e o «por cima» grava o K/D/A sem desfazer o sorteio", async () => {
    sessao.identity = { ...SO_RESULTADOS };
    const { rascunho, sorteada } = await rascunhoComSorteioEmOutroAparelho();

    const normal = await PUT(req({ dataset: rascunho, versao: 7 }));
    expect(normal.status).toBe(409);

    // Antes: 403 com missing [series:cards, series:sides] — campos que ela nunca tocou.
    const porCima = await PUT(req({ dataset: rascunho, versao: 7, force: true }));
    expect(porCima.status).toBe(200);

    const depois = gravado();
    expect(depois.seriesMatches.find((s) => s.id === "4a-jogo-04")!.games).toHaveLength(2);
    const serie5 = depois.seriesMatches.find((s) => s.id === "4a-jogo-05")!;
    expect(serie5.blueSideTeamId).toBe(sorteada.blueSideTeamId);
    expect(serie5.cardsUsed).toEqual(sorteada.cardsUsed);
    expect(serie5.sorteios?.map((s) => s.tipo)).toEqual(["lados", "carta"]);
  });

  it("master: o «por cima» mantém o lado azul e a carta anunciados na live", async () => {
    const { rascunho, sorteada } = await rascunhoComSorteioEmOutroAparelho();

    const porCima = await PUT(req({ dataset: rascunho, versao: 7, force: true }));
    expect(porCima.status).toBe(200);

    const serie5 = gravado().seriesMatches.find((s) => s.id === "4a-jogo-05")!;
    // Antes: blueSideTeamId undefined e cardsUsed [], com o histórico dizendo que saíram.
    expect(serie5.blueSideTeamId).toBe(sorteada.blueSideTeamId);
    expect(serie5.cardsUsed).toEqual(sorteada.cardsUsed);
    // Nenhuma "correção manual" inventada: o lado e a carta não mudaram.
    expect(serie5.sorteios?.map((s) => s.tipo)).toEqual(["lados", "carta"]);
  });

  it("a mesclagem não dá poder: quem só lança resultado não troca a carta, nem forjando o histórico", async () => {
    sessao.identity = { ...SO_RESULTADOS };
    const { rascunho, sorteada } = await rascunhoComSorteioEmOutroAparelho();

    // Rascunho que VIU o sorteio (histórico completo) e troca a carta: é mudança dela.
    const viu = structuredClone(rascunho);
    const serieViu = viu.seriesMatches.find((s) => s.id === "4a-jogo-05")!;
    serieViu.sorteios = structuredClone(sorteada.sorteios);
    serieViu.blueSideTeamId = sorteada.blueSideTeamId;
    // A carta trocada tem de ser OUTRA: o sorteio da rota é aleatório e às vezes já dá
    // TUDO_LIBERADO — aí não há troca nenhuma, o PUT certo responde 200 e o teste piscava.
    const outraCarta = sorteada.cardsUsed?.[0]?.cardId === "TUDO_LIBERADO" ? "INTER_CLASSE" : "TUDO_LIBERADO";
    serieViu.cardsUsed = [{ teamId: "c", cardId: outraCarta }];
    const r1 = await PUT(req({ dataset: viu, versao: 9, force: true }));
    expect(r1.status).toBe(403);
    expect(((await r1.json()) as { missing: string[] }).missing).toContain("series:cards");

    // Histórico "curto" forjado para a carta dela passar como "sorteio não visto": o
    // servidor só mantém o que já está gravado.
    const forjado = structuredClone(rascunho);
    forjado.seriesMatches.find((s) => s.id === "4a-jogo-05")!.cardsUsed = [{ teamId: "c", cardId: outraCarta }];
    const r2 = await PUT(req({ dataset: forjado, versao: 9 }));
    expect(r2.status).toBe(200);
    expect(gravado().seriesMatches.find((s) => s.id === "4a-jogo-05")!.cardsUsed).toEqual(sorteada.cardsUsed);
  });

  it("trocar um time da série no rascunho não ressuscita o sorteio do confronto antigo", async () => {
    const { rascunho } = await rascunhoComSorteioEmOutroAparelho();
    const serie = rascunho.seriesMatches.find((s) => s.id === "4a-jogo-05")!;
    serie.teamBId = "b"; // C x D virou C x B: o painel limpa lado e carta de propósito

    expect((await PUT(req({ dataset: rascunho, versao: 7, force: true }))).status).toBe(200);
    const serie5 = gravado().seriesMatches.find((s) => s.id === "4a-jogo-05")!;
    expect(serie5.teamBId).toBe("b");
    // O lado sorteado entre C e D não volta para um confronto em que D nem está.
    expect(serie5.blueSideTeamId).toBeUndefined();
    expect(serie5.cardsUsed ?? []).toHaveLength(0);
  });
});

describe("«Salvar por cima» relê e remescla em vez de gravar sem condição", () => {
  it("um sorteio que grava entre a leitura do PUT e a gravação continua no histórico", async () => {
    const rascunho = datasetDoDia();
    rascunho.teams[0]!.name = "A (editado)";

    // 1ª tentativa de gravar do PUT: logo antes, a cerimônia grava o sorteio de lados da
    // série 5. A gravação condicionada perde, e a volta seguinte remescla sobre ela.
    banco.antesDeGravar.set(1, () =>
      gravarPorFora((d) => {
        const s = d.seriesMatches.find((x) => x.id === "4a-jogo-05")!;
        s.blueSideTeamId = "d";
        s.sorteios = [{ tipo: "lados", semente: "abc123", emISO: "2026-11-21T18:20:00.000Z", autor: "nakay", resultado: "d" }];
      }),
    );

    const r = await PUT(req({ dataset: rascunho, versao: 7, force: true }));
    expect(r.status).toBe(200);
    const corpo = (await r.json()) as { versao: number };
    expect(corpo.versao).toBe(9); // a do sorteio (8) e a do PUT (9)

    const depois = gravado();
    expect(depois.teams[0]!.name).toBe("A (editado)");
    const s5 = depois.seriesMatches.find((x) => x.id === "4a-jogo-05")!;
    // Antes: sorteios [] e blueSideTeamId undefined — o registro append-only sumia.
    expect(s5.sorteios?.map((s) => s.semente)).toEqual(["abc123"]);
    expect(s5.blueSideTeamId).toBe("d");
  });

  it("desiste com 409 depois de 5 voltas perdidas seguidas, sem gravar nada", async () => {
    const rascunho = datasetDoDia();
    rascunho.teams[0]!.name = "A (editado)";
    for (let tentativa = 1; tentativa <= 5; tentativa++) {
      banco.antesDeGravar.set(tentativa, () => gravarPorFora((d) => void (d.teams[3]!.name = `D${tentativa}`)));
    }

    const r = await PUT(req({ dataset: rascunho, versao: 7, force: true }));
    expect(r.status).toBe(409);
    expect(((await r.json()) as { conflict: boolean }).conflict).toBe(true);
    expect(banco.tentativasDeGravar).toBe(5);
    expect(gravado().teams[0]!.name).toBe("A");
  });

  it("sem `force` continua sendo uma volta só: o banco recusou, é 409", async () => {
    const rascunho = datasetDoDia();
    rascunho.teams[0]!.name = "A (editado)";
    banco.antesDeGravar.set(1, () => gravarPorFora((d) => void (d.teams[3]!.name = "D (de outra pessoa)")));

    const r = await PUT(req({ dataset: rascunho, versao: 7 }));
    expect(r.status).toBe(409);
    expect(banco.tentativasDeGravar).toBe(1);
    expect(gravado().teams[3]!.name).toBe("D (de outra pessoa)");
  });
});
