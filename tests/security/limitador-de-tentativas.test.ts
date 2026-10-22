import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { criarBancoEmMemoria, type BancoEmMemoria } from "./_banco-em-memoria";

/**
 * O limitador de tentativas de senha, pelas rotas de verdade.
 *
 * Roda o código REAL de `app/api/conta/{login,cadastro,senha}`, `app/api/admin/{login,senha}`,
 * dos stores, do limitador, da sessão (cookie assinado de verdade) e do scrypt. Só o banco
 * é simulado — com latência, para que uma rajada de pedidos simultâneos se intercale como
 * em produção.
 *
 * O que fica travado aqui:
 *  - SEG-01: o freio é "reserva, depois conta". Contando antes de gravar, uma rajada lia a
 *    contagem antes de qualquer falha existir e testava 30 senhas de uma vez.
 *  - SEG-02: o selo de "IP confiável" vale para o PAR (conta, IP), não só para o IP.
 *  - SEG-06: a "senha atual" da troca de senha passa pelo mesmo freio.
 *  - SEG-08: conta desativada responde como senha errada — não confirma a senha certa.
 *  - DIFF-BE-01: erro do servidor depois da reserva não deixa a linha presa em
 *    `em_andamento` (que contava como palpite errado e trancava quem tinha a senha certa).
 *  - DIFF-BE-03: logins CERTOS e simultâneos da mesma rede não se trancam uns aos outros.
 *  - SEG-05: o cadastro concluído naquele IP é prova de posse da conta (selo do par).
 */

process.env.ADMIN_SESSION_SECRET = "segredo-de-teste-com-tamanho-suficiente-1234567890";
process.env.ADMIN_PASSWORD_PEPPER = "pimenta-de-teste-com-tamanho-suficiente-1234567890";

const estado = vi.hoisted(() => ({
  banco: null as unknown as BancoEmMemoria,
  senhasTestadas: 0,
}));

vi.mock("@/lib/data-store", () => ({
  isSupabaseConfigured: () => true,
  createSupabaseAdminClient: () => estado.banco.cliente(),
}));

vi.mock("@/lib/security/password", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/security/password")>();
  return {
    ...real,
    verifyPassword: async (...args: Parameters<typeof real.verifyPassword>) => {
      estado.senhasTestadas += 1;
      return real.verifyPassword(...args);
    },
  };
});

const { hashPassword } = await import("@/lib/security/password");
const { hashIp } = await import("@/lib/security/admin-store");
const { RATE_LIMIT } = await import("@/lib/security/rate-limit");
const { pepperDeSenhaJogador } = await import("@/lib/jogadores/auth");
const { getPasswordPepper } = await import("@/lib/admin-auth");
const { POST: loginJogador } = await import("@/app/api/conta/login/route");
const { POST: cadastro } = await import("@/app/api/conta/cadastro/route");
const { POST: senhaJogador } = await import("@/app/api/conta/senha/route");
const { POST: loginAdmin } = await import("@/app/api/admin/login/route");
const { POST: senhaAdmin } = await import("@/app/api/admin/senha/route");

const SENHA_CAPITAO = "capitaoForte2026";
const SENHA_DESCARTAVEL = "descartavel2026";
const SENHA_MASTER = "masterForte2026";
const SENHA_AJUDANTE = "ajudante2026x";

/** Um script fora do navegador manda o `sec-fetch-site` que quiser — por isso ele passa. */
function pedido(corpo: unknown, ip: string, cookies: Record<string, string> = {}): NextRequest {
  const texto = JSON.stringify(corpo);
  return {
    method: "POST",
    headers: new Headers({ host: "leagueofbronze.xyz", "sec-fetch-site": "same-origin", "x-forwarded-for": ip }),
    cookies: { get: (nome: string) => (cookies[nome] ? { value: cookies[nome] } : undefined) },
    json: async () => JSON.parse(texto),
    text: async () => texto,
  } as unknown as NextRequest;
}

const hashes = { capitao: "", descartavel: "", master: "", ajudante: "" };

