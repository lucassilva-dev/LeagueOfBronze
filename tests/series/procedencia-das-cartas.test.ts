import { describe, expect, it } from "vitest";

import { registrosDasCartasPorTime } from "@/lib/series/procedencia-das-cartas";

const base = { emISO: "2026-11-13T23:00:00.000Z", autor: "lucas" };

describe("registrosDasCartasPorTime — a procedência de cada vaga de carta", () => {
  it("cada time fica com o SEU último registro: sortear a carta de B não apaga a de A", () => {
    const porTime = registrosDasCartasPorTime({
      teamAId: "a",
      teamBId: "b",
      sorteios: [
        { ...base, tipo: "carta", semente: "s1", teamId: "a", resultado: "ABCDRAFT", detalhe: { letras: ["L", "S"], campeoes: 21 } },
        { ...base, tipo: "lados", semente: "s2", resultado: "a" },
        { ...base, tipo: "carta", semente: "s3", teamId: "b", resultado: "TUDO_LIBERADO" },
      ],
    });
    expect(porTime.a?.semente).toBe("s1");
    expect(porTime.a?.detalhe?.letras).toEqual(["L", "S"]);
    expect(porTime.b?.semente).toBe("s3");
  });

  it("o sorteio duplo (sem time) vale para os dois; o registro mais novo vence", () => {
    const porTime = registrosDasCartasPorTime({
      teamAId: "a",
      teamBId: "b",
      sorteios: [
        { ...base, tipo: "carta", semente: "s1", teamId: "a", resultado: "ABCDRAFT" },
        { ...base, tipo: "carta", semente: "s2", resultado: "AMIGOS_NATUREZA", detalhe: { dupla: true } },
        { ...base, tipo: "carta_manual", semente: "", teamId: "b", resultado: "TUDO_LIBERADO" },
      ],
    });
    expect(porTime.a?.semente).toBe("s2");
    expect(porTime.b?.tipo).toBe("carta_manual");
  });

  it("série sem sorteio de carta: nada", () => {
    expect(registrosDasCartasPorTime({ teamAId: "a", teamBId: "b", sorteios: [{ ...base, tipo: "lados", semente: "s", resultado: "a" }] })).toEqual({});
    expect(registrosDasCartasPorTime({ teamAId: "a", teamBId: "b" })).toEqual({});
  });
});
