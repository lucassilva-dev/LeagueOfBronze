import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import {
  ADMIN_COOKIE_NAME,
  getAdminAuthToken,
  getPasswordPepper,
  isAdminConfigured,
  isNewAuthEnabled,
  issueSessionCookie,
  verifyAdminPassword,
} from "@/lib/admin-auth";
import {
  findUserByUsername,
  getClientIp,
  getRecentAttemptCounts,
  hashIp,
  recordLoginAttempt,
} from "@/lib/security/admin-store";
import { verifyPassword } from "@/lib/security/password";
import { evaluateLoginRateLimit } from "@/lib/security/rate-limit";
import { respostaDeErro } from "@/lib/security/resposta-erro";
import { mesmaOrigem } from "@/lib/security/route-guard";
import { adminLoginSchema } from "@/lib/schema";

export const dynamic = "force-dynamic";

/** Mensagem única para senha errada e usuário inexistente — não revela quais contas existem. */
const CREDENCIAIS_INVALIDAS = "Usuário ou senha incorretos.";

/** Piso de tempo de resposta: reduz o sinal de temporização entre os caminhos. */
const PISO_MS = 300;

async function comPisoDeTempo<T>(inicio: number, valor: T): Promise<T> {
  const decorrido = Date.now() - inicio;
  if (decorrido < PISO_MS) await new Promise((r) => setTimeout(r, PISO_MS - decorrido));
  return valor;
}

export async function POST(request: NextRequest) {
  const inicio = Date.now();

  /*
   * Origem conferida ANTES de qualquer trabalho, e o motivo não é o óbvio.
   *
   * Roubar a sessão por aqui não dá: quem não tem a senha não entra. O dano real é
   * outro — o login tem bloqueio por IP depois de 5 erros. Sem esta checagem, uma
   * página maliciosa faz o navegador da pessoa martelar este endpoint com senha
   * errada, e o limitador bloqueia o IP DELA por 15 minutos. Alguém tranca você fora
   * do próprio painel só fazendo você abrir um link.
   *
   * Vem antes do `recordLoginAttempt` de propósito: tentativa vinda de fora nem
   * chega a contar.
   */
  if (!mesmaOrigem(request)) {
    return NextResponse.json({ error: "Requisição bloqueada: origem não confere." }, { status: 403 });
  }

  if (!isAdminConfigured()) {
    return NextResponse.json({ error: "Autenticação não configurada no ambiente." }, { status: 500 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  const parsed = adminLoginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados de login inválidos." }, { status: 400 });
  }

  // ------------------------------------------------------------------ modo legado
  // Só enquanto os segredos novos não existirem no ambiente (ponte de migração).
  if (!isNewAuthEnabled()) {
    if (!verifyAdminPassword(parsed.data.password)) {
      return comPisoDeTempo(inicio, NextResponse.json({ error: CREDENCIAIS_INVALIDAS }, { status: 401 }));
    }
    const token = getAdminAuthToken();
    if (!token) {
      return NextResponse.json({ error: "Falha ao gerar sessão." }, { status: 500 });
    }
    const resposta = NextResponse.json({ ok: true });
    resposta.cookies.set({
      name: ADMIN_COOKIE_NAME,
      value: token,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return comPisoDeTempo(inicio, resposta);
  }

  // ------------------------------------------------------------------ modo novo
  const usuario = (parsed.data.username ?? "").trim();
  const ipHash = hashIp(getClientIp(request.headers));

  if (!usuario) {
    return comPisoDeTempo(inicio, NextResponse.json({ error: CREDENCIAIS_INVALIDAS }, { status: 401 }));
  }

  // 1. Bloqueio por tentativas (contador no Postgres — serverless não compartilha memória)
  //
  // A leitura FALHA FECHADA (estoura quando o banco não responde, para o limitador nunca
  // ficar desligado em silêncio). Esta rota não tem try em volta daqui, então sem o
  // tratamento o erro escaparia como 500 cru, sem o código de referência do log.
  let tentativas;
  try {
    tentativas = await getRecentAttemptCounts(usuario, ipHash);
  } catch (error) {
    // Com o MESMO piso de tempo dos outros returns desta rota: um caminho de erro
    // que responde mais rapido que os demais vira canal de medicao.
    return comPisoDeTempo(inicio, respostaDeErro("api/admin/login", error, "Não foi possível entrar agora."));
  }
  const decisao = evaluateLoginRateLimit(tentativas);
  if (!decisao.allowed) {
    await recordLoginAttempt({ username: usuario, ipHash, success: false, reason: decisao.reason });
    return comPisoDeTempo(
      inicio,
      NextResponse.json(
        { error: "Muitas tentativas. Tente novamente mais tarde." },
        { status: 429, headers: { "Retry-After": String(decisao.retryAfterSeconds) } },
      ),
    );
  }

  // 2. Credenciais
  const conta = await findUserByUsername(usuario);
  const senhaOk =
    conta !== null && (await verifyPassword(parsed.data.password, conta.password_hash, getPasswordPepper()));

  if (!conta || !senhaOk) {
    await recordLoginAttempt({
      username: usuario,
      ipHash,
      success: false,
      reason: conta ? "senha_incorreta" : "usuario_inexistente",
    });
    return comPisoDeTempo(inicio, NextResponse.json({ error: CREDENCIAIS_INVALIDAS }, { status: 401 }));
  }

  if (conta.disabled_at) {
    await recordLoginAttempt({ username: usuario, ipHash, success: false, reason: "conta_desativada" });
    return comPisoDeTempo(inicio, NextResponse.json({ error: "Conta desativada." }, { status: 403 }));
  }

  // 3. Sessão (id aleatório no banco + cookie assinado)
  const cookie = await issueSessionCookie(conta, request);
  await recordLoginAttempt({ username: usuario, ipHash, success: true, reason: "ok" });

  const resposta = NextResponse.json({
    ok: true,
    user: {
      username: conta.username,
      displayName: conta.display_name,
      isMaster: conta.is_master,
      scopes: conta.scopes ?? [],
      mustChangePassword: conta.must_change_password,
    },
  });
  resposta.cookies.set({
    name: cookie.name,
    value: cookie.value,
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: cookie.maxAge,
  });

  return comPisoDeTempo(inicio, resposta);
}
