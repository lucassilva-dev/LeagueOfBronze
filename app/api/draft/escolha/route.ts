import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { alcancarORelogio, aplicarEscolha, podeEscolher } from "@/lib/draft/motor";
import { lerDraftCompleto, paraPublico, salvarDraftSeIntacto, timeDoCapitao } from "@/lib/draft/store";
import { inscricaoIdDoJogador } from "@/lib/inscricoes/store";
import { getJogadorIdentity } from "@/lib/jogadores/auth";
import { respostaDeErro } from "@/lib/security/resposta-erro";
import { lerCorpoPublico } from "@/lib/security/rota-publica";

export const dynamic = "force-dynamic";

/**
 * A escolha do capitão.
 *
 * É a rota que justifica a conta de jogador existir. O requisito era "ninguém pode
 * escolher no lugar do capitão", e a forma de garantir isso é esta ordem:
 *
 *   sessão  →  qual inscrição é dessa conta  →  que time essa inscrição capitaneia
 *
 * O corpo da requisição diz APENAS quem está sendo escolhido. Ele não diz — e não
 * poderia dizer — de quem é a vez nem por qual time. Um capitão que forje o corpo só
 * consegue escolher para o próprio time, e ainda assim só na vez dele.
 */
export async function POST(request: NextRequest) {
  const lido = await lerCorpoPublico(request);
  if (!lido.ok) return lido.response;

  const identidade = await getJogadorIdentity(request);
  if (!identidade) {
    return NextResponse.json({ error: "Entre na sua conta para escolher." }, { status: 401 });
  }

  const corpo = lido.corpo as { jogadorId?: unknown };
  const jogadorId = typeof corpo?.jogadorId === "string" ? corpo.jogadorId : null;
  if (!jogadorId) {
    return NextResponse.json({ error: "Escolha um jogador." }, { status: 400 });
  }

  try {
    const inscricaoId = await inscricaoIdDoJogador(identidade.id);
    if (!inscricaoId) {
      return NextResponse.json({ error: "Sua conta não está ligada a uma inscrição." }, { status: 403 });
    }

    const { estado, revisao } = await lerDraftCompleto();
    if (!estado) {
      return NextResponse.json({ error: "O draft ainda não foi montado." }, { status: 409 });
    }

    // O relógio anda ANTES de validar: se a vez do capitão já venceu enquanto a página
    // dele estava aberta, a escolha tem de ser recusada contra o estado de agora — não
    // contra o que a tela dele mostrava.
    const atual = alcancarORelogio(estado, Date.now());

    const meuTime = timeDoCapitao(atual, inscricaoId);
    if (!meuTime) {
      return NextResponse.json({ error: "Você não é capitão nesta edição." }, { status: 403 });
    }

    const veredito = podeEscolher(atual, meuTime, jogadorId);
    if (!veredito.ok) {
      return NextResponse.json(
        { error: veredito.motivo, draft: paraPublico(atual, revisao) },
        { status: 409 },
      );
    }

    const novo = aplicarEscolha(atual, meuTime, jogadorId, Date.now());
    const gravou = await salvarDraftSeIntacto(novo, revisao);

    if (!gravou) {
      // Alguém escreveu entre a leitura e a gravação. Não é erro do capitão: devolvemos
      // o estado fresco para a tela dele se corrigir sozinha.
      const fresco = await lerDraftCompleto();
      return NextResponse.json(
        {
          error: "Outra escolha entrou primeiro. Confira o quadro e tente de novo.",
          draft: fresco.estado ? paraPublico(fresco.estado, fresco.revisao) : null,
        },
        { status: 409 },
      );
    }

    return NextResponse.json({ ok: true, draft: paraPublico(novo, revisao + 1) });
  } catch (error) {
    return respostaDeErro("api/draft/escolha", error, "Não foi possível registrar a escolha.");
  }
}
