import { describe, expect, it } from "vitest";

import {
  configPatchSchema,
  estadoDaJanela,
  fichaPatchSchema,
} from "@/lib/inscricoes/schema";

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

  it("data lixo não derruba a página nem inventa veredicto", () => {
    expect(estadoDaJanela({ inscricoes_abertas: false, fechamento_inscricoes: "nao-e-data" }, AGORA)).toBe(
      "ainda_nao_abriu",
    );
  });
});
