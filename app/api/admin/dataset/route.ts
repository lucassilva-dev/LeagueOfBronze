import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { readDataset, saveDataset } from "@/lib/data-store";
import { authorizeDatasetChange } from "@/lib/security/dataset-diff";
import { requireAdmin } from "@/lib/security/route-guard";
import { scopeLabel } from "@/lib/security/scopes";
import { tournamentDatasetSchema } from "@/lib/schema";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  // Qualquer pessoa autenticada pode LER o dataset — é o que carrega o editor.
  const guarda = await requireAdmin(request);
  if (!guarda.ok) return guarda.response;

  try {
    const dataset = await readDataset();
    return NextResponse.json({ dataset });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha ao carregar os dados do campeonato." },
      { status: 500 },
    );
  }
}

/**
 * Salva o dataset inteiro. A permissão é calculada pela DIFERENÇA entre o dado atual
 * e o enviado: cada seção alterada exige o seu escopo (ver lib/security/dataset-diff).
 */
export async function PUT(request: NextRequest) {
  const guarda = await requireAdmin(request);
  if (!guarda.ok) return guarda.response;

  // Teto de tamanho antes de ler o corpo: payload gigante não pode virar DoS de memória.
  const tamanho = Number(request.headers.get("content-length") ?? 0);
  if (tamanho > 3_000_000) {
    return NextResponse.json({ error: "Payload grande demais." }, { status: 413 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  const payload = (body as { dataset?: unknown })?.dataset ?? body;

  // Valida ANTES de comparar, para o diff trabalhar sobre dados confiáveis.
  const parsed = tournamentDatasetSchema.safeParse(payload);
  if (!parsed.success) {
    const resumo = parsed.error.issues
      .slice(0, 10)
      .map((i) => `${i.path.join(".") || "root"}: ${i.message}`)
      .join(" | ");
    return NextResponse.json({ error: `Validação falhou: ${resumo}` }, { status: 400 });
  }

  try {
    const atual = await readDataset();
    const veredito = authorizeDatasetChange(guarda.identity, atual, parsed.data);

    if (!veredito.ok) {
      return NextResponse.json(
        {
          error: `Você não tem permissão para alterar: ${veredito.missing.map(scopeLabel).join(", ")}.`,
          missing: veredito.missing,
          changes: veredito.changes.slice(0, 20),
        },
        { status: 403 },
      );
    }

    if (veredito.changes.length === 0) {
      return NextResponse.json({ dataset: atual, message: "Nada mudou." });
    }

    const dataset = await saveDataset(parsed.data);
    return NextResponse.json({ dataset, message: "Dados salvos com sucesso." });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha ao salvar os dados do campeonato." },
      { status: 400 },
    );
  }
}