function tentativas(tabela: string) {
  return estado.banco.tabelas[tabela] ?? [];
}

/** Falhas que testaram senha de verdade (as recusadas pelo freio ficam de fora). */
function falhasReais(tabela: string, campo: "email" | "username", valor: string) {
  return tentativas(tabela).filter(
    (t) => t[campo] === valor && t.success === false && !["ip_bloqueado", "usuario_bloqueado"].includes(String(t.reason)),
  );
}

beforeEach(async () => {
  estado.banco = criarBancoEmMemoria(8);
  estado.senhasTestadas = 0;
  hashes.capitao ||= await hashPassword(SENHA_CAPITAO, pepperDeSenhaJogador());
  hashes.descartavel ||= await hashPassword(SENHA_DESCARTAVEL, pepperDeSenhaJogador());
  hashes.master ||= await hashPassword(SENHA_MASTER, getPasswordPepper());
  hashes.ajudante ||= await hashPassword(SENHA_AJUDANTE, getPasswordPepper());

  const jogador = (id: string, email: string, hash: string) => ({
    id,
    email,
    display_name: id,
    password_hash: hash,
    must_change_password: false,
    session_epoch: 0,
    disabled_at: null,
  });
  estado.banco.tabelas.jogador_contas = [
    jogador("capitao", "capitao@x.com", hashes.capitao),
    jogador("descartavel", "descartavel@x.com", hashes.descartavel),
  ];

  const admin = (id: string, username: string, hash: string, master: boolean) => ({
    id,
    username,
    display_name: username,
    password_hash: hash,
    must_change_password: false,
    is_master: master,
    scopes: [],
    disabled_at: null,
    session_epoch: 0,
  });
  estado.banco.tabelas.admin_users = [
    admin("master", "lucas", hashes.master, true),
    admin("ajudante", "ajudante", hashes.ajudante, false),
  ];
});

describe("SEG-01 — rajada simultânea não atravessa o teto", () => {
  it("login de jogador: 30 pedidos simultâneos do mesmo IP testam no máximo 5 senhas", async () => {
    const respostas = await Promise.all(
      Array.from({ length: 30 }, (_, i) =>
        loginJogador(pedido({ email: "capitao@x.com", senha: `palpite${i}abc` }, "1.1.1.1")),
      ),
    );

    expect(estado.senhasTestadas).toBeLessThanOrEqual(5);
    expect(respostas.filter((r) => r.status === 429).length).toBeGreaterThanOrEqual(25);
    // E o teto POR CONTA também não foi atravessado na mesma rajada.
    expect(falhasReais("jogador_login_attempts", "email", "capitao@x.com").length).toBeLessThanOrEqual(5);
    // Nenhuma tentativa ficou presa "em andamento": toda reserva foi concluída.
    expect(tentativas("jogador_login_attempts").some((t) => t.reason === "em_andamento")).toBe(false);
  });

  it("controle (sequencial): 5 senhas testadas, a 6ª já é 429 — a reserva não encolheu o teto", async () => {
    const status: number[] = [];
    for (let i = 0; i < 7; i++) {
      status.push((await loginJogador(pedido({ email: "capitao@x.com", senha: `palpite${i}abc` }, "1.1.1.1"))).status);
    }
    expect(status).toEqual([401, 401, 401, 401, 401, 429, 429]);
    expect(estado.senhasTestadas).toBe(5);
  });

  it("com 4 erros na janela, a 5ª tentativa com a senha CERTA entra (a própria reserva é descontada)", async () => {
    for (let i = 0; i < 4; i++) await loginJogador(pedido({ email: "capitao@x.com", senha: `errada${i}abc` }, "1.1.1.1"));
    const certa = await loginJogador(pedido({ email: "capitao@x.com", senha: SENHA_CAPITAO }, "1.1.1.1"));
    expect(certa.status).toBe(200);
  });

  it("login do painel: 25 pedidos simultâneos contra a master testam no máximo 5 senhas", async () => {
    const respostas = await Promise.all(
      Array.from({ length: 25 }, (_, i) => loginAdmin(pedido({ username: "lucas", password: `palpite${i}x` }, "1.1.1.1"))),
    );

    expect(estado.senhasTestadas).toBeLessThanOrEqual(5);
    expect(respostas.filter((r) => r.status === 429).length).toBeGreaterThanOrEqual(20);
    expect(tentativas("admin_login_attempts").some((t) => t.reason === "em_andamento")).toBe(false);
  });

  it("cadastro: 12 pedidos simultâneos do mesmo IP criam no máximo 5 contas", async () => {
    const respostas = await Promise.all(
      Array.from({ length: 12 }, (_, i) =>
        cadastro(pedido({ email: `fake${i}@x.com`, nome: `Fake ${i}`, senha: "senhaFake12345" }, "7.7.7.7")),
      ),
    );

    const criadas = (estado.banco.tabelas.jogador_contas ?? []).filter((c) => String(c.email).startsWith("fake"));
    expect(criadas.length).toBeLessThanOrEqual(5);
    expect(respostas.filter((r) => r.status === 429).length).toBeGreaterThanOrEqual(7);
  });
});

