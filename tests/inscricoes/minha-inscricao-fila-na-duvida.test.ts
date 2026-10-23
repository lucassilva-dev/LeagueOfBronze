import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { criarBancoSimulado } from "./_banco-simulado";

/**
 * Minha inscrição quando a fila não pôde ser lida (D2 «reserva só paga se for chamado»;
 * auditoria da retomada, B5, 23/10).
 *
 * O lugar na fila depende de duas leituras: as linhas de todos os inscritos e o teto de vagas
 * da configuração. Antes, a falha do teto virava "sem teto" — todo ativo titular, e a rota
 * mandava o Pix e o «JÁ PAGUEI» a quem está na fila de reserva —, e a falha das linhas
 * derrubava a tela inteira com 500. Agora as duas falham FECHADO: o lugar fica `indefinido`, a
 * ficha sai de pé e nada é cobrado até a fila ser lida de novo.
 */

const estado = vi.hoisted(() => ({
  banco: null as unknown as ReturnType<typeof import("./_banco-simulado").criarBancoSimulado>,
}));

vi.mock("@/lib/data-store", () => ({
  isSupabaseConfigured: () => true,
  createSupabaseAdminClient: () => estado.banco.cliente(),
}));

vi.mock("@/lib/jogadores/auth", () => ({
  getJogadorIdentity: async () => ({ id: "jc", email: "c@x.com", displayName: "C" }),
}));

const store = await import("@/lib/inscricoes/store");
const { inscricaoEsperaPagamento } = await import("@/lib/inscricoes/pagamento");
const { GET } = await import("@/app/api/inscricao/minha/route");

function inscrito(id: string, jogador: string, minuto: number, situacao = "pendente") {
  return {
    id,
    jogador_id: jogador,
    riot_id: `${id}#BR1`,
    email: `${id}@x.com`,
    criado_em: `2026-10-05T12:${String(minuto).padStart(2, "0")}:00.000Z`,
    situacao,
    organizador: false,
    elo_declarado: "Ouro",
    elo_verificado: null,
    elo_congelado: null,
    rota_primaria: "MID",
    rota_secundaria: "TOP",
    disponibilidade: [],
    recado_jogador: null,
  };
}

/** A leitura da fila inteira (sem filtro por conta) — não a da ficha do próprio jogador. */
const ehLeituraDaFila = (tabela: string, op: string, filtros: string[]) =>
  tabela === "inscricoes" && op === "select" && !filtros.some((f) => f.startsWith("jogador_id="));

beforeEach(() => {
  estado.banco = criarBancoSimulado();
  // 1 time de 2: A e B são titulares; C, inscrito por último, é o 1º da fila de reserva.
  estado.banco.tabelas = {
    edicao_config: [{ id: 1, max_times: 1, jogadores_por_time: 2, chave_pix: "chave@exemplo.com" }],
    inscricoes: [inscrito("a", "ja", 1), inscrito("b", "jb", 2), inscrito("c", "jc", 3)],
    inscricao_pagamentos: [
      { inscricao_id: "a", estado: "aguardando", valor_centavos: 3000, vence_em: "2026-11-01T02:59:59Z" },
      { inscricao_id: "b", estado: "aguardando", valor_centavos: 3000, vence_em: "2026-11-01T02:59:59Z" },
      { inscricao_id: "c", estado: "aguardando", valor_centavos: 3000, vence_em: null },
    ],
    inscricao_conferencias: [],
  };
  vi.spyOn(console, "error").mockImplementation(() => {});
});

const minhaPelaRota = async () => {
  const resposta = await GET(new NextRequest("http://localhost/api/inscricao/minha"));
  return { status: resposta.status, corpo: await resposta.json() };
};

describe("Minha inscrição com a fila ilegível", () => {
  it("controle: com o banco no ar, C é reserva (posição 1), não é cobrado e a rota não manda o Pix", async () => {
    const minha = (await store.minhaInscricao("jc"))!;
    expect(minha.fila).toEqual({ tipo: "reserva", posicao: 1 });
    expect(inscricaoEsperaPagamento(minha)).toBe(false);
    const { status, corpo } = await minhaPelaRota();
    expect(status).toBe(200);
    expect(corpo.pix).toBeNull();
  });

  it("a leitura do teto de vagas (edicao_config) falha: o lugar fica indefinido, sem cobrança", async () => {
    estado.banco.falha = (tabela, op) => (tabela === "edicao_config" && op === "select" ? "fora do ar" : null);
    const minha = (await store.minhaInscricao("jc"))!;
    expect(minha.fila).toEqual({ tipo: "indefinido" });
    expect(inscricaoEsperaPagamento(minha)).toBe(false);
    expect(console.error).toHaveBeenCalled();
  });

  it("a configuração vazia também é dúvida — não «sem teto», que faria todo mundo titular", async () => {
    estado.banco.tabelas.edicao_config = [];
    const minha = (await store.minhaInscricao("jc"))!;
    expect(minha.fila).toEqual({ tipo: "indefinido" });
    expect(inscricaoEsperaPagamento(minha)).toBe(false);
  });

  it("a leitura das linhas da fila falha: a tela fica de pé (200), sem o Pix, com o lugar indefinido", async () => {
    estado.banco.falha = (tabela, op, filtros) => (ehLeituraDaFila(tabela, op, filtros) ? "tempo esgotado" : null);
    const { status, corpo } = await minhaPelaRota();
    expect(status).toBe(200);
    expect(corpo.inscricao.fila).toEqual({ tipo: "indefinido" });
    expect(corpo.inscricao.pagamento.estado).toBe("aguardando");
    // A chave Pix existe e a configuração foi lida — mas na dúvida ela não vai.
    expect(corpo.pix).toBeNull();
  });

  it("quem já está fora continua fora na dúvida (a própria ficha diz)", async () => {
    estado.banco.tabelas.inscricoes![2] = inscrito("c", "jc", 3, "desistiu");
    estado.banco.falha = (tabela, op) => (tabela === "edicao_config" && op === "select" ? "fora do ar" : null);
    const minha = (await store.minhaInscricao("jc"))!;
    expect(minha.fila).toEqual({ tipo: "fora" });
  });

  it("controle: o titular, com o banco no ar, continua cobrado e recebe o Pix", async () => {
    estado.banco.falha = null;
    const minhaDeA = (await store.minhaInscricao("ja"))!;
    expect(minhaDeA.fila).toEqual({ tipo: "titular" });
    expect(inscricaoEsperaPagamento(minhaDeA)).toBe(true);
  });
});

describe("inscricaoEsperaPagamento com o lugar indefinido", () => {
  it("não cobra; resposta de antes da fila (sem o campo) continua valendo como titular", () => {
    const ficha = { situacao: "apto", pagamento: { estado: "aguardando" } };
    expect(inscricaoEsperaPagamento({ ...ficha, fila: { tipo: "indefinido" } })).toBe(false);
    expect(inscricaoEsperaPagamento(ficha)).toBe(true);
    expect(inscricaoEsperaPagamento({ ...ficha, fila: { tipo: "titular" } })).toBe(true);
  });
});
