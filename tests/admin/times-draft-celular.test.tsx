// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { DadosEdicao, Inscrito } from "@/components/admin/e4/painel-edicao";
import { SecaoDraft } from "@/components/admin/e4/secao-draft";
import { SecaoTimes } from "@/components/admin/e4/secao-times";
import { ModoCompacto } from "@/components/admin/responsivo";
import type { DraftPublico, PreviaDoDraft } from "@/lib/draft/store";

/**
 * Times e vagas + Draft ao vivo no CELULAR (`ModoCompacto`).
 *
 * Os outros testes destas telas renderizam sem o provedor, no arranjo de mesa. Este
 * exercita o de bolso: nenhuma tabela larga, elo pelo emblema, e a escolha pelo time da
 * vez feita com o polegar — cartão do pool, folha de confirmação e a vez lida no toque
 * indo no pedido, como o `window.confirm` do monitor.
 */

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

// ---------------------------------------------------------------- Times e vagas

function inscrito(over: Partial<Inscrito> & { id: string }): Inscrito {
  return {
    criado_em: "2026-10-05T12:00:00.000Z",
    nick: `N${over.id}`,
    tag: "BR1",
    riot_id: `N${over.id}#BR1`,
    nome_real: null,
    email: `${over.id}@exemplo.com`,
    discord: over.id,
    whatsapp: null,
    elo_declarado: "Prata",
    elo_verificado: null,
    elo_congelado: null,
    pontos: 3,
    rota_primaria: "MID",
    rota_secundaria: "TOP",
    disponibilidade: ["noite"],
    quer_capitao: false,
    entrou_no_grupo: null,
    situacao: "apto",
    organizador: false,
    observacao: null,
    ...over,
  };
}

function dadosDaEdicao(inscritos: Inscrito[]): DadosEdicao {
  return {
    config: {
      nome: "4ª Edição",
      abertura_inscricoes: null,
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
      chave_pix: null,
      responsavel_financeiro: null,
    },
    inscritos,
    conferencias: [],
    pagamentos: [],
    panorama: {
      inscritos: inscritos.length,
      elegiveis: inscritos.length,
      aprovados: inscritos.length,
      pendentes: 0,
      recusados: 0,
      times: 0,
      vagas: 0,
      sobra: inscritos.length,
      caixa: { recebido: 0, estornado: 0, aDevolver: 0, emCaixa: 0, arrecadado: 0, aReceber: 0, isento: 0 },
    },
    auditoria: [],
  };
}

