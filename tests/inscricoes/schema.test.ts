import { describe, expect, it } from "vitest";

import {
  contaParaTimes,
  distribuirTimes,
  inscricaoPublicaSchema,
  linhaDeInscricao,
  orcamentoSugerido,
  pontosDoElo,
  rotaCanonica,
  viabilidadeDeOrcamento,
} from "@/lib/inscricoes/schema";

/** O e-mail NÃO está aqui: ele vem da sessão, no servidor. Ver lib/inscricoes/schema.ts. */
const EMAIL_DA_SESSAO = "nak4y@exemplo.com";

const valida = {
  nick: "Nak4y",
  tag: "JPN",
  nomeReal: "Fulano de Tal",
  discord: "nak4y",
  elo: "Diamante",
  rotaPrimaria: "MEIO",
  rotaSecundaria: "ATIRADOR",
  disponibilidade: ["noite"],
  aceiteRegulamento: true as const,
  aceiteImagem: true as const,
  aceiteRequisitos: true as const,
};

describe("pontos vêm do elo, nunca do cliente", () => {
  it("deriva os pontos pela tabela do site", () => {
    expect(pontosDoElo("Ferro")).toBe(1);
    expect(pontosDoElo("Diamante")).toBe(8);
    expect(pontosDoElo("Desafiante")).toBe(15);
  });

  it("aceita os rótulos que o formulário manda, com acento e tudo", () => {
    expect(pontosDoElo("Grão-Mestre")).toBe(12);
    expect(pontosDoElo("Esmeralda")).toBe(6);
  });

  it("elo desconhecido não vira pontuação", () => {
    expect(pontosDoElo("Radiante")).toBeNull();
    expect(inscricaoPublicaSchema.safeParse({ ...valida, elo: "Radiante" }).success).toBe(false);
  });

  it("IGNORA qualquer campo de pontos enviado junto — era o furo do design", () => {
    // O formulário original mandava `pontos: EM[elo].p` calculado no navegador.
    // Aqui: elo barato, pontos altos. A linha gravada tem de refletir o ELO.
    const comPontosForjados = { ...valida, elo: "Ferro", pontos: 15 };
    const parsed = inscricaoPublicaSchema.parse(comPontosForjados);
    expect("pontos" in parsed).toBe(false);
    expect(linhaDeInscricao(parsed, EMAIL_DA_SESSAO).pontos).toBe(1);
  });
});

describe("Riot ID", () => {
  it("normaliza a tag para maiúsculas e tira o # digitado por engano", () => {
    const linha = linhaDeInscricao(inscricaoPublicaSchema.parse({ ...valida, tag: "#br1" }), EMAIL_DA_SESSAO);
    expect(linha.tag).toBe("BR1");
  });

  it("recusa # dentro do nick, que quebraria o Riot ID gerado no banco", () => {
    expect(inscricaoPublicaSchema.safeParse({ ...valida, nick: "Nak4y#JPN" }).success).toBe(false);
  });

  it("recusa tag com caractere fora de letra e número", () => {
    expect(inscricaoPublicaSchema.safeParse({ ...valida, tag: "br 1" }).success).toBe(false);
    expect(inscricaoPublicaSchema.safeParse({ ...valida, tag: "BR-1" }).success).toBe(false);
    expect(inscricaoPublicaSchema.safeParse({ ...valida, tag: "😀😀" }).success).toBe(false);
  });

  it("aceita tag com acento — a Riot tem tag como «Caçu» (o jogador digitava BR1 e caía em conta alheia)", () => {
    const r = inscricaoPublicaSchema.safeParse({ ...valida, nick: "Caçu", tag: "Caçu" });
    expect(r.success).toBe(true);
    expect(linhaDeInscricao(r.data!, EMAIL_DA_SESSAO).tag).toBe("CAÇU");
  });
});

describe("rotas", () => {
  it("converte os rótulos do formulário para as chaves do site", () => {
    expect(rotaCanonica("TOPO")).toBe("TOP");
    expect(rotaCanonica("SELVA")).toBe("JUNG");
    expect(rotaCanonica("MEIO")).toBe("MID");
    expect(rotaCanonica("ATIRADOR")).toBe("ADC");
    expect(rotaCanonica("SUPORTE")).toBe("SUP");
  });

  it("o valor gravado volta pelo mesmo resolvedor — a selva era a exceção", () => {
    // rotaCanonica devolvia `short`, e o short da selva é "SEL", que não é alias de
    // nada: o jungler saía do banco como rota que o site não sabia ler. Idempotência
    // é a asserção que pega isso.
    for (const rota of ["TOPO", "SELVA", "MEIO", "ATIRADOR", "SUPORTE"]) {
      const canonica = rotaCanonica(rota)!;
      expect(canonica).not.toBeNull();
      expect(rotaCanonica(canonica)).toBe(canonica);
    }
  });

  it("recusa rota primária igual à secundária", () => {
    const r = inscricaoPublicaSchema.safeParse({ ...valida, rotaSecundaria: "MEIO" });
    expect(r.success).toBe(false);
  });
});

