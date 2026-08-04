import Link from "next/link";

import { PageShell } from "@/components/page-shell";
import { Card } from "@/components/ui/card";
import { getMessages } from "@/lib/i18n/server";

export default async function NotFound() {
  const { compartilhados: t } = await getMessages();

  return (
    <PageShell>
      <Card className="mx-auto max-w-xl p-8 text-center">
        <h1 className="font-display text-2xl font-bold tracking-wide">
          {t.naoEncontradoTitulo}
        </h1>
        <p className="mt-2 text-sm text-muted">{t.naoEncontradoTexto}</p>
        <Link href="/" className="mt-4 inline-flex font-semibold text-accent hover:underline">
          {t.naoEncontradoVoltar}
        </Link>
      </Card>
    </PageShell>
  );
}
