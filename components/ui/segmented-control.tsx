"use client";

import { cn } from "@/lib/utils";

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

export function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
  className,
}: Readonly<{
  label?: string;
  value: T;
  options: SegmentedOption<T>[];
  onChange: (value: T) => void;
  className?: string;
}>) {
  return (
    <div className={cn("space-y-2", className)}>
      {label ? (
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
          {label}
        </p>
      ) : null}
      <div className="max-w-full overflow-x-auto pb-1">
        <div className="inline-flex w-max min-w-full rounded-2xl border border-border/70 bg-panel/70 p-1 sm:min-w-0 sm:w-auto">
          {options.map((option) => {
            const active = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                className={cn(
                  "shrink-0 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-semibold transition sm:min-w-[96px]",
                  active
                    ? "bg-accent/20 text-accent shadow-glow"
                    : "text-muted hover:bg-white/5 hover:text-text",
                )}
                aria-pressed={active}
                onClick={() => onChange(option.value)}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
