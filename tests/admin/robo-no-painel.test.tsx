// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { DadosEdicao, Inscrito, Pagamento } from "@/components/admin/e4/painel-edicao";
import { SecaoInscritos } from "@/components/admin/e4/secao-inscritos";
import { SecaoPagamentos } from "@/components/admin/e4/secao-pagamentos";
import { ITENS_CONFERENCIA } from "@/lib/inscricoes/schema";
import { AUTOR_RIOT } from "@/lib/riot/decidir";

/**
 * O robô da Riot e a situação automática, vistos do painel: o que a organização enxerga e
 * o que a gaveta manda gravar.
 */

afterEach(cleanup);

function inscrito(over: Partial<Inscrito> = {}): Inscrito {
  return {
    id: "x1",
    criado_em: "2026-10-05T12:00:00.000Z",
    nick: "Fulano",
    tag: "BR1",
    riot_id: "Fulano#BR1",
    nome_real: "Fulano de Tal",
    email: "fulano@exemplo.com",
    discord: "fulano",
    whatsapp: "(11) 98765-4321",
    elo_declarado: "Ouro",
    elo_verificado: null,
    elo_congelado: null,
    pontos: 4,
    rota_primaria: "MID",
    rota_secundaria: "TOP",
    disponibilidade: ["noite"],
    quer_capitao: false,
    entrou_no_grupo: null,
    situacao: "pendente",
    organizador: false,
    observacao: null,
    ...over,
  };
}

type Item = { estado?: string; conferido_por?: string | null };

function dados(
  lista: Inscrito[],
  itens: Partial<Record<(typeof ITENS_CONFERENCIA)[number], Item>> = {},
  pagamentos: Pagamento[] = [],
): DadosEdicao {
  return {
    config: {
      nome: "4ª Edição",
      abertura_inscricoes: "2026-10-05T12:13:35.000Z",
      fechamento_inscricoes: null,
      prazo_vinculo_riot: null,
      congelamento_elo: null,
      data_draft: null,
      inicio_campeonato: null,
      inscricoes_abertas: true,
      jogadores_por_time: 5,
      orcamento_por_time: 30,
      min_ranqueadas: 5,
      dias_no_grupo: 60,
      prazo_pagamento_dias: 14,
      segundos_por_escolha: 60,
      taxa_centavos: 3000,
      pct_campeao: 70,
      chave_pix: "123e4567-e89b-12d3-a456-426614174000",
      responsavel_financeiro: null,
    },
    inscritos: lista,
    conferencias: lista.flatMap((i) =>
      ITENS_CONFERENCIA.map((item) => ({
        inscricao_id: i.id,
        item,
        estado: (i.id === "x1" ? itens[item]?.estado : undefined) ?? "pendente",
        observacao: null,
        conferido_por: (i.id === "x1" ? itens[item]?.conferido_por : undefined) ?? null,
        conferido_em: null,
      })),
    ),
    pagamentos,
    panorama: {
      inscritos: lista.length,
      elegiveis: lista.length,
      aprovados: 0,
      pendentes: lista.length,
      recusados: 0,
      times: 0,
      vagas: 0,
      sobra: lista.length,
      caixa: { recebido: 0, estornado: 0, aDevolver: 0, emCaixa: 0, arrecadado: 0, aReceber: 0, isento: 0 },
    },
    auditoria: [],
  };
}

function pagamento(over: Partial<Pagamento> = {}): Pagamento {
  return {
    inscricao_id: "x1",
    estado: "aguardando",
    valor_centavos: 3000,
    declarado_em: null,
    conferido_por: null,
    conferido_em: null,
    vence_em: new Date(Date.now() + 2 * 86_400_000).toISOString(),
    observacao: null,
    ...over,
  };
}

const props = (executar: ReturnType<typeof vi.fn>) => ({
  executar: executar as never,
  ocupado: false,
  podeConferir: true,
  podeFinanceiro: true,
  podeConfigurar: true,
});

function abrir(lista: Inscrito[], itens: Parameters<typeof dados>[1] = {}, pagamentos: Pagamento[] = []) {
  const executar = vi.fn(async () => true);
  render(<SecaoInscritos {...props(executar)} dados={dados(lista, itens, pagamentos)} />);
  fireEvent.click(screen.getAllByRole("button", { name: /Fulano/ })[0]!);
  return executar;
}

const gaveta = () => screen.getByRole("dialog");
const aba = (nome: string) => fireEvent.click(within(gaveta()).getByRole("tab", { name: new RegExp(`^${nome}`) }));
const salvarTudo = () => fireEvent.click(within(gaveta()).getByRole("button", { name: "Salvar tudo" }));

function marcar(grupo: string, rotulo: string) {
  fireEvent.click(within(screen.getByRole("radiogroup", { name: grupo })).getByRole("radio", { name: new RegExp(`^(✓ )?${rotulo}$`) }));
}
function marcado(grupo: string) {
  return within(screen.getByRole("radiogroup", { name: grupo }))
    .getAllByRole("radio")
    .find((r) => r.getAttribute("aria-checked") === "true")
    ?.textContent?.replace(/^✓ /, "");
}