describe("SEG-02 — o selo de IP confiável é do par (conta, IP)", () => {
  async function capitaoNoTetoPorConta() {
    for (let i = 0; i < 5; i++) await loginJogador(pedido({ email: "capitao@x.com", senha: `a${i}errada1` }, "2.2.2.2"));
    for (let i = 0; i < 5; i++) await loginJogador(pedido({ email: "capitao@x.com", senha: `b${i}errada1` }, "3.3.3.3"));
  }

  it("entrar na PRÓPRIA conta descartável não reabre, daquele IP, os palpites contra o capitão", async () => {
    await capitaoNoTetoPorConta();
    expect((await loginJogador(pedido({ email: "descartavel@x.com", senha: SENHA_DESCARTAVEL }, "5.5.5.5"))).status).toBe(200);

    const antes = estado.senhasTestadas;
    const r = await loginJogador(pedido({ email: "capitao@x.com", senha: "palpiteNovo123" }, "5.5.5.5"));
    expect(r.status).toBe(429);
    expect(estado.senhasTestadas).toBe(antes);
  });

  it("a válvula continua valendo para quem JÁ entrou na própria conta daquele IP", async () => {
    expect((await loginJogador(pedido({ email: "capitao@x.com", senha: SENHA_CAPITAO }, "9.9.9.9"))).status).toBe(200);
    await capitaoNoTetoPorConta();
    const r = await loginJogador(pedido({ email: "capitao@x.com", senha: SENHA_CAPITAO }, "9.9.9.9"));
    expect(r.status).toBe(200);
  });

  it("painel: o login certo de uma conta limitada não reabre os palpites contra a master", async () => {
    for (let i = 0; i < 5; i++) await loginAdmin(pedido({ username: "lucas", password: `a${i}x` }, "2.2.2.2"));
    for (let i = 0; i < 5; i++) await loginAdmin(pedido({ username: "lucas", password: `b${i}x` }, "3.3.3.3"));

    expect((await loginAdmin(pedido({ username: "ajudante", password: SENHA_AJUDANTE }, "5.5.5.5"))).status).toBe(200);
    const antes = estado.senhasTestadas;
    const r = await loginAdmin(pedido({ username: "lucas", password: "d0x" }, "5.5.5.5"));
    expect(r.status).toBe(429);
    expect(estado.senhasTestadas).toBe(antes);
  });
});

