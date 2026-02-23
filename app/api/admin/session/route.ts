import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { isAdminConfigured, isAuthorizedAdminRequest } from "@/lib/admin-auth";
import { getConfiguredDataProvider, getDataProviderLabel, isSupabaseConfigured } from "@/lib/data-store";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const provider = getConfiguredDataProvider();
  return NextResponse.json({
    configured: isAdminConfigured(),
    authorized: isAuthorizedAdminRequest(request),
    dataProvider: provider,
    dataProviderLabel: getDataProviderLabel(provider),
    supabaseConfigured: isSupabaseConfigured(),
  });
}
