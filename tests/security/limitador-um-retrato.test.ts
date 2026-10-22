import { beforeEach, describe, expect, it, vi } from "vitest";

import { criarBancoEmMemoria, type BancoEmMemoria } from "./_banco-em-memoria";

/**
 * DIFF2-BE-01 — a contagem do limitador sai de UM retrato só do banco.
 *
 * As contagens eram seis `count` em paralelo, e no PostgREST cada `count` é uma requisição
 * com o próprio retrato. Uma tentativa que terminava ENTRE dois retratos (em voo quando as
 * falhas concluídas eram lidas, concluída quando as em voo eram lidas) não entrava em
 * nenhuma — e, de um IP, passavam 10 palpites contra uma conta em vez de 5.
 *
 * Agora as linhas da janela (do IP ou da conta) vêm numa consulta só e a conta é feita no
 * servidor (`contarDasLinhas`). Aqui:
 *  - a regra pura: cada tentativa conta exatamente uma vez, esteja em voo ou concluída;
 *  - os dois stores leem a janela numa consulta só (a do selo de 30 dias fica à parte, porque
 *    só alimenta a válvula). Com as seis consultas de antes, este teste falha.
 */

const estado = vi.hoisted(() => ({
  banco: null as unknown as BancoEmMemoria,
  leituras: [] as { tabela: string; soContagem: boolean }[],
}));

vi.mock("@/lib/data-store", () => ({
  isSupabaseConfigured: () => true,
  createSupabaseAdminClient: () => ({
    from: (tabela: string) => {
      const q = estado.banco.cliente().from(tabela) as Record<string, (...a: unknown[]) => unknown>;
      const original = q.select;
      q.select = (...args: unknown[]) => {
        estado.leituras.push({ tabela, soContagem: Boolean((args[1] as { head?: boolean } | undefined)?.head) });
        return original!(...args);
      };
      return q;
    },
  }),
}));

const { contarDasLinhas, RATE_LIMIT, TENTATIVA_EM_ANDAMENTO, TENTATIVA_ERRO_INTERNO, valorDoFiltroOu } = await import(
  "@/lib/security/rate-limit"
);
const { contarTentativasJogador } = await import("@/lib/jogadores/store");
const { getRecentAttemptCounts } = await import("@/lib/security/admin-store");

const AGORA = Date.parse("2026-11-20T23:05:00.000Z");
const haSegundos = (s: number) => new Date(AGORA - s * 1000).toISOString();

function linha(over: Partial<{ ip_hash: string; conta: string; success: boolean; reason: string; occurred_at: string }>) {
  return {
    ip_hash: "ip-x",
    conta: "capitao@x.com",
    success: false,
    reason: "senha_incorreta",
    occurred_at: haSegundos(5),
    ...over,
  };
}

beforeEach(() => {
  estado.banco = criarBancoEmMemoria(1);
  estado.leituras = [];
});

