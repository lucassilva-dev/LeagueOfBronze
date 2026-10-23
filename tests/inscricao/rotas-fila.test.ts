import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * As rotas do jogador e a fila de reserva (decisão D2 do Lucas, 2026-10-22): reserva só paga
 * se for chamado.
 *
 *  - POST /api/inscricao devolve o lugar (titular ou reserva com a posição) — é por ele que o
 *    recibo decide se mostra o Pix. Sem lugar calculado, a resposta sai sem o campo.
 *  - GET /api/inscricao/minha não manda a chave Pix a quem está na fila.
 */

const cenario = vi.hoisted(() => ({
  lugar: null as unknown,
  minha: null as unknown,
}));

vi.mock("@/lib/jogadores/auth", () => ({
  getJogadorIdentity: async () => ({ id: "conta-1", email: "a@x.com", displayName: "A" }),
}));

vi.mock("@/lib/inscricoes/store", () => ({
  criarInscricao: async () => ({ id: "nova", riot_id: "Fulano#BR1", lugarNaFila: cenario.lugar }),
  inscricaoIdDoJogador: async () => null,
  minhaInscricao: async () => cenario.minha,
  lerConfigOuNulo: async () => ({ chave_pix: "chave@exemplo.com" }),
}));

vi.mock("@/lib/security/admin-store", () => ({
  getClientIp: () => "1.1.1.1",
  hashIp: () => "hash-do-ip",
}));

const { POST } = await import("@/app/api/inscricao/route");
const { GET } = await import("@/app/api/inscricao/minha/route");

const CORPO = {
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

const post = () =>
  POST(
    new NextRequest("http://localhost/api/inscricao", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "http://localhost", "sec-fetch-site": "same-origin" },
      body: JSON.stringify(CORPO),
    }),
  );
const minha = () => GET(new NextRequest("http://localhost/api/inscricao/minha"));

function ficha(fila: unknown, estado = "aguardando") {
  return {
    riotId: "Fulano#BR1",
    situacao: "pendente",
    fila,
    pagamento: { estado, valorCentavos: 3000, venceEm: null },
    conferencias: [],
  };
}

beforeEach(() => {
  cenario.lugar = null;
  cenario.minha = null;
});

describe("POST /api/inscricao devolve o lugar na fila", () => {
  it("vagas cheias: reserva, com a posição — e a mensagem diz que reserva só paga se for chamado", async () => {
    cenario.lugar = { tipo: "reserva", posicao: 3, manual: false };
    const corpo = await (await post()).json();
    expect(corpo.fila).toEqual({ tipo: "reserva", posicao: 3 });
    expect(corpo.mensagem).toMatch(/fila de reserva, na posição 3/);
  });

  it("com vaga: titular", async () => {
    cenario.lugar = { tipo: "titular" };
    expect((await (await post()).json()).fila).toEqual({ tipo: "titular" });
  });

  it("lugar não calculado: sem o campo (o recibo não mostra o Pix)", async () => {
    const corpo = await (await post()).json();
    expect(corpo.ok).toBe(true);
    expect(corpo).not.toHaveProperty("fila");
  });
});

describe("GET /api/inscricao/minha não manda o Pix a quem está na fila", () => {
  it("reserva aguardando: sem chave", async () => {
    cenario.minha = ficha({ tipo: "reserva", posicao: 1 });
    expect((await (await minha()).json()).pix).toBeNull();
  });

  it("controle: titular aguardando recebe a chave", async () => {
    cenario.minha = ficha({ tipo: "titular" });
    expect((await (await minha()).json()).pix).toEqual({ chave: "chave@exemplo.com" });
  });
});
