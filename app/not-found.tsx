import Link from "next/link";

import { PageShell } from "@/components/page-shell";
import { Card } from "@/components/ui/card";

export default function NotFound() {
  return (
    <PageShell>
      <Card className="mx-auto max-w-xl p-8 text-center">
        <h1 className="font-display text-2xl font-bold tracking-wide">Página não encontrada</h1>
        <p className="mt-2 text-sm text-muted">
          O recurso solicitado não existe ou foi removido.
        </p>
        <Link href="/" className="mt-4 inline-flex font-semibold text-accent hover:underline">
          Voltar para Home
        </Link>
      </Card>
    </PageShell>
  );
}
