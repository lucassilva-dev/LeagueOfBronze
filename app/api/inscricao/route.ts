import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { criarInscricao } from "@/lib/inscricoes/store";
import { inscricaoPublicaSchema } from "@/lib/inscricoes/schema";
import { getClientIp, hashIp } from "@/lib/security/admin-store";
import { respostaDeErro } from "@/lib/security/resposta-erro";

export const dynamic = "force-dynamic";

/**
 * Inscrição pública da 4ª Edição.
 *
 * É a PRIMEIRA rota do site que aceita escrita de quem não é da organização, então
 * ela carrega sozinha as proteções que `requireAdmin` dá de graça para o resto:
 *
 *  - teto de tamanho lido do cabeçalho, antes de tocar no corpo;
 *  - checagem de mesma origem, para um formulário hospedado em outro site não
 *    conseguir postar aqui;
 *  - validação por schema, com os pontos derivados do elo NO SERVIDOR;
 *  - freio por origem, dentro do store.
 *
 * O que ela deliberadamente NÃO faz: gravar direto do navegador no banco. As tabelas
 * têm RLS forçado e zero policies — nem a chave pública as alcança.
 */

const TETO_BYTES = 16 * 1024;

/** Mesma lógica de `lib/security/route-guard.ts`, aplicada a uma rota pública. */
function mesmaOrigem(request: NextRequest): boolean {
  const secFetchSite = request.headers.get("sec-fetch-site");
  if (secFetchSite === "same-origin" || secFetchSite === "none") return true;

  const host = request.headers.get("host");
  for (const cabecalho of ["origin", "referer"] as const) {
    const valor = request.headers.get(cabecalho);
    if (!valor) continue;
    try {
      return new URL(valor).host === host;
    } catch {
      return false;
    }
  }
  return false;
}

export async function POST(request: NextRequest) {
  if (!mesmaOrigem(request)) {
    return NextResponse.json({ error: "Requisição bloqueada: origem não confere." }, { status: 403 });
  }

  const tamanho = Number(request.headers.get("content-length") ?? 0);
  if (tamanho > TETO_BYTES) {
    return NextResponse.json({ error: "Payload grande demais." }, { status: 413 });
  }

  let corpo: unknown;
  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  const parsed = inscricaoPublicaSchema.safeParse(corpo);
  if (!parsed.success) {
    // Diferente das rotas de admin: aqui quem lê é o jogador preenchendo o
    // formulário, então a mensagem precisa dizer qual campo corrigir.
    const problemas = parsed.error.issues.slice(0, 6).map((i) => ({
      campo: i.path.join(".") || "formulario",
      mensagem: i.message,
    }));
    return NextResponse.json({ error: "Confira os campos destacados.", problemas }, { status: 400 });
  }

  try {
    const inscricao = await criarInscricao(parsed.data, {
      ipHash: hashIp(getClientIp(request.headers)),
    });

    // Devolve só o que a pessoa precisa ver de volta. Nada de e-mail, WhatsApp,
    // Discord ou id interno — a resposta de um endpoint público não é lugar disso.
    return NextResponse.json({
      ok: true,
      riotId: inscricao.riot_id,
      mensagem:
        "Recebemos sua inscrição. A organização vai conferir os requisitos e confirmar no Discord assim que o pagamento cair.",
    });
  } catch (error) {
    return respostaDeErro("api/inscricao", error, "Não foi possível registrar a inscrição.");
  }
}
