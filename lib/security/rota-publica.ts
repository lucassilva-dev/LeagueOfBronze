import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { mesmaOrigem } from "@/lib/security/route-guard";

/**
 * Porta de entrada das rotas que aceitam escrita de quem NÃO é da organização
 * (inscrição, cadastro de jogador, login de jogador, escolha do draft).
 *
 * `requireAdmin` dá origem, teto de corpo e resposta padronizada de graça; uma rota
 * pública não passa por ele e precisava repetir tudo à mão. Repetido é onde uma das
 * cópias fica para trás: a primeira versão da rota de inscrição tinha uma checagem de
 * origem própria, mais fraca que a do `route-guard` (aceitava o primeiro cabeçalho
 * que encontrasse, em vez de exigir que o Referer conferisse quando não houvesse
 * Origin). Agora existe uma implementação só.
 */

export type CorpoPublico<T> = { ok: true; corpo: T } | { ok: false; response: NextResponse };

/** 16 KB. Nenhum formulário nosso chega perto; um corpo maior é abuso. */
export const TETO_PADRAO_BYTES = 16 * 1024;

export async function lerCorpoPublico(
  request: NextRequest,
  tetoBytes: number = TETO_PADRAO_BYTES,
): Promise<CorpoPublico<unknown>> {
  if (!mesmaOrigem(request)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Requisição bloqueada: origem não confere." },
        { status: 403 },
      ),
    };
  }

  // O cabeçalho é dica, não garantia — por isso o corpo também é medido depois de
  // lido. Conferir aqui evita puxar megabytes só para descartar em seguida.
  const declarado = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(declarado) && declarado > tetoBytes) {
    return { ok: false, response: NextResponse.json({ error: "Payload grande demais." }, { status: 413 }) };
  }

  let texto: string;
  try {
    texto = await request.text();
  } catch {
    return { ok: false, response: NextResponse.json({ error: "Payload inválido." }, { status: 400 }) };
  }

  if (Buffer.byteLength(texto, "utf8") > tetoBytes) {
    return { ok: false, response: NextResponse.json({ error: "Payload grande demais." }, { status: 413 }) };
  }

  try {
    return { ok: true, corpo: JSON.parse(texto) as unknown };
  } catch {
    return { ok: false, response: NextResponse.json({ error: "Payload inválido." }, { status: 400 }) };
  }
}

/**
 * Piso de tempo de resposta nas rotas de credencial.
 *
 * Sem ele, "e-mail não existe" volta na hora e "senha errada" demora o scrypt inteiro
 * — a diferença conta quais e-mails têm conta no campeonato.
 */
export const PISO_MS = 300;

export async function comPisoDeTempo<T>(inicio: number, valor: T): Promise<T> {
  const decorrido = Date.now() - inicio;
  if (decorrido < PISO_MS) await new Promise((r) => setTimeout(r, PISO_MS - decorrido));
  return valor;
}
