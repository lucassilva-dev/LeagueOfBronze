import { describe, expect, it } from "vitest";

import { evaluateLoginRateLimit, RATE_LIMIT } from "@/lib/security/rate-limit";

const base = { failuresByIp: 0, failuresByUser: 0, ipHadRecentSuccess: false };

describe("bloqueio de força bruta no login", () => {
  it("permite quando não há falhas", () => {
    expect(evaluateLoginRateLimit(base).allowed).toBe(true);
  });

  it("permite até o limite por IP e bloqueia ao atingi-lo", () => {
    const abaixo = { ...base, failuresByIp: RATE_LIMIT.maxFailuresPerIp - 1 };
    expect(evaluateLoginRateLimit(abaixo).allowed).toBe(true);

    const noLimite = { ...base, failuresByIp: RATE_LIMIT.maxFailuresPerIp };
    const d = evaluateLoginRateLimit(noLimite);
    expect(d.allowed).toBe(false);
    expect(d.reason).toBe("ip_bloqueado");
    expect(d.retryAfterSeconds).toBe(RATE_LIMIT.windowSeconds);
  });

  it("bloqueia por usuário quando o IP é desconhecido", () => {
    const d = evaluateLoginRateLimit({ ...base, failuresByUser: RATE_LIMIT.maxFailuresPerUser });
    expect(d.allowed).toBe(false);
    expect(d.reason).toBe("usuario_bloqueado");
  });

  it("NÃO tranca o dono fora: IP com login recente bem-sucedido escapa do bloqueio por usuário", () => {
    // Sem esta regra, um atacante martelando o nome de usuário do dono conseguiria
    // trancá-lo para fora do próprio site — negação de serviço trivial.
    const d = evaluateLoginRateLimit({
      ...base,
      failuresByUser: RATE_LIMIT.maxFailuresPerUser * 10,
      ipHadRecentSuccess: true,
    });
    expect(d.allowed).toBe(true);
  });

  it("o bloqueio por IP vale mesmo para IP conhecido (protege contra máquina comprometida)", () => {
    const d = evaluateLoginRateLimit({
      ...base,
      failuresByIp: RATE_LIMIT.maxFailuresPerIp,
      ipHadRecentSuccess: true,
    });
    expect(d.allowed).toBe(false);
    expect(d.reason).toBe("ip_bloqueado");
  });
});