describe("contarDasLinhas · cada tentativa conta uma vez, em voo ou concluída", () => {
  it("5 tentativas do grupo A, qualquer que seja o momento da leitura, somam 5 no teto do IP", () => {
    // k delas já gravaram o resultado; as outras ainda estão em voo. O retrato é um só.
    for (let concluidas = 0; concluidas <= 5; concluidas++) {
      const linhas = Array.from({ length: 5 }, (_, i) =>
        i < concluidas ? linha({}) : linha({ reason: TENTATIVA_EM_ANDAMENTO }),
      );
      const c = contarDasLinhas(linhas, "ip-x", "capitao@x.com", AGORA);
      expect(c.failuresByIp + c.emVooDoIpNaConta, `${concluidas} concluídas`).toBe(5);
      expect(c.failuresByUser, `${concluidas} concluídas`).toBe(5);
    }
  });

  it("reserva abandonada (mais velha que emVooSeconds) não pesa; a recente pesa", () => {
    const abandonada = linha({ reason: TENTATIVA_EM_ANDAMENTO, occurred_at: haSegundos(RATE_LIMIT.emVooSeconds + 5) });
    const recente = linha({ reason: TENTATIVA_EM_ANDAMENTO, occurred_at: haSegundos(2) });
    const c = contarDasLinhas([abandonada, recente], "ip-x", "capitao@x.com", AGORA);
    expect(c).toEqual({ failuresByIp: 0, failuresByUser: 1, emVooDoIp: 1, emVooDoIpNaConta: 1 });
  });

  it("recusa do limitador e erro interno ficam gravados mas não contam; fora da janela também não", () => {
    const c = contarDasLinhas(
      [
        linha({ reason: "ip_bloqueado" }),
        linha({ reason: "usuario_bloqueado" }),
        linha({ reason: TENTATIVA_ERRO_INTERNO }),
        linha({ success: true, reason: "ok" }),
        linha({ occurred_at: haSegundos(RATE_LIMIT.windowSeconds + 60) }),
      ],
      "ip-x",
      "capitao@x.com",
      AGORA,
    );
    expect(c).toEqual({ failuresByIp: 0, failuresByUser: 0, emVooDoIp: 0, emVooDoIpNaConta: 0 });
  });

  it("separa IP e conta: falha de outro IP pesa só na conta; de outra conta, só no IP", () => {
    const c = contarDasLinhas(
      [
        linha({ ip_hash: "ip-y" }),
        linha({ conta: "outro@x.com" }),
        linha({ conta: "outro@x.com", reason: TENTATIVA_EM_ANDAMENTO }),
      ],
      "ip-x",
      "capitao@x.com",
      AGORA,
    );
    expect(c).toEqual({ failuresByIp: 1, failuresByUser: 1, emVooDoIp: 1, emVooDoIpNaConta: 0 });
  });

  it("o valor do filtro .or() vai entre aspas, com aspas e barras escapadas", () => {
    expect(valorDoFiltroOu("a.b,c@x.com")).toBe('"a.b,c@x.com"');
    expect(valorDoFiltroOu('a"b\\c')).toBe('"a\\"b\\\\c"');
  });
});

describe("os stores leem a janela numa consulta só", () => {
  it("jogador: uma leitura de linhas da janela + a contagem do selo, nada mais", async () => {
    estado.banco.tabelas.jogador_login_attempts = [
      { ip_hash: "ip-x", email: "capitao@x.com", success: false, reason: "senha_incorreta", occurred_at: new Date().toISOString() },
      { ip_hash: "ip-x", email: "capitao@x.com", success: false, reason: TENTATIVA_EM_ANDAMENTO, occurred_at: new Date().toISOString() },
    ];
    const c = await contarTentativasJogador("capitao@x.com", "ip-x");

    const daTabela = estado.leituras.filter((l) => l.tabela === "jogador_login_attempts");
    expect(daTabela).toEqual([
      { tabela: "jogador_login_attempts", soContagem: false },
      { tabela: "jogador_login_attempts", soContagem: true },
    ]);
    expect(c).toMatchObject({ failuresByIp: 1, emVooDoIpNaConta: 1, failuresByUser: 2, ipHadRecentSuccess: false });
  });

  it("painel: o mesmo para getRecentAttemptCounts", async () => {
    estado.banco.tabelas.admin_login_attempts = [
      { ip_hash: "ip-x", username: "lucas", success: false, reason: "senha_incorreta", occurred_at: new Date().toISOString() },
    ];
    const c = await getRecentAttemptCounts("lucas", "ip-x");

    const daTabela = estado.leituras.filter((l) => l.tabela === "admin_login_attempts");
    expect(daTabela).toEqual([
      { tabela: "admin_login_attempts", soContagem: false },
      { tabela: "admin_login_attempts", soContagem: true },
    ]);
    expect(c).toMatchObject({ failuresByIp: 1, failuresByUser: 1, emVooDoIp: 0 });
  });
});
