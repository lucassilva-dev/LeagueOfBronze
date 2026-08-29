import { NextResponse } from "next/server";

import { respostaDeErro } from "@/lib/security/resposta-erro";
import type { NextRequest } from "next/server";

import { requireAdmin } from "@/lib/security/route-guard";
import { importDatasetFromText, readDatasetComVersao } from "@/lib/data-store";

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
    /*
     * A VERSÃO vai junto. Esta rota grava pelo caminho incondicional, que INCREMENTA a
     * versão da linha; sem devolvê-la, o painel adotava o dataset novo e seguia com o
     * número velho, e o primeiro "Salvar" depois disso caía num 409 falso — sem ninguém
     * ter salvo nada, e com as duas saídas ruins (descartar o rascunho ou usar `force`,
     * que desliga a própria trava).
     */
    const { versao } = await readDatasetComVersao();
    return NextResponse.json({ dataset, versao, message: "Importação concluída com sucesso." });
  } catch (error) {
    return respostaDeErro("admin/import", error, "Falha ao importar JSON.", 500);
  }
}
