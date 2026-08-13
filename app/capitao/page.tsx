import type { Metadata } from "next";

import PainelCapitao from "@/components/draft/painel-capitao";
import { Eyebrow, GoldTitle } from "@/components/lob/ui";
import { getMessages } from "@/lib/i18n/server";

/** Dinâmica pela CSP por nonce e porque é uma tela pessoal — nada aqui pode ser cacheado. */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Painel do capitão · League of Bronze",
  // Tela de trabalho de uma pessoa específica: não é conteúdo para busca.
  robots: { index: false, follow: false },
};

export default async function CapitaoPage() {
  const { draft: t } = await getMessages();

  return (
    <>
      <header style={{ marginBottom: 22 }}>
        <Eyebrow>{t.eyebrow}</Eyebrow>
        <GoldTitle>{t.capitaoTitulo}</GoldTitle>
        <p style={{ margin: "10px 0 0", color: "var(--lob-muted)", maxWidth: "62ch" }}>
          {t.capitaoSubtitulo}
        </p>
      </header>

      <PainelCapitao t={t} />
    </>
  );
}
