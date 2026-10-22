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

    /*
     * A VERSÃO vai junto. Esta rota grava pelo caminho incondicional, que INCREMENTA a
     * versão da linha; sem devolvê-la, o painel adotava o dataset novo e seguia com o
     * número velho, e o primeiro "Salvar" depois disso caía num 409 falso — sem ninguém
     * ter salvo nada, e com as duas saídas ruins (descartar o rascunho ou usar `force`,
     * que desliga a própria trava).
     *
     * E é a versão em que a GRAVAÇÃO caiu, não a de uma releitura: entre gravar e reler
     * cabe a gravação de outra pessoa, e o painel sairia com o dataset importado carimbado
     * com o número dela — e o Salvar seguinte passaria na trava apagando o que ela gravou.
     */
    const { dataset, versao } = await importDatasetFromText(content);
    return NextResponse.json({ dataset, versao, message: "Importação concluída com sucesso." });
  } catch (error) {
    return respostaDeErro("admin/import", error, "Falha ao importar JSON.", 500);
  }
}
