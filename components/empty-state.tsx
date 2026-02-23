import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type EmptyStateProps = {
  readonly title: string;
  readonly description: string;
};

export function EmptyState({
  title,
  description,
}: EmptyStateProps) {
  return (
    <Card className="border-dashed border-white/10">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-24 rounded-xl border border-dashed border-white/10 bg-white/[0.02]" />
      </CardContent>
    </Card>
  );
}
