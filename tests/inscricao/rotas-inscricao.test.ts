import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * As três rotas do jogador (app/api/inscricao/**): o que cada uma responde quando algo
 * dá errado.
 *
 *  - INS-02: a leitura da sessão em /minha consulta o banco; se ela falhar, a rota tem de
 *    devolver a resposta padrão (500 + `ref`), não estourar sem JSON.
 *  - INS-09: quem JÁ tem inscrição e reenvia (a resposta do 1º envio se perdeu) recebe
 *    409 com `jaInscrito`, sem chegar a `criarInscricao`.
 *  - INS-15: os erros fixos das rotas levam um `codigo` estável, que a tela traduz.
 *
 * Sessão e store são dublês: o que se mede é a decisão da rota.
 */

const cenario = vi.hoisted(() => ({
  identidade: { id: "conta-1", email: "a@x.com", displayName: "A" } as
    | { id: string; email: string; displayName: string }
    | null,
  sessaoFalha: false,
  inscricaoExistente: null as string | null,
  declarar: "ok" as "ok" | "sem_inscricao" | "nao_permitido",
}));

const criarInscricao = vi.hoisted(() => vi.fn(async () => ({ riot_id: "Fulano#BR1" })));

vi.mock("@/lib/jogadores/auth", () => ({
  getJogadorIdentity: async () => {
    if (cenario.sessaoFalha) throw new Error("Falha ao consultar sessão: fetch failed");
    return cenario.identidade;
  },
}));

vi.mock("@/lib/inscricoes/store", () => ({
  criarInscricao,
  inscricaoIdDoJogador: async () => cenario.inscricaoExistente,
  minhaInscricao: async () => null,
  lerConfigOuNulo: async () => null,
  declararPagamento: async () => cenario.declarar,
}));

vi.mock("@/lib/security/admin-store", () => ({
  getClientIp: () => "1.1.1.1",
  hashIp: () => "hash-do-ip",
}));

const { ErroDeRegra } = await import("@/lib/security/erros");
const { POST } = await import("@/app/api/inscricao/route");
const { GET } = await import("@/app/api/inscricao/minha/route");
const { POST: POST_PAGAMENTO } = await import("@/app/api/inscricao/pagamento/route");

const CORPO_VALIDO = {
  nick: "Fulano",
  tag: "BR1",
  nomeReal: "Fulano de Tal",
  discord: "fulano",
  elo: "Ouro",
  rotaPrimaria: "MEIO",
  rotaSecundaria: "TOPO",
  disponibilidade: ["noite"],
  aceiteRegulamento: true,
  aceiteImagem: true,
  aceiteRequisitos: true,
};

function envio(corpo: unknown, url = "http://localhost/api/inscricao") {
  return new NextRequest(url, {
    method: "POST",
    headers: { "content-type": "application/json", "sec-fetch-site": "same-origin" },
    body: JSON.stringify(corpo),
  });
}

beforeEach(() => {
  cenario.identidade = { id: "conta-1", email: "a@x.com", displayName: "A" };
  cenario.sessaoFalha = false;
  cenario.inscricaoExistente = null;
  cenario.declarar = "ok";
  criarInscricao.mockClear();
});

describe("POST /api/inscricao — reenvio de quem já está inscrito (INS-09)", () => {
  it("devolve 409 com jaInscrito e código, sem chamar criarInscricao", async () => {
    cenario.inscricaoExistente = "inscricao-1";
    const r = await POST(envio(CORPO_VALIDO));
    expect(r.status).toBe(409);
    const corpo = (await r.json()) as Record<string, unknown>;
    expect(corpo.jaInscrito).toBe(true);
    expect(corpo.codigo).toBe("ja_inscrito");
    expect(typeof corpo.error).toBe("string");
    expect(criarInscricao).not.toHaveBeenCalled();
  });

  it("reenvio em paralelo (o 1º ainda gravando): a regra do store vira o mesmo 409 se a conta TEM inscrição agora", async () => {
    criarInscricao.mockImplementationOnce(async () => {
      // O 1º envio terminou de gravar enquanto este passava pelo store.
      cenario.inscricaoExistente = "inscricao-1";
      throw new ErroDeRegra("Esse e-mail já está inscrito. Se foi você, procure a organização em vez de se inscrever de novo.");
    });
    const r = await POST(envio(CORPO_VALIDO));
    expect(r.status).toBe(409);
    expect(await r.json()).toMatchObject({ jaInscrito: true, codigo: "ja_inscrito" });
  });

  it("controle: regra do store SEM inscrição na conta (Riot ID não encontrado) continua 400 com o texto", async () => {
    const texto = "Não encontramos o Riot ID Fulano#BR1 na Riot.";
    criarInscricao.mockImplementationOnce(async () => {
      throw new ErroDeRegra(texto);
    });
    const r = await POST(envio(CORPO_VALIDO));
    expect(r.status).toBe(400);
    expect(await r.json()).toEqual({ error: texto });
  });

  it("controle: sem inscrição anterior, segue para criarInscricao e responde 200", async () => {
    const r = await POST(envio(CORPO_VALIDO));
    expect(r.status).toBe(200);
    expect(criarInscricao).toHaveBeenCalledTimes(1);
  });
});

describe("POST /api/inscricao — códigos dos erros fixos (INS-15)", () => {
  it("sem sessão: 401 com precisaEntrar e codigo precisa_entrar", async () => {
    cenario.identidade = null;
    const r = await POST(envio(CORPO_VALIDO));
    expect(r.status).toBe(401);
    expect(await r.json()).toMatchObject({ precisaEntrar: true, codigo: "precisa_entrar" });
  });

  it("corpo inválido: 400 com codigo campos_invalidos e os problemas", async () => {
    const r = await POST(envio({ ...CORPO_VALIDO, nick: "" }));
    expect(r.status).toBe(400);
    const corpo = (await r.json()) as { codigo?: string; problemas?: unknown[] };
    expect(corpo.codigo).toBe("campos_invalidos");
    expect(corpo.problemas?.length).toBeGreaterThan(0);
  });

  it("formulário antigo (sem disponibilidade): 409 com codigo formulario_desatualizado", async () => {
    const antigo: Partial<typeof CORPO_VALIDO> = { ...CORPO_VALIDO };
    delete antigo.disponibilidade;
    const r = await POST(envio(antigo));
    expect(r.status).toBe(409);
    expect(await r.json()).toMatchObject({ formularioDesatualizado: true, codigo: "formulario_desatualizado" });
  });
});

describe("GET /api/inscricao/minha — falha ao ler a sessão (INS-02)", () => {
  it("vira a resposta padrão: 500 em JSON, com ref, sem estourar", async () => {
    cenario.sessaoFalha = true;
    const erroDoConsole = vi.spyOn(console, "error").mockImplementation(() => {});
    const r = await GET(new NextRequest("http://localhost/api/inscricao/minha"));
    erroDoConsole.mockRestore();
    expect(r.status).toBe(500);
    const corpo = (await r.json()) as { error?: string; ref?: string };
    expect(corpo.error).toBeTruthy();
    expect(corpo.ref).toMatch(/^[0-9a-f]{8}$/);
  });

  it("controle: sem sessão continua 200 com jogador null", async () => {
    cenario.identidade = null;
    const r = await GET(new NextRequest("http://localhost/api/inscricao/minha"));
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ jogador: null, inscricao: null });
  });
});

describe("POST /api/inscricao/pagamento — códigos dos erros (INS-15)", () => {
  const pagamento = () => POST_PAGAMENTO(envio({}, "http://localhost/api/inscricao/pagamento"));

  it("sem sessão: codigo sem_sessao", async () => {
    cenario.identidade = null;
    const r = await pagamento();
    expect(r.status).toBe(401);
    expect(await r.json()).toMatchObject({ codigo: "sem_sessao" });
  });

  it("sem inscrição: codigo sem_inscricao", async () => {
    cenario.declarar = "sem_inscricao";
    const r = await pagamento();
    expect(r.status).toBe(404);
    expect(await r.json()).toMatchObject({ codigo: "sem_inscricao" });
  });

  it("pagamento já tratado: codigo pagamento_ja_tratado", async () => {
    cenario.declarar = "nao_permitido";
    const r = await pagamento();
    expect(r.status).toBe(409);
    expect(await r.json()).toMatchObject({ codigo: "pagamento_ja_tratado" });
  });
});
