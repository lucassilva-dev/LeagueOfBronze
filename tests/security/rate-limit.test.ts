import { describe, expect, it } from "vitest";

import {
  descontarPropriaReserva,
  evaluateLoginRateLimit,
  MOTIVOS_QUE_NAO_CONTAM,
  RATE_LIMIT,
  reservasDoIpContamNoTeto,
  TENTATIVA_EM_ANDAMENTO,
  TENTATIVA_ERRO_INTERNO,
} from "@/lib/security/rate-limit";

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

describe("reservas em voo (DIFF-BE-01 / DIFF-BE-03)", () => {
  it("no teto por IP, reserva em voo só pesa contra a MESMA conta", () => {
    // 5 reservas em voo deste IP contra OUTRAS contas: logins certos e simultâneos da mesma rede.
    expect(evaluateLoginRateLimit({ ...base, emVooDoIp: 5, emVooDoIpNaConta: 0 }).allowed).toBe(true);
    // 5 reservas em voo deste IP contra esta conta: rajada contra um alvo.
    const d = evaluateLoginRateLimit({ ...base, emVooDoIp: 5, emVooDoIpNaConta: 5 });
    expect(d).toMatchObject({ allowed: false, reason: "ip_bloqueado", retryAfterSeconds: RATE_LIMIT.windowSeconds });
    // Falhas concluídas e reservas na mesma conta somam.
    expect(evaluateLoginRateLimit({ ...base, failuresByIp: 3, emVooDoIp: 2, emVooDoIpNaConta: 2 }).allowed).toBe(false);
  });

  it("folga própria: falhas concluídas + reservas em voo do IP, de qualquer conta, até o teto da folga", () => {
    const abaixo = { ...base, failuresByIp: 2, emVooDoIp: RATE_LIMIT.maxTentativasPorIpComEmVoo - 3 };
    expect(evaluateLoginRateLimit(abaixo).allowed).toBe(true);
    const d = evaluateLoginRateLimit({ ...abaixo, emVooDoIp: RATE_LIMIT.maxTentativasPorIpComEmVoo - 2 });
    // Bloqueio passageiro: as reservas em voo terminam em menos de 1 s.
    expect(d).toMatchObject({ allowed: false, reason: "ip_bloqueado", retryAfterSeconds: RATE_LIMIT.emVooSeconds });
  });

  it("descontarPropriaReserva tira a própria linha das contagens de reservas em voo e da conta, não das falhas concluídas", () => {
    const lido = { failuresByIp: 3, failuresByUser: 4, ipHadRecentSuccess: false, emVooDoIp: 2, emVooDoIpNaConta: 1 };
    expect(descontarPropriaReserva(lido, true)).toEqual({ ...lido, failuresByUser: 3, emVooDoIp: 1, emVooDoIpNaConta: 0 });
    expect(descontarPropriaReserva(lido, false)).toEqual(lido);
  });

  it("cadastro: toda reserva em voo do IP pesa no teto por IP", () => {
    const lido = { ...base, emVooDoIp: 5, emVooDoIpNaConta: 0 };
    expect(evaluateLoginRateLimit(lido).allowed).toBe(true);
    expect(evaluateLoginRateLimit(reservasDoIpContamNoTeto(lido)).allowed).toBe(false);
  });

  it("os motivos que não contam incluem o erro do servidor, e nunca a reserva em voo", () => {
    expect(MOTIVOS_QUE_NAO_CONTAM).toEqual(expect.arrayContaining(["ip_bloqueado", "usuario_bloqueado", TENTATIVA_ERRO_INTERNO]));
    expect(MOTIVOS_QUE_NAO_CONTAM).not.toContain(TENTATIVA_EM_ANDAMENTO);
  });
});
