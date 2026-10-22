import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import {
  atributosDoCookie,
  emitirCookieDeJogador,
  getJogadorIdentity,
  pepperDeSenhaJogador,
} from "@/lib/jogadores/auth";
import { trocaSenhaJogadorSchema } from "@/lib/jogadores/schema";
import {
  acharJogadorPorId,
  concluirTentativaJogador,
  contarTentativasJogador,
  reservarTentativaJogador,
  revogarSessoesDoJogador,
  trocarSenhaJogador,
  type ReservaDeTentativa,
} from "@/lib/jogadores/store";
import { getClientIp, hashIp } from "@/lib/security/admin-store";
import { hashPassword, validatePasswordStrength, verifyPassword } from "@/lib/security/password";
import { descontarPropriaReserva, evaluateLoginRateLimit, TENTATIVA_ERRO_INTERNO } from "@/lib/security/rate-limit";
import { respostaDeErro } from "@/lib/security/resposta-erro";
import { comPisoDeTempo, lerCorpoPublico } from "@/lib/security/rota-publica";

export const dynamic = "force-dynamic";

/**
 * Troca de senha pelo próprio jogador.
 *
 * Existe porque a redefinição é feita pela organização (não há envio de e-mail — ver
 * `POST /api/admin/jogadores/senha`): quem redefine fica sabendo a senha provisória. Sem
 * esta rota, essa pessoa continuaria podendo entrar na conta de quem ela ajudou —
 * inclusive para escolher no draft.
 *
 * ⚠ Exigir a troca NÃO tranca ninguém fora daqui: `getJogadorIdentity` aceita a sessão
 * de quem está com `must_change_password` ligado. É justamente essa pessoa que precisa
 * desta rota.
 */
