import { createHash, timingSafeEqual } from "node:crypto";

import type { NextRequest } from "next/server";

import { isSupabaseConfigured } from "@/lib/data-store";
import {
  createSession,
  findActiveSession,
  findUserById,
  getClientIp,
  hashIp,
  revokeSession,
  type AdminUserRow,
} from "@/lib/security/admin-store";
import { newSessionId, signSessionToken, verifySessionToken } from "@/lib/security/session";

/**
 * Autenticação do painel admin.
 *
 * Convivem dois modos, de propósito, para a migração ser à prova de travamento:
 *
 * 1. NOVO (preferido) — ativo quando ADMIN_SESSION_SECRET, ADMIN_PASSWORD_PEPPER e o
 *    Supabase estão configurados. Contas em admin_users (senha com scrypt + pepper) e
 *    sessões em admin_sessions (expiram e podem ser revogadas uma a uma).
 *
 * 2. LEGADO — o modelo antigo por ADMIN_PASSWORD. Continua valendo ENQUANTO os
 *    segredos novos não forem definidos, para o site nunca ficar sem acesso durante a
 *    virada. Assim que o modo novo liga, o legado deixa de ser aceito.
 *
 * O legado é inseguro por construção: o cookie é sha256(senha + salt público), ou seja,
 * equivale à senha, nunca expira e não pode ser revogado. Existe apenas como ponte.
 */

export const ADMIN_COOKIE_NAME = "lob_admin_session"; // legado
const ADMIN_COOKIE_SALT = "sitecampeonato-admin-v1"; // legado
const SESSION_HOURS = 12;

export const ADMIN_SESSION_COOKIE =
  process.env.NODE_ENV === "production" ? "__Host-lob_admin" : "lob_admin";

export type AdminIdentity = {
  id: string;
  username: string;
  displayName: string;
  isMaster: boolean;
  scopes: string[];
  mustChangePassword: boolean;
  /** true quando autenticado pelo modo legado (senha única) */
  legacy: boolean;
};

// ---------------------------------------------------------------- configuração

function getSessionSecret() {
  return process.env.ADMIN_SESSION_SECRET?.trim() ?? "";
}

export function getPasswordPepper() {
  return process.env.ADMIN_PASSWORD_PEPPER?.trim() ?? "";
}

/** O modo novo só liga quando TUDO que ele precisa está presente. */
export function isNewAuthEnabled() {
  return Boolean(getSessionSecret() && getPasswordPepper() && isSupabaseConfigured());
}

export function getAdminPasswordFromEnv() {
  const value = process.env.ADMIN_PASSWORD?.trim();
  return value && value.length > 0 ? value : null;
}

export function isAdminConfigured() {
  return isNewAuthEnabled() || Boolean(getAdminPasswordFromEnv());
}

// ---------------------------------------------------------------- legado (ponte)

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function constantEquals(a: string, b: string) {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);
  if (aBuffer.length !== bBuffer.length) return false;
  return timingSafeEqual(aBuffer, bBuffer);
}

export function getAdminAuthToken() {
  const password = getAdminPasswordFromEnv();
  if (!password) return null;
  return sha256(`${password}:${ADMIN_COOKIE_SALT}`);
}

export function verifyAdminPassword(input: string) {
  const expected = getAdminPasswordFromEnv();
  if (!expected) return false;
  return constantEquals(input, expected);
}

function isAuthorizedLegacyRequest(request: NextRequest) {
  const expectedToken = getAdminAuthToken();
  if (!expectedToken) return false;
  const token = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  if (!token) return false;
  return constantEquals(token, expectedToken);
}

// ---------------------------------------------------------------- modo novo

export function hashUserAgent(userAgent: string | null) {
  return createHash("sha256").update(userAgent ?? "").digest("hex").slice(0, 32);
}

function toIdentity(user: AdminUserRow): AdminIdentity {
  return {
    id: user.id,
    username: user.username,
    displayName: user.display_name,
    isMaster: user.is_master,
    scopes: user.scopes ?? [],
    mustChangePassword: user.must_change_password,
    legacy: false,
  };
}

/** Cria a sessão no banco e devolve os dados do cookie assinado. */
export async function issueSessionCookie(
  user: AdminUserRow,
  request: NextRequest,
): Promise<{ name: string; value: string; maxAge: number }> {
  const sessionId = newSessionId();
  const expiresAt = new Date(Date.now() + SESSION_HOURS * 60 * 60 * 1000);

  await createSession({
    id: sessionId,
    userId: user.id,
    expiresAt,
    ipHash: hashIp(getClientIp(request.headers)),
    uaHash: hashUserAgent(request.headers.get("user-agent")),
  });

  const value = signSessionToken(
    {
      sid: sessionId,
      uid: user.id,
      exp: Math.floor(expiresAt.getTime() / 1000),
      epoch: user.session_epoch,
    },
    getSessionSecret(),
  );

  return { name: ADMIN_SESSION_COOKIE, value, maxAge: SESSION_HOURS * 60 * 60 };
}

/** Logout de verdade: revoga a sessão no servidor, não só limpa o cookie. */
export async function revokeRequestSession(request: NextRequest): Promise<void> {
  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  const payload = verifySessionToken(token, getSessionSecret());
  if (payload) await revokeSession(payload.sid, "logout");
}

async function getNewAuthIdentity(request: NextRequest): Promise<AdminIdentity | null> {
  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;

  // Verificação barata primeiro (assinatura + expiração): visitante anônimo nem toca no banco.
  const payload = verifySessionToken(token, getSessionSecret());
  if (!payload) return null;

  const session = await findActiveSession(payload.sid);
  if (!session || session.user_id !== payload.uid) return null;

  const user = await findUserById(payload.uid);
  if (!user || user.disabled_at) return null;

  // "Sair de todos os dispositivos": basta incrementar session_epoch do usuário.
  if (user.session_epoch !== payload.epoch) return null;

  return toIdentity(user);
}

// ---------------------------------------------------------------- API pública

/**
 * Identidade do requisitante, ou null. É assíncrona porque o modo novo confere a
 * sessão no banco — é justamente isso que permite revogar acesso na hora.
 */
export async function getAdminIdentity(request: NextRequest): Promise<AdminIdentity | null> {
  if (isNewAuthEnabled()) return getNewAuthIdentity(request);

  if (isAuthorizedLegacyRequest(request)) {
    return {
      id: "legacy",
      username: "admin",
      displayName: "Administrador",
      isMaster: true,
      scopes: [],
      mustChangePassword: false,
      legacy: true,
    };
  }

  return null;
}

export async function isAuthorizedAdminRequest(request: NextRequest): Promise<boolean> {
  return (await getAdminIdentity(request)) !== null;
}
