import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { getAdminIdentity, isAdminConfigured, type AdminIdentity } from "@/lib/admin-auth";
import { hasScope, scopeLabel, type Scope } from "@/lib/security/scopes";

/**
 * Porta de entrada única das rotas de admin: confere configuração, sessão e permissão.
 *
 * Uso:
 *   const guarda = await requireAdmin(request, "series:cards");
 *   if (!guarda.ok) return guarda.response;
 *   // guarda.identity está disponível daqui pra frente
 */
export type GuardResult =
  | { ok: true; identity: AdminIdentity }
  | { ok: false; response: NextResponse };

export async function requireAdmin(request: NextRequest, scope?: Scope): Promise<GuardResult> {
  if (!isAdminConfigured()) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Autenticação não configurada no ambiente." },
        { status: 500 },
      ),
    };
  }

  const identity = await getAdminIdentity(request);
  if (!identity) {
    return { ok: false, response: NextResponse.json({ error: "Não autorizado." }, { status: 401 }) };
  }

  if (scope && !hasScope(identity, scope)) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: `Você não tem permissão para: ${scopeLabel(scope)}.`,
          missing: [scope],
        },
        { status: 403 },
      ),
    };
  }

  return { ok: true, identity };
}
