import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { getJogadorIdentity } from "@/lib/jogadores/auth";

export const dynamic = "force-dynamic";

/**
 * Quem sou eu. A página do capitão e a de "minha inscrição" perguntam isto ao carregar.
 *
 * Devolve 200 com `jogador: null` para quem não está logado, em vez de 401: não estar
 * logado é resposta normal aqui, não erro — e evita que o console do navegador encha
 * de vermelho em toda visita anônima.
 */
export async function GET(request: NextRequest) {
  const jogador = await getJogadorIdentity(request);

  const resposta = NextResponse.json({ jogador });
  // Sessão nunca pode ficar em cache — nem no navegador, nem na borda da Vercel.
  resposta.headers.set("Cache-Control", "no-store, private");
  return resposta;
}
