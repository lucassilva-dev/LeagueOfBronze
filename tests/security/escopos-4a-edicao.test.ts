import { describe, expect, it } from "vitest";

import type { AdminIdentity } from "@/lib/admin-auth";
import { SCOPES, hasScope, type Scope } from "@/lib/security/scopes";

/**
 * Os quatro escopos da 4ª Edição.
 *
 * O que estes testes travam é a separação de funções que o painel promete: quem
 * confere requisito não mexe em dinheiro, quem cuida do caixa não aprova ninguém, e
 * mudar as datas e a taxa da edição é do master.
 */

function conta(over: Partial<{ isMaster: boolean; scopes: string[] }> = {}): AdminIdentity {
  return {
    id: "u1",
    username: "organizador",
    displayName: "Organizador",
    mustChangePassword: false,
    legacy: false,
    isMaster: false,
    scopes: [],
    ...over,
  };
}

const NOVOS: Scope[] = [
  "inscricoes:conferir",
  "inscricoes:financeiro",
  "draft:conduzir",
  "edicao:configurar",
];

describe("escopos da 4ª Edição", () => {
  it("todos existem no catálogo que o painel de permissões renderiza", () => {
    // Um escopo verificado no servidor mas ausente da lista seria impossível de
    // conceder pela tela — ninguém nunca teria a permissão.
    for (const escopo of NOVOS) {
      expect(SCOPES.some((s) => s.key === escopo), `${escopo} fora do catálogo`).toBe(true);
    }
  });

  it("conta sem escopo nenhum não alcança nada da 4ª Edição", () => {
    for (const escopo of NOVOS) {
      expect(hasScope(conta(), escopo)).toBe(false);
    }
  });

  it("quem confere requisito NÃO mexe em dinheiro", () => {
    const conferente = conta({ scopes: ["inscricoes:conferir"] });
    expect(hasScope(conferente, "inscricoes:conferir")).toBe(true);
    expect(hasScope(conferente, "inscricoes:financeiro")).toBe(false);
  });

  it("quem cuida do caixa NÃO aprova inscrito", () => {
    const caixa = conta({ scopes: ["inscricoes:financeiro"] });
    expect(hasScope(caixa, "inscricoes:financeiro")).toBe(true);
    expect(hasScope(caixa, "inscricoes:conferir")).toBe(false);
  });

  it("configurar a edição é do master, e não se concede por lista", () => {
    // A tentativa mais provável de erro: alguém acrescenta o escopo à lista de uma
    // conta comum achando que basta. `edicao:configurar` muda datas, taxa e a chave
    // que abre as inscrições — fica com quem responde pela edição.
    const tentativa = conta({ scopes: ["edicao:configurar"] });
    expect(hasScope(tentativa, "edicao:configurar")).toBe(false);
  });

  it("o master alcança tudo, inclusive o que é só dele", () => {
    // A ordem importa: `isMaster` é conferido ANTES da lista de masterOnly. Invertida,
    // ninguém no mundo conseguiria configurar a edição — nem o dono do campeonato.
    const master = conta({ isMaster: true });
    for (const escopo of NOVOS) {
      expect(hasScope(master, escopo), `master barrado em ${escopo}`).toBe(true);
    }
  });

  it("conduzir o draft é escopo próprio, separado de conferir", () => {
    const conferente = conta({ scopes: ["inscricoes:conferir"] });
    expect(hasScope(conferente, "draft:conduzir")).toBe(false);

    const condutor = conta({ scopes: ["draft:conduzir"] });
    expect(hasScope(condutor, "draft:conduzir")).toBe(true);
    expect(hasScope(condutor, "inscricoes:conferir")).toBe(false);
  });
});
