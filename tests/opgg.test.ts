import { describe, expect, it } from "vitest";

import { getOpGgMultiSearchUrlFromNicks, getOpGgSummonerUrlFromNick } from "../lib/opgg";

describe("op.gg helpers", () => {
  it("gera link de perfil individual quando nick está em formato Nome#TAG", () => {
    const url = getOpGgSummonerUrlFromNick("Jogador#BR1");
    expect(url).toContain("/lol/summoners/br/");
    expect(url).toContain("Jogador-BR1");
  });

  it("retorna erro no multi op.gg quando algum nick não tem #TAG", () => {
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

  it("gera multi op.gg quando os 5 nicks são válidos", () => {
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