describe("SEG-08 — conta desativada não vira oráculo de senha", () => {
  it("jogador: senha errada e senha CERTA recebem a mesma resposta", async () => {
    estado.banco.tabelas.jogador_contas![0]!.disabled_at = "2026-10-01T00:00:00Z";
    const errada = await loginJogador(pedido({ email: "capitao@x.com", senha: "erradaErrada1" }, "1.2.3.4"));
    const certa = await loginJogador(pedido({ email: "capitao@x.com", senha: SENHA_CAPITAO }, "1.2.3.4"));

    expect(certa.status).toBe(errada.status);
    expect(await certa.json()).toEqual(await errada.json());
    expect(certa.cookies.get("lob_jogador")).toBeUndefined();
    // O motivo real fica no registro.
    expect(tentativas("jogador_login_attempts").some((t) => t.reason === "conta_desativada")).toBe(true);
  });

  it("painel: senha errada e senha CERTA recebem a mesma resposta", async () => {
    estado.banco.tabelas.admin_users![1]!.disabled_at = "2026-10-01T00:00:00Z";
    const errada = await loginAdmin(pedido({ username: "ajudante", password: "errada12345" }, "1.2.3.4"));
    const certa = await loginAdmin(pedido({ username: "ajudante", password: SENHA_AJUDANTE }, "1.2.3.4"));

    expect(certa.status).toBe(errada.status);
    expect(await certa.json()).toEqual(await errada.json());
    expect(certa.cookies.get("lob_admin")).toBeUndefined();
  });
});

describe("SEG-06 — a 'senha atual' da troca de senha passa pelo freio", () => {
  it("jogador com sessão: palpites em sequência — 5 testados e registrados, o 6º já é 429", async () => {
    const login = await loginJogador(pedido({ email: "capitao@x.com", senha: SENHA_CAPITAO }, "1.1.1.1"));
    const cookie = login.cookies.get("lob_jogador")!.value;
    estado.senhasTestadas = 0;

    const status: number[] = [];
    for (let i = 0; i < 7; i++) {
      const r = await senhaJogador(
        pedido({ senhaAtual: `palpite${i}x`, senhaNova: "novaSenha98765" }, "1.1.1.1", { lob_jogador: cookie }),
      );
      status.push(r.status);
    }

    expect(status).toEqual([401, 401, 401, 401, 401, 429, 429]);
    expect(estado.senhasTestadas).toBe(5);
    expect(tentativas("jogador_login_attempts").filter((t) => t.reason === "senha_atual_incorreta")).toHaveLength(5);
  });

  it("jogador com sessão: 20 palpites simultâneos testam no máximo 5, e toda senha testada fica registrada", async () => {
    const login = await loginJogador(pedido({ email: "capitao@x.com", senha: SENHA_CAPITAO }, "1.1.1.1"));
    const cookie = login.cookies.get("lob_jogador")!.value;
    estado.senhasTestadas = 0;

    const respostas = await Promise.all(
      Array.from({ length: 20 }, (_, i) =>
        senhaJogador(
          pedido({ senhaAtual: `palpite${i}x`, senhaNova: "novaSenha98765" }, "1.1.1.1", { lob_jogador: cookie }),
        ),
      ),
    );

    expect(estado.senhasTestadas).toBeLessThanOrEqual(5);
    expect(respostas.filter((r) => r.status === 429).length).toBeGreaterThanOrEqual(15);
    // Uma rajada que chega toda junta pode não ter NENHUM palpite testado (todos se
    // enxergam reservados) — o que importa é que cada senha testada deixou rastro.
    expect(tentativas("jogador_login_attempts").filter((t) => t.reason === "senha_atual_incorreta")).toHaveLength(
      estado.senhasTestadas,
    );
    expect(tentativas("jogador_login_attempts").some((t) => t.reason === "em_andamento")).toBe(false);
  });

  it("jogador: a senha atual certa continua trocando a senha", async () => {
    const login = await loginJogador(pedido({ email: "capitao@x.com", senha: SENHA_CAPITAO }, "1.1.1.1"));
    const cookie = login.cookies.get("lob_jogador")!.value;
    const r = await senhaJogador(
      pedido({ senhaAtual: SENHA_CAPITAO, senhaNova: "novaSenha98765" }, "1.1.1.1", { lob_jogador: cookie }),
    );
    expect(r.status).toBe(200);
  });

  it("painel com sessão: palpites em sequência — 5 testados e registrados, o 6º já é 429", async () => {
    const login = await loginAdmin(pedido({ username: "ajudante", password: SENHA_AJUDANTE }, "1.1.1.1"));
    const cookie = login.cookies.get("lob_admin")!.value;
    estado.senhasTestadas = 0;

    const status: number[] = [];
    for (let i = 0; i < 7; i++) {
      const r = await senhaAdmin(
        pedido({ senhaAtual: `palpite${i}x`, senhaNova: "novaSenha98765" }, "1.1.1.1", { lob_admin: cookie }),
      );
      status.push(r.status);
    }

    expect(status).toEqual([401, 401, 401, 401, 401, 429, 429]);
    expect(estado.senhasTestadas).toBe(5);
    expect(tentativas("admin_login_attempts").filter((t) => t.reason === "senha_atual_incorreta")).toHaveLength(5);
  });

  it("painel com sessão: 15 palpites simultâneos de senha atual testam no máximo 5", async () => {
    const login = await loginAdmin(pedido({ username: "ajudante", password: SENHA_AJUDANTE }, "1.1.1.1"));
    const cookie = login.cookies.get("lob_admin")!.value;
    estado.senhasTestadas = 0;

    const respostas = await Promise.all(
      Array.from({ length: 15 }, (_, i) =>
        senhaAdmin(pedido({ senhaAtual: `palpite${i}x`, senhaNova: "novaSenha98765" }, "1.1.1.1", { lob_admin: cookie })),
      ),
    );

    expect(estado.senhasTestadas).toBeLessThanOrEqual(5);
    expect(respostas.filter((r) => r.status === 429).length).toBeGreaterThanOrEqual(10);
    expect(tentativas("admin_login_attempts").filter((t) => t.reason === "senha_atual_incorreta")).toHaveLength(
      estado.senhasTestadas,
    );
    expect(tentativas("admin_login_attempts").some((t) => t.reason === "em_andamento")).toBe(false);
  });
});

