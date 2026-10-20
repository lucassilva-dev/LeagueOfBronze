import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { CalendarioDa4a, ResumoDoCalendario4a, rotuloDoDia } from "@/components/calendario-4a";
import {
  CALENDARIO_4A,
  TIMES_DO_CALENDARIO_4A,
  diasDoCalendario4a,
  idDaSerieDoCalendario,
  seriesDaFaseDePontos,
  seriesNoCalendario4a,
  turnoDoSlot,
} from "@/lib/calendario-4a";
import { MESSAGES } from "@/lib/i18n/messages";
import { seriesMatchSchema } from "@/lib/schema";

const pontos = CALENDARIO_4A.filter((s) => s.tipo === "pontos");

describe("o calendário oficial da 4ª (20 a 29/11)", () => {
  it("tem 18 séries: 15 de pontos, 2 semifinais e a final — e uma reserva", () => {
    expect(pontos).toHaveLength(15);
    expect(CALENDARIO_4A.filter((s) => s.tipo === "semifinal").map((s) => s.semifinal)).toEqual([1, 2]);
    expect(CALENDARIO_4A.filter((s) => s.tipo === "final")).toHaveLength(1);
    expect(CALENDARIO_4A.filter((s) => s.tipo === "reserva")).toHaveLength(1);
    expect(seriesNoCalendario4a()).toBe(18);
  });

  it("a fase de pontos é todos contra todos, uma vez: cada par dos 6 times aparece exatamente uma vez", () => {
    const pares = pontos.map((s) => [...s.confronto!].sort((a, b) => a - b).join("x"));
    expect(new Set(pares).size).toBe(15);
    for (let a = 1; a <= TIMES_DO_CALENDARIO_4A; a++) {
      for (let b = a + 1; b <= TIMES_DO_CALENDARIO_4A; b++) {
        expect(pares).toContain(`${a}x${b}`);
      }
    }
  });

  it("cada time joga 5 séries na fase de pontos", () => {
    const jogos = new Map<number, number>();
    for (const s of pontos) for (const t of s.confronto!) jogos.set(t, (jogos.get(t) ?? 0) + 1);
    expect([...jogos.entries()].sort((x, y) => x[0] - y[0])).toEqual([
      [1, 5],
      [2, 5],
      [3, 5],
      [4, 5],
      [5, 5],
      [6, 5],
    ]);
  });

  it("um jogo de cada vez: nenhum horário se repete, e tudo está no fuso de Brasília", () => {
    const horarios = CALENDARIO_4A.map((s) => s.quando);
    expect(new Set(horarios).size).toBe(horarios.length);
    for (const h of horarios) {
      expect(h).toMatch(/^2026-11-\d{2}T\d{2}:\d{2}:00-03:00$/);
      expect(Number.isNaN(Date.parse(h))).toBe(false);
    }
  });

  it("confere com a grade divulgada (horário e confronto, dia a dia)", () => {
    // Transcrição da imagem que a organização mandou em 2026-10-20. Se um horário mudar,
    // este teste é o lembrete de que /regras, /calendario e a home mudam junto.
    const grade = CALENDARIO_4A.map((s) =>
      s.tipo === "pontos" ? `${s.quando.slice(8, 16)} ${s.confronto!.join("x")}` : `${s.quando.slice(8, 16)} ${s.tipo}${s.semifinal ?? ""}`,
    );
    expect(grade).toEqual([
      "20T20:00 3x6",
      "20T22:00 2x5",
      "21T08:30 3x4",
      "21T13:30 1x3",
      "21T15:30 4x6",
      "21T21:00 5x6",
      "21T23:00 2x4",
      "22T08:30 1x6",
      "22T13:00 2x6",
      "22T15:00 1x4",
      "27T20:00 4x5",
      "27T22:00 2x3",
      "28T08:30 1x5",
      "28T13:30 1x2",
      "28T15:30 3x5",
      "28T19:00 reserva",
      "29T08:30 semifinal1",
      "29T10:30 semifinal2",
      "29T14:30 final",
    ]);
  });

  it("final em MD5; semifinais e pontos corridos em MD3", () => {
    expect(CALENDARIO_4A.find((s) => s.tipo === "final")?.formato).toBe("BO5");
    for (const s of CALENDARIO_4A.filter((x) => x.tipo === "pontos" || x.tipo === "semifinal")) {
      expect(s.formato).toBe("BO3");
    }
  });

  it("os dias são seis, três por fim de semana, de sexta a domingo", () => {
    const dias = diasDoCalendario4a();
    expect(dias.map((d) => `${d.dia}:${d.fimDeSemana}`)).toEqual([
      "2026-11-20:1",
      "2026-11-21:1",
      "2026-11-22:1",
      "2026-11-27:2",
      "2026-11-28:2",
      "2026-11-29:2",
    ]);
    const t = MESSAGES.pt.calendario4a;
    expect(dias.map((d) => rotuloDoDia(d.dia, t, "pt-BR").semana)).toEqual([
      "SEXTA",
      "SÁBADO",
      "DOMINGO",
      "SEXTA",
      "SÁBADO",
      "DOMINGO",
    ]);
  });

  it("turno com as mesmas fronteiras de lib/calendar (antes das 13h manhã, antes das 18h tarde)", () => {
    expect(turnoDoSlot({ quando: "2026-11-21T08:30:00-03:00" })).toBe("manha");
    expect(turnoDoSlot({ quando: "2026-11-22T13:00:00-03:00" })).toBe("tarde");
    expect(turnoDoSlot({ quando: "2026-11-28T19:00:00-03:00" })).toBe("noite");
  });
});

