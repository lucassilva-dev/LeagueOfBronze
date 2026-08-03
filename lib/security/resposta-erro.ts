import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { ehErroDeRegra } from "@/lib/security/erros";

/**
 * Resposta de erro padrão das rotas de admin.
 *
 * - ErroDeRegra  → mensagem vai para o usuário (é informação do produto).
 * - Qualquer outro → mensagem genérica + `ref`. O detalhe real sai só no log do
 *   servidor, com o mesmo `ref`. Assim continua dando para diagnosticar ("deu erro,
 *   ref a1b2c3d4") sem publicar o interior do banco na resposta HTTP.
 */
export function respostaDeErro(
  contexto: string,
  error: unknown,
  mensagemGenerica: string,
  status = 500,
): NextResponse {
  if (ehErroDeRegra(error)) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const ref = randomUUID().slice(0, 8);
  console.error(`[${contexto}] ref=${ref}`, error);

  return NextResponse.json({ error: mensagemGenerica, ref }, { status });
}
