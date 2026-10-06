import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SecaoConfiguracao } from "@/components/admin/e4/secao-configuracao";
import { SecaoInscritos } from "@/components/admin/e4/secao-inscritos";
import { SecaoPagamentos } from "@/components/admin/e4/secao-pagamentos";
import { SecaoTimes } from "@/components/admin/e4/secao-times";
import type {
  Conferencia,
  DadosEdicao,
  Inscrito,
  Pagamento,
  PropsSecao,
} from "@/components/admin/e4/painel-edicao";
import { ITENS_CONFERENCIA } from "@/lib/inscricoes/schema";

/**
 * Fumaça das quatro telas da 4ª Edição.
 *
 * Elas foram escritas em paralelo e nunca tinham sido EXECUTADAS: typecheck prova que
 * os tipos fecham, não que a tela não estoura ao ler um campo nulo. Renderizar no
 * servidor exercita o caminho de render inteiro sem precisar de navegador nem de
 * login — e é onde aparece o `undefined.map`, o `.toFixed` em nulo e o acesso a um
 * inscrito que não existe.
 *
 * Os efeitos não rodam no `renderToStaticMarkup`, então isto não cobre interação. O
 * que cobre é o primeiro render, que é onde mora a maioria dos estouros.
 */

// ---------------------------------------------------------------- fixture

function inscrito(over: Partial<Inscrito> & { id: string }): Inscrito {
  return {
    criado_em: "2026-09-01T12:00:00.000Z",
    nick: `Jogador${over.id}`,
    tag: "BR1",
    riot_id: `Jogador${over.id}#BR1`,
    nome_real: null,
    email: `${over.id}@exemplo.com`,
    discord: `disc_${over.id}`,
    whatsapp: null,
    elo_declarado: "Ouro",
    elo_verificado: null,
    elo_congelado: null,
    pontos: 4,
    rota_primaria: "MID",
    rota_secundaria: "TOP",
    disponibilidade: ["tarde", "noite"],
    quer_capitao: false,
    entrou_no_grupo: null,
    situacao: "apto",
    organizador: false,
    observacao: null,
    ...over,
  };
}

function conferenciasDe(inscricaoId: string, estado = "pendente"): Conferencia[] {
  return ITENS_CONFERENCIA.map((item) => ({
    inscricao_id: inscricaoId,
    item,
    estado,
    observacao: null,
    conferido_por: null,
    conferido_em: null,
  }));
}

function pagamento(over: Partial<Pagamento> & { inscricao_id: string }): Pagamento {
  return {
    estado: "aguardando",
    valor_centavos: 2000,
    declarado_em: null,
    conferido_por: null,
    conferido_em: null,
    vence_em: "2026-09-20T00:00:00.000Z",
    observacao: null,
    ...over,
  };
}

