import { describe, expect, it } from "vitest";

import {
  formatDateLabel,
  formatDateTimeLabel,
  formatKda,
  formatPercent,
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
