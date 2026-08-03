import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { requireAdmin } from "@/lib/security/route-guard";
import { seedDatasetFromLocalSeed } from "@/lib/data-store";

export const dynamic = "force-dynamic";

/**
 * Semeadura explícita do dataset no Supabase, a partir do seed do repositório.
 *
 * Substitui o antigo "bootstrap na leitura" (lib/data-store.ts), em que qualquer
 * visitante anônimo abrindo uma página pública recriava a linha do banco — o que
 * permitia sobrescrever o dado vivo pelo seed antigo.
 *
 * Só roda autenticado e só quando a linha AINDA NÃO existe.
 */
export async function POST(request: NextRequest) {
  const guarda = await requireAdmin(request, "dataset:import");
  if (!guarda.ok) return guarda.response;


  try {
    const dataset = await seedDatasetFromLocalSeed();
    return NextResponse.json({ dataset, message: "Banco semeado a partir do seed do repositório." });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha ao semear o banco." },
      { status: 400 },
    );
  }
}
