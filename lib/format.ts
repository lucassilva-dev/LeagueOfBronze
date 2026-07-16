const BRAZIL_TIME_ZONE = "America/Sao_Paulo";

export function formatDateLabel(
  value?: string | null,
  options?: Intl.DateTimeFormatOptions,
) {
  if (!value) return "Sem data";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...options,
  }).format(date);
}

export function formatDateTimeLabel(value?: string | null) {
  if (!value) return "Sem atualização";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: BRAZIL_TIME_ZONE,
  }).format(date);
}

function seriesDateHasTime(value?: string | null) {
  return typeof value === "string" && value.includes("T");
}

// Séries da 3ª temporada guardam data+horário (ISO com hora). As antigas guardam
// só a data (YYYY-MM-DD). Mostra dia+hora quando há horário; senão, só o dia.
export function formatSeriesDateLabel(value?: string | null) {
  return seriesDateHasTime(value) ? formatDateTimeLabel(value) : formatDateLabel(value);
}

// Turno (Matutino/Vespertino) derivado do horário, no fuso de Brasília.
export function getSeriesTurnoLabel(value?: string | null): string | null {
  if (!seriesDateHasTime(value)) return null;
  const date = new Date(value as string);
  if (Number.isNaN(date.getTime())) return null;
  const hour = Number(
    new Intl.DateTimeFormat("pt-BR", {
      hour: "2-digit",
      hour12: false,
      timeZone: BRAZIL_TIME_ZONE,
    }).format(date),
  );
  return hour < 13 ? "Matutino" : "Vespertino";
}

export function formatPercent(value: number, maximumFractionDigits = 1) {
  return new Intl.NumberFormat("pt-BR", {
    style: "percent",
    minimumFractionDigits: 0,
    maximumFractionDigits,
  }).format(value / 100);
}

export function formatKda(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function toDateStart(value?: string) {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  date.setHours(0, 0, 0, 0);
  return date;
}

export function toDateEnd(value?: string) {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  date.setHours(23, 59, 59, 999);
  return date;
}
