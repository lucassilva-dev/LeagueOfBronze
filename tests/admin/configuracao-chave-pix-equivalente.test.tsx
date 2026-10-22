// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PainelEdicao, type DadosEdicao, type EdicaoConfig } from "@/components/admin/e4/painel-edicao";
import { SecaoConfiguracao } from "@/components/admin/e4/secao-configuracao";
import { normalizarChavePix } from "@/lib/pix";

/**
 * DIFF2-UI-04 — chave Pix equivalente à gravada não deixa a Configuração presa em
 * «alterações não salvas».
 *
 * O servidor grava a chave na forma do DICT («52998224725», e-mail em minúsculas). Comparar o
 * texto cru do campo com o gravado fazia a tela continuar «alterações não salvas», com o
 * «Salvar» ligado para sempre, depois de salvar «529.982.247-25». A comparação é pela forma
 * normalizada (`normalizarChavePix`).
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
    chave_pix: "52998224725",
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

describe("DIFF2-UI-04 · chave Pix equivalente à gravada", () => {
  it("salvar «529.982.247-25» deixa a tela em «tudo salvo», com um PATCH só", async () => {
    let gravada = config({ chave_pix: null });
    const patches: unknown[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init?: RequestInit) => {
        if (init?.method === "PATCH") {
          const corpo = JSON.parse(String(init.body)) as { dados: { chave_pix?: string } };
          patches.push(corpo.dados);
          const n = normalizarChavePix(corpo.dados.chave_pix ?? "");
          if (!n.ok) throw new Error(n.motivo);
          gravada = config({ chave_pix: n.chave });
          return { ok: true, status: 200, json: async () => ({ ok: true }) } as unknown as Response;
        }
        const foto = dados(gravada);
        return { ok: true, status: 200, json: async () => foto } as unknown as Response;
      }),
    );
    vi.stubGlobal("matchMedia", (q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {} }));

    render(
      <PainelEdicao
        secao="config"
        onAlert={() => {}}
        podeConferir
        podeFinanceiro
        podeConfigurar
        render={(props) => <SecaoConfiguracao {...props} />}
      />,
    );

    fireEvent.change(await screen.findByLabelText(/Chave Pix/), { target: { value: "529.982.247-25" } });
    expect(screen.getAllByText("alterações não salvas").length).toBeGreaterThan(0);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Salvar alterações" }));
      await new Promise((r) => setTimeout(r, 20));
    });

    expect(gravada.chave_pix).toBe("52998224725");
    expect(patches).toEqual([{ chave_pix: "529.982.247-25" }]);
    expect(screen.queryAllByText("alterações não salvas")).toHaveLength(0);
    expect(screen.getAllByText("tudo salvo").length).toBeGreaterThan(0);
    expect((screen.getByRole("button", { name: "Salvar alterações" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("colar a mesma chave formatada por cima da gravada não conta como alteração", async () => {
    const gravada = config({ chave_pix: "52998224725" });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, status: 200, json: async () => dados(gravada) }) as unknown as Response),
    );
    vi.stubGlobal("matchMedia", (q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {} }));

    render(
      <PainelEdicao
        secao="config"
        onAlert={() => {}}
        podeConferir
        podeFinanceiro
        podeConfigurar
        render={(props) => <SecaoConfiguracao {...props} />}
      />,
    );
    fireEvent.change(await screen.findByLabelText(/Chave Pix/), { target: { value: "529.982.247-25" } });
    expect(screen.queryAllByText("alterações não salvas")).toHaveLength(0);
  });
});
