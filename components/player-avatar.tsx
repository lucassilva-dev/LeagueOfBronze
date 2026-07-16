import type { Player } from "@/lib/schema";
import { cn } from "@/lib/utils";

function playerInitials(nick: string) {
  const gameName = nick.split("#")[0].trim() || nick.trim();
  const words = gameName.split(/\s+/).filter(Boolean);
  const letters =
    words.length >= 2 ? words[0][0] + words[1][0] : gameName.replace(/[^A-Za-z0-9]/g, "").slice(0, 2);
  return (letters || gameName.slice(0, 2)).toUpperCase();
}

export function PlayerAvatar({
  player,
  size = 34,
  className,
}: Readonly<{ player: Pick<Player, "nick" | "imageUrl">; size?: number; className?: string }>) {
  const dimension = { width: size, height: size };

  if (player.imageUrl && player.imageUrl.trim()) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={player.imageUrl}
        alt={`Foto de ${player.nick}`}
        style={dimension}
        className={cn(
          "shrink-0 rounded-full border border-border/70 object-cover",
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
        "inline-flex shrink-0 items-center justify-center rounded-full border border-accent2/25 bg-panel2 font-heading font-semibold leading-none text-accent2",
        className,
      )}
      title={player.nick}
    >
      <span style={{ fontSize: Math.round(size * 0.36) }}>{playerInitials(player.nick)}</span>
    </span>
  );
}
