// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PainelEdicao, type Conferencia, type DadosEdicao, type Inscrito } from "@/components/admin/e4/painel-edicao";
import { SecaoInscritos } from "@/components/admin/e4/secao-inscritos";
import { ITENS_CONFERENCIA } from "@/lib/inscricoes/schema";
import { AUTOR_RIOT } from "@/lib/riot/decidir";

/**
 * A gaveta do inscrito e o que ela manda gravar — os defeitos da auditoria do painel da 4ª:
 *
 * - o atalho «Pendentes → Cumpre» gravava o (E) intocado como «não avaliável» com o nome do
 *   organizador, e isso tirava o item do robô da Riot (regra 4 sem contagem);
 * - a gaveta gravava sem dizer o que tinha visto: uma tela velha desfazia a decisão de outro;
 * - «Vira Apto sozinho» aparecia para quem o servidor ia SEGURAR;
 * - a resposta do «atualizar da Riot» ficava atrás da gaveta;
 * - a «Observação da ficha» não avisava que o jogador a lê;
 * - a conta da Riot repetida (mesmo PUUID) não acendia alerta nenhum.
 */

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const ID = "3f2504e0-4f89-11d3-9a0c-0305e82c3301";

function inscrito(over: Partial<Inscrito> = {}): Inscrito {
  return {
    id: ID,
    criado_em: "2026-10-05T12:00:00.000Z",
    nick: "Fulano",
    tag: "BR1",
    riot_id: "Fulano#BR1",
    nome_real: "Fulano de Tal",
    email: "fulano@exemplo.com",
    discord: "fulano",
    whatsapp: null,
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
    promocao_automatica: true,
    ...over,
  };
}

type Item = Partial<Pick<Conferencia, "estado" | "conferido_por" | "observacao">>;

function conferencias(id: string, por: Partial<Record<(typeof ITENS_CONFERENCIA)[number], Item>> = {}): Conferencia[] {
  return ITENS_CONFERENCIA.map((item) => ({
    inscricao_id: id,
    item,
    estado: por[item]?.estado ?? "pendente",
    observacao: por[item]?.observacao ?? null,
    conferido_por: por[item]?.conferido_por ?? null,
    conferido_em: por[item]?.conferido_por ? "2026-10-21T09:00:00.000Z" : null,
  }));
}

