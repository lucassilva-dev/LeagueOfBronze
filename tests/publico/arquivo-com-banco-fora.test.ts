import { beforeEach, describe, expect, it, vi } from "vitest";

import { tournamentDatasetSchema, type TournamentDataset } from "@/lib/schema";
import { buildArchivedSeason } from "@/lib/tournament";

import { temporadaJogada } from "./_ajuda";

/**
 * INF-04: com o Supabase oscilando, a instância que já tinha lido o banco servia /tabela e
 * /times da última cópia boa — mas /temporadas dizia "nenhuma temporada arquivada" e
 * /temporadas/<id> da 2ª e da 3ª dava 404, embora a cópia boa TENHA o arquivo dentro.
 */

const banco = vi.hoisted(() => ({ fora: false, copia: null as unknown }));

vi.mock("@/lib/data-store", async (original) => {
  const real = await original<typeof import("@/lib/data-store")>();
  const falhar = () => {
    throw new Error("TypeError: fetch failed (tournament_state)");
  };
  return {
    ...real,
    getLastGoodDataset: () => banco.copia as TournamentDataset | null,
    readDataset: async () => (banco.fora ? falhar() : (banco.copia as TournamentDataset)),
    // Banco no ar: devolve o que "o banco" tem — uma marca, para o controle saber de onde veio.
    listArchivedSeasons: async () => (banco.fora ? falhar() : [{ seasonId: "lido-do-banco" }]),
    readArchivedSeason: async (id: string) =>
      banco.fora ? falhar() : ((banco.copia as TournamentDataset).archivedSeasons.find((s) => s.seasonId === id) ?? null),
  };
});

const { getServerArchivedSeason, getServerArchivedSeasons } = await import("@/lib/server-data");

/** A cópia boa da instância: a 4ª no ar e a 2ª e a 3ª no arquivo. */
function copiaComArquivo(): TournamentDataset {
  const segunda = buildArchivedSeason(
    temporadaJogada({ nome: "2ª Edição", seasonId: "season-2", status: "finished" }),
    "2026-03-10T12:00:00.000Z",
  );
  const terceira = buildArchivedSeason(
    temporadaJogada({ nome: "3ª Edição", seasonId: "season-3", status: "finished" }),
    "2026-08-03T12:00:00.000Z",
  );
  return tournamentDatasetSchema.parse({ ...temporadaJogada(), archivedSeasons: [segunda, terceira] });
}

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  banco.fora = true;
  banco.copia = copiaComArquivo();
});

describe("INF-04 — arquivo servido da última cópia boa com o banco fora", () => {
  it("/temporadas lista as temporadas da cópia, da mais recente para a mais antiga", async () => {
    const lista = await getServerArchivedSeasons();
    expect(lista.map((s) => s.seasonId)).toEqual(["season-3", "season-2"]);
    expect(lista[0]!.name).toBe("3ª Edição");
  });

  it("/temporadas/<id> acha a temporada na cópia em vez de dar 404", async () => {
    const resultado = await getServerArchivedSeason("season-3");
    expect(resultado).not.toBeNull();
    expect(resultado!.archived.name).toBe("3ª Edição");
    expect(resultado!.dataset.teams.length).toBe(2);
    expect(resultado!.overview).toBeTruthy();
    expect(await getServerArchivedSeason("nao-existe")).toBeNull();
  });

  it("instância fria (sem cópia nenhuma): segue a lista vazia e o null de antes", async () => {
    banco.copia = null;
    expect(await getServerArchivedSeasons()).toEqual([]);
    expect(await getServerArchivedSeason("season-3")).toBeNull();
  });

  it("controle: com o banco no ar, a leitura é a do banco", async () => {
    banco.fora = false;
    expect((await getServerArchivedSeasons()).map((s) => s.seasonId)).toEqual(["lido-do-banco"]);
    expect((await getServerArchivedSeason("season-2"))?.archived.name).toBe("2ª Edição");
  });
});
