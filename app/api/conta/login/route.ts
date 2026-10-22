import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import {
  atributosDoCookie,
  contaDeJogadorDisponivel,
  emitirCookieDeJogador,
  pepperDeSenhaJogador,
} from "@/lib/jogadores/auth";
import { loginJogadorSchema } from "@/lib/jogadores/schema";
import {
  acharJogadorPorEmail,
  concluirTentativaJogador,
  contarTentativasJogador,
  reservarTentativaJogador,
  type ReservaDeTentativa,
} from "@/lib/jogadores/store";
import { getClientIp, hashIp } from "@/lib/security/admin-store";
import { verifyPassword } from "@/lib/security/password";
import { descontarPropriaReserva, evaluateLoginRateLimit, TENTATIVA_ERRO_INTERNO } from "@/lib/security/rate-limit";
import { respostaDeErro } from "@/lib/security/resposta-erro";
import { comPisoDeTempo, lerCorpoPublico } from "@/lib/security/rota-publica";

export const dynamic = "force-dynamic";

// Respostas de recusa. O texto é fixo em português; o `codigo` é estável e é por ele que a
// tela traduz (lib/i18n/messages/inscricao.ts, `erros.*`) — no site em inglês, o login do
// formulário de inscrição mostrava "E-mail ou senha incorretos." em português.

/** Resposta única para senha errada, conta inexistente e conta desativada — não conta quem tem conta. */
const CREDENCIAIS_INVALIDAS = { error: "E-mail ou senha incorretos.", codigo: "credenciais_invalidas" } as const;
const MUITAS_TENTATIVAS = { error: "Muitas tentativas. Tente novamente mais tarde.", codigo: "muitas_tentativas" } as const;
const INDISPONIVEL = { error: "Contas ainda não estão disponíveis.", codigo: "indisponivel" } as const;

export async function POST(request: NextRequest) {
  const inicio = Date.now();

  if (!contaDeJogadorDisponivel()) {
    return NextResponse.json(INDISPONIVEL, { status: 503 });
  }

  const lido = await lerCorpoPublico(request);
  if (!lido.ok) return lido.response;

  const parsed = loginJogadorSchema.safeParse(lido.corpo);
  if (!parsed.success) {
    return comPisoDeTempo(inicio, NextResponse.json(CREDENCIAIS_INVALIDAS, { status: 401 }));
  }

  const { email, senha } = parsed.data;
  const ipHash = hashIp(getClientIp(request.headers));

  // A reserva é fechada em TODO caminho de saída. Os caminhos normais fecham com o
  // resultado real; se algo estourar depois dela (sessão que não foi criada, contagem que
  // não foi lida), o `finally` fecha com `erro_interno`, que não conta. Antes, a linha
  // ficava `em_andamento` e pesava como palpite errado: cinco erros 500 com a senha CERTA
  // (banco oscilando no dia do draft) trancavam o capitão por 15 minutos.
  let reserva: ReservaDeTentativa = null;
  let concluida = false;
  const concluir = (success: boolean, reason: string) => {
    concluida = true;
    return concluirTentativaJogador(reserva, { email, ipHash, success, reason });
  };

  try {
    // 1. Bloqueio por tentativas. O contador vive no Postgres porque serverless não
    //    compartilha memória entre instâncias — em memória, bastava distribuir.
    //
    //    A tentativa é RESERVADA antes de contar: contando antes de gravar, uma rajada
    //    simultânea lia a contagem antes de qualquer falha existir e testava 30 senhas
    //    de uma vez (ver `descontarPropriaReserva`).
    reserva = await reservarTentativaJogador({ email, ipHash });
    const decisao = evaluateLoginRateLimit(
      descontarPropriaReserva(await contarTentativasJogador(email, ipHash), reserva !== null),
    );
    if (!decisao.allowed) {
      await concluir(false, decisao.reason);
      return comPisoDeTempo(
        inicio,
        NextResponse.json(MUITAS_TENTATIVAS, {
          status: 429,
          headers: { "Retry-After": String(decisao.retryAfterSeconds) },
        }),
      );
    }

    // 2. Credenciais
    const conta = await acharJogadorPorEmail(email);
    const senhaOk =
      conta !== null && (await verifyPassword(senha, conta.password_hash, pepperDeSenhaJogador()));

    if (!conta || !senhaOk) {
      await concluir(false, conta ? "senha_incorreta" : "conta_inexistente");
      return comPisoDeTempo(inicio, NextResponse.json(CREDENCIAIS_INVALIDAS, { status: 401 }));
    }

    // Conta desativada responde o MESMO 401 da senha errada. Com um 403 próprio aqui,
    // depois da senha conferida, o "Conta desativada" só aparecia no palpite CERTO — a
    // rota confirmava a senha de quem saiu, e essa senha costuma ser reaproveitada. O
    // motivo real fica no registro de tentativas.
    if (conta.disabled_at) {
      await concluir(false, "conta_desativada");
      return comPisoDeTempo(inicio, NextResponse.json(CREDENCIAIS_INVALIDAS, { status: 401 }));
    }

    // 3. Sessão: id aleatório no banco + cookie assinado com segredo próprio do jogador
    const cookie = await emitirCookieDeJogador(conta, request);
    await concluir(true, "ok");

    const resposta = NextResponse.json({
      ok: true,
      jogador: {
        email: conta.email,
        displayName: conta.display_name,
        mustChangePassword: conta.must_change_password,
      },
    });
    resposta.cookies.set({ name: cookie.name, value: cookie.value, ...atributosDoCookie(cookie.maxAge) });

    return comPisoDeTempo(inicio, resposta);
  } catch (error) {
    return respostaDeErro("api/conta/login", error, "Não foi possível entrar.");
  } finally {
    if (reserva && !concluida) {
      await concluir(false, TENTATIVA_ERRO_INTERNO).catch((e: unknown) =>
        console.error("[api/conta/login] falha ao fechar a reserva da tentativa:", e),
      );
    }
  }
}