describe("DIFF-BE-01 — erro do servidor depois da reserva não tranca quem tem a senha certa", () => {
  /** A emissão de sessão (insert na tabela de sessões) falha N vezes: o banco oscilando. */
  function sessoesFalhando(tabela: "jogador_sessoes" | "admin_sessions", vezes: number) {
    let restam = vezes;
    estado.banco.falha = (t, op) => {
      if (t === tabela && op === "insert" && restam > 0) {
        restam -= 1;
        return "TypeError: fetch failed";
      }
      return null;
    };
  }

  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("capitão: 5 erros 500 com a senha CERTA (sessão não criada) e, com o banco de volta, o login entra", async () => {
    sessoesFalhando("jogador_sessoes", 5);
    const durante: number[] = [];
    for (let i = 0; i < 5; i++) {
      durante.push((await loginJogador(pedido({ email: "capitao@x.com", senha: SENHA_CAPITAO }, "1.1.1.1"))).status);
    }
    expect(durante).toEqual([500, 500, 500, 500, 500]);
    // Nenhuma linha ficou presa: as cinco foram fechadas como erro do servidor.
    expect(tentativas("jogador_login_attempts").some((t) => t.reason === "em_andamento")).toBe(false);
    expect(tentativas("jogador_login_attempts").filter((t) => t.reason === "erro_interno")).toHaveLength(5);

    const depois = await loginJogador(pedido({ email: "capitao@x.com", senha: SENHA_CAPITAO }, "1.1.1.1"));
    expect(depois.status).toBe(200);
  });

  it("master do painel: 5 erros com a senha certa viram 500 com ref (não exceção solta) e o login seguinte entra", async () => {
    sessoesFalhando("admin_sessions", 5);
    const durante: number[] = [];
    for (let i = 0; i < 5; i++) {
      const r = await loginAdmin(pedido({ username: "lucas", password: SENHA_MASTER }, "1.1.1.1"));
      durante.push(r.status);
      expect(await r.json()).toMatchObject({ ref: expect.any(String) });
    }
    expect(durante).toEqual([500, 500, 500, 500, 500]);
    expect(tentativas("admin_login_attempts").some((t) => t.reason === "em_andamento")).toBe(false);

    expect((await loginAdmin(pedido({ username: "lucas", password: SENHA_MASTER }, "1.1.1.1"))).status).toBe(200);
  });

  it("master do painel: a busca do usuário que estoura depois da reserva também fecha a linha", async () => {
    let restam = 5;
    estado.banco.falha = (t, op) => (t === "admin_users" && op === "select" && restam-- > 0 ? "timeout" : null);
    for (let i = 0; i < 5; i++) {
      expect((await loginAdmin(pedido({ username: "lucas", password: SENHA_MASTER }, "1.1.1.1"))).status).toBe(500);
    }
    expect(tentativas("admin_login_attempts").some((t) => t.reason === "em_andamento")).toBe(false);
    expect((await loginAdmin(pedido({ username: "lucas", password: SENHA_MASTER }, "1.1.1.1"))).status).toBe(200);
  });

  it("capitão: a leitura da contagem que falha depois da reserva não deixa linha presa", async () => {
    estado.banco.falha = (t, op) =>
      t === "jogador_login_attempts" && op === "select" ? "canceling statement due to statement timeout" : null;
    for (let i = 0; i < 5; i++) {
      expect((await loginJogador(pedido({ email: "capitao@x.com", senha: SENHA_CAPITAO }, "1.1.1.1"))).status).toBe(500);
    }
    estado.banco.falha = undefined;
    expect(tentativas("jogador_login_attempts").some((t) => t.reason === "em_andamento")).toBe(false);
    expect((await loginJogador(pedido({ email: "capitao@x.com", senha: SENHA_CAPITAO }, "1.1.1.1"))).status).toBe(200);
  });

  it("cadastro: 5 falhas ao gravar a conta não gastam o teto por IP — o 6º cadastro cria a conta", async () => {
    let restam = 5;
    estado.banco.falha = (t, op) => (t === "jogador_contas" && op === "insert" && restam-- > 0 ? "fetch failed" : null);
    for (let i = 0; i < 5; i++) {
      const r = await cadastro(pedido({ email: `novo${i}@x.com`, nome: `Novo ${i}`, senha: "senhaBoa12345" }, "6.6.6.6"));
      expect(r.status).toBe(500);
    }
    expect(tentativas("jogador_login_attempts").some((t) => t.reason === "em_andamento")).toBe(false);
    const r = await cadastro(pedido({ email: "novo@x.com", nome: "Novo Jogador", senha: "senhaBoa12345" }, "6.6.6.6"));
    expect(r.status).toBe(200);
  });

  it("troca de senha (jogador e painel): contagem que falha depois da reserva não tranca a troca certa", async () => {
    const loginJ = await loginJogador(pedido({ email: "capitao@x.com", senha: SENHA_CAPITAO }, "1.1.1.1"));
    const cookieJ = loginJ.cookies.get("lob_jogador")!.value;
    const loginA = await loginAdmin(pedido({ username: "ajudante", password: SENHA_AJUDANTE }, "1.1.1.1"));
    const cookieA = loginA.cookies.get("lob_admin")!.value;

    estado.banco.falha = (t, op) => (t.endsWith("login_attempts") && op === "select" ? "statement timeout" : null);
    for (let i = 0; i < 5; i++) {
      const j = await senhaJogador(
        pedido({ senhaAtual: SENHA_CAPITAO, senhaNova: "novaSenha98765" }, "1.1.1.1", { lob_jogador: cookieJ }),
      );
      const a = await senhaAdmin(
        pedido({ senhaAtual: SENHA_AJUDANTE, senhaNova: "novaSenha98765" }, "1.1.1.1", { lob_admin: cookieA }),
      );
      expect([j.status, a.status]).toEqual([500, 500]);
    }
    estado.banco.falha = undefined;
    expect(tentativas("jogador_login_attempts").some((t) => t.reason === "em_andamento")).toBe(false);
    expect(tentativas("admin_login_attempts").some((t) => t.reason === "em_andamento")).toBe(false);

    const j = await senhaJogador(
      pedido({ senhaAtual: SENHA_CAPITAO, senhaNova: "novaSenha98765" }, "1.1.1.1", { lob_jogador: cookieJ }),
    );
    const a = await senhaAdmin(
      pedido({ senhaAtual: SENHA_AJUDANTE, senhaNova: "novaSenha98765" }, "1.1.1.1", { lob_admin: cookieA }),
    );
    expect([j.status, a.status]).toEqual([200, 200]);
  });

  it("linha abandonada (função derrubada no meio) deixa de contar: 5 reservas de 2 minutos atrás não trancam", async () => {
    const ipHash = hashIp("8.8.8.8");
    const haDoisMinutos = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    estado.banco.tabelas.jogador_login_attempts = Array.from({ length: 5 }, (_, i) => ({
      id: `abandonada-${i}`,
      email: "capitao@x.com",
      ip_hash: ipHash,
      success: false,
      reason: "em_andamento",
      occurred_at: haDoisMinutos,
    }));
    const r = await loginJogador(pedido({ email: "capitao@x.com", senha: SENHA_CAPITAO }, "8.8.8.8"));
    expect(r.status).toBe(200);
  });

  it("controle: as mesmas 5 reservas, mas EM VOO (agora), ainda seguram a tentativa — é o freio da rajada", async () => {
    const ipHash = hashIp("8.8.8.8");
    const agora = new Date().toISOString();
    estado.banco.tabelas.jogador_login_attempts = Array.from({ length: 5 }, (_, i) => ({
      id: `em-voo-${i}`,
      email: "capitao@x.com",
      ip_hash: ipHash,
      success: false,
      reason: "em_andamento",
      occurred_at: agora,
    }));
    const r = await loginJogador(pedido({ email: "capitao@x.com", senha: SENHA_CAPITAO }, "8.8.8.8"));
    expect(r.status).toBe(429);
  });
});

