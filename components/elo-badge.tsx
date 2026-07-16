import { cn } from "@/lib/utils";

type EloTier = {
  name: string;
  from: string;
  to: string;
  gem: string;
};

// Emblemas ORIGINAIS (não são a arte da Riot): um brasão com gradiente por tier.
const ELO_TIERS: Record<string, EloTier> = {
  FERRO: { name: "Ferro", from: "#8a8f98", to: "#3f434a", gem: "#c9ced6" },
  BRONZE: { name: "Bronze", from: "#d68a4c", to: "#7a4a22", gem: "#f2c199" },
  PRATA: { name: "Prata", from: "#d8dde3", to: "#8a929c", gem: "#ffffff" },
  OURO: { name: "Ouro", from: "#f7d066", to: "#b8860b", gem: "#fff2c2" },
  PLATINA: { name: "Platina", from: "#54d6c9", to: "#2b8f88", gem: "#c9fff8" },
  ESMERALDA: { name: "Esmeralda", from: "#43d67f", to: "#1e8f4e", gem: "#c6ffdd" },
  DIAMANTE: { name: "Diamante", from: "#7cc0ff", to: "#3b7ddd", gem: "#d6ecff" },
  MESTRE: { name: "Mestre", from: "#c07bff", to: "#7b3fd1", gem: "#ecd6ff" },
  GRAOMESTRE: { name: "Grão-Mestre", from: "#ff6b6b", to: "#b3261e", gem: "#ffd2d2" },
  DESAFIANTE: { name: "Desafiante", from: "#f2d47a", to: "#d98f2b", gem: "#e8fbff" },
};

const ELO_ALIASES: Record<string, keyof typeof ELO_TIERS> = {
  FERR: "FERRO",
  FE: "FERRO",
  BRON: "BRONZE",
  BRZ: "BRONZE",
  PRAT: "PRATA",
  OURO: "OURO",
  OUR: "OURO",
  GOLD: "OURO",
  PLAT: "PLATINA",
  ESME: "ESMERALDA",
  EMER: "ESMERALDA",
  DIAM: "DIAMANTE",
  MEST: "MESTRE",
  MASTER: "MESTRE",
  GM: "GRAOMESTRE",
  GRAO: "GRAOMESTRE",
  GRAOMESTRE: "GRAOMESTRE",
  CHAL: "DESAFIANTE",
  DESAF: "DESAFIANTE",
};

function resolveTier(elo: string): { key: string; tier: EloTier } | null {
  const norm = elo
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "");
  if (ELO_TIERS[norm]) return { key: norm, tier: ELO_TIERS[norm] };
  if (ELO_ALIASES[norm]) {
    const key = ELO_ALIASES[norm];
    return { key, tier: ELO_TIERS[key] };
  }
  // prefixo (ex.: "DIAMANTE 2")
  for (const key of Object.keys(ELO_TIERS)) {
    if (norm.startsWith(key.slice(0, 4))) return { key, tier: ELO_TIERS[key] };
  }
  return null;
}

export function EloBadge({
  elo,
  size = 22,
  showLabel = false,
  className,
}: Readonly<{ elo: string; size?: number; showLabel?: boolean; className?: string }>) {
  const resolved = resolveTier(elo);

  if (!resolved) {
    // fallback: código cru em pílula
    return (
      <span
        className={cn(
          "inline-flex items-center rounded-md border border-border/70 bg-panel2/60 px-1.5 py-0.5 text-[11px] font-semibold tracking-wide text-muted",
          className,
        )}
        title={elo}
      >
        {elo}
      </span>
    );
  }

  const { key, tier } = resolved;
  const gradId = `elo-grad-${key}`;

  const svg = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 28"
      role="img"
      aria-label={`Elo ${tier.name}`}
      className="shrink-0 drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={tier.from} />
          <stop offset="1" stopColor={tier.to} />
        </linearGradient>
      </defs>
      <path
        d="M12 1 L22 5 V13.5 C22 20.2 17.4 24.9 12 27 C6.6 24.9 2 20.2 2 13.5 V5 Z"
        fill={`url(#${gradId})`}
        stroke="rgba(0,0,0,0.35)"
        strokeWidth="1"
      />
      <path
        d="M12 1 L22 5 V13.5 C22 20.2 17.4 24.9 12 27 C6.6 24.9 2 20.2 2 13.5 V5 Z"
        fill="none"
        stroke="rgba(255,255,255,0.28)"
        strokeWidth="0.9"
        transform="scale(0.86) translate(2 2.2)"
      />
      <path d="M12 8.5 L16 13 L12 17.5 L8 13 Z" fill={tier.gem} opacity="0.92" />
      <path d="M12 8.5 L16 13 L12 13 Z" fill="#ffffff" opacity="0.35" />
    </svg>
  );

  if (!showLabel) {
    return (
      <span className={cn("inline-flex", className)} title={tier.name}>
        {svg}
      </span>
    );
  }

  return (
    <span className={cn("inline-flex items-center gap-1.5", className)} title={tier.name}>
      {svg}
      <span className="text-xs font-semibold tracking-wide">{tier.name}</span>
    </span>
  );
}
