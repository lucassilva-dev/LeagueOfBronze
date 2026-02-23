import * as React from "react";

import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "muted" | "accent" | "success" | "danger" | "outline";

const styles: Record<BadgeVariant, string> = {
  default: "bg-white/10 text-text border border-white/10",
  muted: "bg-white/5 text-muted border border-white/10",
  accent: "bg-accent/15 text-accent border border-accent/30",
  success: "bg-success/15 text-emerald-300 border border-success/30",
  danger: "bg-danger/15 text-red-300 border border-danger/30",
  outline: "bg-transparent text-text border border-border/80",
};

export function Badge({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold tracking-wide",
        styles[variant],
        className,
      )}
      {...props}
    />
  );
}
