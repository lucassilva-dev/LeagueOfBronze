import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { getAdminIdentity, isAdminConfigured, isNewAuthEnabled } from "@/lib/admin-auth";
import { getConfiguredDataProvider, getDataProviderLabel, isSupabaseConfigured } from "@/lib/data-store";

export const dynamic = "force-dynamic";

/**
 * Estado da sessão de admin.
 *
 * É PÚBLICO por necessidade: `components/series-live-draw.tsx` chama daqui, de páginas
 * públicas de série, para decidir se mostra os botões de sorteio. Por isso, a topologia
 * do backend (provedor de dados, se o Supabase está configurado) só é devolvida a quem
 * está autenticado — antes vazava para qualquer visitante anônimo.
 */
export async function GET(request: NextRequest) {
  const identity = await getAdminIdentity(request);

  // authMode diz apenas QUAL FORMULÁRIO desenhar (com ou sem campo de usuário).
  // Não revela nada sensível — equivale a olhar os campos da tela de login.
  const authMode = isNewAuthEnabled() ? "accounts" : "legacy";

  if (!identity) {
    return NextResponse.json({ configured: isAdminConfigured(), authorized: false, authMode });
  }

  const provider = getConfiguredDataProvider();
  return NextResponse.json({
    configured: isAdminConfigured(),
    authorized: true,
    authMode,
    user: {
      username: identity.username,
      displayName: identity.displayName,
      isMaster: identity.isMaster,
      scopes: identity.scopes,
      mustChangePassword: identity.mustChangePassword,
      legacy: identity.legacy,
    },
    dataProvider: provider,
    dataProviderLabel: getDataProviderLabel(provider),
    supabaseConfigured: isSupabaseConfigured(),
  });
}