describe("DIFF-BE-03 — logins CERTOS e simultâneos da mesma rede (Wi-Fi do evento, CGNAT)", () => {
  it("seis capitães, cada um com a própria senha certa, entram juntos do mesmo IP", async () => {
    for (let i = 0; i < 6; i++) {
      estado.banco.tabelas.jogador_contas!.push({
        id: `capitao-${i}`,
        email: `capitao${i}@x.com`,
        display_name: `Capitão ${i}`,
        password_hash: hashes.capitao,
        must_change_password: false,
        session_epoch: 0,
        disabled_at: null,
      });
    }
    const respostas = await Promise.all(
      Array.from({ length: 6 }, (_, i) =>
        loginJogador(pedido({ email: `capitao${i}@x.com`, senha: SENHA_CAPITAO }, "189.40.1.1")),
      ),
    );
    expect(respostas.map((r) => r.status)).toEqual([200, 200, 200, 200, 200, 200]);
  });

  it("a organização entra junta no painel, da mesma rede", async () => {
    for (let i = 0; i < 6; i++) {
      estado.banco.tabelas.admin_users!.push({
        id: `org-${i}`,
        username: `org${i}`,
        display_name: `Org ${i}`,
        password_hash: hashes.ajudante,
        must_change_password: false,
        is_master: false,
        scopes: [],
        disabled_at: null,
        session_epoch: 0,
      });
    }
    const respostas = await Promise.all(
      Array.from({ length: 6 }, (_, i) =>
        loginAdmin(pedido({ username: `org${i}`, password: SENHA_AJUDANTE }, "189.40.1.1")),
      ),
    );
    expect(respostas.map((r) => r.status)).toEqual([200, 200, 200, 200, 200, 200]);
  });

  it(`rajada do mesmo IP contra MUITAS contas: no máximo ${RATE_LIMIT.maxTentativasPorIpComEmVoo} palpites passam, e o IP fica bloqueado`, async () => {
    // Um palpite em cada conta, 40 contas, tudo ao mesmo tempo. Sem a folga própria das
    // reservas em voo no teto por IP, a rajada inteira passaria antes de a 1ª falha concluir.
    const respostas = await Promise.all(
      Array.from({ length: 40 }, (_, i) =>
        loginJogador(pedido({ email: `alvo${i}@x.com`, senha: `palpite${i}abc` }, "6.6.6.6")),
      ),
    );
    const passaram = tentativas("jogador_login_attempts").filter((t) => t.reason === "conta_inexistente");
    expect(passaram.length).toBeLessThanOrEqual(RATE_LIMIT.maxTentativasPorIpComEmVoo);
    expect(respostas.filter((r) => r.status === 429).length).toBeGreaterThanOrEqual(
      40 - RATE_LIMIT.maxTentativasPorIpComEmVoo,
    );
    // Depois da rajada, o teto por IP de falhas concluídas segue valendo: em sequência, no
    // máximo o que faltava para 5 passa, e somando tudo o IP não passou da folga.
    const depois: number[] = [];
    for (let i = 0; i < RATE_LIMIT.maxFailuresPerIp + 1; i++) {
      depois.push((await loginJogador(pedido({ email: `outro${i}@x.com`, senha: "palpiteXabc1" }, "6.6.6.6"))).status);
    }
    expect(depois.at(-1)).toBe(429);
    const testadas = tentativas("jogador_login_attempts").filter((t) => t.reason === "conta_inexistente");
    expect(testadas.length).toBeLessThanOrEqual(RATE_LIMIT.maxTentativasPorIpComEmVoo);
  });
});

