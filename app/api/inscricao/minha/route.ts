import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { getJogadorIdentity } from "@/lib/jogadores/auth";
import { minhaInscricao } from "@/lib/inscricoes/store";
import { respostaDeErro } from "@/lib/security/resposta-erro";

export const dynamic = "force-dynamic";

/**
 * A ficha do próprio jogador.
 *
 * Não recebe id nenhum: o dono sai da sessão. Uma rota que aceitasse
 * `?inscricao=<id>` seria a diferença entre ver a própria ficha e ler a de qualquer
 * um trocando um número na URL.
 */
export async function GET(request: NextRequest) {
  const identidade = await getJogadorIdentity(request);
  if (!identidade) {
    const semSessao = NextResponse.json({ jogador: null, inscricao: null });
    semSessao.headers.set("Cache-Control", "no-store, private");
    return semSessao;
  }

  try {
    const inscricao = await minhaInscricao(identidade.id);
    const resposta = NextResponse.json({
      jogador: { displayName: identidade.displayName, email: identidade.email },
      inscricao,
    });
    resposta.headers.set("Cache-Control", "no-store, private");
    return resposta;
  } catch (error) {
    return respostaDeErro("api/inscricao/minha", error, "Não foi possível carregar sua inscrição.");
  }
}