function dados(args: { inscritos?: Inscrito[]; conferencias?: Conferencia[]; inicio?: string | null } = {}): DadosEdicao {
  const lista = args.inscritos ?? [inscrito()];
  return {
    config: {
      nome: "4ª Edição",
      abertura_inscricoes: "2026-10-05T12:13:35.000Z",
      fechamento_inscricoes: null,
      prazo_vinculo_riot: null,
      congelamento_elo: null,
      data_draft: null,
      inicio_campeonato: args.inicio ?? null,
      inscricoes_abertas: true,
      jogadores_por_time: 5,
      max_times: 6,
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
    inscritos: lista,
    conferencias: args.conferencias ?? lista.flatMap((i) => conferencias(i.id)),
    pagamentos: [],
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

function montar(d: DadosEdicao, executar = vi.fn(async () => true)) {
  const tela = render(
    <SecaoInscritos dados={d} executar={executar as never} ocupado={false} podeConferir podeFinanceiro podeConfigurar />,
  );
  return { ...tela, executar };
}

const abrir = (nick = "Fulano") => fireEvent.click(screen.getAllByRole("button", { name: new RegExp(nick) })[0]!);
const gaveta = () => screen.getByRole("dialog");
const salvarTudo = () => fireEvent.click(within(gaveta()).getByRole("button", { name: "Salvar tudo" }));
const atalho = () => fireEvent.click(within(gaveta()).getByRole("button", { name: /Pendentes → Cumpre/ }));
const aba = (nome: string) => fireEvent.click(within(gaveta()).getByRole("tab", { name: new RegExp(`^${nome}`) }));

function marcado(grupo: string) {
  return within(screen.getByRole("radiogroup", { name: grupo }))
    .getAllByRole("radio")
    .find((r) => r.getAttribute("aria-checked") === "true")
    ?.textContent?.replace(/^✓ /, "");
}

function marcar(grupo: string, rotulo: string) {
  const radios = within(screen.getByRole("radiogroup", { name: grupo }));
  fireEvent.click(radios.getByRole("radio", { name: new RegExp(`^(✓ )?${rotulo}$`) }));
}

type Corpo = {
  conferencias?: { item: string; estado?: string; estadoAnterior?: string }[];
  ficha?: Record<string, unknown>;
};
const corpoDe = (executar: ReturnType<typeof vi.fn>) => (executar.mock.calls[0] as unknown[])[1] as Corpo;

const DIA = 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------- P4A-01 / RIOT-01

describe("atalho «Pendentes → Cumpre» e o (E), que é do robô", () => {
  it("sem data de início, o atalho NÃO grava o (E): ele continua intocado, para o robô contar", async () => {
    // O estado real de hoje: o robô já gravou (D) e (M); (A), (B), (F) e (E) intocados.
    const d = dados({
      conferencias: conferencias(ID, {
        d: { estado: "ok", conferido_por: AUTOR_RIOT },
        m: { estado: "ok", conferido_por: AUTOR_RIOT },
      }),
    });
    const { executar } = montar(d);
    abrir();
    atalho();
    expect(marcado("Estado do item E")).toBe("Pendente");
    await act(async () => salvarTudo());

    const itens = (corpoDe(executar).conferencias ?? []).map((c) => c.item);
    expect(itens).toEqual(["a", "b", "f"]);
    expect(itens).not.toContain("e");
  });

  it("com o início marcado mas a janela fechada, o (E) também fica de fora", async () => {
    const { executar } = montar(dados({ inicio: new Date(Date.now() + 30 * DIA).toISOString() }));
    abrir();
    atalho();
    expect(marcado("Estado do item E")).toBe("Pendente");
    expect(within(gaveta()).getByText(/\(E\) fica fora do atalho/)).toBeTruthy();
    await act(async () => salvarTudo());
    expect((corpoDe(executar).conferencias ?? []).map((c) => c.item)).not.toContain("e");
  });

  it("só o (E) sem base pendente: o atalho fica desligado (não há o que marcar)", () => {
    montar(
      dados({
        conferencias: conferencias(ID, Object.fromEntries(["a", "b", "d", "f", "m"].map((i) => [i, { estado: "ok", conferido_por: "lucas" }]))),
      }),
    );
    abrir();
    expect((within(gaveta()).getByRole("button", { name: /Pendentes → Cumpre/ }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("o aviso «tira o item do robô» aparece também no item do robô ainda intocado — e só nos do robô", () => {
    montar(dados());
    abrir();
    const secaoDo = (letra: string) => screen.getByRole("radiogroup", { name: `Estado do item ${letra}` }).closest("section")!;
    for (const letra of ["D", "E", "M"]) {
      expect(within(secaoDo(letra)).getByText(/tira o item do robô/)).toBeTruthy();
    }
    for (const letra of ["A", "B", "F"]) {
      expect(within(secaoDo(letra)).queryByText(/robô/)).toBeNull();
    }
  });

  it("o (E) «não avaliável» SEM observação que o atalho antigo gravou continua mostrado como do robô", () => {
    montar(dados({ conferencias: conferencias(ID, { e: { estado: "nao_avaliavel", conferido_por: "lucas" } }) }));
    abrir();
    const secaoE = screen.getByRole("radiogroup", { name: "Estado do item E" }).closest("section")!;
    expect(within(secaoE).getByText(/tira o item do robô/)).toBeTruthy();
  });

  it("«só quem tem pendência» não conta o (E) que ainda não dá para medir", () => {
    const resolvido = inscrito({ id: "x2", nick: "Resolvido", riot_id: "Resolvido#BR1" });
    const d = dados({
      inscritos: [inscrito(), resolvido],
      conferencias: [
        ...conferencias(ID),
        // Tudo resolvido; o (E) segue pendente esperando a janela (inicio nulo).
        ...conferencias("x2", Object.fromEntries(["a", "b", "d", "f", "m"].map((i) => [i, { estado: "ok", conferido_por: "lucas" }]))),
      ],
    });
    montar(d);
    fireEvent.click(screen.getByLabelText(/Só quem tem algum requisito pendente/));
    expect(screen.getAllByRole("button", { name: /Fulano/ }).length).toBeGreaterThan(0);
    expect(screen.queryAllByRole("button", { name: /Resolvido/ })).toHaveLength(0);
  });
});

// ---------------------------------------------------------------- P4A-03

describe("a gaveta diz ao servidor o que viu (trava otimista)", () => {
  it("cada requisito leva o estado que a tela carregou; a ficha leva a situação", async () => {
    // A tela carregou (A) pendente. Se outra pessoa recusou o (A) depois, o servidor compara
    // com este «pendente» e responde 409 em vez de devolver o (A) a «ok».
    const { executar } = montar(dados({ conferencias: conferencias(ID, { b: { estado: "risco", conferido_por: "ana" } }) }));
    abrir();
    marcar("Estado do item A", "Cumpre");
    marcar("Estado do item B", "Cumpre");
    marcar("Situação do inscrito", "Recusado");
    await act(async () => salvarTudo());

    expect(corpoDe(executar)).toEqual({
      inscricaoId: ID,
      conferencias: [
        { item: "a", estado: "ok", estadoAnterior: "pendente" },
        { item: "b", estado: "ok", estadoAnterior: "risco" },
      ],
      ficha: { situacao: "recusado", situacaoAnterior: "pendente" },
    });
  });

  it("409 de conflito no «Salvar tudo»: a tela recarrega e o motivo aparece dentro da gaveta", async () => {
    let leituras = 0;
    const conflito = "O requisito (A) mudou desde que você abriu a ficha (outra pessoa ou o robô da Riot gravou antes).";
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init?: { method?: string }) => {
        if (init?.method === "PATCH") {
          return { ok: false, status: 409, json: async () => ({ error: conflito, conflito: true }) };
        }
        leituras += 1;
        return { ok: true, status: 200, json: async () => dados() };
      }),
    );
    render(
      <PainelEdicao
        secao="inscritos"
        onAlert={vi.fn()}
        podeConferir
        podeFinanceiro
        podeConfigurar
        render={(p) => <SecaoInscritos {...p} />}
      />,
    );
    fireEvent.click((await screen.findAllByRole("button", { name: /Fulano/ }))[0]!);
    marcar("Estado do item A", "Cumpre");
    await act(async () => salvarTudo());
    await waitFor(() => expect(within(gaveta()).getByRole("alert").textContent).toContain("mudou desde que você abriu"));
    expect(leituras).toBe(2);
  });
});

// ---------------------------------------------------------------- P4A-05

describe("Apto → Pendente na gaveta", () => {
  it("avisa que, ao salvar, a pessoa fica SEGURADA — e não promete «Vira Apto sozinho»", () => {
    montar(dados({ inscritos: [inscrito({ situacao: "apto" })] }));
    abrir();
    marcar("Situação do inscrito", "Pendente");
    expect(within(gaveta()).queryByText(/Vira Apto sozinho/)).toBeNull();
    expect(within(gaveta()).getByText(/Ao salvar, fica segurado/)).toBeTruthy();
  });

  it("Sobra → Pendente também segura", () => {
    montar(dados({ inscritos: [inscrito({ situacao: "sobra" })] }));
    abrir();
    marcar("Situação do inscrito", "Pendente");
    expect(within(gaveta()).getByText(/Ao salvar, fica segurado/)).toBeTruthy();
  });

  it("Recusado → Pendente SOLTA (o servidor religa a promoção): aí «Vira Apto sozinho» é verdade", () => {
    montar(dados({ inscritos: [inscrito({ situacao: "recusado", promocao_automatica: false })] }));
    abrir();
    marcar("Situação do inscrito", "Pendente");
    expect(within(gaveta()).getByText(/Vira Apto sozinho/)).toBeTruthy();
    expect(within(gaveta()).queryByText(/segurado/i)).toBeNull();
  });
});

// ---------------------------------------------------------------- P4A-06 (gaveta)

describe("«atualizar da Riot» de dentro da gaveta", () => {
  const montarPainel = (patch: { status: number; corpo: unknown }) => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init?: { method?: string }) => {
        if (init?.method === "PATCH") return { ok: patch.status < 400, status: patch.status, json: async () => patch.corpo };
        return { ok: true, status: 200, json: async () => dados() };
      }),
    );
    render(
      <PainelEdicao
        secao="inscritos"
        onAlert={vi.fn()}
        podeConferir
        podeFinanceiro
        podeConfigurar
        render={(p) => <SecaoInscritos {...p} />}
      />,
    );
  };

  it("falha (500): o motivo aparece dentro da gaveta", async () => {
    montarPainel({ status: 500, corpo: { error: "Falha ao falar com a Riot XYZ" } });
    fireEvent.click((await screen.findAllByRole("button", { name: /Fulano/ }))[0]!);
    await act(async () => fireEvent.click(within(gaveta()).getByRole("button", { name: "atualizar da Riot" })));
    await waitFor(() => expect(within(gaveta()).getByRole("alert").textContent).toContain("Falha ao falar com a Riot XYZ"));
  });

  it("«Outra atualização está rodando» (200 com texto): aparece dentro da gaveta", async () => {
    montarPainel({
      status: 200,
      corpo: { ok: true, mensagem: "Outra atualização da Riot está rodando agora. Tente de novo em instantes." },
    });
    fireEvent.click((await screen.findAllByRole("button", { name: /Fulano/ }))[0]!);
    await act(async () => fireEvent.click(within(gaveta()).getByRole("button", { name: "atualizar da Riot" })));
    await waitFor(() => expect(within(gaveta()).getByRole("status").textContent).toMatch(/Outra atualização/));
  });
});

// ---------------------------------------------------------------- INS-05 / SEG-04

describe("«Observação da ficha»", () => {
  it("avisa, junto do campo, que o jogador lê o texto em «Minha inscrição»", () => {
    montar(dados());
    abrir();
    aba("Ficha");
    const campo = screen.getByLabelText("Observação da ficha");
    expect(campo.closest("label")!.textContent).toMatch(/O jogador lê esta observação em «Minha inscrição»/);
  });
});

// ---------------------------------------------------------------- RIOT-05

describe("a mesma conta da Riot em duas inscrições", () => {
  it("acende o ponto de atenção nas duas, com o Riot ID da outra", () => {
    const a = inscrito({ puuid: "PUUID-1", nick: "SAMUEL VENANCIO", tag: "MC97", riot_id: "SAMUEL VENANCIO#MC97" });
    const b = inscrito({
      id: "x2",
      puuid: "PUUID-1",
      nick: "SAMUEL VENÂNCIO",
      tag: "MC97",
      riot_id: "SAMUEL VENÂNCIO#MC97",
      email: "outro@exemplo.com",
    });
    montar(dados({ inscritos: [a, b] }));
    expect(screen.getAllByText(/⚠/)).toHaveLength(2);
    abrir("SAMUEL VENANCIO");
    expect(within(gaveta()).getByText(/A mesma conta da Riot está em outra inscrição: SAMUEL VENÂNCIO#MC97/)).toBeTruthy();
  });
});
