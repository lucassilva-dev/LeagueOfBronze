import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { requireAdmin } from "@/lib/security/route-guard";
import { endCurrentTournament } from "@/lib/data-store";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const guarda = await requireAdmin(request, "tournament:lifecycle");
  if (!guarda.ok) return guarda.response;


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
