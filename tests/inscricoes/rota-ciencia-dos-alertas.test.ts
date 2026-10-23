import { readFileSync } from "node:fs";
import path from "node:path";

import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { auditorias, criarBancoSimulado } from "./_banco-simulado";

/**
 * A ação `alerta_ciencia` do painel (PATCH /api/admin/edicao), pedido do Lucas de 2026-10-23.
 *
 *  - o servidor recalcula os alertas de AGORA e só aceita ciência de um que existe com o
 *    código e o texto que a tela mostrou (senão 409, e nada é gravado);
 *  - o escopo depende do alerta: os do caixa pedem o financeiro, os outros a conferência;
 *  - auditoria «alerta_ciencia» / «alerta_ciencia_desfeita»;
 *  - banco ainda sem a coluna `alertas_cientes`: erro claro, nada quebra.
 *
 * O store real roda inteiro sobre o banco simulado (que aplica os filtros do update de
 * verdade), então o que se prova é o que de fato vai para a linha.
 */

const estado = vi.hoisted(() => ({
  banco: null as unknown as ReturnType<typeof import("./_banco-simulado").criarBancoSimulado>,
  /** O escopo que a guarda nega (a conta não tem). */
  negar: [] as string[],
  /** Cada escopo pedido à guarda, na ordem. */
  pedidos: [] as (string | undefined)[],
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
      estado.pedidos.push(escopo);
      if (escopo && estado.negar.includes(escopo)) {
        return { ok: false, response: NextResponse.json({ error: "sem escopo", missing: [escopo] }, { status: 403 }) };
      }
      return { ok: true, identity: { username: "lucas", isMaster: false, scopes: [] } };
    },
  };
});

const { PATCH } = await import("@/app/api/admin/edicao/route");

const ID = "3f2504e0-4f89-11d3-9a0c-0305e82c3301";
const OUTRO = "9b2f6c1e-1d3a-4c55-8a0e-6f4a2b7c9d10";
const TEXTO = "Declarou Diamante; a Riot mostra Esmeralda.";
const CAIXA = "Aprovado sem pagamento confirmado (regra 22) — confira o caixa ou ajuste a situação.";

function req(corpo: unknown): NextRequest {
  const texto = JSON.stringify(corpo);
  return {
    method: "PATCH",
    headers: new Headers({ host: "x", "sec-fetch-site": "same-origin" }),
    text: async () => texto,
  } as unknown as NextRequest;
}

const ficha = () => estado.banco.tabelas.inscricoes!.find((l) => l.id === ID)!;
const updates = () => estado.banco.operacoes.filter((o) => o.tabela === "inscricoes" && o.op === "update");
const dar = (codigo: string, texto: string) => PATCH(req({ acao: "alerta_ciencia", dados: { inscricaoId: ID, codigo, texto } }));
const desfazer = (codigo: string) =>
  PATCH(req({ acao: "alerta_ciencia", dados: { inscricaoId: ID, codigo, desfazer: true } }));

