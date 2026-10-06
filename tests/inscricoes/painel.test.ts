import { describe, expect, it } from "vitest";

import {
  conferenciaPatchSchema,
  configPatchSchema,
  estadoDaJanela,
  fichaPatchSchema,
  inscritoPatchSchema,
  motivoDaRecusaDoInscrito,
} from "@/lib/inscricoes/schema";

describe("conferência de um item", () => {
  const base = { inscricaoId: "3f2504e0-4f89-11d3-9a0c-0305e82c3301", item: "b" };

  it("aceita só a observação — o veredicto gravado fica como está", () => {
    const parsed = conferenciaPatchSchema.parse({ ...base, observacao: "print no privado" });
    expect("estado" in parsed && parsed.estado !== undefined).toBe(false);
  });

  it("aceita só o estado — a observação gravada fica como está", () => {
    const parsed = conferenciaPatchSchema.parse({ ...base, estado: "ok" });
    expect(parsed.observacao).toBeUndefined();
  });

  it("recusa um corpo sem nada para gravar", () => {
    expect(conferenciaPatchSchema.safeParse(base).success).toBe(false);
  });

  it("recusa estado fora da lista", () => {
    expect(conferenciaPatchSchema.safeParse({ ...base, estado: "talvez" }).success).toBe(false);
  });
});

describe("ficha editada pela organização", () => {
  const base = { inscricaoId: "3f2504e0-4f89-11d3-9a0c-0305e82c3301" };

  it("IGNORA pontos, mesmo vindo de um admin", () => {
    // O formulário público não aceita `pontos`, mas de nada adianta se o painel
    // aceitar: seria a mesma adulteração do preço do jogador, pela porta dos fundos.
    const parsed = fichaPatchSchema.parse({ ...base, pontos: 15, situacao: "apto" });
    expect("pontos" in parsed).toBe(false);
  });

  it("aceita elo verificado conhecido e recusa inventado", () => {
    expect(fichaPatchSchema.safeParse({ ...base, eloVerificado: "Diamante" }).success).toBe(true);
    expect(fichaPatchSchema.safeParse({ ...base, eloVerificado: "Radiante" }).success).toBe(false);
  });

  it("texto vazio no elo vira nulo — é como se apaga a verificação", () => {
    const parsed = fichaPatchSchema.parse({ ...base, eloVerificado: "" });
    expect(parsed.eloVerificado).toBeNull();
  });

  it("recusa situação fora da lista", () => {
    expect(fichaPatchSchema.safeParse({ ...base, situacao: "campeao" }).success).toBe(false);
  });

  it("exige data no formato do Postgres", () => {
    expect(fichaPatchSchema.safeParse({ ...base, entrouNoGrupo: "2026-08-01" }).success).toBe(true);
    expect(fichaPatchSchema.safeParse({ ...base, entrouNoGrupo: "01/08/2026" }).success).toBe(false);
  });

  it("exige um id de inscrição de verdade", () => {
    expect(fichaPatchSchema.safeParse({ inscricaoId: "1", situacao: "apto" }).success).toBe(false);
  });

  it("registra a disponibilidade de quem se inscreveu antes de o formulário perguntar", () => {
    const parsed = fichaPatchSchema.parse({ ...base, disponibilidade: ["noite", "manha", "noite"] });
    expect(parsed.disponibilidade).toEqual(["noite", "manha"]);
    // Vazio é legítimo aqui: desfaz um registro feito por engano.
    expect(fichaPatchSchema.safeParse({ ...base, disponibilidade: [] }).success).toBe(true);
    expect(fichaPatchSchema.safeParse({ ...base, disponibilidade: ["madrugada"] }).success).toBe(false);
  });

  it("ficha sem disponibilidade não mexe nela", () => {
    expect("disponibilidade" in fichaPatchSchema.parse({ ...base, situacao: "apto" })).toBe(false);
  });
});

