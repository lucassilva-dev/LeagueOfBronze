import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { alcancarORelogio } from "@/lib/draft/motor";
import { lerDraftCompleto, paraPublico, salvarDraftSeIntacto, timeDoCapitao } from "@/lib/draft/store";
import { inscricaoIdDoJogador } from "@/lib/inscricoes/store";
import { identidadePorToken, JOGADOR_COOKIE } from "@/lib/jogadores/auth";
import { respostaDeErro } from "@/lib/security/resposta-erro";

export const dynamic = "force-dynamic";

/**
 * O estado do draft, para a transmissão e para o painel do capitão.
 *
 * SONDAGEM, e não websocket, por uma razão técnica que fecha a questão: a CSP do site
 * tem `connect-src 'self'` (ver proxy.ts), que bloqueia a conexão com *.supabase.co.
 * O Realtime do design não funcionaria sem furar a CSP e sem expor a chave pública no
 * navegador. Com 60 segundos por escolha, 2 segundos de atraso não se percebe — e
 * sondagem sobrevive a limite de duração de função, que é onde SSE quebra em
 * serverless.
 *
 * ⚠ ESTE GET ESCREVE, e é de propósito. O cronômetro precisa de alguém para virar a
 * escolha quando ninguém escolheu, e não há processo de fundo: quem sonda faz o
 * relógio andar. Como a gravação é condicionada à revisão lida, dez espectadores
 * sondando ao mesmo tempo produzem UMA escolha automática, não dez.
 */
export async function GET(request: NextRequest) {
  try {
    const { estado, revisao } = await lerDraftCompleto();

    if (!estado) {
      const vazio = NextResponse.json({ draft: null, souCapitaoDe: null });
      vazio.headers.set("Cache-Control", "no-store");
      return vazio;
    }

    const agora = Date.now();
    const alcancado = alcancarORelogio(estado, agora);

    // Se o relógio andou e a gravação pegou, a revisão avançou uma.
    //
    // Se NÃO pegou, quem gravou no meio do caminho pode ter sido:
    //  - outra sondagem, que aplicou o MESMO auto-pick (o motor é determinístico); ou
    //  - um POST de capitão (`/api/draft/escolha`) ou uma ação do admin, que gravou um
    //    estado DIFERENTE — e com o mesmo número `revisao + 1`.
    //
    // No segundo caso, devolver o nosso estado local rotulado como `revisao + 1` faz a
    // transmissão anunciar uma escolha automática que nunca existiu, e a escolha real
    // nunca é revelada (o histórico tem o mesmo tamanho, então o efeito de revelação
    // não dispara). Por isso a releitura: nunca devolver estado que não está no banco.
    let revisaoAtual = revisao;
    let estadoFinal = alcancado;
    if (alcancado !== estado) {
      const gravou = await salvarDraftSeIntacto(alcancado, revisao);
      if (gravou) {
        revisaoAtual = revisao + 1;
      } else {
        const fresco = await lerDraftCompleto();
        if (fresco.estado) {
          estadoFinal = fresco.estado;
          revisaoAtual = fresco.revisao;
        }
      }
    }

    // Quem está logado e é capitão recebe o id do time dele — é o que faz o painel
    // saber se é a vez sem perguntar nada ao cliente.
    const token = request.cookies.get(JOGADOR_COOKIE)?.value;
    const identidade = await identidadePorToken(token).catch(() => null);
    let souCapitaoDe: string | null = null;

    if (identidade) {
      const inscricaoId = await inscricaoIdDoJogador(identidade.id);
      if (inscricaoId) souCapitaoDe = timeDoCapitao(estadoFinal, inscricaoId);
    }

    const resposta = NextResponse.json({ draft: paraPublico(estadoFinal, revisaoAtual), souCapitaoDe });
    resposta.headers.set("Cache-Control", "no-store");
    return resposta;
  } catch (error) {
    return respostaDeErro("api/draft/estado", error, "Não foi possível ler o draft.");
  }
}
