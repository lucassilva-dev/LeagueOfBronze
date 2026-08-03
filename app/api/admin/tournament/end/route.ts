import { NextResponse } from "next/server";

import { respostaDeErro } from "@/lib/security/resposta-erro";
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
    return respostaDeErro("admin/tournament/end", error, "Falha ao encerrar a temporada.", 500);
  }
}
