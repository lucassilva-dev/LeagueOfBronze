import type { Metadata } from "next";

import Transmissao from "@/components/draft/transmissao";
import { Eyebrow, GoldTitle, LobShell } from "@/components/lob/ui";
import { getMessages } from "@/lib/i18n/server";

/**
 * Dinâmica, como toda página do site: a CSP usa nonce por requisição e uma página
 * pré-renderizada sai sem ele (ver o comentário em app/regras/page.tsx). Aqui há um
 * segundo motivo — o conteúdo muda a cada dois segundos, então cache não faz sentido.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Draft ao vivo · League of Bronze",
  description: "Acompanhe o sorteio dos times da 4ª Edição em tempo real.",
};

export default async function DraftPage() {
  const { draft: t } = await getMessages();

  return (
    <LobShell>
      <header style={{ marginBottom: 22 }}>
        <Eyebrow>{t.eyebrow}</Eyebrow>
        <GoldTitle>{t.titulo}</GoldTitle>
        <p style={{ margin: "10px 0 0", color: "var(--lob-muted)", maxWidth: "62ch" }}>{t.subtitulo}</p>
      </header>

      <Transmissao t={t} />
    </LobShell>
  );
}
