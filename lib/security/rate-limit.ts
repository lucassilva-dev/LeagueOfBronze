/**
 * Política de bloqueio do login.
 *
 * Função PURA de propósito: o contador vive no Postgres (serverless não compartilha
 * memória entre instâncias, então um limitador em memória seria contornado
 * distribuindo as tentativas), mas a decisão é testável sem banco.
 */

export const RATE_LIMIT = {
  /** falhas por IP dentro da janela até bloquear */
  maxFailuresPerIp: 5,
  /** falhas por usuário dentro da janela até bloquear */
  maxFailuresPerUser: 10,
  /** tamanho da janela, em segundos */
  windowSeconds: 15 * 60,
};

export type RateLimitInput = {
  failuresByIp: number;
  failuresByUser: number;
  /** houve login bem-sucedido recente deste IP? */
  ipHadRecentSuccess: boolean;
};

export type RateLimitDecision = {
  allowed: boolean;
  retryAfterSeconds: number;
  reason: "ok" | "ip_bloqueado" | "usuario_bloqueado";
};

export function evaluateLoginRateLimit(input: RateLimitInput): RateLimitDecision {
  if (input.failuresByIp >= RATE_LIMIT.maxFailuresPerIp) {
    return { allowed: false, retryAfterSeconds: RATE_LIMIT.windowSeconds, reason: "ip_bloqueado" };
  }

  // O bloqueio por usuário é pulado quando o IP já se autenticou com sucesso
  // recentemente. Sem isso, um atacante martelando o seu nome de usuário conseguiria
  // trancar VOCÊ para fora do seu próprio site — negação de serviço trivial.
  if (input.failuresByUser >= RATE_LIMIT.maxFailuresPerUser && !input.ipHadRecentSuccess) {
    return {
      allowed: false,
      retryAfterSeconds: RATE_LIMIT.windowSeconds,
      reason: "usuario_bloqueado",
    };
  }

  return { allowed: true, retryAfterSeconds: 0, reason: "ok" };
}
