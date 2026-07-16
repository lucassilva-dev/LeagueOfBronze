import { cn } from "@/lib/utils";

type EloTier = { name: string; slug: string };

// Emblemas reais de rank do LoL (Community Dragon — mini-crests).
const ELO_TIERS: Record<string, EloTier> = {
  FERRO: { name: "Ferro", slug: "iron" },
  BRONZE: { name: "Bronze", slug: "bronze" },
  PRATA: { name: "Prata", slug: "silver" },
  OURO: { name: "Ouro", slug: "gold" },
  PLATINA: { name: "Platina", slug: "platinum" },
  ESMERALDA: { name: "Esmeralda", slug: "emerald" },
  DIAMANTE: { name: "Diamante", slug: "diamond" },
  MESTRE: { name: "Mestre", slug: "master" },
  GRAOMESTRE: { name: "Grão-Mestre", slug: "grandmaster" },
  DESAFIANTE: { name: "Desafiante", slug: "challenger" },
};

const ELO_ALIASES: Record<string, keyof typeof ELO_TIERS> = {
  FERR: "FERRO",
  FE: "FERRO",
  BRON: "BRONZE",
  BRZ: "BRONZE",
  PRAT: "PRATA",
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
  CHAL: "DESAFIANTE",
  DESAF: "DESAFIANTE",
};

function emblemUrl(slug: string) {
  return `https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/images/ranked-mini-crests/${slug}.svg`;
}

function resolveTier(elo: string): EloTier | null {
  const norm = elo
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "");
  if (ELO_TIERS[norm]) return ELO_TIERS[norm];
  if (ELO_ALIASES[norm]) return ELO_TIERS[ELO_ALIASES[norm]];
  for (const key of Object.keys(ELO_TIERS)) {
    if (norm.startsWith(key.slice(0, 4))) return ELO_TIERS[key];
  }
  return null;
}

export function EloBadge({
  elo,
  size = 24,
  showLabel = false,
  className,
}: Readonly<{ elo: string; size?: number; showLabel?: boolean; className?: string }>) {
  const tier = resolveTier(elo);

  if (!tier) {
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

  const icon = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={emblemUrl(tier.slug)}
      alt={`Elo ${tier.name}`}
      title={tier.name}
      width={size}
      height={size}
      className="shrink-0 object-contain drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]"
    />
  );

  if (!showLabel) {
    return (
      <span className={cn("inline-flex", className)} title={tier.name}>
        {icon}
      </span>
    );
  }

  return (
    <span className={cn("inline-flex items-center gap-1.5", className)} title={tier.name}>
      {icon}
      <span className="text-xs font-semibold tracking-wide">{tier.name}</span>
    </span>
  );
}
