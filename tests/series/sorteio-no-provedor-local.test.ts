import { beforeEach, describe, expect, it, vi } from "vitest";

import { proximaVersaoDoRascunho } from "@/components/admin/shared";
import type { TournamentDataset } from "@/lib/schema";

/**
 * O SORTEIO DEVOLVE A VERSÃO EM QUE A GRAVAÇÃO CAIU — NÃO `versaoLida + 1`.
 *
 * No provedor local (o ensaio do dia de jogo na máquina) a versão é sempre 0. A rota
 * respondia a previsão 1; o painel adotava 1 (`proximaVersaoDoRascunho`), mandava 1 no
 * Salvar seguinte, o servidor lia 0 e recusava: "outra pessoa salvou" sem ninguém ter
 * salvo nada. No Supabase a previsão coincidia com o gravado, por isso só o local caía.
 *
 * Rotas e data-store de verdade, com o `leagueofbronze.json` em MEMÓRIA.
 */
const arquivo = vi.hoisted(() => ({ texto: "" }));
vi.mock("node:fs", async (original) => {
  const real = await original<typeof import("node:fs")>();
  return {
    ...real,
    promises: {
      ...real.promises,
      readFile: async (p: unknown, ...resto: unknown[]) =>
        String(p).endsWith("leagueofbronze.json")
          ? arquivo.texto
          : (real.promises.readFile as (...a: unknown[]) => Promise<unknown>)(p, ...resto),
      writeFile: async (p: unknown, texto: string, ...resto: unknown[]) => {
        if (String(p).endsWith("leagueofbronze.json")) {
          arquivo.texto = texto;
          return;
        }
        return (real.promises.writeFile as (...a: unknown[]) => Promise<unknown>)(p, texto, ...resto);
      },
    },
  };
});

vi.mock("@/lib/security/route-guard", async () => {
  const { sessao } = await import("./_tournament-state-em-memoria");
  return {
    mesmaOrigem: () => true,
    requireAdmin: async () => ({ ok: true, identity: sessao.identity }),
  };
});

import { datasetDoDia, MASTER, req, sessao } from "./_tournament-state-em-memoria";

process.env.DATA_PROVIDER = "local";

const { GET, PUT } = await import("@/app/api/admin/dataset/route");
const { POST: SORTEAR } = await import("@/app/api/admin/series/sorteio/route");

beforeEach(() => {
  process.env.DATA_PROVIDER = "local";
  delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
  sessao.identity = { ...MASTER };
  arquivo.texto = JSON.stringify(datasetDoDia());
});

describe("sorteio ao vivo no provedor local", () => {
  it("a versão devolvida é a gravada (0), e o Salvar seguinte do painel passa", async () => {
    const aberto = (await (await GET(req({}, "GET"))).json()) as { dataset: TournamentDataset; versao: number };
    expect(aberto.versao).toBe(0);

    const r = await SORTEAR(req({ seriesId: "4a-jogo-05", tipo: "lados" }, "POST"));
    expect(r.status).toBe(200);
    const corpo = (await r.json()) as { versao: number; versaoLida: number; blueSideTeamId: string; sorteios: unknown[] };
    expect(corpo.versaoLida).toBe(0);
    // Antes: 1 (a previsão), que o provedor local nunca alcança.
    expect(corpo.versao).toBe(0);

    // O que o painel faz em `onSorteado`: adota a versão e copia lado e histórico.
    const versaoDoPainel = proximaVersaoDoRascunho(aberto.versao, corpo.versaoLida, corpo.versao);
    const rascunho = aberto.dataset;
    const serie = rascunho.seriesMatches.find((s) => s.id === "4a-jogo-05")!;
    serie.blueSideTeamId = corpo.blueSideTeamId;
    serie.sorteios = corpo.sorteios as typeof serie.sorteios;
    rascunho.teams[0]!.name = "A (editado)";

    const salvar = await PUT(req({ dataset: rascunho, versao: versaoDoPainel }));
    expect(salvar.status).toBe(200);
  });
});