/** Um cenário com as bordas todas presentes: nulos, cada estado, e um pagamento órfão. */
function dados(): DadosEdicao {
  const inscritos: Inscrito[] = [
    inscrito({ id: "a1", situacao: "apto", pontos: 8, elo_verificado: "Diamante", quer_capitao: true }),
    // Inscritos antes de o formulário perguntar os turnos — e um vindo sem a coluna.
    inscrito({ id: "v1", situacao: "pendente", disponibilidade: [] }),
    inscrito({ id: "v2", situacao: "pendente", disponibilidade: null }),
    inscrito({ id: "a2", situacao: "apto", pontos: 1, elo_declarado: "Ferro", rota_primaria: "JUNG" }),
    inscrito({ id: "a3", situacao: "apto", pontos: 3, rota_primaria: "SUP", rota_secundaria: "ADC" }),
    inscrito({ id: "a4", situacao: "apto", pontos: 5, elo_congelado: "Platina", congelado: true } as never),
    inscrito({ id: "a5", situacao: "apto", pontos: 2, organizador: true }),
    inscrito({ id: "s1", situacao: "sobra", pontos: 15, elo_declarado: "Desafiante" }),
    inscrito({ id: "p1", situacao: "pendente" }),
    inscrito({ id: "r1", situacao: "recusado", observacao: "Conta smurf." }),
    inscrito({ id: "d1", situacao: "desistiu" }),
  ];

  const pagamentos: Pagamento[] = [
    pagamento({ inscricao_id: "a1", estado: "pago", conferido_por: "lucas", conferido_em: "2026-09-05T10:00:00.000Z" }),
    pagamento({ inscricao_id: "a2", estado: "declarado", declarado_em: "2026-09-06T10:00:00.000Z" }),
    pagamento({ inscricao_id: "a3", estado: "aguardando", vence_em: "2026-08-01T00:00:00.000Z" }), // vencido
    pagamento({ inscricao_id: "a4", estado: "estorno_devido" }),
    pagamento({ inscricao_id: "a5", estado: "isento" }),
    pagamento({ inscricao_id: "s1", estado: "estornado" }),
    pagamento({ inscricao_id: "r1", estado: "cancelado" }),
    // Órfão de propósito: não existe inscrito com este id. A tela não pode quebrar.
    pagamento({ inscricao_id: "fantasma-sem-ficha" }),
  ];

  return {
    config: {
      nome: "4ª Edição",
      // Todas as datas nulas — o estado real de hoje, e o que mais quebra tela.
      abertura_inscricoes: null,
      fechamento_inscricoes: null,
      prazo_vinculo_riot: null,
      congelamento_elo: null,
      data_draft: null,
      inicio_campeonato: null,
      inscricoes_abertas: false,
      jogadores_por_time: 5,
      orcamento_por_time: 30,
      min_ranqueadas: 5,
      dias_no_grupo: 60,
      prazo_pagamento_dias: 14,
      segundos_por_escolha: 60,
      taxa_centavos: 2000,
      pct_campeao: 70,
      chave_pix: null,
      responsavel_financeiro: null,
    },
    inscritos,
    conferencias: inscritos.flatMap((i) => conferenciasDe(i.id)),
    pagamentos,
    panorama: {
      inscritos: inscritos.length,
      // 11 inscritos menos o recusado e o desistente; os 3 pendentes contam.
      // distribuirTimes(9, 5) = 1 time, 5 vagas, 4 de sobra.
      elegiveis: 9,
      aprovados: 6,
      pendentes: 3,
      recusados: 1,
      times: 1,
      vagas: 5,
      sobra: 4,
      caixa: {
        recebido: 6000,
        estornado: 2000,
        aDevolver: 2000,
        emCaixa: 4000,
        arrecadado: 2000,
        aReceber: 4000,
        isento: 2000,
      },
    },
    auditoria: [
      { id: 1, ocorrido_em: "2026-09-06T10:00:00.000Z", inscricao_id: "a1", autor: "lucas", acao: "ficha", detalhe: null },
    ],
  };
}

function props(over: Partial<PropsSecao> = {}): PropsSecao {
  return {
    dados: dados(),
    executar: async () => true,
    ocupado: false,
    podeConferir: true,
    podeFinanceiro: true,
    podeConfigurar: true,
    ...over,
  };
}

const SECOES = [
  { nome: "Configuração", Componente: SecaoConfiguracao },
  { nome: "Inscritos", Componente: SecaoInscritos },
  { nome: "Pagamentos", Componente: SecaoPagamentos },
  { nome: "Times", Componente: SecaoTimes },
] as const;

// ---------------------------------------------------------------- testes