describe("elo: automático pela Riot ou travado à mão", () => {
  it("elo vindo da Riot aparece como «automático»; escolher um elo trava", () => {
    const executar = abrir([inscrito({ elo_verificado: "Diamante", elo_fonte: "riot", elo_riot: "Diamante", pontos: 8 })]);
    aba("Ficha");
    const select = within(gaveta()).getByLabelText("Elo verificado") as HTMLSelectElement;
    expect(select.value).toBe("");
    expect(select.options[0]!.textContent).toMatch(/automático \(Riot\)/);

    fireEvent.change(select, { target: { value: "Mestre" } });
    salvarTudo();
    expect(executar).toHaveBeenCalledWith("inscrito", { inscricaoId: "x1", ficha: { eloVerificado: "Mestre" } });
  });

  it("travado: aparece o elo travado; voltar ao automático manda nulo", () => {
    const executar = abrir([inscrito({ elo_verificado: "Ouro", elo_fonte: "organizacao", elo_riot: "Prata" })]);
    aba("Ficha");
    const select = within(gaveta()).getByLabelText("Elo verificado") as HTMLSelectElement;
    expect(select.value).toBe("Ouro");
    expect(within(gaveta()).getByText(/Travado à mão — a Riot mostra Prata/)).toBeTruthy();

    fireEvent.change(select, { target: { value: "" } });
    salvarTudo();
    expect(executar).toHaveBeenCalledWith("inscrito", { inscricaoId: "x1", ficha: { eloVerificado: null } });
  });

  it("elo gravado à mão ANTES do robô (sem fonte) conta como automático — o robô vai segui-lo", () => {
    abrir([inscrito({ elo_verificado: "Ouro", elo_fonte: null })]);
    aba("Ficha");
    expect((within(gaveta()).getByLabelText("Elo verificado") as HTMLSelectElement).value).toBe("");
  });
});

describe("requisitos do robô", () => {
  it("mostra «Riot (robô)» como quem conferiu", () => {
    abrir([inscrito()], { m: { estado: "ok", conferido_por: AUTOR_RIOT } });
    expect(within(gaveta()).getAllByText(/Riot \(robô\)/).length).toBeGreaterThan(0);
  });

  it("o atalho «Pendentes → Cumpre» pula o pendente que é do robô — não afirma o contrário da Riot", () => {
    const executar = abrir([inscrito()], { d: { estado: "pendente", conferido_por: AUTOR_RIOT } });
    fireEvent.click(within(gaveta()).getByRole("button", { name: /Pendentes → Cumpre/ }));
    expect(marcado("Estado do item D")).toBe("Pendente");
    salvarTudo();
    const corpo = (executar.mock.calls[0] as unknown[])[1] as { conferencias: { item: string }[] };
    expect(corpo.conferencias.map((c) => c.item)).not.toContain("d");
  });

  it("apto que ganha requisito ruim: a tela avisa que a situação continua Apta", () => {
    abrir([inscrito({ situacao: "apto" })], Object.fromEntries(ITENS_CONFERENCIA.map((i) => [i, { estado: "ok" }])));
    expect(within(gaveta()).queryByText(/continua/)).toBeNull();
    marcar("Estado do item F", "Não cumpre");
    expect(within(gaveta()).getByRole("alert").textContent).toMatch(/continua\s+Apto/);
  });

  it("pendente segurado pela organização: a tela diz que o sistema não promove", () => {
    abrir([inscrito({ promocao_automatica: false })]);
    expect(within(gaveta()).getByText(/não promove este inscrito a Apto sozinho/)).toBeTruthy();
  });
});

describe("pontos de atenção na lista", () => {
  it("troca de Riot ID vira um ⚠ na linha e um aviso na gaveta", () => {
    abrir([inscrito({ riot_id_atual: "OutroNome#BR1" })]);
    expect(within(gaveta()).getByText(/Trocou de Riot ID/)).toBeTruthy();
    expect(screen.getAllByText("⚠ 1").length).toBe(1);
  });
});

describe("caixa sem provedor", () => {
  it("«Cobrar no WhatsApp» leva a mensagem pronta para o número do jogador", async () => {
    render(<SecaoPagamentos {...props(vi.fn(async () => true))} dados={dados([inscrito()], {}, [pagamento()])} />);
    const link = (await waitFor(() => screen.getByRole("link", { name: /Cobrar no WhatsApp/ }))) as HTMLAnchorElement;
    expect(link.href).toMatch(/^https:\/\/wa\.me\/5511987654321\?text=/);
    expect(decodeURIComponent(link.href)).toContain("Oi, Fulano!");
    expect(link.rel).toContain("noopener");
  });

  it("recusado que não pagou: fora da cobrança, sem link de cobrar", async () => {
    render(
      <SecaoPagamentos
        {...props(vi.fn(async () => true))}
        dados={dados([inscrito({ situacao: "recusado" })], {}, [pagamento()])}
      />,
    );
    await waitFor(() => screen.getByText(/Nenhum prazo estourando/));
    expect(screen.queryByRole("link", { name: /Cobrar no WhatsApp/ })).toBeNull();
    expect(screen.getByText("fora — não cobrar")).toBeTruthy();
  });

  it("organizador sendo cobrado: um clique isenta (pela ação de pagamento de sempre)", async () => {
    const executar = vi.fn(async () => true);
    render(<SecaoPagamentos {...props(executar)} dados={dados([inscrito({ organizador: true })], {}, [pagamento()])} />);
    fireEvent.click(await waitFor(() => screen.getByRole("button", { name: "Isentar" })));
    expect(executar).toHaveBeenCalledWith("pagamento", { inscricaoId: "x1", estado: "isento", observacao: undefined });
  });
});
