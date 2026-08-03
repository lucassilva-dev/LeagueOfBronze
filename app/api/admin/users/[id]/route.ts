import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";

import { getPasswordPepper } from "@/lib/admin-auth";
import { createSupabaseAdminClient } from "@/lib/data-store";
import { hashPassword, validatePasswordStrength } from "@/lib/security/password";
import { requireAdmin } from "@/lib/security/route-guard";
import { sanitizeScopes } from "@/lib/security/scopes";

export const dynamic = "force-dynamic";

const atualizarSchema = z.object({
  displayName: z.string().trim().min(1).max(120).optional(),
  scopes: z.array(z.string()).max(40).optional(),
  disabled: z.boolean().optional(),
  /** nova senha definida pelo master (o usuário será obrigado a trocar) */
  newPassword: z.string().min(1).max(200).optional(),
  /** encerra todas as sessões do usuário */
  revokeSessions: z.boolean().optional(),
});

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const guarda = await requireAdmin(request, "users:manage");
  if (!guarda.ok) return guarda.response;

  const { id } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  const parsed = atualizarSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  const client = createSupabaseAdminClient();
  const { data: alvo, error: erroBusca } = await client
    .from("admin_users")
    .select("id,username,is_master,session_epoch")
    .eq("id", id)
    .maybeSingle<{ id: string; username: string; is_master: boolean; session_epoch: number }>();

  if (erroBusca) return NextResponse.json({ error: "Falha ao consultar usuário." }, { status: 500 });
  if (!alvo) return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });

  // Trava de segurança: ninguém desativa nem rebaixa a conta master pela API.
  if (alvo.is_master && (parsed.data.disabled === true || parsed.data.scopes)) {
    return NextResponse.json(
      { error: "A conta master não pode ser desativada nem ter permissões alteradas pela API." },
      { status: 400 },
    );
  }

  const patch: Record<string, unknown> = {};
  if (parsed.data.displayName !== undefined) patch.display_name = parsed.data.displayName;
  if (parsed.data.scopes !== undefined) patch.scopes = sanitizeScopes(parsed.data.scopes);
  if (parsed.data.disabled !== undefined) {
    patch.disabled_at = parsed.data.disabled ? new Date().toISOString() : null;
  }

  if (parsed.data.newPassword !== undefined) {
    const fraca = validatePasswordStrength(parsed.data.newPassword);
    if (fraca) return NextResponse.json({ error: fraca }, { status: 400 });
    const pepper = getPasswordPepper();
    if (!pepper) {
      return NextResponse.json({ error: "ADMIN_PASSWORD_PEPPER não configurado." }, { status: 500 });
    }
    patch.password_hash = await hashPassword(parsed.data.newPassword, pepper);
    patch.password_updated_at = new Date().toISOString();
    patch.must_change_password = true;
  }

  // Desativar, trocar senha ou revogar => derruba todas as sessões do usuário na hora.
  const derrubarSessoes =
    parsed.data.revokeSessions === true ||
    parsed.data.disabled === true ||
    parsed.data.newPassword !== undefined;

  if (derrubarSessoes) patch.session_epoch = alvo.session_epoch + 1;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ ok: true, message: "Nada a alterar." });
  }

  const { error } = await client.from("admin_users").update(patch).eq("id", id);
  if (error) return NextResponse.json({ error: "Falha ao atualizar usuário." }, { status: 500 });

  if (derrubarSessoes) {
    await client
      .from("admin_sessions")
      .update({ revoked_at: new Date().toISOString(), revoked_reason: "admin" })
      .eq("user_id", id)
      .is("revoked_at", null);
  }

  return NextResponse.json({ ok: true, message: "Usuário atualizado." });
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const guarda = await requireAdmin(request, "users:manage");
  if (!guarda.ok) return guarda.response;

  const { id } = await context.params;
  const client = createSupabaseAdminClient();

  const { data: alvo } = await client
    .from("admin_users")
    .select("id,is_master")
    .eq("id", id)
    .maybeSingle<{ id: string; is_master: boolean }>();

  if (!alvo) return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
  if (alvo.is_master) {
    return NextResponse.json({ error: "A conta master não pode ser removida." }, { status: 400 });
  }
  if (guarda.identity.id === id) {
    return NextResponse.json({ error: "Você não pode remover a própria conta." }, { status: 400 });
  }

  const { error } = await client.from("admin_users").delete().eq("id", id);
  if (error) return NextResponse.json({ error: "Falha ao remover usuário." }, { status: 500 });

  return NextResponse.json({ ok: true, message: "Usuário removido." });
}