describe("as quatro seções renderizam", () => {
  for (const { nome, Componente } of SECOES) {
    it(`${nome}: com dados de borda (datas nulas, pagamento órfão, todos os estados)`, () => {
      const html = renderToStaticMarkup(<Componente {...props()} />);
      expect(html.length).toBeGreaterThan(500);
    });

    it(`${nome}: com a edição VAZIA — ninguém inscrito ainda`, () => {
      // É o estado real de hoje, e o que mais produz divisão por zero e `[0]` de
      // array vazio.
      const vazio = dados();
      vazio.inscritos = [];
      vazio.conferencias = [];
      vazio.pagamentos = [];
      vazio.panorama = {
        inscritos: 0,
        elegiveis: 0,
        aprovados: 0,
        pendentes: 0,
        recusados: 0,
        times: 0,
        vagas: 0,
        sobra: 0,
        caixa: { recebido: 0, estornado: 0, aDevolver: 0, emCaixa: 0, arrecadado: 0, aReceber: 0, isento: 0 },
      };
      const html = renderToStaticMarkup(<Componente {...props({ dados: vazio })} />);
      expect(html.length).toBeGreaterThan(200);
    });

    it(`${nome}: sem NENHUMA permissão, continua renderizando em leitura`, () => {
      const html = renderToStaticMarkup(
        <Componente {...props({ podeConferir: false, podeFinanceiro: false, podeConfigurar: false })} />,
      );
      expect(html.length).toBeGreaterThan(200);
      // O requisito é não oferecer, sem aviso, um controle que vai voltar 403. Vale
      // desabilitar o controle OU dizer que a tela está em leitura — a de Inscritos
      // faz a segunda, porque os controles vivem na ficha, que só existe depois de
      // alguém ser selecionado.
      expect(html).toMatch(/disabled|somente leitura|falta o escopo/i);
    });
  }
});