describe("configuração da edição", () => {
  it("aceita data nula — 'ainda não decidimos' é estado legítimo", () => {
    const parsed = configPatchSchema.parse({ data_draft: null, inicio_campeonato: null });
    expect(parsed.data_draft).toBeNull();
  });

  it("exige data com fuso, que é o que o banco guarda", () => {
    expect(configPatchSchema.safeParse({ data_draft: "2026-11-01T20:00:00.000Z" }).success).toBe(true);
    // Sem offset é hora local ambígua: gravaria o horário errado dependendo do servidor.
    expect(configPatchSchema.safeParse({ data_draft: "2026-11-01T20:00" }).success).toBe(false);
  });

  it("segura os limites dos parâmetros do regulamento", () => {
    expect(configPatchSchema.safeParse({ jogadores_por_time: 5 }).success).toBe(true);
    expect(configPatchSchema.safeParse({ jogadores_por_time: 0 }).success).toBe(false);
    expect(configPatchSchema.safeParse({ jogadores_por_time: 11 }).success).toBe(false);
    expect(configPatchSchema.safeParse({ pct_campeao: 70 }).success).toBe(true);
    expect(configPatchSchema.safeParse({ pct_campeao: 101 }).success).toBe(false);
    // Cronômetro de 1 segundo tornaria o draft impossível de jogar.
    expect(configPatchSchema.safeParse({ segundos_por_escolha: 1 }).success).toBe(false);
  });

  it("não deixa a taxa virar número quebrado — o valor é em centavos", () => {
    expect(configPatchSchema.safeParse({ taxa_centavos: 2000 }).success).toBe(true);
    expect(configPatchSchema.safeParse({ taxa_centavos: 20.5 }).success).toBe(false);
    expect(configPatchSchema.safeParse({ taxa_centavos: -1 }).success).toBe(false);
  });
});

describe("estado da janela de inscrição", () => {
  const AGORA = Date.parse("2026-09-15T12:00:00.000Z");

  it("sem configuração, indisponível — nunca um formulário que não seria aceito", () => {
    expect(estadoDaJanela(null, AGORA)).toBe("indisponivel");
  });

  it("a chave manda: aberta é aberta, mesmo sem data de fechamento", () => {
    expect(estadoDaJanela({ inscricoes_abertas: true, fechamento_inscricoes: null }, AGORA)).toBe("aberta");
  });

  it("fechada com data no passado é 'encerrada'", () => {
    expect(
      estadoDaJanela({ inscricoes_abertas: false, fechamento_inscricoes: "2026-09-01T00:00:00.000Z" }, AGORA),
    ).toBe("encerrada");
  });

  it("fechada sem data ainda não abriu — pede paciência, não conformação", () => {
    expect(estadoDaJanela({ inscricoes_abertas: false, fechamento_inscricoes: null }, AGORA)).toBe(
      "ainda_nao_abriu",
    );
  });

  it("fechada com data no futuro também é 'ainda não abriu'", () => {
    expect(
      estadoDaJanela({ inscricoes_abertas: false, fechamento_inscricoes: "2026-11-30T00:00:00.000Z" }, AGORA),
    ).toBe("ainda_nao_abriu");
  });

  it("aberta pela chave, mas a data de fechamento passou: FECHA sozinha", () => {
    expect(
      estadoDaJanela({ inscricoes_abertas: true, fechamento_inscricoes: "2026-09-15T11:59:59.000Z" }, AGORA),
    ).toBe("encerrada");
    // No instante exato também já fechou.
    expect(
      estadoDaJanela({ inscricoes_abertas: true, fechamento_inscricoes: "2026-09-15T12:00:00.000Z" }, AGORA),
    ).toBe("encerrada");
  });

  it("aberta pela chave e fechamento no futuro: continua aberta", () => {
    expect(
      estadoDaJanela({ inscricoes_abertas: true, fechamento_inscricoes: "2026-10-16T00:00:00.000Z" }, AGORA),
    ).toBe("aberta");
  });

  it("data lixo não derruba a página nem inventa veredicto", () => {
    expect(estadoDaJanela({ inscricoes_abertas: false, fechamento_inscricoes: "nao-e-data" }, AGORA)).toBe(
      "ainda_nao_abriu",
    );
  });
});

