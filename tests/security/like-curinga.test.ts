import { describe, expect, it } from "vitest";

import { escaparLike } from "@/lib/security/admin-store";

/**
 * Em LIKE/ILIKE, `%` casa com qualquer sequência e `_` com um caractere qualquer.
 * Uma busca de credencial montada com o texto digitado pela pessoa, sem escapar,
 * deixa de ser busca e vira padrão.
 */
describe("escaparLike", () => {
  it("não mexe no que é comum", () => {
    expect(escaparLike("razeral")).toBe("razeral");
    expect(escaparLike("nakay@exemplo.com")).toBe("nakay@exemplo.com");
  });

  it("neutraliza o sublinhado, que é curinga de um caractere", () => {
    // Sem isto, procurar por "ana_b" encontraria também "anaXb".
    expect(escaparLike("ana_b")).toBe("ana\\_b");
  });

  it("neutraliza o porcento, que casa com qualquer coisa", () => {
    expect(escaparLike("%")).toBe("\\%");
    expect(escaparLike("%@gmail.com")).toBe("\\%@gmail.com");
  });

  it("escapa a própria barra invertida antes dos curingas", () => {
    // Se a barra não fosse escapada primeiro, "\\%" viraria uma barra seguida de um
    // curinga escapado — e o `%` voltaria a valer como curinga.
    expect(escaparLike("a\\b")).toBe("a\\\\b");
    expect(escaparLike("\\%")).toBe("\\\\\\%");
  });

  it("o padrão escapado casa exatamente com o texto original", () => {
    // Prova em JavaScript da semântica que o Postgres aplica: traduzimos o padrão
    // LIKE para regex e conferimos que ele só encontra o texto de origem.
    const paraRegex = (padrao: string) => {
      let saida = "";
      for (let i = 0; i < padrao.length; i++) {
        const c = padrao[i]!;
        if (c === "\\") {
          saida += (padrao[++i] ?? "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        } else if (c === "%") saida += ".*";
        else if (c === "_") saida += ".";
        else saida += c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      }
      return new RegExp(`^${saida}$`);
    };

    for (const original of ["ana_b", "%@gmail.com", "a\\b", "razeral"]) {
      const re = paraRegex(escaparLike(original));
      expect(re.test(original)).toBe(true);
    }

    // E o que importa: o padrão de "ana_b" NÃO alcança a conta de outra pessoa.
    expect(paraRegex(escaparLike("ana_b")).test("anaXb")).toBe(false);
    expect(paraRegex(escaparLike("%@gmail.com")).test("vitima@gmail.com")).toBe(false);
  });
});
