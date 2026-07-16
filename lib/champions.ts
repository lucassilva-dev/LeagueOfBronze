import championsData from "@/data/champions.json";

export type ChampionRef = { id: string; name: string };

export const CHAMPION_PATCH: string = championsData.version;
export const CHAMPIONS: ChampionRef[] = championsData.champions;

// Ícone quadrado do Data Dragon (id canônico, ex.: MonkeyKing.png para Wukong).
export function championIconUrl(id: string) {
  return `https://ddragon.leagueoflegends.com/cdn/${CHAMPION_PATCH}/img/champion/${encodeURIComponent(
    id,
  )}.png`;
}

// Normaliza para casar texto livre digitado no admin com o id/nome canônico.
function normalizeChampionKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

const championByKey = new Map<string, ChampionRef>();
for (const champion of CHAMPIONS) {
  championByKey.set(normalizeChampionKey(champion.id), champion);
  championByKey.set(normalizeChampionKey(champion.name), champion);
}

export function resolveChampion(input?: string | null): ChampionRef | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  return championByKey.get(normalizeChampionKey(trimmed)) ?? null;
}

// Id canônico (para ícone) a partir do texto livre; null se não reconhecido.
export function resolveChampionId(input?: string | null): string | null {
  return resolveChampion(input)?.id ?? null;
}

// Nome de exibição (pt-BR) a partir de qualquer forma; devolve o próprio texto se não reconhecido.
export function getChampionDisplayName(input?: string | null): string {
  return resolveChampion(input)?.name ?? (input?.trim() ?? "");
}
