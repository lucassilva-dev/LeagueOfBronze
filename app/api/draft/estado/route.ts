import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { alcancarORelogio } from "@/lib/draft/motor";
import { comAsSaidasDoPool, lerDraftCompleto, paraPublico, salvarDraftSeIntacto, timeDoCapitao } from "@/lib/draft/store";
import { inscricaoIdDoJogador } from "@/lib/inscricoes/store";
import {
  atributosDoCookie,
  identidadePorToken,
  JOGADOR_COOKIE,
  renovarCookieDeJogador,
} from "@/lib/jogadores/auth";
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
 *
 * A sondagem também confere quem saiu do pool (decisão C1 de 2026-10-22): lê a situação
 * atual das inscrições de quem ainda não foi escolhido, e quem desistiu, foi recusado ou
 * excluído sai dos escolhíveis — antes do relógio andar, para a escolha automática também
 * não levar essa pessoa. A gravação é a mesma, condicionada à revisão.
 */
export async function GET(request: NextRequest) {
  try {
    const { estado, revisao } = await lerDraftCompleto();

    if (!estado) {
      const vazio = NextResponse.json({ draft: null, souCapitaoDe: null, agoraServidorISO: new Date().toISOString() });
      vazio.headers.set("Cache-Control", "no-store");
      return vazio;
    }

    const agora = Date.now();
    const alcancado = alcancarORelogio(await comAsSaidasDoPool(estado), agora);

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
    // Conta logada SEM inscrição é um caso à parte de "inscrição que não capitaneia": é o
    // capitão que esqueceu a senha e criou outra conta. Com o mesmo recado dos dois ("você
    // não é capitão"), ele ia embora e as escolhas do time caíam no auto-pick.
    let semInscricao = false;

    if (identidade) {
      const inscricaoId = await inscricaoIdDoJogador(identidade.id);
      if (inscricaoId) souCapitaoDe = timeDoCapitao(estadoFinal, inscricaoId);
      else semInscricao = true;
    }

    // Renovação deslizante da sessão, a mesma de /api/sessao. O cabeçalho renova a cada
    // página carregada, mas o capitão que deixou o /capitao aberto desde o login de 7 dias
    // antes não navega: só esta sondagem fala com o servidor, e a sessão vencia no meio do
    // draft. Só com a identidade conferida por inteiro; a função só regrava quando o token
    // tem mais de 1 dia, então a sondagem de 2 s não vira uma escrita a cada 2 s.
    const renovado = identidade ? await renovarCookieDeJogador(token) : null;

    // A hora do servidor vai junto: as telas contam o cronômetro com o relógio do aparelho,
    // e uma TV ou um celular com 20 s de diferença mostrava 0:00 com tempo sobrando (ou o
    // contrário, e a escolha voltava recusada). Com ela, a tela corrige a própria hora.
    const resposta = NextResponse.json({
      draft: paraPublico(estadoFinal, revisaoAtual),
      souCapitaoDe,
      // Só um booleano, sem quem é: o /capitao precisa saber se oferece "entrar" ou se diz
      // "esta conta não capitaneia" — oferecer login a quem já entrou fazia a pessoa voltar
      // para a mesma tela, em laço.
      logado: identidade !== null,
      semInscricao,
      agoraServidorISO: new Date().toISOString(),
    });
    if (renovado) {
      resposta.cookies.set({ name: renovado.name, value: renovado.value, ...atributosDoCookie(renovado.maxAge) });
    }
    resposta.headers.set("Cache-Control", "no-store");
    return resposta;
  } catch (error) {
    return respostaDeErro("api/draft/estado", error, "Não foi possível ler o draft.");
  }
}