describe("tag", () => {
  it("uma letra depois do # não vira tag válida", () => {
    // O `#` era contado no mínimo de 2 caracteres, então "#A" passava e o Riot ID
    // gravado ficava "Nick#A". A medida tem de ser feita DEPOIS de tirar o #.
    expect(inscricaoPublicaSchema.safeParse({ ...valida, tag: "#A" }).success).toBe(false);
    expect(inscricaoPublicaSchema.safeParse({ ...valida, tag: "A" }).success).toBe(false);
    expect(inscricaoPublicaSchema.safeParse({ ...valida, tag: "#BR1" }).success).toBe(true);
  });
});

describe("aceites são obrigatórios (regras 17 e 22)", () => {
  it("não passa sem aceitar o regulamento", () => {
    expect(inscricaoPublicaSchema.safeParse({ ...valida, aceiteRegulamento: false }).success).toBe(false);
  });

  it("não passa sem autorizar o uso de imagem", () => {
    expect(inscricaoPublicaSchema.safeParse({ ...valida, aceiteImagem: false }).success).toBe(false);
  });

  it("não passa sem confirmar os requisitos", () => {
    expect(inscricaoPublicaSchema.safeParse({ ...valida, aceiteRequisitos: false }).success).toBe(false);
  });
});

describe("nome e sobrenome (seção 2 do regulamento da 4ª)", () => {
  it("é obrigatório", () => {
    expect(inscricaoPublicaSchema.safeParse({ ...valida, nomeReal: undefined }).success).toBe(false);
    expect(inscricaoPublicaSchema.safeParse({ ...valida, nomeReal: "   " }).success).toBe(false);
  });

  it("um nome só não basta — o grupo confere pelo nome completo", () => {
    expect(inscricaoPublicaSchema.safeParse({ ...valida, nomeReal: "Fulano" }).success).toBe(false);
  });

  it("vai para a ficha sem espaços sobrando", () => {
    const linha = linhaDeInscricao(
      inscricaoPublicaSchema.parse({ ...valida, nomeReal: "  Fulano de Tal  " }),
      EMAIL_DA_SESSAO,
    );
    expect(linha.nome_real).toBe("Fulano de Tal");
  });
});

describe("disponibilidade por turno (regra 9)", () => {
  it("exige pelo menos um turno", () => {
    expect(inscricaoPublicaSchema.safeParse({ ...valida, disponibilidade: [] }).success).toBe(false);
    expect(inscricaoPublicaSchema.safeParse({ ...valida, disponibilidade: undefined }).success).toBe(false);
  });

  it("recusa turno que o banco não aceita", () => {
    expect(inscricaoPublicaSchema.safeParse({ ...valida, disponibilidade: ["madrugada"] }).success).toBe(false);
  });

  it("grava os turnos marcados, sem repetição", () => {
    const linha = linhaDeInscricao(
      inscricaoPublicaSchema.parse({ ...valida, disponibilidade: ["tarde", "noite", "tarde"] }),
      EMAIL_DA_SESSAO,
    );
    expect(linha.disponibilidade).toEqual(["tarde", "noite"]);
  });
});

describe("Discord", () => {
  it("tira o @ do começo — senão a mesma pessoa passava duas vezes no índice único", () => {
    const linha = linhaDeInscricao(
      inscricaoPublicaSchema.parse({ ...valida, discord: "@nak4y" }),
      EMAIL_DA_SESSAO,
    );
    expect(linha.discord).toBe("nak4y");
  });

  it("só um @ não é um usuário", () => {
    expect(inscricaoPublicaSchema.safeParse({ ...valida, discord: "@" }).success).toBe(false);
  });
});

