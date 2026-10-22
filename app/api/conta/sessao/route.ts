import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import {
  JOGADOR_COOKIE,
  atributosDoCookie,
  getJogadorIdentity,
  renovarCookieDeJogador,
} from "@/lib/jogadores/auth";

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

  // Renovação deslizante (ver `renovarCookieDeJogador`): só para identidade conferida.
  const renovado = jogador ? await renovarCookieDeJogador(request.cookies.get(JOGADOR_COOKIE)?.value) : null;

  const resposta = NextResponse.json({ jogador });
  if (renovado) {
    resposta.cookies.set({ name: renovado.name, value: renovado.value, ...atributosDoCookie(renovado.maxAge) });
  }
  // Sessão nunca pode ficar em cache — nem no navegador, nem na borda da Vercel.
  resposta.headers.set("Cache-Control", "no-store, private");
  return resposta;
}