describe("«Salvar tudo» da gaveta do inscrito", () => {
  const base = { inscricaoId: "3f2504e0-4f89-11d3-9a0c-0305e82c3301" };

  it("aceita requisitos e ficha juntos", () => {
    const parsed = inscritoPatchSchema.parse({
      ...base,
      conferencias: [
        { item: "a", estado: "ok" },
        { item: "f", observacao: "conta de 2019" },
      ],
      ficha: { situacao: "apto" },
    });
    expect(parsed.conferencias).toHaveLength(2);
    expect(parsed.ficha?.situacao).toBe("apto");
  });

  it("recusa um corpo sem nada para gravar", () => {
    expect(inscritoPatchSchema.safeParse(base).success).toBe(false);
    expect(inscritoPatchSchema.safeParse({ ...base, conferencias: [], ficha: {} }).success).toBe(false);
  });

  it("recusa requisito sem estado nem observação — seria gravar só o carimbo de quem conferiu", () => {
    expect(inscritoPatchSchema.safeParse({ ...base, conferencias: [{ item: "a" }] }).success).toBe(false);
  });

  it("recusa o mesmo requisito duas vezes — as gravações correm juntas, não há vencedor", () => {
    const repetido = { ...base, conferencias: [{ item: "a", estado: "ok" }, { item: "a", estado: "recusado" }] };
    expect(inscritoPatchSchema.safeParse(repetido).success).toBe(false);
  });

  it("IGNORA pontos e a data de entrada no grupo, mesmo vindo de um admin", () => {
    const parsed = inscritoPatchSchema.parse({
      ...base,
      ficha: { situacao: "apto", pontos: 15, entrouNoGrupo: "2026-08-01" },
    });
    expect(parsed.ficha).toEqual({ situacao: "apto" });
  });

  it("limpar o elo verificado conta como alteração (vira nulo)", () => {
    const parsed = inscritoPatchSchema.parse({ ...base, ficha: { eloVerificado: "" } });
    expect(parsed.ficha?.eloVerificado).toBeNull();
  });

  it("recusa estado ou item fora da lista", () => {
    expect(inscritoPatchSchema.safeParse({ ...base, conferencias: [{ item: "a", estado: "talvez" }] }).success).toBe(
      false,
    );
    expect(inscritoPatchSchema.safeParse({ ...base, conferencias: [{ item: "z", estado: "ok" }] }).success).toBe(false);
  });
});

describe("motivo da recusa do «Salvar tudo»", () => {
  const base = { inscricaoId: "3f2504e0-4f89-11d3-9a0c-0305e82c3301" };
  const motivo = (corpo: unknown) => {
    const r = inscritoPatchSchema.safeParse(corpo);
    if (r.success) throw new Error("devia ter recusado");
    return motivoDaRecusaDoInscrito(r.error.issues[0]?.path ?? [], corpo);
  };

  it("aponta o requisito cuja observação passou do limite", () => {
    const corpo = {
      ...base,
      conferencias: [
        { item: "a", estado: "ok" },
        { item: "f", observacao: "x".repeat(501) },
      ],
    };
    expect(motivo(corpo)).toBe("A observação do requisito (F) passa de 500 caracteres.");
  });

  it("aponta a ficha e o nome", () => {
    expect(motivo({ ...base, ficha: { observacao: "x".repeat(501) } })).toMatch(/observação da ficha/);
    expect(motivo({ ...base, ficha: { nomeReal: "Fulano" } })).toMatch(/^Nome:/);
  });

  it("não ecoa letra que não seja de requisito", () => {
    expect(motivoDaRecusaDoInscrito(["conferencias", 0, "observacao"], { conferencias: [{ item: "<b>" }] })).toBe(
      "A observação do requisito passa de 500 caracteres.",
    );
  });

  it("o resto continua genérico", () => {
    expect(motivo(base)).toBe("Alterações inválidas.");
  });
});
