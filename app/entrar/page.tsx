import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";

import Entrar from "@/components/inscricao/entrar";
import { Eyebrow, GoldTitle, LobShell } from "@/components/lob/ui";
import { getMessages } from "@/lib/i18n/server";
import { JOGADOR_COOKIE, identidadePorToken } from "@/lib/jogadores/auth";

/** Dinâmica pela CSP por nonce e porque lê a sessão. */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Entrar · League of Bronze",
  robots: { index: false, follow: false },
};

export default async function EntrarPage() {
  const { inscricao: t } = await getMessages();

  // Quem já está logado não tem o que fazer aqui. Mostrar o formulário de novo só
  // convidaria a pessoa a digitar a senha sem necessidade.
  const token = (await cookies()).get(JOGADOR_COOKIE)?.value;
  const jogador = await identidadePorToken(token).catch(() => null);
  if (jogador) redirect("/minha-inscricao");

  return (
    <LobShell>
      <header style={{ marginBottom: 26 }}>
        <Eyebrow>{t.eyebrow}</Eyebrow>
        <GoldTitle>{t.entrarTitulo}</GoldTitle>
        <p style={{ margin: "10px 0 0", color: "var(--lob-muted)", maxWidth: "58ch" }}>
          {t.entrarPaginaSubtitulo}
        </p>
      </header>

      <Entrar t={t} />

      <p style={{ marginTop: 24 }}>
        <Link href="/" style={{ color: "var(--lob-muted)", fontSize: 13 }}>
          {t.entrarVoltar}
        </Link>
      </p>
    </LobShell>
  );
}
