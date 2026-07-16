import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export function PageHero({
  badge,
  title,
  description,
  extra,
  media,
}: Readonly<{
  badge?: string;
  title: string;
  description?: string;
  extra?: React.ReactNode;
  media?: React.ReactNode;
}>) {
  return (
    <Card className="relative overflow-hidden p-5 sm:p-7">
      <div className="pointer-events-none absolute inset-0 bg-hero-radial opacity-90" />
      <div className="relative">
        {badge ? <Badge variant="accent">{badge}</Badge> : null}
        <div className="mt-3 flex items-center gap-3 sm:gap-4">
          {media ? <span className="shrink-0">{media}</span> : null}
          <h1 className="font-heading text-[clamp(30px,5.4vw,54px)] font-bold leading-[1.02] tracking-tight">
            {title}
          </h1>
        </div>
        {description ? (
          <p className="mt-2 max-w-3xl text-sm text-muted sm:text-base">{description}</p>
        ) : null}
        {extra ? <div className="mt-4">{extra}</div> : null}
      </div>
    </Card>
  );
}
