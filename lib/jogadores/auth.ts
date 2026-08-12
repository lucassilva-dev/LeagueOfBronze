import "server-only";

import { createHash, createHmac } from "node:crypto";
import type { NextRequest } from "next/server";

import { isSupabaseConfigured } from "@/lib/data-store";
import { getClientIp, hashIp } from "@/lib/security/admin-store";
import { newSessionId, signSessionToken, verifySessionToken } from "@/lib/security/session";
import {
  acharJogadorPorId,
  acharSessaoAtiva,
  criarSessaoJogador,
  revogarSessaoJogador,
  type JogadorRow,
} from "@/lib/jogadores/store";

/**
 * Sessão do jogador — a mesma máquina da sessão de admin, com uma diferença que é a
 * razão de este arquivo existir separado.
 *
 * ⚠ SEPARAÇÃO DE DOMÍNIO. O token de admin e o de jogador têm exatamente o mesmo
 * formato (`sid`, `uid`, `exp`, `epoch`). Assinados com o MESMO segredo, um token de
 * jogador colado no cookie de admin passaria pela verificação de assinatura — só não
 * viraria acesso porque o `sid` não existe em `admin_sessions`. Isso é sorte, não
 * projeto. Aqui o segredo é DERIVADO com um rótulo próprio, então um token emitido
 * para um lado nunca sequer valida do outro.
 *
 * Derivar (em vez de pedir mais uma variável de ambiente) mantém a implantação com os
 * mesmos dois segredos que já existem e não cria um jeito novo de configurar errado.
 */

const ROTULO_SESSAO = "lob/jogador/sessao/v1";
const ROTULO_SENHA = "lob/jogador/senha/v1";

/** Sete dias: a inscrição acontece semanas antes do draft, e o capitão não pode cair
 *  no meio da escolha. Revogável na hora pela organização via `session_epoch`. */
const SESSAO_DIAS = 7;

export const JOGADOR_COOKIE =
  process.env.NODE_ENV === "production" ? "__Host-lob_jogador" : "lob_jogador";

export type JogadorIdentity = {
  id: string;
  email: string;
  displayName: string;
  mustChangePassword: boolean;
};

function derivar(base: string, rotulo: string): string {
  if (!base) return "";
  return createHmac("sha256", base).update(rotulo).digest("base64url");
}

/** Exportado para o teste que prova a separação de domínio (tests/jogadores/auth.test.ts). */
export function segredoDeSessao(): string {
  return derivar(process.env.ADMIN_SESSION_SECRET?.trim() ?? "", ROTULO_SESSAO);
}

export function pepperDeSenhaJogador(): string {
  return derivar(process.env.ADMIN_PASSWORD_PEPPER?.trim() ?? "", ROTULO_SENHA);
}

/** Só liga quando tudo de que precisa está no ambiente — igual ao modo novo do admin. */
export function contaDeJogadorDisponivel(): boolean {
  return Boolean(segredoDeSessao() && pepperDeSenhaJogador() && isSupabaseConfigured());
}

function hashUserAgent(userAgent: string | null): string {
  return createHash("sha256").update(userAgent ?? "").digest("hex").slice(0, 32);
}

/** Cria a sessão no banco e devolve os dados do cookie assinado. */
export async function emitirCookieDeJogador(
  conta: JogadorRow,
  request: NextRequest,
): Promise<{ name: string; value: string; maxAge: number }> {
  const sessaoId = newSessionId();
  const expiraEm = new Date(Date.now() + SESSAO_DIAS * 24 * 60 * 60 * 1000);

  await criarSessaoJogador({
    id: sessaoId,
    jogadorId: conta.id,
    expiraEm,
    ipHash: hashIp(getClientIp(request.headers)),
    uaHash: hashUserAgent(request.headers.get("user-agent")),
  });

  const value = signSessionToken(
    {
      sid: sessaoId,
      uid: conta.id,
      exp: Math.floor(expiraEm.getTime() / 1000),
      epoch: conta.session_epoch,
    },
    segredoDeSessao(),
  );

  return { name: JOGADOR_COOKIE, value, maxAge: SESSAO_DIAS * 24 * 60 * 60 };
}

/** Atributos do cookie, num lugar só — não podem divergir entre login e logout. */
export function atributosDoCookie(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "strict" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

/**
 * Quem está falando com o servidor, ou null.
 *
 * É esta função — e nunca um campo do corpo da requisição — que decide de quem é a
 * escolha no draft.
 */
export async function getJogadorIdentity(request: NextRequest): Promise<JogadorIdentity | null> {
  if (!contaDeJogadorDisponivel()) return null;

  // Verificação barata primeiro: visitante sem cookie válido não toca no banco.
  const token = request.cookies.get(JOGADOR_COOKIE)?.value;
  const payload = verifySessionToken(token, segredoDeSessao());
  if (!payload) return null;

  const sessao = await acharSessaoAtiva(payload.sid);
  if (!sessao || sessao.jogador_id !== payload.uid) return null;

  const conta = await acharJogadorPorId(payload.uid);
  if (!conta || conta.disabled_at) return null;
  if (conta.session_epoch !== payload.epoch) return null;

  return {
    id: conta.id,
    email: conta.email,
    displayName: conta.display_name,
    mustChangePassword: conta.must_change_password,
  };
}

/** Logout de verdade: revoga no servidor, não só apaga o cookie do navegador. */
export async function revogarSessaoDaRequisicao(request: NextRequest): Promise<void> {
  const token = request.cookies.get(JOGADOR_COOKIE)?.value;
  const payload = verifySessionToken(token, segredoDeSessao());
  if (payload) await revogarSessaoJogador(payload.sid, "logout");
}
