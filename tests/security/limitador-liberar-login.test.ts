import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { auditorias, criarBancoSimulado } from "../inscricoes/_banco-simulado";

/**
 * «Liberar login» (decisão F do Lucas, 2026-10-22).
 *
 * O caso (SEG-05): alguém martela o e-mail de um capitão de vários IPs e tranca a conta (10
 * falhas). O capitão, com a senha certa e de outro IP, leva 429 no dia do draft. O botão do
 * painel marca as falhas recentes DAQUELA conta como `liberado_pela_organizacao`: elas
 * deixam de contar contra a conta — mas continuam contando para o IP de onde vieram, e o IP
 * do atacante segue bloqueado.
 */

const estado = vi.hoisted(() => ({
  banco: null as unknown as ReturnType<typeof import("../inscricoes/_banco-simulado").criarBancoSimulado>,
  negar: null as string | null,
}));

vi.mock("@/lib/data-store", () => ({
  isSupabaseConfigured: () => true,
  createSupabaseAdminClient: () => estado.banco.cliente(),
}));

vi.mock("@/lib/security/route-guard", async () => {
  const { NextResponse } = await import("next/server");
  return {
    mesmaOrigem: () => true,
    requireAdmin: async (_r: unknown, escopo?: string) => {
      if (escopo && escopo === estado.negar) {
        return { ok: false, response: NextResponse.json({ error: "sem escopo", missing: [escopo] }, { status: 403 }) };
      }
      return { ok: true, identity: { username: "lucas", isMaster: true, scopes: [] } };
    },
  };
});

const {
  contarDasLinhas,
  evaluateLoginRateLimit,
  MOTIVOS_QUE_NAO_CONTAM,
  RATE_LIMIT,
  TENTATIVA_LIBERADA_PELA_ORGANIZACAO,
} = await import("@/lib/security/rate-limit");
const jogadores = await import("@/lib/jogadores/store");
const { PATCH, GET } = await import("@/app/api/admin/edicao/route");

const AGORA = Date.now();
const CAPITAO = "capitao@x.com";
const ID = "3f2504e0-4f89-11d3-9a0c-0305e82c3301";
const haMin = (min: number) => new Date(AGORA - min * 60_000).toISOString();

function req(corpo: unknown): NextRequest {
  const texto = JSON.stringify(corpo);
  return {
    method: "PATCH",
    headers: new Headers({ host: "x", "sec-fetch-site": "same-origin" }),
    text: async () => texto,
  } as unknown as NextRequest;
}

/** 10 palpites errados contra o capitão, de 2 IPs do atacante (5 cada), nos últimos minutos. */
function ataque() {
  return Array.from({ length: 10 }, (_, i) => ({
    id: i + 1,
    email: CAPITAO,
    ip_hash: i < 5 ? "ip-atacante-1" : "ip-atacante-2",
    success: false,
    reason: "senha_incorreta",
    occurred_at: haMin(10 - i * 0.5),
  }));
}

const contagem = (linhas: readonly Record<string, unknown>[], ip: string) =>
  contarDasLinhas(
    linhas.map((l) => ({
      ip_hash: l.ip_hash as string,
      conta: l.email as string,
      success: l.success as boolean,
      reason: l.reason as string,
      occurred_at: l.occurred_at as string,
    })),
    ip,
    CAPITAO,
    AGORA,
  );

