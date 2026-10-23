import { readFileSync } from "node:fs";
import path from "node:path";

import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { auditorias, criarBancoSimulado } from "./_banco-simulado";

/**
 * Decisão G (observação da ficha → dois campos) e D3 (prazo único dos titulares), do Lucas,
 * 2026-10-22.
 *
 *  - G: a `observacao` vira NOTA INTERNA — sai da resposta do jogador e nem é lida para ele.
 *    O que o jogador lê é `recado_jogador`. E a janela entre o deploy e a migração (código
 *    novo, banco sem a coluna) não derruba a Minha inscrição.
 *  - D3: `prazo_pagamento_ate` na configuração e no gatilho que abre o pagamento, em public
 *    e lob_teste.
 */

const estado = vi.hoisted(() => ({
  banco: null as unknown as ReturnType<typeof import("./_banco-simulado").criarBancoSimulado>,
  /** Cada `select(colunas)` pedido, por tabela: o banco simulado devolve tudo, então é aqui que se vê o que foi PEDIDO. */
  selects: [] as [string, string][],
}));

vi.mock("@/lib/data-store", () => ({
  isSupabaseConfigured: () => true,
  createSupabaseAdminClient: () => {
    const cliente = estado.banco.cliente();
    return {
      from: (tabela: string) => {
        const q = cliente.from(tabela) as Record<string, (...a: unknown[]) => unknown>;
        const original = q.select!;
        q.select = (colunas: unknown, ...resto: unknown[]) => {
          estado.selects.push([tabela, String(colunas)]);
          return original(colunas, ...resto);
        };
        return q;
      },
    };
  },
}));

vi.mock("@/lib/security/route-guard", () => ({
  mesmaOrigem: () => true,
  requireAdmin: async () => ({ ok: true, identity: { username: "lucas", isMaster: true, scopes: [] } }),
}));

const store = await import("@/lib/inscricoes/store");
const { configPatchSchema, fichaPatchSchema, inscritoPatchSchema, motivoDaRecusaDoInscrito } = await import(
  "@/lib/inscricoes/schema"
);
const { PATCH } = await import("@/app/api/admin/edicao/route");

const ID = "3f2504e0-4f89-11d3-9a0c-0305e82c3301";

function req(corpo: unknown): NextRequest {
  const texto = JSON.stringify(corpo);
  return {
    method: "PATCH",
    headers: new Headers({ host: "x", "sec-fetch-site": "same-origin" }),
    text: async () => texto,
  } as unknown as NextRequest;
}

