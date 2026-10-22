import { describe, expect, it } from "vitest";

import { alertasDoInscrito, type InscritoParaAlerta } from "@/lib/inscricoes/alertas";

/**
 * A mesma conta da Riot em duas inscrições (INS-04 / RIOT-05).
 *
 * O índice único do banco é sobre o Riot ID ESCRITO; «SAMUEL VENANCIO#MC97» e «SAMUEL
 * VENÂNCIO#MC97» passam as duas, e a Riot resolve as duas para a mesma conta (mesmo PUUID).
 * O painel aponta — só entre quem ainda conta para os times.
 */

const base = (id: string, riot_id: string, puuid: string | null, situacao = "pendente"): InscritoParaAlerta => ({
  id,
  riot_id,
  puuid,
  situacao,
  organizador: false,
  elo_declarado: "Ouro",
  elo_verificado: null,
});

const codigos = (i: InscritoParaAlerta, inscritos?: InscritoParaAlerta[]) =>
  alertasDoInscrito({
    inscrito: i,
    conferencias: [],
    pagamento: null,
    config: { inicio_campeonato: null, min_ranqueadas: 5 },
    agoraMs: Date.parse("2026-10-21T12:00:00Z"),
    inscritos,
  });

describe("alerta «mesma_conta»", () => {
  const a = base("a", "SAMUEL VENÂNCIO#MC97", "PUUID-X");
  const b = base("b", "SAMUEL VENANCIO#MC97", "PUUID-X");
  const c = base("c", "Outra#BR1", "PUUID-Y");

  it("as duas inscrições com o mesmo PUUID acusam a outra, pelo Riot ID", () => {
    const todos = [a, b, c];
    expect(codigos(a, todos).find((x) => x.codigo === "mesma_conta")?.texto).toMatch(/SAMUEL VENANCIO#MC97/);
    expect(codigos(b, todos).find((x) => x.codigo === "mesma_conta")?.texto).toMatch(/SAMUEL VENÂNCIO#MC97/);
    expect(codigos(c, todos).map((x) => x.codigo)).not.toContain("mesma_conta");
  });

  it("a própria inscrição na lista (outro objeto, mesmo id) não conta", () => {
    expect(codigos(a, [{ ...a }, c]).map((x) => x.codigo)).not.toContain("mesma_conta");
  });

  it("a outra recusada ou desistente não conta; quem está fora também não é acusado", () => {
    expect(codigos(a, [a, { ...b, situacao: "recusado" }]).map((x) => x.codigo)).not.toContain("mesma_conta");
    expect(codigos(a, [a, { ...b, situacao: "desistiu" }]).map((x) => x.codigo)).not.toContain("mesma_conta");
    expect(codigos({ ...a, situacao: "recusado" }, [a, b]).map((x) => x.codigo)).not.toContain("mesma_conta");
  });

  it("sem PUUID (Riot ainda não conferiu) não há como comparar", () => {
    const semConta = base("d", "Fulano#BR1", null);
    expect(codigos(semConta, [semConta, base("e", "Fulano2#BR1", null)]).map((x) => x.codigo)).not.toContain("mesma_conta");
  });

  it("sem a lista de inscritos, o alerta não é calculado (chamadas antigas seguem iguais)", () => {
    expect(codigos(a).map((x) => x.codigo)).not.toContain("mesma_conta");
  });
});
