import { NextResponse } from "next/server";

import { respostaDeErro } from "@/lib/security/resposta-erro";
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
    return respostaDeErro("admin/import", error, "Falha ao importar JSON.", 500);
  }
}
