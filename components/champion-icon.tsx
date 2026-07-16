import { championIconUrl, resolveChampion } from "@/lib/champions";
import { cn } from "@/lib/utils";

export function ChampionIcon({
  champion,
  size = 24,
  showName = false,
  className,
}: Readonly<{ champion?: string | null; size?: number; showName?: boolean; className?: string }>) {
  const dimension = { width: size, height: size };
  const resolved = resolveChampion(champion);
  const raw = champion?.trim() ?? "";

  const icon = resolved ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={championIconUrl(resolved.id)}
      alt={resolved.name}
      title={resolved.name}
      style={dimension}
      loading="lazy"
      className="shrink-0 rounded-md border border-border/60 object-cover"
    />
  ) : (
    <span
      style={dimension}
      title={raw || "Campeão não informado"}
      aria-hidden
      className="inline-flex shrink-0 items-center justify-center rounded-md border border-border/60 bg-panel2/70 text-[11px] font-semibold text-muted"
    >
      {raw ? raw.slice(0, 2).toUpperCase() : "—"}
    </span>
  );

  if (!showName) {
    return <span className={cn("inline-flex", className)}>{icon}</span>;
  }

  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      {icon}
      <span className="truncate">{resolved?.name ?? raw ?? "—"}</span>
    </span>
  );
}
