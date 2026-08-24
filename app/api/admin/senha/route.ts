import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";

import {
  getAdminIdentity,
  getPasswordPepper,
  isNewAuthEnabled,
  issueSessionCookie,
} from "@/lib/admin-auth";
import { createSupabaseAdminClient } from "@/lib/data-store";
import { findUserById } from "@/lib/security/admin-store";
import { hashPassword, validatePasswordStrength, verifyPassword } from "@/lib/security/password";
import { respostaDeErro } from "@/lib/security/resposta-erro";
import { comPisoDeTempo, lerCorpoPublico } from "@/lib/security/rota-publica";

export const dynamic = "force-dynamic";

/**
 * Troca de senha PELA PRÓPRIA PESSOA da organização.
 *
 * Faltava, e a ausência tinha consequência real: a criação de conta já marcava
 * `must_change_password = true`, o painel já exibia o aviso "troca de senha
 * pendente"... e não havia nada que trocasse. O único caminho era o master redefinir
 * pelo painel — o que deixa o master sabendo a senha do outro, para sempre, e mantém
 * a conta marcada como pendente do mesmo jeito.
 *
 * Sem esta rota, criar uma conta para outra pessoa era criar uma conta que ela nunca
 * poderia tornar só dela.
 */

const corpoSchema = z.object({
  senhaAtual: z.string().min(1).max(200),
  senhaNova: z.string().min(1).max(200),
});

export async function POST(request: NextRequest) {
  const inicio = Date.now();

  if (!isNewAuthEnabled()) {
    // No modo legado a "conta" é uma senha única do ambiente, não uma linha no banco:
    // não há o que trocar por aqui, e fingir que há seria pior.
    return NextResponse.json(
      { error: "Este ambiente usa a senha única de configuração. Troque-a nas variáveis do servidor." },
      { status: 409 },
    );
  }

  const lido = await lerCorpoPublico(request);
  if (!lido.ok) return lido.response;

  const identidade = await getAdminIdentity(request);
  if (!identidade || identidade.legacy) {
    return NextResponse.json({ error: "Entre no painel primeiro." }, { status: 401 });
  }

  const parsed = corpoSchema.safeParse(lido.corpo);
  if (!parsed.success) {
    return NextResponse.json({ error: "Preencha os dois campos." }, { status: 400 });
  }
  const { senhaAtual, senhaNova } = parsed.data;

  const fraca = validatePasswordStrength(senhaNova);
  if (fraca) return NextResponse.json({ error: fraca }, { status: 400 });

  if (senhaAtual === senhaNova) {
    return NextResponse.json({ error: "A senha nova precisa ser diferente da atual." }, { status: 400 });
  }

  try {
    const conta = await findUserById(identidade.id);
    if (!conta) return NextResponse.json({ error: "Conta não encontrada." }, { status: 404 });

    const confere = await verifyPassword(senhaAtual, conta.password_hash, getPasswordPepper());
    if (!confere) {
      return comPisoDeTempo(inicio, NextResponse.json({ error: "Senha atual incorreta." }, { status: 401 }));
    }

    const cliente = createSupabaseAdminClient();
    const { error } = await cliente
      .from("admin_users")
      .update({
        password_hash: await hashPassword(senhaNova, getPasswordPepper()),
        password_updated_at: new Date().toISOString(),
        must_change_password: false,
        // Trocar a senha derruba TODAS as sessões, inclusive a de quem tivesse
        // copiado o cookie — é justamente o que se espera de uma troca de senha.
        // Inclui a de quem redefiniu a senha provisória: a partir daqui, só a pessoa.
        session_epoch: conta.session_epoch + 1,
      })
      .eq("id", conta.id);

    if (error) throw new Error(`Falha ao trocar a senha: ${error.message}`);

    await cliente
      .from("admin_sessions")
      .update({ revoked_at: new Date().toISOString(), revoked_reason: "troca_de_senha" })
      .eq("user_id", conta.id)
      .is("revoked_at", null);

    // Emite uma sessão nova para quem trocou não ser expulso do próprio painel no
    // instante seguinte.
    const atualizada = await findUserById(conta.id);
    if (!atualizada) return NextResponse.json({ error: "Conta não encontrada." }, { status: 404 });

    const cookie = await issueSessionCookie(atualizada, request);
    const resposta = NextResponse.json({ ok: true });
    resposta.cookies.set({
      name: cookie.name,
      value: cookie.value,
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: cookie.maxAge,
    });

    return comPisoDeTempo(inicio, resposta);
  } catch (error) {
    return respostaDeErro("api/admin/senha", error, "Não foi possível trocar a senha.");
  }
}
