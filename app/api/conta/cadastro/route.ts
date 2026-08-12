import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import {
  atributosDoCookie,
  contaDeJogadorDisponivel,
  emitirCookieDeJogador,
  pepperDeSenhaJogador,
} from "@/lib/jogadores/auth";
import { cadastroJogadorSchema } from "@/lib/jogadores/schema";
import {
  contarTentativasJogador,
  criarJogador,
  registrarTentativaJogador,
  vincularInscricaoPorEmail,
} from "@/lib/jogadores/store";
import { getClientIp, hashIp } from "@/lib/security/admin-store";
import { hashPassword, validatePasswordStrength } from "@/lib/security/password";
import { evaluateLoginRateLimit } from "@/lib/security/rate-limit";
import { respostaDeErro } from "@/lib/security/resposta-erro";
import { comPisoDeTempo, lerCorpoPublico } from "@/lib/security/rota-publica";

export const dynamic = "force-dynamic";

/**
 * Criação de conta de jogador.
 *
 * Sem confirmação por e-mail, de propósito: a verificação de verdade é a organização
 * conferir a pessoa à mão, item por item do regulamento. Confirmar e-mail não
 * acrescentaria nada e exigiria infraestrutura de envio que o projeto não tem.
 *
 * A conta sozinha não dá NADA — nem vaga, nem capitania. É só o cadeado que garante
 * que a escolha do draft sai de quem tem a sessão, e não de quem soube o nome de
 * alguém.
 */
export async function POST(request: NextRequest) {
  const inicio = Date.now();

  if (!contaDeJogadorDisponivel()) {
    return NextResponse.json({ error: "Contas ainda não estão disponíveis." }, { status: 503 });
  }

  const lido = await lerCorpoPublico(request);
  if (!lido.ok) return lido.response;

  const parsed = cadastroJogadorSchema.safeParse(lido.corpo);
  if (!parsed.success) {
    const problemas = parsed.error.issues.slice(0, 6).map((i) => ({
      campo: i.path.join(".") || "formulario",
      mensagem: i.message,
    }));
    return NextResponse.json({ error: "Confira os campos destacados.", problemas }, { status: 400 });
  }

  const { email, nome, senha } = parsed.data;

  const fraca = validatePasswordStrength(senha);
  if (fraca) {
    return NextResponse.json(
      { error: fraca, problemas: [{ campo: "senha", mensagem: fraca }] },
      { status: 400 },
    );
  }

  const ipHash = hashIp(getClientIp(request.headers));

  // O mesmo freio do login vale aqui: sem ele, um script cria contas em série. O
  // contador de "falhas" recebe também as criações, então quem repete demais para.
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

  try {
    const conta = await criarJogador({
      email,
      displayName: nome,
      passwordHash: await hashPassword(senha, pepperDeSenhaJogador()),
    });

    if (!conta) {
      // E-mail já cadastrado. Isto REVELA que a conta existe, e é uma escolha: num
      // grupo fechado de ~50 conhecidos, "esse e-mail já tem conta" é o recado que
      // resolve o problema da pessoa. Esconder aqui só a deixaria travada sem saber
      // por quê. Conta como falha no contador, então não vira sonda de e-mails.
      await registrarTentativaJogador({ email, ipHash, success: false, reason: "email_duplicado" });
      return comPisoDeTempo(
        inicio,
        NextResponse.json(
          { error: "Já existe uma conta com esse e-mail. Entre com ela ou fale com a organização." },
          { status: 409 },
        ),
      );
    }

    // Quem se inscreveu antes de ter conta passa a enxergar a própria inscrição.
    await vincularInscricaoPorEmail(conta.id, email);
    await registrarTentativaJogador({ email, ipHash, success: true, reason: "cadastro" });

    const cookie = await emitirCookieDeJogador(conta, request);
    const resposta = NextResponse.json({
      ok: true,
      jogador: { email: conta.email, displayName: conta.display_name },
    });
    resposta.cookies.set({ name: cookie.name, value: cookie.value, ...atributosDoCookie(cookie.maxAge) });

    return comPisoDeTempo(inicio, resposta);
  } catch (error) {
    return respostaDeErro("api/conta/cadastro", error, "Não foi possível criar a conta.");
  }
}
