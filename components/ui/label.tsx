import * as React from "react";

import { cn } from "@/lib/utils";

export function Label({
  className,
  ...props
}: Readonly<React.LabelHTMLAttributes<HTMLLabelElement>>) {
  const classNames = cn(
    "mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-muted",
    className,
  );

  if (props.htmlFor) {
    return <label className={classNames} {...props} />;
  }

  return <span className={classNames}>{props.children}</span>;
}
