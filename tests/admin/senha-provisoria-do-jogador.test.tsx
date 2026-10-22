// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AdminDashboardClient } from "@/components/admin/admin-dashboard-client";
import type { DadosEdicao, Inscrito } from "@/components/admin/e4/painel-edicao";
import { SecaoInscritos } from "@/components/admin/e4/secao-inscritos";
import { ITENS_CONFERENCIA } from "@/lib/inscricoes/schema";

/**
 * «Gerar senha provisória» na gaveta do inscrito (aba Contato) — a recuperação de senha do
 * jogador, que não tinha caminho nenhum: o site não manda e-mail, e a organização não tinha
 * ferramenta. A rota é `POST /api/admin/jogadores/senha` (só a master).
 *
 * O que se prova: só a master vê; pede confirmação; manda o id da CONTA (não o da inscrição);
 * mostra a senha uma vez, com botão de copiar; e ela some ao sair da aba.
 */

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const CONTA = "9b2c6d1e-1111-4222-8333-944455556666";

function inscrito(over: Partial<Inscrito> = {}): Inscrito {
  return {
    id: "3f2504e0-4f89-11d3-9a0c-0305e82c3301",
    jogador_id: CONTA,
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
    ...over,
  };
}

function dados(i: Inscrito = inscrito()): DadosEdicao {
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
      taxa_centavos: 2000,
      pct_campeao: 70,
      chave_pix: null,
      responsavel_financeiro: null,
    },
    inscritos: [i],
    conferencias: ITENS_CONFERENCIA.map((item) => ({
      inscricao_id: i.id,
      item,
      estado: "pendente",
      observacao: null,
      conferido_por: null,
      conferido_em: null,
    })),
    pagamentos: [],
    panorama: {
      inscritos: 1,
      elegiveis: 1,
      aprovados: 0,
      pendentes: 1,
      recusados: 0,
      times: 0,
      vagas: 0,
      sobra: 1,
      caixa: { recebido: 0, estornado: 0, aDevolver: 0, emCaixa: 0, arrecadado: 0, aReceber: 0, isento: 0 },
    },
    auditoria: [],
  };
}

function abrirContato(opcoes: { master: boolean; i?: Inscrito }) {
  render(
    <SecaoInscritos
      dados={dados(opcoes.i)}
      executar={vi.fn(async () => true) as never}
      ocupado={false}
      podeConferir
      podeFinanceiro
      podeConfigurar
      podeRedefinirSenha={opcoes.master}
    />,
  );
  fireEvent.click(screen.getAllByRole("button", { name: /Fulano/ })[0]!);
  fireEvent.click(within(screen.getByRole("dialog")).getByRole("tab", { name: /^Contato/ }));
}

const gaveta = () => screen.getByRole("dialog");

function servidor(resposta: { status: number; corpo: unknown }) {
  const fetch = vi.fn(async () => ({ ok: resposta.status < 400, status: resposta.status, json: async () => resposta.corpo }));
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

describe("«Gerar senha provisória»", () => {
  it("quem não é a master não vê o bloco", () => {
    abrirContato({ master: false });
    expect(within(gaveta()).queryByRole("button", { name: "Gerar senha provisória" })).toBeNull();
  });

  it("a master confirma, a rota recebe o id da CONTA, e a senha aparece com botão de copiar", async () => {
    const fetch = servidor({
      status: 200,
      corpo: { ok: true, conta: { id: CONTA, email: "fulano@exemplo.com", nome: "Fulano" }, senhaProvisoria: "abcd-efgh-jkmn" },
    });
    let copiada = "";
    vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText: async (t: string) => void (copiada = t) } });

    abrirContato({ master: true });
    fireEvent.click(within(gaveta()).getByRole("button", { name: "Gerar senha provisória" }));
    // Primeiro clique só arma: nada foi pedido ao servidor ainda.
    expect(fetch).not.toHaveBeenCalled();
    expect(within(gaveta()).getByText(/sessões abertas\s+caem na hora/)).toBeTruthy();

    await act(async () => fireEvent.click(within(gaveta()).getByRole("button", { name: "Confirmar: gerar senha" })));
    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = fetch.mock.calls[0] as unknown as [string, { method: string; body: string }];
    expect(url).toBe("/api/admin/jogadores/senha");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({ id: CONTA });

    await waitFor(() => expect(within(gaveta()).getByText("abcd-efgh-jkmn")).toBeTruthy());
    expect(within(gaveta()).getByText(/PRIVADO do jogador/)).toBeTruthy();
    await act(async () => fireEvent.click(within(gaveta()).getByRole("button", { name: "Copiar" })));
    expect(copiada).toBe("abcd-efgh-jkmn");
  });

  it("a senha aparece UMA vez: trocar de aba e voltar não a mostra de novo", async () => {
    servidor({ status: 200, corpo: { ok: true, conta: { id: CONTA, email: null, nome: null }, senhaProvisoria: "abcd-efgh-jkmn" } });
    abrirContato({ master: true });
    fireEvent.click(within(gaveta()).getByRole("button", { name: "Gerar senha provisória" }));
    await act(async () => fireEvent.click(within(gaveta()).getByRole("button", { name: "Confirmar: gerar senha" })));
    await waitFor(() => expect(within(gaveta()).getByText("abcd-efgh-jkmn")).toBeTruthy());

    fireEvent.click(within(gaveta()).getByRole("tab", { name: /^Ficha/ }));
    fireEvent.click(within(gaveta()).getByRole("tab", { name: /^Contato/ }));
    expect(within(gaveta()).queryByText("abcd-efgh-jkmn")).toBeNull();
  });

  it("cancelar não chama a rota", () => {
    const fetch = servidor({ status: 200, corpo: {} });
    abrirContato({ master: true });
    fireEvent.click(within(gaveta()).getByRole("button", { name: "Gerar senha provisória" }));
    fireEvent.click(within(gaveta()).getByRole("button", { name: "Cancelar" }));
    expect(fetch).not.toHaveBeenCalled();
    expect(within(gaveta()).getByRole("button", { name: "Gerar senha provisória" })).toBeTruthy();
  });

  it("recusa do servidor: o motivo aparece, com o escopo que falta", async () => {
    servidor({ status: 403, corpo: { error: "Você não tem permissão para esta ação.", missing: ["users:manage"] } });
    abrirContato({ master: true });
    fireEvent.click(within(gaveta()).getByRole("button", { name: "Gerar senha provisória" }));
    await act(async () => fireEvent.click(within(gaveta()).getByRole("button", { name: "Confirmar: gerar senha" })));
    await waitFor(() =>
      expect(within(gaveta()).getByRole("alert").textContent).toBe(
        "Você não tem permissão para esta ação. (falta: users:manage)",
      ),
    );
  });

  it("inscrição sem conta de jogador: explica, e não oferece o botão", () => {
    abrirContato({ master: true, i: inscrito({ jogador_id: null }) });
    expect(within(gaveta()).getByText(/não tem conta de jogador vinculada/)).toBeTruthy();
    expect(within(gaveta()).queryByRole("button", { name: "Gerar senha provisória" })).toBeNull();
  });
});

