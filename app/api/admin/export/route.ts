import { NextResponse } from "next/server";

import { respostaDeErro } from "@/lib/security/resposta-erro";
import type { NextRequest } from "next/server";

import { requireAdmin } from "@/lib/security/route-guard";
import { readDatasetText } from "@/lib/data-store";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const guarda = await requireAdmin(request, "dataset:export");
  if (!guarda.ok) return guarda.response;


  try {
    const text = await readDatasetText();
    return new NextResponse(text, {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="leagueofbronze-backup-${new Date()
          .toISOString()
          .slice(0, 19)
          .replaceAll(":", "-")
          .replaceAll("T", "-")}.json"`,
      },
    });
  } catch (error) {
    return respostaDeErro("admin/export", error, "Falha ao exportar.", 500);
  }
}