describe("as séries criadas a partir do sorteio das posições", () => {
  const times = ["chama", "aurea", "verdante", "gelida", "arcana", "carmesim"];

  it("Time N vira o N-ésimo da lista sorteada, com data, MD3 e fase regular", () => {
    const series = seriesDaFaseDePontos(times);
    expect(series).toHaveLength(15);
    // 1ª série: Time 3 x Time 6 na sexta 20/11 às 20:00.
    expect(series[0]).toMatchObject({
      id: idDaSerieDoCalendario(1),
      date: "2026-11-20T20:00:00-03:00",
      teamAId: "verdante",
      teamBId: "carmesim",
      format: "BO3",
      stage: "REGULAR_SEASON",
      games: [],
    });
    for (const s of series) expect(seriesMatchSchema.safeParse(s).success).toBe(true);
    expect(new Set(series.map((s) => s.id)).size).toBe(15);
  });

  it("recusa número de times diferente de 6 e time repetido", () => {
    expect(() => seriesDaFaseDePontos(times.slice(0, 5))).toThrow(/6 times/);
    expect(() => seriesDaFaseDePontos([...times.slice(0, 5), "chama"])).toThrow(/duas posições/);
  });
});

describe("o componente do calendário", () => {
  it("mostra os confrontos por posição, as finais e as notas", () => {
    const html = renderToStaticMarkup(<CalendarioDa4a t={MESSAGES.pt.calendario4a} localeTag="pt-BR" />);
    expect(html).toContain("Time 3 x Time 6");
    expect(html).toContain("Semifinal: 1º x 4º colocados");
    expect(html).toContain("Semifinal: 2º x 3º colocados");
    expect(html).toContain("FINAL em MD5");
    expect(html).toContain("RESERVA: realocação de imprevistos");
    expect(html).toContain("20/11");
    expect(html).toContain("29/11");
    expect(html).toContain("1º FIM DE SEMANA");
    expect(html).toContain("sorteio ao vivo");
    // Nenhuma animação de opacidade (já apagou o site quatro vezes).
    expect(html).not.toMatch(/opacity\s*:\s*0/);
  });

  it("em inglês, sem sobra de português nos rótulos", () => {
    const html = renderToStaticMarkup(<CalendarioDa4a t={MESSAGES.en.calendario4a} localeTag="en-US" />);
    expect(html).toContain("Team 3 v Team 6");
    expect(html).toContain("FRIDAY");
    expect(html).toContain("Bo5 FINAL");
    expect(html).not.toContain("SEXTA");
  });

  it("o resumo da home lista os seis dias e leva ao calendário", () => {
    const html = renderToStaticMarkup(<ResumoDoCalendario4a t={MESSAGES.pt.calendario4a} localeTag="pt-BR" />);
    expect(html).toContain("2 jogos");
    expect(html).toContain("5 jogos");
    expect(html).toContain("semis + final");
    expect(html).toContain('href="/calendario"');
  });
});