describe("regras do produto que a tela não pode contrariar", () => {
  it("nenhuma seção escreve 'de 30 vagas' — não existe teto nesta edição", () => {
    for (const { Componente } of SECOES) {
      const html = renderToStaticMarkup(<Componente {...props()} />);
      expect(html).not.toMatch(/de 30 vagas/i);
      expect(html).not.toMatch(/\b6 times\b/i);
    }
  });

  it("nenhuma seção oferece campo para digitar os pontos DE UM JOGADOR", () => {
    // O preço de uma pessoa é derivado do elo no servidor; um campo editável reabriria
    // pela porta dos fundos o que o formulário público fecha.
    //
    // O "orçamento por time" é outra coisa: é o teto do elenco, parâmetro do
    // regulamento que a regra (t) deixa ajustar antes do início. Esse PODE ser
    // editado, e por isso entra na lista de exceções em vez de o teste ser afrouxado.
    const PERMITIDOS = [/orçamento por time/i];

    for (const { nome, Componente } of SECOES) {
      const html = renderToStaticMarkup(<Componente {...props()} />);
      const controles = html.match(/<(input|select|textarea)[^>]*>/gi) ?? [];
      const suspeitos = controles.filter(
        (tag) => /pontos?\b/i.test(tag) && !PERMITIDOS.some((ok) => ok.test(tag)),
      );
      expect(suspeitos, `${nome} oferece campo para editar pontos: ${suspeitos.join(" | ")}`).toHaveLength(0);
    }
  });

  it("Pagamentos mostra o arrecadado, que é o número que vira premiação", () => {
    const html = renderToStaticMarkup(<SecaoPagamentos {...props()} />);
    // arrecadado = 2000 centavos = R$ 20,00
    expect(html).toMatch(/20,00/);
  });

  it("Pagamentos divide o prêmio entre campeão e vice — a organização não fica com nada", () => {
    const html = renderToStaticMarkup(<SecaoPagamentos {...props()} />);
    // A tela dizia "30% ficam com a organização", o contrário do regulamento.
    expect(html).not.toMatch(/ficam? com a organiza/i);
    // 70% de R$ 20,00 = R$ 14,00 para o campeão; o vice leva a diferença, R$ 6,00.
    expect(html).toMatch(/vice/i);
    expect(html).toMatch(/14,00/);
    expect(html).toMatch(/6,00/);
  });

  it("Inscritos aponta quem ainda está sem disponibilidade", () => {
    const html = renderToStaticMarkup(<SecaoInscritos {...props()} />);
    expect(html).toMatch(/sem turno/i);
  });

  it("nenhuma seção cita as regras por letra da 3ª Edição", () => {
    // "regra (w)", "(regra s)", "regras (d) … e (e)" — as três formas que já apareceram.
    for (const { nome, Componente } of SECOES) {
      const html = renderToStaticMarkup(<Componente {...props()} />);
      expect(html, nome).not.toMatch(/regras? \([a-z]\)|\(regras? [a-z]\)/i);
    }
  });

  it("nenhuma seção fala em tempo mínimo de grupo — a regra 1 da 4ª não tem", () => {
    for (const { nome, Componente } of SECOES) {
      const html = renderToStaticMarkup(<Componente {...props()} />);
      expect(html, nome).not.toMatch(/tempo de grupo é contado|mínimo de \d+ dias/i);
    }
  });

  it("Times mostra a divisão derivada, não um número fixo", () => {
    const html = renderToStaticMarkup(<SecaoTimes {...props()} />);
    expect(html).toMatch(/piso|÷|dividid/i);
  });

  /** O texto que a pessoa lê: sem tags e sem os marcadores que o React põe entre pedaços. */
  const texto = (html: string) =>
    html.replace(/<!-- -->/g, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

  it("Times divide os ELEGÍVEIS (pendente conta) e avisa que o draft só sorteia aprovados", () => {
    const lido = texto(renderToStaticMarkup(<SecaoTimes {...props()} />));
    expect(lido).toContain("piso(elegíveis ÷ jogadores por time)");
    expect(lido).toContain("piso(9 ÷ 5)");
    expect(lido).toContain("draft só sorteia aprovados");
  });

  it("o que é definitivo continua só com aprovados: pendente não vira substituto nem entra no congelamento", () => {
    const lido = texto(renderToStaticMarkup(<SecaoTimes {...props()} />));
    // p1, v1 e v2 são pendentes: contam na divisão, mas não aparecem como substituto.
    for (const pendente of ["Jogadorp1", "Jogadorv1", "Jogadorv2"]) {
      expect(lido).not.toContain(pendente);
    }
    expect(lido).toContain("Jogadora1"); // aprovado aparece, então a lista foi mesmo montada
    // 6 aprovados, 1 deles (a4) já congelado.
    expect(lido).toContain("1/6 congelados");
  });

  it("orçamento, elos e rotas são calculados sobre os elegíveis, no próprio cliente", () => {
    // Elegíveis: 8+4+4+1+3+5+2+15+4 = 46 pontos; 1 time = 5 vagas, os 5 mais baratos
    // somam 1+2+3+4+4 = 14. Só com aprovados seria "soma 34 … usa 19".
    const lido = texto(renderToStaticMarkup(<SecaoTimes {...props()} />));
    expect(lido).toContain("O pool inteiro soma 46 pontos; a conta usa 14");
  });

  it("com pendentes, mostra ao lado o que o draft montaria só com os aprovados de hoje", () => {
    // 6 aprovados → 1 time, 5 vagas, 1 de sobra (o que `montarDraftDosAprovados` faria).
    const lido = texto(renderToStaticMarkup(<SecaoTimes {...props()} />));
    expect(lido).toContain("Só com os 6 aprovados de hoje (o que o draft usaria): 1 time, 5 vagas, 1 de sobra");
    expect(lido).toContain("o draft pediria 1 na sobra");
    expect(lido).not.toContain("entram no draft"); // com pendente, Vagas é previsão
  });

  it("a Configuração projeta os times com os elegíveis", () => {
    // distribuirTimes(9, 5): 1 time e 4 de sobra. Com aprovados (6) seria "1 de sobra".
    const lido = texto(renderToStaticMarkup(<SecaoConfiguracao {...props()} />));
    expect(lido).toContain("de 9 elegíveis · 4 de sobra");
  });

  it("elo ilegível num PENDENTE não trava o congelamento — o servidor só congela aprovados", () => {
    const d = dados();
    d.inscritos = d.inscritos.map((i) => (i.id === "p1" ? { ...i, elo_declarado: "Lata" } : i));
    const lido = texto(renderToStaticMarkup(<SecaoTimes {...props({ dados: d })} />));
    expect(lido).toContain("corrija na ficha antes de aprovar");
    expect(lido).not.toContain("Corrija os elos antes de congelar");
  });

  it("elo ilegível num APROVADO trava o congelamento", () => {
    const d = dados();
    d.inscritos = d.inscritos.map((i) => (i.id === "a2" ? { ...i, elo_declarado: "Lata" } : i));
    const lido = texto(renderToStaticMarkup(<SecaoTimes {...props({ dados: d })} />));
    expect(lido).toContain("Corrija os elos antes de congelar");
  });
});