beforeEach(() => {
  estado.banco = criarBancoSimulado();
  estado.banco.tabelas = {
    edicao_config: [{ id: 1, max_times: 6, jogadores_por_time: 5 }],
    inscricoes: [
      {
        id: ID,
        jogador_id: "eu",
        criado_em: "2026-10-10T10:00:00.000Z",
        riot_id: "Fulano#BR1",
        elo_declarado: "Ouro",
        elo_verificado: null,
        elo_congelado: null,
        rota_primaria: "MID",
        rota_secundaria: "TOP",
        disponibilidade: ["noite"],
        situacao: "pendente",
        organizador: false,
        observacao: "NOTA INTERNA: confirmar com o Nakay se é smurf",
        recado_jogador: "Mande o print do vínculo no privado.",
      },
    ],
    inscricao_pagamentos: [{ inscricao_id: ID, estado: "aguardando", valor_centavos: 3000, vence_em: null }],
    inscricao_conferencias: [],
  };
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("G: a nota interna não chega ao jogador", () => {
  it("Minha inscrição traz o recado e NÃO a observação", async () => {
    const minha = await store.minhaInscricao("eu");
    expect(minha?.recado).toBe("Mande o print do vínculo no privado.");
    expect(minha).not.toHaveProperty("observacao");
    expect(JSON.stringify(minha)).not.toContain("NOTA INTERNA");
  });

  it("nem é lida do banco: nenhuma coluna pedida na leitura do jogador é a observação (nem `*`)", async () => {
    estado.selects.length = 0;
    await store.minhaInscricao("eu");
    const daFicha = estado.selects.filter(([tabela]) => tabela === "inscricoes").map(([, colunas]) => colunas);
    expect(daFicha.some((c) => c.includes("recado_jogador"))).toBe(true);
    for (const colunas of daFicha) {
      expect(colunas).not.toContain("*");
      expect(colunas.split(",").map((c) => c.trim())).not.toContain("observacao");
    }
  });

  it("banco ainda sem a coluna (deploy antes da migração): a leitura é refeita sem ela, sem recado", async () => {
    let primeira = true;
    estado.banco.falha = (tabela, op, filtros) => {
      if (tabela === "inscricoes" && op === "select" && filtros.some((f) => f.startsWith("jogador_id=")) && primeira) {
        primeira = false;
        return { message: "column inscricoes.recado_jogador does not exist", code: "42703" };
      }
      return null;
    };
    delete estado.banco.tabelas.inscricoes![0]!.recado_jogador;
    const minha = await store.minhaInscricao("eu");
    expect(minha?.riotId).toBe("Fulano#BR1");
    expect(minha?.recado).toBeNull();
  });

  it("controle: outro erro de leitura continua estourando", async () => {
    estado.banco.falha = (tabela, op) => (tabela === "inscricoes" && op === "select" ? "tempo esgotado" : null);
    await expect(store.minhaInscricao("eu")).rejects.toThrow(/Falha ao ler a inscrição/);
  });
});

describe("G: a organização grava o recado pela ficha", () => {
  it("«Salvar tudo» com o recado: grava em recado_jogador, com auditoria", async () => {
    const r = await PATCH(
      req({ acao: "inscrito", dados: { inscricaoId: ID, ficha: { recadoJogador: "  Falta o print.  " } } }),
    );
    expect(r.status).toBe(200);
    expect(estado.banco.tabelas.inscricoes![0]!.recado_jogador).toBe("Falta o print.");
    expect(auditorias(estado.banco).some((a) => a.acao === "ficha")).toBe(true);
  });

  it("vazio apaga o recado", async () => {
    await PATCH(req({ acao: "ficha", dados: { inscricaoId: ID, recadoJogador: "" } }));
    expect(estado.banco.tabelas.inscricoes![0]!.recado_jogador).toBeNull();
  });

  it("ficha sem o recado não cita a coluna (o painel salva mesmo antes da migração)", async () => {
    await PATCH(req({ acao: "ficha", dados: { inscricaoId: ID, observacao: "x" } }));
    const gravacao = estado.banco.operacoes.find((o) => o.tabela === "inscricoes" && o.op === "update");
    expect(Object.keys(gravacao?.valor as object)).not.toContain("recado_jogador");
  });

  it("banco ainda sem a coluna: gravar o recado diz o porquê (400), e nada da ficha muda", async () => {
    // PGRST204: o PostgREST não acha a coluna no esquema (a migração ainda não entrou).
    estado.banco.falha = (tabela, op) =>
      tabela === "inscricoes" && op === "update"
        ? { message: "Could not find the 'recado_jogador' column of 'inscricoes' in the schema cache", code: "PGRST204" }
        : null;
    const r = await PATCH(
      req({ acao: "ficha", dados: { inscricaoId: ID, observacao: "nova nota", recadoJogador: "Oi" } }),
    );
    expect(r.status).toBe(400);
    expect((await r.json()).error).toMatch(/falta a migração do banco \(coluna recado_jogador\)/);
    expect(estado.banco.tabelas.inscricoes![0]!.observacao).toBe("NOTA INTERNA: confirmar com o Nakay se é smurf");
  });

  it("o recado tem o mesmo teto de tamanho, com o motivo dito em português", () => {
    expect(fichaPatchSchema.safeParse({ inscricaoId: ID, recadoJogador: "ok" }).success).toBe(true);
    const longo = { inscricaoId: ID, ficha: { recadoJogador: "x".repeat(2001) } };
    const parsed = inscritoPatchSchema.safeParse(longo);
    expect(parsed.success).toBe(false);
    expect(motivoDaRecusaDoInscrito(parsed.error!.issues[0]!.path, longo)).toMatch(/recado para o jogador/);
  });
});

describe("D3: prazo único dos titulares", () => {
  it("a configuração aceita a data (com fuso) e o nulo, e recusa lixo", () => {
    expect(configPatchSchema.parse({ prazo_pagamento_ate: "2026-11-01T02:59:59Z" }).prazo_pagamento_ate).toBe(
      "2026-11-01T02:59:59Z",
    );
    expect(configPatchSchema.parse({ prazo_pagamento_ate: null }).prazo_pagamento_ate).toBeNull();
    expect(configPatchSchema.safeParse({ prazo_pagamento_ate: "31/10/2026" }).success).toBe(false);
  });

  it("banco ainda sem a coluna: salvar o prazo único diz o porquê (400)", async () => {
    estado.banco.tabelas.inscricao_auditoria = [];
    estado.banco.falha = (tabela, op) =>
      tabela === "edicao_config" && op === "update"
        ? { message: "Could not find the 'prazo_pagamento_ate' column of 'edicao_config' in the schema cache", code: "PGRST204" }
        : null;
    const r = await PATCH(req({ acao: "config", dados: { prazo_pagamento_ate: "2026-11-01T02:59:59Z" } }));
    expect(r.status).toBe(400);
    expect((await r.json()).error).toMatch(/falta a migração do banco \(coluna prazo_pagamento_ate\)/);
  });

  const sql = readFileSync(path.resolve(__dirname, "../../supabase/schema-4a-edicao.sql"), "utf8");
  const bloco = sql.slice(sql.indexOf("do $fila_e_recado$"));

  it("a migração é aditiva, idempotente e roda em public e lob_teste", () => {
    expect(bloco).toMatch(/array\['public', 'lob_teste'\]/);
    expect(bloco).toMatch(/alter table %1\$I\.edicao_config add column if not exists prazo_pagamento_ate timestamptz/);
    expect(bloco).toMatch(/alter table %1\$I\.inscricoes\s+add column if not exists recado_jogador\s+text/);
    expect(bloco).not.toMatch(/drop\s+(table|column)/i);
  });

  it("o gatilho usa o prazo da edição quando existe, e agora + 48 h quando ele já venceu", () => {
    expect(bloco).toMatch(/create or replace function %1\$I\.abrir_pendencias_da_inscricao\(\)/);
    expect(bloco).toMatch(/set search_path = %1\$I, pg_temp/);
    expect(bloco).toMatch(/when v_ate is not null and v_ate > now\(\) then v_ate/);
    expect(bloco).toMatch(/when v_ate is not null then now\(\) \+ interval '48 hours'/);
    expect(bloco).toMatch(/create trigger inscricoes_abrir_pendencias\s+after insert on %1\$I\.inscricoes/);
    // `format()` lê todo "%" do texto: nenhum `%rowtype` ou `%type` solto no corpo.
    expect(bloco.slice(0, bloco.indexOf("$fila_e_recado$;"))).not.toMatch(/%(row)?type/);
  });
});