describe("as frases que repetem datas por extenso batem com a grade", () => {
  // Se um horário mudar em lib/calendario-4a.ts, estes testes dizem qual frase ficou velha.
  const pt = MESSAGES.pt;
  const en = MESSAGES.en;
  const dias = diasDoCalendario4a();
  const ddmm = (dia: string) => `${dia.slice(8, 10)}/${dia.slice(5, 7)}`;
  const reserva = CALENDARIO_4A.find((s) => s.tipo === "reserva")!;
  const final = CALENDARIO_4A.find((s) => s.tipo === "final")!;
  const atrasam = CALENDARIO_4A.filter((s) => s.podeAtrasar);

  it("intro e resumo citam os seis dias e o dia da final", () => {
    for (const d of dias) expect(pt.calendario4a.intro).toContain(d.dia.slice(8, 10));
    expect(pt.calendario4a.intro).toContain(ddmm(final.quando.slice(0, 10)));
    expect(pt.calendario4a.intro).toContain(`${seriesNoCalendario4a()} séries`);
    expect(en.calendario4a.intro).toContain(`${seriesNoCalendario4a()} series`);
    const primeiro = dias[0]!.dia.slice(8, 10);
    const ultimo = dias[dias.length - 1]!.dia.slice(8, 10);
    expect(pt.calendario4a.resumoPeriodo).toContain(`${primeiro} A ${ultimo}`);
    expect(en.calendario4a.resumoPeriodo).toContain(`${primeiro} TO ${ultimo}`);
  });

  it("a nota da reserva tem o dia e a hora do slot de reserva", () => {
    expect(pt.calendario4a.notaReserva).toContain(ddmm(reserva.quando.slice(0, 10)));
    expect(pt.calendario4a.notaReserva).toContain(reserva.quando.slice(11, 16));
    expect(en.calendario4a.notaReserva).toContain(reserva.quando.slice(11, 16));
  });

  it("a nota de atraso lista exatamente as horas que podem atrasar", () => {
    const horas = [...new Set(atrasam.map((s) => s.quando.slice(11, 16)))];
    for (const h of horas) {
      expect(pt.calendario4a.notaAtraso).toContain(h);
      expect(en.calendario4a.notaAtraso).toContain(h);
    }
    // E nenhuma hora a mais.
    const citadas = pt.calendario4a.notaAtraso.match(/\d{2}:\d{2}/g) ?? [];
    expect([...new Set(citadas)].sort()).toEqual(horas.sort());
  });

  it("/regras, a home e o formulário citam o mesmo período", () => {
    const primeiro = Number(dias[0]!.dia.slice(8, 10));
    const ultimo = Number(dias[dias.length - 1]!.dia.slice(8, 10));
    expect(pt.paginasRegras.fichaPeriodoV).toContain(`${primeiro} a ${ultimo} de novembro`);
    expect(en.paginasRegras.fichaPeriodoV).toContain(`${primeiro} to ${ultimo} November`);
    expect(pt.preTemporada.passo5Texto).toContain(`${primeiro} a ${ultimo} de novembro`);
    expect(pt.inscricao.disponibilidadeAjuda).toContain(`${primeiro} a ${ultimo}/11`);
  });
});
