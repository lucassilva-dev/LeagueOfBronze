import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AdminIdentity } from "@/lib/admin-auth";

import { criarBancoEmMemoria, type BancoEmMemoria } from "../security/_banco-em-memoria";

/**
 * Senha da conta de JOGADOR: a troca pelo próprio jogador e a redefinição pela
 * organização, pelas rotas de verdade.
 *
 * Roda o código REAL de `app/api/conta/{login,senha}`, `app/api/admin/jogadores/senha`,
 * de `lib/jogadores/{auth,store}`, do limitador, do cookie assinado e do scrypt. Só o
 * banco é simulado, e a identidade do painel é trocada (ela tem os próprios testes).
 *
 *  - SEG-07: senha nova e epoch novo num update só. Eram duas escritas: com o banco
 *    oscilando entre elas, a senha já tinha mudado, o epoch não subia (o invasor seguia
 *    logado) e a rota respondia "não foi possível trocar a senha".
 *  - INS-01: a conta de jogador não tinha recuperação nenhuma. Agora a master gera uma
 *    senha provisória; a troca fica obrigatória, mas não tranca ninguém fora da troca.
 */

process.env.ADMIN_SESSION_SECRET = "segredo-de-teste-com-tamanho-suficiente-1234567890";
process.env.ADMIN_PASSWORD_PEPPER = "pimenta-de-teste-com-tamanho-suficiente-1234567890";

const estado = vi.hoisted(() => ({
  banco: null as unknown as BancoEmMemoria,
  admin: null as AdminIdentity | null,
  auditoria: [] as Array<Record<string, unknown>>,
}));

vi.mock("@/lib/data-store", () => ({
  isSupabaseConfigured: () => true,
  createSupabaseAdminClient: () => estado.banco.cliente(),
}));

vi.mock("@/lib/admin-auth", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  isAdminConfigured: () => true,
  getAdminIdentity: async () => estado.admin,
}));

vi.mock("@/lib/inscricoes/store", () => ({
  inscricaoIdDoJogador: async () => "inscricao-do-capitao",
  registrarAuditoria: async (a: Record<string, unknown>) => void estado.auditoria.push(a),
}));

const { hashPassword, verifyPassword, validatePasswordStrength, gerarSenhaProvisoria } = await import(
  "@/lib/security/password"
);
const { JOGADOR_COOKIE, identidadePorToken, pepperDeSenhaJogador } = await import("@/lib/jogadores/auth");
const { POST: loginJogador } = await import("@/app/api/conta/login/route");
const { POST: senhaJogador } = await import("@/app/api/conta/senha/route");
const { POST: redefinir } = await import("@/app/api/admin/jogadores/senha/route");

const ID_CAPITAO = "0b6f1d2e-3c4a-4b5c-8d6e-7f8091a2b3c4";
const SENHA_ANTIGA = "capitaoForte2026";
const SENHA_NOVA = "minhaNovaSenha2026";

let hashAntigo = "";

type Pedido = { cookies?: Record<string, string>; ip?: string; cabecalhos?: Record<string, string> };

function pedido(corpo: unknown, { cookies = {}, ip = "1.1.1.1", cabecalhos }: Pedido = {}): NextRequest {
  const texto = JSON.stringify(corpo);
  return {
    method: "POST",
    headers: new Headers(
      cabecalhos ?? { host: "leagueofbronze.xyz", "sec-fetch-site": "same-origin", "x-forwarded-for": ip },
    ),
    cookies: { get: (nome: string) => (cookies[nome] ? { value: cookies[nome] } : undefined) },
    json: async () => JSON.parse(texto),
    text: async () => texto,
  } as unknown as NextRequest;
}

function master(patch: Partial<AdminIdentity> = {}): AdminIdentity {
  return {
    id: "admin-master",
    username: "lucas",
    displayName: "Lucas",
    isMaster: true,
    scopes: [],
    mustChangePassword: false,
    legacy: false,
    ...patch,
  };
}

function conta() {
  return estado.banco.tabelas.jogador_contas![0]!;
}

async function entrar(senha: string) {
  const r = await loginJogador(pedido({ email: "capitao@x.com", senha }));
  return { r, cookie: r.cookies.get(JOGADOR_COOKIE)?.value };
}

beforeEach(async () => {
  estado.banco = criarBancoEmMemoria(2);
  estado.admin = master();
  estado.auditoria = [];
  hashAntigo ||= await hashPassword(SENHA_ANTIGA, pepperDeSenhaJogador());
  estado.banco.tabelas.jogador_contas = [
    {
      id: ID_CAPITAO,
      email: "capitao@x.com",
      display_name: "Capitão",
      password_hash: hashAntigo,
      must_change_password: false,
      session_epoch: 0,
      disabled_at: null,
    },
  ];
});