describe("capitão não é candidatura na 4ª (seção 3)", () => {
  it("grava quer_capitao falso mesmo que um formulário antigo mande verdadeiro", () => {
    const linha = linhaDeInscricao(
      inscricaoPublicaSchema.parse({ ...valida, querCapitao: true }),
      EMAIL_DA_SESSAO,
    );
    expect(linha.quer_capitao).toBe(false);
  });
});

describe("quem entra na conta de times", () => {
  it("todo mundo menos recusado e desistente — pendente incluso", () => {
    expect(["pendente", "apto", "sobra", "recusado", "desistiu"].filter(contaParaTimes)).toEqual([
      "pendente",
      "apto",
      "sobra",
    ]);
  });
});

describe("número de times sai dos aprovados, não é fixo", () => {
  it("50 aprovados fecham 10 times sem sobra — a meta desta edição", () => {
    expect(distribuirTimes(50)).toEqual({ times: 10, vagas: 50, sobra: 0 });
  });

  it("48 aprovados dão 9 times e 3 de sobra", () => {
    expect(distribuirTimes(48)).toEqual({ times: 9, vagas: 45, sobra: 3 });
  });

  it("continua valendo para o formato antigo de 6 times", () => {
    expect(distribuirTimes(30)).toEqual({ times: 6, vagas: 30, sobra: 0 });
  });

  it("gente demais de menos não inventa time incompleto", () => {
    expect(distribuirTimes(4)).toEqual({ times: 0, vagas: 0, sobra: 4 });
  });

  it("com o teto da 4ª (6 times), 37 aprovados continuam 6 times e 7 viram sobra", () => {
    // Sem o teto seriam 7 times — e o calendário de 18 séries só fecha com 6.
    expect(distribuirTimes(37, 5, 6)).toEqual({ times: 6, vagas: 30, sobra: 7 });
    expect(distribuirTimes(37, 5)).toEqual({ times: 7, vagas: 35, sobra: 2 });
  });

  it("o teto não inventa time: abaixo dele vale a conta normal", () => {
    expect(distribuirTimes(28, 5, 6)).toEqual({ times: 5, vagas: 25, sobra: 3 });
  });

  it("teto nulo, zero ou quebrado = sem teto", () => {
    expect(distribuirTimes(50, 5, null)).toEqual({ times: 10, vagas: 50, sobra: 0 });
    expect(distribuirTimes(50, 5, 0)).toEqual({ times: 10, vagas: 50, sobra: 0 });
    expect(distribuirTimes(50, 5, 2.5)).toEqual({ times: 10, vagas: 50, sobra: 0 });
  });
});

describe("orçamento da regra: média por time + 15%, arredondada para cima", () => {
  it("170 pontos em 6 times: média 28,33 → 32,58 → 33", () => {
    expect(orcamentoSugerido(170, 6)).toBe(33);
  });

  it("conta exata não sobe um ponto à toa (200 em 10 times = 20 → 23)", () => {
    expect(orcamentoSugerido(200, 10)).toBe(23);
  });

  it("sem times ou sem pontos não sugere nada", () => {
    expect(orcamentoSugerido(0, 6)).toBeNull();
    expect(orcamentoSugerido(170, 0)).toBeNull();
  });

  it("a viabilidade traz a sugestão junto, contando só quem entra", () => {
    const r = viabilidadeDeOrcamento(Array(32).fill(5), 5, 30, 6);
    expect(r).toMatchObject({ times: 6, vagas: 30, sobra: 2, total: 150, sugerido: 29 });
  });
});

describe("viabilidade de orçamento", () => {
  it("cabe quando a soma dos que entram respeita o teto", () => {
    // 10 jogadores de 3 pontos = 30; 2 times × 30 = 60 de teto.
    const r = viabilidadeDeOrcamento(Array(10).fill(3));
    expect(r).toMatchObject({ times: 2, vagas: 10, total: 30, teto: 60, cabe: true });
  });

  it("não cabe quando entra gente de elo alto demais", () => {
    // 10 desafiantes = 150 pontos para um teto de 60.
    const r = viabilidadeDeOrcamento(Array(10).fill(15));
    expect(r.cabe).toBe(false);
    expect(r.folga).toBeLessThan(0);
  });

  it("a sobra fica de fora da conta do teto", () => {
    // 12 jogadores → 2 times (10 vagas) e 2 de sobra. Os dois mais caros sobram.
    const r = viabilidadeDeOrcamento([15, 15, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
    expect(r).toMatchObject({ times: 2, vagas: 10, sobra: 2 });
    expect(r.total).toBe(10);
    expect(r.cabe).toBe(true);
  });
});
