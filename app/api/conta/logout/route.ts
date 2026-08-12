import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { JOGADOR_COOKIE, atributosDoCookie, revogarSessaoDaRequisicao } from "@/lib/jogadores/auth";
import { mesmaOrigem } from "@/lib/security/route-guard";

export const dynamic = "force-dynamic";

/**
 * Sair. Revoga a sessão NO BANCO antes de limpar o cookie — apagar só o cookie
 * deixaria o token continuar válido para quem tivesse copiado.
 */
export async function POST(request: NextRequest) {
  if (!mesmaOrigem(request)) {
    return NextResponse.json({ error: "Requisição bloqueada: origem não confere." }, { status: 403 });
  }

  try {
    await revogarSessaoDaRequisicao(request);
  } catch (error) {
    // Falhar aqui não pode prender a pessoa dentro da sessão: seguimos e limpamos o
    // cookie de qualquer jeito.
    console.error("[api/conta/logout] falha ao revogar sessão", error);
  }

  const resposta = NextResponse.json({ ok: true });
  resposta.cookies.set({ name: JOGADOR_COOKIE, value: "", ...atributosDoCookie(0) });
  return resposta;
}
