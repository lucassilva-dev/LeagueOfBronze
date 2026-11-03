import { describe, expect, it } from "vitest";

import { identidadeDoTime } from "@/lib/series/identidade-do-time";
import { COR_NEUTRA_DO_CONFRONTO, coresDoConfronto, distanciaOklab } from "@/lib/series/cores-do-confronto";

/**
 * A roda dos lados gira a ~9 fatias por segundo com as cores dos dois times alternadas. Com duas
 * cores parecidas (EQUIPE RX e GALÁCTICOS DO BAR são os dois azuis no site), as fatias viram uma
 * mancha só e a plateia não sabe quem está sob a seta. O par escolhido tem de se separar de longe.
 */
describe("cores do confronto", () => {
  const rx = identidadeDoTime({ id: "carmesim", name: "EQUIPE RX", slug: "equipe-rx" });
  const galacticos = identidadeDoTime({ id: "gelida", name: "GALÁCTICOS DO BAR", slug: "galacticos-do-bar" });

  it("RX × Galácticos: as cores principais são parecidas, o par de palco não", () => {
    expect(distanciaOklab(rx.cor, galacticos.cor)).toBeLessThan(0.2);
    const [a, b] = coresDoConfronto(rx.candidatasDePalco, galacticos.candidatasDePalco);
    expect(distanciaOklab(a, b)).toBeGreaterThan(0.3);
    // Cada cor continua sendo DO time (uma das candidatas do tema dele).
    expect(rx.candidatasDePalco).toContain(a);
    expect(galacticos.candidatasDePalco).toContain(b);
  });

  it("todos os confrontos da 4ª têm contraste de palco", () => {
    const times = [
      ["chama", "DESORGANIZAÇÃO", "desorganizacao"],
      ["aurea", "OS 5 SEM PING", "os-5-sem-ping"],
      ["verdante", "SO ADC BRONZE CLUBE", "so-adc-bronze-clube"],
      ["gelida", "GALÁCTICOS DO BAR", "galacticos-do-bar"],
      ["arcana", "OS 5 FURIOSOS", "os-5-furiosos"],
      ["carmesim", "EQUIPE RX", "equipe-rx"],
      ["mare", "QUEIJO MINAS", "queijo-minas"],
      ["seiva", "FÃS DE ROSCA ESPORTE CLUBE", "fas-de-rosca-esporte-clube"],
    ].map(([id, name, slug]) => identidadeDoTime({ id: id!, name: name!, slug: slug! }));
    for (const a of times) {
      for (const b of times) {
        if (a.id === b.id) continue;
        const [ca, cb] = coresDoConfronto(a.candidatasDePalco, b.candidatasDePalco);
        expect(distanciaOklab(ca, cb), `${a.nome} × ${b.nome}`).toBeGreaterThan(0.12);
      }
    }
  });

  it("sem contraste possível, o segundo time fica no bronze neutro", () => {
    expect(coresDoConfronto(["#4d9bff"], ["#4d9cff"])).toEqual(["#4d9bff", COR_NEUTRA_DO_CONFRONTO]);
  });

  it("lista vazia ou cor inválida não quebra", () => {
    expect(coresDoConfronto([], [])).toEqual([COR_NEUTRA_DO_CONFRONTO, COR_NEUTRA_DO_CONFRONTO]);
    expect(distanciaOklab("não é cor", "#fff")).toBe(0);
  });
});
