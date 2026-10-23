import { describe, expect, it } from "vitest";

import { elencoAtivo, estaNoElenco, substituirDeVez } from "@/lib/tournament";

import { cenario, copia, id, validar } from "./_cenario-regra-6";

/**
 * "Substituir de vez" (regra 6) com um herdeiro que JÁ tinha saído de um time.
 *
 * Quem sai de vez e volta à reserva pode carregar o `saiuEm` antigo (o schema aceita reserva
 * com `saiuEm`). `substituirDeVez` dava o time e tirava `reserva`, mas mantinha o `saiuEm`:
 * como `estaNoElenco` exige `!saiuEm`, o herdeiro ficava com o time e FORA do elenco — o time
 * aparecia com 4 em /times, no PTS e no Multi OP.GG, sem aviso nenhum.
 */
describe("substituir de vez com um reserva que já tinha saído de um time", () => {
  it("o herdeiro entra no elenco e o time continua com 5", () => {
    const ds = copia(cenario());
    const r1 = ds.players.find((p) => p.id === "r1")!;
    r1.saiuEm = "2026-11-21T22:00:00.000Z"; // saiu de um time antes e voltou como reserva
    expect(validar(ds).success).toBe(true);

    const depois = substituirDeVez(ds, id("alfa", "TOP"), "r1", "2026-11-25T22:00:00.000Z");
    const herdeiro = depois.players.find((p) => p.id === "r1")!;

    expect(validar(depois).success).toBe(true);
    expect(herdeiro).toMatchObject({ teamId: "alfa" });
    expect("saiuEm" in herdeiro).toBe(false);
    expect("reserva" in herdeiro).toBe(false);
    expect(estaNoElenco(herdeiro)).toBe(true);
    expect(elencoAtivo(depois, "alfa").map((p) => p.id)).toContain("r1");
    expect(elencoAtivo(depois, "alfa")).toHaveLength(5);
  });

  it("o titular que sai continua com a própria saída (só o `saiuEm` do herdeiro é apagado)", () => {
    const ds = copia(cenario());
    ds.players.find((p) => p.id === "r1")!.saiuEm = "2026-11-21T22:00:00.000Z";

    const depois = substituirDeVez(ds, id("alfa", "TOP"), "r1", "2026-11-25T22:00:00.000Z");
    expect(depois.players.find((p) => p.id === id("alfa", "TOP"))).toMatchObject({
      teamId: "alfa",
      saiuEm: "2026-11-25T22:00:00.000Z",
    });
  });
});
