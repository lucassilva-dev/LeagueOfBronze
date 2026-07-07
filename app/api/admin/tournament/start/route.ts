import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { isAdminConfigured, isAuthorizedAdminRequest } from "@/lib/admin-auth";
import { startNewTournament } from "@/lib/data-store";
import { startTournamentSchema } from "@/lib/schema";

export const dynamic = "force-dynamic";

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

  const parsed = startTournamentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos. Confira o nome, o formato e a confirmação." },
      { status: 400 },
    );
  }

  try {
    const dataset = await startNewTournament({
      name: parsed.data.name,
      format: parsed.data.format,
      keepTeams: parsed.data.keepTeams,
      keepPlayers: parsed.data.keepPlayers,
      archiveCurrent: parsed.data.archiveCurrent,
    });
    return NextResponse.json({ dataset, message: "Nova temporada iniciada." });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha ao iniciar a temporada." },
      { status: 400 },
    );
  }
}
