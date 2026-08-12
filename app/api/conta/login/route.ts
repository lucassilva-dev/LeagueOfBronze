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
  contarTentativasJogador,
  registrarTentativaJogador,
} from "@/lib/jogadores/store";
import { getClientIp, hashIp } from "@/lib/security/admin-store";
import { verifyPassword } from "@/lib/security/password";
import { evaluateLoginRateLimit } from "@/lib/security/rate-limit";
import { respostaDeErro } from "@/lib/security/resposta-erro";
import { comPisoDeTempo, lerCorpoPublico } from "@/lib/security/rota-publica";

export const dynamic = "force-dynamic";

/** Mensagem única para senha errada e conta inexistente — não conta quem tem conta. */
const CREDENCIAIS_INVALIDAS = "E-mail ou senha incorretos.";

export async function POST(request: NextRequest) {
  const inicio = Date.now();

  if (!contaDeJogadorDisponivel()) {
    return NextResponse.json({ error: "Contas ainda não estão disponíveis." }, { status: 503 });
  }

  const lido = await lerCorpoPublico(request);
  if (!lido.ok) return lido.response;

  const parsed = loginJogadorSchema.safeParse(lido.corpo);
  if (!parsed.success) {
    return comPisoDeTempo(inicio, NextResponse.json({ error: CREDENCIAIS_INVALIDAS }, { status: 401 }));
  }

  const { email, senha } = parsed.data;
  const ipHash = hashIp(getClientIp(request.headers));

  try {
    // 1. Bloqueio por tentativas. O contador vive no Postgres porque serverless não
    //    compartilha memória entre instâncias — em memória, bastava distribuir.
    const decisao = evaluateLoginRateLimit(await contarTentativasJogador(email, ipHash));
    if (!decisao.allowed) {
      await registrarTentativaJogador({ email, ipHash, success: false, reason: decisao.reason });
      return comPisoDeTempo(
        inicio,
        NextResponse.json(
          { error: "Muitas tentativas. Tente novamente mais tarde." },
          { status: 429, headers: { "Retry-After": String(decisao.retryAfterSeconds) } },
        ),
      );
    }

    // 2. Credenciais
    const conta = await acharJogadorPorEmail(email);
    const senhaOk =
      conta !== null && (await verifyPassword(senha, conta.password_hash, pepperDeSenhaJogador()));

    if (!conta || !senhaOk) {
      await registrarTentativaJogador({
        email,
        ipHash,
        success: false,
        reason: conta ? "senha_incorreta" : "conta_inexistente",
      });
      return comPisoDeTempo(inicio, NextResponse.json({ error: CREDENCIAIS_INVALIDAS }, { status: 401 }));
    }

    if (conta.disabled_at) {
      await registrarTentativaJogador({ email, ipHash, success: false, reason: "conta_desativada" });
      return comPisoDeTempo(
        inicio,
        NextResponse.json({ error: "Conta desativada. Fale com a organização." }, { status: 403 }),
      );
    }

    // 3. Sessão: id aleatório no banco + cookie assinado com segredo próprio do jogador
    const cookie = await emitirCookieDeJogador(conta, request);
    await registrarTentativaJogador({ email, ipHash, success: true, reason: "ok" });

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
  }
}
