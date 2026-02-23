import Link from "next/link";

import { cn } from "@/lib/utils";

export function TeamLink({
  href,
  name,
  className,
}: {
  href: string;
  name: string;
  className?: string;
}) {
  return (
    <Link href={href} className={cn("font-semibold hover:text-accent", className)}>
      {name}
    </Link>
  );
}