describe("SEG-07 — troca de senha do jogador é atômica", () => {
  it("o banco cai na gravação: NADA muda — a senha antiga continua valendo e a sessão também", async () => {
    const { cookie } = await entrar(SENHA_ANTIGA);
    estado.banco.falha = (tabela, op, patch) =>
      tabela === "jogador_contas" && op === "update" && patch && "session_epoch" in patch ? "conexão caiu" : null;

    const r = await senhaJogador(pedido({ senhaAtual: SENHA_ANTIGA, senhaNova: SENHA_NOVA }, { cookies: { [JOGADOR_COOKIE]: cookie! } }));

    expect(r.status).toBe(500);
    // "Não foi possível trocar a senha" tem de ser verdade: a senha atual segue a mesma,
    // e a pessoa pode tentar de novo com ela.
    expect(await verifyPassword(SENHA_ANTIGA, String(conta().password_hash), pepperDeSenhaJogador())).toBe(true);
    expect(await verifyPassword(SENHA_NOVA, String(conta().password_hash), pepperDeSenhaJogador())).toBe(false);
    expect(conta().session_epoch).toBe(0);
  });

  it("a senha nunca é gravada sem o epoch novo no MESMO update", async () => {
    const patches: Array<Record<string, unknown>> = [];
    estado.banco.antes = (tabela, op, patch) => {
      if (tabela === "jogador_contas" && op === "update" && patch) patches.push(patch);
    };
    const { cookie } = await entrar(SENHA_ANTIGA);

    const r = await senhaJogador(pedido({ senhaAtual: SENHA_ANTIGA, senhaNova: SENHA_NOVA }, { cookies: { [JOGADOR_COOKIE]: cookie! } }));

    expect(r.status).toBe(200);
    const comSenha = patches.filter((p) => "password_hash" in p);
    expect(comSenha).toHaveLength(1);
    expect(comSenha[0]).toMatchObject({ session_epoch: 1, must_change_password: false });
  });

  it("marcar as linhas de sessão é só registro: se falhar, a troca vale, a sessão antiga cai e a nova funciona", async () => {
    const { cookie: antigo } = await entrar(SENHA_ANTIGA);
    estado.banco.falha = (tabela, op) => (tabela === "jogador_sessoes" && op === "update" ? "conexão caiu" : null);

    const r = await senhaJogador(pedido({ senhaAtual: SENHA_ANTIGA, senhaNova: SENHA_NOVA }, { cookies: { [JOGADOR_COOKIE]: antigo! } }));

    expect(r.status).toBe(200);
    expect(conta().session_epoch).toBe(1);
    expect(await identidadePorToken(antigo)).toBeNull();
    expect(await identidadePorToken(r.cookies.get(JOGADOR_COOKIE)!.value)).not.toBeNull();
  });
});

