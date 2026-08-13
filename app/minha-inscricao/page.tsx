import type { Metadata } from "next";

import MinhaInscricaoCliente from "@/components/inscricao/minha";
import { Eyebrow, GoldTitle, LobShell } from "@/components/lob/ui";
import { getMessages } from "@/lib/i18n/server";

/**
 * Dinâmica por dois motivos que se somam: a CSP por nonce (ver proxy.ts e o comentário
 * em app/regras/page.tsx) e o fato de a página ser estritamente pessoal — nada aqui
 * pode ser servido de um cache compartilhado.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Minha inscrição · League of Bronze",
  // Página pessoal: não deve ser indexada nem aparecer em busca.
  robots: { index: false, follow: false },
};

export default async function MinhaInscricaoPage() {
  const { inscricao: t } = await getMessages();

  return (
    <LobShell>
      <header style={{ marginBottom: 26 }}>
        <Eyebrow>{t.eyebrow}</Eyebrow>
        <GoldTitle>{t.minhaTitulo}</GoldTitle>
        <p style={{ margin: "10px 0 0", color: "var(--lob-muted)", maxWidth: "62ch" }}>{t.minhaSubtitulo}</p>
      </header>

      <MinhaInscricaoCliente t={t} />
    </LobShell>
  );
}
