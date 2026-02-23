import { NextResponse } from "next/server";

import {
  ADMIN_COOKIE_NAME,
  getAdminAuthToken,
  isAdminConfigured,
  verifyAdminPassword,
} from "@/lib/admin-auth";
import { adminLoginSchema } from "@/lib/schema";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isAdminConfigured()) {
    return NextResponse.json(
      { error: "ADMIN_PASSWORD não configurado no ambiente." },
      { status: 500 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  const parsed = adminLoginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Senha obrigatória." }, { status: 400 });
  }

  if (!verifyAdminPassword(parsed.data.password)) {
    return NextResponse.json({ error: "Senha incorreta." }, { status: 401 });
  }

  const token = getAdminAuthToken();
  if (!token) {
    return NextResponse.json(
      { error: "Falha ao gerar sessão de admin." },
      { status: 500 },
    );
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: ADMIN_COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return response;
}
