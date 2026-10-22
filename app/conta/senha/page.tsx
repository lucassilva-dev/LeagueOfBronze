import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";

import TrocarSenha from "@/components/inscricao/trocar-senha";
import { Eyebrow } from "@/components/lob/ui";
import { getMessages } from "@/lib/i18n/server";
import { JOGADOR_COOKIE, identidadePorToken } from "@/lib/jogadores/auth";
import { destinoDeVolta } from "@/lib/destino-de-volta";

/** Dinâmica pela CSP por nonce e porque lê a sessão. */
export const dynamic = "force-dynamic";

/** Título no idioma da visita; página pessoal, fora dos buscadores. */
export async function generateMetadata(): Promise<Metadata> {
  const { inscricao: t } = await getMessages();
  return { title: t.contaSenhaTituloAba, robots: { index: false, follow: false } };
}

/**
 * /conta/senha — o jogador troca a própria senha.
 *
 * É o destino do aviso «Troque sua senha» do cabeçalho e de quem entra com a senha
 * provisória que a organização gerou (o /entrar manda direto para cá). Sem esta tela, a
 * provisória — que a organização conhece — valia para sempre (INS-01).
 *
 * Mesmo layout do /entrar: uma tela com um único objetivo, centralizada. O SiteFrame (por
 * fora) já põe cabeçalho, rodapé e o <main>.
 *
 * Sem sessão de JOGADOR, vai para o /entrar com volta para cá. A sessão de quem tem a troca
 * pendente vale normalmente: exigir a troca nunca pode impedir de chegar a esta tela.
 */
export default async function TrocarSenhaPage({
  searchParams,
}: Readonly<{ searchParams: Promise<Record<string, string | string[] | undefined>> }>) {
  const { inscricao: t } = await getMessages();
  // Lista fechada de destinos (lib/destino-de-volta.ts): nunca o que vier cru na URL.
  const volta = destinoDeVolta((await searchParams).volta);

  const jar = await cookies();
  const jogador = await identidadePorToken(jar.get(JOGADOR_COOKIE)?.value).catch(() => null);
  if (!jogador) redirect("/entrar?volta=/conta/senha");

  return (
    // <div>, não <main>: o <main id="conteudo"> é um só e mora no SiteFrame, por fora.
    <div
      style={{
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
            style={{ fontSize: "clamp(34px,7vw,52px)", lineHeight: 1, margin: "12px 0 calc(12px - 0.42em)" }}
          >
            {t.contaSenhaTitulo}
          </h1>
          <p style={{ margin: 0, color: "var(--lob-muted)", fontSize: 14, lineHeight: 1.6 }}>
            {t.contaSenhaSubtitulo}
          </p>
        </header>

        <TrocarSenha t={t} obrigatoria={jogador.mustChangePassword} email={jogador.email} volta={volta} />

        <p style={{ margin: "22px 0 0", textAlign: "center" }}>
          <Link href="/" style={{ color: "var(--lob-muted)", fontSize: 13 }}>
            {t.entrarVoltar}
          </Link>
        </p>
      </div>
    </div>
  );
}
