import { NextResponse } from "next/server";

import { respostaDeErro } from "@/lib/security/resposta-erro";
import type { NextRequest } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/lib/security/route-guard";
import { readDataset, saveDataset } from "@/lib/data-store";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  seriesId: z.string().trim().min(1),
  blueSideTeamId: z.string().trim().min(1),
});

// Grava o time que começa no lado azul no jogo 1 (sorteio de lados). O outro começa no vermelho.
export async function POST(request: NextRequest) {
  const guarda = await requireAdmin(request, "series:sides");
  if (!guarda.ok) return guarda.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }
  const { seriesId, blueSideTeamId } = parsed.data;

  try {
    const dataset = await readDataset();
    const series = dataset.seriesMatches.find((row) => row.id === seriesId);
    if (!series) {
      return NextResponse.json({ error: "Série não encontrada." }, { status: 404 });
    }
    if (blueSideTeamId !== series.teamAId && blueSideTeamId !== series.teamBId) {
      return NextResponse.json({ error: "Time não pertence a esta série." }, { status: 400 });
    }

    series.blueSideTeamId = blueSideTeamId;

    const saved = await saveDataset(dataset);
    const savedSeries = saved.seriesMatches.find((row) => row.id === seriesId);
    return NextResponse.json({ ok: true, blueSideTeamId: savedSeries?.blueSideTeamId ?? null });
  } catch (error) {
    return respostaDeErro("admin/series/sides", error, "Falha ao salvar os lados.", 500);
  }
}
