import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { getJogadorIdentity } from "@/lib/jogadores/auth";
import { declararPagamento } from "@/lib/inscricoes/store";
import { respostaDeErro } from "@/lib/security/resposta-erro";
import { mesmaOrigem } from "@/lib/security/route-guard";

export const dynamic = "force-dynamic";

/**
 * "Já paguei", dito pelo jogador.
 *
 * Isto NÃO marca o pagamento como recebido — só avisa a organização, que confere no
 * extrato. Colapsar as duas coisas seria deixar cada um declarar o próprio pagamento
 * como conferido, e o caixa deixaria de significar alguma coisa.
 *
 * Sem corpo de requisição: quem paga é sempre quem está na sessão.
 */
export async function POST(request: NextRequest) {
  if (!mesmaOrigem(request)) {
    return NextResponse.json({ error: "Requisição bloqueada: origem não confere." }, { status: 403 });
  }

  const identidade = await getJogadorIdentity(request);
  if (!identidade) {
    return NextResponse.json({ error: "Entre na sua conta primeiro." }, { status: 401 });
  }

  try {
    const resultado = await declararPagamento(identidade.id);

    if (resultado === "sem_inscricao") {
      return NextResponse.json({ error: "Você ainda não tem inscrição nesta edição." }, { status: 404 });
    }
    if (resultado === "nao_permitido") {
      return NextResponse.json(
        { error: "Esse pagamento já foi tratado pela organização. Fale com ela se algo estiver errado." },
        { status: 409 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return respostaDeErro("api/inscricao/pagamento", error, "Não foi possível registrar o aviso.");
  }
}
