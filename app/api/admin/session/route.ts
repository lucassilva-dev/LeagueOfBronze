import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { isAdminConfigured, isAuthorizedAdminRequest } from "@/lib/admin-auth";
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
  const authorized = await isAuthorizedAdminRequest(request);

  if (!authorized) {
    return NextResponse.json({ configured: isAdminConfigured(), authorized: false });
  }

  const provider = getConfiguredDataProvider();
  return NextResponse.json({
    configured: isAdminConfigured(),
    authorized: true,
    dataProvider: provider,
    dataProviderLabel: getDataProviderLabel(provider),
    supabaseConfigured: isSupabaseConfigured(),
  });
}