beforeEach(() => {
  estado.negar = [];
  estado.pedidos = [];
  estado.banco = criarBancoSimulado();
  estado.banco.tabelas = {
    edicao_config: [{ id: 1, max_times: 6, jogadores_por_time: 5, inicio_campeonato: null, min_ranqueadas: 5 }],
    inscricoes: [
      {
        id: ID,
        criado_em: "2026-10-10T10:00:00.000Z",
        riot_id: "Fulano#BR1",
        situacao: "pendente",
        organizador: false,
        elo_declarado: "Diamante",
        elo_verificado: null,
        elo_riot: "Esmeralda",
        alertas_cientes: {},
        atualizado_em: "2026-10-22T10:00:00.000000+00:00",
      },
      {
        id: OUTRO,
        criado_em: "2026-10-11T10:00:00.000Z",
        riot_id: "Ciclano#BR1",
        situacao: "pendente",
        organizador: false,
        elo_declarado: "Ouro",
        elo_verificado: null,
        elo_riot: null,
        alertas_cientes: {},
        atualizado_em: "2026-10-22T10:00:00.000000+00:00",
      },
    ],
    inscricao_conferencias: [],
    inscricao_pagamentos: [{ inscricao_id: ID, estado: "aguardando", vence_em: null }],
    inscricao_auditoria: [],
  };
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("dar ciência", () => {
  it("o alerta de agora, com o texto da tela: grava código → { texto, por, em } e audita", async () => {
    const r = await dar("declarou_diferente", TEXTO);
    expect(r.status).toBe(200);
    expect((await r.json()).mensagem).toMatch(/Ciência registrada/);
    const gravada = (ficha().alertas_cientes as Record<string, { texto: string; por: string; em: string }>)
      .declarou_diferente!;
    expect(gravada).toMatchObject({ texto: TEXTO, por: "lucas" });
    expect(Number.isFinite(Date.parse(gravada.em))).toBe(true);
    expect(auditorias(estado.banco).filter((a) => a.acao === "alerta_ciencia")).toEqual([
      expect.objectContaining({ inscricao_id: ID, autor: "lucas", detalhe: { codigo: "declarou_diferente", texto: TEXTO } }),
    ]);
    // A gravação é condicional à linha lida (a trava contra duas ciências ao mesmo tempo).
    expect(updates()[0]!.filtros).toEqual([`id=eq.${ID}`, "atualizado_em=eq.2026-10-22T10:00:00.000000+00:00"]);
    // Só a linha dele.
    expect(estado.banco.tabelas.inscricoes!.find((l) => l.id === OUTRO)!.alertas_cientes).toEqual({});
  });

  it("a tela mostra um texto velho (a Riot já mostra Platina): 409 com o texto de agora, nada gravado", async () => {
    ficha().elo_riot = "Platina";
    const r = await dar("declarou_diferente", TEXTO);
    expect(r.status).toBe(409);
    const corpo = await r.json();
    expect(corpo.conflito).toBe(true);
    expect(corpo.error).toMatch(/Esse alerta mudou desde que você abriu a tela/);
    expect(corpo.error).toContain("Declarou Diamante; a Riot mostra Platina.");
    expect(updates()).toEqual([]);
    expect(ficha().alertas_cientes).toEqual({});
    expect(auditorias(estado.banco)).toEqual([]);
  });

  it("alerta que não existe mais (a Riot já concorda com o declarado): 409, nada gravado", async () => {
    ficha().elo_riot = "Diamante";
    const r = await dar("declarou_diferente", TEXTO);
    expect(r.status).toBe(409);
    expect((await r.json()).error).toMatch(/não aparece mais/);
    expect(updates()).toEqual([]);
  });

  it("não se dá ciência de um alerta inventado pela tela (código válido, mas ausente agora)", async () => {
    const r = await dar("nick_trocado", "Trocou de Riot ID: a conta agora é Qualquer#BR1 (regra 12).");
    expect(r.status).toBe(409);
    expect(updates()).toEqual([]);
  });

  it("preserva a ciência de outro alerta já gravada", async () => {
    const outra = { texto: "Outra coisa.", por: "ana", em: "2026-10-20T10:00:00.000Z" };
    ficha().alertas_cientes = { nick_trocado: outra };
    expect((await dar("declarou_diferente", TEXTO)).status).toBe(200);
    expect(ficha().alertas_cientes).toMatchObject({ nick_trocado: outra, declarou_diferente: { texto: TEXTO } });
  });

  it("outra pessoa já deu a mesma ciência: 200 sem gravar nem auditar de novo", async () => {
    const dela = { texto: TEXTO, por: "ana", em: "2026-10-23T09:00:00.000Z" };
    ficha().alertas_cientes = { declarou_diferente: dela };
    const r = await dar("declarou_diferente", TEXTO);
    expect(r.status).toBe(200);
    expect((await r.json()).mensagem).toMatch(/já tinha ciência/);
    expect(updates()).toEqual([]);
    expect(ficha().alertas_cientes).toEqual({ declarou_diferente: dela });
  });

  it("a linha mudou entre a leitura e a gravação (outra ciência no meio): relê e grava as duas", async () => {
    const dela = { texto: "Riot ID não encontrado na Riot — pode ser erro de digitação.", por: "ana", em: "2026-10-23T09:00:00.000Z" };
    let primeira = true;
    estado.banco.falha = (tabela, op) => {
      if (tabela === "inscricoes" && op === "update" && primeira) {
        primeira = false;
        // Outro organizador gravou na mesma linha depois da leitura desta ação.
        ficha().alertas_cientes = { riot_id_inexistente: dela };
        ficha().atualizado_em = "2026-10-23T12:59:59.000000+00:00";
      }
      return null;
    };
    const r = await dar("declarou_diferente", TEXTO);
    expect(r.status).toBe(200);
    expect(updates()).toHaveLength(2);
    expect(ficha().alertas_cientes).toMatchObject({ riot_id_inexistente: dela, declarou_diferente: { texto: TEXTO } });
    expect(auditorias(estado.banco).filter((a) => a.acao === "alerta_ciencia")).toHaveLength(1);
  });
});

describe("assinatura: o mesmo texto com outros fatos não é o mesmo alerta (FB-1/FI-1)", () => {
  const pagamentoDoID = () => estado.banco.tabelas.inscricao_pagamentos!.find((p) => p.inscricao_id === ID)!;
  const darComAssinatura = (codigo: string, texto: string, assinatura: string) =>
    PATCH(req({ acao: "alerta_ciencia", dados: { inscricaoId: ID, codigo, texto, assinatura } }));
  /** A assinatura que a tela calcula (`assinaturaDoAlerta`) para o «aprovado sem pagamento» desse pagamento. */
  const assinaturaDoCaixa = (conferidoEm: string | null) =>
    `${CAIXA}\n[pagamento aguardando · valor 2000 · declarado — · conferido ${conferidoEm ?? "—"}]`;

  beforeEach(() => {
    ficha().situacao = "apto";
    ficha().elo_riot = null;
    Object.assign(pagamentoDoID(), { valor_centavos: 2000, declarado_em: null, conferido_em: null });
  });

  it("grava a assinatura junto do texto, e a auditoria leva as duas", async () => {
    const r = await darComAssinatura("apto_sem_pagamento", CAIXA, assinaturaDoCaixa(null));
    expect(r.status).toBe(200);
    expect(ficha().alertas_cientes).toMatchObject({
      apto_sem_pagamento: { texto: CAIXA, assinatura: assinaturaDoCaixa(null), por: "lucas" },
    });
    expect(auditorias(estado.banco).filter((a) => a.acao === "alerta_ciencia")).toEqual([
      expect.objectContaining({
        detalhe: { codigo: "apto_sem_pagamento", texto: CAIXA, assinatura: assinaturaDoCaixa(null) },
      }),
    ]);
  });

  it("a tela viu o «aguardando» de antes do «pago» desfeito: 409, nada gravado", async () => {
    // O «pago» foi confirmado e desfeito depois que a tela carregou: o estado é o mesmo, o fato não.
    pagamentoDoID().conferido_em = "2026-10-25T18:00:00.000000+00:00";
    const r = await darComAssinatura("apto_sem_pagamento", CAIXA, assinaturaDoCaixa(null));
    expect(r.status).toBe(409);
    const corpo = await r.json();
    expect(corpo.conflito).toBe(true);
    expect(corpo.error).toMatch(/o que está por trás dele mudou/);
    expect(updates()).toEqual([]);
    expect(auditorias(estado.banco)).toEqual([]);
  });

  it("a ciência de antes do «pago» desfeito não cobre o de agora: a nova é aceita e gravada (não é «já tinha»)", async () => {
    expect((await darComAssinatura("apto_sem_pagamento", CAIXA, assinaturaDoCaixa(null))).status).toBe(200);
    pagamentoDoID().conferido_em = "2026-10-25T18:00:00.000000+00:00";
    const r = await darComAssinatura("apto_sem_pagamento", CAIXA, assinaturaDoCaixa("2026-10-25T18:00:00.000Z"));
    expect(r.status).toBe(200);
    expect((await r.json()).mensagem).toMatch(/Ciência registrada/);
    expect(ficha().alertas_cientes).toMatchObject({
      apto_sem_pagamento: { assinatura: assinaturaDoCaixa("2026-10-25T18:00:00.000Z") },
    });
    expect(auditorias(estado.banco).filter((a) => a.acao === "alerta_ciencia")).toHaveLength(2);
  });

  it("alerta cujo texto já diz tudo: grava só o texto, como antes", async () => {
    ficha().situacao = "pendente";
    ficha().elo_riot = "Esmeralda";
    expect((await dar("declarou_diferente", TEXTO)).status).toBe(200);
    expect(Object.keys((ficha().alertas_cientes as Record<string, object>).declarou_diferente!).sort()).toEqual(
      ["em", "por", "texto"],
    );
  });
});

describe("desfazer", () => {
  it("tira a ciência daquele código (o alerta volta a contar) e audita", async () => {
    const outra = { texto: "Outra coisa.", por: "ana", em: "2026-10-20T10:00:00.000Z" };
    ficha().alertas_cientes = { declarou_diferente: { texto: TEXTO, por: "ana", em: "2026-10-23T09:00:00.000Z" }, nick_trocado: outra };
    const r = await desfazer("declarou_diferente");
    expect(r.status).toBe(200);
    expect((await r.json()).mensagem).toMatch(/Ciência desfeita/);
    expect(ficha().alertas_cientes).toEqual({ nick_trocado: outra });
    expect(auditorias(estado.banco).filter((a) => a.acao === "alerta_ciencia_desfeita")).toEqual([
      expect.objectContaining({
        autor: "lucas",
        detalhe: { codigo: "declarou_diferente", texto: TEXTO, cienciaDe: "ana" },
      }),
    ]);
  });

  it("não havia ciência (outra pessoa desfez antes): 409, nada gravado", async () => {
    const r = await desfazer("declarou_diferente");
    expect(r.status).toBe(409);
    expect((await r.json()).conflito).toBe(true);
    expect(updates()).toEqual([]);
  });
});

describe("escopo pelo alerta", () => {
  it("alerta do caixa pede o financeiro: sem ele, 403 antes de ler o banco", async () => {
    ficha().situacao = "apto";
    estado.negar = ["inscricoes:financeiro"];
    const r = await dar("apto_sem_pagamento", CAIXA);
    expect(r.status).toBe(403);
    expect(estado.pedidos.at(-1)).toBe("inscricoes:financeiro");
    expect(estado.banco.operacoes).toEqual([]);
  });

  it("…e com o financeiro (sem a conferência) passa", async () => {
    ficha().situacao = "apto";
    estado.negar = ["inscricoes:conferir"];
    Object.assign(estado.banco.tabelas.inscricao_pagamentos!.find((p) => p.inscricao_id === ID)!, {
      valor_centavos: 2000,
      declarado_em: null,
      conferido_em: null,
    });
    const assinatura = `${CAIXA}
[pagamento aguardando · valor 2000 · declarado — · conferido —]`;
    const r = await PATCH(req({ acao: "alerta_ciencia", dados: { inscricaoId: ID, codigo: "apto_sem_pagamento", texto: CAIXA, assinatura } }));
    expect(r.status).toBe(200);
    expect(ficha().alertas_cientes).toMatchObject({ apto_sem_pagamento: { texto: CAIXA, assinatura } });
  });

  it("tela de antes da assinatura (sem `assinatura`) num alerta com fatos: 409 pedindo para recarregar, nada gravado", async () => {
    ficha().situacao = "apto";
    const r = await dar("apto_sem_pagamento", CAIXA);
    expect(r.status).toBe(409);
    expect((await r.json()).error).toMatch(/Recarregue a página/);
    expect(updates()).toEqual([]);
  });

  it("alerta de requisito/Riot pede a conferência: o financeiro sozinho leva 403", async () => {
    estado.negar = ["inscricoes:conferir"];
    const r = await dar("declarou_diferente", TEXTO);
    expect(r.status).toBe(403);
    expect(estado.pedidos.at(-1)).toBe("inscricoes:conferir");
    expect(estado.banco.operacoes).toEqual([]);
  });

  it("desfazer pede o mesmo escopo de dar", async () => {
    estado.negar = ["inscricoes:financeiro"];
    expect((await desfazer("recusado_pago")).status).toBe(403);
    expect(estado.pedidos.at(-1)).toBe("inscricoes:financeiro");
  });

  it("corpo inválido (código desconhecido, sem texto, id ruim): 400 antes de qualquer trabalho", async () => {
    for (const dados of [
      { inscricaoId: ID, codigo: "toString", texto: "x" },
      { inscricaoId: ID, codigo: "declarou_diferente" },
      { inscricaoId: ID, codigo: "declarou_diferente", texto: "" },
      { inscricaoId: "nao-e-uuid", codigo: "declarou_diferente", texto: TEXTO },
      { inscricaoId: ID, codigo: "declarou_diferente", texto: TEXTO, desfazer: "sim" },
    ]) {
      const r = await PATCH(req({ acao: "alerta_ciencia", dados }));
      expect(r.status).toBe(400);
      expect((await r.json()).error).toBe("Pedido inválido.");
    }
    expect(estado.banco.operacoes).toEqual([]);
  });
});

describe("banco ainda sem a coluna (deploy antes da migração)", () => {
  it("dar ciência responde o porquê (400) e não grava nada", async () => {
    delete ficha().alertas_cientes;
    const r = await dar("declarou_diferente", TEXTO);
    expect(r.status).toBe(400);
    expect((await r.json()).error).toMatch(/falta a migração do banco \(coluna alertas_cientes\)/);
    expect(updates()).toEqual([]);
  });

  it("desfazer também", async () => {
    delete ficha().alertas_cientes;
    const r = await desfazer("declarou_diferente");
    expect(r.status).toBe(400);
    expect((await r.json()).error).toMatch(/coluna alertas_cientes/);
  });

  it("o PostgREST ainda não conhece a coluna na gravação (cache do esquema): o mesmo 400 claro", async () => {
    estado.banco.falha = (tabela, op) =>
      tabela === "inscricoes" && op === "update"
        ? { message: "Could not find the 'alertas_cientes' column of 'inscricoes' in the schema cache", code: "PGRST204" }
        : null;
    const r = await dar("declarou_diferente", TEXTO);
    expect(r.status).toBe(400);
    expect((await r.json()).error).toMatch(/coluna alertas_cientes/);
    expect(auditorias(estado.banco)).toEqual([]);
  });

  it("o resto do painel segue: a ficha grava sem citar a coluna nova", async () => {
    delete ficha().alertas_cientes;
    const r = await PATCH(req({ acao: "ficha", dados: { inscricaoId: ID, observacao: "nota" } }));
    expect(r.status).toBe(200);
    expect(Object.keys(updates()[0]!.valor as object)).not.toContain("alertas_cientes");
  });
});

describe("a migração (supabase/schema-4a-edicao.sql)", () => {
  const sql = readFileSync(path.resolve(__dirname, "../../supabase/schema-4a-edicao.sql"), "utf8");
  const inicio = sql.indexOf("do $ciencia_dos_alertas$");
  const bloco = sql.slice(inicio, sql.indexOf("$ciencia_dos_alertas$;", inicio));

  it("vem depois do bloco da fila de reserva, prazo único e recado", () => {
    expect(inicio).toBeGreaterThan(sql.indexOf("$fila_e_recado$;"));
  });

  it("é aditiva e idempotente, em public e lob_teste, com {} como padrão", () => {
    expect(bloco).toMatch(/foreach s in array array\['public', 'lob_teste'\] loop/);
    expect(bloco).toContain("continue when to_regclass(format('%I.inscricoes', s)) is null;");
    expect(bloco).toMatch(/add column if not exists alertas_cientes jsonb not null default '\{\}'::jsonb;/);
    expect(bloco).not.toMatch(/drop\s|update\s|delete\s/i);
  });

  it("o PostgREST recarrega o esquema depois", () => {
    expect(sql.slice(inicio)).toMatch(/\$ciencia_dos_alertas\$;[\s\S]*notify pgrst, 'reload schema';/);
  });
});
