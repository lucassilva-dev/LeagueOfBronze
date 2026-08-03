import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { ADMIN_COOKIE_NAME, ADMIN_SESSION_COOKIE, revokeRequestSession } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

/**
 * Logout de verdade: além de limpar o cookie do navegador, REVOGA a sessão no
 * servidor. No modelo antigo o "logout" só apagava o cookie — um valor copiado
 * (print, máquina compartilhada) continuava válido até a senha ser trocada.
 */
export async function POST(request: NextRequest) {
  try {
    await revokeRequestSession(request);
  } catch (error) {
    // Nunca impedir o logout por falha ao revogar; o cookie é limpo de qualquer forma.
    console.error("[security] falha ao revogar sessão no logout:", error);
  }

  const response = NextResponse.json({ ok: true });

  const limpar = (name: string, sameSite: "lax" | "strict") =>
    response.cookies.set({
      name,
      value: "",
      httpOnly: true,
      sameSite,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    });

  limpar(ADMIN_SESSION_COOKIE, "strict");
  limpar(ADMIN_COOKIE_NAME, "lax"); // legado

  return response;
}
