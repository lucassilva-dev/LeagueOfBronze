import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/utils";

type LabelProps = Readonly<
  ComponentPropsWithoutRef<"label"> & {
    htmlFor: string;
  }
>;

type LabelTextProps = Readonly<ComponentPropsWithoutRef<"span">>;

export function Label({ className, htmlFor, ...props }: LabelProps) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn("mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-muted", className)}
      {...props}
    />
  );
}

export function LabelText({ className, ...props }: LabelTextProps) {
  return (
    <span
      className={cn("mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-muted", className)}
      {...props}
    />
  );
}
