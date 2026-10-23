import type { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { auditorias, criarBancoSimulado } from "./_banco-simulado";

/**
 * Fila de reserva e pagamento no servidor (decisões D2, D4 e D5 do Lucas, 2026-10-22),
 * contra o banco simulado — o store real e a rota real do painel.
 *
 *  - D2: reserva só paga se for chamado. Quem cai na fila fica sem prazo; o caixa separa o
 *    que reserva pagou do prêmio; «a receber» não conta reserva.
 *  - D4: quando um titular sai, o 1º da fila é chamado NA MESMA ação, com o prazo da edição
 *    (ou agora + 48 h, se ele já venceu).
 *  - D5: «passar a vaga ao 1º da fila» — um clique, conferido de novo no servidor.
 *
 * Fila do cenário: 1 time de 3 (3 vagas). O organizador ORG entrou por último e mesmo assim é
 * titular; B e C completam as vagas; D e E esperam na fila (posições 1 e 2).
 */

const estado = vi.hoisted(() => ({
  banco: null as unknown as ReturnType<typeof import("./_banco-simulado").criarBancoSimulado>,
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

const store = await import("@/lib/inscricoes/store");
const { PATCH } = await import("@/app/api/admin/edicao/route");

const PRAZO = "2026-11-01T02:59:59Z";
const PRAZO_ISO = "2026-11-01T02:59:59.000Z";

const IDS = {
  B: "3f2504e0-4f89-11d3-9a0c-0305e82c3302",
  C: "3f2504e0-4f89-11d3-9a0c-0305e82c3303",
  D: "3f2504e0-4f89-11d3-9a0c-0305e82c3304",
  E: "3f2504e0-4f89-11d3-9a0c-0305e82c3305",
  ORG: "3f2504e0-4f89-11d3-9a0c-0305e82c3309",
};

function inscrito(id: string, nome: string, minuto: number, extra: Record<string, unknown> = {}) {
  return {
    id,
    riot_id: `${nome}#BR1`,
    email: `${nome.toLowerCase()}@x.com`,
    criado_em: `2026-10-05T12:${String(minuto).padStart(2, "0")}:00.000Z`,
    situacao: "pendente",
    organizador: false,
    promocao_automatica: true,
    elo_declarado: "Ouro",
    elo_congelado: null,
    elo_riot: null,
    ...extra,
  };
}

const pagamentoDe = (id: string) => estado.banco.tabelas.inscricao_pagamentos!.find((p) => p.inscricao_id === id)!;
const fichaDe = (id: string) => estado.banco.tabelas.inscricoes!.find((i) => i.id === id)!;
const acoes = () => auditorias(estado.banco).map((a) => [a.acao, a.inscricao_id]);

function req(corpo: unknown): NextRequest {
  const texto = JSON.stringify(corpo);
  return {
    method: "PATCH",
    headers: new Headers({ host: "x", "sec-fetch-site": "same-origin" }),
    text: async () => texto,
  } as unknown as NextRequest;
}

beforeEach(() => {
  estado.negar = null;
  estado.banco = criarBancoSimulado();
  estado.banco.tabelas = {
    edicao_config: [
      {
        id: 1,
        max_times: 1,
        jogadores_por_time: 3,
        prazo_pagamento_ate: PRAZO,
        prazo_pagamento_dias: 14,
        inicio_campeonato: null,
        min_ranqueadas: 5,
        taxa_centavos: 3000,
        inscricoes_abertas: true,
        fechamento_inscricoes: null,
        riot_pausa_ate: null,
      },
    ],
    inscricoes: [
      inscrito(IDS.B, "Bia", 1),
      inscrito(IDS.C, "Caio", 2),
      inscrito(IDS.D, "Davi", 3),
      inscrito(IDS.E, "Edu", 4),
      inscrito(IDS.ORG, "Org", 9, { organizador: true, situacao: "apto" }),
    ],
    inscricao_pagamentos: [
      { inscricao_id: IDS.B, estado: "aguardando", valor_centavos: 3000, vence_em: PRAZO },
      { inscricao_id: IDS.C, estado: "aguardando", valor_centavos: 3000, vence_em: PRAZO },
      { inscricao_id: IDS.D, estado: "aguardando", valor_centavos: 3000, vence_em: null },
      { inscricao_id: IDS.E, estado: "aguardando", valor_centavos: 3000, vence_em: null },
      { inscricao_id: IDS.ORG, estado: "isento", valor_centavos: 3000, vence_em: null },
    ],
    inscricao_conferencias: [],
  };
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-25T15:00:00Z"));
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.useRealTimers();
});

// ---------------------------------------------------------------- D4

describe("D4: titular sai pela ficha → o 1º da fila é chamado na mesma ação", () => {
  it("antes de 31/10: Davi (fila 1) ganha o prazo da edição; Edu (fila 2) continua sem prazo", async () => {
    const r = await PATCH(req({ acao: "ficha", dados: { inscricaoId: IDS.C, situacao: "desistiu" } }));
    expect(r.status).toBe(200);
    expect(fichaDe(IDS.C).situacao).toBe("desistiu");
    expect(pagamentoDe(IDS.D).vence_em).toBe(PRAZO_ISO);
    expect(pagamentoDe(IDS.E).vence_em).toBeNull();
    expect(acoes()).toContainEqual(["chamado_da_fila", IDS.D]);
    expect((await r.json()).chamados).toBe(1);
  });

  it("excluir um titular (situação «excluido», 23/10) também chama o 1º da fila", async () => {
    const r = await PATCH(req({ acao: "ficha", dados: { inscricaoId: IDS.B, situacao: "excluido" } }));
    expect(r.status).toBe(200);
    expect(fichaDe(IDS.B).situacao).toBe("excluido");
    expect(pagamentoDe(IDS.D).vence_em).toBe(PRAZO_ISO);
    expect(pagamentoDe(IDS.E).vence_em).toBeNull();
    expect(acoes()).toContainEqual(["chamado_da_fila", IDS.D]);
    // O pagamento do excluído não é tocado (excluir não cancela pagamento).
    expect(pagamentoDe(IDS.B)).toMatchObject({ estado: "aguardando", vence_em: PRAZO });
  });

  it("depois do prazo: o chamado tem agora + 48 horas", async () => {
    vi.setSystemTime(new Date("2026-11-03T10:00:00Z"));
    await PATCH(req({ acao: "inscrito", dados: { inscricaoId: IDS.B, ficha: { situacao: "recusado" } } }));
    expect(pagamentoDe(IDS.D).vence_em).toBe("2026-11-05T10:00:00.000Z");
  });

  it("controle: salvar só a nota interna não chama ninguém", async () => {
    await PATCH(req({ acao: "ficha", dados: { inscricaoId: IDS.C, observacao: "ligar amanhã" } }));
    expect(pagamentoDe(IDS.D).vence_em).toBeNull();
    expect(acoes().filter(([a]) => a === "chamado_da_fila")).toEqual([]);
  });

  it("o caminho inverso: subir o teto de vagas chama os dois; baixá-lo devolve à fila sem prazo", async () => {
    await PATCH(req({ acao: "config", dados: { jogadores_por_time: 5 } }));
    expect(pagamentoDe(IDS.D).vence_em).toBe(PRAZO_ISO);
    expect(pagamentoDe(IDS.E).vence_em).toBe(PRAZO_ISO);

    await PATCH(req({ acao: "config", dados: { jogadores_por_time: 3 } }));
    expect(pagamentoDe(IDS.D).vence_em).toBeNull();
    expect(pagamentoDe(IDS.E).vence_em).toBeNull();
    expect(acoes()).toContainEqual(["foi_para_a_fila", IDS.E]);
    // Titular que ficou não perde o prazo.
    expect(pagamentoDe(IDS.B).vence_em).toBe(PRAZO);
  });

  it("pago, isento e organizador não são tocados", async () => {
    pagamentoDe(IDS.D).estado = "pago";
    await PATCH(req({ acao: "ficha", dados: { inscricaoId: IDS.C, situacao: "desistiu" } }));
    expect(pagamentoDe(IDS.D).vence_em).toBeNull();
    expect(pagamentoDe(IDS.ORG).vence_em).toBeNull();
  });
});

// ---------------------------------------------------------------- D5

describe("D5: passar a vaga ao 1º da fila", () => {
  const passar = (id: string) => PATCH(req({ acao: "passar_vaga", dados: { inscricaoId: id } }));

  it("01/11: Bia não pagou → desistente, com a auditoria do motivo; Davi é chamado com 48 h", async () => {
    vi.setSystemTime(new Date("2026-11-01T12:00:00Z"));
    const r = await passar(IDS.B);
    expect(r.status).toBe(200);
    const corpo = await r.json();

    expect(fichaDe(IDS.B).situacao).toBe("desistiu");
    // Desistir não cancela pagamento: continua «aguardando», fora da cobrança na leitura.
    expect(pagamentoDe(IDS.B).estado).toBe("aguardando");
    const perdida = auditorias(estado.banco).find((a) => a.acao === "vaga_perdida_por_falta_de_pagamento");
    expect(perdida?.inscricao_id).toBe(IDS.B);
    expect(perdida?.detalhe).toMatchObject({ motivo: "perdeu a vaga por falta de pagamento" });

    expect(pagamentoDe(IDS.D).vence_em).toBe("2026-11-03T12:00:00.000Z");
    expect(corpo.chamados).toEqual([{ inscricaoId: IDS.D, riotId: "Davi#BR1", venceEm: "2026-11-03T12:00:00.000Z" }]);
  });

  it("a resposta diz o prazo do chamado com data E hora (as 48 h não vão até o fim do dia — FB-2)", async () => {
    vi.setSystemTime(new Date("2026-11-01T12:00:00Z"));
    const corpo = await (await passar(IDS.B)).json();
    // 12:00 UTC de 03/11 = 09:00 em Brasília: «até 03/11» sozinho fazia pagar à noite, já fora do prazo.
    expect(corpo.mensagem).toBe("Vaga liberada. Chamado(s) da fila: Davi#BR1 (paga até 03/11 às 09:00) — o prazo de pagamento já vale.");
  });

  it.each([
    ["organizador (isento, nunca perde a vaga)", IDS.ORG, () => {}],
    ["declarou o pagamento (confira o extrato antes)", IDS.B, () => (pagamentoDe(IDS.B).estado = "declarado")],
    ["reserva (não paga)", IDS.D, () => {}],
  ])("%s: 400 e nada muda", async (_rotulo, id, preparar) => {
    vi.setSystemTime(new Date("2026-11-01T12:00:00Z"));
    preparar();
    const antes = JSON.stringify(estado.banco.tabelas);
    const r = await passar(id);
    expect(r.status).toBe(400);
    expect(JSON.stringify(estado.banco.tabelas)).toBe(antes);
  });

  it("antes de vencer (31/10 à noite em Brasília): 400 — nada cancela antes do prazo", async () => {
    vi.setSystemTime(new Date("2026-11-01T02:00:00Z"));
    const r = await passar(IDS.B);
    expect(r.status).toBe(400);
    expect((await r.json()).error).toMatch(/ainda não venceu/);
    expect(fichaDe(IDS.B).situacao).toBe("pendente");
  });

  it("exige o escopo de conferência", async () => {
    vi.setSystemTime(new Date("2026-11-01T12:00:00Z"));
    estado.negar = "inscricoes:conferir";
    expect((await passar(IDS.B)).status).toBe(403);
    expect(fichaDe(IDS.B).situacao).toBe("pendente");
  });
});

// ---------------------------------------------------------------- D2

describe("D2: reserva só paga se for chamado", () => {
  it("inscrição nova com as vagas cheias: lugar «reserva» e o prazo que o gatilho abriu é tirado", async () => {
    const { inscricaoPublicaSchema } = await import("@/lib/inscricoes/schema");
    vi.stubEnv("RIOT_API_KEY", "");
    // O gatilho do banco (abrir_pendencias_da_inscricao) abre o pagamento COM prazo, na
    // mesma transação do insert. O banco simulado não tem gatilho: a linha é criada logo
    // depois do insert, antes da auditoria da inscrição.
    estado.banco.falha = (tabela, op) => {
      if (tabela === "inscricao_auditoria" && op === "insert") {
        for (const i of estado.banco.tabelas.inscricoes!) {
          if (!estado.banco.tabelas.inscricao_pagamentos!.some((p) => p.inscricao_id === i.id)) {
            estado.banco.tabelas.inscricao_pagamentos!.push({
              inscricao_id: i.id,
              estado: "aguardando",
              valor_centavos: 3000,
              vence_em: PRAZO,
            });
          }
        }
      }
      return null;
    };

    const criada = await store.criarInscricao(
      inscricaoPublicaSchema.parse({
        nick: "Novato",
        tag: "BR1",
        nomeReal: "Novato da Silva",
        discord: "novato",
        elo: "Ouro",
        rotaPrimaria: "MID",
        rotaSecundaria: "TOP",
        disponibilidade: ["noite"],
        aceiteRegulamento: true,
        aceiteImagem: true,
        aceiteRequisitos: true,
      }),
      { ipHash: "h", jogadorId: "conta-nova", email: "novato@x.com" },
    );
    vi.unstubAllEnvs();

    expect(criada.lugarNaFila).toEqual({ tipo: "reserva", posicao: 3, manual: false });
    expect(pagamentoDe(criada.id).vence_em).toBeNull();
    expect(acoes()).toContainEqual(["foi_para_a_fila", criada.id]);
  });

  it("caixa: o que o reserva pagou fica FORA do prêmio, e reserva não é «a receber»", async () => {
    pagamentoDe(IDS.B).estado = "pago";
    pagamentoDe(IDS.D).estado = "pago";
    const [inscritos, pagamentos, config] = [
      estado.banco.tabelas.inscricoes as never,
      estado.banco.tabelas.inscricao_pagamentos as never,
      estado.banco.tabelas.edicao_config![0] as never,
    ];
    const { caixa, titulares, reservas } = store.panorama(inscritos, pagamentos, config);
    expect({ titulares, reservas }).toEqual({ titulares: 3, reservas: 2 });
    expect(caixa.arrecadado).toBe(3000); // só a Bia (titular)
    expect(caixa.aDevolverSeNaoJogar).toBe(3000); // o Davi (reserva)
    expect(caixa.recebido).toBe(6000);
    expect(caixa.recebido - caixa.estornado - caixa.aDevolver - caixa.aDevolverSeNaoJogar).toBe(caixa.arrecadado);
    // Caio (titular) deve; Edu (reserva, aguardando) não.
    expect(caixa.aReceber).toBe(3000);
  });

  it("Minha inscrição do reserva: o lugar e a posição, e só os dele", async () => {
    fichaDe(IDS.E).jogador_id = "conta-edu";
    const minha = await store.minhaInscricao("conta-edu");
    expect(minha?.fila).toEqual({ tipo: "reserva", posicao: 2 });
    expect(JSON.stringify(minha)).not.toMatch(/Davi|Bia|Caio/);
  });
});

// ---------------------------------------------------------------- painel

describe("GET do painel traz a fila", () => {
  it("titulares, reservas e o lugar de cada um", async () => {
    const { GET } = await import("@/app/api/admin/edicao/route");
    estado.banco.tabelas.inscricao_auditoria = [];
    estado.banco.tabelas.jogador_login_attempts = [];
    const r = await GET(req({}));
    const corpo = await r.json();
    expect(corpo.fila.titulares).toEqual([IDS.B, IDS.C, IDS.ORG]);
    expect(corpo.fila.reservas).toEqual([IDS.D, IDS.E]);
    expect(corpo.fila.lugar[IDS.E]).toEqual({ tipo: "reserva", posicao: 2, manual: false });
  });
});
