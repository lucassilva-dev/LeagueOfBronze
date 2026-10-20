import type {
  Player,
  PlayerGameStats,
  SeriesFormat,
  SeriesGame,
  SeriesMatch,
  Team,
  TournamentDataset,
} from "@/lib/schema";

export type AdminTab =
  | "tournament"
  | "overview"
  | "teams"
  | "players"
  | "series"
  | "backup"
  | "users"
  // 4ª Edição. Estas NÃO tocam no rascunho do campeonato: os dados vivem em tabelas
  // próprias, com escrita concorrente, e são buscados pela própria seção — mesmo padrão
  // da aba de usuários. (O draft, quando aplicado, grava o dataset pelo servidor e o
  // painel recarrega o rascunho.)
  | "e4-config"
  | "e4-inscritos"
  | "e4-pagamentos"
  | "e4-times"
  | "e4-draft";
export type MutateDraft = (recipe: (draft: TournamentDataset) => void) => void;

function isCombiningMark(char: string) {
  const code = char.codePointAt(0) ?? 0;
  return code >= 0x0300 && code <= 0x036f;
}

function isSlugChar(char: string) {
  const code = char.codePointAt(0) ?? 0;
  const isDigit = code >= 48 && code <= 57;
  const isLowercaseLetter = code >= 97 && code <= 122;
  return isDigit || isLowercaseLetter;
}

export function slugifyValue(value: string) {
  const normalized = Array.from(value.normalize("NFD"))
    .filter((char) => !isCombiningMark(char))
    .join("")
    .toLowerCase()
    .trim();

  let slug = "";
  let previousWasHyphen = false;

  for (const char of normalized) {
    if (isSlugChar(char)) {
      slug += char;
      previousWasHyphen = false;
      continue;
    }

    if (!previousWasHyphen && slug.length > 0) {
      slug += "-";
      previousWasHyphen = true;
    }
  }

  return slug.endsWith("-") ? slug.slice(0, -1) : slug;
}

export function createBlankTeam(): Team {
  return {
    id: `team-${Date.now()}`,
    name: "",
    slug: "",
  };
}

export function createBlankPlayer(teamId?: string): Player {
  return {
    id: `player-${Date.now()}`,
    nick: "",
    slug: "",
    teamId: teamId ?? "",
    role1: "TOP",
    role2: "JUNG",
    elo: "PRAT",
  };
}

export function createBlankStatsRow(playerId = ""): PlayerGameStats {
  return {
    playerId,
    champion: "",
    kills: 0,
    deaths: 0,
    assists: 0,
  };
}

export function createBlankGame(): SeriesGame {
  return {
    winnerTeamId: "",
    durationMin: 30,
    mvpPlayerId: "",
    statsByPlayer: [],
  };
}

// ---------------------------------------------------------------- data e hora da série

/**
 * O campeonato é jogado no horário de Brasília, e é nele que o painel mostra e grava.
 *
 * O Brasil não tem horário de verão desde 2019, então Brasília é -03:00 o ano inteiro e o
 * offset vai FIXO no texto gravado — o mesmo formato do calendário oficial
 * (lib/calendario-4a.ts) e das séries que já estão no dataset. Para LER um instante com
 * outro fuso (Z, +00:00) a conversão passa pelo fuso nomeado, que é o mesmo que
 * `lib/format.ts` usa para mostrar a série no site: o painel e o site leem a mesma hora.
 */
const FUSO_BRASILIA = "America/Sao_Paulo";
const OFFSET_BRASILIA = "-03:00";

const DATA_PURA = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Hora de parede de Brasília: com "-03:00" escrito ou sem fuso nenhum. A forma sem fuso
 * (`2026-08-02T14:00`) existe no dataset antigo e o site já a lê como Brasília
 * (`paraData` em lib/format.ts), então aqui também — senão o painel mostraria uma hora
 * e o site outra.
 */
const HORA_DE_BRASILIA = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})(?::\d{2}(?:\.\d+)?)?(?:-03:00)?$/;

/** Instante com fuso explícito (Z ou ±HH:mm). Sem fuso o `Date` leria no fuso da MÁQUINA. */
const COM_FUSO_EXPLICITO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/;

/** `<input type="time">` manda "HH:mm" (ou "HH:mm:ss" se alguém mexer no `step`). */
const HORA_DO_CAMPO = /^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d(?:\.\d+)?)?$/;

/** Os dois campos do painel, já na hora de Brasília. `hora` vazia = série só com data. */
export type CamposDataHora = { data: string; hora: string };

const CAMPOS_VAZIOS: CamposDataHora = { data: "", hora: "" };

/** "2026-02-30" casa com o formato mas não existe: o `Date` empurraria para 02/03. */
function dataExiste(data: string) {
  const partes = DATA_PURA.exec(data);
  if (!partes) return false;
  const [ano, mes, dia] = [Number(partes[1]), Number(partes[2]), Number(partes[3])];
  const d = new Date(Date.UTC(ano, mes - 1, dia));
  return d.getUTCFullYear() === ano && d.getUTCMonth() === mes - 1 && d.getUTCDate() === dia;
}

