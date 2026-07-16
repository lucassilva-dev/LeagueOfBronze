import type { Team } from "@/lib/schema";
import { cn } from "@/lib/utils";

const STOPWORDS = new Set(["de", "do", "da", "dos", "das", "e"]);

function teamInitials(name: string) {
  const words = name
    .trim()
    .split(/\s+/)
    .filter((w) => w && !STOPWORDS.has(w.toLowerCase()));
  const pick = words.length ? words : name.trim().split(/\s+/);
  const letters = pick.slice(0, 2).map((w) => w[0]);
  return (letters.join("") || name.slice(0, 2)).toUpperCase();
}

export function TeamCrest({
  team,
  size = 28,
  className,
}: Readonly<{ team: Pick<Team, "name" | "imageUrl">; size?: number; className?: string }>) {
  const dimension = { width: size, height: size };

  if (team.imageUrl && team.imageUrl.trim()) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={team.imageUrl}
        alt={`Escudo ${team.name}`}
        style={dimension}
        className={cn(
          "shrink-0 rounded-lg border border-border/70 object-cover",
          className,
        )}
      />
    );
  }

  return (
    <span
      style={dimension}
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-lg border border-accent2/25 bg-bronze font-display leading-none text-bg shadow-bronze",
        className,
      )}
      title={team.name}
    >
      <span style={{ fontSize: Math.round(size * 0.4) }}>{teamInitials(team.name)}</span>
    </span>
  );
}
