import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";

import { isAdminConfigured, isAuthorizedAdminRequest } from "@/lib/admin-auth";
import { readDataset, saveDataset } from "@/lib/data-store";
import { cardIdSchema } from "@/lib/schema";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  seriesId: z.string().trim().min(1),
  teamId: z.string().trim().min(1),
  cardId: cardIdSchema,
});

// Grava a carta sorteada ao vivo de um time numa série (1 carta por time — substitui a anterior).
export async function POST(request: NextRequest) {
  if (!isAdminConfigured()) {
    return NextResponse.json(
      { error: "ADMIN_PASSWORD não configurado no ambiente." },
      { status: 500 },
    );
  }
  if (!isAuthorizedAdminRequest(request)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

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
  const { seriesId, teamId, cardId } = parsed.data;

  try {
    const dataset = await readDataset();
    const series = dataset.seriesMatches.find((row) => row.id === seriesId);
    if (!series) {
      return NextResponse.json({ error: "Série não encontrada." }, { status: 404 });
    }
    if (teamId !== series.teamAId && teamId !== series.teamBId) {
      return NextResponse.json({ error: "Time não pertence a esta série." }, { status: 400 });
    }

    const others = (series.cardsUsed ?? []).filter((card) => card.teamId !== teamId);
    series.cardsUsed = [...others, { teamId, cardId }];

    const saved = await saveDataset(dataset);
    const savedSeries = saved.seriesMatches.find((row) => row.id === seriesId);
    return NextResponse.json({ ok: true, cardsUsed: savedSeries?.cardsUsed ?? [] });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha ao salvar a carta." },
      { status: 400 },
    );
  }
}