/**
 * Pelo painel DE VERDADE (DIFF-UI-01): o teste acima passa `podeRedefinirSenha` à mão, e por
 * isso ficava verde com o `AdminDashboardClient` montando o `<PainelEdicao>` sem a prop — o
 * bloco nunca aparecia, nem para a master. Aqui o caminho é o inteiro: sessão → painel →
 * aba «Inscritos» → gaveta → aba «Contato».
 */
describe("«Gerar senha provisória» pelo painel inteiro", () => {
  function servidorDoPainel(usuario: { isMaster: boolean; scopes: string[] }) {
    vi.stubGlobal("matchMedia", (q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {} }));
    vi.stubGlobal("scrollTo", () => {});
    const json = (corpo: unknown) =>
      new Response(JSON.stringify(corpo), { status: 200, headers: { "Content-Type": "application/json" } });
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.includes("/api/admin/session")) {
          return json({
            configured: true,
            authorized: true,
            authMode: "accounts",
            dataProvider: "supabase",
            user: { username: "quem", displayName: "Quem", ...usuario, mustChangePassword: false, legacy: false },
          });
        }
        if (url.includes("/api/admin/edicao")) return json(dados());
        if (url.includes("/api/admin/dataset")) {
          return json({
            dataset: {
              tournament: {
                name: "4ª Edição",
                lastUpdatedISO: "2026-10-21T20:00:00.000Z",
                seriesPointsRule: { win: 3, loss: 0 },
                format: "BO3",
                status: "active",
              },
              archivedSeasons: [],
              teams: [],
              players: [],
              seriesMatches: [],
              standingsSeed: [],
            },
            versao: 1,
          });
        }
        return json({});
      }),
    );
  }

  async function abrirContatoPeloPainel() {
    render(<AdminDashboardClient />);
    const nav = await screen.findByRole("navigation", { name: "Seções do painel" });
    // A carga inicial do painel roda numa transição assíncrona; o clique vai dentro de um
    // `act` aguardado para a troca de aba e a busca da edição assentarem juntas.
    await act(async () => fireEvent.click(within(nav).getByText("Inscritos")));
    fireEvent.click((await screen.findAllByRole("button", { name: /Fulano/ }))[0]!);
    fireEvent.click(within(gaveta()).getByRole("tab", { name: /^Contato/ }));
  }

  it("a master vê o bloco na gaveta do inscrito", async () => {
    servidorDoPainel({ isMaster: true, scopes: [] });
    await abrirContatoPeloPainel();
    expect(within(gaveta()).getByRole("button", { name: "Gerar senha provisória" })).toBeTruthy();
  });

  it("conta limitada (confere inscrições, mas não é a master) NÃO vê o bloco", async () => {
    servidorDoPainel({ isMaster: false, scopes: ["inscricoes:conferir", "inscricoes:financeiro"] });
    await abrirContatoPeloPainel();
    // A gaveta abriu e a aba Contato está lá: a ausência é do bloco, não da tela.
    expect(within(gaveta()).getByText("fulano@exemplo.com")).toBeTruthy();
    expect(within(gaveta()).queryByRole("button", { name: "Gerar senha provisória" })).toBeNull();
  });
});