describe("SEG-05 — quem criou a conta naquele IP não é trancado fora dela", () => {
  /** Terceiros que sabem o e-mail martelam de dois IPs até o teto POR CONTA. */
  async function martelarConta(email: string) {
    for (let i = 0; i < 5; i++) await loginJogador(pedido({ email, senha: `a${i}errada1` }, "2.2.2.2"));
    for (let i = 0; i < 5; i++) await loginJogador(pedido({ email, senha: `b${i}errada1` }, "3.3.3.3"));
  }

  it("o dono criou a conta neste IP e ainda não entrou: o login certo daqui passa pelo teto por conta", async () => {
    const criada = await cadastro(pedido({ email: "dono@x.com", nome: "Dono Novo", senha: "senhaDoDono2026" }, "4.4.4.4"));
    expect(criada.status).toBe(200);
    await martelarConta("dono@x.com");

    const r = await loginJogador(pedido({ email: "dono@x.com", senha: "senhaDoDono2026" }, "4.4.4.4"));
    expect(r.status).toBe(200);
  });

  it("controle: de outro IP, sem cadastro nem login dali, o teto por conta segue valendo", async () => {
    await cadastro(pedido({ email: "dono@x.com", nome: "Dono Novo", senha: "senhaDoDono2026" }, "4.4.4.4"));
    await martelarConta("dono@x.com");
    const r = await loginJogador(pedido({ email: "dono@x.com", senha: "senhaDoDono2026" }, "7.7.7.7"));
    expect(r.status).toBe(429);
  });

  it("controle: o cadastro de uma conta descartável NÃO sela outra conta daquele IP", async () => {
    await martelarConta("capitao@x.com");
    const lixo = await cadastro(pedido({ email: "lixo@x.com", nome: "Conta Lixo", senha: "senhaLixo2026x" }, "5.5.5.5"));
    expect(lixo.status).toBe(200);
    const antes = estado.senhasTestadas;
    const r = await loginJogador(pedido({ email: "capitao@x.com", senha: "palpiteNovo123" }, "5.5.5.5"));
    expect(r.status).toBe(429);
    expect(estado.senhasTestadas).toBe(antes);
  });

  it("controle: a linha do cadastro continua contando no teto POR IP (5 cadastros, o 6º é 429)", async () => {
    const status: number[] = [];
    for (let i = 0; i < 6; i++) {
      const r = await cadastro(pedido({ email: `serie${i}@x.com`, nome: `Serie ${i}`, senha: "senhaBoa12345" }, "9.8.7.6"));
      status.push(r.status);
    }
    expect(status).toEqual([200, 200, 200, 200, 200, 429]);
  });
});