/**
 * Texto gravado em `series.date` -> campos "Data" e "Horário" do painel, em Brasília.
 *
 * Por que não `value.slice(0, 10)` como antes: o campo só tinha a data, então editar a
 * data de uma série das 15:30 regravava "2026-11-28" e APAGAVA a hora. E por que não
 * `toISOString()`/getters de UTC para tirar a hora: isso mostra a hora de Londres, e a
 * série andaria três horas a cada vez que alguém abrisse e salvasse.
 *
 * Ilegível ou vazio volta com os dois campos vazios — quem chama não grava nada até a
 * pessoa escolher uma data.
 */
export function isoParaCamposBrasilia(valor: string | null | undefined): CamposDataHora {
  const texto = (valor ?? "").trim();
  if (!texto) return CAMPOS_VAZIOS;

  if (DATA_PURA.test(texto)) return dataExiste(texto) ? { data: texto, hora: "" } : CAMPOS_VAZIOS;

  // Já está em Brasília: é só recortar, sem passar por `Date` (que não acrescenta nada
  // aqui e só abriria espaço para o fuso da máquina entrar na conta).
  const deParede = HORA_DE_BRASILIA.exec(texto);
  if (deParede) {
    const [, data, hh, mm] = deParede;
    const hora = `${hh}:${mm}`;
    return dataExiste(data) && HORA_DO_CAMPO.test(hora) ? { data, hora } : CAMPOS_VAZIOS;
  }

  if (!COM_FUSO_EXPLICITO.test(texto)) return CAMPOS_VAZIOS;
  const instante = new Date(texto);
  if (Number.isNaN(instante.getTime())) return CAMPOS_VAZIOS;

  const partes: Record<string, string> = {};
  for (const parte of new Intl.DateTimeFormat("en-CA", {
    timeZone: FUSO_BRASILIA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    // h23: com `hour12: false` alguns motores escrevem "24" à meia-noite.
    hourCycle: "h23",
  }).formatToParts(instante)) {
    partes[parte.type] = parte.value;
  }
  return { data: `${partes.year}-${partes.month}-${partes.day}`, hora: `${partes.hour}:${partes.minute}` };
}

/**
 * Campos do painel -> texto de `series.date`.
 *
 * - Com horário: "YYYY-MM-DDTHH:mm:00-03:00" — semifinais e final da 4ª são criadas aqui
 *   e precisam da hora (08:30, 10:30, 14:30); remarcar para a reserva (28/11 19:00) também.
 * - Horário em branco: só a data, exatamente o que o campo antigo gravava.
 * - Data em branco/ilegível, ou horário ilegível: `undefined`, e quem chama NÃO grava. O
 *   schema exige a data (`min(1)`); gravar "" só adiaria o problema para um erro técnico
 *   na hora de salvar o painel inteiro.
 */
export function camposBrasiliaParaIso(data: string, hora: string): string | undefined {
  const dia = data.trim();
  const horario = hora.trim();
  if (!dataExiste(dia)) return undefined;
  if (!horario) return dia;
  const partes = HORA_DO_CAMPO.exec(horario);
  if (!partes) return undefined;
  return `${dia}T${partes[1]}:${partes[2]}:00${OFFSET_BRASILIA}`;
}

/** Data de hoje no calendário de Brasília ("YYYY-MM-DD"), seja qual for o fuso da máquina. */
export function dataDeHojeEmBrasilia(agora: Date = new Date()): string {
  return isoParaCamposBrasilia(agora.toISOString()).data;
}

/**
 * Série nova: data de HOJE e nenhuma hora. Inventar um horário seria pior do que não ter:
 * o site mostraria "00:00" (ou a hora do clique) como se fosse o horário marcado. A hora
 * entra quando a organização preencher o campo.
 */
export function createBlankSeries(defaultFormat: SeriesFormat = "BO3", agora: Date = new Date()): SeriesMatch {
  return {
    id: `serie-${agora.getTime()}`,
    date: dataDeHojeEmBrasilia(agora),
    teamAId: "",
    teamBId: "",
    stage: "REGULAR_SEASON",
    format: defaultFormat,
    games: [],
  };
}

export function cloneDataset(dataset: TournamentDataset): TournamentDataset {
  return structuredClone(dataset);
}

/**
 * Qual `lastUpdatedISO` o rascunho deve passar a carregar depois de um sorteio ao vivo.
 *
 * A rota de sorteio grava por conta própria, então a versão do servidor avança e o
 * rascunho aberto no painel fica para trás — e todo "Salvar" seguinte cairia em 409.
 * Adotar a versão nova resolve isso, MAS só é seguro quando a rota partiu exatamente da
 * versão que este rascunho tem.
 *
 * Se outra pessoa salvou depois que este painel carregou, a rota leu a versão DELA.
 * Carimbar esse número aqui faria a trava de concorrência do PUT parar de disparar: o
 * rascunho velho passaria na conferência de versão e sobrescreveria o trabalho da outra
 * pessoa em silêncio — sem banner, sem cartão de conflito e sem desfazer. Nesse caso a
 * versão antiga PERMANECE, o próximo Salvar cai em 409, e quem está editando escolhe
 * entre recarregar e sobrescrever.
 */
export function proximaVersaoDoRascunho(
  versaoDoRascunho: number | null,
  versaoLida: number | undefined,
  versaoGravada: number | undefined,
): number | null {
  if (versaoGravada === undefined || versaoLida === undefined) return versaoDoRascunho;
  return versaoLida === versaoDoRascunho ? versaoGravada : versaoDoRascunho;
}
