import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { isAdminConfigured, isAuthorizedAdminRequest } from "@/lib/admin-auth";
import { endCurrentTournament } from "@/lib/data-store";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!isAdminConfigured()) {
    return NextResponse.json(
      { error: "ADMIN_PASSWORD não configurado no ambiente." },
      { status: 500 },
    );
  }
  if (!isAuthorizedAdminRequest(request)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  try {
    const dataset = await endCurrentTournament();
    return NextResponse.json({ dataset, message: "Temporada encerrada e arquivada." });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha ao encerrar a temporada." },
      { status: 400 },
    );
  }
}
