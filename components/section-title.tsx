import { cn } from "@/lib/utils";

export function SectionTitle({
  title,
  subtitle,
  className,
}: Readonly<{
  title: string;
  subtitle?: string;
  className?: string;
}>) {
  return (
    <div className={cn("space-y-1", className)}>
      <h2 className="font-heading text-xl font-semibold tracking-wide sm:text-2xl">
        {title}
      </h2>
      {subtitle ? <p className="text-sm text-muted">{subtitle}</p> : null}
    </div>
  );
}
