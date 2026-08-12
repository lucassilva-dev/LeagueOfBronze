import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";

import { getPasswordPepper } from "@/lib/admin-auth";
import { createSupabaseAdminClient } from "@/lib/data-store";
import { hashPassword, validatePasswordStrength } from "@/lib/security/password";
import { requireAdmin } from "@/lib/security/route-guard";
import { sanitizeScopes } from "@/lib/security/scopes";

export const dynamic = "force-dynamic";

const criarSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "Usuário precisa ter ao menos 3 caracteres.")
    .max(60)
    .regex(/^[a-zA-Z0-9._-]+$/, "Use apenas letras, números, ponto, hífen ou sublinhado.")
    // Guardado em minúsculas para que a busca no login possa ser igualdade simples em
    // vez de padrão LIKE. Ver `normalizarUsuario` em lib/security/admin-store.ts.
    .transform((v) => v.toLowerCase()),
  displayName: z.string().trim().min(1).max(120),
  password: z.string().min(1).max(200),
  scopes: z.array(z.string()).max(40).optional(),
});

/** Lista de usuários — nunca devolve hash de senha. */
export async function GET(request: NextRequest) {
  const guarda = await requireAdmin(request, "users:manage");
  if (!guarda.ok) return guarda.response;

  const client = createSupabaseAdminClient();
  const { data, error } = await client
    .from("admin_users")
    .select("id,username,display_name,is_master,scopes,disabled_at,must_change_password,created_at")
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: "Falha ao listar usuários." }, { status: 500 });
  }

  // Sessões ativas por usuário, para o master poder revogar acesso.
  const { data: sessoes } = await client
    .from("admin_sessions")
    .select("user_id")
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString());

  const ativasPorUsuario = new Map<string, number>();
  for (const s of sessoes ?? []) {
    ativasPorUsuario.set(s.user_id, (ativasPorUsuario.get(s.user_id) ?? 0) + 1);
  }

  return NextResponse.json({
    users: (data ?? []).map((u) => ({
      id: u.id,
      username: u.username,
      displayName: u.display_name,
      isMaster: u.is_master,
      scopes: u.scopes ?? [],
      disabled: Boolean(u.disabled_at),
      mustChangePassword: u.must_change_password,
      createdAt: u.created_at,
      activeSessions: ativasPorUsuario.get(u.id) ?? 0,
    })),
  });
}

/** Cria usuário. O master define as permissões; a senha é gerada por ele e entregue fora do sistema. */
export async function POST(request: NextRequest) {
  const guarda = await requireAdmin(request, "users:manage");
  if (!guarda.ok) return guarda.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  const parsed = criarSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 400 },
    );
  }

  const fraca = validatePasswordStrength(parsed.data.password);
  if (fraca) return NextResponse.json({ error: fraca }, { status: 400 });

  const pepper = getPasswordPepper();
  if (!pepper) {
    return NextResponse.json({ error: "ADMIN_PASSWORD_PEPPER não configurado." }, { status: 500 });
  }

  const client = createSupabaseAdminClient();
  const { error } = await client.from("admin_users").insert({
    username: parsed.data.username,
    display_name: parsed.data.displayName,
    password_hash: await hashPassword(parsed.data.password, pepper),
    is_master: false, // master só se cria direto no banco, de propósito
    scopes: sanitizeScopes(parsed.data.scopes),
    must_change_password: true, // obriga a trocar no primeiro acesso
  });

  if (error) {
    const duplicado = error.message.includes("duplicate") || error.code === "23505";
    return NextResponse.json(
      { error: duplicado ? "Já existe um usuário com esse nome." : "Falha ao criar usuário." },
      { status: duplicado ? 409 : 500 },
    );
  }

  return NextResponse.json({ ok: true, message: "Usuário criado." });
}
