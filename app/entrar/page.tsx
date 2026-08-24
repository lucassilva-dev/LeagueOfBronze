import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";

import Entrar from "@/components/inscricao/entrar";
import { Eyebrow } from "@/components/lob/ui";
import { getMessages } from "@/lib/i18n/server";
import { JOGADOR_COOKIE, identidadePorToken } from "@/lib/jogadores/auth";

/** Dinâmica pela CSP por nonce e porque lê a sessão. */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Entrar · League of Bronze",
  robots: { index: false, follow: false },
};

/**
 * Layout PRÓPRIO, sem o `LobShell`.
 *
 * O shell padrão espalha o conteúdo por 1280px, o que serve para tabela e elenco mas
 * deixa um formulário de login encolhido no canto esquerdo com meia tela vazia ao
 * lado. Uma tela com um único objetivo se centraliza e para de competir com o resto.
 */
export default async function EntrarPage() {
  const { inscricao: t } = await getMessages();

  // Quem já está logado não tem o que fazer aqui. Mostrar o formulário de novo só
  // convidaria a pessoa a digitar a senha sem necessidade.
  const token = (await cookies()).get(JOGADOR_COOKIE)?.value;
  const jogador = await identidadePorToken(token).catch(() => null);
  if (jogador) redirect("/minha-inscricao");

  return (
    <main
      style={{
        // Ocupa a altura útil entre cabeçalho e rodapé para o cartão ficar no meio da
        // tela, e não colado no topo com um vazio embaixo.
        minHeight: "calc(100vh - 220px)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 22,
        padding: "clamp(40px,8vw,72px) clamp(16px,4vw,24px)",
      }}
    >
      <div style={{ width: "100%", maxWidth: 430 }}>
        <header style={{ marginBottom: 22, textAlign: "center" }}>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <Eyebrow>{t.eyebrow}</Eyebrow>
          </div>
          <h1
            className="lob-h1 gold-text"
            style={{ fontSize: "clamp(38px,8vw,60px)", lineHeight: 1, margin: "12px 0 12px" }}
          >
            {t.entrarTitulo}
          </h1>
          <p style={{ margin: 0, color: "var(--lob-muted)", fontSize: 14, lineHeight: 1.6 }}>
            {t.entrarPaginaSubtitulo}
          </p>
        </header>

        <Entrar t={t} />

        <p style={{ margin: "22px 0 0", textAlign: "center" }}>
          <Link href="/" style={{ color: "var(--lob-muted)", fontSize: 13 }}>
            {t.entrarVoltar}
          </Link>
        </p>
      </div>
    </main>
  );
}
