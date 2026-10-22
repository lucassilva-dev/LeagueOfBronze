import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { alcancarORelogio, aplicarEscolha, podeEscolher, timeDaVez } from "@/lib/draft/motor";
import { lerDraftCompleto, paraPublico, salvarDraftSeIntacto, timeDoCapitao } from "@/lib/draft/store";
import { inscricaoIdDoJogador } from "@/lib/inscricoes/store";
import { getJogadorIdentity } from "@/lib/jogadores/auth";
import { respostaDeErro } from "@/lib/security/resposta-erro";
import { lerCorpoPublico } from "@/lib/security/rota-publica";

export const dynamic = "force-dynamic";

const VEZ_PASSOU =
  "Essa escolha não entrou: a sua vez já tinha passado (o tempo acabou ou a escolha já foi feita). Confira o quadro.";

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
 *
 * O corpo diz também QUAL escolha a tela mostrava (`escolha`, o número). Não decide nada
 * de quem é a vez — só serve para recusar o clique que chegou depois do prazo. Na virada
 * da serpentina o mesmo time escolhe duas vezes seguidas: sem esse número, o clique
 * atrasado da escolha 1 (que o relógio já tinha dado ao auto-pick) entrava calado como a
 * escolha 2, e o capitão perdia a chance de decidir a 2 sabendo que a 1 foi automática.
 *
 * Toda recusa leva `codigo` (e `params`, quando há número no recado): a tela do capitão
 * traduz por ele. O `error` continua em português, para quem não conhece o código.
 */
export async function POST(request: NextRequest) {
  const lido = await lerCorpoPublico(request);
  if (!lido.ok) return lido.response;

  const identidade = await getJogadorIdentity(request);
  if (!identidade) {
    return NextResponse.json({ error: "Entre na sua conta para escolher.", codigo: "sem_sessao" }, { status: 401 });
  }

  const corpo = lido.corpo as { jogadorId?: unknown; escolha?: unknown };
  const jogadorId = typeof corpo?.jogadorId === "string" ? corpo.jogadorId : null;
  if (!jogadorId) {
    return NextResponse.json({ error: "Escolha um jogador.", codigo: "sem_jogador" }, { status: 400 });
  }

  try {
    const inscricaoId = await inscricaoIdDoJogador(identidade.id);
    if (!inscricaoId) {
      return NextResponse.json(
        { error: "Sua conta não está ligada a uma inscrição.", codigo: "sem_inscricao" },
        { status: 403 },
      );
    }

    const { estado, revisao } = await lerDraftCompleto();
    if (!estado) {
      return NextResponse.json({ error: "O draft ainda não foi montado.", codigo: "sem_draft" }, { status: 409 });
    }

    // O relógio anda ANTES de validar: se a vez do capitão já venceu enquanto a página
    // dele estava aberta, a escolha tem de ser recusada contra o estado de agora — não
    // contra o que a tela dele mostrava.
    const atual = alcancarORelogio(estado, Date.now());

    const meuTime = timeDoCapitao(atual, inscricaoId);
    if (!meuTime) {
      return NextResponse.json(
        { error: "Você não é capitão nesta edição.", codigo: "nao_e_capitao" },
        { status: 403 },
      );
    }

    // A escolha que a tela mostrava não é mais a de agora: o prazo dela venceu (e o
    // auto-pick entrou) ou ela já foi feita. Opcional no corpo só para não recusar uma
    // tela aberta antes desta versão — a tela de hoje sempre manda.
    if (typeof corpo.escolha === "number" && corpo.escolha !== atual.escolhaAtual) {
      return NextResponse.json(
        { error: VEZ_PASSOU, codigo: "vez_passou", draft: paraPublico(atual, revisao) },
        { status: 409 },
      );
    }

    const veredito = podeEscolher(atual, meuTime, jogadorId);
    if (!veredito.ok) {
      // A vez gravada ERA deste time e o relógio a virou nesta mesma requisição: o recado
      // certo é "o seu tempo acabou", não "não é a vez do seu time".
      const minhaVezVenceu =
        veredito.codigo === "nao_e_a_vez" &&
        atual.escolhaAtual !== estado.escolhaAtual &&
        timeDaVez(estado) === meuTime;
      return NextResponse.json(
        minhaVezVenceu
          ? { error: VEZ_PASSOU, codigo: "vez_passou", draft: paraPublico(atual, revisao) }
          : {
              error: veredito.motivo,
              codigo: veredito.codigo,
              params: veredito.params,
              draft: paraPublico(atual, revisao),
            },
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
          codigo: "outra_escolha",
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
