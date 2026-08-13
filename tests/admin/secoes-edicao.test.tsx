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
      aprovados: 6,
      pendentes: 1,
      recusados: 1,
      times: 1,
      vagas: 5,
      sobra: 1,
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

  it("Times mostra a divisão derivada, não um número fixo", () => {
    const html = renderToStaticMarkup(<SecaoTimes {...props()} />);
    expect(html).toMatch(/piso|÷|dividid/i);
  });
});
