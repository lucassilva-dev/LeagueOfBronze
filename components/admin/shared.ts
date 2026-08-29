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
  // 4ª Edição. Estas quatro NÃO tocam no rascunho do campeonato: os dados vivem em
  // tabelas próprias, com escrita concorrente, e são buscados pela própria seção —
  // mesmo padrão da aba de usuários.
  | "e4-config"
  | "e4-inscritos"
  | "e4-pagamentos"
  | "e4-times";
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

export function createBlankSeries(defaultFormat: SeriesFormat = "BO3"): SeriesMatch {
  const now = new Date();
  const isoDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate(),
  ).padStart(2, "0")}`;
  return {
    id: `serie-${Date.now()}`,
    date: isoDate,
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
