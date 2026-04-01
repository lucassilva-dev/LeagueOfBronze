import { describe, expect, it } from "vitest";

import {
  getOpGgMultiSearchUrlFromNicks,
  getOpGgSummonerUrlFromNick,
  parseRiotId,
} from "../lib/opgg";

describe("op.gg helpers", () => {
  it("gera link de perfil individual quando nick esta em formato Nome#TAG", () => {
    const url = getOpGgSummonerUrlFromNick("Jogador#BR1");
    expect(url).toContain("/lol/summoners/br/");
    expect(url).toContain("Jogador-BR1");
  });

  it("retorna erro no multi op.gg quando algum nick nao tem #TAG", () => {
    const result = getOpGgMultiSearchUrlFromNicks([
      "A#BR1",
      "B#BR1",
      "SemTag",
      "D#BR1",
      "E#BR1",
    ]);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.invalidNicks).toEqual(["SemTag"]);
  });

  it("retorna nulo para riot id vazio ou mal formatado e para perfil individual invalido", () => {
    expect(parseRiotId("")).toBeNull();
    expect(parseRiotId("#BR1")).toBeNull();
    expect(parseRiotId("Jogador#")).toBeNull();
    expect(parseRiotId("  #  ")).toBeNull();
    expect(getOpGgSummonerUrlFromNick("SemTag")).toBeNull();
  });

  it("retorna erro no multi op.gg quando o elenco nao tem exatamente 5 jogadores", () => {
    const result = getOpGgMultiSearchUrlFromNicks(["A#BR1", "B#BR1", "C#BR1", "D#BR1"]);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.invalidNicks).toEqual([]);
    expect(result.error).toContain("exatamente 5 jogadores");
  });

  it("gera multi op.gg quando os 5 nicks sao validos", () => {
    const result = getOpGgMultiSearchUrlFromNicks([
      "A#BR1",
      "B#BR1",
      "C#BR1",
      "D#BR1",
      "E#BR1",
    ]);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.url).toContain("op.gg/multisearch/br");
    expect(result.url).toContain("summoners=");
  });
});
