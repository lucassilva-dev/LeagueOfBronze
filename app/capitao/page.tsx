import type { Metadata } from "next";

import PainelCapitao from "@/components/draft/painel-capitao";
import { Eyebrow, GoldTitle, LobShell } from "@/components/lob/ui";
import { metadadosDaPagina } from "@/lib/i18n/metadados";
import { getMessages } from "@/lib/i18n/server";

/** Dinâmica pela CSP por nonce e porque é uma tela pessoal — nada aqui pode ser cacheado. */
export const dynamic = "force-dynamic";

/** Título da aba no idioma da visita ("Captain panel" em inglês). */
export async function generateMetadata(): Promise<Metadata> {
  return {
    ...(await metadadosDaPagina("capitao")),
    // Tela de trabalho de uma pessoa específica: não é conteúdo para busca.
    robots: { index: false, follow: false },
  };
}

export default async function CapitaoPage() {
  const { draft: t } = await getMessages();

  return (
    <LobShell>
      <header style={{ marginBottom: 22 }}>
        <Eyebrow>{t.eyebrow}</Eyebrow>
        <GoldTitle>{t.capitaoTitulo}</GoldTitle>
        <p style={{ margin: "10px 0 0", color: "var(--lob-muted)", maxWidth: "62ch" }}>
          {t.capitaoSubtitulo}
        </p>
      </header>

      <PainelCapitao t={t} />
    </LobShell>
  );
}
