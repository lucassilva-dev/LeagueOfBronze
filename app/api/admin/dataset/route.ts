import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { isAdminConfigured, isAuthorizedAdminRequest } from "@/lib/admin-auth";
import { readDataset, saveDataset } from "@/lib/data-store";

export const dynamic = "force-dynamic";

function unauthorizedResponse() {
  return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
}

function notConfiguredResponse() {
  return NextResponse.json(
    { error: "ADMIN_PASSWORD não configurado no ambiente." },
    { status: 500 },
  );
}

export async function GET(request: NextRequest) {
  if (!isAdminConfigured()) return notConfiguredResponse();
  if (!isAuthorizedAdminRequest(request)) return unauthorizedResponse();

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

export async function PUT(request: NextRequest) {
  if (!isAdminConfigured()) return notConfiguredResponse();
  if (!isAuthorizedAdminRequest(request)) return unauthorizedResponse();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  const payload = (body as { dataset?: unknown })?.dataset ?? body;

  try {
    const dataset = await saveDataset(payload);
    return NextResponse.json({ dataset, message: "Dados salvos com sucesso." });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha ao salvar os dados do campeonato." },
      { status: 400 },
    );
  }
}
