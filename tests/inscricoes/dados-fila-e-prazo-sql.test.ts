import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { estaFora } from "@/lib/inscricoes/pagamento";
import { fichaPatchSchema } from "@/lib/inscricoes/schema";

/**
 * D6 (decisão do Lucas, 2026-10-22) com o formato de 23/10 (8 times de 5 = 40 vagas): o SQL
 * de DADOS que dá o prazo de 31/10 à configuração e recalcula o `vence_em` de cada
 * pagamento em aberto segundo a fila — titular → fim de 31/10 em Brasília, reserva → nulo.
 *
 * Não há Postgres no teste: o que se confere é o contrato do arquivo que o orquestrador roda
 * em public e lob_teste — as guardas, o que ele pode e o que NÃO pode tocar, e que a regra de
 * "fora" do SQL é a mesma `estaFora` do código (uma situação nova de "fora" no TS sem o SQL
 * acompanhar faz este teste falhar).
 */

const ARQUIVO = path.resolve(__dirname, "../../supabase/dados-4a-fila-e-prazo.sql");
// Sem o `\r`: num checkout do Windows (core.autocrlf) o arquivo chega com CRLF, e o `\s+` do
// update pegava o `\r` junto com o texto do SET.
const sql = existsSync(ARQUIVO) ? readFileSync(ARQUIVO, "utf8").replace(/\r\n/g, "\n") : "";
/** Só o que executa: os comentários (inclusive a prévia comentada) ficam de fora. */
const codigo = sql
  .split("\n")
  .filter((l) => !l.trim().startsWith("--"))
  .join("\n");

describe("supabase/dados-4a-fila-e-prazo.sql (D6)", () => {
  it("existe e roda nos dois schemas, pulando o que não existe", () => {
    expect(codigo).toMatch(/foreach s in array array\['public', 'lob_teste'\] loop/);
    expect(codigo).toMatch(/continue when not exists \(select 1 from pg_namespace where nspname = s\)/);
    for (const tabela of ["edicao_config", "inscricoes", "inscricao_pagamentos", "inscricao_auditoria"]) {
      expect(codigo).toContain(`to_regclass(format('%I.${tabela}', s)) is null`);
    }
  });

  it("o prazo gravado é o fim de 31/10 em Brasília (02:59:59 de 01/11 em UTC)", () => {
    expect(codigo).toContain("timestamptz '2026-11-01T02:59:59Z'");
    expect(new Date("2026-11-01T02:59:59Z").toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })).toBe(
      "31/10/2026, 23:59:59",
    );
  });

  it("guardas: a migração antes, 40 vagas e ainda dentro do prazo — senão nada é gravado", () => {
    expect(codigo).toMatch(/column_name = 'prazo_pagamento_ate'/);
    expect(codigo).toMatch(/raise exception '%: falta a coluna edicao_config\.prazo_pagamento_ate/);
    expect(codigo).toMatch(/select max_times \* jogadores_por_time from %I\.edicao_config where id = 1/);
    expect(codigo).toMatch(/if v_vagas is distinct from 40 then\s+raise exception/);
    expect(codigo).toMatch(/if now\(\) >= v_ate then\s+raise exception/);
  });

  it("a regra de «fora» do SQL é a mesma `estaFora` do código (excluído incluso)", () => {
    const lista = /where situacao not in \(([^)]*)\)/.exec(codigo)?.[1] ?? "";
    const foraNoSql = [...lista.matchAll(/'([a-z_]+)'/g)].map((m) => m[1]).sort();
    const situacoes = fichaPatchSchema.shape.situacao.unwrap().options as readonly string[];
    expect(foraNoSql).toEqual(situacoes.filter((s) => estaFora(s)).sort());
    expect(foraNoSql).toContain("excluido");
  });

  it("a fila do SQL é a de `montarFila`: organizadores todos, os demais por ordem de inscrição, «sobra» na fila", () => {
    expect(codigo).toMatch(/row_number\(\) over \(order by criado_em, id\)/);
    expect(codigo).toMatch(/when a\.situacao = 'sobra' then 'reserva'\s+when a\.org then 'titular'/);
    expect(codigo).toMatch(/greatest\(0, %3\$s - \(select n from orgs\)\)/);
    expect(codigo).toMatch(/case l\.tipo when 'titular' then %2\$L::timestamptz end as depois/);
  });

  it("só mexe no prazo de pagamento EM ABERTO e no prazo da configuração — nunca em estado, pago ou isento", () => {
    const updates = [...codigo.matchAll(/update %1\$I\.([a-z_]+)\s+(?:p\s+)?set ([^\n]*)/g)].map((m) => [m[1], m[2]]);
    expect(updates).toEqual([
      ["edicao_config", "prazo_pagamento_ate = %2$L::timestamptz, atualizado_em = now()"],
      ["inscricao_pagamentos", "vence_em = a.depois, atualizado_em = now()"],
    ]);
    expect(codigo.match(/p\.estado in \('aguardando', 'declarado'\)/g)).toHaveLength(2);
    expect(codigo).not.toMatch(/\bdelete\b|\bdrop\b|\btruncate\b|\binsert into %1\$I\.inscricao_pagamentos/i);
    expect(codigo).not.toMatch(/set\s+estado\b/i);
  });

  it("idempotente: só grava onde o valor muda, e a auditoria sai só do que mudou", () => {
    expect(codigo).toMatch(/and prazo_pagamento_ate is distinct from %2\$L::timestamptz/);
    expect(codigo).toMatch(/and p\.vence_em is distinct from a\.depois/);
    expect(codigo).toMatch(/'prazo_alinhado_com_a_fila'[\s\S]*from mudou;/);
  });

  it("`format()` lê todo «%» do texto: nenhum `%rowtype`/`%type` solto nos blocos formatados", () => {
    expect(codigo).not.toMatch(/%(row)?type/);
  });
});

describe("migração da fila (schema-4a-edicao.sql) depois do ajuste de 23/10", () => {
  const schema = readFileSync(path.resolve(__dirname, "../../supabase/schema-4a-edicao.sql"), "utf8");
  const bloco = schema.slice(schema.indexOf("do $fila_e_recado$"));

  it("o bloco «excluido» da main continua lá, ANTES do bloco da fila, e a fila não mexe na situação", () => {
    expect(schema.indexOf("do $excluido$")).toBeGreaterThan(-1);
    expect(schema.indexOf("do $excluido$")).toBeLessThan(schema.indexOf("do $fila_e_recado$"));
    expect(schema).toMatch(/check \(situacao in \('pendente','apto','recusado','desistiu','sobra','excluido'\)\)/);
    expect(bloco).not.toMatch(/situacao_check/);
  });

  it("schema sem as tabelas é pulado, e o PostgREST recarrega o esquema no fim", () => {
    expect(bloco).toContain("continue when to_regclass(format('%I.edicao_config', s)) is null");
    expect(bloco).toMatch(/notify pgrst, 'reload schema';/);
  });
});