beforeEach(() => {
  estado.negar = null;
  estado.banco = criarBancoSimulado();
  estado.banco.tabelas = {
    jogador_login_attempts: ataque(),
    inscricoes: [{ id: ID, email: CAPITAO, riot_id: "Capitao#BR1" }],
    inscricao_auditoria: [],
  };
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("a regra do limitador", () => {
  it("o motivo novo está entre os que não contam contra a conta", () => {
    expect(MOTIVOS_QUE_NAO_CONTAM).toContain(TENTATIVA_LIBERADA_PELA_ORGANIZACAO);
  });

  it("liberada: a conta destrava (do IP do capitão), o IP do atacante continua bloqueado", () => {
    const antes = ataque();
    // Antes: o capitão, do IP de casa, leva «usuario_bloqueado».
    const casaAntes = { ...contagem(antes, "ip-casa"), ipHadRecentSuccess: false };
    expect(evaluateLoginRateLimit(casaAntes).reason).toBe("usuario_bloqueado");

    const depois = antes.map((l) => ({ ...l, reason: TENTATIVA_LIBERADA_PELA_ORGANIZACAO }));
    const casa = { ...contagem(depois, "ip-casa"), ipHadRecentSuccess: false };
    expect(casa.failuresByUser).toBe(0);
    expect(evaluateLoginRateLimit(casa)).toMatchObject({ allowed: true });

    const atacante = { ...contagem(depois, "ip-atacante-1"), ipHadRecentSuccess: false };
    expect(atacante.failuresByIp).toBe(5);
    expect(evaluateLoginRateLimit(atacante)).toMatchObject({ allowed: false, reason: "ip_bloqueado" });
  });
});

describe("liberarLoginDaConta", () => {
  it("troca só as falhas recentes que travam ESTA conta", async () => {
    const tentativas = estado.banco.tabelas.jogador_login_attempts!;
    tentativas.push(
      { id: 11, email: CAPITAO, ip_hash: "ip-casa", success: false, reason: "cadastro", occurred_at: haMin(3) },
      { id: 12, email: CAPITAO, ip_hash: "ip-x", success: false, reason: "em_andamento", occurred_at: haMin(0.1) },
      { id: 13, email: CAPITAO, ip_hash: "ip-x", success: false, reason: "usuario_bloqueado", occurred_at: haMin(2) },
      { id: 14, email: CAPITAO, ip_hash: "ip-x", success: false, reason: "senha_incorreta", occurred_at: haMin(RATE_LIMIT.windowSeconds / 60 + 5) },
      { id: 15, email: "outro@x.com", ip_hash: "ip-x", success: false, reason: "senha_incorreta", occurred_at: haMin(2) },
      { id: 16, email: CAPITAO, ip_hash: "ip-casa", success: true, reason: "ok", occurred_at: haMin(1) },
    );

    expect(await jogadores.liberarLoginDaConta(CAPITAO, AGORA)).toBe(10);
    const motivo = (id: number) => tentativas.find((l) => l.id === id)!.reason;
    for (let id = 1; id <= 10; id++) expect(motivo(id)).toBe(TENTATIVA_LIBERADA_PELA_ORGANIZACAO);
    expect([11, 12, 13, 14, 15, 16].map(motivo)).toEqual([
      "cadastro",
      "em_andamento",
      "usuario_bloqueado",
      "senha_incorreta", // fora da janela
      "senha_incorreta", // outra conta
      "ok",
    ]);
  });

  it("a contagem que o painel mostra antes: 10 falhas do capitão; depois de liberar, nenhuma", async () => {
    expect((await jogadores.falhasRecentesPorEmail(AGORA)).get(CAPITAO)).toBe(10);
    await jogadores.liberarLoginDaConta(CAPITAO, AGORA);
    expect((await jogadores.falhasRecentesPorEmail(AGORA)).get(CAPITAO)).toBeUndefined();
  });
});

describe("rota do painel: ação «liberar_login»", () => {
  it("libera pela inscrição (o e-mail sai do banco, não do corpo), com auditoria", async () => {
    const r = await PATCH(req({ acao: "liberar_login", dados: { inscricaoId: ID } }));
    expect(r.status).toBe(200);
    const corpo = await r.json();
    expect(corpo.liberadas).toBe(10);
    expect(JSON.stringify(corpo)).not.toContain(CAPITAO);
    const registro = auditorias(estado.banco).find((a) => a.acao === "login_liberado");
    expect(registro).toMatchObject({ inscricao_id: ID, autor: "lucas", detalhe: { falhasLiberadas: 10 } });
  });

  it("exige o escopo de conferência", async () => {
    estado.negar = "inscricoes:conferir";
    const r = await PATCH(req({ acao: "liberar_login", dados: { inscricaoId: ID } }));
    expect(r.status).toBe(403);
    expect(estado.banco.tabelas.jogador_login_attempts!.every((l) => l.reason === "senha_incorreta")).toBe(true);
  });

  it("inscrição que não existe: 404", async () => {
    const r = await PATCH(req({ acao: "liberar_login", dados: { inscricaoId: "3f2504e0-4f89-11d3-9a0c-0305e82c33ff" } }));
    expect(r.status).toBe(404);
  });

  it("o GET do painel traz quantas falhas cada inscrito tem (o número mostrado antes do botão)", async () => {
    estado.banco.tabelas.edicao_config = [{ id: 1, jogadores_por_time: 5, max_times: 6 }];
    estado.banco.tabelas.inscricao_pagamentos = [];
    estado.banco.tabelas.inscricao_conferencias = [];
    const corpo = await (await GET(req({}))).json();
    expect(corpo.falhasDeLogin).toEqual({ [ID]: 10 });
  });
});
