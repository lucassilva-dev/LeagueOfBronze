import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export function PageHero({
  badge,
  title,
  description,
  extra,
}: {
  badge?: string;
  title: string;
  description?: string;
  extra?: React.ReactNode;
}) {
  return (
    <Card className="relative overflow-hidden p-5 sm:p-7">
      <div className="pointer-events-none absolute inset-0 bg-hero-radial opacity-90" />
      <div className="relative">
        {badge ? <Badge variant="accent">{badge}</Badge> : null}
        <h1 className="mt-3 font-display text-2xl font-black tracking-wide sm:text-4xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 max-w-3xl text-sm text-muted sm:text-base">{description}</p>
        ) : null}
        {extra ? <div className="mt-4">{extra}</div> : null}
      </div>
    </Card>
  );
}
