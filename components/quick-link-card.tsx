import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { Card } from "@/components/ui/card";

export function QuickLinkCard({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <Link href={href} className="block">
      <Card className="group h-full p-4 transition hover:-translate-y-0.5 hover:shadow-glow-strong">
        <div className="flex h-full items-start justify-between gap-3">
          <div>
            <p className="font-display text-base font-bold tracking-wide">{title}</p>
            <p className="mt-2 text-sm text-muted">{description}</p>
          </div>
          <ChevronRight className="mt-1 h-4 w-4 text-muted transition group-hover:text-accent" />
        </div>
      </Card>
    </Link>
  );
}