describe("INS-01 — a organização redefine a senha do jogador", () => {
  it("a master gera uma provisória forte: hash gravado, troca obrigatória ligada, sessões antigas derrubadas", async () => {
    const { cookie: antigo } = await entrar(SENHA_ANTIGA);
    expect(await identidadePorToken(antigo)).not.toBeNull();

    const r = await redefinir(pedido({ id: ID_CAPITAO }));
    expect(r.status).toBe(200);
    // A provisória sai UMA vez e não pode ficar em cache nenhum.
    expect(r.headers.get("Cache-Control")).toContain("no-store");

    const corpo = (await r.json()) as { senhaProvisoria: string; conta: Record<string, unknown> };
    expect(corpo.conta).toEqual({ id: ID_CAPITAO, email: "capitao@x.com", nome: "Capitão" });
    expect(validatePasswordStrength(corpo.senhaProvisoria)).toBeNull();

    expect(conta().must_change_password).toBe(true);
    expect(conta().session_epoch).toBe(1);
    expect(await verifyPassword(corpo.senhaProvisoria, String(conta().password_hash), pepperDeSenhaJogador())).toBe(true);
    expect(await verifyPassword(SENHA_ANTIGA, String(conta().password_hash), pepperDeSenhaJogador())).toBe(false);

    // Quem estava logado (inclusive quem tivesse descoberto a senha esquecida) caiu.
    expect(await identidadePorToken(antigo)).toBeNull();
    expect(estado.banco.tabelas.jogador_sessoes!.every((s) => s.revogada_razao === "senha_redefinida")).toBe(true);

    // Fica o rastro de quem entregou a senha de quem — sem a senha.
    expect(estado.auditoria).toEqual([
      expect.objectContaining({ autor: "lucas", acao: "senha_da_conta_redefinida", inscricaoId: "inscricao-do-capitao" }),
    ]);
    expect(JSON.stringify(estado.auditoria)).not.toContain(corpo.senhaProvisoria);
  });

  it("o jogador entra com a provisória, vê a troca pendente e consegue trocar — exigir a troca não o tranca fora", async () => {
    const { senhaProvisoria } = (await (await redefinir(pedido({ id: ID_CAPITAO }))).json()) as { senhaProvisoria: string };

    const { r: login, cookie } = await entrar(senhaProvisoria);
    expect(login.status).toBe(200);
    expect(await login.json()).toMatchObject({ jogador: { mustChangePassword: true } });

    // A sessão de quem está com a troca pendente VALE — é ela que chama a troca.
    expect(await identidadePorToken(cookie)).toMatchObject({ mustChangePassword: true });

    const troca = await senhaJogador(
      pedido({ senhaAtual: senhaProvisoria, senhaNova: SENHA_NOVA }, { cookies: { [JOGADOR_COOKIE]: cookie! } }),
    );
    expect(troca.status).toBe(200);
    expect(conta().must_change_password).toBe(false);
    expect(await identidadePorToken(troca.cookies.get(JOGADOR_COOKIE)!.value)).toMatchObject({
      mustChangePassword: false,
    });

    // Quem redefiniu conhece a provisória — e ela já não abre a conta.
    expect((await entrar(senhaProvisoria)).r.status).toBe(401);
    expect((await entrar(SENHA_NOVA)).r.status).toBe(200);
  });

  it("aceita o e-mail no lugar do id (com espaço e maiúscula, como vem de um print)", async () => {
    const r = await redefinir(pedido({ email: "  CAPITAO@x.com " }));
    expect(r.status).toBe(200);
    expect(conta().must_change_password).toBe(true);
  });

  it("uma troca do próprio jogador entre a leitura e a gravação não deixa a sessão nova sobreviver", async () => {
    // Simula o jogador trocando a senha (epoch 0 → 1) exatamente entre a redefinição ler
    // a conta e gravar. Sem a condição no epoch, a redefinição gravaria epoch 1 de novo e
    // a sessão que a troca acabou de emitir continuaria valendo.
    let interferiu = false;
    estado.banco.antes = (tabela, op, patch) => {
      if (!interferiu && tabela === "jogador_contas" && op === "update" && patch?.must_change_password === true) {
        interferiu = true;
        conta().session_epoch = 1;
      }
    };

    const r = await redefinir(pedido({ id: ID_CAPITAO }));

    expect(r.status).toBe(200);
    expect(conta().session_epoch).toBe(2);
    expect(conta().must_change_password).toBe(true);
  });

  it("só a master: conta da organização sem `users:manage` (masterOnly) recebe 403 e nada muda", async () => {
    estado.admin = master({ isMaster: false, scopes: ["users:manage", "inscricoes:manage"] });
    const r = await redefinir(pedido({ id: ID_CAPITAO }));
    expect(r.status).toBe(403);
    expect(conta().password_hash).toBe(hashAntigo);
    expect(conta().session_epoch).toBe(0);
  });

  it("sem sessão do painel: 401; origem de fora: 403 — e nada muda", async () => {
    estado.admin = null;
    expect((await redefinir(pedido({ id: ID_CAPITAO }))).status).toBe(401);

    estado.admin = master();
    const deFora = await redefinir(
      pedido({ id: ID_CAPITAO }, { cabecalhos: { host: "leagueofbronze.xyz", origin: "https://malicioso.example" } }),
    );
    expect(deFora.status).toBe(403);
    expect(conta().password_hash).toBe(hashAntigo);
  });

  it("corpo inválido é 400; conta inexistente é 404", async () => {
    expect((await redefinir(pedido({}))).status).toBe(400);
    expect((await redefinir(pedido({ id: ID_CAPITAO, email: "capitao@x.com" }))).status).toBe(400);
    expect((await redefinir(pedido({ id: "nao-e-uuid" }))).status).toBe(400);
    expect((await redefinir(pedido({ email: "ninguem@x.com" }))).status).toBe(404);
    expect(conta().password_hash).toBe(hashAntigo);
  });
});

describe("gerarSenhaProvisoria", () => {
  it("sempre passa na regra de senha, no formato xxxx-xxxx-xxxx, sem caracteres que se confundem", () => {
    const vistas = new Set<string>();
    for (let i = 0; i < 300; i++) {
      const s = gerarSenhaProvisoria();
      expect(s).toMatch(/^[a-z2-9]{4}-[a-z2-9]{4}-[a-z2-9]{4}$/);
      expect(s).not.toMatch(/[01ilo]/);
      expect(validatePasswordStrength(s)).toBeNull();
      vistas.add(s);
    }
    expect(vistas.size).toBe(300);
  });
});
