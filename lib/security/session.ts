import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

/**
 * Token de sessão do admin.
 *
 * Substitui o modelo anterior, em que o cookie era `sha256(senha + salt público)` —
 * ou seja, o cookie ERA a senha: idêntico em todo dispositivo, eterno, impossível de
 * revogar, e quebrável offline porque o salt está num repositório público.
 *
 * Agora o cookie carrega apenas um identificador ALEATÓRIO de sessão, assinado com
 * HMAC-SHA256 usando um segredo próprio (ADMIN_SESSION_SECRET, que não é a senha).
 * A sessão de verdade vive no banco, então dá para expirar e revogar — inclusive
 * "sair de todos os dispositivos" pelo `epoch`.
 */

const TOKEN_VERSION = "v1";

export type SessionPayload = {
  /** id da sessão (linha em admin_sessions) */
  sid: string;
  /** id do usuário */
  uid: string;
  /** expiração, em segundos desde a época */
  exp: number;
  /** geração de sessão do usuário; incrementar invalida tudo dele de uma vez */
  epoch: number;
};

export function newSessionId(): string {
  return randomUUID();
}

function sign(body: string, secret: string): string {
  return createHmac("sha256", secret).update(body).digest("base64url");
}

export function signSessionToken(payload: SessionPayload, secret: string): string {
  if (!secret) throw new Error("ADMIN_SESSION_SECRET não configurado.");
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${TOKEN_VERSION}.${body}.${sign(body, secret)}`;
}

/**
 * Valida assinatura, formato e expiração — SEM tocar no banco.
 * Serve como filtro barato: páginas públicas chamam /api/admin/session e um visitante
 * sem cookie nem chega a consultar o Postgres.
 */
export function verifySessionToken(
  token: string | undefined | null,
  secret: string,
  nowMs: number = Date.now(),
): SessionPayload | null {
  if (!token || !secret) return null;

  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [version, body, signature] = parts;
  // Rejeita explicitamente qualquer formato antigo/desconhecido (o cookie legado
  // não tem pontos, então nem chega aqui — mas deixamos explícito).
  if (version !== TOKEN_VERSION || !body || !signature) return null;

  const expected = sign(body, secret);
  const given = Buffer.from(signature, "utf8");
  const want = Buffer.from(expected, "utf8");
  if (given.length !== want.length || !timingSafeEqual(given, want)) return null;

  let payload: unknown;
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return null;
  }

  if (!payload || typeof payload !== "object") return null;
  const { sid, uid, exp, epoch } = payload as Record<string, unknown>;
  if (typeof sid !== "string" || sid.length === 0) return null;
  if (typeof uid !== "string" || uid.length === 0) return null;
  if (typeof exp !== "number" || !Number.isFinite(exp)) return null;
  if (typeof epoch !== "number" || !Number.isFinite(epoch)) return null;

  if (exp * 1000 <= nowMs) return null;

  return { sid, uid, exp, epoch };
}
