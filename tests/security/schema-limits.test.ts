import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { imageUrlField, teamSchema, tournamentDatasetSchema } from "@/lib/schema";

describe("limites do schema não podem rejeitar dados reais", () => {
  it("o dataset de produção continua válido (rede de proteção contra limite apertado demais)", () => {
    const real = JSON.parse(readFileSync("leagueofbronze.json", "utf8"));
    const r = tournamentDatasetSchema.safeParse(real);
    if (!r.success) {
      throw new Error(
        `Os limites quebraram dados reais: ${r.error.issues
          .slice(0, 5)
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join(" | ")}`,
      );
    }
    expect(r.success).toBe(true);
  });
});

describe("bomba de payload", () => {
  const base = JSON.parse(readFileSync("leagueofbronze.json", "utf8"));

  it("rejeita string gigante em nome de time", () => {
    const d = JSON.parse(JSON.stringify(base));
    d.teams[0].name = "A".repeat(5000);
    expect(tournamentDatasetSchema.safeParse(d).success).toBe(false);
  });

  it("rejeita array de jogadores absurdo", () => {
    const d = JSON.parse(JSON.stringify(base));
    d.players = Array.from({ length: 500 }, (_, i) => ({ ...base.players[0], id: `p${i}`, slug: `p${i}` }));
    expect(tournamentDatasetSchema.safeParse(d).success).toBe(false);
  });

  it("rejeita muitas temporadas arquivadas (cada uma embute um dataset inteiro)", () => {
    const d = JSON.parse(JSON.stringify(base));
    const umaTemporada = {
      seasonId: "s",
      name: "T",
      archivedAtISO: new Date().toISOString(),
      snapshot: { tournament: base.tournament, teams: base.teams, players: base.players, seriesMatches: [], standingsSeed: [] },
    };
    d.archivedSeasons = Array.from({ length: 40 }, (_, i) => ({ ...umaTemporada, seasonId: `s${i}` }));
    expect(tournamentDatasetSchema.safeParse(d).success).toBe(false);
  });

  it("rejeita KDA absurdo", () => {
    const d = JSON.parse(JSON.stringify(base));
    const serie = d.seriesMatches.find((s: { games: unknown[] }) => s.games.length > 0)!;
    serie.games[0].statsByPlayer[0].kills = 999999;
    expect(tournamentDatasetSchema.safeParse(d).success).toBe(false);
  });
});

describe("validação de imageUrl", () => {
  const aceita = (v: string) => imageUrlField.safeParse(v).success;

  it("aceita as pastas de imagem do próprio site", () => {
    expect(aceita("/players/satoshi.jpeg")).toBe(true);
    expect(aceita("/teams/lgtv-wins.png")).toBe(true);
    expect(aceita("/cartas/abcdraft.jpg")).toBe(true);
    expect(aceita("/elo/platina.png")).toBe(true);
    expect(aceita("")).toBe(true); // vazio = sem imagem
  });

  it("aceita o Data Dragon por https", () => {
    expect(aceita("https://ddragon.leagueoflegends.com/cdn/16.14.1/img/champion/Yasuo.png")).toBe(true);
  });

  it("REJEITA host externo (era o vetor de pixel de rastreio)", () => {
    expect(aceita("https://malicioso.com/pixel.png")).toBe(false);
    expect(aceita("http://ddragon.leagueoflegends.com/x.png")).toBe(false); // http não
    expect(aceita("//malicioso.com/pixel.png")).toBe(false); // protocolo-relativo
  });

  it("rejeita esquemas perigosos e travessia de caminho", () => {
    expect(aceita("javascript:alert(1)")).toBe(false);
    expect(aceita("data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=")).toBe(false);
    expect(aceita("/players/../../etc/passwd")).toBe(false);
    expect(aceita("\\players\\x.png")).toBe(false);
    expect(aceita(`/players/${"a".repeat(600)}.png`)).toBe(false);
  });

  it("bloqueia via schema do time, não só isolado", () => {
    const r = teamSchema.safeParse({ id: "t", name: "T", slug: "t", imageUrl: "https://malicioso.com/p.png" });
    expect(r.success).toBe(false);
  });
});
