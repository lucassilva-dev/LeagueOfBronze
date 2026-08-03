import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { requireAdmin } from "@/lib/security/route-guard";
import { importDatasetFromText } from "@/lib/data-store";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const guarda = await requireAdmin(request, "dataset:import");
  if (!guarda.ok) return guarda.response;


  try {
    const form = await request.formData();
    const file = form.get("file");
    const text = form.get("text");

    let content = "";
    if (typeof text === "string" && text.trim()) {
      content = text;
    } else if (file instanceof File) {
      content = await file.text();
    } else {
      return NextResponse.json(
        { error: "Envie um arquivo JSON ou texto JSON." },
        { status: 400 },
      );
    }

    const dataset = await importDatasetFromText(content);
    return NextResponse.json({ dataset, message: "Importação concluída com sucesso." });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha ao importar JSON." },
      { status: 400 },
    );
  }
}
