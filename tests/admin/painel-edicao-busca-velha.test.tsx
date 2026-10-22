// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PainelEdicao, type DadosEdicao, type EdicaoConfig, type SecaoEdicao } from "@/components/admin/e4/painel-edicao";
import { SecaoConfiguracao } from "@/components/admin/e4/secao-configuracao";

/**
 * DIFF2-UI-01 — a busca da TROCA DE ABA não pode voltar a tela no tempo.
 *
 * O `PainelEdicao` busca /api/admin/edicao a cada troca de aba, e essa busca não trava o
 * «Salvar». No 4G ela pode chegar DEPOIS da busca que vem após a ação, com a foto de antes
 * do PATCH. Sem número de sequência, a resposta que chegava por último vencia: a chave Pix
 * recém-salva sumia da tela, com o selo jurando «tudo salvo». Só a busca mais nova escreve.
 */

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function config(over: Partial<EdicaoConfig> = {}): EdicaoConfig {
  return {
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
    ...over,
  } as EdicaoConfig;
}

function dados(c: EdicaoConfig): DadosEdicao {
  return {
    config: c,
    inscritos: [],
    conferencias: [],
    pagamentos: [],
    panorama: {
      inscritos: 0,
      elegiveis: 0,
      aprovados: 0,
      pendentes: 0,
      recusados: 0,
      times: 0,
      vagas: 0,
      sobra: 0,
      caixa: { recebido: 0, estornado: 0, aDevolver: 0, emCaixa: 0, arrecadado: 0, aReceber: 0, isento: 0 },
    },
    auditoria: [],
  } as DadosEdicao;
}

function Painel() {
  const [secao, setSecao] = useState<SecaoEdicao>("inscritos");
  return (
    <>
      <button type="button" onClick={() => setSecao("config")}>
        ir para configuração
      </button>
      <PainelEdicao
        secao={secao}
        onAlert={() => {}}
        podeConferir
        podeFinanceiro
        podeConfigurar
        render={(props) => (secao === "config" ? <SecaoConfiguracao {...props} /> : <p>aba inscritos</p>)}
      />
    </>
  );
}

const CHAVE = "fulano@exemplo.com";

describe("DIFF2-UI-01 · busca da troca de aba chegando por último", () => {
  it("depois de salvar, a resposta velha da troca de aba não devolve a chave antiga à tela", async () => {
    // O "banco": muda com o PATCH.
    let gravada = config();
    let soltarBuscaDaAba: (() => void) | null = null;
    let gets = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init?: RequestInit) => {
        if (init?.method === "PATCH") {
          const corpo = JSON.parse(String(init.body)) as { acao: string; dados: Partial<EdicaoConfig> };
          gravada = config({ ...gravada, ...corpo.dados });
          return { ok: true, status: 200, json: async () => ({ ok: true }) } as unknown as Response;
        }
        gets += 1;
        // A foto é tirada quando o pedido chega ao servidor...
        const foto = dados(gravada);
        // ...e a 2ª busca (a da troca de aba) demora a voltar.
        if (gets === 2) await new Promise<void>((r) => (soltarBuscaDaAba = r));
        return { ok: true, status: 200, json: async () => foto } as unknown as Response;
      }),
    );
    vi.stubGlobal("matchMedia", (q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {} }));

    render(<Painel />);
    await screen.findByText("aba inscritos");

    // 1. Troca para Configuração: a busca A sai e fica pendurada.
    fireEvent.click(screen.getByRole("button", { name: "ir para configuração" }));
    const campo = (await screen.findByLabelText(/Chave Pix/)) as HTMLInputElement;

    // 2. Digita e salva. O «Salvar» está ligado: a busca da aba não marca `ocupado`.
    fireEvent.change(campo, { target: { value: CHAVE } });
    const salvar = screen.getByRole("button", { name: "Salvar alterações" }) as HTMLButtonElement;
    expect(salvar.disabled).toBe(false);
    await act(async () => {
      fireEvent.click(salvar);
      await new Promise((r) => setTimeout(r, 20));
    });

    // O banco tem a chave, e a busca B (pós-ação) já trouxe: a tela está certa.
    expect(gravada.chave_pix).toBe(CHAVE);
    expect((screen.getByLabelText(/Chave Pix/) as HTMLInputElement).value).toBe(CHAVE);
    expect(screen.getAllByText("tudo salvo").length).toBeGreaterThan(0);

    // 3. A busca A (a foto de ANTES do PATCH) chega por último.
    await act(async () => {
      soltarBuscaDaAba?.();
      await new Promise((r) => setTimeout(r, 20));
    });

    // A foto velha é descartada: a tela continua com o que o banco tem.
    expect(gravada.chave_pix).toBe(CHAVE);
    expect((screen.getByLabelText(/Chave Pix/) as HTMLInputElement).value).toBe(CHAVE);
    expect(screen.getAllByText("tudo salvo").length).toBeGreaterThan(0);
  });
});
