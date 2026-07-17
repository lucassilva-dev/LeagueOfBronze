// ============================================================
// Design system "esports Bronze Hextech" — mapas de cor/rótulo
// por elo, rota e time. Fonte: design oficial "Os Bronzes".
// ============================================================

function normalizeKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

// ---------- ROTAS ----------
export type RoleMeta = { label: string; short: string; color: string; order: number };

const ROLE_TABLE: Record<string, RoleMeta> = {
  TOP: { label: "Topo", short: "TOP", color: "#e0894a", order: 1 },
  JUNG: { label: "Selva", short: "SEL", color: "#5fbf6a", order: 2 },
  MID: { label: "Meio", short: "MID", color: "#5aa2ff", order: 3 },
  ADC: { label: "Atirador", short: "ADC", color: "#e85c6a", order: 4 },
  SUP: { label: "Suporte", short: "SUP", color: "#c79be0", order: 5 },
};

const ROLE_ALIASES: Record<string, keyof typeof ROLE_TABLE> = {
  TOP: "TOP",
  TOPO: "TOP",
  TOPLANE: "TOP",
  JUNG: "JUNG",
  JG: "JUNG",
  SELVA: "JUNG",
  JUNGLER: "JUNG",
  JUNGLE: "JUNG",
  MID: "MID",
  MEIO: "MID",
  MIDLANE: "MID",
  ADC: "ADC",
  ATIRADOR: "ADC",
  ADCARRY: "ADC",
  BOT: "ADC",
  SUP: "SUP",
  SUPORTE: "SUP",
  SUPORT: "SUP",
  SUPPORT: "SUP",
};

const ROLE_FALLBACK: RoleMeta = { label: "Rota", short: "—", color: "#c98a4b", order: 9 };

export function resolveRole(role?: string | null): RoleMeta {
  if (!role) return ROLE_FALLBACK;
  const key = ROLE_ALIASES[normalizeKey(role)];
  return key ? ROLE_TABLE[key] : ROLE_FALLBACK;
}

// ---------- ELOS ----------
export type EloMeta = { label: string; color: string; key: string; pts: number };

const ELO_TABLE: Record<string, EloMeta> = {
  FERRO: { label: "Ferro", color: "#6f6a63", key: "ferro", pts: 1 },
  BRONZE: { label: "Bronze", color: "#c07b43", key: "bronze", pts: 2 },
  PRATA: { label: "Prata", color: "#b9c4cc", key: "prata", pts: 3 },
  OURO: { label: "Ouro", color: "#e6b325", key: "ouro", pts: 4 },
  PLATINA: { label: "Platina", color: "#35c4c0", key: "platina", pts: 5 },
  ESMERALDA: { label: "Esmeralda", color: "#2ecc71", key: "esmeralda", pts: 6 },
  DIAMANTE: { label: "Diamante", color: "#5aa2ff", key: "diamante", pts: 8 },
  MESTRE: { label: "Mestre", color: "#b06bd6", key: "mestre", pts: 10 },
  GRAOMESTRE: { label: "Grão-Mestre", color: "#e85c6a", key: "grao-mestre", pts: 12 },
  DESAFIANTE: { label: "Desafiante", color: "#f2e2b3", key: "desafiante", pts: 15 },
};

const ELO_ALIASES: Record<string, keyof typeof ELO_TABLE> = {
  FERR: "FERRO",
  FE: "FERRO",
  FERRO: "FERRO",
  BRON: "BRONZE",
  BRZ: "BRONZE",
  BRONZE: "BRONZE",
  PRAT: "PRATA",
  PRATA: "PRATA",
  OUR: "OURO",
  OURO: "OURO",
  GOLD: "OURO",
  PLAT: "PLATINA",
  PLATINA: "PLATINA",
  ESME: "ESMERALDA",
  EMER: "ESMERALDA",
  ESMERALDA: "ESMERALDA",
  DIAM: "DIAMANTE",
  DIAMANTE: "DIAMANTE",
  MEST: "MESTRE",
  MASTER: "MESTRE",
  MESTRE: "MESTRE",
  GM: "GRAOMESTRE",
  GRAO: "GRAOMESTRE",
  GRAOMESTRE: "GRAOMESTRE",
  CHAL: "DESAFIANTE",
  DESAF: "DESAFIANTE",
  DESAFIANTE: "DESAFIANTE",
};

export function resolveElo(elo?: string | null): EloMeta | null {
  if (!elo) return null;
  const norm = normalizeKey(elo);
  if (ELO_TABLE[norm]) return ELO_TABLE[norm];
  const alias = ELO_ALIASES[norm];
  if (alias) return ELO_TABLE[alias];
  // prefixo (ex.: "DIAMANTE 2")
  for (const key of Object.keys(ELO_TABLE)) {
    if (norm.startsWith(key.slice(0, 4))) return ELO_TABLE[key];
  }
  return null;
}

export function eloSvgUrl(key: string) {
  return `/elo/${key}.png`;
}

export const ELO_ORDER: EloMeta[] = [
  "FERRO",
  "BRONZE",
  "PRATA",
  "OURO",
  "PLATINA",
  "ESMERALDA",
  "DIAMANTE",
  "MESTRE",
  "GRAOMESTRE",
  "DESAFIANTE",
].map((k) => ELO_TABLE[k]);

// ---------- TIMES (cor de destaque) ----------
const TEAM_COLORS: Record<string, string> = {
  "pantera-cor-de-goza": "#e0894a",
  "vanguarda-de-ferro": "#5aa2ff",
  "presas-shurima": "#5fbf6a",
  time4: "#e6b325",
  "capangas-motomoto": "#e85c6a",
  "lgtv-wins": "#b06bd6",
};

const TEAM_FALLBACK_PALETTE = [
  "#e0894a",
  "#5aa2ff",
  "#5fbf6a",
  "#e6b325",
  "#e85c6a",
  "#b06bd6",
  "#57d8cb",
  "#f2e2b3",
];

export function teamColor(teamId: string): string {
  if (TEAM_COLORS[teamId]) return TEAM_COLORS[teamId];
  let hash = 0;
  for (let i = 0; i < teamId.length; i += 1) hash = (hash * 31 + teamId.charCodeAt(i)) >>> 0;
  return TEAM_FALLBACK_PALETTE[hash % TEAM_FALLBACK_PALETTE.length];
}

// Gradiente dourado dos títulos.
export const GOLD_TEXT = "linear-gradient(180deg,#f6d6a2,#dc9f57 46%,#a5692f)";