export async function POST(request: NextRequest) {
  const inicio = Date.now();

  const identidade = await getJogadorIdentity(request);
  if (!identidade) {
    return NextResponse.json({ error: "Entre na sua conta primeiro.", codigo: "sem_sessao" }, { status: 401 });
  }

  const lido = await lerCorpoPublico(request);
  if (!lido.ok) return lido.response;

  const parsed = trocaSenhaJogadorSchema.safeParse(lido.corpo);
  if (!parsed.success) {
    return NextResponse.json({ error: "Confira os campos." }, { status: 400 });
  }

  const { senhaAtual, senhaNova } = parsed.data;

  const fraca = validatePasswordStrength(senhaNova);
  if (fraca) {
    return NextResponse.json({ error: fraca, problemas: [{ campo: "senhaNova", mensagem: fraca }] }, { status: 400 });
  }
  if (senhaAtual === senhaNova) {
    return NextResponse.json({ error: "A senha nova precisa ser diferente da atual." }, { status: 400 });
  }

  // A reserva da tentativa (ver abaixo) é fechada em TODO caminho de saída: se algo
  // estourar depois dela e antes de a senha atual ser conferida, o `finally` fecha com
  // `erro_interno`, que não conta. Antes, a linha ficava `em_andamento` e pesava como
  // palpite errado contra quem tinha a senha certa.
  let reserva: ReservaDeTentativa = null;
  let concluida = false;
  let emailDaConta: string | null = null;
  let ipHash = "";
  const concluir = (success: boolean, reason: string) => {
    concluida = true;
    return concluirTentativaJogador(reserva, { email: emailDaConta, ipHash, success, reason });
  };

  try {
    const conta = await acharJogadorPorId(identidade.id);
    if (!conta) return NextResponse.json({ error: "Conta não encontrada." }, { status: 404 });

    /*
     * A "senha atual" passa pelo MESMO limitador do login, e as tentativas entram na
     * mesma tabela. Sem isso, quem tivesse a sessão de outra pessoa (o capitão que ficou
     * logado num computador compartilhado) chutava a senha atual sem contador nem
     * registro — inclusive em paralelo — e, ao acertar, ficava com a conta depois que a
     * sessão roubada venceria.
     */
    emailDaConta = conta.email;
    ipHash = hashIp(getClientIp(request.headers));
    reserva = await reservarTentativaJogador({ email: conta.email, ipHash });
    const decisao = evaluateLoginRateLimit(
      descontarPropriaReserva(await contarTentativasJogador(conta.email, ipHash), reserva !== null),
    );
    if (!decisao.allowed) {
      await concluir(false, decisao.reason);
      return comPisoDeTempo(
        inicio,
        NextResponse.json(
          { error: "Muitas tentativas. Tente novamente mais tarde.", codigo: "muitas_tentativas" },
          { status: 429, headers: { "Retry-After": String(decisao.retryAfterSeconds) } },
        ),
      );
    }

    const confere = await verifyPassword(senhaAtual, conta.password_hash, pepperDeSenhaJogador());
    await concluir(confere, confere ? "troca_de_senha" : "senha_atual_incorreta");
    if (!confere) {
      // Os dois 401 desta rota (sem sessão / senha atual errada) levam códigos diferentes:
      // a tela da troca decide por eles se manda entrar de novo ou só avisa do erro.
      return comPisoDeTempo(
        inicio,
        NextResponse.json({ error: "Senha atual incorreta.", codigo: "senha_atual_incorreta" }, { status: 401 }),
      );
    }

    // Senha nova e epoch novo num update SÓ (ver `trocarSenhaJogador`): o epoch novo
    // derruba TODAS as sessões, inclusive a de quem tivesse copiado o cookie.
    //
    // A gravação é condicionada ao epoch LIDO acima. Se a conta mudou no meio — a
    // organização redefiniu a senha (provisória, troca obrigatória, epoch novo) enquanto
    // esta troca conferia a senha atual —, nada é gravado e não sai cookie: a redefinição
    // vale, e quem estava dentro entra de novo (com a provisória, se for o dono).
    const novoHash = await hashPassword(senhaNova, pepperDeSenhaJogador());
    const novoEpoch = conta.session_epoch + 1;
    const gravou = await trocarSenhaJogador(conta.id, novoHash, conta.session_epoch);
    if (!gravou) {
      return comPisoDeTempo(
        inicio,
        NextResponse.json(
          { error: "Sua conta mudou enquanto você trocava a senha. Entre de novo.", codigo: "conta_mudou" },
          { status: 409 },
        ),
      );
    }

    // A partir daqui a senha JÁ mudou. Nada abaixo pode responder "não foi possível
    // trocar a senha" — seria mentira, e a pessoa tentaria de novo com a senha antiga.
    //
    // As linhas de sessão já não valem pelo epoch; marcá-las é só para o registro.
    await revogarSessoesDoJogador(conta.id, "troca_de_senha").catch((error: unknown) =>
      console.error("[api/conta/senha] senha trocada, mas as sessões não foram marcadas", error),
    );

    // Sessão nova para quem trocou não ser expulso do próprio site. Se ela falhar, a
    // troca continua valendo: a pessoa só precisa entrar de novo com a senha nova.
    let cookie: Awaited<ReturnType<typeof emitirCookieDeJogador>> | null = null;
    try {
      cookie = await emitirCookieDeJogador(
        { ...conta, password_hash: novoHash, must_change_password: false, session_epoch: novoEpoch },
        request,
      );
    } catch (error) {
      console.error("[api/conta/senha] senha trocada, mas a sessão nova falhou", error);
    }

    const resposta = NextResponse.json(cookie ? { ok: true } : { ok: true, entrarDeNovo: true });
    if (cookie) {
      resposta.cookies.set({ name: cookie.name, value: cookie.value, ...atributosDoCookie(cookie.maxAge) });
    }

    return comPisoDeTempo(inicio, resposta);
  } catch (error) {
    return respostaDeErro("api/conta/senha", error, "Não foi possível trocar a senha.");
  } finally {
    if (reserva && !concluida) {
      await concluir(false, TENTATIVA_ERRO_INTERNO).catch((e: unknown) =>
        console.error("[api/conta/senha] falha ao fechar a reserva da tentativa:", e),
      );
    }
  }
}
