import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { getJogadorIdentity } from "@/lib/jogadores/auth";
import { inscricaoEsperaPagamento } from "@/lib/inscricoes/pagamento";
import { lerConfigOuNulo, minhaInscricao } from "@/lib/inscricoes/store";
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

    // A chave Pix só vai junto enquanto há o que pagar. Quem se inscreveu antes de a
    // chave existir só a recebia pelo Discord — agora ela aparece aqui, com o QR.
    // `lerConfigOuNulo` não lança: sem configuração, a ficha sai sem o Pix, e não quebra.
    //
    // A situação também conta: recusar ou registrar desistência mexe só na ficha, e o
    // pagamento continua "aguardando". Sem isto, quem foi recusado recebia o QR com o
    // valor preenchido — um convite a pagar o que a organização teria de estornar.
    const devendo = inscricao !== null && inscricaoEsperaPagamento(inscricao);
    const chave = devendo ? ((await lerConfigOuNulo())?.chave_pix ?? null) : null;

    const resposta = NextResponse.json({
      jogador: { displayName: identidade.displayName, email: identidade.email },
      inscricao,
      pix: chave ? { chave } : null,
    });
    resposta.headers.set("Cache-Control", "no-store, private");
    return resposta;
  } catch (error) {
    return respostaDeErro("api/inscricao/minha", error, "Não foi possível carregar sua inscrição.");
  }
}
