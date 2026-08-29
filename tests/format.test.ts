import { describe, expect, it } from "vitest";

import {
  formatDateLabel,
  formatDateTimeLabel,
  formatSeriesDateLabel,
  formatKda,
  formatPercent,
  getSeriesTurnoLabel,
  toDateEnd,
  toDateStart,
} from "../lib/format";

describe("format helpers", () => {
  it("formats dates and falls back for empty or invalid values", () => {
    expect(formatDateLabel()).toBe("Sem data");
    expect(formatDateLabel("nao-e-data")).toBe("nao-e-data");

    const value = "2026-03-30T12:00:00.000Z";
    const expected = new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(value));

    expect(formatDateLabel(value)).toBe(expected);
  });

  it("formats date time in Brazil timezone and handles empty or invalid values", () => {
    expect(formatDateTimeLabel()).toBe("Sem atualização");
    expect(formatDateTimeLabel("invalido")).toBe("invalido");

    const value = "2026-02-23T19:11:00.000Z";
    const expected = new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
      timeZone: "America/Sao_Paulo",
    }).format(new Date(value));

    expect(formatDateTimeLabel(value)).toBe(expected);
  });

  it("formats percentages and KDA with pt-BR locale", () => {
    expect(formatPercent(50)).toBe("50%");
    expect(formatPercent(12.345, 2)).toBe("12,35%");
    expect(formatKda(3.456)).toBe("3,46");
  });

  it("builds date ranges for start and end of day", () => {
    expect(toDateStart()).toBeUndefined();
    expect(toDateStart("invalido")).toBeUndefined();
    expect(toDateEnd()).toBeUndefined();
    expect(toDateEnd("invalido")).toBeUndefined();

    const start = toDateStart("2026-03-30");
    const end = toDateEnd("2026-03-30");

    expect(start).toBeInstanceOf(Date);
    expect(end).toBeInstanceOf(Date);

    expect(start?.getHours()).toBe(0);
    expect(start?.getMinutes()).toBe(0);
    expect(start?.getSeconds()).toBe(0);
    expect(start?.getMilliseconds()).toBe(0);

    expect(end?.getHours()).toBe(23);
    expect(end?.getMinutes()).toBe(59);
    expect(end?.getSeconds()).toBe(59);
    expect(end?.getMilliseconds()).toBe(999);
  });
});

describe("horário da série sem fuso declarado", () => {
  // `grande-final` está gravada assim no dataset: "2026-08-02T14:00", sem Z e sem
  // -03:00. Interpretada no fuso do servidor (UTC na Vercel), virava 11:00 na tela —
  // o horário da FINAL, anunciado três horas mais cedo. Em desenvolvimento passava
  // despercebido porque a máquina já está em UTC-3.
  const GRANDE_FINAL = "2026-08-02T14:00";

  it("mostra 14:00, e não 11:00, mesmo com o servidor em UTC", () => {
    expect(formatDateTimeLabel(GRANDE_FINAL)).toContain("14:00");
    expect(formatDateTimeLabel(GRANDE_FINAL)).not.toContain("11:00");
  });

  it("cai no mesmo instante de quando o fuso está escrito", () => {
    expect(formatDateTimeLabel(GRANDE_FINAL)).toBe(formatDateTimeLabel("2026-08-02T14:00-03:00"));
  });

  it("não joga a data PURA para o dia anterior", () => {
    /*
     * Regressão encontrada depois: acrescentar `timeZone` à formatação sem tratar a
     * data pura fazia `2026-08-28` (meia-noite UTC) virar 21:00 de 27/08 em Brasília,
     * e TODA série marcada só por data aparecia um dia mais cedo. O campo Data do
     * painel é `<input type="date">`, que grava exatamente neste formato.
     *
     * Os testes daqui de cima passavam verdes com o defeito dentro porque só usavam
     * valores COM horário — daí este caso existir separado.
     */
    expect(formatDateLabel("2026-08-28")).toContain("28");
    expect(formatDateLabel("2026-01-01")).toContain("01 de jan");
    expect(formatSeriesDateLabel("2026-08-28")).toContain("28");
  });

  it("não muda o dia numa série da noite", () => {
    // 22:00 em Brasília é 01:00 do dia seguinte em UTC. Sem o fuso na formatação de
    // data, a mesma série aparecia num dia na lista e no outro onde só a data é
    // mostrada.
    const noite = "2026-08-01T22:00:00-03:00";
    expect(formatDateLabel(noite)).toBe(formatDateLabel("2026-08-01T09:00:00-03:00"));
  });
});

describe("turno da série", () => {
  // Os cortes têm de ser os mesmos de lib/calendar.ts. 20h e 21h30 são os horários
  // principais da competição: sem "Noturno", o calendário anunciava "NOTURNO" e a
  // lista de partidas chamava a MESMA série de "Vespertino".
  it("classifica manhã, tarde e noite", () => {
    expect(getSeriesTurnoLabel("2026-08-01T09:00:00-03:00")).toBe("Matutino");
    expect(getSeriesTurnoLabel("2026-08-01T14:00:00-03:00")).toBe("Vespertino");
    expect(getSeriesTurnoLabel("2026-08-01T20:00:00-03:00")).toBe("Noturno");
    expect(getSeriesTurnoLabel("2026-08-01T21:30:00-03:00")).toBe("Noturno");
  });

  it("devolve nulo quando a série não tem horário", () => {
    expect(getSeriesTurnoLabel("2026-08-01")).toBeNull();
    expect(getSeriesTurnoLabel()).toBeNull();
  });
});

describe("números no idioma da página", () => {
  it("usa ponto decimal em inglês e vírgula em português", () => {
    expect(formatKda(3.456)).toBe("3,46");
    expect(formatKda(3.456, "en-US")).toBe("3.46");
    expect(formatPercent(12.345, 2)).toBe("12,35%");
    expect(formatPercent(12.345, 2, "en-US")).toBe("12.35%");
  });
});
