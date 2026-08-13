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

    // Se o relógio andou e a gravação pegou, a revisão avançou uma; se não pegou,
    // outra sondagem gravou e a nossa leitura ficou velha — nos dois casos o número
    // que descreve o estado devolvido é `revisao + 1`.
    let revisaoAtual = revisao;
    if (alcancado !== estado) {
      // Perder a corrida aqui é normal: significa que outra sondagem já virou a
      // escolha. O estado que devolvemos abaixo continua correto porque foi calculado
      // do mesmo histórico — quem escolhe é o motor, não o acaso de quem chegou antes.
      await salvarDraftSeIntacto(alcancado, revisao);
      revisaoAtual = revisao + 1;
    }

    // Quem está logado e é capitão recebe o id do time dele — é o que faz o painel
    // saber se é a vez sem perguntar nada ao cliente.
    const token = request.cookies.get(JOGADOR_COOKIE)?.value;
    const identidade = await identidadePorToken(token).catch(() => null);
    let souCapitaoDe: string | null = null;

    if (identidade) {
      const inscricaoId = await inscricaoIdDoJogador(identidade.id);
      if (inscricaoId) souCapitaoDe = timeDoCapitao(alcancado, inscricaoId);
    }

    const resposta = NextResponse.json({ draft: paraPublico(alcancado, revisaoAtual), souCapitaoDe });
    resposta.headers.set("Cache-Control", "no-store");
    return resposta;
  } catch (error) {
    return respostaDeErro("api/draft/estado", error, "Não foi possível ler o draft.");
  }
}