describe("Times e vagas no celular", () => {
  it("as quatro tabelas viram cartões, com o emblema do elo no lugar do nome", () => {
    const executar = vi.fn(async () => true);
    render(
      <ModoCompacto ativo>
        <SecaoTimes
          dados={dadosDaEdicao([
            inscrito({ id: "alvo", elo_declarado: "Prata", pontos: 3 }),
            inscrito({ id: "reserva", elo_declarado: "Bronze", pontos: 2, situacao: "sobra", rota_primaria: "SUP" }),
          ])}
          executar={executar}
          ocupado={false}
          podeConferir
          podeFinanceiro
          podeConfigurar
        />
      </ModoCompacto>,
    );
    fireEvent.change(screen.getByLabelText("Jogador a substituir"), { target: { value: "alvo" } });

    // Distribuição, sobra, substitutos e rotas: nenhuma tabela larga no telefone.
    expect(document.querySelector("table")).toBeNull();
    // O elo sai pelo emblema (o nome vira o alt), e o substituto aparece como cartão.
    expect(screen.getAllByAltText("Bronze").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Nreserva").length).toBeGreaterThan(0);
    expect(screen.getByText("na sobra")).toBeTruthy();

    // O botão da sobra ocupa o cartão e continua chamando a mesma ação — com a situação que a
    // tela via, para o servidor recusar (409) se outra pessoa mudou antes.
    fireEvent.click(screen.getByRole("button", { name: "Voltar para apto" }));
    expect(executar).toHaveBeenCalledWith("ficha", { inscricaoId: "reserva", situacao: "apto", situacaoAnterior: "sobra" });
  });
});

// ---------------------------------------------------------------- Draft ao vivo

function previa(over: Partial<PreviaDoDraft> = {}): PreviaDoDraft {
  return {
    config: { jogadoresPorTime: 5, maxTimes: 6, orcamentoPorTime: 30, segundosPorEscolha: 60 },
    times: 6,
    vagas: 30,
    aprovados: 30,
    aptos: 30,
    sobra: 0,
    pendentes: 0,
    impedimentos: [],
    totalDePontos: 170,
    orcamentoSugerido: 30,
    jogadores: [
      { id: "a", riotId: "Luiz#BR1", elo: "Diamante", forca: "Diamante I · 14 PDL", pontos: 8, rota1: "TOP", rota2: "MID", organizador: false, temConta: true },
      { id: "n", riotId: "nak4y#JPN", elo: "Mestre", forca: "Mestre · 210 PDL", pontos: 10, rota1: "MID", rota2: "TOP", organizador: true, temConta: true },
    ],
    capitaesPelaRegra: ["a"],
    empateNoCorte: null,
    faltamCapitaes: 0,
    semEloCongelado: [],
    inscricoesAbertas: false,
    ...over,
  };
}

function draftNoAr(over: Partial<DraftPublico> = {}): DraftPublico {
  return {
    revisao: 3,
    fase: "rodando",
    times: [{ id: "time-1", nome: "CHAMA", cor: "#ef7d34", capitaoRiotId: "Luiz#BR1", gasto: 8, vagas: 4 }],
    elencos: { "time-1": [{ riotId: "Luiz#BR1", pontos: 8, rota1: "TOP", rota2: "MID", elo: "Diamante", capitao: true }] },
    disponiveis: [
      { id: "p1", riotId: "Barato#BR1", pontos: 3, rota1: "SUP", rota2: "ADC", elo: "Prata" },
      { id: "p2", riotId: "Caro#BR1", pontos: 10, rota1: "MID", rota2: "TOP", elo: "Mestre" },
    ],
    escolhaAtual: 0,
    totalEscolhas: 4,
    timeDaVezId: "time-1",
    escolhiveis: ["p1"],
    prazoISO: new Date(Date.now() + 60_000).toISOString(),
    motivoDaPausa: null,
    sorteioId: "abc",
    orcamentoPorTime: 30,
    jogadoresPorTime: 5,
    historico: [],
    ...over,
  };
}

function responder(draft: DraftPublico) {
  const corpo = { draft, sorteio: { semente: "abc", capitaes: ["a"], emISO: new Date().toISOString() }, semSaida: null, previa: previa() };
  const fetchFalso = vi.fn<typeof fetch>(async () => new Response(JSON.stringify(corpo), { status: 200 }));
  vi.stubGlobal("fetch", fetchFalso);
  return fetchFalso;
}

function montarDraft() {
  render(
    <ModoCompacto ativo>
      <SecaoDraft onAlert={vi.fn()} podeConduzir onDatasetMudou={vi.fn()} />
    </ModoCompacto>,
  );
}

describe("Draft ao vivo no celular", () => {
  it("a mesa sobe para o topo e o pool vira cartões: só quem o motor aceita é tocável", async () => {
    responder(draftNoAr());
    montarDraft();

    const barato = await screen.findByRole("button", { name: "Escolher Barato#BR1 para CHAMA" });
    expect(screen.queryByRole("button", { name: "Escolher Caro#BR1 para CHAMA" })).toBeNull();
    // Nada de tabela de 640px nem do <select> de jogador do monitor.
    expect(document.querySelector("table")).toBeNull();
    expect(screen.queryByLabelText("Jogador a escolher")).toBeNull();
    // Elo pelo emblema.
    expect(screen.getAllByAltText("Prata").length).toBeGreaterThan(0);
    // O pool vem antes da conferência: quem conduz pelo telefone não rola até ele.
    const conferencia = screen.getByText("1 · Conferência antes do sorteio");
    expect(barato.compareDocumentPosition(conferencia) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("buscar alguém que não cabe mostra o porquê, sem deixar escolher", async () => {
    responder(draftNoAr());
    montarDraft();
    fireEvent.change(await screen.findByLabelText("Buscar jogador no pool"), { target: { value: "caro" } });

    expect(screen.getByText("não cabe agora")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Escolher Caro#BR1 para CHAMA" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Escolher Barato#BR1 para CHAMA" })).toBeNull();
  });

  it("tocar abre a folha com o orçamento depois da escolha; confirmar manda a vez lida no toque", async () => {
    const fetchFalso = responder(draftNoAr());
    montarDraft();
    fireEvent.click(await screen.findByRole("button", { name: "Escolher Barato#BR1 para CHAMA" }));

    const folha = await screen.findByRole("dialog");
    expect(within(folha).getByRole("heading", { name: "Escolher para CHAMA" })).toBeTruthy();
    expect(folha.textContent).toContain("8 → 11 de 30 pts");

    fireEvent.click(within(folha).getByRole("button", { name: "Escolher para CHAMA" }));
    await waitFor(() => {
      const post = fetchFalso.mock.calls.find((c) => c[1]?.method === "POST");
      expect(post).toBeTruthy();
      expect(JSON.parse(String(post![1]!.body))).toEqual({
        acao: "escolher",
        jogadorId: "p1",
        timeId: "time-1",
        escolha: 0,
      });
    });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("se a vez virar com a folha aberta, ela avisa e não deixa confirmar", async () => {
    const painel = { draft: draftNoAr(), sorteio: null, semSaida: null, previa: previa() };
    // A sondagem pública (a cada 2,5 s) traz a escolha seguinte — o relógio virou.
    const virada = { draft: draftNoAr({ revisao: 4, escolhaAtual: 1 }), agoraServidorISO: new Date().toISOString() };
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(async (url) =>
        new Response(JSON.stringify(String(url).includes("/api/draft/estado") ? virada : painel), { status: 200 }),
      ),
    );
    montarDraft();
    fireEvent.click(await screen.findByRole("button", { name: "Escolher Barato#BR1 para CHAMA" }));
    const folha = await screen.findByRole("dialog");

    await within(folha).findByText(/A vez virou/, undefined, { timeout: 6000 });
    const confirmar = within(folha).getByRole("button", { name: "Escolher para CHAMA" }) as HTMLButtonElement;
    expect(confirmar.disabled).toBe(true);
  }, 10_000);

  it("pausado, os cartões não abrem a folha e a tela diz por quê", async () => {
    responder(draftNoAr({ fase: "pausado", motivoDaPausa: "organizacao" }));
    montarDraft();
    await screen.findByText("Escolher pelo CHAMA");

    expect(screen.queryByRole("button", { name: "Escolher Barato#BR1 para CHAMA" })).toBeNull();
    expect(screen.getByText(/Draft pausado: retome para escolher por aqui/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Retomar" })).toBeTruthy();
  });
});
