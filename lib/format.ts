const BRAZIL_TIME_ZONE = "America/Sao_Paulo";

/** `2026-08-02T14:00` / `2026-08-02T14:00:00` — data com hora e SEM fuso declarado. */
const HORA_SEM_FUSO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/;

/** `2026-08-02` — data pura, sem hora. É o que o `<input type="date">` do painel grava. */
const DATA_PURA = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Converte o texto da série em data, assumindo Brasília quando o fuso não está escrito.
 *
 * `new Date("2026-08-02T14:00")` — sem `Z` e sem `-03:00` — é interpretado no fuso do
 * SERVIDOR. Na Vercel o servidor é UTC, então 14:00 virava 14:00Z e a tela mostrava
 * 11:00: três horas mais cedo. Em desenvolvimento nunca aparecia, porque a máquina já
 * está em UTC-3 e o resultado batia por coincidência.
 *
 * Isso não é hipótese: a `grande-final` do dataset está gravada exatamente assim
 * (`2026-08-02T14:00`), ou seja, o horário da FINAL era o que saía errado em produção.
 *
 * O Brasil não tem mais horário de verão desde 2019, então -03:00 é constante e pode
 * ser fixado sem tabela de fuso.
 *
 * A DATA PURA (`2026-08-28`) precisa do mesmo tratamento, e por um motivo que só
 * aparece junto com o `timeZone` da formatação: sozinha ela é lida como meia-noite
 * UTC, que em Brasília é 21:00 do DIA ANTERIOR — então toda série marcada só por data
 * saía um dia mais cedo. Não é canto raro: o campo Data do painel é
 * `<input type="date">`, que grava exatamente neste formato, e as temporadas antigas
 * guardam só a data.
 */
function paraData(value: string) {
  if (HORA_SEM_FUSO.test(value)) return new Date(`${value}-03:00`);
  if (DATA_PURA.test(value)) return new Date(`${value}T00:00-03:00`);
  return new Date(value);
}

/**
 * Idioma da formatação de datas.
 *
 * O padrão é pt-BR: o admin, os testes e todo o código que já existia continuam idênticos.
 * As páginas públicas passam a tag do idioma da requisição para que a data acompanhe o
 * resto do texto ("01 de ago. de 2026, 09:00" → "Aug 01, 2026, 9:00 AM"). O fuso continua
 * sendo sempre o de Brasília: o campeonato é jogado no horário do Brasil, independentemente
 * de onde a pessoa esteja lendo.
 */
export type LocaleTag = "pt-BR" | "en-US";

export function formatDateLabel(
  value?: string | null,
  options?: Intl.DateTimeFormatOptions,
  locale: string = "pt-BR",
) {
  if (!value) return locale === "pt-BR" ? "Sem data" : "No date";
  const date = paraData(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    // O fuso é obrigatório aqui, como já era no `formatDateTimeLabel`. Sem ele esta
    // função formatava no fuso do servidor (UTC na Vercel) e a MESMA série aparecia
    // num dia na lista de partidas e no dia seguinte onde só a data é mostrada:
    // uma partida de 01/08 às 22:00 (-03:00) é 02/08 em UTC.
    timeZone: BRAZIL_TIME_ZONE,
    ...options,
  }).format(date);
}

export function formatDateTimeLabel(value?: string | null, locale: string = "pt-BR") {
  if (!value) return locale === "pt-BR" ? "Sem atualização" : "Never updated";
  const date = paraData(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    // 24h em português, AM/PM em inglês — é o que cada público espera ler.
    hourCycle: locale === "pt-BR" ? "h23" : "h12",
    timeZone: BRAZIL_TIME_ZONE,
  }).format(date);
}

function seriesDateHasTime(value?: string | null) {
  return typeof value === "string" && value.includes("T");
}

// Séries da 3ª temporada guardam data+horário (ISO com hora). As antigas guardam
// só a data (YYYY-MM-DD). Mostra dia+hora quando há horário; senão, só o dia.
export function formatSeriesDateLabel(value?: string | null, locale: string = "pt-BR") {
  return seriesDateHasTime(value)
    ? formatDateTimeLabel(value, locale)
    : formatDateLabel(value, undefined, locale);
}

/**
 * Turno (Matutino/Vespertino/Noturno) derivado do horário, no fuso de Brasília.
 *
 * Os três cortes são os MESMOS de `lib/calendar.ts` — e precisam continuar sendo.
 * Faltava "Noturno" aqui: o calendário anunciava "NOTURNO · 20h–21h30" e a lista de
 * partidas chamava a mesma série de "Vespertino". Não era caso de canto nenhum —
 * 20h e 21h30 são os horários principais da competição, então a maior parte das
 * séries do campeonato saía com dois nomes diferentes dependendo da página.
 */
export function getSeriesTurnoLabel(value?: string | null): string | null {
  if (!seriesDateHasTime(value)) return null;
  const date = paraData(value as string);
  if (Number.isNaN(date.getTime())) return null;
  const hour = Number(
    new Intl.DateTimeFormat("pt-BR", {
      hour: "2-digit",
      hour12: false,
      timeZone: BRAZIL_TIME_ZONE,
    }).format(date),
  );
  if (hour < 13) return "Matutino";
  return hour < 18 ? "Vespertino" : "Noturno";
}

// O idioma é parâmetro (com pt-BR de padrão, para não mexer em quem já chamava sem ele):
// presos a "pt-BR", os dois imprimiam vírgula decimal no site em inglês — "3,25" num KDA
// e "52,5%" numa taxa de vitória, no meio de uma página inteira em inglês.
export function formatPercent(value: number, maximumFractionDigits = 1, locale: string = "pt-BR") {
  return new Intl.NumberFormat(locale, {
    style: "percent",
    minimumFractionDigits: 0,
    maximumFractionDigits,
  }).format(value / 100);
}

export function formatKda(value: number, locale: string = "pt-BR") {
  return new Intl.NumberFormat(locale, {
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
